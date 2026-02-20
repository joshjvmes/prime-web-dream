
# Sports Betting Feed Integration

## Overview

Integrate live sports odds from The Odds API into PrimeBets. A new backend function fetches real sporting events and automatically creates prediction markets. Users can bet on real games using OS tokens through the existing AMM system.

---

## Changes

### 1. Store the API Key as a Secret

The Odds API key (`7c5de5e58923688fb050e0ebcaa39e56`) will be stored as a backend secret called `ODDS_API_KEY` so it stays server-side only.

### 2. Database Migration -- Add Sports Metadata to `bet_markets`

Add new columns to the existing `bet_markets` table to track API-sourced events:

| Column | Type | Purpose |
|--------|------|---------|
| `source` | text (default 'user') | Distinguishes user-created vs API-fed markets |
| `external_id` | text (nullable, unique) | The Odds API event ID to prevent duplicates |
| `sport_key` | text (nullable) | e.g. 'basketball_nba', 'soccer_epl' |
| `sport_title` | text (nullable) | e.g. 'NBA', 'EPL' |
| `home_team` | text (nullable) | Home team name |
| `away_team` | text (nullable) | Away team name |
| `commence_time` | timestamptz (nullable) | When the game starts |
| `odds_data` | jsonb (nullable) | Raw bookmaker odds for reference display |

Also update the INSERT RLS policy on `bet_markets` to allow the service role to insert system-generated markets (the edge function uses service role key, so this works automatically).

### 3. New Edge Function: `sports-odds`

**File: `supabase/functions/sports-odds/index.ts`**

Two actions:

- **`fetch-odds`**: Calls The Odds API for upcoming events, then upserts markets into `bet_markets` with:
  - `question`: "Will {home_team} beat {away_team}?"
  - `category`: 'sports'
  - `source`: 'sports_api'
  - `external_id`: event ID (prevents duplicates)
  - `creator_id`: system UUID (`00000000-0000-0000-0000-000000000000`)
  - `creation_cost`: 0
  - `expiry`: set to `commence_time`
  - `odds_data`: bookmaker odds JSON
  - If a market with that `external_id` already exists, update `odds_data` only

- **`refresh-odds`**: Frontend-callable endpoint that triggers fetch-odds with a 5-minute rate limit (tracked via a simple timestamp check against the most recent sports market's `created_at`)

### 4. Frontend Updates: `PrimeBetsApp.tsx`

- Add `'sports'` to the `CATEGORIES` array
- Add a "Refresh Sports" button that calls the `sports-odds` edge function
- For sports-sourced markets, show enhanced cards with:
  - Sport badge (e.g. "NBA", "Soccer")
  - Team matchup display: "{home_team} vs {away_team}"
  - Commence time countdown (e.g. "Starts in 3h")
  - Bookmaker reference odds alongside the pool YES/NO odds
  - A small "LIVE" indicator
- In the market detail view, show bookmaker odds comparison when `odds_data` is present
- Sports markets hide the "Resolve" buttons (admin-only resolution)

### 5. Config Update

Register the new function in `supabase/config.toml`:
```
[functions.sports-odds]
verify_jwt = false
```

---

## Technical Details

### Files to Create/Modify

| File | Change |
|------|--------|
| Database migration | Add 8 new columns to `bet_markets` |
| `supabase/functions/sports-odds/index.ts` | New edge function to fetch and sync odds |
| `src/components/os/PrimeBetsApp.tsx` | Sports category, enhanced cards, refresh button, odds display |
| `supabase/config.toml` | Register new function |

### BetMarket Interface Update

The `BetMarket` TypeScript interface will be extended with the new optional fields:

```text
source?: string
external_id?: string
sport_key?: string
sport_title?: string
home_team?: string
away_team?: string
commence_time?: string
odds_data?: { bookmakers: Array<{ title: string, markets: Array<{ outcomes: Array<{ name: string, price: number }> }> }> }
```

### Odds Display Logic

American odds from bookmakers are converted to implied probability for display:
- Negative odds (favorite): probability = |odds| / (|odds| + 100)
- Positive odds (underdog): probability = 100 / (odds + 100)

These are shown as "Book: 65%" alongside the pool-based "Pool: 58%" for reference.

### How Sports Markets Work

1. Edge function fetches events and creates markets with home team as YES side
2. Users bet YES (home wins) or NO (away wins) using OS tokens
3. The AMM pool determines payout ratios independently of bookmaker odds
4. Markets auto-expire at commence time (no new bets after game starts)
5. Resolution is manual (admin/creator resolves after the game ends)

### Rate Limiting

The refresh endpoint checks if the newest sports market was created less than 5 minutes ago. If so, it skips the API call and returns existing markets to conserve API quota.
