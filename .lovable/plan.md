

# PRIME OS: Autonomous Agent, Robotics, Booking & IoT

## Overview

Add four major features to PRIME OS: an autonomous AI agent that can operate the entire system, plus three new application modules for robotics control, booking/scheduling, and IoT device management.

---

## 1. PrimeAgent -- Autonomous System Operator

A new app that acts as the "brain" of PRIME OS. Unlike the existing Hyper AI (which is a simple keyword-matching chatbot), PrimeAgent is an autonomous agent with a task queue, action log, and the ability to open/close apps, run terminal commands, manage windows, and orchestrate multi-step workflows.

**New file: `src/components/os/PrimeAgentApp.tsx`**

- Chat interface where you give the agent high-level instructions (e.g. "Run diagnostics, check energy status, and open the security console")
- The agent breaks instructions into discrete tasks shown in a task queue panel
- Each task executes simulated actions: opening apps, running terminal commands, reading system state
- Live action log shows what the agent is doing step-by-step with typewriter output
- Quick command buttons: "Full System Check", "Secure All", "Optimize Energy", "Deploy Build"
- The agent uses the existing `onOpenApp` / `onCloseApp` callbacks to actually open and close windows
- Simulated multi-step workflows with delays between steps for immersion
- Agent "personality" as a geometric operations coordinator

**Architecture:**
- An internal action system maps natural-language-like instructions to sequences of operations
- Each operation is a typed action: `open-app`, `run-command`, `check-status`, `report`
- The agent processes its queue with configurable delays, streaming results back to the chat
- No external AI API needed -- this is a sophisticated rule-based agent with pattern matching and pre-built workflows

---

## 2. PrimeRobotics -- Robotics Control Interface

**New file: `src/components/os/PrimeRoboticsApp.tsx`**

- Dashboard showing a fleet of simulated robotic units (drones, arms, rovers)
- Each unit has: name, type, status (idle/active/charging/error), battery level, current task, coordinates
- Control panel for selected unit: Start/Stop/Recall, assign task, view telemetry
- Telemetry view with simulated live data (position, speed, battery drain)
- Task assignment: select from predefined tasks (patrol, scan, transport, calibrate)
- Fleet overview grid with status indicators
- Simulated real-time updates via intervals

---

## 3. PrimeBooking -- Scheduling & Reservation System

**New file: `src/components/os/PrimeBookingApp.tsx`**

- Calendar-based booking interface for resources (labs, compute clusters, meeting rooms, equipment)
- Resource list sidebar with availability indicators
- Day/week view showing time slots with existing bookings
- Create booking form: resource, date, time range, purpose, priority
- Existing bookings shown as colored blocks on the timeline
- Cancel/modify bookings
- Pre-populated with themed bookings (lattice calibration, qutrit maintenance window, energy lab access)

---

## 4. PrimeIoT -- IoT Device Management

**New file: `src/components/os/PrimeIoTApp.tsx`**

- Device dashboard showing connected IoT devices grouped by zone (Lab A, Server Room, Energy Wing, Perimeter)
- Device types: sensors (temp, humidity, pressure, radiation), actuators (valves, switches, motors), cameras
- Each device shows: name, type, zone, status (online/offline/warning), last reading, battery
- Device detail panel: historical readings as a mini sparkline, toggle on/off, set thresholds
- Alert panel showing devices with readings outside thresholds
- Simulated live sensor data updates via intervals
- Zone map view showing device locations on a schematic grid

---

## Integration & Wiring

### `src/types/os.ts`
- Add `'agent'`, `'robotics'`, `'booking'`, `'iot'` to the `AppType` union

### `src/hooks/useWindowManager.ts`
- Add default window sizes for the four new apps

### `src/components/os/Desktop.tsx`
- Import and wire all four new components into `renderApp`
- Pass `onOpenApp` and `onCloseApp` to PrimeAgentApp

### `src/components/os/Taskbar.tsx`
- Add all four apps to the `allApps` list with appropriate icons (Bot, Cog, CalendarCheck, Wifi)

### `src/components/os/DesktopIcons.tsx`
- Add icons for the new apps

### `src/components/os/terminal/commands.ts`
- Add `agent`, `robotics`, `booking`, `iot` to the `APP_MAP` so they can be opened from the terminal

---

## Files Summary

| File | Action |
|------|--------|
| `src/types/os.ts` | Edit -- add 4 new AppType values |
| `src/components/os/PrimeAgentApp.tsx` | Create -- autonomous agent interface |
| `src/components/os/PrimeRoboticsApp.tsx` | Create -- robotics fleet control |
| `src/components/os/PrimeBookingApp.tsx` | Create -- booking/scheduling system |
| `src/components/os/PrimeIoTApp.tsx` | Create -- IoT device management |
| `src/hooks/useWindowManager.ts` | Edit -- add window sizes |
| `src/components/os/Desktop.tsx` | Edit -- import & wire new apps |
| `src/components/os/Taskbar.tsx` | Edit -- add to app list |
| `src/components/os/DesktopIcons.tsx` | Edit -- add desktop icons |
| `src/components/os/terminal/commands.ts` | Edit -- add to APP_MAP |

