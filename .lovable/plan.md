

# Preset Workflow Templates Showcasing ROKCAT's Full Capabilities

## What We're Building

Expand the CloudHooks template library from the current 3 basic templates to a comprehensive set of ~12-15 preset workflows organized by category. These presets will serve as both ready-to-use automations and a discoverable catalog showing ROKCAT (and users) everything the system can do.

## Current State

CloudHooks has 3 simple templates: File Upload Notifier, Calendar Reminder, Welcome Workflow. All just trigger notifications. The system supports 5 action types: `notification`, `open_app`, `copy_text`, `lock_screen`, `webhook`.

ROKCAT has 25+ tools (social posting, email, wallet, trading, canvas, spreadsheets, booking, messaging, audio, image/video generation) plus desktop control via action tags (open/close/navigate 37+ apps).

## Plan

### 1. Add new action types to CloudHooks

Currently CloudHooks only supports 5 basic action types. Add new ones that map to ROKCAT's tool capabilities:

- `ai_command` — sends a natural language instruction to ROKCAT via `hyper-chat` (e.g., "check my balance", "post a status update"). This is the key addition: it lets any workflow trigger ROKCAT's full tool suite.
- `emit_event` — emit a custom EventBus event (for chaining workflows)

**In `CloudHooksApp.tsx`**: Add these to `ACTION_TYPES`, add corresponding config inputs (text field for the AI command, event name + payload for emit), and wire the execution handler to call `hyper-chat` for `ai_command`.

### 2. Expand TEMPLATES array with categorized presets

Organize into categories and add ~12 new templates:

**System & Security**
- "Morning System Check" — trigger: `user.signed-in` → ai_command: "Check system health, open the monitor, and give me a status report"
- "Security Alert Handler" — trigger: `security.threat` → notification + open_app: security
- "Lock on Idle" — trigger: `system.idle` → lock_screen

**Financial & Trading**
- "Market Open Brief" — trigger: `calendar.event.starting` (condition: "market") → ai_command: "Check my portfolio and get market data for my top holdings"
- "Balance Low Alert" — trigger: `wallet.transaction` → ai_command: "Check my balance and warn me if it's below 100 tokens"

**Productivity**
- "Daily Standup Prep" — trigger: `user.signed-in` → ai_command: "Open my board, check today's bookings, and summarize what's on my plate"
- "New Email Reactor" — trigger: `mail.received` → notification + open_app: mail
- "Meeting Auto-Book" — trigger: `calendar.event.created` → ai_command: "List my bookings and check for conflicts"

**Creative & Social**
- "Auto Social Post" — trigger: `file.uploaded` → ai_command: "Post to PrimeSocial about the new file upload"
- "Canvas Art Generator" — trigger: `system.idle` → ai_command: "Generate a random piece of generative art on PrimeCanvas"

**Autonomous & Advanced**
- "Full System Tour" — trigger: `user.signed-in` → ai_command: "Open terminal, then monitor, then mail, then social — give me a full tour of the OS"
- "Data Report Builder" — trigger: `calendar.event.starting` (condition: "report") → ai_command: "Create a spreadsheet with today's system metrics and add a chart"

### 3. UI improvements to template picker

- Replace the flat template list with a categorized dropdown/section layout
- Show a brief description under each template name
- Add a "Browse All Presets" button that shows a modal/panel with all templates organized by category, each with description and a one-click "Add" button

### Files Changed

1. **`src/components/os/CloudHooksApp.tsx`** — Add `ai_command` and `emit_event` action types, expand TEMPLATES array with categories, update template picker UI, wire `ai_command` execution to call `hyper-chat`
2. **`src/hooks/useEventBus.ts`** — Potentially add new event types if missing (e.g., `system.idle`, `security.threat`) to the `EVENT_TYPES` array so they appear in the trigger dropdown

### Execution Flow for `ai_command`

When a hook with an `ai_command` action fires:
1. Get user session token
2. POST to `hyper-chat` with the command as the user message
3. Parse response for action tags (reuse `parseAndExecuteActions`)
4. Log execution result

This effectively gives every workflow access to ROKCAT's entire 25+ tool suite without needing individual action types for each one.

