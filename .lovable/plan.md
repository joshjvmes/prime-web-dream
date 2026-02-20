

# PRIME OS: User Profiles & Admin Management

## Overview

Authentication already works (Google OAuth on the lock screen). This upgrade adds database-backed user profiles, a roles system, and an Admin Console app for managing users, viewing system analytics, and moderating content.

---

## 1. User Profiles Table

Store persistent user data in the database so identity carries across sessions and devices.

### Database Migration

**Table: `profiles`**
- `id` (uuid, PK, default gen_random_uuid())
- `user_id` (uuid, unique, not null) -- references auth.users
- `display_name` (text, nullable)
- `avatar_url` (text, nullable)
- `title` (text, default 'Operator')
- `bio` (text, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

**RLS policies:**
- Users can SELECT their own profile
- Users can UPDATE their own profile
- Users can INSERT their own profile
- All authenticated users can SELECT any profile (needed for chat usernames, presence)

**Trigger:** Auto-create a profile row when a user signs up (via `auth.users` insert trigger using a security definer function).

**Table: `user_roles`** (following the security guidelines)
- `id` (uuid, PK, default gen_random_uuid())
- `user_id` (uuid, not null, references auth.users ON DELETE CASCADE)
- `role` (app_role enum: 'admin', 'moderator', 'user')
- Unique constraint on (user_id, role)

**RLS policies:**
- All authenticated users can SELECT roles (so the app can check permissions)
- Only admins can INSERT/UPDATE/DELETE (enforced via `has_role` security definer function)

**Security definer functions:**
- `has_role(uuid, app_role)` -- checks if a user has a specific role
- `handle_new_user()` -- trigger function that creates a profile row on signup

---

## 2. Settings Profile Panel Enhancement

### Update: `src/components/os/SettingsApp.tsx`
- The existing "Profile" panel currently uses localStorage only
- Upgrade to read/write from the `profiles` table when signed in
- Fields: Display Name, Title, Bio, Avatar (read from Google, non-editable)
- Show account info: email, sign-in provider, member since date
- Show assigned roles as badges (admin, moderator, user)
- Falls back to localStorage for guest users (unchanged behavior)

---

## 3. Admin Console App

A new OS app only accessible to users with the `admin` role, providing user management, waitlist viewing, and system analytics.

### New file: `src/components/os/AdminConsoleApp.tsx`

**Sections (tab layout):**

#### Users Tab
- Table listing all profiles: display name, email (from profile), role badges, join date
- Search/filter users by name or email
- Assign/remove roles (admin, moderator, user) via dropdown
- Role changes call a secure edge function (not client-side RLS manipulation)

#### Waitlist Tab
- View all waitlist signups (email, name, date)
- Export as CSV
- Approve/remove entries
- Total count display

#### Chat Moderation Tab
- View recent chat messages across all channels
- Delete inappropriate messages (requires a new DELETE policy for admins)
- View message count per channel

#### System Stats Tab
- Total registered users count
- Waitlist count
- Total files stored (count + total size)
- Chat messages count
- Active users (signed in within last 24h based on profiles.updated_at)

### New edge function: `supabase/functions/admin-actions/index.ts`
- Verifies the calling user has the `admin` role via service role key
- Endpoints:
  - `GET /users` -- list all profiles with emails (joins auth.users)
  - `POST /assign-role` -- assign a role to a user
  - `POST /remove-role` -- remove a role from a user
  - `GET /waitlist` -- list all waitlist entries
  - `DELETE /waitlist/:id` -- remove a waitlist entry
  - `DELETE /chat-message/:id` -- delete a chat message
  - `GET /stats` -- aggregate system statistics
- Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for admin operations
- Always validates the requesting user's admin role first

---

## 4. OS Wiring

### `src/types/os.ts`
- Add `'admin'` to the `AppType` union

### `src/hooks/useWindowManager.ts`
- Add default window size for admin: `[900, 600]`

### `src/components/os/Desktop.tsx`
- Import and render `AdminConsoleApp`
- Pass `user` prop to AdminConsoleApp
- Update auth state handler to also fetch and cache the user's profile from the `profiles` table
- Store profile in state so it can be passed to Settings, Taskbar, etc.

### `src/components/os/Taskbar.tsx`
- Add Admin Console to allApps list with `ShieldCheck` icon
- Only show it if the current user has the `admin` role (check via a lightweight state flag)

### `src/components/os/DesktopIcons.tsx`
- Add Admin Console under System category (conditionally visible for admins)

### `src/components/os/GlobalSearch.tsx`
- Add admin to search results (conditionally for admins)

### `src/components/os/terminal/commands.ts`
- Add `admin` to APP_MAP

---

## 5. First Admin Seeding

Since there are no admins yet, the migration will include an instruction comment. After the first user signs in, their `user_id` can be manually inserted into `user_roles` via the database SQL runner to bootstrap the first admin. The edge function and Admin Console handle all subsequent role assignments.

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/os/AdminConsoleApp.tsx` | Create -- admin dashboard with users, waitlist, moderation, stats |
| `supabase/functions/admin-actions/index.ts` | Create -- secure admin edge function |
| `src/components/os/SettingsApp.tsx` | Edit -- profile reads/writes from database |
| `src/components/os/Desktop.tsx` | Edit -- wire admin app, profile state |
| `src/components/os/Taskbar.tsx` | Edit -- conditional admin icon |
| `src/components/os/DesktopIcons.tsx` | Edit -- conditional admin icon |
| `src/components/os/GlobalSearch.tsx` | Edit -- add admin to search |
| `src/types/os.ts` | Edit -- add 'admin' to AppType |
| `src/hooks/useWindowManager.ts` | Edit -- admin window size |
| `src/components/os/terminal/commands.ts` | Edit -- add admin to APP_MAP |

### Database Changes
- `profiles` table with auto-creation trigger
- `user_roles` table with `app_role` enum
- `has_role()` security definer function
- `handle_new_user()` trigger function
- Updated `chat_messages` DELETE policy for admins
- Enable Realtime on `profiles`

### Edge Functions
- `admin-actions` -- secure admin operations endpoint

---

## Technical Notes

- **Role checks are server-side only.** The `has_role()` function runs as security definer. The admin edge function uses the service role key to verify the caller's role before performing any action. Client-side role display is for UX convenience only -- all mutations are protected server-side.
- **Profile auto-creation** uses a trigger on `auth.users` insert, so every Google sign-in automatically gets a profile row populated with their Google name and avatar.
- **Admin bootstrapping** requires one manual SQL insert for the first admin. After that, admins can manage roles through the UI.
- **Waitlist admin access** uses the edge function (service role) since the `waitlist` table has no SELECT policy for regular users.
- **Chat moderation** adds a DELETE policy on `chat_messages` gated by `has_role(auth.uid(), 'admin')`.
