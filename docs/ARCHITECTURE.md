# System Architecture

## Route Structure

```
/          → LandingPage  (marketing page with waitlist)
/os        → Index        (the OS desktop environment)
*          → NotFound     (404)
```

**Entry point:** `src/App.tsx` wraps everything in `QueryClientProvider`, `TooltipProvider`, `Toaster`, and `BrowserRouter`.

---

## Core Flow

```
App.tsx
├── LandingPage.tsx        — Public landing page with waitlist form
└── Index.tsx (route: /os)
    └── Desktop.tsx        — The full OS environment
        ├── LockScreen     — Auth gate (sign-in / sign-up)
        ├── BootSequence   — Animated boot sequence on first load
        └── Desktop UI
            ├── DesktopIcons       — App launcher grid
            ├── DesktopWidgets     — Clock, stats, notes, network, RokCat
            ├── DesktopContextMenu — Right-click context menu
            ├── Taskbar            — Bottom bar with open windows, workspaces
            ├── OSWindow[]         — Windowed app instances
            ├── GlobalSearch       — Ctrl+K search overlay
            ├── NotificationSystem — Toast notifications
            ├── ClipboardManager   — Ctrl+Shift+V clipboard
            ├── WorkspaceSwitcher  — 4-workspace system
            └── VoiceControlIndicator — Microphone status
```

---

## Window Manager (`useWindowManager`)

Located at `src/hooks/useWindowManager.ts`. Manages all windowed application state.

### State

Each window is a `WindowState` object:

```typescript
interface WindowState {
  id: string;           // Unique ID (e.g., "terminal-1719000000")
  title: string;        // Window title bar text
  app: AppType;         // App type key (see APPS.md)
  x, y: number;         // Position
  width, height: number;// Size
  isMinimized: boolean;
  isMaximized: boolean;
  isFocused: boolean;
  zIndex: number;       // Stacking order
  workspace: number;    // 1-4
  prevBounds?: {...};   // Saved bounds for restore after maximize
}
```

### Operations

| Method | Description |
|---|---|
| `openWindow(app, title)` | Opens or focuses an app. One instance per AppType. |
| `closeWindow(id)` | Removes window from state |
| `minimizeWindow(id)` | Hides to taskbar |
| `focusWindow(id)` | Brings to front, un-minimizes |
| `maximizeWindow(id)` | Toggles fullscreen (saves previous bounds) |
| `moveWindow(id, x, y)` | Drag positioning |
| `resizeWindow(id, w, h)` | Resize from edges |
| `snapWindow(id, 'left'/'right')` | Snap to half screen |
| `tileAllWindows()` | Grid-tile all visible windows |
| `cascadeWindows()` | Cascade with 30px offset |
| `switchWorkspace(ws)` | Switch active workspace (1-4) |
| `moveWindowToWorkspace(id, ws)` | Move window to another workspace |

### App Sizes

Each `AppType` has a default size defined in `getSize()`. Examples:
- Terminal: 700×450
- Browser: 850×550
- Admin Console: 900×600
- Default: 600×420

---

## EventBus

Located at `src/hooks/useEventBus.ts`. A singleton pub/sub system for cross-app communication.

### Usage

```typescript
import { eventBus } from '@/hooks/useEventBus';

// Subscribe
eventBus.on('app.opened', (payload) => { ... });

// Publish
eventBus.emit('app.opened', { app: 'terminal' });

// Unsubscribe
eventBus.off('app.opened', handler);
```

### Event Types

| Event | Payload | Used By |
|---|---|---|
| `app.opened` | `{ app }` | ActivityTracker, Desktop |
| `app.closed` | `{ app }` | ActivityTracker |
| `calendar.event.starting` | `{ title, id }` | CalendarReminders |
| `notification.received` | notification data | NotificationSystem |
| `user.signed-in` | user data | Desktop |
| `user.signed-out` | — | Desktop |
| `file.uploaded` | `{ name }` | FilesApp, ActivityTracker |
| `file.deleted` | `{ name }` | FilesApp, ActivityTracker |
| `timer.fired` | timer data | CalendarReminders |
| `clipboard.copied` | copied text | ClipboardManager |
| `social.post.created` | post data | PrimeSocialApp |
| `mail.received` | `{ from }` | PrimeMailApp |
| `agent.action.logged` | `{ tool }` | PrimeAgentApp |
| `wallet.transfer` | `{ amount, token_type }` | PrimeWalletApp |
| `trade.executed` | `{ symbol, action, quantity }` | PrimeVaultApp |
| `bet.placed` | `{ market, side, amount }` | PrimeBetsApp |
| `booking.created` | `{ resource }` | PrimeBookingApp |
| `booking.cancelled` | `{ resource }` | PrimeBookingApp |
| `audio.control` | `{ action }` | PrimeAudioApp |
| `market.checked` | — | PrimeSignalsApp |
| `canvas.draw` | draw data | PrimeCanvasApp |
| `canvas.clear` | — | PrimeCanvasApp |
| `canvas.add-layer` | layer data | PrimeCanvasApp |
| `spreadsheet.create` | `{ name }` | PrimeGridApp |
| `spreadsheet.update` | update data | PrimeGridApp |
| `spreadsheet.chart` | chart data | PrimeGridApp |
| `widget.toggle` | `{ id, enabled }` | DesktopWidgets |
| `widget.move` | `{ id, x, y }` | DesktopWidgets |
| `widget.list` | — | DesktopWidgets |
| `widget.list.response` | widget state | Terminal |

---

## Authentication Flow

1. User navigates to `/os`
2. `LockScreen` component checks for active session via `supabase.auth.getSession()`
3. If no session → show sign-in / sign-up form (Lovable Cloud Auth)
4. On successful auth → `BootSequence` plays animated boot
5. After boot → Desktop renders with full app access
6. Session persists via `localStorage` (`supabase.auth` with `persistSession: true`)
7. Idle timeout (`useIdleTimeout`) can auto-lock after configurable inactivity
8. `user.signed-in` / `user.signed-out` events fire on auth state changes

---

## Mobile vs Desktop

Detected by `useDeviceClass()` hook:

| Breakpoint | Device Class | Rendering |
|---|---|---|
| ≤ 767px | `mobile` | `MobileLauncher` → `MobileAppView` |
| 768–1024px | `tablet` | `MobileLauncher` → `MobileAppView` |
| > 1024px | `desktop` | Full windowed Desktop with Taskbar |

- **Mobile/Tablet:** Apps render fullscreen in `MobileAppView` with a back button. No windowing, no drag/resize.
- **Desktop:** Full windowed environment with taskbar, drag, resize, snap, workspaces.
