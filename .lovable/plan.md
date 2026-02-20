
# PRIME OS: Auto-Lock, Voice Control & Google Sign-In

## Status: ✅ Implemented

### 1. Auto-Lock — ✅
- `useIdleTimeout` hook with configurable timeout
- Settings panel with toggle + timeout dropdown (1-30 min)
- Auto re-locks when idle and booted

### 2. Voice Control — ✅
- `useVoiceControl` hook using Web Speech API
- Commands: open/close apps, lock, search, switch workspace, minimize/maximize
- `VoiceControlIndicator` in taskbar with pulse animation
- Settings panel with command reference

### 3. Google Sign-In — ✅
- Lovable Cloud managed Google OAuth
- Lock screen shows avatar + sign-in/out buttons
- Settings profile panel shows Google account info
- Auth state wired through Desktop → LockScreen & Settings
