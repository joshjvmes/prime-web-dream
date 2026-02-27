# Application Catalog

PRIME OS ships with 50+ applications organized by category. Each entry lists the `AppType` key, backend dependencies, and persistence status.

**Status legend:**
- 🟢 **Fully Live** — Database-backed with real CRUD operations
- 🔵 **Cloud-Persisted** — State saved via `useCloudStorage` (localStorage + `user_data` table)
- 🟡 **Simulated** — Client-only with generated/mock data (lore-consistent)

---

## 🟢 Fully Live Apps (Database-Backed)

### HypersphereApp (`hypersphere`)
- **Category:** AI / Core
- **Tables:** `ai_conversations`, `ai_memories`
- **Edge Functions:** `hyper-chat` (streaming AI chat with memory)
- **Description:** 11D geometric AI assistant with persistent conversation history and long-term memory extraction.

### PrimeChatApp (`chat`)
- **Category:** Communication
- **Tables:** `chat_messages`, `chat_presence`
- **Realtime:** Yes (`chat_messages` via Supabase Realtime)
- **Description:** Multi-channel chat with presence indicators and real-time message streaming.

### PrimeCalendarApp (`calendar`)
- **Category:** Productivity
- **Tables:** `calendar_events`
- **Description:** Full calendar with day/week/month views, recurring events, color coding, and reminder notifications.

### PrimeVaultApp (`vault`)
- **Category:** Finance
- **Tables:** `vault_holdings`, `vault_transactions`
- **Edge Functions:** `market-data` (live price lookup via Polygon API)
- **Description:** Portfolio tracker with real-time stock/crypto prices, buy/sell transactions, and P&L tracking.

### PrimeWalletApp (`wallet`)
- **Category:** Finance
- **Tables:** `wallets`, `transactions`, `escrow_deals`
- **Edge Functions:** `prime-bank` (mint, transfer, debit tokens)
- **Description:** Dual-token economy (OS tokens + IX tokens) with transfer, escrow, and transaction history.

### PrimeBetsApp (`bets`)
- **Category:** Finance
- **Tables:** `bet_markets`, `bets`
- **Edge Functions:** `sports-odds` (The Odds API), `prime-bank` (token debit for bets)
- **Description:** Prediction market with user-created markets and sports betting odds. Uses OS tokens for wagers.

### PrimeSignalsApp (`signals`)
- **Category:** Finance
- **Tables:** `vault_holdings` (for portfolio context)
- **Edge Functions:** `market-data`
- **Description:** Trading signal analysis dashboard with live market data lookups.

### FilesApp (`files`)
- **Category:** Productivity
- **Tables:** `file_metadata`
- **Storage:** `user-files` bucket (Supabase Storage)
- **Description:** File manager with upload, download, delete, and folder organization. Real file storage.

### PrimeBookingApp (`booking`)
- **Category:** Productivity
- **Tables:** `bookings`
- **DB Functions:** `check_booking_conflict()`
- **Description:** Resource booking system with conflict detection, priority levels, and time-slot management.

### BotLabApp (`botlab`)
- **Category:** Automation
- **Tables:** `bot_registry`, `bot_audit_log`, `bot_api_keys`, `agent_tasks`, `agent_runs`, `agent_memory`
- **Edge Functions:** `bot-api`, `bot-runner`, `agent-runtime`
- **Description:** Bot creation and management platform with autonomous agent execution, task scheduling, and audit logging.

### AdminConsoleApp (`admin`)
- **Category:** Infrastructure
- **Tables:** `user_roles`, `profiles`, `wallets`
- **Edge Functions:** `admin-actions` (role management)
- **DB Functions:** `has_role()`
- **Description:** Admin panel for role assignment (admin/moderator/user), user management, and system-wide operations. Requires `admin` role.

### AppForgeApp / MiniAppsApp (`forge` / `miniapps`)
- **Category:** Development
- **Tables:** `forge_listings`, `app_shares`, `share_orders`
- **Edge Functions:** `mini-app-gen` (AI code generation)
- **Description:** App marketplace where users publish mini-apps, run IPOs, and trade app shares. AI-powered app generation.

### SettingsApp (`settings`)
- **Category:** System
- **Tables:** `profiles`
- **Description:** User profile management (display name, bio, avatar), notification preferences, pulse settings, activity sharing toggle, and idle timeout configuration.

### PrimeSocialApp (`social`)
- **Category:** Communication
- **Tables:** `social_posts`, `social_comments`, `social_likes`, `profiles`
- **Edge Functions:** `ai-social` (AI post generation)
- **Realtime:** Yes (`social_posts`)
- **Description:** Social feed with user and AI-generated posts, comments, likes, and real-time updates.

### PrimeMailApp (`mail`)
- **Category:** Communication
- **Tables:** `user_emails`
- **Description:** Email client with inbox/sent/trash folders, compose, read/unread tracking, and AI-generated welcome emails.

### PrimeBoardApp (`board`)
- **Category:** Productivity
- **Tables:** `board_tasks`
- **Realtime:** Yes (`board_tasks`)
- **Description:** Kanban board with drag-and-drop columns (Queued/Running/Done), priority levels, and real-time sync.

---

## 🔵 Cloud-Persisted Apps (via `useCloudStorage`)

These apps save state to both `localStorage` and the `user_data` table for cross-device sync.

### PrimeCanvasApp (`canvas`)
- **Category:** Creative
- **Cloud Keys:** `canvas-drawings`, `canvas-layers`
- **Description:** Drawing canvas with brush tools, layers, colors, and persistent drawings.

### TextEditorApp (`editor`)
- **Category:** Productivity
- **Cloud Keys:** `editor-documents`
- **Description:** Text/code editor with syntax highlighting and auto-save.

### PrimeGridApp (`spreadsheet`)
- **Category:** Productivity
- **Cloud Keys:** `spreadsheet-data`
- **Description:** Spreadsheet with cell editing, formulas, and chart generation.

### PrimeJournalApp (`journal`)
- **Category:** Productivity
- **Cloud Keys:** `journal-entries`
- **Description:** Personal journal with date-based entries and markdown support.

---

## 🟡 Simulated / Lore Apps (Client-Only)

These apps use procedurally generated or static data consistent with the PRIME OS lore. No backend required.

| App | AppType | Category | Description |
|---|---|---|---|
| TerminalApp | `terminal` | System | Command shell with 30+ commands, pipes, modes |
| ProcessesApp | `processes` | System | Qutrit process table viewer |
| SysInfoApp | `sysinfo` | System | System information display |
| SystemMonitorApp | `monitor` | System | Real-time CPU/memory charts (simulated) |
| PrimeNetApp | `primenet` | Infrastructure | Network topology visualization |
| EnergyMonitorApp | `energy` | Infrastructure | Over-unity energy flow display |
| DataCenterApp | `datacenter` | Infrastructure | Database metrics (uses `system-analytics` edge fn) |
| SecurityConsoleApp | `security` | Infrastructure | RLS scanner and activity feed (uses `system-analytics`) |
| Q3InferenceApp | `q3inference` | Lore | Ternary logic inference engine |
| FoldMemApp | `foldmem` | Lore | 11D memory folding explorer |
| GeomCApp | `geomc` | Lore | Geometric computation compiler |
| HypersphereApp (viz) | `hypersphere` | Lore | 3D sphere visualization (Three.js) |
| SchemaForgeApp | `schemaforge` | Development | Database schema designer |
| CloudHooksApp | `cloudhooks` | Infrastructure | Automation hooks (uses `cloud_hooks` table — 🟢) |
| PrimeBrowserApp | `browser` | Productivity | Web browser with intranet pages |
| PrimeDocsApp | `docs` | Productivity | Document viewer (static content) |
| PrimeCommApp | `comm` | Communication | Phone/messaging interface |
| PrimeMapsApp | `maps` | Utility | Map viewer |
| PrimePkgApp | `pkg` | Development | Package manager |
| PrimeAudioApp | `audio` | Media | Music player |
| PrimeStreamApp | `stream` | Infrastructure | Live data pipeline monitor |
| PrimeGalleryApp | `gallery` | Media | Image gallery |
| PrimeLinkApp | `videocall` | Communication | Video call interface |
| PrimeAgentApp | `agent` | Automation | AI agent task viewer (uses agent tables — 🟢) |
| PrimeRoboticsApp | `robotics` | Lore | Robotics control panel |
| PrimeIoTApp | `iot` | Lore | IoT device dashboard |
| PrimeArcadeApp | `arcade` | Entertainment | Mini-games collection |
| PrimeStorageApp | `storage` | Infrastructure | Storage capacity viewer |
| RokCatApp | `rokcat` | Easter Egg | Animated cat mascot |

> **Note:** DataCenterApp and SecurityConsoleApp are listed as simulated because their _core UI_ is lore-themed, but they pull real database metrics via the `system-analytics` edge function.
