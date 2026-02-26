

# Cron Scheduling + Real-Time User Activity Feed for AI Agents

## Overview

Two major additions: (1) real cron-based scheduling so bots automatically execute on their configured intervals, and (2) a user activity stream that feeds into AI agent context so the AI can "see" what the user is doing in real-time and reference it during conversations.

## Part 1: Cron Job Scheduling

### How It Works

Bots in `bot_registry` already have a `schedule` column (e.g., `"*/5 * * * *"`). Currently it's stored but never used. We'll make it real by:

1. Creating a new edge function `cron-dispatcher` that scans for active bots with schedules and executes them via `agent-runtime`
2. Setting up a `pg_cron` job that calls `cron-dispatcher` every minute
3. Adding a `last_run_at` column to `bot_registry` so we can track when each bot last ran and avoid double-firing

### Database Changes

- Add `last_run_at TIMESTAMPTZ` column to `bot_registry`
- Create pg_cron job via SQL insert (not migration, since it contains project-specific URLs/keys)

### New Edge Function: `cron-dispatcher`

**File: `supabase/functions/cron-dispatcher/index.ts`**

Called every minute by pg_cron. Logic:
1. Query all bots where `is_active = true` AND `schedule IS NOT NULL`
2. For each bot, parse the cron expression and check if it should fire now (comparing against `last_run_at`)
3. If it should fire, enqueue a task via `agent_tasks` table directly and update `last_run_at`
4. The bot's task will be picked up by `agent-runtime` when the user (or a follow-up cron call) triggers execution

A lightweight cron parser will be included inline to match minute/hour/day patterns without external dependencies.

### UI Updates in BotLabApp

- Show "Next run" time next to scheduled bots
- Show "Last run" timestamp from `last_run_at`
- Add a visual cron schedule builder (preset options: every 5 min, hourly, daily, weekly + custom cron input)

## Part 2: Real-Time User Activity Stream

### Concept

Create a `user_activity` table that logs every significant user action in the OS. This becomes context that AI agents (Hypersphere, PrimeAgent, BotLab bots) can query to understand what the user is currently doing.

### New Table: `user_activity`

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| user_id | uuid | Who |
| action | text | What happened (e.g., `app.opened`, `file.uploaded`) |
| target | text | What it targeted (e.g., `PrimeVault`, `report.pdf`) |
| metadata | jsonb | Extra context (window positions, values, etc.) |
| created_at | timestamptz | When |

RLS: Users can only see their own activity. Auto-prune entries older than 24 hours via a cleanup function.

Enable Realtime on this table so agents can subscribe to live updates.

### Activity Tracker Hook: `useActivityTracker`

**File: `src/hooks/useActivityTracker.ts`**

A hook integrated into `Desktop.tsx` that:
1. Listens to EventBus events (`app.opened`, `app.closed`, `file.uploaded`, `trade.executed`, etc.)
2. Batches events and writes them to `user_activity` every 3 seconds (debounced)
3. Tracks the currently focused window and active workspace
4. Records navigation events, clicks on major UI elements

This provides a continuous stream of "what the user is doing" without any manual logging.

### AI Context Integration

Update the `_shared/ai-router.ts` and the edge functions (`hyper-chat`, `agent-runtime`) to:
1. Before each AI call, query the last 20 entries from `user_activity` for the user
2. Inject this as a system prompt section: "User's recent activity:" with timestamps
3. The AI now knows: "The user opened PrimeVault 30 seconds ago, then checked their wallet, then opened this chat"

### Activity Feed UI Component

**File: `src/components/os/ActivityFeed.tsx`**

A live-updating activity log panel that can be:
- Embedded in PrimeAgent as a sidebar
- Shown in BotLab's Tasks tab as context
- Opened as a standalone widget from the taskbar

Displays a scrolling timeline:
```text
[12:03:45] Opened PrimeVault
[12:03:52] Viewed portfolio holdings
[12:04:01] Opened Hypersphere
[12:04:15] Asked: "What's my portfolio performance?"
[12:04:18] AI reading activity context...
```

### Desktop Integration

In `Desktop.tsx`, mount the `useActivityTracker` hook. It auto-captures:
- Window open/close/focus events
- Workspace switches
- Authentication events
- File operations
- Trading/wallet actions
- Chat messages sent
- Bot tasks enqueued

## Technical Details

### Cron Expression Parser (inline in cron-dispatcher)

Simple matcher supporting standard 5-field cron (`minute hour day month weekday`). Supports:
- Exact values: `5 * * * *` (at minute 5)
- Intervals: `*/5 * * * *` (every 5 minutes)
- Ranges: `0 9-17 * * *` (hourly 9am-5pm)
- Lists: `0,15,30,45 * * * *` (every 15 min)

### Activity Cleanup

A database function `cleanup_old_activity()` that deletes entries older than 24 hours, called by the same pg_cron schedule (once per hour).

### Privacy Controls

Add a toggle in Settings: "Share activity with AI agents" (default: on). When off, the activity tracker still runs locally for the UI feed but doesn't write to the database, so AI agents won't see it.

## Files Created/Modified

| File | Change |
|------|--------|
| New migration | Add `last_run_at` to `bot_registry`, create `user_activity` table with RLS + realtime |
| `supabase/functions/cron-dispatcher/index.ts` | **New** -- scans scheduled bots and enqueues tasks |
| `src/hooks/useActivityTracker.ts` | **New** -- captures EventBus events and writes to `user_activity` |
| `src/components/os/ActivityFeed.tsx` | **New** -- live activity timeline UI component |
| `src/components/os/Desktop.tsx` | Mount `useActivityTracker` hook |
| `src/components/os/BotLabApp.tsx` | Show schedule info, next/last run times |
| `src/components/os/PrimeAgentApp.tsx` | Show activity feed sidebar |
| `src/components/os/SettingsApp.tsx` | Add "Activity Sharing" privacy toggle |
| `supabase/functions/hyper-chat/index.ts` | Query `user_activity` for AI context |
| `supabase/functions/agent-runtime/index.ts` | Query `user_activity` for agent context |
| `supabase/config.toml` | Add `cron-dispatcher` function config |
| pg_cron setup (via insert tool) | Schedule `cron-dispatcher` every minute |

## Execution Order

1. Database migration: add `last_run_at` column, create `user_activity` table with RLS and realtime
2. Create `cron-dispatcher` edge function
3. Create `useActivityTracker` hook
4. Create `ActivityFeed` component
5. Update `Desktop.tsx` to mount activity tracker
6. Update `hyper-chat` and `agent-runtime` to include activity context
7. Update `BotLabApp` with schedule display
8. Update `PrimeAgentApp` with activity sidebar
9. Add privacy toggle to Settings
10. Set up pg_cron job via insert tool
11. Update config.toml

