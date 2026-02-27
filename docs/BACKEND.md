# Backend & Database Reference

PRIME OS uses Lovable Cloud (Supabase) for all backend functionality: database, auth, storage, and edge functions.

---

## Database Tables

### User & Auth

| Table | Columns | RLS | Used By |
|---|---|---|---|
| `profiles` | `user_id`, `display_name`, `bio`, `title`, `avatar_url` | Public SELECT; owner INSERT/UPDATE | SettingsApp, PrimeSocialApp, AdminConsole |
| `user_roles` | `user_id`, `role` (admin/moderator/user) | Public SELECT; admin INSERT/DELETE | AdminConsoleApp |
| `user_data` | `user_id`, `key`, `value` (jsonb) | Owner CRUD | `useCloudStorage` (Canvas, Editor, Grid, Journal) |
| `user_activity` | `user_id`, `action`, `target`, `metadata` | Owner SELECT/INSERT/DELETE | `useActivityTracker`, SecurityConsole, DataCenter |
| `user_ai_keys` | `user_id`, `provider`, `encrypted_key`, `model` | Owner CRUD | Settings (BYOAK), AI routing |
| `waitlist` | `email`, `name` | Public INSERT only | LandingPage |

### Communication

| Table | Columns | RLS | Used By |
|---|---|---|---|
| `ai_conversations` | `user_id`, `role`, `content` | Owner SELECT/INSERT/DELETE | HypersphereApp |
| `ai_memories` | `user_id`, `content`, `category` | Owner CRUD | HypersphereApp (long-term memory) |
| `chat_messages` | `user_id`, `channel`, `username`, `content` | Auth SELECT; owner INSERT; admin DELETE | PrimeChatApp |
| `chat_presence` | `user_id`, `channel`, `username`, `last_seen` | Auth SELECT; owner CRUD | PrimeChatApp |
| `social_posts` | `user_id`, `author`, `content`, `likes`, `ai_generated` | Auth SELECT; owner CRUD | PrimeSocialApp |
| `social_comments` | `user_id`, `post_id`, `author`, `content` | Auth SELECT; owner INSERT/DELETE | PrimeSocialApp |
| `social_likes` | `user_id`, `post_id` | Auth SELECT; owner INSERT/DELETE | PrimeSocialApp |
| `user_emails` | `user_id`, `from_address`, `to_address`, `subject`, `body`, `folder`, `read` | Owner CRUD | PrimeMailApp |

### Finance

| Table | Columns | RLS | Used By |
|---|---|---|---|
| `wallets` | `user_id`, `os_balance`, `ix_balance`, `is_system` | Owner/admin SELECT only | PrimeWalletApp |
| `transactions` | `from_wallet_id`, `to_wallet_id`, `amount`, `token_type`, `tx_type` | Owner/admin SELECT only | PrimeWalletApp |
| `escrow_deals` | `creator_id`, `counterparty_id`, `amount`, `status` | Participant/admin SELECT only | PrimeWalletApp |
| `vault_holdings` | `user_id`, `symbol`, `name`, `quantity`, `avg_cost`, `category` | Owner CRUD | PrimeVaultApp |
| `vault_transactions` | `user_id`, `symbol`, `quantity`, `price`, `tx_type` | Owner SELECT/INSERT | PrimeVaultApp |
| `bet_markets` | `creator_id`, `question`, `yes_pool`, `no_pool`, `status`, `odds_data` | Public SELECT; owner INSERT | PrimeBetsApp |
| `bets` | `user_id`, `market_id`, `side`, `amount` | Owner SELECT/INSERT | PrimeBetsApp |

### Productivity

| Table | Columns | RLS | Used By |
|---|---|---|---|
| `calendar_events` | `user_id`, `title`, `start_time`, `end_time`, `color`, `recurring`, `reminder_minutes` | Owner CRUD | PrimeCalendarApp |
| `board_tasks` | `user_id`, `name`, `column_name`, `priority`, `progress`, `eta`, `node` | Owner CRUD | PrimeBoardApp |
| `bookings` | `user_id`, `resource`, `start_time`, `end_time`, `purpose`, `priority` | Auth SELECT; owner INSERT/UPDATE/DELETE | PrimeBookingApp |
| `file_metadata` | `user_id`, `file_name`, `file_path`, `file_size`, `folder`, `mime_type` | Owner CRUD | FilesApp |

### Automation & Bots

| Table | Columns | RLS | Used By |
|---|---|---|---|
| `bot_registry` | `user_id`, `name`, `bot_type`, `system_prompt`, `permissions`, `schedule`, `trigger_config` | Owner CRUD | BotLabApp |
| `bot_audit_log` | `bot_id`, `user_id`, `tool_name`, `args`, `status`, `result_summary` | Owner SELECT only | BotLabApp |
| `bot_api_keys` | `bot_id`, `user_id`, `key_hash`, `key_prefix`, `is_revoked` | Owner CRUD | BotLabApp |
| `agent_tasks` | `bot_id`, `user_id`, `instruction`, `status`, `steps`, `result`, `lane` | Owner CRUD | PrimeAgentApp, BotLabApp |
| `agent_runs` | `bot_id`, `task_id`, `user_id`, `status`, `steps`, `token_usage` | Owner SELECT/INSERT/UPDATE | PrimeAgentApp |
| `agent_memory` | `bot_id`, `user_id`, `namespace`, `key`, `value` | Owner CRUD | BotLabApp |
| `cloud_hooks` | `user_id`, `name`, `trigger_event`, `action_type`, `action_config`, `enabled` | Owner CRUD | CloudHooksApp |

### Marketplace

| Table | Columns | RLS | Used By |
|---|---|---|---|
| `forge_listings` | `creator_id`, `name`, `code`, `category`, `price`, `share_price`, `ipo_active` | Public SELECT; owner INSERT | AppForgeApp |
| `app_shares` | `user_id`, `listing_id`, `shares`, `avg_cost` | Owner/admin SELECT | AppForgeApp |
| `share_orders` | `user_id`, `listing_id`, `order_type`, `shares`, `price`, `status` | Public open orders SELECT; owner INSERT/UPDATE | AppForgeApp |

### Database Functions

| Function | Purpose |
|---|---|
| `check_booking_conflict(p_resource, p_start, p_end, p_exclude_id?)` | Returns `boolean` — checks if a booking overlaps |
| `has_role(_user_id, _role)` | Returns `boolean` — checks if user has a specific role |
| `get_waitlist_count()` | Returns waitlist entry count |
| `cleanup_old_activity()` | Purges old activity records |

---

## Edge Functions

All edge functions are configured with `verify_jwt = false` in `supabase/config.toml` (they handle auth internally via the Authorization header).

### `hyper-chat`
- **Purpose:** AI chat with streaming responses and memory persistence
- **Auth:** Optional (uses token for memory features)
- **Request:** `POST { messages: [{role, content}] }`
- **Response:** SSE stream of `data: {choices: [{delta: {content}}]}`
- **Dependencies:** `LOVABLE_API_KEY`, `ai-router.ts`

### `ai-social`
- **Purpose:** Generate AI social media posts
- **Auth:** Required
- **Request:** `POST { prompt: string }`
- **Response:** `{ post: string }`
- **Dependencies:** `LOVABLE_API_KEY`, `ai-router.ts`

### `prime-bank`
- **Purpose:** Token economy operations (mint, transfer, debit)
- **Auth:** Required
- **Request:** `POST { action: 'mint'|'transfer'|'debit', amount, token_type, to_user_id? }`
- **Response:** `{ success, balance? }`
- **Tables:** `wallets`, `transactions`

### `market-data`
- **Purpose:** Live stock/crypto price lookup
- **Auth:** Required
- **Request:** `POST { symbols: string[] }`
- **Response:** `{ prices: {symbol, price, change}[] }`
- **Dependencies:** `POLYGON_API_KEY`

### `sports-odds`
- **Purpose:** Sports betting odds from The Odds API
- **Auth:** Required
- **Request:** `POST { sport?, region? }`
- **Response:** `{ events: [...] }`
- **Dependencies:** `ODDS_API_KEY`

### `bot-api`
- **Purpose:** Bot CRUD and lifecycle management
- **Auth:** Required
- **Tables:** `bot_registry`, `bot_api_keys`

### `bot-runner`
- **Purpose:** Execute a bot with an event trigger or scheduled run
- **Auth:** Service role (internal)
- **Tables:** `bot_registry`, `bot_audit_log`
- **Dependencies:** `ai-router.ts`

### `agent-runtime`
- **Purpose:** Autonomous agent task execution with multi-step reasoning
- **Auth:** Required
- **Tables:** `agent_tasks`, `agent_runs`, `agent_memory`

### `admin-actions`
- **Purpose:** Admin role management and system operations
- **Auth:** Required (admin role)
- **Tables:** `user_roles`, `profiles`

### `mini-app-gen`
- **Purpose:** AI-powered mini-app code generation
- **Auth:** Required
- **Request:** `POST { prompt: string }`
- **Response:** `{ code: string, name: string }`
- **Dependencies:** `LOVABLE_API_KEY`

### `ai-key-manager`
- **Purpose:** User API key CRUD for BYOAK (Bring Your Own API Key)
- **Auth:** Required
- **Tables:** `user_ai_keys`

### `elevenlabs-tts`
- **Purpose:** Text-to-speech via ElevenLabs
- **Auth:** Required
- **Request:** `POST { text: string, voice_id? }`
- **Response:** Audio stream
- **Dependencies:** `ELEVENLABS_API_KEY` (managed via connector)

### `system-analytics`
- **Purpose:** Real-time table counts and activity aggregation
- **Auth:** Required
- **Actions:** `edge-function-stats` (table counts + activity timeline), `auth-events` (security scan + RLS status)
- **Performance:** All queries run in parallel via `Promise.all`

### `web-proxy`
- **Purpose:** CORS proxy for PrimeBrowser to fetch external pages
- **Auth:** Required
- **Request:** `POST { url: string }`
- **Response:** `{ html: string }`

### `cron-dispatcher`
- **Purpose:** Scheduled task execution for bots with cron schedules
- **Auth:** Service role (internal)
- **Tables:** `bot_registry`

---

## Secrets

| Secret | Purpose | Used By |
|---|---|---|
| `LOVABLE_API_KEY` | Lovable AI model access (cannot be deleted) | `hyper-chat`, `ai-social`, `mini-app-gen`, `bot-runner`, `agent-runtime` |
| `POLYGON_API_KEY` | Polygon.io stock/crypto data | `market-data` |
| `ODDS_API_KEY` | The Odds API sports betting odds | `sports-odds` |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS (managed via connector) | `elevenlabs-tts` |

### Auto-Provided (Supabase)

These are automatically available in all edge functions:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Storage Buckets

| Bucket | Access | Used By |
|---|---|---|
| `user-files` | Authenticated read/write (scoped by user folder) | FilesApp |

---

## AI Routing (`_shared/ai-router.ts`)

The shared AI router enables BYOAK (Bring Your Own API Key):

1. Check if the user has a key in `user_ai_keys` table
2. If yes → use their key with their preferred provider/model
3. If no → fall back to `LOVABLE_API_KEY` with Lovable AI models
4. Supports: OpenAI, Google, Anthropic, and Lovable AI endpoints
