// Sports odds integration with The Odds API
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "refresh-odds";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "refresh-odds" || action === "fetch-odds") {
      // Rate limit check: skip API call if last sports market was created < 5 min ago
      if (action === "refresh-odds") {
        const { data: recent } = await supabaseAdmin
          .from("bet_markets")
          .select("created_at")
          .eq("source", "sports_api")
          .order("created_at", { ascending: false })
          .limit(1);

        if (recent && recent.length > 0) {
          const lastCreated = new Date(recent[0].created_at).getTime();
          if (Date.now() - lastCreated < 5 * 60 * 1000) {
            // Return existing sports markets instead
            const { data: existing } = await supabaseAdmin
              .from("bet_markets")
              .select("*")
              .eq("source", "sports_api")
              .eq("status", "open")
              .order("commence_time", { ascending: true });

            return new Response(
              JSON.stringify({ markets: existing || [], skipped: true, message: "Rate limited - returning cached markets" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      // Fetch from The Odds API
      const apiKey = Deno.env.get("ODDS_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "ODDS_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const oddsRes = await fetch(
        `https://api.the-odds-api.com/v4/sports/upcoming/odds/?regions=us&markets=h2h&oddsFormat=american&apiKey=${apiKey}`
      );

      if (!oddsRes.ok) {
        const errText = await oddsRes.text();
        return new Response(
          JSON.stringify({ error: `Odds API error: ${oddsRes.status}`, details: errText }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const events = await oddsRes.json();
      let created = 0;
      let updated = 0;

      for (const event of events) {
        if (!event.home_team || !event.away_team) continue;

        const externalId = event.id;
        const question = `Will ${event.home_team} beat ${event.away_team}?`;

        // Check if market already exists
        const { data: existing } = await supabaseAdmin
          .from("bet_markets")
          .select("id")
          .eq("external_id", externalId)
          .maybeSingle();

        if (existing) {
          // Update odds_data only
          await supabaseAdmin
            .from("bet_markets")
            .update({ odds_data: { bookmakers: event.bookmakers || [] } })
            .eq("id", existing.id);
          updated++;
        } else {
          // Create new market
          await supabaseAdmin.from("bet_markets").insert({
            question,
            category: "sports",
            source: "sports_api",
            external_id: externalId,
            sport_key: event.sport_key,
            sport_title: event.sport_title,
            home_team: event.home_team,
            away_team: event.away_team,
            commence_time: event.commence_time,
            odds_data: { bookmakers: event.bookmakers || [] },
            creator_id: SYSTEM_USER_ID,
            creation_cost: 0,
            expiry: event.commence_time,
            status: "open",
            yes_pool: 0,
            no_pool: 0,
          });
          created++;
        }
      }

      // Return current sports markets
      const { data: allSports } = await supabaseAdmin
        .from("bet_markets")
        .select("*")
        .eq("source", "sports_api")
        .eq("status", "open")
        .order("commence_time", { ascending: true });

      return new Response(
        JSON.stringify({ markets: allSports || [], created, updated, total_events: events.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
