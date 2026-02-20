

# Browser, Arcade, and Canvas Upgrades

## Overview

Four upgrades across three apps: add user bookmarks and browsing history to the browser, expand the arcade with new physics-based games, and enable PNG/SVG export from the canvas app.

---

## 1. Browser -- Bookmarks Manager + History Panel

### Current State
- Hardcoded bookmark bar (10 entries, not editable)
- No browsing history UI (history exists per-tab in memory but no panel to browse it)

### Upgrades

**User Bookmarks**
- "Add Bookmark" button (star icon in address bar) saves the current page
- Bookmarks persisted via `useCloudStorage` under key `browser-bookmarks`
- Bookmarks bar shows user bookmarks alongside defaults
- Right-click or hover-X to remove a bookmark
- Default bookmarks remain as fallback for new users

**History Panel**
- Clock icon in the toolbar toggles a history sidebar
- Shows all visited URLs with timestamps, grouped by session
- Click any entry to navigate to it
- "Clear History" button
- History persisted via `useCloudStorage` under key `browser-history`
- Capped at 200 entries (oldest pruned automatically)

### File Changed
| File | Action |
|------|--------|
| `src/components/os/PrimeBrowserApp.tsx` | Add bookmark management, history sidebar, cloud persistence |

---

## 2. Arcade -- New Physics-Based Games

### Current State
- 2 games: Lattice Minesweeper and Qutrit Snake
- Both use canvas rendering and support high scores

### New Games

**Graviton Pong**
- Classic pong with a twist: a gravity well in the center pulls the ball
- Single-player vs AI opponent
- Ball trajectory curves around the central mass
- Score tracking and speed escalation
- Canvas-based rendering with requestAnimationFrame

**Particle Cascade (Breakout variant)**
- Breakout-style game where bricks shatter into particle effects
- Paddle at bottom, ball bounces off bricks
- Bricks have different "element" types (3 colors matching qutrit states)
- Particles fly off destroyed bricks with simple physics (gravity + fade)
- Power-ups: wider paddle, multi-ball, slow motion
- Level progression (more bricks, faster ball)

**Topology Tetris**
- Classic tetris with standard piece rotation and movement
- Themed as "manifold assembly" -- pieces are geometric manifold fragments
- Standard scoring: points for lines cleared, bonus for multi-line clears
- Speed increases with level
- Ghost piece preview showing where the piece will land
- Next piece preview

All three games include high-score persistence via localStorage (matching existing pattern).

### File Changed
| File | Action |
|------|--------|
| `src/components/os/PrimeArcadeApp.tsx` | Add 3 new game components and tabs |

---

## 3. Canvas -- PNG and SVG Export

### Current State
- Drawing works (pencil, line, rect, circle, eraser)
- Undo/redo, color palette, brush size
- No export functionality

### Upgrades

**Export PNG**
- "Export PNG" button in the toolbar
- Uses `canvas.toDataURL('image/png')` to generate the image
- Triggers a download with filename `prime-canvas-{timestamp}.png`

**Export SVG**
- "Export SVG" button in the toolbar
- Converts the current canvas content to an SVG by embedding the canvas as a base64 image inside an SVG wrapper
- This preserves all drawn content exactly as-is
- Downloads as `prime-canvas-{timestamp}.svg`

**Clear Canvas**
- Add a "Clear" button to reset the canvas to blank (with confirmation)

### File Changed
| File | Action |
|------|--------|
| `src/components/os/PrimeCanvasApp.tsx` | Add export buttons, clear canvas, download logic |

---

## Technical Notes

- **Browser bookmarks format**: `{ label: string, url: string, addedAt: string }[]` stored under `browser-bookmarks` key
- **Browser history format**: `{ url: string, title: string, visitedAt: string }[]` stored under `browser-history` key, max 200 entries
- **Arcade games**: All canvas-based using requestAnimationFrame loops, matching the existing Snake pattern. No external physics libraries -- simple velocity/acceleration math.
- **Canvas export**: PNG export is native via `canvas.toDataURL()`. SVG export wraps the rasterized canvas in an SVG `<image>` element so the output is a valid SVG file that can be opened in any vector editor.
- **No database changes** needed -- all persistence uses existing `useCloudStorage` hook or localStorage.

