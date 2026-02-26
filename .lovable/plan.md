

# Clickable COP & Cores Indicators in Taskbar

## Overview

Make the "COP 3.2" and "649 cores" indicators in the bottom taskbar clickable, each opening a detailed popover with rich system information.

---

## COP 3.2 Popover

When clicked, shows a popover with energy/COP details:

- **COP gauge** -- arc gauge showing current COP value (3.2) on a 0-5 scale
- **What is COP** -- brief explanation: "Coefficient of Performance -- ratio of useful energy output to input. Values above 1.0 indicate over-unity operation."
- **Live stats**: Input power, Output power, Efficiency %, Energy mode (Satellite)
- **Historical sparkline** -- last 30 readings
- **Quick link** -- "Open Energy Monitor" button to launch the full Energy Monitor app

## 649 Cores Popover

When clicked, shows a popover with core/compute details:

- **Core grid** -- mini visualization of 649 cores as tiny colored dots (active = green, idle = dim, busy = amber)
- **Stats**: Active cores, Idle cores, Average load %, Architecture info (11D Folded to 4D)
- **Core distribution** by subsystem: Kernel, Network, Inference, User, I/O
- **Quick link** -- "Open System Monitor" button to launch the full System Monitor app

---

## Technical Details

### File Modified: `src/components/os/Taskbar.tsx`

**Changes at lines 264-271:**

Replace the two static `<div>` elements with `<Popover>` components (already imported in the file).

**COP Popover** (replaces lines 264-267):
- Trigger: the existing COP display styled as a button
- Content: a `PopoverContent` with arc gauge SVG, stats grid, sparkline, and "Open Energy Monitor" button
- Simulated live data using `useState` + `useEffect` interval (matching SystemMonitorApp's pattern)

**Cores Popover** (replaces lines 268-271):
- Trigger: the existing cores display styled as a button
- Content: a `PopoverContent` with mini core grid (649 tiny dots), stats, subsystem breakdown, and "Open System Monitor" button
- Core states randomized on interval for ambient life

### New State Variables

```text
copValue: number (fluctuates around 3.2)
copHistory: number[] (30 readings for sparkline)
coreStates: number[] (649 entries: 0=idle, 1=active, 2=busy)
```

A single `useEffect` with a 2-second interval updates these values, keeping the popovers alive when open.

### No New Files

Everything fits within the existing `Taskbar.tsx` file. The Popover component and Zap icon are already imported.

### Execution Order

1. Add state variables for COP data and core states
2. Add useEffect interval for live updates
3. Replace COP static div with Popover containing gauge + stats
4. Replace cores static div with Popover containing grid + stats
5. Both popovers include a button that calls `onOpenApp('energy', ...)` or `onOpenApp('monitor', ...)`

