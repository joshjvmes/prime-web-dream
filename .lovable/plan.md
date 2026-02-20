

# New Apps: Betting Platform, Stock Analysis, Live Data Processing + Inspirations from Your Projects

## Overview

Adding 5 new applications inspired by your existing projects ([Gilded Bets](/projects/e653923b-bfd3-400b-befa-bb25610ef9b0), [RokcatSignals](/projects/6fe25ea6-528e-450a-9d7f-10bfe19a45d7), [Phiam](/projects/978a3ee4-5b9b-4f49-8dd3-54de00910212), [Rocket Club](/projects/84103745-291b-4ade-92d1-7be6289264dd)) and your suggestions. All self-contained with simulated data, following existing PRIME OS patterns.

---

## Inspiration from Your Projects

| Project | What it has | What we can adapt |
|---------|------------|-------------------|
| **Gilded Bets** | Prediction markets, order book, price charts, betting modal, parlay builder, leverage selector | Betting/prediction market app |
| **RokcatSignals** | Trading signals dashboard, live price indicators, signal cards with entry/target/stop-loss, conviction levels | Stock/signal analysis app |
| **Phiam** | Deal rooms, cap tables, portfolio tracking, term sheet editor, valuation tools, video conferencing, treasury | Portfolio tracker, deal room, video calling |
| **Rocket Club** | Investment club dashboard, investor views, document previews | Investment dashboard patterns |

---

## New Apps

### 1. PrimeBets -- Prediction Market
**File:** `src/components/os/PrimeBetsApp.tsx`

A lattice-themed prediction market platform (inspired by Gilded Bets):
- Market list with categories: "Lattice Events", "Compute", "Energy", "Network"
- Each market shows a question, YES/NO prices, volume, and expiry
- Click a market to see detail view with:
  - Price chart (recharts AreaChart with YES/NO lines, time range selectors)
  - Order book (bid/ask depth bars, animated)
  - Betting panel: YES/NO toggle, amount input, quick amounts, shares/payout calc
- Simulated wallet balance display
- Portfolio tab showing open positions with P&L
- Activity feed of recent "trades"

### 2. PrimeSignals -- Stock/Signal Analysis
**File:** `src/components/os/PrimeSignalsApp.tsx`

A trading signal dashboard (inspired by RokcatSignals):
- Signal cards showing: symbol, direction (up/down arrow), entry price, target, stop-loss
- Conviction level badges (High/Medium/Low) with color coding
- Live price ticker ribbon at top (simulated, cycling through symbols)
- Analytics panel: win rate, avg return, risk/reward ratios (recharts)
- Signal creation form: symbol selector, direction, prices, conviction
- Chart view per signal with entry/target/stop-loss lines drawn on price data
- Watchlist sidebar with simulated price updates

### 3. PrimeStream -- Live Data Processor
**File:** `src/components/os/PrimeStreamApp.tsx`

A real-time data pipeline monitor:
- Pipeline list on the left: "Lattice Telemetry", "Qutrit State Stream", "Energy Flow", "Network Packets"
- Main area shows live-updating data table (rows appearing, old rows fading)
- Throughput metrics: events/sec, latency, error rate (animated counters)
- Mini sparkline charts for each pipeline metric
- Filter/query bar to filter the stream (simulated grep-like)
- Pause/resume stream toggle
- Schema viewer showing the data shape of each pipeline
- Alert rules panel: set thresholds that trigger visual warnings

### 4. PrimeVault -- Portfolio Tracker
**File:** `src/components/os/PrimeVaultApp.tsx`

An investment/asset portfolio dashboard (inspired by Phiam + Rocket Club):
- Portfolio summary: total value, daily change, allocation pie chart
- Holdings table: asset name, quantity, avg cost, current price, P&L, weight %
- Performance chart: portfolio value over time (recharts LineChart)
- Allocation donut chart by category (Compute, Energy, Network, Storage)
- Transaction history log
- "Add Position" form
- Benchmark comparison toggle (vs "Lattice Index")

### 5. PrimeLink -- Video Calling
**File:** `src/components/os/PrimeLinkApp.tsx`

A video calling interface (inspired by Phiam's video conferencing):
- Pre-call screen: camera preview (simulated with SVG avatar), mic/camera toggles, "Join Call" button
- In-call view: main video area (large SVG with animated waveform showing "speaking"), participant grid
- Participant list sidebar with status indicators (muted, screen sharing)
- Control bar: mute, camera, screen share, chat, end call
- Chat panel sliding in from right
- Call timer display
- Screen share mode (simulated: shows a mock desktop thumbnail)
- Meeting info panel with link/code

---

## System Registration

### `src/types/os.ts`
Add to AppType: `'bets' | 'signals' | 'stream' | 'vault' | 'videocall'`

### `src/hooks/useWindowManager.ts`
Default sizes:
- bets: 850x550
- signals: 800x520
- stream: 820x500
- vault: 780x520
- videocall: 750x550

### `src/components/os/Desktop.tsx`
Import all 5 new components, add cases to `renderApp` switch

### `src/components/os/Taskbar.tsx`
Add entries to `allApps` array

### `src/components/os/DesktopIcons.tsx`
Add entries to desktop icons

### `src/components/os/terminal/commands.ts`
Add to `APP_MAP`

### `src/hooks/useNotifications.ts`
Add notification events for bets (market resolved), signals (new signal triggered), stream (pipeline alert), vault (price alert)

---

## Icon Mapping (lucide-react)

| App | Icon |
|-----|------|
| PrimeBets | `Dices` |
| PrimeSignals | `TrendingUp` |
| PrimeStream | `Radio` |
| PrimeVault | `Vault` |
| PrimeLink | `Video` |

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/os/PrimeBetsApp.tsx` | Create |
| `src/components/os/PrimeSignalsApp.tsx` | Create |
| `src/components/os/PrimeStreamApp.tsx` | Create |
| `src/components/os/PrimeVaultApp.tsx` | Create |
| `src/components/os/PrimeLinkApp.tsx` | Create |
| `src/types/os.ts` | Edit -- extend AppType |
| `src/hooks/useWindowManager.ts` | Edit -- add window sizes |
| `src/components/os/Desktop.tsx` | Edit -- imports + renderApp |
| `src/components/os/Taskbar.tsx` | Edit -- add to allApps |
| `src/components/os/DesktopIcons.tsx` | Edit -- add icons |
| `src/components/os/terminal/commands.ts` | Edit -- add to APP_MAP |
| `src/hooks/useNotifications.ts` | Edit -- add events |

## Technical Notes

- All apps use simulated data only -- no real API connections
- PrimeBets price chart uses recharts (already installed) with AreaChart for YES/NO price visualization
- PrimeSignals uses recharts for sparklines and analytics charts
- PrimeStream uses `setInterval` to simulate incoming data rows with fade-in animations
- PrimeVault uses recharts PieChart for allocation and LineChart for performance
- PrimeLink uses SVG-based "video" placeholders with animated waveforms for speaking indicators
- Patterns drawn from your Gilded Bets order book depth bars, RokcatSignals signal card layout, and Phiam portfolio structure
- No new dependencies needed -- all built with React, recharts, lucide-react, and existing UI primitives

