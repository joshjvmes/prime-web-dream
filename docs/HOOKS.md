# Custom Hooks Reference

All hooks are in `src/hooks/`.

---

## `useWindowManager`

**File:** `src/hooks/useWindowManager.ts`

Manages the windowed desktop environment — creation, focus, minimize, maximize, snap, tile, cascade, and workspace assignment for all app windows.

**Returns:**
```typescript
{
  windows: WindowState[];
  openWindow: (app: AppType, title: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, width: number, height: number) => void;
  maximizeWindow: (id: string) => void;
  snapWindow: (id: string, side: 'left' | 'right') => void;
  tileAllWindows: () => void;
  cascadeWindows: () => void;
  activeWorkspace: number;
  switchWorkspace: (ws: number) => void;
  moveWindowToWorkspace: (id: string, ws: number) => void;
  getWindowCountsByWorkspace: () => number[];
}
```

**Key behavior:** Only one instance per `AppType`. If the app is already open, it focuses and un-minimizes it.

---

## `useEventBus` (EventBus singleton)

**File:** `src/hooks/useEventBus.ts`

A class-based singleton for cross-app communication. Not a hook per se — it exports the `eventBus` instance and the `EVENT_TYPES` array.

**API:**
- `eventBus.on(event, callback)` — Subscribe
- `eventBus.off(event, callback)` — Unsubscribe
- `eventBus.emit(event, payload?)` — Publish

See [ARCHITECTURE.md](./ARCHITECTURE.md#eventbus) for the full event type list.

---

## `useCloudStorage`

**File:** `src/hooks/useCloudStorage.ts`

Dual-write persistence: saves to `localStorage` always, and to the `user_data` database table when signed in. On sign-in, syncs all `prime-cloud-*` localStorage keys to the cloud.

**Returns:**
```typescript
{
  save: (key: string, value: unknown) => Promise<void>;
  load: <T>(key: string, fallback?: T) => Promise<T | undefined>;
  isSignedIn: boolean;
}
```

**Used by:** PrimeCanvasApp, TextEditorApp, PrimeGridApp, PrimeJournalApp.

---

## `useActivityTracker`

**File:** `src/hooks/useActivityTracker.ts`

Listens to EventBus events and batches activity logs to the `user_activity` table every 3 seconds.

**Parameters:**
- `enabled: boolean` (default `true`)

**Tracked events:** `app.opened`, `app.closed`, `file.uploaded`, `file.deleted`, `trade.executed`, `wallet.transfer`, `bet.placed`, `booking.created`, `booking.cancelled`, `clipboard.copied`, `social.post.created`, `mail.received`, `agent.action.logged`, `canvas.draw`, `spreadsheet.create`, `audio.control`, `market.checked`

**Privacy:** Respects `prime-os-activity-sharing` localStorage flag. Users can disable via Settings.

---

## `useNotifications`

**File:** `src/hooks/useNotifications.ts`

Context-aware notification system with three trigger modes:

1. **On app open** (40% chance, first time only per session)
2. **Sustained use** (50% chance after 30s in an app)
3. **Idle** (when no apps are open, after 20s, max once per minute)

**Returns:**
```typescript
{
  notifications: OSNotification[];
  dismissNotification: (id: string) => void;
  pushNotification: (title: string, message: string) => void;
  events: NotificationEvent[];
  toggleEvent: (id: string) => void;
  updateEventMessage: (id: string, message: string) => void;
  addEvent: (title: string, message: string) => void;
  removeEvent: (id: string) => void;
}
```

**Persistence:** Event enabled/disabled state saved to `localStorage`.

---

## `useCalendarReminders`

**File:** `src/hooks/useCalendarReminders.ts`

Polls `calendar_events` every 30 seconds for events starting within the next 30 minutes that have `reminder_minutes` set. Fires a notification and emits `calendar.event.starting` event.

**Parameters:**
- `pushNotification: (title, message) => void`
- `openCalendar: () => void`
- `enabled: boolean`

**Dedup:** Tracks fired reminders by event ID to avoid duplicates.

---

## `useGlobalShortcuts`

**File:** `src/hooks/useGlobalShortcuts.ts`

Keyboard shortcut handler. Only active when `enabled` is true (disabled during lock screen/boot).

| Shortcut | Action |
|---|---|
| `Ctrl+K` | Open global search |
| `Ctrl+L` | Lock screen |
| `Ctrl+`` ` | Open terminal |
| `Ctrl+Shift+A` | Open PrimeAgent |
| `Ctrl+Shift+V` | Toggle clipboard manager |
| `Ctrl+W` | Close focused window |
| `Ctrl+M` | Minimize focused window |
| `Ctrl+Shift+M` | Maximize focused window |
| `Alt+1-4` | Switch workspace |
| `Ctrl+1-4` | Switch workspace (alternate) |
| `Alt+Tab` | Cycle windows forward |
| `Alt+Shift+Tab` | Cycle windows backward |
| `Alt+F4` | Close focused window |

---

## `useIdleTimeout`

**File:** `src/hooks/useIdleTimeout.ts`

Fires `onIdle` callback after `timeout` milliseconds of no user interaction. Resets on `mousemove`, `keydown`, `mousedown`, `scroll`, `touchstart`, `click`.

**Parameters:**
```typescript
{
  timeout: number;    // milliseconds
  onIdle: () => void; // callback (typically locks screen)
  enabled?: boolean;  // default true
}
```

**Returns:** `{ resetTimer: () => void }` — manually reset the timer.

---

## `useVoiceControl`

**File:** `src/hooks/useVoiceControl.ts`

Web Speech API integration for voice commands. Supports wake words "prime" and "computer".

**Recognized commands:**
- `open <app>` — Open an application
- `close <app>` — Close an application
- `lock` / `lock screen` — Lock the screen
- `search <query>` — Open global search
- `switch workspace <1-4>` — Switch workspace
- `minimize` / `maximize` — Window operations

**Returns:**
```typescript
{
  isListening: boolean;
  transcript: string;
  lastCommand: string;
  startListening: () => void;
  stopListening: () => void;
  supported: boolean; // false if browser lacks SpeechRecognition
}
```

---

## `useSystemPulse`

**File:** `src/hooks/useSystemPulse.ts`

Generates periodic ambient notifications to create a "living system" feel. Two modes:

1. **Ambient messages** — Random lore-consistent system notifications at configurable frequency
2. **AI tips** — Context-aware tips generated by Hyper AI (via `hyper-chat` edge function), rate-limited to once per 3 minutes

**Frequency settings** (saved to localStorage as `prime-os-pulse-settings`):
- `calm`: 60-120s between messages
- `normal`: 30-75s (default)
- `active`: 15-40s

**Parameters:**
- `pushNotification: (title, message) => void`
- `activeApps: AppType[]` — For context-aware messages
- `isActive: boolean`

---

## `useDeviceClass`

**File:** `src/hooks/useDeviceClass.ts`

Returns `'mobile'` (≤767px), `'tablet'` (768-1024px), or `'desktop'` (>1024px). Updates on window resize via `matchMedia` listeners.

---

## `useIntranetPages`

**File:** `src/hooks/useIntranetPages.ts`

Provides content for PrimeBrowser's intranet pages (internal sites accessible via `prime://` URLs).

---

## `useMobile`

**File:** `src/hooks/use-mobile.tsx`

Simple boolean hook returning `true` if viewport width is below 768px. Used by shadcn/ui components.
