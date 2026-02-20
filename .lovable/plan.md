

# Adaptive Mobile UI for Prime OS

## Overview

Replace the windowed desktop experience with a mobile-friendly app launcher on phones and a simplified desktop on tablets. The OS retains its identity and aesthetic but adapts to touch-first interaction patterns.

---

## Breakpoints

| Device | Width | Behavior |
|--------|-------|----------|
| Mobile | < 768px | Full-screen app launcher with icon grid, single full-screen app at a time, bottom tab bar |
| Tablet | 768px - 1024px | Simplified desktop: windows auto-maximize, compact taskbar, touch-friendly controls |
| Desktop | > 1024px | Current experience (unchanged) |

---

## What Changes

### 1. New Component: `MobileLauncher.tsx`

A phone-optimized home screen that replaces the windowed desktop on small screens:

- **App grid**: 4-column icon grid organized by category (reuses the existing `categories` array from DesktopIcons)
- **Single-tap to open** (not double-click like desktop icons)
- **Full-screen apps**: When an app opens, it takes the entire screen with a top bar showing the app name and a back button
- **Bottom navigation bar**: Replaces the taskbar with a minimal dock showing 4-5 pinned apps (Terminal, Hyper AI, Chat, Settings) plus an "All Apps" button
- **Swipe down** from top to see notifications
- **Status bar** at top: time, workspace indicator, notification count
- No window dragging, resizing, or snapping -- everything is full-screen

### 2. New Component: `MobileAppView.tsx`

A full-screen wrapper for apps on mobile:

- Top bar with back arrow, app title, and a minimize (home) button
- The app component renders inside a full-height scrollable container
- Swipe-right gesture to go back to the launcher (optional, nice to have)

### 3. Updated: `Desktop.tsx`

The main Desktop component will detect the screen size and render different layouts:

- **Mobile (< 768px)**: Render `MobileLauncher` instead of the windowed desktop. The window manager still tracks open apps but windows are always maximized and only one is visible at a time.
- **Tablet (768-1024px)**: Render the normal desktop but with auto-maximized windows and larger touch targets on the taskbar (taller buttons, bigger icons).
- **Desktop (> 1024px)**: No changes.

The `useIsMobile` hook already exists. We'll extend it or create a `useDeviceClass` hook that returns `'mobile' | 'tablet' | 'desktop'`.

### 4. New Hook: `useDeviceClass.ts`

```text
Returns 'mobile' (< 768px), 'tablet' (768-1024px), or 'desktop' (> 1024px)
Uses window.matchMedia for efficiency
```

### 5. Updated: `useWindowManager.ts`

- On mobile, `openWindow` always sets `isMaximized: true`
- On mobile, only one window is visible at a time (the most recently focused)
- Window position/size defaults adjusted for tablet (larger initial sizes, centered)

### 6. Updated: `Taskbar.tsx`

- **Mobile**: Hidden entirely (replaced by MobileLauncher's bottom nav)
- **Tablet**: Taller (h-12 instead of h-10), larger icons (size 18 instead of 14), always show window titles (no `hidden sm:inline`)

### 7. Updated: `OSWindow.tsx`

- **Mobile**: No title bar drag handle, no resize handles, always full-screen
- **Tablet**: Drag enabled but snap zones are larger (easier touch targets)

### 8. Updated: `LockScreen.tsx`

- Already mostly responsive (uses flexbox centering)
- Increase touch target sizes for PIN input on mobile
- Make the swipe-up unlock gesture area larger on touch devices

### 9. Updated: `DesktopIcons.tsx`

- **Mobile**: Not rendered (MobileLauncher replaces it)
- **Tablet**: Wider icon column (100px instead of 84px), larger icons, single-tap instead of double-click

### 10. CSS Additions in `index.css`

- Add touch-action utilities for mobile
- Safe area insets for notched phones (`env(safe-area-inset-*)`)
- Disable scan-lines effect on mobile (performance)

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useDeviceClass.ts` | Returns 'mobile', 'tablet', or 'desktop' based on viewport width |
| `src/components/os/MobileLauncher.tsx` | Mobile home screen with app grid and bottom nav |
| `src/components/os/MobileAppView.tsx` | Full-screen app wrapper with back navigation |

### Files to Modify

| File | Change |
|------|---------|
| `src/components/os/Desktop.tsx` | Conditionally render MobileLauncher on mobile, pass device class to child components |
| `src/hooks/useWindowManager.ts` | Accept device class, force maximize on mobile, single-visible-app on mobile |
| `src/components/os/Taskbar.tsx` | Hide on mobile, enlarge on tablet |
| `src/components/os/OSWindow.tsx` | Disable drag/resize on mobile, full-screen mode |
| `src/components/os/DesktopIcons.tsx` | Hide on mobile, single-tap on tablet |
| `src/components/os/LockScreen.tsx` | Larger touch targets on mobile |
| `src/index.css` | Safe area insets, mobile touch utilities |

### Mobile Launcher Layout

```text
+---------------------------+
| 10:30 AM    WS1    [3] bell|  <- Status bar
+---------------------------+
|                           |
|  [Terminal] [Files]       |
|  [Hyper AI] [Chat]       |
|  [Browser]  [Calendar]   |
|  [Mail]     [Settings]   |
|  ...                     |  <- Scrollable icon grid
|                           |
+---------------------------+
| [Term] [AI] [Chat] [All] |  <- Bottom dock
+---------------------------+
```

### How Apps Look on Mobile

```text
+---------------------------+
| <- Terminal         [Home]|  <- App top bar
+---------------------------+
|                           |
|  (full app content here)  |
|  (scrollable)             |
|                           |
+---------------------------+
```

### Touch Considerations

- All interactive elements will be at least 44x44px on mobile (Apple HIG)
- Bottom navigation uses safe-area-inset-bottom for notched phones
- Long-press on app icons shows a tooltip with the full app name
- No hover states relied upon -- all interactions work with tap

### Performance

- Scan-line CSS effect disabled on mobile (saves GPU)
- Desktop widgets hidden on mobile (less DOM)
- Framer Motion animations simplified on mobile (shorter durations, fewer spring physics)

