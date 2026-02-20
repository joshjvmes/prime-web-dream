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

    return err("Unknown action: " + action);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
});
