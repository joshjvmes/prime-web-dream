
# Floating Mini ROKCAT Widget + Widget Settings Toggle

## Overview

Add a floating mini ROKCAT face as a new desktop widget in the bottom-right corner. Double-click toggles it on/off (active = listens for system events and speaks them via TTS; inactive = static/sleeping face). Also add a "ROKCAT Assistant" toggle to the existing Widget Settings in the Settings app.

---

## 1. New Widget: RokCatWidget

**File: `src/components/os/DesktopWidgets.tsx`**

Add a new `RokCatWidget` component inside the existing widget system:

- Renders a small (120x120px) `RokCatFace` component inside a draggable widget frame
- Has an `active` state (persisted in localStorage via the widget state)
- **Double-click** on the face toggles active/inactive:
  - Active: face glows cyan, listens on `eventBus` for `notification.created` and `agent.action.logged` events, speaks summaries via the `elevenlabs-tts` edge function with jaw animation
  - Inactive: face is dim/sleeping, no TTS, shows a small "zzz" indicator
- Single-click drag still works for repositioning (handled by existing `DraggableWidget` wrapper)
- Shows a small status indicator (green dot = active, gray = sleeping)

## 2. Widget State Updates

**File: `src/components/os/DesktopWidgets.tsx`**

- Add `rokcat: boolean` to the `WidgetState` interface (default: `false`)
- Add default position: `rokcat: { x: -200, y: -200 }` (bottom-right relative, will compute at render)
- Register in the widgets array alongside clock, stats, notes, etc.
- The RokCatWidget gets a special fixed position in bottom-right corner by default

## 3. Settings Integration

**File: `src/components/os/SettingsApp.tsx`**

- Add `rokcat: boolean` to the `WidgetToggles` interface
- Add a new toggle row: "ROKCAT Assistant" in the Desktop Widgets section
- Follows the exact same pattern as the existing clock/stats/notes toggles

## 4. RokCatWidget Component Details

```text
function RokCatWidget():
  - useState: active (boolean, from localStorage)
  - useRef: RokCatFaceHandle for speak/stop
  - useEffect: when active, subscribe to eventBus events:
    - 'notification.created' -> speak notification summary
    - 'agent.action.logged' -> speak agent action summary
  - onDoubleClick handler: toggles active state, saves to localStorage
  - Renders:
    - RokCatFace (small, 120x120)
    - Status dot overlay (green pulse when active, gray when off)
    - "Double-click to wake/sleep" tooltip on hover
```

## 5. Technical Details

### Files Modified

| File | Change |
|------|--------|
| `src/components/os/DesktopWidgets.tsx` | Add `rokcat` to WidgetState, add RokCatWidget component, register in widgets array |
| `src/components/os/SettingsApp.tsx` | Add `rokcat` to WidgetToggles interface and toggle UI |

### No New Files

Everything fits within existing files following the established widget pattern.

### Implementation Notes

- The RokCatFace component already accepts a `className` prop and exposes `speak(audioUrl)` via `useImperativeHandle` -- perfect for embedding as a mini widget
- TTS calls go through the existing `elevenlabs-tts` edge function at `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`
- Event bus subscriptions use the existing `eventBus.on/off` pattern from `useEventBus`
- Widget position defaults to bottom-right but is draggable like all other widgets
- The double-click vs drag distinction works because drag requires mousedown on the title bar (GripHorizontal area), while double-click targets the face content area

### Execution Order

1. Update `WidgetState` interface and defaults in `DesktopWidgets.tsx`
2. Create `RokCatWidget` component with double-click toggle + TTS integration
3. Register rokcat in the widgets array
4. Update `WidgetToggles` in `SettingsApp.tsx` and add the toggle row
5. Test end-to-end: enable widget from Settings, verify face renders, double-click to activate, trigger a notification to hear TTS
