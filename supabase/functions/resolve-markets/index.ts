import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface BetMarket {
  id: string;
  question: string;
  yes_pool: number;
  no_pool: number;
  status: string;
  expiry: string | null;
  source: string | null;
  external_id: string | null;
  sport_key: string | null;
  home_team: string | null;
  away_team: string | null;
  commence_time: string | null;
  odds_data: { bookmakers?: any[] } | null;
}

interface Bet {
  id: string;
  user_id: string;
  market_id: string;
  side: string;
  amount: number;
  claimed: boolean;
}

/**
 * Attempt to determine the outcome of a sports market using The Odds API scores endpoint.
 * Returns "yes" (home team won), "no" (away team won), or null (game not completed).
 */
async function fetchSportsResult(market: BetMarket): Promise<"yes" | "no" | null> {
  const apiKey = Deno.env.get("ODDS_API_KEY");
  if (!apiKey || !market.sport_key || !market.external_id) return null;

  try {
    const resp = await fetch(
      `https://api.the-odds-api.com/v4/sports/${market.sport_key}/scores/?apiKey=${apiKey}&daysFrom=3`
    );
    if (!resp.ok) return null;

    const scores: any[] = await resp.json();
    const match = scores.find((s: any) => s.id === market.external_id);

    if (!match || !match.completed) return null;

    // Determine winner from scores
    const homeScore = match.scores?.find((s: any) => s.name === market.home_team);
    const awayScore = match.scores?.find((s: any) => s.name === market.away_team);

    if (!homeScore || !awayScore) return null;

    const home = Number(homeScore.score);
    const away = Number(awayScore.score);

    if (home > away) return "yes"; // Home team won → "yes" side wins
    if (away > home) return "no";  // Away team won → "no" side wins
    return "no"; // Tie → home team did NOT beat away team → "no"
  } catch (e) {
    console.error("Failed to fetch sports result:", e);
    return null;
  }
}

/**
 * Distribute winnings for a resolved market.
 * Replicates the payout logic from prime-bank bet-resolve.
 */
async function distributePayouts(
  db: ReturnType<typeof createClient>,
  market: BetMarket,
  outcome: "yes" | "no"
): Promise<number> {
  const totalPool = Number(market.yes_pool) + Number(market.no_pool);
  if (totalPool <= 0) return 0;

  const winningSide = outcome === "yes" ? "YES" : "NO";
  const winningPool = outcome === "yes" ? Number(market.yes_pool) : Number(market.no_pool);
  if (winningPool <= 0) return 0;

  const { data: winners } = await db
    .from("bets")
    .select("*")
    .eq("market_id", market.id)
    .eq("side", winningSide)
    .eq("claimed", false);

  if (!winners || winners.length === 0) return 0;

  const { data: sysW } = await db
    .from("wallets")
    .select("*")
    .eq("is_system", true)
    .maybeSingle();

  if (!sysW) return 0;

  let totalPaid = 0;

  for (const bet of winners as Bet[]) {
    const payout = (Number(bet.amount) / winningPool) * totalPool;

    const { data: bw } = await db
      .from("wallets")
      .select("*")
      .eq("user_id", bet.user_id)
      .maybeSingle();

    if (bw) {
      await db.from("wallets")
        .update({ os_balance: Number(bw.os_balance) + payout })
        .eq("id", bw.id);

      await db.from("wallets")
        .update({ os_balance: Number(sysW.os_balance) - payout })
        .eq("id", sysW.id);

      // Re-read system wallet to keep running balance accurate
      const { data: refreshed } = await db.from("wallets").select("os_balance").eq("id", sysW.id).single();
      if (refreshed) sysW.os_balance = refreshed.os_balance;

      await db.from("transactions").insert({
        from_wallet_id: sysW.id,
        to_wallet_id: bw.id,
        token_type: "OS",
        amount: payout,
        tx_type: "reward",
        description: `Auto-resolved payout: ${market.question.substring(0, 40)}`,
      });

      await db.from("bets").update({ claimed: true }).eq("id", bet.id);
      totalPaid += payout;
    }
  }

  return totalPaid;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();

    // Find all open sports markets that have commenced (game should be over)
    // We add a 4-hour buffer after commence_time to allow games to finish
    const cutoff = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();

    const { data: markets, error } = await db
      .from("bet_markets")
      .select("*")
      .eq("status", "open")
      .eq("source", "sports_api")
      .not("external_id", "is", null)
      .lte("commence_time", cutoff)
      .order("commence_time", { ascending: true })
      .limit(20); // Process in batches to avoid timeout

    if (error) return json({ error: error.message }, 500);
    if (!markets || markets.length === 0) {
      return json({ resolved: 0, checked: 0, message: "No markets ready for resolution" });
    }

    let resolved = 0;
    let skipped = 0;
    const details: { market_id: string; question: string; outcome: string; payout: number }[] = [];

    for (const market of markets as BetMarket[]) {
      const outcome = await fetchSportsResult(market);

      if (!outcome) {
        skipped++;
        continue;
      }

      // Distribute payouts
      const totalPaid = await distributePayouts(db, market, outcome);

      // Mark market as resolved
      await db
        .from("bet_markets")
        .update({ status: `resolved_${outcome}` })
        .eq("id", market.id);

      resolved++;
      details.push({
        market_id: market.id,
        question: market.question,
        outcome,
        payout: totalPaid,
      });
    }

    // Also expire very old markets (>7 days past commence_time with no result) as cancelled
    const expiryCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleMarkets } = await db
      .from("bet_markets")
      .select("id, yes_pool, no_pool, question")
      .eq("status", "open")
      .eq("source", "sports_api")
      .lte("commence_time", expiryCutoff);

    let cancelled = 0;
    for (const stale of (staleMarkets || [])) {
      const totalPool = Number(stale.yes_pool) + Number(stale.no_pool);

      // Refund all bets
      if (totalPool > 0) {
        const { data: allBets } = await db
          .from("bets")
          .select("*")
          .eq("market_id", stale.id)
          .eq("claimed", false);

        const { data: sysW } = await db
          .from("wallets")
          .select("*")
          .eq("is_system", true)
          .maybeSingle();

        for (const bet of (allBets || []) as Bet[]) {
          const { data: bw } = await db
            .from("wallets")
            .select("*")
            .eq("user_id", bet.user_id)
            .maybeSingle();

          if (bw && sysW) {
            await db.from("wallets")
              .update({ os_balance: Number(bw.os_balance) + Number(bet.amount) })
              .eq("id", bw.id);
            await db.from("bets").update({ claimed: true }).eq("id", bet.id);
          }
        }

        if (sysW) {
          await db.from("wallets")
            .update({ os_balance: Number(sysW.os_balance) - totalPool })
            .eq("id", sysW.id);
        }
      }

      await db.from("bet_markets").update({ status: "cancelled" }).eq("id", stale.id);
      cancelled++;
    }

    return json({
      resolved,
      skipped,
      cancelled,
      checked: markets.length,
      details,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
