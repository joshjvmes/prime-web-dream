

# Connect All Upgraded Apps to Hyper AI and PrimeAgent

## Overview

Add 10 new AI tools to the `hyper-chat` edge function so Hyper can interact with PrimeSignals, PrimeVault, PrimeCanvas, PrimeBooking, PrimeComm, and PrimeAudio. Also upgrade PrimeAgent to recognize commands for all 6 apps.

---

## What Changes

### 1. Edge Function: `hyper-chat/index.ts`

Add these new tool definitions to the existing `TOOLS` array:

| Tool | Description | Execution |
|------|-------------|-----------|
| `get_market_data` | Fetch live stock prices for given tickers | Server-side: calls `market-data` edge function |
| `get_stock_chart` | Get historical price chart for a ticker | Server-side: calls `market-data` edge function |
| `check_portfolio` | View the user's vault holdings with live prices | Server-side: reads `vault_holdings` + calls `market-data` |
| `trade_stock` | Buy or sell a stock in the vault | Server-side: inserts/updates `vault_holdings` and `vault_transactions`, charges wallet |
| `create_booking` | Book a resource with conflict detection | Server-side: calls `check_booking_conflict`, inserts into `bookings` |
| `list_bookings` | List upcoming bookings | Server-side: reads `bookings` table |
| `cancel_booking` | Cancel one of the user's bookings | Server-side: deletes from `bookings` |
| `send_message` | Send a DM to another user via PrimeComm | Server-side: inserts into `chat_messages` |
| `list_conversations` | List recent DM conversations | Server-side: reads `chat_messages` grouped by channel |
| `control_audio` | Play, pause, skip, or change volume on PrimeAudio | Client-side: returns tool call for frontend EventBus |

Update the system prompt to tell Hyper about these new capabilities:
- Market data analysis and stock price lookup
- Portfolio management (view holdings, buy/sell real stocks)
- Resource booking with conflict awareness
- Direct messaging to other users
- Music/ambient audio control

Add server-side execution functions for each tool, following the existing pattern used by `executeFinancialTool`.

### 2. Frontend: `HypersphereApp.tsx`

Add client-side handling for the new tool call responses:

- `get_market_data` / `get_stock_chart` / `check_portfolio`: Display the data inline in the chat as formatted text (the edge function returns the reply string)
- `trade_stock`: Emit `trade.executed` event, show confirmation
- `create_booking` / `cancel_booking`: Emit new `booking.created` / `booking.cancelled` events
- `list_bookings` / `list_conversations`: Display data inline
- `send_message`: Emit `social.post.created` or similar event
- `control_audio`: Emit a new `audio.control` EventBus event that PrimeAudio listens to

Add new permission toggle: **Booking** (controls create/cancel booking)

Update `AgentAction` type to include new action types.

### 3. Frontend: `PrimeAgentApp.tsx`

Expand the keyword parser and quick commands:

New quick commands:
- "Check Markets" -- opens PrimeSignals, fetches live ticker summary
- "My Portfolio" -- opens PrimeVault, shows holdings
- "Book Resource" -- opens PrimeBooking
- "Play Music" -- opens PrimeAudio, starts playback
- "Send Message" -- opens PrimeComm

Add app titles for the 6 new apps to `APP_TITLES`:
```text
signals: 'PrimeSignals', vault: 'PrimeVault', canvas: 'PrimeCanvas',
booking: 'PrimeBooking', comm: 'PrimeComm', audio: 'PrimeAudio'
```

Add keyword detection for market/stock/price/portfolio/booking/schedule/music/draw/message/chat.

### 4. Frontend: `PrimeAudioApp.tsx`

Add an EventBus listener for `audio.control` events so Hyper can remotely control playback:

```text
eventBus.on('audio.control', ({ action, track, volume }) => { ... })
```

Supported actions: play, pause, skip, set-volume, play-track (by name).

### 5. EventBus: `useEventBus.ts`

Add new event types:
```text
'booking.created', 'booking.cancelled', 'audio.control', 'market.checked'
```

---

## Technical Details

### New Tool Definitions (added to TOOLS array in hyper-chat)

**get_market_data**
- Parameters: `symbols` (string, comma-separated tickers, optional -- defaults to watchlist)
- Server execution: calls `market-data?action=get-tickers&symbols=...`
- Returns formatted price table as reply

**get_stock_chart**
- Parameters: `ticker` (string), `days` (number, default 7)
- Server execution: calls `market-data?action=get-chart&ticker=...&from=...&to=...`
- Returns summary with high/low/trend as reply

**check_portfolio**
- Parameters: none
- Server execution: reads `vault_holdings` for user, fetches live prices from `market-data`
- Returns portfolio summary with P/L as reply

**trade_stock**
- Parameters: `symbol` (string), `action` ("buy"|"sell"), `quantity` (number)
- Server execution: fetches current price from `market-data`, charges/credits wallet via `prime-bank`, upserts `vault_holdings`, inserts `vault_transactions`
- Returns trade confirmation as reply

**create_booking**
- Parameters: `resource` (string), `start` (ISO datetime), `duration_minutes` (number), `purpose` (string)
- Server execution: calls `check_booking_conflict` RPC, inserts into `bookings`
- Returns confirmation or conflict warning

**list_bookings**
- Parameters: `upcoming_only` (boolean, default true)
- Server execution: reads `bookings` ordered by start_time
- Returns formatted list

**cancel_booking**
- Parameters: `booking_id` (string) or `resource` + `date` for fuzzy match
- Server execution: deletes from `bookings` (only user's own)
- Returns confirmation

**send_message**
- Parameters: `to_name` (string), `message` (string)
- Server execution: looks up user in `profiles`, inserts into `chat_messages` with channel `dm-{sorted_ids}`
- Returns confirmation

**list_conversations**
- Parameters: none
- Server execution: reads recent `chat_messages` for user, grouped by channel
- Returns formatted conversation list

**control_audio**
- Parameters: `action` ("play"|"pause"|"skip"|"volume"), `track_name` (string, optional), `volume` (number, optional)
- Client-side tool: returned to frontend, which emits EventBus event
- PrimeAudio listens and responds

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/hyper-chat/index.ts` | Add 10 tool definitions, execution functions, update system prompt |
| `src/components/os/HypersphereApp.tsx` | Handle new tool call responses, add permission toggle |
| `src/components/os/PrimeAgentApp.tsx` | Add 6 apps to parser, new quick commands |
| `src/components/os/PrimeAudioApp.tsx` | Add EventBus listener for remote control |
| `src/hooks/useEventBus.ts` | Add new event types |

### Execution Order

1. Update `useEventBus.ts` with new event types
2. Update `hyper-chat/index.ts` with all new tools and execution logic
3. Update `HypersphereApp.tsx` to handle new tool responses
4. Update `PrimeAgentApp.tsx` with expanded commands
5. Update `PrimeAudioApp.tsx` with EventBus listener

