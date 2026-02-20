

# PRIME OS: Real-World Workflow Engine

## Overview

Four major real-utility upgrades: global keyboard shortcuts with a clipboard manager, persistent calendar events with timed reminders, real file upload/download backed by cloud storage, and a live workflow automation engine connecting apps together.

---

## 1. Global Keyboard Shortcuts + Clipboard Manager

A system-wide hotkey layer and a clipboard history panel, like macOS Spotlight + clipboard managers.

### New hook: `src/hooks/useGlobalShortcuts.ts`
- Registers document-level keydown listener
- Shortcut map:
  - `Ctrl+K` -- Global Search (already exists, formalize)
  - `Ctrl+L` -- Lock screen
  - `Ctrl+\`` -- Open terminal
  - `Ctrl+Shift+A` -- Open PrimeAgent
  - `Alt+1..9` -- Switch workspace
  - `Alt+Tab` -- Cycle focus to next window
  - `Alt+Shift+Tab` -- Cycle focus backwards
  - `Alt+F4` -- Close focused window
  - `Ctrl+Shift+V` -- Open clipboard manager
  - `Ctrl+M` -- Minimize focused window
  - `Ctrl+Shift+M` -- Maximize/restore focused window
- Accepts callbacks map from Desktop so shortcuts trigger real actions
- Only active when booted and unlocked

### New component: `src/components/os/ClipboardManager.tsx`
- Slide-out panel (triggered by `Ctrl+Shift+V` or taskbar icon)
- Maintains history of last 20 copied text items (uses `document.addEventListener('copy')`)
- Click any item to copy it back to clipboard
- Pin items to keep them permanently
- Clear all button
- Persisted to localStorage (and cloud storage if signed in)
- Search/filter within clipboard history

### Updates
- **Desktop.tsx**: Wire `useGlobalShortcuts` with all system callbacks
- **Taskbar.tsx**: Add clipboard icon in system tray area
- **SettingsApp.tsx**: Add "Shortcuts" panel showing all hotkeys in a reference table

---

## 2. Persistent Calendar Events + Reminders

Transform the calendar from a display-only moon-phase viewer into a real event management system with database-backed persistence and timed notification reminders.

### Database
- New table: `calendar_events`
  - `id` (uuid, PK, default gen_random_uuid())
  - `user_id` (uuid, not null)
  - `title` (text, not null)
  - `description` (text, nullable)
  - `start_time` (timestamptz, not null)
  - `end_time` (timestamptz, nullable)
  - `color` (text, default '#8b5cf6')
  - `reminder_minutes` (integer, nullable) -- e.g. 5, 15, 30 minutes before
  - `recurring` (text, nullable) -- 'daily', 'weekly', 'monthly', or null
  - `created_at` (timestamptz, default now())
- RLS: users can only CRUD their own events
- Enable Realtime so events sync across tabs

### Update: `src/components/os/PrimeCalendarApp.tsx`
- Add event CRUD:
  - Click a day to create an event (modal with title, time, color picker, reminder dropdown)
  - Click an event to edit/delete it
  - Events shown as colored dots/bars on calendar days
  - Day detail panel listing events for selected day
- Load events from database (for signed-in users) or localStorage (guests)
- Recurring event support: auto-generate visible instances for daily/weekly/monthly

### New hook: `src/hooks/useCalendarReminders.ts`
- Polls or checks every 30 seconds for upcoming events with reminders
- When an event's reminder time is reached, pushes a notification via `pushNotification`
- Notification includes event title and "starts in X minutes"
- Clicking the notification opens the calendar app to that day
- Only active for signed-in users with cloud events

### Updates
- **Desktop.tsx**: Wire `useCalendarReminders` with notification system and `openWindow` callback
- **Taskbar.tsx**: Show a small dot on the calendar popover if there are events today

---

## 3. File Upload/Download with Real Cloud Storage

Give the Files app real file management -- upload files from the user's computer, store them in cloud storage, and download them back.

### Database / Storage
- New storage bucket: `user-files` (private)
- RLS policies on `storage.objects`:
  - Authenticated users can upload to their own folder (`user_id/`)
  - Authenticated users can read/download their own files
  - Authenticated users can delete their own files
- New table: `file_metadata`
  - `id` (uuid, PK)
  - `user_id` (uuid, not null)
  - `file_name` (text, not null)
  - `file_path` (text, not null) -- storage path
  - `file_size` (bigint, not null)
  - `mime_type` (text, nullable)
  - `folder` (text, default '/') -- virtual folder path
  - `created_at` (timestamptz, default now())
- RLS: users can only CRUD their own metadata

### Update: `src/components/os/FilesApp.tsx`
- Add "Upload" button in the toolbar
  - Opens native file picker (accept any file type)
  - Uploads to Supabase Storage under `user-files/{user_id}/{folder}/{filename}`
  - Creates corresponding `file_metadata` row
  - Shows upload progress bar
- Add "Download" button for selected files
  - Creates signed URL from Supabase Storage, triggers browser download
- Add "Delete" for uploaded files (removes from storage + metadata)
- Display real uploaded files alongside the existing simulated manifold files
  - Visual distinction: real files show actual size, type icon, upload date
  - Simulated files keep their existing geometric styling
- Drag-and-drop upload support (drop files onto the Files window)
- File preview: clicking an image file shows preview in a modal; clicking a text file opens it in PrimeEdit
- Guest mode: show "Sign in to upload files" prompt instead of upload button

---

## 4. Workflow Automation (Real CloudHooks)

Transform CloudHooks from a simulated dashboard into a real event-driven automation engine where users create rules that trigger actual actions across the OS.

### Architecture
Internal event bus that apps emit to and CloudHooks listens on. No external services needed -- everything runs client-side.

### New module: `src/hooks/useEventBus.ts`
- Simple pub/sub event bus using a singleton pattern
- `emit(event, payload)` -- fire an event
- `on(event, callback)` -- subscribe
- `off(event, callback)` -- unsubscribe
- Event types:
  - `app.opened` / `app.closed` -- with app name
  - `calendar.event.starting` -- with event details
  - `notification.received` -- with notification data
  - `user.signed-in` / `user.signed-out`
  - `file.uploaded` / `file.deleted`
  - `timer.fired` -- for scheduled triggers
  - `clipboard.copied` -- when text is copied
- Apps emit events at appropriate moments (FilesApp emits on upload, Calendar emits on event start, etc.)

### Update: `src/components/os/CloudHooksApp.tsx`
- Replace simulated hooks with real configurable automations
- Users can create rules with:
  - **Trigger**: Select from event bus events (dropdown)
  - **Condition**: Optional filter (e.g. "app name = terminal")
  - **Actions**: One or more actions to execute:
    - Open an app
    - Close an app
    - Show a notification with custom message
    - Run a terminal command
    - Copy text to clipboard
    - Lock the screen
    - Send a webhook (user provides URL, like Zapier integration)
- Hooks saved to localStorage / cloud storage
- Execution log shows real executions with timestamps
- Enable/disable toggle per hook
- Built-in templates:
  - "When a file is uploaded, show a notification"
  - "When calendar event starts, open the terminal"
  - "When user signs in, run system diagnostics"

### Integration points
- **Desktop.tsx**: Initialize event bus, emit `app.opened`/`app.closed` events
- **FilesApp.tsx**: Emit `file.uploaded`/`file.deleted`
- **PrimeCalendarApp.tsx**: Emit `calendar.event.starting`
- **LockScreen.tsx**: Emit `user.signed-in`/`user.signed-out`

---

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/useGlobalShortcuts.ts` | Create -- keyboard shortcut system |
| `src/hooks/useEventBus.ts` | Create -- pub/sub event bus for workflow automation |
| `src/hooks/useCalendarReminders.ts` | Create -- reminder notification checker |
| `src/components/os/ClipboardManager.tsx` | Create -- clipboard history panel |
| `src/components/os/PrimeCalendarApp.tsx` | Rewrite -- add event CRUD, reminders, database persistence |
| `src/components/os/FilesApp.tsx` | Edit -- add real upload/download/delete with cloud storage |
| `src/components/os/CloudHooksApp.tsx` | Rewrite -- real event-driven automation engine |
| `src/components/os/Desktop.tsx` | Edit -- wire shortcuts, event bus, calendar reminders |
| `src/components/os/Taskbar.tsx` | Edit -- clipboard icon, today-events indicator |
| `src/components/os/SettingsApp.tsx` | Edit -- shortcuts reference panel |

### Database Changes
- `calendar_events` table with RLS (user-scoped CRUD)
- `file_metadata` table with RLS (user-scoped CRUD)
- `user-files` storage bucket (private, user-scoped RLS)
- Enable Realtime on `calendar_events`

---

## Technical Notes

- **Global shortcuts** use a single `document.addEventListener('keydown')` with a Map lookup for efficiency. Modifier keys are checked via `e.ctrlKey`, `e.altKey`, `e.shiftKey`. The listener is only active when the OS is booted and unlocked to avoid conflicts with the lock screen.
- **Clipboard manager** hooks into the native `copy` event on `document` to capture text. It cannot read clipboard contents on page load (browser security), only on user-initiated copy events.
- **Event bus** is a lightweight in-memory pub/sub (no database needed). Workflow rules (hooks) are persisted to `user_data` via the existing cloud storage hook. The bus is initialized once in Desktop and passed to apps via props or a React context.
- **File storage** uses the existing Supabase Storage API. Files are namespaced under `{user_id}/` paths for isolation. The RLS policies on `storage.objects` enforce that users can only access their own files.
- **Calendar reminders** use `setInterval` checking every 30s. When the tab is in the background, browsers may throttle intervals, so reminders may fire slightly late -- this is acceptable for a web OS.
- **Webhook support** in CloudHooks uses `fetch` with `mode: 'no-cors'` for Zapier-style integrations, same pattern as the existing Zapier knowledge base.

