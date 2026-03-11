import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface HookRecord {
  id: string;
  user_id: string;
  name: string;
  trigger_event: string;
  action_type: string;
  action_config: Record<string, unknown>;
  enabled: boolean;
}

interface HookResult {
  hook_id: string;
  hook_name: string;
  status: "success" | "error";
  detail?: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function executeWebhook(
  config: Record<string, unknown>,
  event: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; detail: string }> {
  const url = config.url as string;
  if (!url) return { ok: false, detail: "No webhook URL configured" };

  const method = ((config.method as string) || "POST").toUpperCase();
  const customHeaders = (config.headers as Record<string, string>) || {};
  const timeout = Math.min(Number(config.timeout_ms) || 5000, 10000);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Hook-Event": event,
        ...customHeaders,
      },
      body: method !== "GET" ? JSON.stringify({ event, payload, timestamp: new Date().toISOString() }) : undefined,
    });
    clearTimeout(timer);
    return { ok: resp.ok, detail: `HTTP ${resp.status}` };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, detail: (e as Error).message };
  }
}

async function executeEdgeFunction(
  config: Record<string, unknown>,
  event: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; detail: string }> {
  const funcName = config.function_name as string;
  if (!funcName) return { ok: false, detail: "No function_name configured" };

  const funcUrl = `${SUPABASE_URL}/functions/v1/${funcName}`;
  const action = config.action as string;
  const url = action ? `${funcUrl}?action=${action}` : funcUrl;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ ...payload, _hook_event: event, ...(config.extra_body as Record<string, unknown> || {}) }),
    });
    return { ok: resp.ok, detail: `HTTP ${resp.status}` };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}

async function executeDbInsert(
  config: Record<string, unknown>,
  _event: string,
  payload: Record<string, unknown>,
  userId: string
): Promise<{ ok: boolean; detail: string }> {
  const table = config.table as string;
  if (!table) return { ok: false, detail: "No table configured" };

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const rowTemplate = (config.row as Record<string, unknown>) || {};

  // Replace {{placeholder}} tokens in row values with payload data
  const row: Record<string, unknown> = { user_id: userId };
  for (const [key, val] of Object.entries(rowTemplate)) {
    if (typeof val === "string" && val.startsWith("{{") && val.endsWith("}}")) {
      const payloadKey = val.slice(2, -2).trim();
      row[key] = payload[payloadKey] ?? val;
    } else {
      row[key] = val;
    }
  }

  const { error } = await db.from(table).insert(row);
  if (error) return { ok: false, detail: error.message };
  return { ok: true, detail: "Row inserted" };
}

async function executeNotification(
  config: Record<string, unknown>,
  event: string,
  _payload: Record<string, unknown>,
  userId: string
): Promise<{ ok: boolean; detail: string }> {
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const subject = (config.subject as string) || `Hook triggered: ${event}`;
  const body = (config.body as string) || `Event "${event}" was triggered.`;

  const { error } = await db.from("user_emails").insert({
    user_id: userId,
    from_address: "system@primeos.local",
    to_address: "operator",
    subject,
    body,
    folder: "inbox",
    ai_generated: false,
  });
  if (error) return { ok: false, detail: error.message };
  return { ok: true, detail: "Notification sent" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { event, payload = {}, user_id } = body;

    if (!event) return json({ error: "event is required" }, 400);

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find all enabled hooks matching this event
    let query = db
      .from("cloud_hooks")
      .select("*")
      .eq("trigger_event", event)
      .eq("enabled", true);

    // If user_id provided, scope to that user's hooks
    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: hooks, error: fetchError } = await query;
    if (fetchError) return json({ error: fetchError.message }, 500);
    if (!hooks || hooks.length === 0) {
      return json({ dispatched: 0, results: [], message: "No matching hooks" });
    }

    const results: HookResult[] = [];

    for (const hook of hooks as HookRecord[]) {
      let result: { ok: boolean; detail: string };

      switch (hook.action_type) {
        case "webhook":
          result = await executeWebhook(hook.action_config, event, payload);
          break;
        case "edge_function":
          result = await executeEdgeFunction(hook.action_config, event, payload);
          break;
        case "db_insert":
          result = await executeDbInsert(hook.action_config, event, payload, hook.user_id);
          break;
        case "notification":
          result = await executeNotification(hook.action_config, event, payload, hook.user_id);
          break;
        default:
          result = { ok: false, detail: `Unknown action_type: ${hook.action_type}` };
      }

      results.push({
        hook_id: hook.id,
        hook_name: hook.name,
        status: result.ok ? "success" : "error",
        detail: result.detail,
      });
    }

    return json({
      dispatched: results.length,
      success: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
      results,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
