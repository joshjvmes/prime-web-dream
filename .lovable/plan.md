

# Fix Widget Toggle Default Mismatch

## Problem Found

The widget toggle sync (via `eventBus`) IS working correctly -- toggling in Settings immediately updates the desktop. However, there's a **default value mismatch** between the two components:

- `DesktopWidgets.tsx` defaults `rokcat: true`
- `SettingsApp.tsx` defaults `rokcat: false`

When Settings opens, its `useEffect` saves its defaults to localStorage (`rokcat: false`), which overwrites the DesktopWidgets default (`rokcat: true`), causing the ROKCAT widget to disappear immediately.

## Fix

Align the default values in `SettingsApp.tsx` to match `DesktopWidgets.tsx`.

## Technical Details

### File Modified

| File | Change |
|------|--------|
| `src/components/os/SettingsApp.tsx` (line 118) | Change `rokcat: false` to `rokcat: true` in the default `WidgetToggles` initialization (appears 3 times on line 118) |

### The One-Line Fix

In `SettingsApp.tsx` line 118, the `widgetToggles` state initializer sets `rokcat: false` as the default. Change all three occurrences to `rokcat: true` to match `DesktopWidgets.tsx`.

This ensures both components agree on the default state, preventing Settings from accidentally overwriting the ROKCAT widget visibility when it first renders.

