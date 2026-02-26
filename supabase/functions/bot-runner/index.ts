import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { routeAICall } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { bot_id, event_type, event_payload, user_id } = body;

    if (!bot_id || !user_id) {
      return new Response(JSON.stringify({ error: "bot_id and user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load bot
    const { data: bot } = await supabaseAdmin
      .from("bot_registry")
      .select("*")
      .eq("id", bot_id)
      .eq("user_id", user_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!bot) {
      return new Response(JSON.stringify({ error: "Bot not found or inactive" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context message for the bot's AI
    const contextMessage = event_type
      ? `Event triggered: ${event_type}. Payload: ${JSON.stringify(event_payload || {})}. Decide what actions to take based on your instructions.`
      : "Scheduled execution. Perform your configured tasks.";

    const systemPrompt = bot.system_prompt || "You are a helpful automated bot. Respond with a brief summary of actions you would take.";

    // Call AI with the bot's system prompt, using BYOAK routing
    const aiResponse = await routeAICall({
      userId: user_id,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextMessage },
      ],
      maxTokens: 512,
      stream: false,
    });

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || "No action taken.";

    // Log the execution
    await supabaseAdmin.from("bot_audit_log").insert({
      bot_id: bot.id,
      user_id,
      tool_name: event_type ? `trigger:${event_type}` : "scheduled_run",
      args: event_payload || {},
      status: "success",
      result_summary: reply.slice(0, 500),
    });

    return new Response(JSON.stringify({ status: "success", reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
