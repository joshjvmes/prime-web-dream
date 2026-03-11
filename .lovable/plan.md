

# Fix ROKCAT App Open Commands Not Firing

## Problem

ROKCAT correctly generates `[ACTION:open-app:XYZ]` tags, and `parseAndExecuteActions` emits `app.request-open` events on the EventBus. However, `Desktop.tsx` has an `APP_NAME_MAP` that maps these event app IDs to actual window types — and **17 apps are missing from that map**.

When ROKCAT says "open signals" it emits `app.request-open: { app: 'signals' }`, Desktop receives it, looks up `APP_NAME_MAP['signals']` — gets `undefined` — and silently does nothing.

## Missing Entries

These apps exist in ROKCAT's `AVAILABLE_APPS` but are absent from `APP_NAME_MAP`:

| ROKCAT ID | AppType | Title |
|-----------|---------|-------|
| `spreadsheet` / `grid` | `spreadsheet` | PrimeGrid |
| `comm` / `phone` | `comm` | PrimeComm |
| `link` / `videocall` | `videocall` | PrimeLink |
| `net` / `primenet` | `primenet` | PrimeNet (missing `net` alias) |
| `pkg` | `pkg` | PrimePkg |
| `storage` | `storage` | Prime Storage |
| `signals` | `signals` | PrimeSignals |
| `stream` | `stream` | PrimeStream |
| `booking` / `book` | `booking` | PrimeBooking |
| `iot` / `devices` | `iot` | PrimeIoT |
| `robotics` / `robots` | `robotics` | PrimeRobotics |
| `bets` | `bets` | PrimeBets |
| `schemaforge` / `schema` | `schemaforge` | SchemaForge |
| `processes` | `processes` | Processes |
| `sysinfo` | `sysinfo` | System Info |
| `q3inference` / `q3` | `q3inference` | Q3 Inference |
| `energy` | `energy` | Energy Monitor |
| `foldmem` | `foldmem` | FoldMem |
| `datacenter` | `datacenter` | LatticeCore |
| `cloudhooks` / `hooks` | `cloudhooks` | Cloud Hooks |
| `hypersphere` | `hypersphere` | Hyper AI (missing alias) |

## Fix

**Single file change**: `src/components/os/Desktop.tsx`

Add all missing entries to `APP_NAME_MAP` (lines 81-117), including aliases. This ensures every app ID that ROKCAT can emit is recognized by Desktop and opens the correct window.

No other changes needed — the EventBus wiring, action parser, and app renderers all work correctly already. The gap is purely this lookup table.

