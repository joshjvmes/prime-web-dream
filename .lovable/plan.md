

# New GUI Apps: Web Browser, Data Center, and More

## Overview

Add 2-4 new applications to PRIME OS, each following the established component pattern. The Web Browser and Data Center are the primary additions, with a Task Manager and Media Viewer as optional extras.

---

## App 1: PrimeBrowser (Web Browser)

**File:** `src/components/os/PrimeBrowserApp.tsx`

A simulated intranet browser for the prime coordinate lattice:

- **Address bar** with navigation buttons (back, forward, refresh) and a URL input field showing `prime://` protocol addresses.
- **Bookmarks bar** with preset links: `prime://home`, `prime://docs`, `prime://net-status`, `prime://q3-lab`, `prime://energy-grid`.
- **Rendered pages** -- each URL maps to a mini "web page" component rendered inline:
  - `prime://home` -- Welcome portal with system status summary and quick links
  - `prime://docs` -- A documentation page with collapsible sections about PRIME OS concepts
  - `prime://net-status` -- Live network stats (reuses PrimeNet data patterns)
  - `prime://q3-lab` -- Interactive qutrit playground (toggle states, see superposition)
  - `prime://energy-grid` -- Energy grid visualization
  - Unknown URLs show a "404 - Coordinate not found in lattice" error page
- **Tab system** -- open multiple tabs, each with its own URL and history stack.
- **Loading animation** -- brief progress bar on navigation with "Resolving geometric route..." text.
- **Page source button** -- toggles showing the "source" of the current page (simulated markup in a monospace view).

---

## App 2: Data Center (LatticeCore)

**File:** `src/components/os/DataCenterApp.tsx`

A visual server infrastructure management dashboard:

- **Rack visualization** -- a grid of 4x4 server racks rendered as styled rectangles, each containing 6 server units. Color-coded by status: green (online), amber (high load), red (critical), gray (offline).
- **Live metrics per node** -- temperature (with heat gradient coloring), CPU load bar, memory usage, and uptime counter. Values fluctuate with simulated intervals.
- **Node detail panel** -- click any server unit to open a detail sidebar showing: hostname, prime coordinate, OS version, running processes list, network connections, and a mini sparkline of load history.
- **Aggregate stats header** -- total nodes online, average temperature, total compute capacity, and network throughput across the data center.
- **Alert feed** -- a bottom panel showing recent alerts (node overheating, failover triggered, maintenance scheduled) with timestamps and severity badges.
- **Controls** -- buttons to "Restart Node", "Migrate Workload", and "Run Diagnostics" (trigger animations and status changes).
- **Map view toggle** -- switch between rack grid view and a geographic-style topology map showing node locations on a stylized lattice diagram.

---

## App 3: Task Manager (PrimeBoard) -- Optional

**File:** `src/components/os/PrimeBoardApp.tsx`

A Kanban-style task/operation tracker:

- **Three columns**: Queued, Computing, Complete -- each styled as a scrollable lane.
- **Task cards** with operation name, priority badge (P0/P1/P2), assigned node, and estimated completion time.
- **Drag and drop** between columns using mouse events (no external library needed -- use onDragStart/onDrop handlers).
- **Auto-generated tasks** -- new "lattice operations" appear in the Queued column every 10-15 seconds with randomized names like "Fold sector 7 manifold", "Recalibrate Q3 core 41".
- **Auto-completion** -- tasks in Computing column have a progress timer; after their duration elapses they auto-move to Complete.
- **Add task button** -- manually create a new task with a name input.

---

## App 4: Media Viewer (PrimeGallery) -- Optional

**File:** `src/components/os/PrimeGalleryApp.tsx`

A viewer for procedurally generated geometric visualizations:

- **Gallery grid** -- thumbnails of generated SVG art pieces (Adinkra symbols, prime spirals, lattice projections, Fibonacci patterns).
- **Full viewer** -- click a thumbnail to view it full-size with title, description, and coordinate metadata.
- **Live generation** -- each piece is an SVG rendered with randomized parameters so it looks different on each visit.
- **Categories sidebar** -- filter by type: Adinkra, Fractals, Lattice Maps, Prime Spirals.

---

## Wiring and Registration

### `src/types/os.ts`
Add to `AppType` union:
```
'browser' | 'datacenter' | 'board' | 'gallery'
```
(Only the ones being built.)

### `src/components/os/Desktop.tsx`
- Import new app components.
- Add cases to the `renderApp` switch.

### `src/components/os/Taskbar.tsx`
- Add entries to `allApps` array:
  - Browser: `Globe` icon, title "PrimeBrowser"
  - Data Center: `Server` icon, title "LatticeCore"
  - Board: `Kanban` icon (or `LayoutList`), title "PrimeBoard"
  - Gallery: `Image` icon, title "PrimeGallery"

### `src/components/os/terminal/commands.ts`
- Add entries to `APP_MAP`: `open browser`, `open datacenter`, `open board`, `open gallery`.
- Update `HELP_TEXT`.

### `src/hooks/useWindowManager.ts`
- Default sizes: browser 850x550, datacenter 800x550, board 750x500, gallery 700x480.

### `src/components/os/DesktopIcons.tsx`
- Add icons for the new apps to the desktop icon grid.

---

## Technical Notes

- All data simulated with `useState` + `setInterval` -- no backend.
- Browser tab/history system uses a simple stack array per tab in state.
- Data Center rack grid uses CSS Grid with inline style coloring for temperature gradients.
- Kanban drag-and-drop uses native HTML5 drag events (no library needed).
- SVG gallery pieces generated with parameterized path functions.
- Styling follows existing conventions: `font-mono`, `font-display`, CSS custom properties for colors.
- No new dependencies required.

