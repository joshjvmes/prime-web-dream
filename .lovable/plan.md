

# PRIME WEB OS: Polish and Power Features

## 1. Window Resize Support
Currently windows can only be dragged -- not resized. Add resize handles (edges and corners) so users can resize any window by dragging its borders, just like a real OS.

## 2. Maximize Button (Functional)
The Maximize button in the title bar is currently non-functional. Wire it up to toggle between full-screen and the previous size/position.

## 3. Right-Click Context Menu
Add a desktop right-click context menu with options like "Open Terminal", "System Info", "Tile All Windows", "Cascade Windows", and "About PRIME OS".

## 4. Desktop App Icons
Add clickable shortcut icons on the desktop surface (like classic OS desktops) for the most-used apps -- Terminal, Files, Q3 Inference, PrimeNet, etc. Double-click to launch.

## 5. Window Snapping
Allow windows to snap to half-screen (left/right) when dragged to screen edges, similar to modern OS window management.

## 6. Notification System
Add a small notification toast area (top-right) that periodically shows simulated system events: "PrimeNet: New node joined lattice", "Q3 Engine: Inference batch complete", "Energy: COP spike detected at 3.8", etc.

## 7. Settings App
Build the "settings" app (currently in the AppType but not implemented) with toggleable options: boot animation on/off, scan-line effect toggle, grid background toggle, accent color switching (cyan/violet/amber themes).

## 8. Sound Effects (Optional Toggle)
Add subtle UI sounds for boot sequence, window open/close, and button clicks using the Web Audio API (no external files needed -- synthesized beeps/clicks).

## Technical Details

### Modified Files
- `src/hooks/useWindowManager.ts` -- Add resizeWindow and maximizeWindow callbacks; track previous size for maximize toggle
- `src/components/os/OSWindow.tsx` -- Add resize handles on edges/corners; wire up maximize button; add snap detection on drag end
- `src/components/os/Desktop.tsx` -- Add right-click context menu; add desktop icons grid; register settings app; add notification system
- `src/components/os/Taskbar.tsx` -- No changes needed (settings already absent from apps list, will need to add it)
- `src/types/os.ts` -- Add `isMaximized` and `prevBounds` to WindowState

### New Files
- `src/components/os/SettingsApp.tsx` -- Settings panel with toggles for visual effects and theme
- `src/components/os/DesktopIcons.tsx` -- Grid of double-clickable app shortcuts
- `src/components/os/ContextMenu.tsx` -- Right-click menu component
- `src/components/os/NotificationSystem.tsx` -- Periodic toast notifications for simulated events
- `src/hooks/useNotifications.ts` -- Hook managing timed notification queue

### Implementation Approach
All features follow the existing architecture patterns -- using framer-motion for animations, the cyberpunk aesthetic (Orbitron/Rajdhani fonts, cyan/amber accents), and the same window management system. Settings will use React context to broadcast theme/effect preferences across the OS.

