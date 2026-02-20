
# New App Suite for PRIME OS

## Overview

Adding 8 new applications to the PRIME OS ecosystem, following the established patterns (self-contained components, simulated data, SVG visuals, consistent styling).

---

## New Apps

### 1. PrimeDocs -- Document Viewer
**File:** `src/components/os/PrimeDocsApp.tsx`

A viewer for `.fold` documents and lattice reports:
- Left sidebar listing sample documents (manifold reports, lattice specs, fold documentation)
- Main viewer area with markdown-like rendering (headers, paragraphs, code blocks, tables)
- Toolbar with zoom controls and a page navigation indicator
- Documents stored as structured data with title, content sections, and metadata
- Syntax-highlighted code blocks for `.fold` snippets
- Print/export button (simulated) and search-within-document

### 2. PrimeGrid -- Spreadsheet
**File:** `src/components/os/PrimeGridApp.tsx`

A lightweight spreadsheet with prime-flavored features:
- Grid of cells (columns A-H, rows 1-20) rendered as a table
- Click to select a cell, type to edit, Enter to commit
- Formula bar at the top showing the selected cell reference and content
- Support basic formulas: `=SUM(A1:A5)`, `=AVG(B1:B3)`, `=PRIME(n)` (nth prime), `=FACTOR(n)` (prime factorization)
- Pre-populated with sample data (lattice metrics, energy readings, node stats)
- Column/row headers with resize handles (visual only)
- Status bar showing cell count, sum of selection
- Tab bar for multiple sheets ("Lattice Data", "Energy Log", "Node Stats")

### 3. SchemaForge -- Database Designer
**File:** `src/components/os/SchemaForgeApp.tsx`

A visual entity-relationship diagram tool:
- Canvas area with draggable entity boxes (SVG-based)
- Each entity shows table name, columns with types and key indicators
- Pre-populated with 4-5 entities: `QutritNode`, `LatticeRegion`, `FoldOperation`, `EnergyReading`, `PrimeCoord`
- Lines connecting related entities (rendered as SVG paths)
- Side panel for editing selected entity: add/remove columns, set types
- Toolbar with "Add Entity", "Add Relation", "Auto-layout" buttons
- Export schema as text (simulated)

### 4. PrimeCanvas -- Image Editor
**File:** `src/components/os/PrimeCanvasApp.tsx`

A geometric image editor built on canvas:
- HTML Canvas element as the drawing surface
- Toolbar with tools: pencil, line, rectangle, circle, eraser, fill color picker
- Color palette with PRIME OS theme colors (primary, violet, amber, green)
- Layer panel on the right (simulated -- "Background", "Layer 1", "Layer 2")
- Geometric filter buttons: "Lattice Overlay", "Prime Spiral", "Adinkra Grid"
- Brush size slider
- Undo/redo with simple state history
- Canvas dimensions shown in status bar

### 5. PrimeComm -- Phone Simulator
**File:** `src/components/os/PrimeCommApp.tsx`

A mobile device UI simulator:
- Phone frame (rounded rectangle with notch) rendered inside the window
- Three tabs at the bottom: Calls, Messages, Contacts
- Contacts list with simulated lattice-themed names ("Node Alpha", "Sector 7 Admin")
- Message thread view with chat bubbles
- Dial pad with number display and call/hangup buttons
- Incoming call animation (simulated, triggered randomly)
- Status bar inside the phone showing signal, battery, time

### 6. PrimeMaps -- Topological Map
**File:** `src/components/os/PrimeMapsApp.tsx`

A map viewer showing the lattice topology:
- SVG-based map with nodes as circles and edges as curves
- Nodes represent lattice regions with labels and coordinates
- Pan by dragging, zoom with scroll wheel (transform-based)
- Click a node to see details in a side panel (name, coord, load, connections)
- Search box to filter/highlight nodes
- Layer toggles: "Nodes", "Edges", "Labels", "Heat Map"
- Heat map overlay coloring nodes by load (green to red gradient)
- Legend in the corner

### 7. PrimePkg -- Package Manager
**File:** `src/components/os/PrimePkgApp.tsx`

A visual package/module manager:
- List of installed "packages" with name, version, size, status
- Categories: "Core", "Network", "Compute", "Storage", "Security"
- Search/filter bar at top
- Each package row shows: name, version, installed size, status (installed/update available/not installed)
- "Install", "Update", "Remove" action buttons per package
- Activity log at the bottom showing recent operations
- Summary bar: total packages, disk usage, last sync time

### 8. PrimeAudio -- Audio Player
**File:** `src/components/os/PrimeAudioApp.tsx`

A media player with waveform visualization:
- Playlist on the left with track names (geometric/lattice-themed: "Harmonic Fold", "Qutrit Resonance")
- Main area with an animated SVG waveform visualization
- Transport controls: play/pause, prev, next, shuffle, repeat
- Progress bar with time display (simulated, auto-advancing when playing)
- Volume slider
- Track info display: title, "artist" (lattice subsystem), duration
- Equalizer bars animation (CSS-based)

---

## System Registration (all 8 apps)

### `src/types/os.ts`
Add to AppType union: `'docs' | 'spreadsheet' | 'schemaforge' | 'canvas' | 'comm' | 'maps' | 'pkg' | 'audio'`

### `src/hooks/useWindowManager.ts`
Add default sizes:
- docs: 750x500
- spreadsheet: 850x520
- schemaforge: 800x550
- canvas: 780x520
- comm: 380x600
- maps: 800x550
- pkg: 700x480
- audio: 650x400

### `src/components/os/Desktop.tsx`
- Import all 8 new app components
- Add cases to `renderApp` switch

### `src/components/os/Taskbar.tsx`
- Add 8 entries to `allApps` array with icons from lucide-react

### `src/components/os/DesktopIcons.tsx`
- Add 8 entries to the icons array

### `src/components/os/terminal/commands.ts`
- Add entries to `APP_MAP` and update `HELP_TEXT` with `open` app names

### `src/hooks/useNotifications.ts`
- Add notification events for new apps where relevant (docs, spreadsheet, schemaforge, audio)

---

## Icon Mapping (lucide-react)

| App | Icon |
|-----|------|
| PrimeDocs | `BookOpen` |
| PrimeGrid | `Table` |
| SchemaForge | `Workflow` |
| PrimeCanvas | `Paintbrush` |
| PrimeComm | `Smartphone` |
| PrimeMaps | `Map` |
| PrimePkg | `Package` |
| PrimeAudio | `Music` |

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/os/PrimeDocsApp.tsx` | Create |
| `src/components/os/PrimeGridApp.tsx` | Create |
| `src/components/os/SchemaForgeApp.tsx` | Create |
| `src/components/os/PrimeCanvasApp.tsx` | Create |
| `src/components/os/PrimeCommApp.tsx` | Create |
| `src/components/os/PrimeMapsApp.tsx` | Create |
| `src/components/os/PrimePkgApp.tsx` | Create |
| `src/components/os/PrimeAudioApp.tsx` | Create |
| `src/types/os.ts` | Edit -- extend AppType |
| `src/hooks/useWindowManager.ts` | Edit -- add window sizes |
| `src/components/os/Desktop.tsx` | Edit -- imports + renderApp cases |
| `src/components/os/Taskbar.tsx` | Edit -- add to allApps |
| `src/components/os/DesktopIcons.tsx` | Edit -- add icons |
| `src/components/os/terminal/commands.ts` | Edit -- add to APP_MAP |
| `src/hooks/useNotifications.ts` | Edit -- add notification events for new apps |

## Technical Notes

- All apps are self-contained with no external API calls -- all data is simulated/generated
- Each app follows the existing pattern: full-height flex layout, `bg-background`, `font-mono text-xs`, border/card styling
- Canvas app uses HTML5 Canvas API with React refs for drawing
- SchemaForge uses SVG for the ER diagram with drag via mouse events
- PrimeMaps uses SVG transforms for pan/zoom
- PrimeAudio waveform uses animated SVG paths with `requestAnimationFrame`
- PrimeComm phone frame is pure CSS with a fixed aspect ratio container
- No new dependencies required -- all built with React, lucide-react, and existing UI primitives
