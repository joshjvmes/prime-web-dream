

# Native Bot Creation Prompts, One-Click Bots, and Deep Documentation

## Overview

Add three features to the PRIME OS bot ecosystem:
1. **One-click preset bots** -- a gallery of ready-made bot templates users can deploy instantly
2. **OS-level natural language bot creation** -- a system-wide prompt (accessible from desktop context menu, taskbar, and PrimeAgent) that lets users type a description and create a bot without opening BotLab
3. **Deep documentation system** -- a built-in "PrimeDocs" section covering all apps, tools, API endpoints, and bot capabilities

---

## 1. One-Click Bot Presets

Add a preset gallery to BotLabApp's "Create" tab, shown above the natural language input.

### Preset Bot Templates

| Name | Description | Permissions | Type |
|------|-------------|-------------|------|
| Market Watcher | Monitors stock prices and alerts on big moves | get_market_data, get_stock_chart, send_message | autonomous |
| Portfolio Guardian | Tracks your vault holdings and sends daily summaries | check_portfolio, get_market_data, save_memory | scheduled |
| Booking Assistant | Auto-manages resource bookings and conflicts | create_booking, list_bookings, cancel_booking | autonomous |
| Social Publisher | Posts scheduled updates to PrimeSocial | post_to_social, save_memory, recall_memories | scheduled |
| Canvas Artist | Creates procedural art on demand | draw_on_canvas, generate_canvas_art | autonomous |
| Data Reporter | Builds spreadsheet reports from system data | create_spreadsheet, update_cells, add_chart, read_spreadsheet | scheduled |
| Chat Relay | Forwards messages between channels | send_message, list_conversations | autonomous |
| DJ Bot | Controls PrimeAudio based on time of day | control_audio | scheduled |

Each preset is a JSON config object. Clicking "Deploy" calls `bot-api?action=create-bot` immediately with no AI generation step needed.

### UI Changes (BotLabApp.tsx)

- New section at top of "Create" tab: "Quick Deploy" grid of preset cards
- Each card shows: icon, name, description, permission count badge
- One button: "Deploy" -- creates the bot instantly
- Below the presets, the existing natural language creator remains

---

## 2. OS-Level Bot Creation Prompt

### New Component: `BotCreatorPrompt.tsx`

A lightweight modal/dialog that can be triggered from anywhere in the OS:
- Simple text input: "Describe what your bot should do..."
- "Create Bot" button that calls hyper-chat to generate config, then bot-api to create it
- Shows generated config preview before confirming
- Success state shows bot name + link to open BotLab

### Trigger Points

**Desktop Context Menu** (DesktopContextMenu.tsx):
- Add "Create Bot..." menu item under a new "Automation" section

**Taskbar** (Taskbar.tsx):
- Add bot icon to system tray area that opens the prompt

**PrimeAgent** (PrimeAgentApp.tsx):
- When user says "create a bot that..." the agent opens BotCreatorPrompt instead of just opening BotLab
- Parse the description from the instruction and pre-fill the prompt

**Global Search** (GlobalSearch.tsx):
- Typing "create bot" or "new bot" shows an action to open the creator prompt

### Implementation

The component reuses the same `callBotApi` + hyper-chat flow from BotLabApp but in a standalone dialog. It uses Radix Dialog for the modal.

---

## 3. Deep Documentation System

### New Tab in BotLabApp: "Docs"

Add a fifth tab to BotLabApp called "Docs" that contains comprehensive documentation.

### Documentation Sections

**Getting Started**
- What are bots in PRIME OS
- How to create your first bot (natural language vs one-click)
- Understanding bot types (autonomous, scheduled, external)

**Tool Reference**
- Every tool listed with: name, description, parameters with types, example usage, which apps it interacts with
- Organized by category (Market Data, Portfolio, Booking, etc.)
- Copy-paste example JSON payloads for external API usage

**API Reference**
- Endpoint URL format
- Authentication methods (API key vs JWT)
- All actions: tools, execute, chat, status, create-bot, delete-bot, generate-key, revoke-key, list-keys, audit-log
- Request/response examples for each
- Rate limiting details
- MCP connection instructions

**Bot Types Guide**
- Autonomous: event-driven, trigger config explained
- Scheduled: cron syntax reference with examples
- External: how to connect from Claude, Cursor, custom scripts

**Permissions Guide**
- What each permission allows
- Least-privilege recommendations
- Which tools are server-side vs client-side

**EventBus Reference**
- All event types listed
- Which events bots can trigger on
- How trigger_config matching works

**Troubleshooting**
- Common errors and fixes
- Rate limit handling
- Key rotation best practices

### Implementation

Documentation is stored as a static data structure (array of sections with markdown content) rendered inline with basic markdown formatting. No external dependencies needed -- just styled divs with headers, code blocks, and lists.

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/os/BotCreatorPrompt.tsx` | Standalone bot creation dialog |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/os/BotLabApp.tsx` | Add one-click presets to Create tab, add Docs tab with full documentation |
| `src/components/os/DesktopContextMenu.tsx` | Add "Create Bot..." menu item |
| `src/components/os/Taskbar.tsx` | Add bot shortcut to system tray |
| `src/components/os/PrimeAgentApp.tsx` | Enhanced "create bot" command that pre-fills description |
| `src/components/os/GlobalSearch.tsx` | Add "Create Bot" action |
| `src/components/os/Desktop.tsx` | Import and render BotCreatorPrompt, pass open state |

### Bot Preset Data Structure

```text
interface BotPreset {
  name: string;
  description: string;
  icon: string;
  permissions: string[];
  bot_type: 'autonomous' | 'scheduled';
  system_prompt: string;
  trigger_config?: { events: string[] };
  schedule?: string;
}
```

### BotCreatorPrompt Props

```text
interface BotCreatorPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDescription?: string;  // pre-filled from PrimeAgent
}
```

### Documentation Data Structure

```text
interface DocSection {
  id: string;
  title: string;
  content: string;  // markdown-like content rendered with basic formatting
  subsections?: { title: string; content: string }[];
}
```

### Execution Order

1. Create `BotCreatorPrompt.tsx` (standalone modal component)
2. Update `BotLabApp.tsx` (add presets grid + Docs tab with full documentation)
3. Update `Desktop.tsx` (render BotCreatorPrompt, manage open state)
4. Update `DesktopContextMenu.tsx` (add Create Bot menu item)
5. Update `Taskbar.tsx` (add bot icon to system tray)
6. Update `PrimeAgentApp.tsx` (enhanced create-bot command)
7. Update `GlobalSearch.tsx` (add Create Bot action)

