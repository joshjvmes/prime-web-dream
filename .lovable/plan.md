

# Fix Widget Toggle Sync Between Settings and Desktop

## Problem

The Settings app and DesktopWidgets both read from `localStorage('prime-os-widgets')` but maintain independent React state. Toggling a widget in Settings updates localStorage but DesktopWidgets never picks up the change until a full page reload.

## Solution

Use the existing `eventBus` to broadcast widget state changes so both components stay in sync.

## Changes

### 1. DesktopWidgets.tsx -- Listen for widget changes

- In the main `DesktopWidgets` component, add an `eventBus.on('widgets.updated')` listener that re-reads localStorage and updates state
- This triggers an immediate re-render when Settings toggles a widget

### 2. SettingsApp.tsx -- Emit event on toggle

- In the `useEffect` that saves `widgetToggles` to localStorage, also emit `eventBus.emit('widgets.updated')` after writing
- This notifies DesktopWidgets to refresh

### 3. Clean up unused export

- Remove the unused `useWidgetSettings` export from DesktopWidgets (it's never imported anywhere)

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| `src/components/os/DesktopWidgets.tsx` | Add `eventBus.on('widgets.updated')` listener in `DesktopWidgets` component to re-read localStorage on change; remove unused `useWidgetSettings` |
| `src/components/os/SettingsApp.tsx` | Emit `eventBus.emit('widgets.updated')` after saving widget toggles to localStorage |

### Implementation

In DesktopWidgets, add inside the main component:
```text
useEffect(() => {
  const handler = () => setState(loadState());
  eventBus.on('widgets.updated', handler);
  return () => eventBus.off('widgets.updated', handler);
}, []);
```

In SettingsApp, update the existing widget save effect:
```text
useEffect(() => {
  const current = JSON.parse(localStorage.getItem('prime-os-widgets') || '{}');
  localStorage.setItem('prime-os-widgets', JSON.stringify({ ...current, ...widgetToggles }));
  eventBus.emit('widgets.updated');  // <-- add this line
}, [widgetToggles]);
```

This is a minimal 2-line fix that uses the already-imported eventBus pattern.

