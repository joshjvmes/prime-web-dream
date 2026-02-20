import { corsHeaders } from "../_shared/cors.ts";

const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY") || "";
const BASE = "https://api.polygon.io";

// In-memory cache
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cached(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}

async function polygonFetch(path: string) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}apiKey=${POLYGON_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Polygon ${res.status}: ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "get-tickers") {
      const cacheKey = "tickers";
      let data = cached(cacheKey);
      if (!data) {
        // Use previous close endpoint for watchlist
        const tickers = (url.searchParams.get("symbols") || "AAPL,TSLA,NVDA,AMZN,MSFT,GOOG,META,AMD").split(",");
        const results = await Promise.all(
          tickers.map(async (t) => {
            try {
              const d = await polygonFetch(`/v2/aggs/ticker/${t}/prev`);
              return { symbol: t, ...(d.results?.[0] || {}) };
            } catch {
              return { symbol: t, error: true };
            }
          })
        );
        data = results;
        setCache(cacheKey, data);
      }
      return new Response(JSON.stringify({ data, cached: cached(cacheKey) !== null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-snapshot") {
      const symbols = url.searchParams.get("symbols") || "AAPL,TSLA,NVDA,AMZN,MSFT,GOOG,META,AMD";
      const cacheKey = `snapshot-${symbols}`;
      let data = cached(cacheKey);
      if (!data) {
        const tickers = symbols.split(",");
        data = await polygonFetch(`/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickers.join(",")}`);
        setCache(cacheKey, data);
      }
      return new Response(JSON.stringify({ data, cached: cached(cacheKey) !== null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-chart") {
      const ticker = url.searchParams.get("ticker") || "AAPL";
      const from = url.searchParams.get("from") || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const to = url.searchParams.get("to") || new Date().toISOString().slice(0, 10);
      const timespan = url.searchParams.get("timespan") || "hour";
      const cacheKey = `chart-${ticker}-${from}-${to}-${timespan}`;
      let data = cached(cacheKey);
      if (!data) {
        data = await polygonFetch(`/v2/aggs/ticker/${ticker}/range/1/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=500`);
        setCache(cacheKey, data);
      }
      return new Response(JSON.stringify({ data, cached: cached(cacheKey) !== null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use get-tickers, get-snapshot, or get-chart" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
