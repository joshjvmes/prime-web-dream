

# PRIME OS: Next-Level Upgrade

## Overview

Five major system upgrades to transform PRIME OS from a polished simulation into a truly intelligent, immersive operating system experience.

---

## 1. Real AI Integration (Hyper AI powered by Lovable AI)

Replace the keyword-matching chatbot in HypersphereApp with actual AI responses streamed from the Lovable AI Gateway. Hyper becomes a real conversational AI with full PRIME OS personality.

**New edge function: `supabase/functions/hyper-chat/index.ts`**
- Accepts conversation messages, prepends a PRIME OS system prompt
- Streams responses via SSE from the Lovable AI Gateway (`google/gemini-3-flash-preview`)
- Handles 429/402 rate limit errors gracefully

**Update: `src/components/os/HypersphereApp.tsx`**
- Replace `getResponse()` keyword matcher with real streaming AI call
- Token-by-token rendering as the AI responds
- Keep the animated hypersphere visualization (spins faster while thinking)
- Retain quick action buttons but make them send real prompts
- System prompt gives Hyper the personality of a geometric computing AI assistant with deep knowledge of PRIME OS systems

**Update: `supabase/config.toml`**
- Add `hyper-chat` function entry with `verify_jwt = false`

---

## 2. Lock Screen

A proper lock screen that appears before the boot sequence, requiring the user to "unlock" the system.

**New component: `src/components/os/LockScreen.tsx`**
- Full-screen overlay with animated PRIME OS branding
- Shows current time, date, and moon phase (reuse existing helpers)
- "Slide to unlock" or click-to-unlock interaction
- Optional PIN input (stored in localStorage alongside profile)
- Smooth transition from lock screen into boot sequence
- Wallpaper support (2-3 built-in geometric wallpapers to choose from, saved in Settings)

**Update: `src/components/os/Desktop.tsx`**
- Add `locked` state before `booted` state
- Flow: Lock Screen -> Boot Sequence -> Desktop

**Update: `src/components/os/SettingsApp.tsx`**
- Add "Lock & Security" panel: enable/disable lock PIN, set PIN, choose wallpaper
- Add keyboard shortcut `Ctrl+L` to lock the screen

---

## 3. Desktop Widgets

Live interactive widgets that float on the desktop surface, providing at-a-glance system information.

**New component: `src/components/os/DesktopWidgets.tsx`**
- Widget container system that renders draggable widget cards on the desktop
- Widget state (positions, enabled/disabled) persisted in localStorage

**Built-in widgets:**
- **Clock Widget**: Large digital clock with date and moon phase
- **System Stats Widget**: Live CPU/memory/energy bars with simulated data
- **Quick Notes Widget**: Small editable sticky note (saved to localStorage)
- **Network Status Widget**: Mini PrimeNet health indicator

**Update: `src/components/os/Desktop.tsx`**
- Render widgets layer between desktop background and windows

**Update: `src/components/os/SettingsApp.tsx`**
- Add "Widgets" panel to toggle individual widgets on/off

---

## 4. Virtual Workspaces

Multiple desktop workspaces that you can switch between, each with its own set of open windows.

**Update: `src/hooks/useWindowManager.ts`**
- Add `workspace` property to `WindowState` (number 1-4)
- Add `activeWorkspace` state
- `switchWorkspace(n)` function filters visible windows by workspace
- Opening a window assigns it to the current workspace
- Moving windows between workspaces via right-click context menu

**New component: `src/components/os/WorkspaceSwitcher.tsx`**
- Small workspace indicator in the taskbar (4 numbered dots/squares)
- Click to switch; active workspace is highlighted
- Shows miniature window count per workspace
- Keyboard shortcuts: `Ctrl+1` through `Ctrl+4` to switch workspaces

**Update: `src/components/os/Desktop.tsx`**
- Filter rendered windows by active workspace
- Add workspace keyboard shortcuts

**Update: `src/components/os/Taskbar.tsx`**
- Embed WorkspaceSwitcher component between search button and window list

---

## 5. Global Search & Desktop Icons Fixes

**Update: `src/components/os/GlobalSearch.tsx`**
- Sync the `allApps` list to include all 35+ apps (currently only lists 19)
- Add all missing apps: calendar, docs, spreadsheet, schemaforge, canvas, comm, maps, pkg, audio, bets, signals, stream, vault, videocall, mail, social, agent, robotics, booking, iot

**Update: `src/components/os/DesktopIcons.tsx`**
- Replace single-column overflow layout with a categorized grid or app drawer
- Group icons into categories: Core, Network, AI, Productivity, Control, Media
- Collapsed by default with category headers; fits within the visible desktop area
- Or: show only pinned/favorite icons on desktop, full list in PRIME menu

---

## Technical Details

### Edge Function (hyper-chat)

```text
supabase/functions/hyper-chat/index.ts
- CORS headers
- System prompt: "You are Hyper, the AI assistant of PRIME OS..."
- POST body: { messages: [...] }
- Streams response from ai.gateway.lovable.dev
- Returns SSE stream to client
```

### New Files

| File | Purpose |
|------|---------|
| `supabase/functions/hyper-chat/index.ts` | AI chat edge function |
| `src/components/os/LockScreen.tsx` | Lock screen with time/wallpaper |
| `src/components/os/DesktopWidgets.tsx` | Widget system with 4 built-in widgets |
| `src/components/os/WorkspaceSwitcher.tsx` | Workspace indicator for taskbar |

### Modified Files

| File | Changes |
|------|---------|
| `supabase/config.toml` | Add hyper-chat function |
| `src/components/os/HypersphereApp.tsx` | Real AI streaming integration |
| `src/components/os/Desktop.tsx` | Lock state, widgets layer, workspace filtering, new shortcuts |
| `src/components/os/Taskbar.tsx` | Workspace switcher, lock button |
| `src/components/os/SettingsApp.tsx` | Lock/Security panel, Widgets panel, wallpaper picker |
| `src/components/os/GlobalSearch.tsx` | Add all 35+ apps |
| `src/components/os/DesktopIcons.tsx` | Categorized grid layout |
| `src/hooks/useWindowManager.ts` | Workspace support in window state |
| `src/types/os.ts` | Add workspace field to WindowState |

