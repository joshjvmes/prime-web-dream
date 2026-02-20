import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXCHANGE_RATE = 2_000_000; // 2M OS = 1 IX
const INITIAL_OS = 100_000_000_000_000; // 100 trillion
const INITIAL_IX = 22_000_000; // 22 million
const WELCOME_BONUS = 10_000;
const INTEREST_RATE = 0.0001; // 0.01% daily

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

async function getUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user } } = await client.auth.getUser(auth.replace("Bearer ", ""));
  return user;
}

async function isAdmin(userId: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await client.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !!data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ── System Init ──
    if (action === "init") {
      const user = await getUser(req);
      if (!user || !(await isAdmin(user.id))) return err("Admin required", 403);

      const { data: existing } = await db.from("wallets").select("id").eq("is_system", true).maybeSingle();
      if (existing) return json({ message: "Already initialized", wallet_id: existing.id });

      const { data: wallet, error: wErr } = await db.from("wallets").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        os_balance: INITIAL_OS,
        ix_balance: INITIAL_IX,
        is_system: true,
      }).select("id").single();
      if (wErr) return err(wErr.message, 500);

      await db.from("transactions").insert([
        { to_wallet_id: wallet.id, token_type: "OS", amount: INITIAL_OS, tx_type: "mint", description: "Initial OS supply" },
        { to_wallet_id: wallet.id, token_type: "IX", amount: INITIAL_IX, tx_type: "mint", description: "Initial IX supply" },
      ]);

      return json({ message: "System initialized", wallet_id: wallet.id });
    }

    // ── Balance ──
    if (action === "balance") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);

      let { data: wallet } = await db.from("wallets").select("*").eq("user_id", user.id).maybeSingle();
      if (!wallet) {
        // Auto-create wallet with welcome bonus
        const { data: sysWallet } = await db.from("wallets").select("id, os_balance").eq("is_system", true).maybeSingle();

        const { data: newWallet, error: cErr } = await db.from("wallets").insert({
          user_id: user.id,
          os_balance: WELCOME_BONUS,
          ix_balance: 0,
        }).select("*").single();
        if (cErr) return err(cErr.message, 500);

        if (sysWallet) {
          await db.from("wallets").update({ os_balance: Number(sysWallet.os_balance) - WELCOME_BONUS }).eq("id", sysWallet.id);
          await db.from("transactions").insert({
            from_wallet_id: sysWallet.id, to_wallet_id: newWallet.id,
            token_type: "OS", amount: WELCOME_BONUS, tx_type: "reward",
            description: "Welcome bonus",
          });
        }
        wallet = newWallet;
      }
      return json(wallet);
    }

    // ── Transfer ──
    if (action === "transfer") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);
      const body = await req.json();
      const { to_user_id, token_type, amount: rawAmount } = body;
      const amount = Number(rawAmount);
      if (!to_user_id || !token_type || !amount || amount <= 0) return err("Invalid params");
      if (to_user_id === user.id) return err("Cannot send to self");

      const balCol = token_type === "IX" ? "ix_balance" : "os_balance";

      const { data: fromW } = await db.from("wallets").select("*").eq("user_id", user.id).maybeSingle();
      if (!fromW) return err("No wallet");
      if (Number(fromW[balCol]) < amount) return err("Insufficient balance");

      let { data: toW } = await db.from("wallets").select("*").eq("user_id", to_user_id).maybeSingle();
      if (!toW) {
        const { data: created } = await db.from("wallets").insert({ user_id: to_user_id, os_balance: 0, ix_balance: 0 }).select("*").single();
        toW = created;
      }
      if (!toW) return err("Recipient wallet error", 500);

      await db.from("wallets").update({ [balCol]: Number(fromW[balCol]) - amount }).eq("id", fromW.id);
      await db.from("wallets").update({ [balCol]: Number(toW[balCol]) + amount }).eq("id", toW.id);
      await db.from("transactions").insert({
        from_wallet_id: fromW.id, to_wallet_id: toW.id,
        token_type, amount, tx_type: "transfer",
        description: body.description || "Transfer",
      });
      return json({ success: true });
    }

    // ── Exchange OS <-> IX ──
    if (action === "exchange") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);
      const body = await req.json();
      const { direction, amount: rawAmount } = body; // "buy_ix" or "sell_ix"
      const amount = Number(rawAmount);
      if (!direction || !amount || amount <= 0) return err("Invalid params");

      const { data: userW } = await db.from("wallets").select("*").eq("user_id", user.id).maybeSingle();
      if (!userW) return err("No wallet");
      const { data: sysW } = await db.from("wallets").select("*").eq("is_system", true).maybeSingle();
      if (!sysW) return err("System not initialized");

      if (direction === "buy_ix") {
        const osCost = amount * EXCHANGE_RATE;
        if (Number(userW.os_balance) < osCost) return err("Insufficient OS");
        if (Number(sysW.ix_balance) < amount) return err("Insufficient IX in reserve");

        await db.from("wallets").update({ os_balance: Number(userW.os_balance) - osCost, ix_balance: Number(userW.ix_balance) + amount }).eq("id", userW.id);
        await db.from("wallets").update({ os_balance: Number(sysW.os_balance) + osCost, ix_balance: Number(sysW.ix_balance) - amount }).eq("id", sysW.id);
        await db.from("transactions").insert({
          from_wallet_id: userW.id, to_wallet_id: sysW.id,
          token_type: "OS", amount: osCost, tx_type: "exchange",
          description: `Exchanged ${osCost.toLocaleString()} OS for ${amount} IX`,
        });
      } else {
        if (Number(userW.ix_balance) < amount) return err("Insufficient IX");
        const osGain = amount * EXCHANGE_RATE;

        await db.from("wallets").update({ ix_balance: Number(userW.ix_balance) - amount, os_balance: Number(userW.os_balance) + osGain }).eq("id", userW.id);
        await db.from("wallets").update({ ix_balance: Number(sysW.ix_balance) + amount, os_balance: Number(sysW.os_balance) - osGain }).eq("id", sysW.id);
        await db.from("transactions").insert({
          from_wallet_id: userW.id, to_wallet_id: sysW.id,
          token_type: "IX", amount, tx_type: "exchange",
          description: `Exchanged ${amount} IX for ${osGain.toLocaleString()} OS`,
        });
      }
      return json({ success: true });
    }

    // ── Escrow Create ──
    if (action === "escrow-create") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);
      const body = await req.json();
      const { counterparty_id, token_type, amount: rawAmount, description } = body;
      const amount = Number(rawAmount);
      if (!counterparty_id || !token_type || !amount || amount <= 0) return err("Invalid params");

      const balCol = token_type === "IX" ? "ix_balance" : "os_balance";
      const { data: userW } = await db.from("wallets").select("*").eq("user_id", user.id).maybeSingle();
      if (!userW || Number(userW[balCol]) < amount) return err("Insufficient balance");

      await db.from("wallets").update({ [balCol]: Number(userW[balCol]) - amount }).eq("id", userW.id);

      const { data: deal, error: dErr } = await db.from("escrow_deals").insert({
        creator_id: user.id, counterparty_id, token_type, amount, status: "locked", description,
      }).select("*").single();
      if (dErr) return err(dErr.message, 500);

      await db.from("transactions").insert({
        from_wallet_id: userW.id, token_type, amount, tx_type: "escrow_lock",
        description: `Escrow locked: ${description || "deal"}`, escrow_id: deal.id,
      });
      return json(deal);
    }

    // ── Escrow Release ──
    if (action === "escrow-release") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);
      const body = await req.json();
      const { escrow_id } = body;

      const { data: deal } = await db.from("escrow_deals").select("*").eq("id", escrow_id).maybeSingle();
      if (!deal || deal.status !== "locked") return err("Invalid escrow");
      if (deal.creator_id !== user.id && !(await isAdmin(user.id))) return err("Not authorized");

      const balCol = deal.token_type === "IX" ? "ix_balance" : "os_balance";
      let { data: toW } = await db.from("wallets").select("*").eq("user_id", deal.counterparty_id).maybeSingle();
      if (!toW) {
        const { data: c } = await db.from("wallets").insert({ user_id: deal.counterparty_id, os_balance: 0, ix_balance: 0 }).select("*").single();
        toW = c;
      }
      if (!toW) return err("Counterparty wallet error", 500);

      await db.from("wallets").update({ [balCol]: Number(toW[balCol]) + Number(deal.amount) }).eq("id", toW.id);
      await db.from("escrow_deals").update({ status: "released", resolved_at: new Date().toISOString() }).eq("id", escrow_id);
      await db.from("transactions").insert({
        to_wallet_id: toW.id, token_type: deal.token_type, amount: deal.amount,
        tx_type: "escrow_release", description: `Escrow released: ${deal.description || "deal"}`, escrow_id,
      });
      return json({ success: true });
    }

    // ── Escrow Cancel ──
    if (action === "escrow-cancel") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);
      const body = await req.json();
      const { escrow_id } = body;

      const { data: deal } = await db.from("escrow_deals").select("*").eq("id", escrow_id).maybeSingle();
      if (!deal || deal.status !== "locked") return err("Invalid escrow");
      if (deal.creator_id !== user.id && !(await isAdmin(user.id))) return err("Not authorized");

      const balCol = deal.token_type === "IX" ? "ix_balance" : "os_balance";
      const { data: creatorW } = await db.from("wallets").select("*").eq("user_id", deal.creator_id).maybeSingle();
      if (!creatorW) return err("Creator wallet not found", 500);

      await db.from("wallets").update({ [balCol]: Number(creatorW[balCol]) + Number(deal.amount) }).eq("id", creatorW.id);
      await db.from("escrow_deals").update({ status: "cancelled", resolved_at: new Date().toISOString() }).eq("id", escrow_id);
      return json({ success: true });
    }

    // ── Distribute Interest (Admin) ──
    if (action === "distribute-interest") {
      const user = await getUser(req);
      if (!user || !(await isAdmin(user.id))) return err("Admin required", 403);

      const { data: sysW } = await db.from("wallets").select("*").eq("is_system", true).maybeSingle();
      if (!sysW) return err("System not initialized");

      const { data: wallets } = await db.from("wallets").select("*").eq("is_system", false).gt("os_balance", 0);
      if (!wallets || wallets.length === 0) return json({ distributed: 0 });

      let totalDistributed = 0;
      const txns: unknown[] = [];

      for (const w of wallets) {
        const interest = Math.floor(Number(w.os_balance) * INTEREST_RATE * 100) / 100;
        if (interest < 0.01) continue;
        if (Number(sysW.os_balance) - totalDistributed < interest) break;

        await db.from("wallets").update({ os_balance: Number(w.os_balance) + interest }).eq("id", w.id);
        totalDistributed += interest;
        txns.push({
          from_wallet_id: sysW.id, to_wallet_id: w.id,
          token_type: "OS", amount: interest, tx_type: "interest",
          description: `Daily interest (${(INTEREST_RATE * 100).toFixed(2)}%)`,
        });
      }

      if (txns.length > 0) {
        await db.from("wallets").update({ os_balance: Number(sysW.os_balance) - totalDistributed }).eq("id", sysW.id);
        await db.from("transactions").insert(txns);
      }

      return json({ distributed: totalDistributed, accounts: txns.length });
    }

    // ── Reward (Admin) ──
    if (action === "reward") {
      const user = await getUser(req);
      if (!user || !(await isAdmin(user.id))) return err("Admin required", 403);
      const body = await req.json();
      const { target_user_id, amount: rawAmount, description } = body;
      const amount = Number(rawAmount);
      if (!target_user_id || !amount || amount <= 0) return err("Invalid params");

      const { data: sysW } = await db.from("wallets").select("*").eq("is_system", true).maybeSingle();
      if (!sysW || Number(sysW.os_balance) < amount) return err("Insufficient reserves");

      let { data: toW } = await db.from("wallets").select("*").eq("user_id", target_user_id).maybeSingle();
      if (!toW) {
        const { data: c } = await db.from("wallets").insert({ user_id: target_user_id, os_balance: 0, ix_balance: 0 }).select("*").single();
        toW = c;
      }
      if (!toW) return err("Wallet error", 500);

      await db.from("wallets").update({ os_balance: Number(sysW.os_balance) - amount }).eq("id", sysW.id);
      await db.from("wallets").update({ os_balance: Number(toW.os_balance) + amount }).eq("id", toW.id);
      await db.from("transactions").insert({
        from_wallet_id: sysW.id, to_wallet_id: toW.id,
        token_type: "OS", amount, tx_type: "reward", description: description || "Admin reward",
      });
      return json({ success: true });
    }

    // ── Admin Stats ──
    if (action === "admin-stats") {
      const user = await getUser(req);
      if (!user || !(await isAdmin(user.id))) return err("Admin required", 403);

      const { data: sysW } = await db.from("wallets").select("*").eq("is_system", true).maybeSingle();
      const { count: walletCount } = await db.from("wallets").select("*", { count: "exact", head: true }).eq("is_system", false);
      const { data: allWallets } = await db.from("wallets").select("os_balance, ix_balance").eq("is_system", false);
      const { data: escrows } = await db.from("escrow_deals").select("token_type, amount").eq("status", "locked");
      const { count: txCount } = await db.from("transactions").select("*", { count: "exact", head: true });

      const circulatingOS = (allWallets || []).reduce((s, w) => s + Number(w.os_balance), 0);
      const circulatingIX = (allWallets || []).reduce((s, w) => s + Number(w.ix_balance), 0);
      const escrowOS = (escrows || []).filter(e => e.token_type === "OS").reduce((s, e) => s + Number(e.amount), 0);
      const escrowIX = (escrows || []).filter(e => e.token_type === "IX").reduce((s, e) => s + Number(e.amount), 0);

      return json({
        system_wallet: sysW,
        wallet_count: walletCount || 0,
        circulating_os: circulatingOS,
        circulating_ix: circulatingIX,
        escrow_os: escrowOS,
        escrow_ix: escrowIX,
        transaction_count: txCount || 0,
        interest_rate: INTEREST_RATE,
        exchange_rate: EXCHANGE_RATE,
      });
    }

    // ── Admin Adjust ──
    if (action === "admin-adjust") {
      const user = await getUser(req);
      if (!user || !(await isAdmin(user.id))) return err("Admin required", 403);
      const body = await req.json();
      const { target_user_id, token_type, amount: rawAmount, description } = body;
      const amount = Number(rawAmount);
      if (!target_user_id || !token_type || !amount) return err("Invalid params");

      const balCol = token_type === "IX" ? "ix_balance" : "os_balance";
      const { data: w } = await db.from("wallets").select("*").eq("user_id", target_user_id).maybeSingle();
      if (!w) return err("Wallet not found");

      const newBal = Number(w[balCol]) + amount;
      if (newBal < 0) return err("Would result in negative balance");

      await db.from("wallets").update({ [balCol]: newBal }).eq("id", w.id);
      await db.from("transactions").insert({
        from_wallet_id: amount < 0 ? w.id : undefined,
        to_wallet_id: amount > 0 ? w.id : undefined,
        token_type, amount: Math.abs(amount), tx_type: "mint",
        description: description || "Admin adjustment",
      });
      return json({ success: true });
    }

    // ── Leaderboard ──
    if (action === "leaderboard") {
      const { data } = await db.from("wallets")
        .select("user_id, os_balance, ix_balance")
        .eq("is_system", false)
        .order("os_balance", { ascending: false })
        .limit(20);

      // Enrich with display names
      const userIds = (data || []).map(w => w.user_id);
      const { data: profiles } = await db.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const enriched = (data || []).map(w => ({
        ...w,
        display_name: profileMap.get(w.user_id)?.display_name || "Anonymous",
        avatar_url: profileMap.get(w.user_id)?.avatar_url || null,
      }));

      return json(enriched);
    }

    // ── Transaction History ──
    if (action === "history") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);

      const { data: wallet } = await db.from("wallets").select("id").eq("user_id", user.id).maybeSingle();
      if (!wallet) return json([]);

      const { data } = await db.from("transactions")
        .select("*")
        .or(`from_wallet_id.eq.${wallet.id},to_wallet_id.eq.${wallet.id}`)
        .order("created_at", { ascending: false })
        .limit(100);

      return json({ transactions: data || [], wallet_id: wallet.id });
    }

    // ── Admin: All wallets ──
    if (action === "admin-wallets") {
      const user = await getUser(req);
      if (!user || !(await isAdmin(user.id))) return err("Admin required", 403);

      const { data: wallets } = await db.from("wallets").select("*").order("os_balance", { ascending: false });
      const userIds = (wallets || []).filter(w => !w.is_system).map(w => w.user_id);
      const { data: profiles } = await db.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]));

      return json((wallets || []).map(w => ({
        ...w,
        display_name: w.is_system ? "Central Bank" : (profileMap.get(w.user_id) || "Anonymous"),
      })));
    }

    // ── Admin: All transactions ──
    if (action === "admin-transactions") {
      const user = await getUser(req);
      if (!user || !(await isAdmin(user.id))) return err("Admin required", 403);

      const { data } = await db.from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      return json(data || []);
    }

    // ── Arcade Reward ──
    if (action === "arcade-reward") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);
      const body = await req.json();
      const { game, amount: rawAmount, session_id } = body;
      const amount = Number(rawAmount);
      if (!game || !amount || amount <= 0 || amount > 5000) return err("Invalid reward");

      const { data: sysW } = await db.from("wallets").select("*").eq("is_system", true).maybeSingle();
      if (!sysW || Number(sysW.os_balance) < amount) return err("Insufficient reserves");

      let { data: userW } = await db.from("wallets").select("*").eq("user_id", user.id).maybeSingle();
      if (!userW) {
        const { data: c } = await db.from("wallets").insert({ user_id: user.id, os_balance: 0, ix_balance: 0 }).select("*").single();
        userW = c;
      }
      if (!userW) return err("Wallet error", 500);

      await db.from("wallets").update({ os_balance: Number(sysW.os_balance) - amount }).eq("id", sysW.id);
      await db.from("wallets").update({ os_balance: Number(userW.os_balance) + amount }).eq("id", userW.id);
      await db.from("transactions").insert({
        from_wallet_id: sysW.id, to_wallet_id: userW.id,
        token_type: "OS", amount, tx_type: "reward",
        description: `Arcade: ${game} (+${amount} OS)`,
      });
      return json({ success: true, new_balance: Number(userW.os_balance) + amount });
    }

    // ── AI Charge ──
    if (action === "ai-charge") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);
      const body = await req.json();
      const amount = Number(body.amount || 50);

      const { data: userW } = await db.from("wallets").select("*").eq("user_id", user.id).maybeSingle();
      if (!userW) return json({ charged: false, reason: "no_wallet" });
      if (Number(userW.os_balance) < amount) return json({ charged: false, reason: "insufficient" });

      const { data: sysW } = await db.from("wallets").select("*").eq("is_system", true).maybeSingle();
      await db.from("wallets").update({ os_balance: Number(userW.os_balance) - amount }).eq("id", userW.id);
      if (sysW) await db.from("wallets").update({ os_balance: Number(sysW.os_balance) + amount }).eq("id", sysW.id);
      await db.from("transactions").insert({
        from_wallet_id: userW.id, to_wallet_id: sysW?.id,
        token_type: "OS", amount, tx_type: "transfer",
        description: body.description || "AI usage charge",
      });
      return json({ charged: true });
    }

    // ── Purchase Unlock ──
    if (action === "purchase-unlock") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);
      const body = await req.json();
      const { item_id, cost } = body;
      const amount = Number(cost);
      if (!item_id || !amount || amount <= 0) return err("Invalid purchase");

      const { data: userW } = await db.from("wallets").select("*").eq("user_id", user.id).maybeSingle();
      if (!userW || Number(userW.os_balance) < amount) return err("Insufficient OS tokens");

      const { data: sysW } = await db.from("wallets").select("*").eq("is_system", true).maybeSingle();
      await db.from("wallets").update({ os_balance: Number(userW.os_balance) - amount }).eq("id", userW.id);
      if (sysW) await db.from("wallets").update({ os_balance: Number(sysW.os_balance) + amount }).eq("id", sysW.id);
      await db.from("transactions").insert({
        from_wallet_id: userW.id, to_wallet_id: sysW?.id,
        token_type: "OS", amount, tx_type: "transfer",
        description: `Shop: ${item_id}`,
      });
      return json({ success: true });
    }

    // ── Forge Publish ──
    if (action === "forge-publish") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);
      const body = await req.json();
      const { name, description, icon, code, category, price, ipo_active, ipo_target } = body;
      if (!name || !code) return err("Name and code required");

      const insertData: Record<string, unknown> = {
        creator_id: user.id, name, description: description || '', icon: icon || '🔧',
        code, category: category || 'other', price: Number(price) || 0,
        ipo_active: !!ipo_active, ipo_target: Number(ipo_target) || 0,
      };

      // If IPO, set initial share price based on target
      if (ipo_active && ipo_target) {
        insertData.share_price = Number(ipo_target) / 1000; // 1000 shares
      }

      const { data: listing, error: lErr } = await db.from("forge_listings").insert(insertData).select("*").single();
      if (lErr) return err(lErr.message, 500);

      // Give creator 30% founder shares
      if (listing) {
        await db.from("app_shares").insert({
          user_id: user.id, listing_id: listing.id, shares: 300, avg_cost: 0,
        });
      }

      return json(listing);
    }

    // ── Forge Install ──
    if (action === "forge-install") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);
      const body = await req.json();
      const { listing_id, price } = body;
      const amount = Number(price);

      if (amount > 0) {
        const { data: userW } = await db.from("wallets").select("*").eq("user_id", user.id).maybeSingle();
        if (!userW || Number(userW.os_balance) < amount) return err("Insufficient OS tokens");

        // Get creator
        const { data: listing } = await db.from("forge_listings").select("creator_id").eq("id", listing_id).single();
        if (!listing) return err("Listing not found");

        let { data: creatorW } = await db.from("wallets").select("*").eq("user_id", listing.creator_id).maybeSingle();
        if (!creatorW) {
          const { data: c } = await db.from("wallets").insert({ user_id: listing.creator_id, os_balance: 0, ix_balance: 0 }).select("*").single();
          creatorW = c;
        }

        // Transfer OS
        await db.from("wallets").update({ os_balance: Number(userW.os_balance) - amount }).eq("id", userW.id);
        if (creatorW) await db.from("wallets").update({ os_balance: Number(creatorW.os_balance) + amount }).eq("id", creatorW.id);
        await db.from("transactions").insert({
          from_wallet_id: userW.id, to_wallet_id: creatorW?.id,
          token_type: "OS", amount, tx_type: "transfer", description: `Forge install: ${listing_id}`,
        });
      }

      // Increment installs + revenue
      const { data: curr } = await db.from("forge_listings").select("installs, revenue").eq("id", listing_id).single();
      if (curr) {
        await db.from("forge_listings").update({
          installs: (curr.installs || 0) + 1,
          revenue: Number(curr.revenue || 0) + amount,
        }).eq("id", listing_id);
      }

      return json({ success: true });
    }

    // ── Forge Invest (IPO) ──
    if (action === "forge-invest") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);
      const body = await req.json();
      const { listing_id, amount: rawAmount } = body;
      const amount = Number(rawAmount);
      if (!listing_id || !amount || amount <= 0) return err("Invalid params");

      const { data: listing } = await db.from("forge_listings").select("*").eq("id", listing_id).single();
      if (!listing || !listing.ipo_active) return err("No active IPO");

      const { data: userW } = await db.from("wallets").select("*").eq("user_id", user.id).maybeSingle();
      if (!userW || Number(userW.os_balance) < amount) return err("Insufficient OS tokens");

      // Calculate shares bought
      const sharePrice = Number(listing.share_price) || 1;
      const sharesBought = Math.floor(amount / sharePrice);
      if (sharesBought <= 0) return err("Amount too low for even 1 share");
      const actualCost = sharesBought * sharePrice;

      // Deduct from buyer
      await db.from("wallets").update({ os_balance: Number(userW.os_balance) - actualCost }).eq("id", userW.id);

      // Upsert shares
      const { data: existing } = await db.from("app_shares").select("*").eq("user_id", user.id).eq("listing_id", listing_id).maybeSingle();
      if (existing) {
        const totalShares = existing.shares + sharesBought;
        const newAvg = ((existing.avg_cost * existing.shares) + actualCost) / totalShares;
        await db.from("app_shares").update({ shares: totalShares, avg_cost: newAvg }).eq("id", existing.id);
      } else {
        await db.from("app_shares").insert({ user_id: user.id, listing_id, shares: sharesBought, avg_cost: sharePrice });
      }

      // Update IPO raised
      const newRaised = Number(listing.ipo_raised) + actualCost;
      const updates: Record<string, unknown> = { ipo_raised: newRaised };
      if (newRaised >= Number(listing.ipo_target)) {
        updates.ipo_active = false; // IPO complete
      }
      await db.from("forge_listings").update(updates).eq("id", listing_id);

      // Credit creator
      let { data: creatorW } = await db.from("wallets").select("*").eq("user_id", listing.creator_id).maybeSingle();
      if (!creatorW) {
        const { data: c } = await db.from("wallets").insert({ user_id: listing.creator_id, os_balance: 0, ix_balance: 0 }).select("*").single();
        creatorW = c;
      }
      if (creatorW) {
        await db.from("wallets").update({ os_balance: Number(creatorW.os_balance) + actualCost }).eq("id", creatorW.id);
      }

      await db.from("transactions").insert({
        from_wallet_id: userW.id, to_wallet_id: creatorW?.id,
        token_type: "OS", amount: actualCost, tx_type: "transfer",
        description: `IPO investment: ${listing.name} (${sharesBought} shares)`,
      });

      return json({ success: true, shares_bought: sharesBought });
    }

    // ── Share Order ──
    if (action === "share-order") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);
      const body = await req.json();
      const { listing_id, order_type, shares, price } = body;
      if (!listing_id || !order_type || !shares || !price) return err("Invalid params");
      const numShares = Number(shares);
      const numPrice = Number(price);

      // Validate
      if (order_type === 'sell') {
        const { data: holding } = await db.from("app_shares").select("shares").eq("user_id", user.id).eq("listing_id", listing_id).maybeSingle();
        if (!holding || holding.shares < numShares) return err("Insufficient shares");
      } else {
        const totalCost = numShares * numPrice;
        const { data: userW } = await db.from("wallets").select("os_balance").eq("user_id", user.id).maybeSingle();
        if (!userW || Number(userW.os_balance) < totalCost) return err("Insufficient OS tokens");
      }

      const { data: order, error: oErr } = await db.from("share_orders").insert({
        user_id: user.id, listing_id, order_type, shares: numShares, price: numPrice,
      }).select("*").single();
      if (oErr) return err(oErr.message, 500);

      // Try to match orders
      const oppositeType = order_type === 'buy' ? 'sell' : 'buy';
      const { data: matches } = await db.from("share_orders")
        .select("*")
        .eq("listing_id", listing_id)
        .eq("order_type", oppositeType)
        .eq("status", "open")
        .order("price", { ascending: order_type === 'buy' })
        .limit(10);

      if (matches && matches.length > 0) {
        let remainingShares = numShares;
        for (const match of matches) {
          if (remainingShares <= 0) break;
          const canTrade = order_type === 'buy' ? numPrice >= Number(match.price) : numPrice <= Number(match.price);
          if (!canTrade) continue;

          const tradeShares = Math.min(remainingShares, match.shares - match.filled);
          const tradePrice = Number(match.price); // execute at the resting order's price
          const tradeCost = tradeShares * tradePrice;

          const buyerId = order_type === 'buy' ? user.id : match.user_id;
          const sellerId = order_type === 'sell' ? user.id : match.user_id;

          // Transfer OS
          const { data: buyerW } = await db.from("wallets").select("*").eq("user_id", buyerId).maybeSingle();
          const { data: sellerW } = await db.from("wallets").select("*").eq("user_id", sellerId).maybeSingle();
          if (buyerW && sellerW) {
            await db.from("wallets").update({ os_balance: Number(buyerW.os_balance) - tradeCost }).eq("id", buyerW.id);
            await db.from("wallets").update({ os_balance: Number(sellerW.os_balance) + tradeCost }).eq("id", sellerW.id);

            // Transfer shares
            const { data: buyerShares } = await db.from("app_shares").select("*").eq("user_id", buyerId).eq("listing_id", listing_id).maybeSingle();
            if (buyerShares) {
              const total = buyerShares.shares + tradeShares;
              const newAvg = ((buyerShares.avg_cost * buyerShares.shares) + tradeCost) / total;
              await db.from("app_shares").update({ shares: total, avg_cost: newAvg }).eq("id", buyerShares.id);
            } else {
              await db.from("app_shares").insert({ user_id: buyerId, listing_id, shares: tradeShares, avg_cost: tradePrice });
            }

            const { data: sellerShares } = await db.from("app_shares").select("*").eq("user_id", sellerId).eq("listing_id", listing_id).maybeSingle();
            if (sellerShares) {
              const newShares = sellerShares.shares - tradeShares;
              if (newShares <= 0) {
                await db.from("app_shares").delete().eq("id", sellerShares.id);
              } else {
                await db.from("app_shares").update({ shares: newShares }).eq("id", sellerShares.id);
              }
            }

            // Update share price on listing
            await db.from("forge_listings").update({ share_price: tradePrice }).eq("id", listing_id);

            await db.from("transactions").insert({
              from_wallet_id: buyerW.id, to_wallet_id: sellerW.id,
              token_type: "OS", amount: tradeCost, tx_type: "transfer",
              description: `Share trade: ${tradeShares} shares @ ${tradePrice} OS`,
            });
          }

          // Update orders
          const newFilled = match.filled + tradeShares;
          await db.from("share_orders").update({
            filled: newFilled,
            status: newFilled >= match.shares ? 'filled' : 'open',
          }).eq("id", match.id);

          remainingShares -= tradeShares;
        }

        // Update our order
        const filled = numShares - remainingShares;
        await db.from("share_orders").update({
          filled,
          status: filled >= numShares ? 'filled' : 'open',
        }).eq("id", order!.id);
      }

      return json({ success: true, order_id: order!.id });
    }

    // ── Share Cancel ──
    if (action === "share-cancel") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);
      const body = await req.json();
      const { order_id } = body;
      await db.from("share_orders").update({ status: "cancelled" }).eq("id", order_id).eq("user_id", user.id);
      return json({ success: true });
    }

    // ── Bet Place ──
    if (action === "bet-place") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);
      const body = await req.json();
      const { market_id, side, amount: rawAmount } = body;
      const amount = Number(rawAmount);
      if (!market_id || !side || !amount || amount <= 0) return err("Invalid params");
      if (side !== 'YES' && side !== 'NO') return err("Side must be YES or NO");

      const { data: market } = await db.from("bet_markets").select("*").eq("id", market_id).single();
      if (!market || market.status !== 'open') return err("Market not open");

      const { data: userW } = await db.from("wallets").select("*").eq("user_id", user.id).maybeSingle();
      if (!userW || Number(userW.os_balance) < amount) return err("Insufficient OS tokens");

      const { data: sysW } = await db.from("wallets").select("*").eq("is_system", true).maybeSingle();

      // Deduct from user
      await db.from("wallets").update({ os_balance: Number(userW.os_balance) - amount }).eq("id", userW.id);
      if (sysW) await db.from("wallets").update({ os_balance: Number(sysW.os_balance) + amount }).eq("id", sysW.id);

      // Record bet
      await db.from("bets").insert({ user_id: user.id, market_id, side, amount });

      // Update pool
      const poolCol = side === 'YES' ? 'yes_pool' : 'no_pool';
      const currentPool = Number(market[poolCol === 'yes_pool' ? 'yes_pool' : 'no_pool']);
      await db.from("bet_markets").update({ [poolCol]: currentPool + amount }).eq("id", market_id);

      await db.from("transactions").insert({
        from_wallet_id: userW.id, to_wallet_id: sysW?.id,
        token_type: "OS", amount, tx_type: "transfer",
        description: `Bet ${side} on: ${market.question.substring(0, 50)}`,
      });

      return json({ success: true });
    }

    // ── Bet Create Market ──
    if (action === "bet-create-market") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);
      const body = await req.json();
      const { question, category, listing_id, expiry } = body;
      if (!question) return err("Question required");

      const cost = 1000;
      const { data: userW } = await db.from("wallets").select("*").eq("user_id", user.id).maybeSingle();
      if (!userW || Number(userW.os_balance) < cost) return err("Need 1,000 OS to create a market");

      const { data: sysW } = await db.from("wallets").select("*").eq("is_system", true).maybeSingle();
      await db.from("wallets").update({ os_balance: Number(userW.os_balance) - cost }).eq("id", userW.id);
      if (sysW) await db.from("wallets").update({ os_balance: Number(sysW.os_balance) + cost }).eq("id", sysW.id);

      const { data: market, error: mErr } = await db.from("bet_markets").insert({
        creator_id: user.id, question, category: category || 'general',
        listing_id: listing_id || null, expiry: expiry || null,
      }).select("*").single();
      if (mErr) return err(mErr.message, 500);

      await db.from("transactions").insert({
        from_wallet_id: userW.id, to_wallet_id: sysW?.id,
        token_type: "OS", amount: cost, tx_type: "transfer",
        description: `Created market: ${question.substring(0, 50)}`,
      });

      return json(market);
    }

    // ── Bet Resolve ──
    if (action === "bet-resolve") {
      const user = await getUser(req);
      if (!user) return err("Auth required", 401);
      const body = await req.json();
      const { market_id, outcome } = body;
      if (!market_id || !outcome) return err("Invalid params");
      if (outcome !== 'yes' && outcome !== 'no' && outcome !== 'cancelled') return err("Invalid outcome");

      const { data: market } = await db.from("bet_markets").select("*").eq("id", market_id).single();
      if (!market || market.status !== 'open') return err("Market not open");

      // Only creator or admin can resolve
      if (market.creator_id !== user.id && !(await isAdmin(user.id))) return err("Not authorized");

      const totalPool = Number(market.yes_pool) + Number(market.no_pool);

      if (outcome === 'cancelled') {
        // Refund all bets
        const { data: allBets } = await db.from("bets").select("*").eq("market_id", market_id);
        for (const bet of (allBets || [])) {
          const { data: bw } = await db.from("wallets").select("*").eq("user_id", bet.user_id).maybeSingle();
          if (bw) {
            await db.from("wallets").update({ os_balance: Number(bw.os_balance) + Number(bet.amount) }).eq("id", bw.id);
          }
        }
        const { data: sysW } = await db.from("wallets").select("*").eq("is_system", true).maybeSingle();
        if (sysW) await db.from("wallets").update({ os_balance: Number(sysW.os_balance) - totalPool }).eq("id", sysW.id);
      } else {
        // Distribute winnings
        const winningSide = outcome === 'yes' ? 'YES' : 'NO';
        const winningPool = outcome === 'yes' ? Number(market.yes_pool) : Number(market.no_pool);
        if (winningPool > 0) {
          const { data: winners } = await db.from("bets").select("*").eq("market_id", market_id).eq("side", winningSide);
          const { data: sysW } = await db.from("wallets").select("*").eq("is_system", true).maybeSingle();
          for (const bet of (winners || [])) {
            const payout = (Number(bet.amount) / winningPool) * totalPool;
            const { data: bw } = await db.from("wallets").select("*").eq("user_id", bet.user_id).maybeSingle();
            if (bw && sysW) {
              await db.from("wallets").update({ os_balance: Number(bw.os_balance) + payout }).eq("id", bw.id);
              await db.from("wallets").update({ os_balance: Number(sysW.os_balance) - payout }).eq("id", sysW.id);
              await db.from("transactions").insert({
                from_wallet_id: sysW.id, to_wallet_id: bw.id,
                token_type: "OS", amount: payout, tx_type: "reward",
                description: `Bet payout: ${market.question.substring(0, 40)}`,
              });
            }
            await db.from("bets").update({ claimed: true }).eq("id", bet.id);
          }
        }
      }

      await db.from("bet_markets").update({ status: outcome === 'cancelled' ? 'cancelled' : `resolved_${outcome}` }).eq("id", market_id);
      return json({ success: true });
    }

    return err("Unknown action: " + action);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
});
