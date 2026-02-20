

# Upgrade 6 Mockup Apps to Full Utility

## Overview

Transform six mockup-level apps into fully functional utilities by adding real data feeds, database persistence, and browser APIs. The Polygon.io API key will be stored as a backend secret for real market data powering PrimeSignals and PrimeVault.

---

## 1. PrimeSignals -- Live Market Data

**Goal**: Replace hardcoded fake tickers with real stock/crypto prices from Polygon.io.

### Backend

- Store `POLYGON_API_KEY` as a secret
- New edge function: `market-data/index.ts`
  - `get-tickers`: Fetches real-time grouped daily bars from Polygon (`/v2/aggs/grouped/locale/us/market/stocks/{date}`) for a curated watchlist (AAPL, TSLA, NVDA, AMZN, MSFT, GOOG, META, AMD)
  - `get-snapshot`: Fetches ticker snapshots (`/v2/snapshot/locale/us/markets/stocks/tickers`) for live price + change data
  - `get-chart`: Fetches aggregate bars (`/v2/aggs/ticker/{ticker}/range/1/hour/{from}/{to}`) for individual stock charts
  - 5-minute client-side cache to avoid hitting API limits
- Register in `config.toml` with `verify_jwt = false`

### Frontend Changes (`PrimeSignalsApp.tsx`)

- Replace `TICKER_BASE` with live data fetched on mount via the edge function
- Replace random ticker interval with periodic refresh (every 60s) from the API
- Signal detail chart uses real historical bars instead of `generateSignalChart()`
- Add a "LIVE" badge when data is fresh, "DELAYED" when cached
- Keep the existing signals system (entry/target/stop) but overlay real price data
- Add loading skeleton while fetching

---

## 2. PrimeVault -- Persistent Portfolio

**Goal**: Save holdings to the database and pull live prices from the same market-data function.

### Database Migration

New table: `vault_holdings`

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid (PK) | |
| user_id | uuid | Owner |
| symbol | text | Ticker symbol |
| name | text | Display name |
| category | text | Asset category |
| quantity | numeric | Shares held |
| avg_cost | numeric | Average cost basis |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: Users can CRUD own holdings only.

New table: `vault_transactions`

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid (PK) | |
| user_id | uuid | Owner |
| symbol | text | Ticker |
| tx_type | text | 'buy' or 'sell' |
| quantity | numeric | |
| price | numeric | Execution price |
| created_at | timestamptz | |

RLS: Users can insert and read own transactions.

### Frontend Changes (`PrimeVaultApp.tsx`)

- Load holdings from `vault_holdings` table on mount (fall back to hardcoded data for guests)
- Fetch live prices from the `market-data` edge function for current holdings
- "Buy" and "Sell" buttons on the holdings tab that update the database
- Transactions tab reads from `vault_transactions` instead of hardcoded array
- Performance chart uses real historical data from Polygon aggregates
- Allocation pie chart computed from live data
- Use `useCloudStorage` pattern for guest fallback

---

## 3. PrimeCanvas -- Cloud Save

**Goal**: Save and load drawings to/from cloud storage.

### Backend

- Use existing `user-files` storage bucket for canvas images
- Use `user_data` table (key: `canvas-saves`) to store save metadata (name, thumbnail path, created_at)

### Frontend Changes (`PrimeCanvasApp.tsx`)

- "Save" button: exports canvas to PNG blob, uploads to `user-files` bucket under `canvas/{userId}/{timestamp}.png`, saves metadata to `user_data`
- "Load" button: opens a modal listing saved canvases with thumbnails, click to load
- "Gallery" panel replaces the static Layers panel (layers were non-functional)
- Auto-save every 2 minutes if changes detected (debounced)
- Guest users: saves to localStorage as base64 (existing pattern)
- Show save status indicator ("Saved" / "Unsaved changes")

---

## 4. PrimeBooking -- Database-Backed Scheduling

**Goal**: Persist bookings and add conflict detection.

### Database Migration

New table: `bookings`

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid (PK) | |
| user_id | uuid | Creator |
| resource | text | Resource name |
| start_time | timestamptz | Booking start |
| end_time | timestamptz | Booking end |
| purpose | text | Description |
| priority | text | low/medium/high |
| created_at | timestamptz | |

RLS: All authenticated users can view all bookings (shared resource visibility). Users can insert, update, and delete own bookings.

Add a database function `check_booking_conflict` that checks for overlapping bookings on the same resource.

### Frontend Changes (`PrimeBookingApp.tsx`)

- Load bookings from database on mount
- Create booking writes to database with conflict check
- Cancel booking deletes from database
- Real-time subscription: `ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings` so all users see updates live
- Show conflict warning when creating overlapping bookings
- Add "Booked by: [username]" display using profiles table
- Guest fallback to localStorage

---

## 5. PrimeComm -- Real Messaging

**Goal**: Enable real user-to-user messaging using the existing `chat_messages` infrastructure.

### Frontend Changes (`PrimeCommApp.tsx`)

- Replace hardcoded `CONTACTS` with real users from `profiles` table
- Replace hardcoded `THREADS` with messages from `chat_messages` table (using channel = `dm-{sortedUserIds}`)
- Message input box at the bottom of conversations that inserts into `chat_messages`
- Real-time subscription on `chat_messages` for live message delivery
- "Calls" tab: keep as decorative (VoIP is out of scope) but show call history from a simple log
- Contact list shows online status from `chat_presence` table
- Unread message count badges on contacts
- Guest mode: show demo data with a "Sign in to message" prompt

---

## 6. PrimeAudio -- Procedural Synth Engine

**Goal**: Generate real audio using the Web Audio API instead of silent visual-only playback.

### Frontend Changes (`PrimeAudioApp.tsx`)

- Create an `AudioContext` on first play interaction
- Each track generates a unique procedural soundscape using oscillators + filters:
  - "Harmonic Fold": layered sine waves with slow LFO modulation
  - "Qutrit Resonance": three detuned oscillators (qutrit = 3-state)
  - "Geodesic Flow": filtered noise with resonant sweeps
  - "Adinkra Pulse": rhythmic kick pattern with sub-bass
  - "Fibonacci Drift": arpeggiated sequence following Fibonacci intervals
  - "Dimensional Echo": delay-feedback chain with reverb
  - "Prime Spiral": frequency spiral through prime-numbered harmonics
  - "Over-Unity Hum": deep drone with harmonic overtones
- Volume slider controls `GainNode`
- Progress bar reflects actual playback position
- Waveform visualization driven by `AnalyserNode` (real FFT data instead of Math.sin)
- Equalizer bars show real frequency spectrum data
- Play/pause actually starts/stops audio
- Track skip crossfades between soundscapes

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/market-data/index.ts` | Polygon.io proxy for live market data |
| Database migration | `vault_holdings`, `vault_transactions`, `bookings` tables |

### Files to Modify

| File | Change |
|------|---------|
| `src/components/os/PrimeSignalsApp.tsx` | Live tickers, real charts, API integration |
| `src/components/os/PrimeVaultApp.tsx` | DB persistence, live prices, buy/sell |
| `src/components/os/PrimeCanvasApp.tsx` | Cloud save/load, gallery panel |
| `src/components/os/PrimeBookingApp.tsx` | DB CRUD, realtime, conflict detection |
| `src/components/os/PrimeCommApp.tsx` | Real messaging via chat_messages |
| `src/components/os/PrimeAudioApp.tsx` | Web Audio API synth engine |
| `supabase/config.toml` | Register market-data function |

### Secret

- `POLYGON_API_KEY`: stored as backend secret, used only in the `market-data` edge function

### API Rate Limiting Strategy

Polygon.io free tier allows 5 calls/minute. The edge function will:
- Cache responses in-memory for 5 minutes
- Batch ticker requests using grouped endpoints
- Frontend polls every 60 seconds (not real-time WebSocket)

### Execution Order

1. Store the Polygon API key as a secret
2. Create database migration (3 new tables + RLS + realtime)
3. Build the `market-data` edge function
4. Update PrimeSignals (depends on market-data)
5. Update PrimeVault (depends on market-data + new tables)
6. Update PrimeCanvas (independent)
7. Update PrimeBooking (depends on new tables)
8. Update PrimeComm (uses existing tables)
9. Update PrimeAudio (fully independent, no backend)

