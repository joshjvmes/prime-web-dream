

# Deep Canvas Layers + Advanced Spreadsheet + AI Integration

## Overview

Upgrade PrimeCanvas with a proper layer system (add/remove/reorder layers, per-layer opacity and visibility, blend modes) and PrimeGrid with advanced features (cell formatting, charts, named ranges, multi-select). Then wire both apps into Hyper AI and PrimeAgent so the AI can programmatically create drawings and populate spreadsheets.

---

## 1. PrimeCanvas -- Layer System

### New Layer Architecture

Replace the single-canvas approach with a multi-canvas stack where each layer is its own off-screen canvas composited onto a display canvas.

**Layer data model:**
```text
Layer {
  id: string
  name: string
  opacity: number (0-1)
  visible: boolean
  blendMode: string (normal, multiply, screen, overlay, etc.)
  canvas: OffscreenCanvas (runtime only)
}
```

**New UI -- Layers Panel** (right side, replaces Gallery when open):
- Layer list with drag-to-reorder
- Per-layer visibility toggle (eye icon)
- Per-layer opacity slider
- Blend mode dropdown per layer
- Add / Delete / Duplicate / Merge Down buttons
- Active layer highlight
- Layer thumbnail preview (miniature render updated on draw)

**Drawing changes:**
- All drawing operations target the active layer's offscreen canvas
- A composite function renders all visible layers (bottom-to-top) onto the main display canvas after every stroke
- Undo/redo stores per-layer ImageData snapshots
- Eraser erases on the active layer only (with transparency, not background color)
- Clear clears active layer only (with option for "clear all layers")

**New tools:**
- Fill bucket (flood fill on active layer)
- Color picker / eyedropper (sample from composite view)
- Text tool (basic text placement on active layer)
- Selection tool (rectangular select, move selected region)

**Transparency support:**
- Canvas background becomes a checkerboard pattern (standard transparency indicator)
- Each layer initialized with `clearRect` (transparent) instead of solid fill
- Export PNG flattens all layers; export with transparency option available

**Gallery integration:**
- Save now stores layer data as JSON metadata alongside the flattened PNG
- Load restores layers when metadata exists, otherwise loads as single layer

---

## 2. PrimeGrid -- Advanced Spreadsheet

### New Features

**Cell formatting:**
- Bold, italic, text color, background color per cell
- Number formatting (currency, percentage, decimal places)
- Cell data model expands to store both value and format metadata
- Format toolbar row below formula bar

**Charts:**
- Select a range, click "Chart" to insert a mini inline chart
- Chart types: bar, line, pie (using recharts, already installed)
- Charts stored as special objects in the workbook
- Charts panel on the side to manage/edit charts

**Named ranges:**
- Define named ranges (e.g., "Revenue" = B2:B10)
- Use named ranges in formulas: `=SUM(Revenue)`
- Named range manager in a dropdown

**New formulas:**
- `CONCAT(A1, " ", B1)` -- string concatenation
- `ROUND(val, decimals)` -- rounding
- `ABS(val)` -- absolute value
- `VLOOKUP(search, range, col_idx)` -- vertical lookup
- `SPARKLINE(range)` -- inline mini chart in cell

**Multi-cell selection:**
- Click and drag to select a range
- Status bar shows SUM, AVG, COUNT of selected range
- Copy/paste selected range

**Freeze rows/columns:**
- Freeze header row (row 1) option
- Frozen rows stay visible when scrolling

---

## 3. AI Integration -- Canvas Tools

### New Hyper AI Tools

**`draw_on_canvas`**
- Parameters: `instructions` (string describing what to draw), `clear_first` (boolean)
- Execution: Client-side tool. Returns instructions to the frontend, which uses Canvas 2D API to programmatically draw shapes, patterns, text based on parsed instructions
- The AI generates a series of drawing commands (JSON): lines, rects, circles, arcs, text, fills with colors/positions/sizes
- Frontend parses and executes on active canvas layer

**`generate_canvas_art`**
- Parameters: `style` (geometric, abstract, fractal, pattern, circuit), `palette` (warm, cool, neon, mono, prime)
- Execution: Client-side procedural generation -- the frontend has preset algorithms for each style that create complex generative art
- Styles: geometric grids, Fibonacci spirals, Voronoi patterns, circuit board traces, fractal trees

### Canvas EventBus Integration

- `canvas.draw` event: PrimeCanvasApp listens and executes drawing commands
- `canvas.clear` event: clears active layer
- `canvas.add-layer` event: adds a new layer
- PrimeAgent "Generate Art" quick command added

---

## 4. AI Integration -- Spreadsheet Tools

### New Hyper AI Tools

**`create_spreadsheet`**
- Parameters: `name` (string), `headers` (string[]), `rows` (string[][])
- Execution: Client-side tool. Creates a new sheet in the active workbook and populates it with data
- EventBus event: `spreadsheet.create`

**`update_cells`**
- Parameters: `sheet` (string), `cells` (Record of cell key to value, e.g. {"A1": "Revenue", "B1": "=SUM(B2:B10)"})
- Execution: Client-side tool. Updates specific cells in a named sheet
- EventBus event: `spreadsheet.update`

**`read_spreadsheet`**
- Parameters: `sheet` (string, optional)
- Execution: Server-side -- reads from cloud storage (`useCloudStorage` key)
- Returns formatted table of current spreadsheet data

**`add_chart`**
- Parameters: `sheet` (string), `range` (string like "A1:B5"), `chart_type` ("bar"|"line"|"pie"), `title` (string)
- Execution: Client-side -- inserts a chart object
- EventBus event: `spreadsheet.chart`

### Spreadsheet EventBus Integration

- `spreadsheet.create` event: PrimeGridApp listens, creates sheet with data
- `spreadsheet.update` event: updates cells
- `spreadsheet.chart` event: adds chart
- PrimeAgent "Create Report" quick command added

---

## 5. Fix Existing Bug

The `hyper-chat/index.ts` edge function references `EXTENDED_TOOLS` and `executeExtendedTool` which are never defined. These need to be added with implementations for the 10 extended tools (market data, portfolio, booking, messaging, audio) plus the new canvas/spreadsheet tools.

---

## Technical Details

### EventBus New Event Types

```text
'canvas.draw', 'canvas.clear', 'canvas.add-layer',
'spreadsheet.create', 'spreadsheet.update', 'spreadsheet.chart'
```

### Files to Modify

| File | Change |
|------|--------|
| `src/components/os/PrimeCanvasApp.tsx` | Full rewrite: multi-layer system, new tools, transparency, EventBus listener |
| `src/components/os/PrimeGridApp.tsx` | Cell formatting, charts, named ranges, multi-select, freeze rows, EventBus listener |
| `supabase/functions/hyper-chat/index.ts` | Fix missing `EXTENDED_TOOLS`/`executeExtendedTool`, add 4 new tools (draw_on_canvas, generate_canvas_art, create_spreadsheet, update_cells, read_spreadsheet, add_chart) |
| `src/components/os/HypersphereApp.tsx` | Handle new canvas/spreadsheet tool responses |
| `src/components/os/PrimeAgentApp.tsx` | Add "Generate Art" and "Create Report" quick commands, expand keyword parser |
| `src/hooks/useEventBus.ts` | Add new event types |

### New Tool Definitions for hyper-chat

**draw_on_canvas**: `{ instructions: string, clear_first?: boolean }` -- client-side, returns drawing command JSON
**generate_canvas_art**: `{ style: string, palette?: string }` -- client-side, triggers procedural generation
**create_spreadsheet**: `{ name: string, headers: string[], rows: string[][] }` -- client-side
**update_cells**: `{ sheet: string, cells: Record<string, string> }` -- client-side
**read_spreadsheet**: `{ sheet?: string }` -- server-side (reads from user_data cloud storage)
**add_chart**: `{ sheet: string, range: string, chart_type: string, title?: string }` -- client-side

### Execution Order

1. Update `useEventBus.ts` with new event types
2. Rewrite `PrimeCanvasApp.tsx` with layer system + EventBus listeners
3. Upgrade `PrimeGridApp.tsx` with formatting, charts, multi-select + EventBus listeners
4. Fix and extend `hyper-chat/index.ts` (add missing `EXTENDED_TOOLS`/`executeExtendedTool`, add 6 new tools)
5. Update `HypersphereApp.tsx` to handle new tool responses
6. Update `PrimeAgentApp.tsx` with new commands

