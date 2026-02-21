
# ClawBot Framework: External Agent API + In-OS Bot Builder

## Overview

Build a complete bot/agent framework for PRIME OS that enables:
1. **External AI agents** (GPT agents, AutoGPT, OpenClaws, etc.) to connect via a REST API and MCP server
2. **Regular users** to create their own automated bots using natural language descriptions
3. **Configurable per-bot permissions** with audit logging and rate limiting

---

## Architecture

The system has three layers:

```text
+---------------------------+
|  External Agents (API)    |  <-- REST API + MCP Server
+---------------------------+
|  Bot Runtime Engine       |  <-- Shared tool execution layer
+---------------------------+
|  User Bot Builder (UI)    |  <-- Natural language bot creation
+---------------------------+
```

All bots (external and internal) use the same tool execution layer that already powers Hyper AI, ensuring consistent behavior and security.

---

## 1. Database: Bot Registry + API Keys

### New Tables

**bot_registry** -- stores bot definitions (both external API bots and user-created bots)
- id (uuid, PK)
- user_id (uuid, owner)
- name (text)
- description (text)
- bot_type ('external' | 'autonomous' | 'scheduled')
- permissions (jsonb) -- granular tool access list
- system_prompt (text) -- custom personality/instructions for autonomous bots
- trigger_config (jsonb) -- for event-triggered bots: which events, conditions
- schedule (text) -- cron expression for scheduled bots (null if event-driven)
- is_active (boolean, default true)
- rate_limit (integer, default 60) -- max calls per hour
- created_at, updated_at

**bot_api_keys** -- API keys for external agent access
- id (uuid, PK)
- bot_id (uuid, FK to bot_registry)
- user_id (uuid, owner)
- key_hash (text) -- hashed API key (never store plaintext)
- key_prefix (text) -- first 8 chars for identification (e.g., "clw_xxxx")
- last_used_at (timestamp)
- expires_at (timestamp, nullable)
- is_revoked (boolean, default false)
- created_at

**bot_audit_log** -- every action a bot takes
- id (uuid, PK)
- bot_id (uuid, FK)
- user_id (uuid, owner)
- tool_name (text) -- which tool was called
- args (jsonb) -- sanitized arguments
- result_summary (text)
- status ('success' | 'error' | 'denied')
- created_at

RLS policies:
- Users can only CRUD their own bots, keys, and audit logs
- Audit logs are insert-only for the edge function (via service role)

### Migration

Single migration creating all three tables with RLS enabled, realtime on bot_audit_log for live monitoring.

---

## 2. Edge Function: `bot-api`

A new edge function that serves as the unified API endpoint for all bot interactions.

### Authentication Flow

Two auth modes:
1. **API Key** -- External agents pass `X-Bot-Key: clw_xxxxxxxxxx` header. The function hashes the key, looks up the bot, verifies it's active and not expired, checks rate limits.
2. **User JWT** -- Regular users (or their in-OS bots) use their normal auth token + a `X-Bot-Id` header to execute as a specific bot.

### Endpoints (via query params)

| Action | Method | Description |
|--------|--------|-------------|
| `tools` | GET | List available tools for this bot (filtered by permissions) |
| `execute` | POST | Execute a single tool by name with args |
| `chat` | POST | Send a message to the bot's AI (uses the bot's custom system prompt) |
| `status` | GET | Bot status, rate limit remaining, last activity |

### Tool Execution

Reuses the exact same tool execution functions from `hyper-chat` (extracted into shared logic):
- Financial tools (check_balance, transfer_tokens, buy/sell shares, place bets)
- Extended tools (market data, portfolio, booking, messaging, audio)
- Client-side tools return a payload that the frontend handles via EventBus
- Memory tools scoped to the bot owner's user_id

### Security

- Every call checks the bot's `permissions` JSON against the requested tool
- Rate limiting: tracks calls per hour in memory, returns 429 when exceeded
- Audit logging: every tool execution is logged to `bot_audit_log`
- API keys are hashed with SHA-256 before storage
- Bots cannot escalate privileges -- they can only access tools their owner has access to

### MCP Server Mode

The same edge function also serves as an MCP (Model Context Protocol) server when called with `?mode=mcp`. This allows tools like Claude Desktop, Cursor, or any MCP-compatible client to connect directly.

Uses `mcp-lite` library to expose all permitted tools as MCP tool definitions.

---

## 3. Edge Function: `bot-runner`

A lightweight function that executes autonomous/scheduled bots:

- Called by the frontend when an EventBus event matches a bot's trigger config
- Or called on a timer for scheduled bots
- Sends the trigger context to the bot's AI (using the bot's custom system prompt)
- AI decides which tools to call, function executes them
- Results logged to audit log and optionally pushed as notifications

---

## 4. Frontend: BotLabApp (New App)

A new OS application called **BotLab** where users create and manage bots.

### Tabs

**My Bots** -- List of user's bots with status toggles, edit, delete
**Create Bot** -- Natural language bot creation wizard
**API Keys** -- Manage API keys for external access
**Activity** -- Live audit log feed (realtime from bot_audit_log)

### Create Bot Flow (Natural Language)

1. User describes what the bot should do: "Monitor AAPL stock price and message me when it drops below $150"
2. System sends description to Hyper AI which returns:
   - Bot name and description
   - Required permissions (market data, messaging)
   - Trigger config (schedule: every 5 min, or event: market.checked)
   - System prompt for the bot's AI personality
3. User reviews and approves the generated config
4. Bot is saved to bot_registry and activated

### Permission Editor

Visual toggle grid showing all available tools:
- Market Data (get_market_data, get_stock_chart)
- Portfolio (check_portfolio, trade_stock)
- Booking (create_booking, list_bookings, cancel_booking)
- Messaging (send_message, list_conversations)
- Financial (check_balance, transfer_tokens, buy_shares, sell_shares)
- Audio (control_audio)
- Canvas (draw_on_canvas, generate_canvas_art)
- Spreadsheet (create_spreadsheet, update_cells, add_chart)
- Social (post_to_social, send_email)
- Memory (save_memory, recall_memories)

### API Key Management

- Generate new API key (shown once, then only prefix visible)
- Copy endpoint URL for external agents
- Revoke keys
- View last used timestamp

### Activity Monitor

Real-time table showing:
- Timestamp, bot name, tool called, status, result summary
- Filter by bot, tool, status
- Export audit log

---

## 5. OS Integration

### New App Registration

Add `botlab` to the AppType union and register BotLabApp in Desktop.tsx with icon and title.

### EventBus Bot Triggers

Modify the EventBus to check bot_registry for bots with matching trigger_config on every event emission. When a match is found, call the `bot-runner` edge function.

### PrimeAgent Integration

Add "My Bots" and "Create Bot" quick commands to PrimeAgent.

### Hyper AI Integration

Add a `manage_bot` tool to hyper-chat so users can say "Create a bot that monitors my portfolio every hour" directly in Hyper.

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/bot-api/index.ts` | Unified bot API endpoint (REST + MCP) |
| `supabase/functions/bot-runner/index.ts` | Autonomous bot execution engine |
| `src/components/os/BotLabApp.tsx` | Bot management UI |

### Files to Modify

| File | Change |
|------|--------|
| `src/types/os.ts` | Add 'botlab' to AppType |
| `src/components/os/Desktop.tsx` | Register BotLabApp |
| `src/components/os/DesktopIcons.tsx` | Add BotLab icon |
| `src/hooks/useEventBus.ts` | Add bot trigger checking on emit |
| `src/components/os/PrimeAgentApp.tsx` | Add bot-related quick commands |
| `supabase/functions/hyper-chat/index.ts` | Add manage_bot tool |
| `supabase/config.toml` | Register bot-api and bot-runner functions |

### Database Migration

```text
- bot_registry table with RLS (users CRUD own bots)
- bot_api_keys table with RLS (users CRUD own keys)  
- bot_audit_log table with RLS (users read own logs)
- Enable realtime on bot_audit_log
```

### API Key Format

Keys follow the format: `clw_` + 32 random hex characters (e.g., `clw_a1b2c3d4e5f6...`)

Stored as SHA-256 hash. Only the prefix `clw_a1b2c3d4` is stored in plaintext for identification.

### Rate Limiting Strategy

In-memory Map in the edge function keyed by bot_id, tracking call count per rolling hour window. Falls back to database count if memory is cold.

### External Agent Connection Example

```text
POST /functions/v1/bot-api?action=execute
Headers:
  X-Bot-Key: clw_a1b2c3d4e5f6...
  Content-Type: application/json
Body:
  { "tool": "get_market_data", "args": { "symbols": "AAPL,MSFT" } }

Response:
  { "status": "success", "result": { "tickers": [...] } }
```

### MCP Connection Example

```text
MCP endpoint: https://<project>.supabase.co/functions/v1/bot-api?mode=mcp
Headers:
  X-Bot-Key: clw_a1b2c3d4e5f6...
```

### Execution Order

1. Database migration (bot_registry, bot_api_keys, bot_audit_log)
2. Create bot-api edge function
3. Create bot-runner edge function
4. Create BotLabApp frontend
5. Register in OS (types, Desktop, icons)
6. Wire EventBus bot triggers
7. Add Hyper AI manage_bot tool
8. Update PrimeAgent quick commands
