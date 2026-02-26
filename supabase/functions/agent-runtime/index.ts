import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { routeAICall } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANE_PRIORITY: Record<string, number> = {
  critical: 0, high: 1, normal: 2, low: 3, background: 4,
};

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!
  );
  const { data } = await sb.auth.getUser(token);
  return data.user?.id || null;
}

// ── Agent tools that the AI can call ──

function getAgentTools() {
  return [
    {
      type: "function",
      function: {
        name: "spawn_subtask",
        description: "Delegate a task to a child agent. Returns the child task ID.",
        parameters: {
          type: "object",
          properties: {
            instruction: { type: "string", description: "What the sub-agent should do" },
            lane: { type: "string", enum: ["critical", "high", "normal", "low", "background"], description: "Priority lane (default: normal)" },
            input_payload: { type: "object", description: "Input data for the subtask" },
          },
          required: ["instruction"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "save_to_memory",
        description: "Save a key-value pair to the bot's persistent memory.",
        parameters: {
          type: "object",
          properties: {
            namespace: { type: "string", enum: ["facts", "context", "conversation", "state"], description: "Memory category" },
            key: { type: "string", description: "Memory key" },
            value: { description: "Value to store (any JSON)" },
          },
          required: ["namespace", "key", "value"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "recall_from_memory",
        description: "Retrieve data from the bot's persistent memory. If no key, lists all in namespace.",
        parameters: {
          type: "object",
          properties: {
            namespace: { type: "string", enum: ["facts", "context", "conversation", "state"] },
            key: { type: "string", description: "Specific key to recall (optional)" },
          },
          required: ["namespace"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "check_subtask",
        description: "Check if a spawned subtask has completed and get its result.",
        parameters: {
          type: "object",
          properties: {
            task_id: { type: "string", description: "The subtask ID to check" },
          },
          required: ["task_id"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "emit_status",
        description: "Emit a status update to the streaming log without taking an action.",
        parameters: {
          type: "object",
          properties: {
            message: { type: "string", description: "Status message to emit" },
          },
          required: ["message"],
        },
      },
    },
  ];
}

// ── Tool execution ──

async function executeAgentTool(
  toolName: string,
  args: any,
  context: { db: any; botId: string; userId: string; taskId: string }
): Promise<any> {
  const { db, botId, userId, taskId } = context;

  switch (toolName) {
    case "spawn_subtask": {
      const { data: child } = await db.from("agent_tasks").insert({
        bot_id: botId,
        user_id: userId,
        parent_task_id: taskId,
        spawned_by_bot_id: botId,
        lane: args.lane || "normal",
        instruction: args.instruction,
        input_payload: args.input_payload || {},
      }).select("id").single();
      return { task_id: child?.id, status: "queued" };
    }

    case "save_to_memory": {
      await db.from("agent_memory").upsert({
        bot_id: botId,
        user_id: userId,
        namespace: args.namespace,
        key: args.key,
        value: args.value,
      }, { onConflict: "bot_id,namespace,key" });
      return { saved: true, namespace: args.namespace, key: args.key };
    }

    case "recall_from_memory": {
      let query = db.from("agent_memory")
        .select("key, value, updated_at")
        .eq("bot_id", botId)
        .eq("namespace", args.namespace);
      if (args.key) query = query.eq("key", args.key);
      const { data } = await query;
      if (args.key) return data?.[0]?.value || null;
      return (data || []).reduce((acc: any, r: any) => { acc[r.key] = r.value; return acc; }, {});
    }

    case "check_subtask": {
      const { data: task } = await db.from("agent_tasks")
        .select("status, result, error")
        .eq("id", args.task_id)
        .single();
      return task || { error: "Task not found" };
    }

    case "emit_status": {
      return { emitted: true, message: args.message };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── Enqueue ──

async function handleEnqueue(db: any, userId: string, body: any) {
  const { bot_id, instruction, lane, input_payload, parent_task_id, max_steps } = body;
  if (!bot_id || !instruction) {
    return new Response(JSON.stringify({ error: "bot_id and instruction required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify bot belongs to user
  const { data: bot } = await db.from("bot_registry")
    .select("id").eq("id", bot_id).eq("user_id", userId).maybeSingle();
  if (!bot) {
    return new Response(JSON.stringify({ error: "Bot not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: task, error } = await db.from("agent_tasks").insert({
    bot_id,
    user_id: userId,
    instruction,
    lane: lane || "normal",
    input_payload: input_payload || {},
    parent_task_id: parent_task_id || null,
    max_steps: max_steps || 10,
  }).select("*").single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ task }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Execute ──

async function handleExecute(db: any, userId: string, body: any) {
  const { bot_id, task_id } = body;
  if (!bot_id) {
    return new Response(JSON.stringify({ error: "bot_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Pick task: specific or highest priority queued
  let task: any;
  if (task_id) {
    const { data } = await db.from("agent_tasks")
      .select("*").eq("id", task_id).eq("user_id", userId).single();
    task = data;
  } else {
    // Lane priority ordering
    const { data } = await db.from("agent_tasks")
      .select("*")
      .eq("bot_id", bot_id)
      .eq("user_id", userId)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(50);

    if (data?.length) {
      // Sort by lane priority
      data.sort((a: any, b: any) =>
        (LANE_PRIORITY[a.lane] ?? 2) - (LANE_PRIORITY[b.lane] ?? 2)
      );
      task = data[0];
    }
  }

  if (!task) {
    return new Response(JSON.stringify({ message: "No queued tasks" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Mark task running
  await db.from("agent_tasks")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", task.id);

  // Load bot
  const { data: bot } = await db.from("bot_registry")
    .select("*").eq("id", bot_id).single();
  if (!bot) {
    return new Response(JSON.stringify({ error: "Bot not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create run record
  const { data: run } = await db.from("agent_runs").insert({
    task_id: task.id,
    bot_id,
    user_id: userId,
    steps: [],
  }).select("id").single();

  const runId = run?.id;
  const steps: any[] = [];
  let totalTokens = { prompt: 0, completion: 0, total: 0 };

  // Load bot memory for context
  const { data: memories } = await db.from("agent_memory")
    .select("namespace, key, value")
    .eq("bot_id", bot_id)
    .limit(50);

  const memoryContext = memories?.length
    ? `\n\nYour persistent memory:\n${memories.map((m: any) => `[${m.namespace}] ${m.key}: ${JSON.stringify(m.value)}`).join("\n")}`
    : "";

  const systemPrompt = (bot.system_prompt || "You are a helpful automated agent.") +
    `\n\nTask instruction: ${task.instruction}` +
    (task.input_payload && Object.keys(task.input_payload).length
      ? `\nInput data: ${JSON.stringify(task.input_payload)}`
      : "") +
    memoryContext +
    "\n\nYou have access to agent tools: spawn_subtask, save_to_memory, recall_from_memory, check_subtask, emit_status." +
    "\nWhen you're done with all actions, provide a final summary response without any tool calls.";

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: task.instruction },
  ];

  const tools = getAgentTools();
  const toolCtx = { db, botId: bot_id, userId, taskId: task.id };

  try {
    for (let step = 0; step < task.max_steps; step++) {
      const aiResp = await routeAICall({
        userId,
        messages,
        tools,
        stream: false,
        maxTokens: 1024,
      });

      const aiData = await aiResp.json();
      const choice = aiData.choices?.[0];
      if (!choice) {
        steps.push({ step, action: "error", result: "No AI response", timestamp: new Date().toISOString() });
        break;
      }

      const msg = choice.message;

      // Track tokens
      if (aiData.usage) {
        totalTokens.prompt += aiData.usage.prompt_tokens || 0;
        totalTokens.completion += aiData.usage.completion_tokens || 0;
        totalTokens.total += aiData.usage.total_tokens || 0;
      }

      // If tool calls, execute them
      if (msg.tool_calls?.length) {
        messages.push(msg);

        for (const tc of msg.tool_calls) {
          const toolArgs = typeof tc.function.arguments === "string"
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments;

          const result = await executeAgentTool(tc.function.name, toolArgs, toolCtx);

          const stepEntry = {
            step,
            action: `tool:${tc.function.name}`,
            args: toolArgs,
            result,
            timestamp: new Date().toISOString(),
          };
          steps.push(stepEntry);

          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }

        // Update run with latest steps (triggers realtime)
        await db.from("agent_runs")
          .update({ steps })
          .eq("id", runId);

        // Also update task steps
        await db.from("agent_tasks")
          .update({ steps })
          .eq("id", task.id);

      } else {
        // Final response - no tool calls
        const finalText = msg.content || "Task completed.";
        steps.push({
          step,
          action: "complete",
          result: finalText,
          timestamp: new Date().toISOString(),
        });

        // Mark everything complete
        const now = new Date().toISOString();
        await db.from("agent_tasks").update({
          status: "completed",
          result: { summary: finalText },
          steps,
          completed_at: now,
        }).eq("id", task.id);

        await db.from("agent_runs").update({
          status: "completed",
          steps,
          token_usage: totalTokens,
          completed_at: now,
        }).eq("id", runId);

        return new Response(JSON.stringify({
          status: "completed",
          task_id: task.id,
          run_id: runId,
          steps,
          result: finalText,
          token_usage: totalTokens,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Max steps reached
    const now = new Date().toISOString();
    await db.from("agent_tasks").update({
      status: "completed",
      result: { summary: "Max steps reached" },
      steps,
      completed_at: now,
    }).eq("id", task.id);

    await db.from("agent_runs").update({
      status: "completed",
      steps,
      token_usage: totalTokens,
      completed_at: now,
    }).eq("id", runId);

    return new Response(JSON.stringify({
      status: "completed",
      task_id: task.id,
      run_id: runId,
      steps,
      result: "Max steps reached",
      token_usage: totalTokens,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    const now = new Date().toISOString();
    const errorMsg = (e as Error).message;
    steps.push({ step: steps.length, action: "error", result: errorMsg, timestamp: now });

    await db.from("agent_tasks").update({
      status: "failed", error: errorMsg, steps, completed_at: now,
    }).eq("id", task.id);

    await db.from("agent_runs").update({
      status: "failed", steps, completed_at: now,
    }).eq("id", runId);

    return new Response(JSON.stringify({ status: "failed", error: errorMsg, steps }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// ── Cancel ──

async function handleCancel(db: any, userId: string, body: any) {
  const { task_id } = body;
  if (!task_id) {
    return new Response(JSON.stringify({ error: "task_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Cancel task + children
  await db.from("agent_tasks")
    .update({ status: "cancelled", completed_at: new Date().toISOString() })
    .eq("id", task_id).eq("user_id", userId);

  await db.from("agent_tasks")
    .update({ status: "cancelled", completed_at: new Date().toISOString() })
    .eq("parent_task_id", task_id).eq("user_id", userId)
    .in("status", ["queued", "running"]);

  return new Response(JSON.stringify({ cancelled: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Status ──

async function handleStatus(db: any, userId: string, body: any) {
  const { bot_id } = body;
  let query = db.from("agent_tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (bot_id) query = query.eq("bot_id", bot_id);
  const { data: tasks } = await query;

  const grouped: Record<string, any[]> = {};
  for (const t of tasks || []) {
    const lane = t.lane || "normal";
    if (!grouped[lane]) grouped[lane] = [];
    grouped[lane].push(t);
  }

  return new Response(JSON.stringify({ tasks: tasks || [], grouped }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Memory ──

async function handleMemory(db: any, userId: string, body: any) {
  const { sub_action, bot_id, namespace, key, value } = body;
  if (!bot_id) {
    return new Response(JSON.stringify({ error: "bot_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  switch (sub_action) {
    case "get": {
      let q = db.from("agent_memory").select("*").eq("bot_id", bot_id).eq("user_id", userId);
      if (namespace) q = q.eq("namespace", namespace);
      if (key) q = q.eq("key", key);
      const { data } = await q;
      return new Response(JSON.stringify({ memories: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    case "set": {
      if (!namespace || !key) {
        return new Response(JSON.stringify({ error: "namespace and key required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await db.from("agent_memory").upsert({
        bot_id, user_id: userId, namespace, key, value: value || {},
      }, { onConflict: "bot_id,namespace,key" });
      return new Response(JSON.stringify({ saved: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    case "delete": {
      let q = db.from("agent_memory").delete().eq("bot_id", bot_id).eq("user_id", userId);
      if (namespace) q = q.eq("namespace", namespace);
      if (key) q = q.eq("key", key);
      await q;
      return new Response(JSON.stringify({ deleted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    case "list": {
      const { data } = await db.from("agent_memory")
        .select("namespace, key, updated_at")
        .eq("bot_id", bot_id).eq("user_id", userId);
      return new Response(JSON.stringify({ keys: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    default:
      return new Response(JSON.stringify({ error: "sub_action must be get, set, delete, or list" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userId = await getUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = req.method === "GET" ? {} : await req.json();
    const db = getSupabaseAdmin();

    switch (action) {
      case "enqueue": return handleEnqueue(db, userId, body);
      case "execute": return handleExecute(db, userId, body);
      case "cancel": return handleCancel(db, userId, body);
      case "status": return handleStatus(db, userId, body);
      case "memory": return handleMemory(db, userId, body);
      default:
        return new Response(JSON.stringify({ error: "Unknown action. Use: enqueue, execute, cancel, status, memory" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
