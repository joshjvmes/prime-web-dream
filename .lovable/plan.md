

# Make All Settings and Customizations Functional

## Overview

Many settings in the Settings app are stored in localStorage but never actually applied to the OS. This plan makes every setting toggle, slider, and selector actually change the system behavior, and syncs all preferences to the cloud for signed-in users.

---

## What's Currently Working

- Scan lines / Grid background (CSS classes toggled)
- Accent color theme (CSS variables applied)
- Lock screen PIN, auto-lock, wallpaper
- Voice control enable/disable
- System Pulse / Ambience
- Profile (name, title, bio, avatar -- DB synced)

## What's Currently Cosmetic Only (Stored but Never Applied)

These settings are saved to localStorage but have zero effect on the OS:

| Setting | Panel | What It Should Do |
|---------|-------|-------------------|
| Window Opacity | Display | Set backdrop opacity on all OS windows |
| Animation Speed | Display | Control framer-motion transition durations globally |
| Font Size | Display | Scale the base font size across the OS |
| Key Repeat Rate/Delay | Keyboard | Cosmetic only -- keep as display, no browser API |
| Keyboard Layout | Keyboard | Cosmetic only -- keep as display |
| Cursor Speed | Mouse | Cosmetic only -- keep as display |
| Double-click Speed | Mouse | Cosmetic only -- keep as display |
| Scroll Direction | Mouse | Cosmetic only -- keep as display |
| Pointer Precision | Mouse | Cosmetic only -- keep as display |
| Cursor Theme | Mouse | Apply custom CSS cursor to the desktop |
| Master Volume | Audio | Cosmetic only -- no real audio system |
| System/Notification Sounds | Audio | Cosmetic only |
| Widget toggles | Widgets | Missing forge and agentLog toggles in the UI |

---

## Changes

### 1. Apply Window Opacity (`src/components/os/OSWindow.tsx`)

- Read `windowOpacity` from `prime-os-settings` in localStorage
- Apply it as `opacity` or `background-opacity` on the window card container
- Listen for `storage` events to update live when settings change

### 2. Apply Font Size Globally (`src/components/os/Desktop.tsx`)

- Read `fontSize` setting on mount and when it changes
- Apply a CSS class to the root desktop container: `text-xs` (compact), `text-sm` (default), `text-base` (large)
- This cascades through all child components

### 3. Apply Animation Speed (`src/components/os/Desktop.tsx`)

- Set a CSS custom property `--animation-speed` on the root: `0.5` (slow), `1` (normal), `2` (fast)
- OSWindow and other motion components can read this for transition durations
- Update `OSWindow.tsx` to use the speed multiplier for open/close/drag animations

### 4. Apply Cursor Theme (`src/components/os/Desktop.tsx`)

- Read `cursorTheme` from settings
- Apply CSS cursor style to the desktop div: `default` (Default), `crosshair` (Crosshair), `url(...)` or `cell` (Lattice)

### 5. Add Missing Widget Toggles (`src/components/os/SettingsApp.tsx`)

- Add "Forge Activity Widget" and "Agent Activity Widget" toggle rows to the Widgets panel
- These already exist in DesktopWidgets but have no toggle in Settings

### 6. Cloud-Sync All Settings (`src/components/os/SettingsApp.tsx`)

- For signed-in users, save the full `SettingsState`, `LockSettings`, and `WidgetToggles` to the cloud via `useCloudStorage`
- On profile load, also load settings from cloud and merge with localStorage (cloud wins)
- This gives users consistent preferences across devices

### 7. Settings Upgrade: Add Reset Button

- Add a "Reset to Defaults" button at the bottom of each panel that restores factory settings for that category

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/components/os/OSWindow.tsx` | Read window opacity from localStorage, apply to container |
| `src/components/os/Desktop.tsx` | Apply font size class, animation speed CSS var, cursor theme |
| `src/components/os/SettingsApp.tsx` | Add forge/agentLog widget toggles, cloud sync, reset buttons |

### Settings Application Flow

When a user changes a setting:
1. State updates in SettingsApp
2. Saved to localStorage (existing behavior)
3. If signed in, also saved to cloud via `useCloudStorage`
4. A `storage` event fires (or custom event)
5. Desktop.tsx and OSWindow.tsx react to the change and apply it live

### No Database Changes Required

Cloud sync uses the existing `user_data` table via `useCloudStorage`. All settings fit in a single JSON blob under the key `os-settings`.

