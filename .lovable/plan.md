
# Global Search, Keyboard Accessibility, and Quick Tour

## Overview

Add three features to PRIME OS: a global command palette for searching apps/files/windows, keyboard navigation improvements across all apps and dialogs, and a first-launch quick tour modal introducing the OS.

---

## Feature 1: Global Search (Command Palette)

**New File:** `src/components/os/GlobalSearch.tsx`

A Spotlight/command-palette overlay triggered by `Ctrl+K` (or `Cmd+K` on Mac):

- Built on top of the existing `cmdk` library (already installed) using the `Command`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem`, `CommandEmpty` components from `src/components/ui/command.tsx`.
- Renders as a centered dialog overlay (using `CommandDialog` pattern) at `z-[300]` so it floats above all windows.
- **Search categories:**
  - **Applications** -- all 19 apps from the `allApps` array in Taskbar, searchable by label. Selecting one opens/focuses the app.
  - **Open Windows** -- lists currently open windows. Selecting one focuses that window.
  - **Quick Actions** -- "Tile All Windows", "Cascade Windows", "Open Settings", "Open Terminal".
- Keyboard-navigable out of the box (cmdk handles arrow keys and Enter).
- Escape closes the palette.

**Integration in `Desktop.tsx`:**
- Import `GlobalSearch` component.
- Add state `searchOpen` with `useState(false)`.
- Add a `useEffect` listening for `Ctrl+K` / `Cmd+K` keydown to toggle `searchOpen`.
- Pass `windows`, `openWindow`, `focusWindow`, `tileAllWindows`, `cascadeWindows` as props.
- Render `<GlobalSearch>` inside the booted section.

**Integration in `Taskbar.tsx`:**
- Add a small search icon button next to the PRIME menu that triggers the search (accepts an `onSearch` callback prop).

---

## Feature 2: Keyboard Accessibility

**Changes to `src/components/os/OSWindow.tsx`:**
- Add `role="dialog"` and `aria-label={win.title}` to the window container.
- Add `aria-label` attributes to minimize, maximize, and close buttons.
- Make title bar buttons `tabIndex={0}` (already buttons, so mostly semantic additions).
- Add keyboard handler on the window: `Escape` closes focused window (only if the window itself has focus, not a child input).

**Changes to `src/components/os/Taskbar.tsx`:**
- Add `aria-label` to PRIME menu button and notification bell.
- Ensure all app buttons in the menu have `role="menuitem"`.

**Changes to `src/components/os/Desktop.tsx`:**
- Add global keyboard listener for:
  - `Ctrl+K` / `Cmd+K` -- open global search (handled by GlobalSearch integration above).
  - `Alt+Tab` -- cycle focus between open windows (call `focusWindow` on the next window in the list).
  - `Ctrl+W` -- close the currently focused window.

**Changes to `src/components/os/DesktopContextMenu.tsx`:**
- Add keyboard shortcut hints next to context menu items (e.g., "Ctrl+K" next to a hypothetical search entry).

---

## Feature 3: Quick Tour Modal

**New File:** `src/components/os/QuickTour.tsx`

A multi-step onboarding modal shown on first OS launch:

- Uses `localStorage` key `prime-os-tour-completed` to track whether the tour has been shown.
- Modal styled as a centered card with the PRIME OS aesthetic (border-primary, bg-card, font-mono).
- **Steps** (navigable with Next/Back/Skip buttons):
  1. **Welcome** -- "Welcome to PRIME OS" with logo and tagline. Brief intro to geometric computing.
  2. **Desktop & Windows** -- Explains drag, resize, snap, maximize. Shows icon of window controls.
  3. **Applications** -- Highlights key apps: Terminal, Browser, Data Center, Security Console, Chat, Editor, Gallery, Board.
  4. **Global Search** -- "Press Ctrl+K to find anything" with a visual of the search palette.
  5. **Get Started** -- "Your lattice awaits" with a "Launch Terminal" button that closes the tour and opens the terminal.
- Each step has a dot indicator showing progress (step 1 of 5, etc.).
- "Skip Tour" link on every step. "Don't show again" checkbox on the last step.
- Animated transitions between steps using framer-motion.

**Integration in `Desktop.tsx`:**
- Import `QuickTour`.
- Add state `showTour` initialized from `localStorage` check.
- Render `<QuickTour>` after boot completes, before the terminal auto-opens.
- When tour completes or is skipped, set `localStorage` and close.

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/os/GlobalSearch.tsx` | Create -- command palette component |
| `src/components/os/QuickTour.tsx` | Create -- multi-step tour modal |
| `src/components/os/Desktop.tsx` | Edit -- integrate search, tour, global keyboard shortcuts |
| `src/components/os/Taskbar.tsx` | Edit -- add search button, aria labels |
| `src/components/os/OSWindow.tsx` | Edit -- add aria attributes, keyboard close |
| `src/components/os/DesktopContextMenu.tsx` | Edit -- add shortcut hints |

## Technical Notes

- No new dependencies needed. `cmdk` and `framer-motion` are already installed.
- The command palette reuses the existing `Command*` UI components from `src/components/ui/command.tsx`, keeping the design system consistent.
- Tour state is persisted in `localStorage` so it only shows once per browser.
- All keyboard shortcuts use `useEffect` with `keydown` listeners and proper cleanup.
- Alt+Tab cycling is implemented by finding the index of the currently focused window and advancing to the next non-minimized window.
