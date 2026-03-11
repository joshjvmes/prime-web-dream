

# Wire Up More Apps to ROKCAT Navigation

## Current State
Three apps already respond to `app.navigate`: **SystemMonitorApp**, **PrimeMailApp**, **PrimeVaultApp**.

The `APP_ACTION_PROMPT` in `actionParser.ts` already lists navigation contexts for several apps that are NOT yet wired up.

## Apps to Wire Up

| App | State Variable | Navigation Contexts |
|-----|---------------|---------------------|
| **SettingsApp** | `activePanel` (Panel type) | `display`, `security`, `ai`, `audio`, `about`, `profile` |
| **PrimeWalletApp** | `tab` (Tab type) | `overview`, `send`, `escrow` |
| **PrimeCalendarApp** | `currentMonth` + view | `month`, `week` (add week view state) |
| **PrimeSocialApp** | (no tab state yet) | `feed`, `profile` (add tab state) |
| **PrimeBoardApp** | (column-based) | `backlog`, `in-progress`, `done` (scroll/highlight column) |
| **PrimeBrowserApp** | URL bar | Any URL string — navigate the browser to it |
| **SecurityConsoleApp** | (no tab state) | `scan`, `firewall`, `audit` (add sections) |
| **PrimeAudioApp** | playback state | `play`, `pause`, `next`, `prev` (control playback) |

## Implementation per App

Each app gets the same pattern — a `useEffect` that listens for `app.navigate` events filtered by its app ID, then maps the `context` string to the appropriate state change:

```typescript
useEffect(() => {
  const handler = (payload: any) => {
    if (payload?.app === 'APP_ID' && payload?.context) {
      // map context to state change
    }
  };
  eventBus.on('app.navigate', handler);
  return () => eventBus.off('app.navigate', handler);
}, []);
```

### Specific behaviors:
- **SettingsApp**: Map context to `setActivePanel()` — already has panel switching built in
- **PrimeWalletApp**: Map context to `setTab()` — already has tab switching
- **PrimeCalendarApp**: Add a `viewMode` state (`'month' | 'week'`) to toggle between views
- **PrimeSocialApp**: Add a `tab` state (`'feed' | 'profile'`) to switch sections
- **PrimeBoardApp**: Highlight the target column with a brief glow animation (similar to SystemMonitor's approach)
- **PrimeBrowserApp**: Set the URL bar value and trigger navigation to the provided URL
- **SecurityConsoleApp**: Add a `section` state to switch between scan/firewall/audit views
- **PrimeAudioApp**: Trigger play/pause/next/prev actions directly from context

## System Prompt Update

Update `APP_ACTION_PROMPT` in `actionParser.ts` to include the new navigation contexts:
- `audio`: `"play"`, `"pause"`, `"next"`, `"prev"`
- `security`: `"scan"`, `"firewall"`, `"audit"`
- `browser`: any URL

## Files to Modify
1. `src/components/os/SettingsApp.tsx` — add navigate listener
2. `src/components/os/PrimeWalletApp.tsx` — add navigate listener
3. `src/components/os/PrimeCalendarApp.tsx` — add navigate listener + week view
4. `src/components/os/PrimeSocialApp.tsx` — add tab state + navigate listener
5. `src/components/os/PrimeBoardApp.tsx` — add navigate listener with column highlight
6. `src/components/os/PrimeBrowserApp.tsx` — add navigate listener for URL navigation
7. `src/components/os/SecurityConsoleApp.tsx` — add section state + navigate listener
8. `src/components/os/PrimeAudioApp.tsx` — add navigate listener for playback control
9. `src/components/os/rokcat/actionParser.ts` — expand `APP_ACTION_PROMPT` with new contexts

