

# Cloud Hooks, Hypersphere AI Companion, and Deep Settings Panels

## Overview

Add three major features to PRIME OS: a Cloud Hooks management app, a Hypersphere AI companion widget, and a fully expanded Settings app with dedicated panels for Keyboard, Mouse, Display, and Audio/Video.

---

## Feature 1: Cloud Hooks App (CloudHooksApp)

**New File:** `src/components/os/CloudHooksApp.tsx`

A webhook/event automation manager for the PRIME lattice:

- **Hook list panel** -- left sidebar listing configured hooks with status indicators (active/paused/error). Each hook has a name, trigger event, and target endpoint.
- **Trigger events** -- selectable from system events: `node.online`, `node.offline`, `energy.cop.threshold`, `q3.inference.complete`, `foldmem.compact`, `primenet.route.change`, `security.alert`, `storage.region.full`.
- **Hook editor** -- right panel to configure:
  - Name, description
  - Trigger event (dropdown)
  - Target: `prime://` endpoint or simulated external URL
  - Payload template (JSON editor textarea)
  - Retry count and delay (sliders)
  - Enabled toggle
- **Execution log** -- bottom panel showing recent hook executions with timestamp, status (success/fail), response time, and payload preview. Auto-generates simulated executions every 8-12 seconds.
- **Test button** -- fires a test execution with simulated response.
- **Stats header** -- total hooks, active count, executions today, success rate percentage.

Default window size: 800x520.

---

## Feature 2: Hypersphere AI Companion

**New File:** `src/components/os/HypersphereApp.tsx`

An AI assistant themed as a sentient geometric entity living in the PRIME lattice:

- **Visual identity** -- animated SVG hypersphere at the top of the window: a rotating wireframe sphere with orbiting rings, rendered with CSS animations and SVG transforms. Pulses gently when idle, spins faster when "thinking."
- **Chat interface** -- below the visualization, a chat-style message thread with input field.
- **Personality** -- the AI responds as "Hyper," a geometric intelligence. It speaks in a mix of technical lattice jargon and helpful guidance. Responses are pre-scripted pattern-matched (no real AI backend needed):
  - Greets the user on open: "Greetings, operator. I am Hyper -- your geometric companion. How may I assist your lattice operations?"
  - Responds to keywords: "help" -> explains OS features, "energy" -> COP status, "network" -> PrimeNet health, "memory" -> FoldMem stats, "security" -> threat assessment, "hello/hi" -> friendly greeting.
  - Default fallback: "Interesting query. Let me fold that through 11 dimensions... I'm unable to resolve that coordinate, but try asking about energy, network, memory, or security."
- **Quick action buttons** -- row of chips below the input: "System Status", "Run Diagnostics", "Threat Scan", "Energy Report". Each triggers a multi-line formatted response.
- **Thinking animation** -- when processing, shows "Folding through dimensions..." with animated dots and the hypersphere spins faster.
- **Minimize to widget** -- when the window is open, a small floating orb appears in the bottom-right corner of the desktop (above the taskbar) that pulses. This is just the app icon behavior, no separate widget needed.

Default window size: 500x550.

---

## Feature 3: Deep Settings Panels

**Modified File:** `src/components/os/SettingsApp.tsx`

Refactor into a tabbed/sidebar settings app with multiple panels:

### Navigation
- Left sidebar with category icons: Display, Keyboard, Mouse, Audio, Notifications, About.
- Active category highlighted. Click to switch the right-side panel.

### Display Panel (replaces current Visual Effects + Accent Color)
- Scan Lines toggle (existing)
- Grid Background toggle (existing)
- Accent Color picker (existing cyan/violet/amber)
- **New:** Window opacity slider (0.7 to 1.0) -- controls default window backdrop opacity via CSS variable
- **New:** Animation speed selector: Slow / Normal / Fast -- adjusts framer-motion transition durations via CSS variable
- **New:** Font size selector: Compact / Default / Large -- adjusts base font scale

### Keyboard Panel
- **Shortcut reference table** -- read-only list of all global shortcuts:
  - Ctrl+K: Global Search
  - Ctrl+W: Close Window
  - Alt+Tab: Cycle Windows
  - Escape: Close focused dialog
- **Key repeat rate** -- slider (simulated, stored in localStorage)
- **Key repeat delay** -- slider (simulated)
- **Keyboard layout** -- dropdown: QWERTY / Dvorak / Colemak (display only, stored in settings)
- **Input method** -- dropdown: Standard / Geometric / Qutrit (cosmetic)

### Mouse Panel
- **Cursor speed** -- slider
- **Double-click speed** -- slider
- **Scroll direction** -- toggle: Natural / Standard
- **Pointer precision** -- toggle
- **Cursor theme** -- selector: Default / Crosshair / Lattice

### Audio Panel
- **Master volume** -- slider with percentage display
- **System sounds** -- toggle (notification beeps, boot sound)
- **Notification sound** -- toggle
- **Alert volume** -- slider
- **Sound theme** -- dropdown: Geometric / Minimal / Silent

### Notifications Panel (existing, moved to its own tab)
- Same notification events management UI currently in Settings

### About Panel (existing, moved to its own tab)
- Same system info currently displayed

All settings persist to `localStorage` under `prime-os-settings`. The settings state interface expands to include all new fields with sensible defaults.

---

## System Registration

### `src/types/os.ts`
Add to `AppType` union: `'cloudhooks' | 'hypersphere'`

### `src/components/os/Desktop.tsx`
- Import `CloudHooksApp` and `HypersphereApp`.
- Add cases to `renderApp` switch.

### `src/components/os/Taskbar.tsx`
- Add entries to `allApps`:
  - CloudHooks: `Webhook` (or `Link2`) icon, label "Cloud Hooks"
  - Hypersphere: `Orbit` icon, label "Hyper AI"

### `src/components/os/DesktopIcons.tsx`
- Add desktop icons for both new apps.

### `src/components/os/terminal/commands.ts`
- Add to `APP_MAP`: `cloudhooks` and `hypersphere` / `hyper`.
- Update `HELP_TEXT`.

### `src/hooks/useWindowManager.ts`
- Add default sizes: cloudhooks 800x520, hypersphere 500x550.

### `src/components/os/GlobalSearch.tsx`
- New apps auto-appear since GlobalSearch reads from Taskbar's `allApps` array (or uses the same list).

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/os/CloudHooksApp.tsx` | Create |
| `src/components/os/HypersphereApp.tsx` | Create |
| `src/components/os/SettingsApp.tsx` | Rewrite -- tabbed layout with 6 panels |
| `src/types/os.ts` | Edit -- add new AppType values |
| `src/components/os/Desktop.tsx` | Edit -- import and wire new apps |
| `src/components/os/Taskbar.tsx` | Edit -- add app entries |
| `src/components/os/DesktopIcons.tsx` | Edit -- add icons |
| `src/components/os/terminal/commands.ts` | Edit -- add APP_MAP entries |
| `src/hooks/useWindowManager.ts` | Edit -- add default sizes |

## Technical Notes

- No new dependencies. All simulated with useState/setInterval.
- Hypersphere SVG uses CSS `@keyframes` for rotation -- no canvas needed.
- Settings tabs use simple state-based panel switching, no router.
- All new settings stored in the existing `prime-os-settings` localStorage key with expanded interface.
- Cloud Hooks execution log auto-generates entries to feel alive.

