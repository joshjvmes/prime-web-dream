
# Prime Calendar, Clock Popover, and Smart Notifications

## Overview

Three additions: a new PrimeCalendar app that fuses solar and lunar cycles into a geometric calendar system, a date/time popover triggered by clicking the taskbar clock, and a rework of the notification system so notifications are contextual (tied to app usage) rather than randomly timed.

---

## Feature 1: PrimeCalendar App

**New File:** `src/components/os/PrimeCalendarApp.tsx`

A dual-calendar system weaving solar and lunar cycles onto the prime lattice:

- **Month view** -- a grid calendar showing the current month with day cells. Each cell shows:
  - Standard date number
  - Moon phase icon (new, waxing crescent, first quarter, waxing gibbous, full, waning gibbous, last quarter, waning crescent) computed from a simple lunar cycle formula (29.53-day synodic period)
  - Subtle background tint based on solar season (cool blues for winter, warm ambers for summer)
- **Lunar ribbon** -- a horizontal strip above the grid showing the current 29-day lunar cycle with the current phase highlighted and a marker showing where today falls
- **Solar tracker** -- a small arc/progress bar showing days since last solstice and days until next, with equinox markers
- **Prime day markers** -- days that are prime numbers (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31) get a special diamond glyph and glow border
- **Navigation** -- left/right arrows to move between months, "Today" button to snap back
- **Day detail panel** -- click any day to see: full date, moon phase name and illumination %, solar elevation category, prime factorization of the day number, and "lattice coordinate" (a computed prime tuple)
- **Upcoming events sidebar** -- right panel listing simulated system events: "Q3 batch scheduled", "Energy harvest peak", "Lattice maintenance window" with dates

Default window size: 700x520.

Uses `date-fns` (already installed) for date math. Moon phase computed with a simple algorithm based on known new moon reference date.

---

## Feature 2: Clock Popover (Taskbar)

**Modified File:** `src/components/os/Taskbar.tsx`

Make the clock in the taskbar clickable to show a date/time popover:

- Wrap `ClockDisplay` in a `Popover` component
- **Popover content:**
  - Current date in full format (e.g., "Thursday, February 20, 2026")
  - Current time in large display
  - Current moon phase with icon and name
  - Mini calendar for the current month (compact 7-column grid, ~180px wide)
  - "Open Calendar" button that launches the PrimeCalendar app
- Styled consistently with the existing taskbar popovers (bg-card/95, backdrop-blur, border-border)

---

## Feature 3: Context-Aware Notifications

**Modified File:** `src/hooks/useNotifications.ts`

Rework notifications so they fire based on app activity rather than random timers:

### Current problem
Notifications fire on a random 8-23 second timer regardless of what the user is doing. This feels spammy and disconnected.

### New approach
- Remove the always-running random timer
- Add a `triggerNotification` function that Desktop/apps can call to fire a notification tied to a specific action
- Add an `activeApps` parameter to `useNotifications` -- the list of currently open app types
- Notifications fire contextually:
  - **On app open:** When opening an app for the first time in a session, there is a 40% chance of a relevant notification appearing after 3-5 seconds. E.g., opening PrimeNet triggers "New node joined lattice" or "Geodesic route optimized."
  - **On sustained use:** After an app has been open for 30+ seconds, there is a chance of a follow-up notification (once, not repeating). E.g., after using Q3 Inference: "Inference batch complete."
  - **Idle notifications:** If no windows are open for 20+ seconds, a single ambient notification may appear (e.g., "QK Scheduler: cycle balanced"). Maximum one idle notification per 60 seconds.
- Each notification event gets a new `triggerApp` field mapping it to which app(s) trigger it
- The enabled/disabled toggle in Settings still controls whether each event type can fire at all
- Auto-dismiss: toast notifications in the top-right auto-dismiss after 8 seconds (add a timeout in NotificationSystem)

### Updated event structure
```
interface NotificationEvent {
  id: string;
  title: string;
  message: string;
  enabled: boolean;
  triggerApps: AppType[];  // which apps can trigger this
}
```

### Default event-to-app mappings
- PrimeNet events -> `primenet`, `browser`
- Q3 Engine events -> `q3inference`
- Energy events -> `energy`, `monitor`
- FoldMem events -> `foldmem`
- GeomC events -> `geomc`
- PFS events -> `files`
- Storage events -> `storage`
- QK Scheduler -> `processes`, `terminal`

**Modified File:** `src/components/os/NotificationSystem.tsx`
- Add auto-dismiss timer: each visible notification disappears after 8 seconds
- Add a subtle progress bar at the bottom of each toast showing time remaining

**Modified File:** `src/components/os/Desktop.tsx`
- Pass open window app types to `useNotifications`
- Track which apps have been opened this session to trigger "first open" notifications
- Track app open duration for "sustained use" notifications

---

## System Registration

### `src/types/os.ts`
Add `'calendar'` to `AppType` union.

### `src/components/os/Desktop.tsx`
- Import `PrimeCalendarApp`
- Add `case 'calendar'` to `renderApp`
- Pass `openWindow` callback to Taskbar for the clock popover's "Open Calendar" button

### `src/components/os/Taskbar.tsx`
- Add calendar to `allApps`: `CalendarDays` icon, label "Calendar"
- Accept `onOpenApp` prop usage from clock popover

### `src/components/os/DesktopIcons.tsx`
- Add calendar icon entry

### `src/components/os/terminal/commands.ts`
- Add `calendar` to `APP_MAP`

### `src/hooks/useWindowManager.ts`
- Add default size for calendar: 700x520

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/os/PrimeCalendarApp.tsx` | Create -- dual solar/lunar calendar app |
| `src/components/os/Taskbar.tsx` | Edit -- clock popover with mini calendar |
| `src/hooks/useNotifications.ts` | Edit -- context-aware notification triggers |
| `src/components/os/NotificationSystem.tsx` | Edit -- auto-dismiss with progress bar |
| `src/components/os/Desktop.tsx` | Edit -- wire calendar app, pass app context to notifications |
| `src/types/os.ts` | Edit -- add 'calendar' to AppType |
| `src/components/os/DesktopIcons.tsx` | Edit -- add calendar icon |
| `src/components/os/terminal/commands.ts` | Edit -- add calendar to APP_MAP |
| `src/hooks/useWindowManager.ts` | Edit -- add calendar default size |

## Technical Notes

- Moon phase uses the synodic period algorithm: `daysSinceKnownNewMoon % 29.53` to determine the current phase (0-7 index).
- `date-fns` handles month navigation (`addMonths`, `startOfMonth`, `eachDayOfInterval`, `format`).
- No new dependencies needed.
- The notification rework is backward-compatible with Settings -- the events list and toggle UI stays the same, just the trigger mechanism changes.
- Auto-dismiss uses `setTimeout` per notification in `NotificationSystem`, cleaned up on unmount or manual dismiss.
