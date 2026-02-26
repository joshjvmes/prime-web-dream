import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Lightweight cron matcher ──

function cronMatches(expr: string, date: Date): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minE, hourE, domE, monE, dowE] = parts;
  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();
  const dom = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const dow = date.getUTCDay(); // 0=Sun

  return (
    fieldMatches(minE, minute, 0, 59) &&
    fieldMatches(hourE, hour, 0, 23) &&
    fieldMatches(domE, dom, 1, 31) &&
    fieldMatches(monE, month, 1, 12) &&
    fieldMatches(dowE, dow, 0, 6)
  );
}

function fieldMatches(expr: string, value: number, min: number, max: number): boolean {
  if (expr === "*") return true;
  for (const part of expr.split(",")) {
    if (part.includes("/")) {
      const [range, stepStr] = part.split("/");
      const step = parseInt(stepStr);
      if (isNaN(step) || step <= 0) continue;
      let start = min;
      if (range !== "*") {
        const [s] = range.split("-");
        start = parseInt(s);
      }
      if ((value - start) % step === 0 && value >= start) return true;
    } else if (part.includes("-")) {
      const [lo, hi] = part.split("-").map(Number);
      if (value >= lo && value <= hi) return true;
    } else {
      if (parseInt(part) === value) return true;
    }
  }
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();

    // Get all active bots with schedules
    const { data: bots, error } = await db
      .from("bot_registry")
      .select("id, user_id, schedule, last_run_at, name, system_prompt")
      .eq("is_active", true)
      .not("schedule", "is", null);

    if (error) throw error;
    if (!bots?.length) {
      return new Response(JSON.stringify({ dispatched: 0, message: "No scheduled bots" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let dispatched = 0;

    for (const bot of bots) {
      if (!bot.schedule) continue;

      // Check if cron matches current minute
      if (!cronMatches(bot.schedule, now)) continue;

      // Check last_run_at to avoid double-firing within the same minute
      if (bot.last_run_at) {
        const lastRun = new Date(bot.last_run_at);
        const diffMs = now.getTime() - lastRun.getTime();
        if (diffMs < 55000) continue; // Less than 55 seconds since last run
      }

      // Enqueue a task
      const { error: insertError } = await db.from("agent_tasks").insert({
        bot_id: bot.id,
        user_id: bot.user_id,
        instruction: `Scheduled execution for "${bot.name}". Execute your system prompt duties.`,
        lane: "normal",
        input_payload: { trigger: "cron", schedule: bot.schedule, fired_at: now.toISOString() },
      });

      if (insertError) {
        console.error(`Failed to enqueue task for bot ${bot.id}:`, insertError);
        continue;
      }

      // Update last_run_at
      await db.from("bot_registry")
        .update({ last_run_at: now.toISOString() })
        .eq("id", bot.id);

      dispatched++;
    }

    // Cleanup old activity (run once per invocation)
    await db.rpc("cleanup_old_activity").catch(() => {});

    return new Response(JSON.stringify({ dispatched, checked: bots.length, time: now.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
