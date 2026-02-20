
# New GUI Apps + Expanded Interactivity

## Overview

Add 4 new applications to PRIME OS -- a System Monitor dashboard, a Text Editor, a Chat/Messaging app, and a Security Console -- plus wire them into the existing terminal, taskbar, and window manager. Each app follows the established pattern: a component in `src/components/os/`, registered in the `AppType` union, and accessible from the PRIME menu and terminal.

---

## New App 1: System Monitor Dashboard

**File:** `src/components/os/SystemMonitorApp.tsx`

A real-time mission-control overview combining data from across the OS into one view:

- **CPU/Memory gauges:** Animated arc gauges (SVG) showing aggregate qutrit core utilization and FoldMem usage, updating every second with simulated fluctuations.
- **Process sparklines:** A mini chart showing total process count and state distribution (Past/Present/Future) over the last 30 ticks.
- **Network throughput bar:** Live packets-per-second with a rolling sparkline, similar to the Energy Monitor's COP history.
- **Energy COP tile:** Current COP value and mode in a compact badge.
- **Storage capacity ring:** A donut chart showing folded vs. free capacity.
- **Grid layout:** 2x3 tile grid so every subsystem is visible at a glance.

---

## New App 2: Text Editor (PrimeEdit)

**File:** `src/components/os/TextEditorApp.tsx`

A minimal code/text editor integrated with the Files app's file tree:

- **File browser sidebar:** A narrow left panel listing the same file tree from FilesApp. Click a file to open it.
- **Editor pane:** A `<textarea>` with monospace styling, line numbers rendered as a gutter column, and basic syntax-style coloring (lines starting with `//` dimmed, keywords like `fold`, `map`, `flow` highlighted via regex class assignment).
- **Tab bar:** Open multiple files as tabs across the top. Active tab is highlighted.
- **Save/New/Close controls:** A toolbar with buttons. "Save" writes back to the in-memory file tree (shared state or self-contained). "New" creates a blank untitled file.
- **Status bar:** Bottom row showing line count, cursor position, and file coordinate.

---

## New App 3: PrimeChat (Messaging)

**File:** `src/components/os/PrimeChatApp.tsx`

A simulated inter-node messaging interface:

- **Channel list sidebar:** Left panel with channels like `#general`, `#primenet-ops`, `#q3-research`, `#energy-lab`. Each shows an unread indicator.
- **Message view:** Right panel with timestamped messages from simulated users (e.g., `lattice-admin`, `q3-daemon`, `node-07`). Messages are styled as chat bubbles with monospace text.
- **Auto-responses:** When the user sends a message, after a 1-2 second delay, a simulated AI/system user responds with contextually relevant text (randomized from a pool per channel). Encrypted channel indicators shown as a lock icon.
- **Input bar:** Bottom text input with a send button. Messages from the user appear right-aligned with a distinct color.
- **Typing indicator:** A brief "lattice-admin is computing..." animation before auto-responses appear.

---

## New App 4: Security Console (Lattice Shield)

**File:** `src/components/os/SecurityConsoleApp.tsx`

A visual security dashboard for the prime coordinate network:

- **Threat feed:** A scrolling log of simulated security events (e.g., "Unauthorized coordinate probe at (41,43,47)", "Lattice integrity verified: sector 7"). Color-coded by severity (green/amber/red). Auto-generates a new event every 3-5 seconds.
- **Integrity scanner:** A button to run a "full lattice scan" -- triggers an animated progress bar that fills over 5 seconds, then displays a report with pass/fail items.
- **Firewall rules table:** A list of simulated rules (allow/deny) with source/destination coordinates. Users can toggle rules on/off.
- **Threat level gauge:** An SVG arc gauge showing current threat level (Low/Medium/High) that fluctuates.
- **Active connections panel:** Shows currently "connected" nodes with their coordinates and encryption status.

---

## Wiring and Registration

### `src/types/os.ts`
Add to `AppType` union:
```
'monitor' | 'editor' | 'chat' | 'security'
```

### `src/components/os/Desktop.tsx`
- Import the 4 new app components.
- Add cases to the `renderApp` switch.

### `src/components/os/Taskbar.tsx`
- Add 4 entries to the `allApps` array with appropriate icons:
  - Monitor: `Monitor` icon
  - Editor: `FileText` icon
  - Chat: `MessageSquare` icon
  - Security: `Shield` icon

### `src/components/os/DesktopContextMenu.tsx`
- Add the new apps to the context menu if they're listed there.

### `src/components/os/terminal/commands.ts`
- Add entries to `APP_MAP` so `open monitor`, `open editor`, `open chat`, `open security` work.
- Update `HELP_TEXT` to mention new apps.

### `src/hooks/useWindowManager.ts`
- Adjust default window sizes for new app types (monitor gets larger default, editor gets wider).

---

## Technical Notes

- All data is simulated with `useState` + `setInterval` -- no backend needed.
- SVG gauges follow the same pattern as `EnergyMonitorApp` (arc paths with `strokeDasharray`/`strokeDashoffset`).
- Styling uses existing CSS custom properties (`--prime-cyan`, `--prime-amber`, `--prime-green`, etc.) and the `font-mono`/`font-display` classes.
- No new dependencies required. Uses `framer-motion` for animations (already installed), `lucide-react` for icons.
- Each app is self-contained in its own file with no shared state dependencies.
