

# PRIME OS Enhancements

## Overview
Add missing features to make PRIME OS feel more complete: an About modal, user profile/customization, two new apps (Social Media and Email), fix minimized window behavior in the taskbar, and surface keyboard shortcuts better.

---

## 1. Fix: Minimized Windows in Taskbar

**Problem:** The taskbar only shows non-minimized windows. When you minimize a window, it vanishes from the taskbar with no way to restore it.

**Fix in `src/components/os/Taskbar.tsx`:**
- Show ALL windows (not just non-minimized) in the taskbar strip
- Style minimized windows differently (dimmed/outlined instead of filled) so they're visually distinct
- Clicking a minimized window in the taskbar restores and focuses it (already handled by `focusWindow` which sets `isMinimized: false`)

---

## 2. User Profile & Customization

**Add a "Profile" panel to Settings (`src/components/os/SettingsApp.tsx`):**
- New panel with a User icon in the sidebar
- Fields: Display Name, Title/Role (e.g. "Geometric Engineer"), Avatar initials
- All persisted to localStorage alongside existing settings
- The display name appears in the taskbar greeting area and the About modal

**Changes:**
- `src/components/os/SettingsApp.tsx` -- add `profile` panel with name/title fields
- `src/components/os/Taskbar.tsx` -- show user greeting (e.g. "Operator: [Name]") near the clock

---

## 3. About PRIME OS Modal

**New component: `src/components/os/AboutModal.tsx`**
- Triggered from the PRIME menu (new "About" item at the bottom) and from Settings About panel
- Displays:
  - Rocket Logic Global logo (the SVG already in `/public/rocket-logic-silver.svg`)
  - "PRIME OS v2.0"
  - "Geometric Computing Interface"
  - "Built by Rocket Logic Global"
  - System specs summary (Qutrit Kernel, 11D Architecture, T3-649)
  - Version/build info
- Styled as a centered dialog overlay, matching the OS aesthetic

**Changes:**
- New file: `src/components/os/AboutModal.tsx`
- `src/components/os/Taskbar.tsx` -- add "About PRIME OS" button at bottom of PRIME menu
- `src/components/os/Desktop.tsx` -- wire up the about modal state

---

## 4. New App: PrimeMail (Email Client)

**New file: `src/components/os/PrimeMailApp.tsx`**
- Simulated email client with inbox, sent, drafts folders
- Pre-populated with a few themed emails (system alerts, welcome message from Rocket Logic, etc.)
- Compose view with To/Subject/Body fields
- Read view showing email content

**Integration:**
- `src/types/os.ts` -- add `'mail'` to AppType
- `src/components/os/Desktop.tsx` -- import and add to renderApp switch
- `src/components/os/Taskbar.tsx` -- add to allApps list with Mail icon
- `src/hooks/useWindowManager.ts` -- add default size for mail app

---

## 5. New App: PrimeSocial (Social Media Module)

**New file: `src/components/os/PrimeSocialApp.tsx`**
- Social feed interface with posts from "PRIME OS community"
- Pre-populated with themed posts (system updates, geometric computing discussions)
- Like/comment interactions (local state only)
- Compose new post area
- Profile sidebar showing user info from Settings

**Integration:**
- `src/types/os.ts` -- add `'social'` to AppType
- `src/components/os/Desktop.tsx` -- import and add to renderApp switch
- `src/components/os/Taskbar.tsx` -- add to allApps list with Users icon
- `src/hooks/useWindowManager.ts` -- add default size for social app

---

## 6. Keyboard Shortcuts Enhancement

**Improve discoverability in `src/components/os/SettingsApp.tsx`:**
- Expand the keyboard shortcuts list to include all current shortcuts
- Add a "Keyboard Shortcuts" quick-access from the PRIME menu (opens Settings directly to keyboard panel)

**Add new shortcuts in `src/components/os/Desktop.tsx`:**
- `Ctrl+M` -- minimize focused window
- `Ctrl+Shift+M` -- maximize/restore focused window

---

## Files Summary

| File | Action |
|------|--------|
| `src/types/os.ts` | Edit -- add `'mail'` and `'social'` to AppType |
| `src/components/os/AboutModal.tsx` | Create -- About PRIME OS dialog |
| `src/components/os/PrimeMailApp.tsx` | Create -- Email client app |
| `src/components/os/PrimeSocialApp.tsx` | Create -- Social media app |
| `src/components/os/SettingsApp.tsx` | Edit -- add Profile panel, expand keyboard shortcuts |
| `src/components/os/Taskbar.tsx` | Edit -- show minimized windows, add user greeting, About menu item |
| `src/components/os/Desktop.tsx` | Edit -- wire new apps, about modal, new keyboard shortcuts |
| `src/hooks/useWindowManager.ts` | Edit -- add sizes for mail/social apps |

