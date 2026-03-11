import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-bot-key, x-bot-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Database-backed rate limit check using bot_audit_log timestamps
async function checkRateLimit(
  botId: string,
  limit: number,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ allowed: boolean; used: number }> {
  const windowStart = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago

  const { count, error } = await supabaseAdmin
    .from("bot_audit_log")
    .select("*", { count: "exact", head: true })
    .eq("bot_id", botId)
    .gte("created_at", windowStart);

  if (error) {
    console.error("Rate limit check error:", error);
    // Fail open if we can't check — better than blocking all requests
    return { allowed: true, used: 0 };
  }

  const used = count || 0;
  return { allowed: used < limit, used };
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// All available tools with metadata
const ALL_TOOLS: Record<string, { description: string; parameters: Record<string, string>; category: string }> = {
  check_balance: { description: "Check wallet balance", parameters: {}, category: "financial" },
  transfer_tokens: { description: "Transfer OS/IX tokens", parameters: { to_name: "string", amount: "number", token_type: "OS|IX" }, category: "financial" },
  buy_shares: { description: "Buy app shares", parameters: { app_name: "string", amount: "number" }, category: "financial" },
  sell_shares: { description: "Sell app shares", parameters: { app_name: "string", shares: "number" }, category: "financial" },
  place_bet: { description: "Place a prediction bet", parameters: { market_question: "string", side: "YES|NO", amount: "number" }, category: "financial" },
  get_market_data: { description: "Fetch live stock prices", parameters: { symbols: "string" }, category: "market" },
  get_stock_chart: { description: "Get price chart data", parameters: { ticker: "string", days: "number" }, category: "market" },
  check_portfolio: { description: "View vault holdings", parameters: {}, category: "market" },
  trade_stock: { description: "Buy/sell stocks", parameters: { symbol: "string", action: "buy|sell", quantity: "number" }, category: "market" },
  create_booking: { description: "Book a resource", parameters: { resource: "string", start: "ISO8601", duration_minutes: "number" }, category: "booking" },
  list_bookings: { description: "List upcoming bookings", parameters: {}, category: "booking" },
  cancel_booking: { description: "Cancel a booking", parameters: { booking_id: "string" }, category: "booking" },
  send_message: { description: "Send a DM", parameters: { to_name: "string", message: "string" }, category: "messaging" },
  list_conversations: { description: "List DM conversations", parameters: {}, category: "messaging" },
  control_audio: { description: "Control audio playback", parameters: { action: "play|pause|skip|volume" }, category: "audio" },
  draw_on_canvas: { description: "Draw on PrimeCanvas", parameters: { commands: "JSON", clear_first: "boolean" }, category: "canvas" },
  generate_canvas_art: { description: "Generate procedural art", parameters: { style: "string", palette: "string" }, category: "canvas" },
  create_spreadsheet: { description: "Create a spreadsheet", parameters: { name: "string", headers: "string[]", rows: "string[][]" }, category: "spreadsheet" },
  update_cells: { description: "Update spreadsheet cells", parameters: { sheet: "string", cells: "Record<string,string>" }, category: "spreadsheet" },
  read_spreadsheet: { description: "Read spreadsheet data", parameters: { sheet: "string" }, category: "spreadsheet" },
  add_chart: { description: "Add a chart to spreadsheet", parameters: { sheet: "string", range: "string", chart_type: "string" }, category: "spreadsheet" },
  post_to_social: { description: "Post to PrimeSocial", parameters: { content: "string" }, category: "social" },
  send_email: { description: "Send email via PrimeMail", parameters: { to: "string", subject: "string", body: "string" }, category: "social" },
  save_memory: { description: "Store a memory", parameters: { category: "string", content: "string" }, category: "memory" },
  recall_memories: { description: "Search memories", parameters: { query: "string" }, category: "memory" },
  github_list_repos: { description: "List GitHub repos for connected account", parameters: {}, category: "github" },
  github_list_issues: { description: "List issues for a GitHub repo", parameters: { repo: "string" }, category: "github" },
  github_create_issue: { description: "Create a GitHub issue", parameters: { repo: "string", title: "string", body: "string" }, category: "github" },
  github_list_prs: { description: "List pull requests for a GitHub repo", parameters: { repo: "string" }, category: "github" },
  github_list_commits: { description: "List recent commits for a GitHub repo", parameters: { repo: "string" }, category: "github" },
};

// Client-side tools that return payloads for frontend EventBus
const CLIENT_SIDE_TOOLS = new Set([
  "draw_on_canvas", "generate_canvas_art", "create_spreadsheet",
  "update_cells", "add_chart", "control_audio",
]);

// Server-side tool execution (reuses hyper-chat logic)
async function executeServerTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ status: string; result: unknown }> {
  try {
    switch (toolName) {
      case "check_balance": {
        const { data } = await supabaseAdmin.from("wallets").select("os_balance, ix_balance").eq("user_id", userId).maybeSingle();
        return { status: "success", result: data || { os_balance: 0, ix_balance: 0 } };
      }
      case "get_market_data": {
        const symbols = (args.symbols as string) || "AAPL,MSFT,GOOGL";
        const apiKey = Deno.env.get("POLYGON_API_KEY");
        if (!apiKey) return { status: "error", result: "Market data API not configured" };
        const tickers = symbols.split(",").map(s => s.trim().toUpperCase());
        const results: Record<string, unknown>[] = [];
        for (const t of tickers.slice(0, 5)) {
          try {
            const r = await fetch(`https://api.polygon.io/v2/aggs/ticker/${t}/prev?adjusted=true&apiKey=${apiKey}`);
            const d = await r.json();
            if (d.results?.[0]) {
              results.push({ symbol: t, close: d.results[0].c, open: d.results[0].o, high: d.results[0].h, low: d.results[0].l, volume: d.results[0].v });
            }
          } catch { results.push({ symbol: t, error: "fetch failed" }); }
        }
        return { status: "success", result: { tickers: results } };
      }
      case "check_portfolio": {
        const { data } = await supabaseAdmin.from("vault_holdings").select("*").eq("user_id", userId);
        return { status: "success", result: data || [] };
      }
      case "list_bookings": {
        const { data } = await supabaseAdmin.from("bookings").select("*").eq("user_id", userId).gte("end_time", new Date().toISOString()).order("start_time");
        return { status: "success", result: data || [] };
      }
      case "cancel_booking": {
        const bookingId = args.booking_id as string;
        if (bookingId) {
          await supabaseAdmin.from("bookings").delete().eq("id", bookingId).eq("user_id", userId);
          return { status: "success", result: "Booking cancelled" };
        }
        return { status: "error", result: "No booking_id provided" };
      }
      case "create_booking": {
        const start = new Date(args.start as string);
        const end = new Date(start.getTime() + ((args.duration_minutes as number) || 60) * 60000);
        const { data, error } = await supabaseAdmin.from("bookings").insert({
          user_id: userId, resource: args.resource as string,
          start_time: start.toISOString(), end_time: end.toISOString(),
          purpose: (args.purpose as string) || "", priority: "medium",
        }).select().single();
        if (error) return { status: "error", result: error.message };
        return { status: "success", result: data };
      }
      case "read_spreadsheet": {
        const key = `spreadsheet_${(args.sheet as string) || "default"}`;
        const { data } = await supabaseAdmin.from("user_data").select("value").eq("user_id", userId).eq("key", key).maybeSingle();
        return { status: "success", result: data?.value || {} };
      }
      case "save_memory": {
        const { error } = await supabaseAdmin.from("ai_memories").insert({
          user_id: userId, category: (args.category as string) || "fact", content: args.content as string,
        });
        return { status: error ? "error" : "success", result: error ? error.message : "Memory saved" };
      }
      case "recall_memories": {
        const { data } = await supabaseAdmin.from("ai_memories").select("*").eq("user_id", userId).ilike("content", `%${args.query}%`).limit(10);
        return { status: "success", result: data || [] };
      }
      case "post_to_social":
      case "send_email":
      case "transfer_tokens":
      case "buy_shares":
      case "sell_shares":
      case "place_bet":
      case "trade_stock":
      case "send_message":
      case "list_conversations":
      case "get_stock_chart":
        // These are handled client-side or require complex logic — return as client-side action
        return { status: "success", result: { _client_action: toolName, args } };
      case "github_list_repos":
      case "github_list_issues":
      case "github_create_issue":
      case "github_list_prs":
      case "github_list_commits": {
        // Proxy to github-app edge function
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const actionMap: Record<string, string> = {
          github_list_repos: "list-repos",
          github_list_issues: "list-issues",
          github_create_issue: "create-issue",
          github_list_prs: "list-prs",
          github_list_commits: "list-commits",
        };
        const ghResp = await fetch(`${supabaseUrl}/functions/v1/github-app?action=${actionMap[toolName]}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
          body: JSON.stringify({ ...args, user_id: userId }),
        });
        const ghData = await ghResp.json();
        return { status: ghResp.ok ? "success" : "error", result: ghData };
      }
      default:
        return { status: "error", result: `Unknown tool: ${toolName}` };
    }
  } catch (e) {
    return { status: "error", result: (e as Error).message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "status";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  // ── Authentication ──
  let botId: string | null = null;
  let userId: string | null = null;
  let botPermissions: string[] = [];
  let botRateLimit = 60;
  let botRecord: Record<string, unknown> | null = null;

  const apiKey = req.headers.get("x-bot-key");
  const authHeader = req.headers.get("authorization");
  const botIdHeader = req.headers.get("x-bot-id");

  if (apiKey) {
    // API Key auth
    const keyHash = await hashKey(apiKey);
    const { data: keyData } = await supabaseAdmin
      .from("bot_api_keys")
      .select("bot_id, user_id, is_revoked, expires_at")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (!keyData || keyData.is_revoked) {
      return new Response(JSON.stringify({ error: "Invalid or revoked API key" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "API key expired" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    botId = keyData.bot_id;
    userId = keyData.user_id;

    // Update last_used_at
    await supabaseAdmin.from("bot_api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", keyHash);
  } else if (authHeader && botIdHeader) {
    // JWT + Bot ID auth
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error } = await userClient.auth.getClaims(token);
    if (error || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    userId = claims.claims.sub as string;
    botId = botIdHeader;
  } else if (authHeader) {
    // JWT only — for listing bots, creating bots, etc.
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error } = await userClient.auth.getClaims(token);
    if (error || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    userId = claims.claims.sub as string;
  } else {
    return new Response(JSON.stringify({ error: "No authentication provided" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Load bot record if we have a botId
  if (botId) {
    const { data } = await supabaseAdmin.from("bot_registry").select("*").eq("id", botId).eq("user_id", userId).maybeSingle();
    if (!data) {
      return new Response(JSON.stringify({ error: "Bot not found or access denied" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!data.is_active) {
      return new Response(JSON.stringify({ error: "Bot is disabled" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    botRecord = data;
    botPermissions = (data.permissions as string[]) || [];
    botRateLimit = data.rate_limit || 60;
  }

  // ── Route by action ──
  try {
    switch (action) {
      case "tools": {
        const tools = botPermissions.length > 0
          ? Object.entries(ALL_TOOLS).filter(([name]) => botPermissions.includes(name)).map(([name, t]) => ({ name, ...t }))
          : Object.entries(ALL_TOOLS).map(([name, t]) => ({ name, ...t }));
        return new Response(JSON.stringify({ tools }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "execute": {
        if (!botId) return new Response(JSON.stringify({ error: "Bot ID required for execution" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        // Rate limit check (database-backed, distributed)
        const execRL = await checkRateLimit(botId, botRateLimit, supabaseAdmin);
        if (!execRL.allowed) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded", limit: botRateLimit, used: execRL.used, window: "1 hour" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const body = await req.json();
        const toolName = body.tool as string;
        const toolArgs = (body.args || {}) as Record<string, unknown>;

        if (!toolName || !ALL_TOOLS[toolName]) {
          return new Response(JSON.stringify({ error: `Unknown tool: ${toolName}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Permission check
        if (botPermissions.length > 0 && !botPermissions.includes(toolName)) {
          // Audit denied
          await supabaseAdmin.from("bot_audit_log").insert({ bot_id: botId, user_id: userId, tool_name: toolName, args: toolArgs, status: "denied", result_summary: "Permission denied" });
          return new Response(JSON.stringify({ error: "Permission denied for this tool" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Execute
        let result;
        if (CLIENT_SIDE_TOOLS.has(toolName)) {
          result = { status: "success", result: { _client_action: toolName, args: toolArgs } };
        } else {
          result = await executeServerTool(toolName, toolArgs, userId!, supabaseAdmin);
        }

        // Audit log
        await supabaseAdmin.from("bot_audit_log").insert({
          bot_id: botId, user_id: userId, tool_name: toolName,
          args: toolArgs, status: result.status,
          result_summary: typeof result.result === "string" ? result.result : JSON.stringify(result.result).slice(0, 500),
        });

        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "chat": {
        if (!botId) return new Response(JSON.stringify({ error: "Bot ID required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const chatRL = await checkRateLimit(botId, botRateLimit, supabaseAdmin);
        if (!chatRL.allowed) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded", limit: botRateLimit, used: chatRL.used, window: "1 hour" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const body = await req.json();
        const message = body.message as string;
        const systemPrompt = (botRecord as Record<string, unknown>)?.system_prompt as string || "You are a helpful bot.";

        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
        if (!lovableApiKey) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableApiKey}` },
          body: JSON.stringify({
            model: "openai/gpt-5-mini",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
            max_tokens: 1024,
          }),
        });

        const aiData = await aiResponse.json();
        const reply = aiData.choices?.[0]?.message?.content || "No response generated.";

        await supabaseAdmin.from("bot_audit_log").insert({
          bot_id: botId, user_id: userId, tool_name: "chat",
          args: { message }, status: "success", result_summary: reply.slice(0, 500),
        });

        return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "status": {
        if (!botId) {
          // List all bots for user
          const { data } = await supabaseAdmin.from("bot_registry").select("*").eq("user_id", userId).order("created_at", { ascending: false });
          return new Response(JSON.stringify({ bots: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const statusRL = await checkRateLimit(botId, botRateLimit, supabaseAdmin);
        return new Response(JSON.stringify({
          bot: botRecord,
          rate_limit: { limit: botRateLimit, used: statusRL.used, remaining: botRateLimit - statusRL.used, window: "1 hour" },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── Bot CRUD (JWT auth only, no bot required) ──
      case "create-bot": {
        const body = await req.json();
        const { data, error } = await supabaseAdmin.from("bot_registry").insert({
          user_id: userId, name: body.name, description: body.description || "",
          bot_type: body.bot_type || "autonomous", permissions: body.permissions || [],
          system_prompt: body.system_prompt || "", trigger_config: body.trigger_config || null,
          schedule: body.schedule || null, rate_limit: body.rate_limit || 60,
        }).select().single();
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ bot: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update-bot": {
        if (!botId) return new Response(JSON.stringify({ error: "Bot ID required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const body = await req.json();
        const { data, error } = await supabaseAdmin.from("bot_registry").update(body).eq("id", botId).eq("user_id", userId).select().single();
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ bot: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "delete-bot": {
        if (!botId) return new Response(JSON.stringify({ error: "Bot ID required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        await supabaseAdmin.from("bot_registry").delete().eq("id", botId).eq("user_id", userId);
        return new Response(JSON.stringify({ deleted: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "generate-key": {
        if (!botId) return new Response(JSON.stringify({ error: "Bot ID required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const rawBytes = new Uint8Array(16);
        crypto.getRandomValues(rawBytes);
        const rawKey = "clw_" + Array.from(rawBytes).map(b => b.toString(16).padStart(2, "0")).join("");
        const keyHash = await hashKey(rawKey);
        const keyPrefix = rawKey.slice(0, 12);
        const body = await req.json().catch(() => ({}));
        const { error } = await supabaseAdmin.from("bot_api_keys").insert({
          bot_id: botId, user_id: userId, key_hash: keyHash, key_prefix: keyPrefix,
          expires_at: (body as Record<string, unknown>).expires_at || null,
        });
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ key: rawKey, prefix: keyPrefix, warning: "Store this key securely. It will not be shown again." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "revoke-key": {
        const body = await req.json();
        const keyId = (body as Record<string, unknown>).key_id as string;
        await supabaseAdmin.from("bot_api_keys").update({ is_revoked: true }).eq("id", keyId).eq("user_id", userId);
        return new Response(JSON.stringify({ revoked: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list-keys": {
        if (!botId) return new Response(JSON.stringify({ error: "Bot ID required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { data } = await supabaseAdmin.from("bot_api_keys").select("id, key_prefix, is_revoked, last_used_at, expires_at, created_at").eq("bot_id", botId).eq("user_id", userId);
        return new Response(JSON.stringify({ keys: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "audit-log": {
        const limit = parseInt(url.searchParams.get("limit") || "50");
        let query = supabaseAdmin.from("bot_audit_log").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
        if (botId) query = query.eq("bot_id", botId);
        const { data } = await query;
        return new Response(JSON.stringify({ logs: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
