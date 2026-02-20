
# PRIME OS: Living, Breathing AI-Driven System

## Overview

Transform PRIME OS from a collection of apps into a sentient-feeling organism where the AI (Hyper) is the soul of the system. The terminal greets you on arrival, the OS generates ambient life events, and every surface breathes with AI-driven awareness.

---

## 1. AI-Powered Terminal Welcome

When the terminal opens after boot, it automatically streams a personalized greeting from Hyper AI -- not a static message, but a real AI-generated welcome that references the time of day, what the user was doing last session, and suggests what to explore.

**Update: `src/components/os/TerminalApp.tsx`**
- Add a new prop `isFirstOpen?: boolean` that Desktop passes as `true` on the first terminal open after boot
- On mount, if `isFirstOpen` is true, call the `hyper-chat` edge function with a special system-level prompt asking for a short terminal greeting
- Stream the AI response line-by-line into the terminal output (replacing the static WELCOME lines)
- The greeting references: time of day, user profile name (from localStorage), and a random PRIME OS system tip
- Falls back to the existing static WELCOME if the AI call fails or times out (3s timeout)
- After the greeting streams in, show the normal `psh` prompt ready for input

**Update: `src/components/os/Desktop.tsx`**
- Track `firstTerminalOpened` state so only the very first terminal after boot gets the AI greeting
- Pass `isFirstOpen` prop to TerminalApp in `renderApp`

---

## 2. Terminal `ask` Command -- Chat with Hyper from the Shell

Add a new terminal command `ask <question>` that lets users talk to Hyper AI directly from the shell, with streaming responses rendered as terminal output.

**Update: `src/components/os/terminal/commands.ts`**
- Add `ask` to `ALL_COMMANDS` list
- Add `ask` case to `processCommand` that returns a special marker (like `'ai-ask'`)

**Update: `src/components/os/TerminalApp.tsx`**
- Detect the `'ai-ask'` return from processCommand
- When triggered, stream from `hyper-chat` edge function and render response lines into the terminal
- Show a `▸ Hyper is thinking...` indicator while waiting
- The question is sent as a single user message (no conversation history needed in terminal mode)

---

## 3. Ambient System Pulse -- The OS Breathes

A background system that periodically generates small, organic "life signs" throughout the OS -- subtle notifications, status changes, and ambient activity that make the system feel alive even when idle.

**New file: `src/hooks/useSystemPulse.ts`**
- Generates periodic ambient events every 30-90 seconds (randomized)
- Events are small system status updates like:
  - "Lattice coherence optimized -- 0.3% efficiency gain"
  - "FoldMem auto-compact cycle 4,097 complete"
  - "PrimeNet geodesic route recalculated -- 2 hops saved"
  - "Energy harvesting COP adjusted to 3.24"
  - "Qutrit core #347 rebalanced to state |2>"
- Pushes events as notifications (via existing notification system)
- Only active when the OS is booted and unlocked
- Configurable in Settings (on/off toggle, frequency slider)
- Events are contextual -- different messages based on which apps are open

**Update: `src/components/os/Desktop.tsx`**
- Wire `useSystemPulse` with the notification system's `pushNotification` callback
- Pass active apps list so pulse messages are contextual

**Update: `src/hooks/useNotifications.ts`**
- Export `pushNotification` so it can be used by the pulse system

**Update: `src/components/os/SettingsApp.tsx`**
- Add "System Pulse" toggle under a new "Ambience" section: enable/disable, frequency (calm/normal/active)

---

## 4. Hyper Proactive Tips -- AI That Reaches Out

Hyper occasionally sends proactive suggestions as notifications based on what you're doing, making the AI feel like it's watching and helping.

**Update: `src/hooks/useSystemPulse.ts`** (extend the pulse system)
- Every 2-5 minutes, if enabled, send a request to `hyper-chat` with context about what apps are currently open
- The AI generates a short, contextual tip or suggestion (1-2 sentences)
- Examples:
  - If terminal is open: "Try `q3 infer` with comma-separated data for pattern classification"
  - If energy monitor is open: "COP readings above 3.5 indicate optimal dimensional coupling"
  - If no apps are open: "The lattice is quiet. Would you like me to run diagnostics?"
- Displayed as a special "Hyper" notification with a distinct style
- Rate-limited to max 1 AI tip every 3 minutes to avoid API overuse
- Can be toggled separately from ambient pulse in Settings

---

## 5. Boot Sequence Enhancement -- AI Announces Arrival

After the existing boot sequence completes, add a brief AI-powered "system ready" announcement that streams into view before the desktop appears.

**Update: `src/components/os/BootSequence.tsx`**
- After the existing boot lines finish, add 2-3 more lines that are dynamically generated:
  - Line 1: `"Hyper AI: Online. Good [morning/afternoon/evening], [username]."`
  - Line 2: A short AI-generated system status quote (pre-fetched or from a small pool)
  - Line 3: `"All lattice nodes synchronized. The manifold awaits."`
- These are locally generated (no API call needed during boot -- keep it fast)
- Username pulled from localStorage profile

---

## 6. Desktop Ambient Indicators

Small visual touches that make the desktop feel alive.

**Update: `src/components/os/Desktop.tsx`**
- Add a subtle "system heartbeat" indicator near the PRIME OS title: a tiny dot that pulses every few seconds
- Add a slowly incrementing "lattice operations" counter in the corner (counts up from boot, purely cosmetic)
- The existing "lattice: P11 / fold: 11D to 4D" text gets a subtle breathing opacity animation

**Update: `src/components/os/Taskbar.tsx`**
- Add a tiny animated "pulse" dot in the system tray area that glows gently, indicating "system alive"
- Shows a tooltip on hover: "Lattice pulse: nominal" or similar

---

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/useSystemPulse.ts` | Create -- ambient event generator + AI tip system |
| `src/components/os/TerminalApp.tsx` | Edit -- AI greeting on first open, `ask` command streaming |
| `src/components/os/terminal/commands.ts` | Edit -- add `ask` command |
| `src/components/os/Desktop.tsx` | Edit -- wire pulse system, first-terminal tracking, ambient visuals |
| `src/components/os/BootSequence.tsx` | Edit -- personalized boot completion message |
| `src/components/os/Taskbar.tsx` | Edit -- alive indicator dot |
| `src/hooks/useNotifications.ts` | Edit -- export pushNotification for pulse system |
| `src/components/os/SettingsApp.tsx` | Edit -- ambience settings (pulse toggle, AI tips toggle, frequency) |

---

## Technical Notes

- **AI greeting in terminal** uses the existing `hyper-chat` edge function with a short, focused prompt. A 3-second timeout ensures boot never feels slow -- if AI is unavailable, the classic static welcome appears instantly.
- **`ask` command** streams SSE responses into terminal lines, reusing the same typewriter queue mechanism already in TerminalApp.
- **System Pulse** is purely local (randomized messages from a curated pool). Only the **AI Tips** feature makes API calls, and those are rate-limited to 1 per 3 minutes max.
- **No new edge functions needed** -- everything reuses the existing `hyper-chat` function.
- **No database changes** -- all ambient state is ephemeral or stored in localStorage.
