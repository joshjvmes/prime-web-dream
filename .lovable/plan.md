

# Full Agent Runtime: Lane-Based Queue, Sub-Agents, Persistent Memory, Streaming

## Overview

Transform the current stateless bot system into a persistent agent runtime with real orchestration. Agents get their own task queues with priority lanes, can spawn child agents, maintain isolated persistent memory, and stream execution logs back to the UI in real-time.

## Architecture

```text
                    ┌─────────────────────────────────────┐
                    │         agent-runtime (edge fn)      │
                    │                                      │
  BotLab UI ──────> │  ┌──────────┐  ┌──────────────────┐ │
  PrimeAgent ─────> │  │ Executor │  │  Lane Scheduler   │ │
  Cron (pg_cron) ─> │  │          │──│  critical > high  │ │
  EventBus ───────> │  │  AI Loop │  │  > normal > low   │ │
                    │  │          │  │  > background     │ │
                    │  └────┬─────┘  └──────────────────┘ │
                    │       │                              │
                    │  ┌────▼─────┐  ┌──────────────────┐ │
                    │  │ Sub-agent│  │ Tool Executor     │ │
                    │  │ Spawner  │──│ (reuses bot-api)  │ │
                    │  └──────────┘  └──────────────────┘ │
                    └──────────┬──────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
        agent_tasks      agent_memory     Realtime SSE
        (queue table)    (per-bot KV)     (streaming logs)
```

## Database Changes (3 new tables)

### `agent_tasks` -- The Task Queue

Stores all tasks with lane-based priority. Agents pull from this queue.

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | Task ID |
| bot_id | uuid | Owning agent |
| user_id | uuid | Owning user |
| parent_task_id | uuid? | Parent task (for sub-agent work) |
| spawned_by_bot_id | uuid? | Parent agent that spawned this |
| lane | text | `critical`, `high`, `normal`, `low`, `background` |
| status | text | `queued`, `running`, `completed`, `failed`, `cancelled` |
| instruction | text | What the agent should do |
| input_payload | jsonb | Input data/context |
| result | jsonb? | Output when complete |
| error | text? | Error message if failed |
| steps | jsonb[] | Array of execution steps (for streaming log) |
| max_steps | int | Safety limit (default 10) |
| created_at | timestamptz | |
| started_at | timestamptz? | When execution began |
| completed_at | timestamptz? | When finished |

RLS: Users can only see/manage their own tasks.

### `agent_memory` -- Per-Bot Persistent Memory

Isolated key-value store per bot (not shared like `ai_memories`).

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| bot_id | uuid | Which bot owns this memory |
| user_id | uuid | Owning user |
| namespace | text | Category: `facts`, `context`, `conversation`, `state` |
| key | text | Memory key |
| value | jsonb | Memory value |
| created_at / updated_at | timestamptz | |

RLS: Users can only access memory for their own bots. UNIQUE on (bot_id, namespace, key).

### `agent_runs` -- Execution History with Streaming

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | Run ID |
| task_id | uuid | Which task this run executes |
| bot_id | uuid | |
| user_id | uuid | |
| status | text | `running`, `completed`, `failed` |
| steps | jsonb | Array of `{ step, action, result, timestamp }` |
| token_usage | jsonb? | `{ prompt, completion, total }` |
| started_at | timestamptz | |
| completed_at | timestamptz? | |

RLS: Users can only view their own runs. Enable realtime on this table so the UI can stream step updates.

## New Edge Function: `agent-runtime`

**File: `supabase/functions/agent-runtime/index.ts`**

This is the core execution engine. Actions:

### `enqueue` -- Add a task to the queue
Accepts `{ bot_id, instruction, lane?, input_payload?, parent_task_id?, max_steps? }`. Inserts into `agent_tasks` with status `queued`.

### `execute` -- Run the next task (or a specific task)
The main agentic loop:

1. Pick the highest-priority `queued` task for the bot (ordered by lane priority, then created_at)
2. Create an `agent_runs` record with status `running`
3. Enter the AI loop (up to `max_steps` iterations):
   a. Build context: system prompt + bot memory + task instruction + previous steps
   b. Call AI (via `routeAICall`) with available tools + two special tools: `spawn_subtask` and `save_to_memory`
   c. If AI returns tool calls, execute them and append step to `agent_runs.steps`
   d. Update `agent_runs` in DB after each step (triggers realtime for streaming)
   e. If AI returns a final text response (no tool calls), mark task `completed`
4. If a step calls `spawn_subtask`, insert a child `agent_tasks` row with `parent_task_id` set

### `cancel` -- Cancel a running/queued task
Sets status to `cancelled`. If the task has child tasks, cascade-cancel them.

### `status` -- Get queue status
Returns tasks grouped by lane with counts.

### `memory` -- Manage bot memory
Sub-actions: `get`, `set`, `list`, `delete` for the bot's `agent_memory` entries.

### Special Tools Available to Agents

In addition to the existing bot tools (from `bot-api`), agents get:

- **`spawn_subtask`**: `{ instruction, lane?, input_payload? }` -- creates a child task executed by a new sub-agent instance. Returns the child task ID. The parent can later check results.
- **`save_to_memory`**: `{ namespace, key, value }` -- persists data to the bot's isolated memory store.
- **`recall_from_memory`**: `{ namespace, key? }` -- retrieves from memory. If no key, lists all in namespace.
- **`check_subtask`**: `{ task_id }` -- checks if a spawned subtask has completed and gets its result.
- **`wait_for_subtask`**: `{ task_id }` -- blocks (within the loop) until subtask completes, then returns result.
- **`emit_status`**: `{ message }` -- emits a status update to the streaming log without taking an action.

### Lane Priority Order

```text
critical  (0) -- safety/security actions, execute immediately
high      (1) -- user-initiated tasks
normal    (2) -- default lane
low       (3) -- background automation
background(4) -- maintenance, cleanup
```

The executor picks tasks in lane-priority order, then FIFO within each lane.

## Frontend Changes

### Updated BotLabApp (`src/components/os/BotLabApp.tsx`)

Add a new "Tasks" tab showing:
- Active task queue grouped by lane (color-coded: red/orange/blue/gray/dim)
- Each task shows status, instruction preview, step count
- Click a task to see the live execution log (steps stream in via realtime)
- "Enqueue Task" button to manually add tasks
- "Cancel" button on running/queued tasks
- Sub-task tree view (indented children under parent tasks)

Add a "Memory" tab showing:
- Bot's persistent memory organized by namespace
- Key-value browser with add/edit/delete
- Memory usage stats

### Updated PrimeAgentApp (`src/components/os/PrimeAgentApp.tsx`)

When the user gives an instruction:
1. Instead of the hardcoded `parseInstruction`, call `agent-runtime?action=enqueue` to queue a real task
2. Subscribe to realtime updates on `agent_runs` to stream execution steps into the UI
3. Show a live step-by-step execution log with timestamps
4. Support "Run with sub-agents" toggle for complex multi-step tasks

### Streaming Execution Log Component

New component embedded in both BotLab and PrimeAgent:

```text
┌─ Task: "Analyze portfolio and rebalance" ──────────────┐
│ Lane: high | Status: running | Steps: 3/10            │
│                                                         │
│ [00:00] Thinking... Loading portfolio data              │
│ [00:02] Tool: check_portfolio -> 5 holdings loaded      │
│ [00:03] Tool: get_market_data -> AAPL, MSFT, GOOGL...   │
│ [00:05] Thinking... Analyzing allocation...             │
│ [00:07] Spawned subtask: "Calculate optimal weights"    │
│ [00:08] Waiting for subtask result...                   │
│ [00:12] Subtask complete: {AAPL: 30%, MSFT: 25%...}    │
│ [00:13] Tool: save_to_memory -> Saved rebalance plan    │
│ [00:14] Complete: Portfolio analysis done.               │
└─────────────────────────────────────────────────────────┘
```

## Execution Flow Example

```text
User: "Analyze my portfolio and create a report"

1. PrimeAgent enqueues task (lane: high)
2. agent-runtime picks up task
3. Step 1: AI decides to check_portfolio -> gets holdings
4. Step 2: AI decides to get_market_data -> gets prices
5. Step 3: AI spawns subtask "Generate spreadsheet report"
   └─ Child task executes:
      └─ Step 1: create_spreadsheet with data
      └─ Step 2: add_chart for performance
      └─ Complete: returns spreadsheet ID
6. Step 4: Parent checks subtask result
7. Step 5: AI saves analysis to memory
8. Step 6: AI responds with summary
9. Task marked completed
```

## Files Created/Modified

| File | Change |
|------|--------|
| New migration | Create `agent_tasks`, `agent_memory`, `agent_runs` tables with RLS; enable realtime on `agent_runs` |
| `supabase/functions/agent-runtime/index.ts` | **New** -- core execution engine with lane scheduler, AI loop, sub-agent spawning, memory ops |
| `src/components/os/BotLabApp.tsx` | Add "Tasks" and "Memory" tabs with queue view, streaming log, memory browser |
| `src/components/os/PrimeAgentApp.tsx` | Replace hardcoded parseInstruction with real task enqueueing + realtime streaming |
| `supabase/config.toml` | Add `agent-runtime` function config |
| `src/integrations/supabase/types.ts` | Auto-updated with new table types |

## Execution Order

1. Create database tables (`agent_tasks`, `agent_memory`, `agent_runs`) with RLS and realtime
2. Build `agent-runtime` edge function with full executor loop
3. Update `BotLabApp` with Tasks and Memory tabs
4. Update `PrimeAgentApp` to use real task queue + streaming
5. Update config.toml

