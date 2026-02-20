

# PRIME OS: Auto-Lock, Voice Control & Google Sign-In

## Overview

Three upgrades: automatic screen lock after inactivity, hands-free voice commands using the browser's built-in Web Speech API, and Google OAuth sign-in for persistent user accounts.

---

## 1. Inactivity Auto-Lock

Add a configurable idle timeout that automatically re-locks PRIME OS after a period of no user interaction.

**New hook: `src/hooks/useIdleTimeout.ts`**
- Tracks mouse movement, keyboard input, clicks, scrolls, and touch events
- Resets a countdown timer on any interaction
- Fires a callback (`onIdle`) when the timer expires
- Configurable timeout duration (default: 5 minutes)
- Returns `resetTimer()` so other components can manually reset it
- Cleanup on unmount

**Update: `src/components/os/Desktop.tsx`**
- Import and use the `useIdleTimeout` hook
- When idle fires, call `handleLock()` to re-engage the lock screen
- Read timeout duration from localStorage settings
- Only active when `booted && !locked`

**Update: `src/components/os/SettingsApp.tsx`**
- Add to the "Lock & Security" panel:
  - Toggle: "Auto-lock after inactivity" (on/off)
  - Dropdown: timeout duration (1 min, 2 min, 5 min, 10 min, 15 min, 30 min, Never)
  - Save to `prime-os-lock-settings` in localStorage alongside existing PIN/wallpaper settings
- Update the `LockSettings` interface to include `autoLock: boolean` and `autoLockTimeout: number`

---

## 2. Voice Control

Add hands-free voice commands using the browser's native Web Speech API (no external services or API keys needed).

**New hook: `src/hooks/useVoiceControl.ts`**
- Uses `webkitSpeechRecognition` / `SpeechRecognition` API
- Continuous listening mode with wake-word detection ("prime" or "computer")
- Command parser that maps spoken phrases to system actions:
  - "Open [app name]" -- opens the matching app
  - "Close [app name]" -- closes it
  - "Lock screen" -- locks the OS
  - "Search [query]" -- opens global search
  - "Switch workspace [number]" -- switches workspace
  - "Minimize" / "Maximize" -- acts on focused window
- Returns state: `{ isListening, transcript, startListening, stopListening, supported }`
- Graceful fallback when Speech API is not available (shows "not supported" message)

**New component: `src/components/os/VoiceControlIndicator.tsx`**
- Small microphone icon in the taskbar (next to clock area)
- Pulses/glows when actively listening
- Click to toggle listening on/off
- Shows last recognized command as a brief tooltip/toast
- Red dot indicator when voice is active

**Update: `src/components/os/Desktop.tsx`**
- Wire the voice hook with callbacks for `openWindow`, `closeWindowByApp`, `handleLock`, `setSearchOpen`, `switchWorkspace`, `minimizeWindow`, `maximizeWindow`
- Pass voice state to the Taskbar

**Update: `src/components/os/Taskbar.tsx`**
- Render `VoiceControlIndicator` in the system tray area (near clock)

**Update: `src/components/os/SettingsApp.tsx`**
- Add "Voice Control" panel with a Mic icon:
  - Toggle: Enable voice control
  - Wake word display
  - List of supported voice commands
  - Test microphone button

---

## 3. Google Sign-In

Add Google OAuth so users can sign in and have their PRIME OS profile, settings, and data persist across devices via Lovable Cloud.

**Configure auth:**
- Use the social auth configuration tool to enable Google OAuth (managed by Lovable Cloud, no API keys needed)

**New component: `src/components/os/AuthScreen.tsx`**
- Shown on the lock screen as an alternative to PIN unlock
- "Sign in with Google" button styled to match PRIME OS aesthetic
- Shows signed-in user's name/avatar from Google profile
- "Continue as Guest" option to skip sign-in and use the OS locally
- After sign-in, profile data (name, avatar) syncs to Settings

**Update: `src/components/os/LockScreen.tsx`**
- Add auth state check: if user is signed in via Google, show their avatar and name
- Add "Sign in with Google" button below the PIN area
- Add "Sign Out" option accessible from the lock screen
- Import and use `lovable.auth.signInWithOAuth("google", ...)`

**Update: `src/components/os/SettingsApp.tsx`**
- Update Profile panel to show Google account info when signed in
- Add "Sign Out" button
- Show sync status (local vs cloud)

**Update: `src/components/os/Desktop.tsx`**
- Add auth state listener using `supabase.auth.onAuthStateChange`
- When signed in, populate profile from Google user metadata
- Pass auth state down to relevant components

**Database (optional future):**
- For now, Google sign-in just provides identity and auto-fills the profile
- Settings remain in localStorage (cloud sync of settings can be a future upgrade)

---

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/useIdleTimeout.ts` | Create -- idle detection hook |
| `src/hooks/useVoiceControl.ts` | Create -- Web Speech API voice command hook |
| `src/components/os/VoiceControlIndicator.tsx` | Create -- taskbar mic indicator |
| `src/components/os/AuthScreen.tsx` | Create -- Google sign-in UI |
| `src/components/os/Desktop.tsx` | Edit -- wire idle timeout, voice control, auth state |
| `src/components/os/LockScreen.tsx` | Edit -- add Google sign-in button, show signed-in user |
| `src/components/os/Taskbar.tsx` | Edit -- add voice indicator to system tray |
| `src/components/os/SettingsApp.tsx` | Edit -- auto-lock settings, voice control panel, auth profile |

---

## Technical Notes

- **Voice Control** uses the browser-native `SpeechRecognition` API -- no external services, no API keys, works offline in Chrome/Edge. Safari has partial support. Firefox does not support it. The hook detects availability and gracefully degrades.
- **Google OAuth** uses Lovable Cloud's managed Google sign-in (no credentials to configure). The `lovable.auth.signInWithOAuth("google")` function handles everything.
- **Auto-lock** uses passive event listeners for performance -- the idle timer only fires `setTimeout` calls, not intervals, making it very lightweight.

