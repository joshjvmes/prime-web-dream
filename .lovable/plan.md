
# PRIME OS: Games, Waitlist, Cloud Persistence & Real-Time Chat

## Overview

Four major upgrades: embedded mini-games, a database-backed pre-signup waitlist on the landing page, persistent cloud storage for user data, and real-time multiplayer chat between actual users.

---

## 1. Mini-Games (PrimeArcade)

A new app containing two themed games playable inside OS windows.

**New file: `src/components/os/PrimeArcadeApp.tsx`**

### Game 1: Lattice Minesweeper
- Classic minesweeper reskinned with PRIME OS lore
- "Mines" are "singularities" in the lattice grid
- Numbers show nearby singularity count
- Click to reveal, right-click to flag
- Grid sizes: 8x8 (Easy), 12x12 (Medium), 16x16 (Hard)
- Win/loss tracking saved to localStorage
- Timer and singularity counter

### Game 2: Qutrit Snake
- Snake game on a grid where the snake collects "qutrits" (colored gems in 3 states)
- Arrow key controls, growing snake, game-over on self-collision or wall
- Score display with high-score persistence
- Speed increases as snake grows
- Themed with geometric visuals

**UI:** Tab interface to switch between games within the arcade window.

---

## 2. Pre-Signup Waitlist (Landing Page)

Add an email capture section to the landing page backed by a real database table.

### Database
- New table: `waitlist` with columns: `id` (uuid), `email` (text, unique), `name` (text, nullable), `created_at` (timestamptz)
- RLS: allow anonymous inserts (for public signup), block reads/updates/deletes
- A database function `get_waitlist_count()` returns the total count (no email exposure)

### Landing Page Updates (`src/pages/LandingPage.tsx`)
- New section before the CTA: "Join the Waitlist"
- Email input + optional name field + "Reserve Your Node" submit button
- On submit: insert into waitlist table, show success animation
- Live counter: "X operators have joined" using the count function
- Duplicate email handling: friendly "You're already on the list!" message
- Styled to match the existing geometric/dark aesthetic

---

## 3. Persistent Cloud Storage

Save user files, notes, settings, and app data to the database so everything persists across sessions and devices (requires Google sign-in).

### Database
- New table: `user_data` with columns: `id` (uuid), `user_id` (uuid, references auth.users), `key` (text), `value` (jsonb), `updated_at` (timestamptz)
- Composite unique constraint on `(user_id, key)`
- RLS: users can only read/write their own rows

### New hook: `src/hooks/useCloudStorage.ts`
- `save(key, value)` -- upserts to `user_data`
- `load(key)` -- reads from `user_data`
- `loadAll()` -- gets all keys for current user
- Falls back to localStorage when not signed in
- Auto-syncs on sign-in: merges localStorage data into cloud

### Integration points
- **Quick Notes widget**: save/load notes from cloud
- **PrimeBoard**: persist kanban boards
- **Settings**: sync preferences (wallpaper, PIN, widget positions)
- **PrimeArcade**: sync high scores
- Cloud sync indicator in the taskbar (shows sync status icon)

---

## 4. Real-Time Multiplayer Chat

Transform PrimeChat from simulated auto-responses into a real multi-user chat system.

### Database
- New table: `chat_messages` with columns: `id` (uuid), `channel` (text), `user_id` (uuid), `username` (text), `content` (text), `created_at` (timestamptz)
- RLS: authenticated users can insert and read all messages
- Enable realtime on `chat_messages`
- New table: `chat_presence` with columns: `id` (uuid), `user_id` (uuid), `username` (text), `channel` (text), `last_seen` (timestamptz)
- RLS: authenticated users can manage their own presence, read all

### Rewrite: `src/components/os/PrimeChatApp.tsx`
- When signed in: connects to real database channels via Supabase Realtime
- Messages stream in live from all connected users
- Channel list: #general, #primenet-ops, #lattice-sec, #dev (same as before)
- Username comes from Google profile or Settings profile name
- Typing indicator using Supabase Realtime presence
- Message history loaded from database (last 100 per channel)
- When NOT signed in: falls back to the existing simulated auto-response mode
- Online user count per channel shown in sidebar

---

## Integration & Wiring

### `src/types/os.ts`
- Add `'arcade'` to `AppType` union

### `src/hooks/useWindowManager.ts`
- Add default size for arcade: `[700, 520]`

### `src/components/os/Desktop.tsx`
- Import `PrimeArcadeApp`, add to `renderApp`

### `src/components/os/Taskbar.tsx`
- Add arcade to `allApps` list with Gamepad2 icon

### `src/components/os/DesktopIcons.tsx`
- Add arcade under the Media category

### `src/components/os/GlobalSearch.tsx`
- Add arcade to the search list

### `src/components/os/terminal/commands.ts`
- Add `arcade` / `games` to APP_MAP

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/os/PrimeArcadeApp.tsx` | Create -- minesweeper + snake games |
| `src/hooks/useCloudStorage.ts` | Create -- cloud persistence hook |
| `src/pages/LandingPage.tsx` | Edit -- add waitlist section with email capture |
| `src/components/os/PrimeChatApp.tsx` | Rewrite -- real-time multiplayer chat |
| `src/components/os/Desktop.tsx` | Edit -- wire arcade app |
| `src/components/os/Taskbar.tsx` | Edit -- add arcade to app list |
| `src/components/os/DesktopIcons.tsx` | Edit -- add arcade icon |
| `src/components/os/GlobalSearch.tsx` | Edit -- add arcade to search |
| `src/components/os/DesktopWidgets.tsx` | Edit -- use cloud storage for notes |
| `src/types/os.ts` | Edit -- add 'arcade' to AppType |
| `src/hooks/useWindowManager.ts` | Edit -- add arcade window size |
| `src/components/os/terminal/commands.ts` | Edit -- add arcade to APP_MAP |

### Database Migrations
- `waitlist` table (public inserts, no reads)
- `user_data` table (per-user CRUD with RLS)
- `chat_messages` table (authenticated insert/read, realtime enabled)
- `chat_presence` table (presence tracking)
- `get_waitlist_count()` function

---

## Technical Notes

- **Waitlist** uses anonymous inserts with RLS -- no auth required to sign up, but emails are never exposed via the API
- **Cloud storage** gracefully degrades to localStorage for guest users, syncs up when they sign in
- **Real-time chat** uses Supabase Realtime postgres_changes for message streaming and presence channels for typing indicators
- **Games** are purely client-side with optional cloud high-score sync
- All new tables include proper RLS policies scoped to authenticated users (except waitlist which allows anon inserts)
