

# Comprehensive Widget System with AI Control

## Overview

Make all widgets fully controllable by the AI agent and terminal, with persistent on/off state and programmatic toggle/move capabilities via the EventBus.

## Changes

### 1. Add Widget Control Events to EventBus

**File: `src/hooks/useEventBus.ts`**

Add three new event types:
- `widget.toggle` -- toggle or set a widget's visibility
- `widget.move` -- reposition a widget
- `widget.list` -- request current widget state (response emitted back)

### 2. Make DesktopWidgets Respond to Control Events

**File: `src/components/os/DesktopWidgets.tsx`**

- Listen for `widget.toggle` events with payload `{ id: string, enabled?: boolean }`. If `enabled` is provided, set to that value; otherwise toggle. Save state and emit `widgets.updated`.
- Listen for `widget.move` events with payload `{ id: string, x: number, y: number }`. Update the widget position and save.
- Listen for `widget.list` and emit `widget.list.response` with current state (which widgets are on/off, positions).
- Enable **all widgets by default**: change `notes`, `network`, `forge`, `agentLog` defaults from `false` to `true`.

### 3. Add Widget Commands to PrimeAgent

**File: `src/components/os/PrimeAgentApp.tsx`**

Add widget-related instruction parsing:
- "show/enable/open widget X" -> emits `widget.toggle` with `{ id, enabled: true }`
- "hide/disable/close widget X" -> emits `widget.toggle` with `{ id, enabled: false }`
- "move widget X to Y,Z" -> emits `widget.move` with `{ id, x, y }`
- "show all widgets" / "hide all widgets" -> toggles all
- "arrange widgets" / "organize widgets" -> positions them in a grid layout

Import `eventBus` and add a new action type `'widget-control'` to handle these.

### 4. Add Terminal Widget Commands

**File: `src/components/os/terminal/commands.ts`**

Add new commands:
- `widget list` -- shows all widgets with their on/off status and positions
- `widget toggle <name>` -- toggles a widget on/off
- `widget show <name>` -- enables a widget
- `widget hide <name>` -- disables a widget
- `widget move <name> <x> <y>` -- moves a widget
- `widget reset` -- resets all widgets to defaults
- `widget all on|off` -- enables/disables all widgets

Add `widget` to HELP_TEXT.

### 5. Align Settings Defaults

**File: `src/components/os/SettingsApp.tsx`**

Update the default `WidgetToggles` to match the new "all enabled" defaults so Settings and DesktopWidgets stay in sync.

---

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| `src/hooks/useEventBus.ts` | Add `widget.toggle`, `widget.move`, `widget.list` to EVENT_TYPES |
| `src/components/os/DesktopWidgets.tsx` | Add eventBus listeners for widget control; enable all widgets by default; export `WIDGET_IDS` map for name resolution |
| `src/components/os/PrimeAgentApp.tsx` | Add widget instruction parsing + `widget-control` action type with eventBus emits |
| `src/components/os/terminal/commands.ts` | Add `widget` command with subcommands; import eventBus |
| `src/components/os/SettingsApp.tsx` | Update defaults to all-enabled |

### Widget ID to Name Map

```text
clock     -> "Clock"
stats     -> "System Stats"  
notes     -> "Quick Notes"
network   -> "PrimeNet"
forge     -> "Forge Market"
agentLog  -> "Agent Activity"
rokcat    -> "ROKCAT"
```

The name resolution will be case-insensitive and support partial matches (e.g., "clock", "stats", "rokcat", "agent", "forge", "notes", "network").

### EventBus Payloads

```text
widget.toggle:  { id: string, enabled?: boolean }
widget.move:    { id: string, x: number, y: number }
widget.list:    (no payload -- DesktopWidgets responds with widget.list.response)
```

### Agent Examples

- User says "Show all widgets" -> Agent emits `widget.toggle` for each widget with `enabled: true`
- User says "Move clock to top right" -> Agent emits `widget.move` with `{ id: 'clock', x: 1100, y: 80 }`
- User says "Hide the notes widget" -> Agent emits `widget.toggle` with `{ id: 'notes', enabled: false }`
- User says "Arrange widgets neatly" -> Agent emits a series of `widget.move` events in a grid pattern

### Terminal Examples

```text
> widget list
DESKTOP WIDGETS
  clock      ON   (200, 80)
  stats      ON   (200, 220)
  notes      ON   (400, 80)
  ...

> widget toggle clock
Widget "Clock" toggled OFF

> widget move stats 500 100
Widget "System Stats" moved to (500, 100)

> widget all on
All widgets enabled
```

### Execution Order

1. Update EventBus with new event types
2. Update DesktopWidgets with control listeners and new defaults
3. Update SettingsApp defaults to match
4. Add widget commands to terminal
5. Add widget instructions to PrimeAgent parser
