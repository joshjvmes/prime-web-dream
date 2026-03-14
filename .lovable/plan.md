

# Internal Documentation for PRIME OS

Create a set of `.md` documentation files in a `docs/` directory covering the full system architecture, app catalog, backend integrations, hooks, edge functions, and developer guide.

## Files to Create

### 1. `docs/README.md` — Documentation Index
- Table of contents linking to all other docs
- Quick-start for developers (clone, install, run)
- Project overview: browser-based OS with 50+ apps, Lovable Cloud backend

### 2. `docs/ARCHITECTURE.md` — System Architecture
- Route structure: `/` (LandingPage) -> `/os` (Desktop)
- Core flow: `App.tsx` -> `LandingPage` / `Index` -> `Desktop.tsx`
- Desktop composition: LockScreen -> BootSequence -> Desktop (Taskbar + OSWindow + DesktopWidgets)
- Window manager (`useWindowManager`): how windows open, focus, minimize, maximize, workspace switching
- EventBus singleton: pub/sub for cross-app communication, list all event types
- Authentication flow: Lovable Cloud auth, `LockScreen` sign-in/sign-up, session persistence
- Mobile vs desktop rendering (`useDeviceClass`, `MobileLauncher`, `MobileAppView`)

### 3. `docs/APPS.md` — Application Catalog
For each of the 50+ apps, document:
- **Name**, **AppType key**, **Category** (Productivity, Finance, Infrastructure, Lore, etc.)
- **Backend integration**: which tables/edge functions it uses, or "Client-only"
- **Status**: Fully Live, Partially Live, Simulated, or Cloud-Persisted (via `useCloudStorage`)

Organized into sections:
- **Fully Live** (14 apps): HypersphereApp, PrimeChatApp, PrimeCalendarApp, PrimeVaultApp, PrimeWalletApp, PrimeBetsApp, PrimeSignalsApp, FilesApp, PrimeBookingApp, BotLabApp, AdminConsoleApp, AppForgeApp/MiniAppsApp, SettingsApp, PrimeSocialApp, PrimeMailApp, PrimeBoardApp
- **Cloud-Persisted** (via useCloudStorage): PrimeCanvasApp, TextEditorApp, PrimeGridApp, PrimeJournalApp
- **Simulated/Lore** (18 apps): PrimeNetApp, EnergyMonitorApp, DataCenterApp, Q3InferenceApp, FoldMemApp, etc.

### 4. `docs/BACKEND.md` — Backend & Database Reference
- **Database tables**: All 30+ tables with columns, RLS policy summary, and which app uses them
- **Edge functions**: All 16 functions with purpose, auth requirements, request/response format
  - `hyper-chat`: AI chat with streaming, memory persistence
  - `ai-social`: AI post generation for PrimeSocial
  - `prime-bank`: Token economy (mint, transfer, debit)
  - `market-data`: Stock/crypto price lookup via Polygon API
  - `sports-odds`: Sports betting odds via The Odds API
  - `bot-api` / `bot-runner` / `agent-runtime`: Bot lifecycle and autonomous agent execution
  - `admin-actions`: Role management and admin operations
  - `mini-app-gen`: AI-powered mini-app code generation
  - `ai-key-manager`: User API key CRUD
  - `elevenlabs-tts`: Text-to-speech via ElevenLabs
  - `system-analytics`: Real-time table counts and activity aggregation
  - `web-proxy`: CORS proxy for PrimeBrowser
  - `cron-dispatcher`: Scheduled task execution
- **Secrets**: Which secrets are configured and what they power
- **Storage buckets**: `user-files` bucket for FilesApp

### 5. `docs/HOOKS.md` — Custom Hooks Reference
Document each hook in `src/hooks/`:
- `useWindowManager` — Window CRUD, focus, workspace management
- `useEventBus` — Cross-app event pub/sub (list all event types)
- `useCloudStorage` — localStorage + database sync for app state persistence
- `useActivityTracker` — Logs user actions to `user_activity` table
- `useNotifications` — Toast notification system
- `useCalendarReminders` — Polls upcoming events, fires alerts
- `useGlobalShortcuts` — Keyboard shortcuts (Ctrl+K search, etc.)
- `useIdleTimeout` — Auto-lock after inactivity
- `useVoiceControl` — Voice command recognition
- `useSystemPulse` — Simulated system metrics
- `useDeviceClass` — Mobile/tablet/desktop detection
- `useIntranetPages` — PrimeBrowser intranet content

### 6. `docs/TERMINAL.md` — Terminal & Command Reference
- Available commands from `terminal/commands.ts`
- Pipe system from `terminal/pipes.ts`
- Terminal modes from `terminal/modes.ts`
- Widget commands from `terminal/widgetCommands.ts`

### 7. `docs/SECURITY.md` — Security & RLS Overview
- All tables have RLS enabled with `auth.uid() = user_id`
- Public-read tables: `profiles`, `bet_markets`, `forge_listings`
- Edge function auth pattern: Authorization header -> `getUser()` -> scoped queries
- API key storage note (plaintext in `encrypted_key` column)
- Service role key usage: only in edge functions, never client-side

## Update Existing File

### `README.md` (root)
- Add a "Documentation" section linking to `docs/README.md`
- Keep existing content but add links to the new docs

## Technical Notes
- All docs are pure Markdown, no code changes needed
- Total: 7 new files + 1 updated file
- Estimated ~3,000 lines of documentation covering the full system

