

# App Forge Marketplace and Stock Exchange

## Overview

Two major systems that merge together: (1) an **App Forge** where users create, publish, and monetize mini-apps, and (2) a **real stock market exchange** where published apps become tradeable listings that users invest OS tokens in -- plus a prediction market upgrade for PrimeBets that uses real OS tokens.

---

## Part 1: App Forge -- Publish Mini-Apps to Market

Upgrade the existing MiniApps system from a private gallery into a public marketplace called the **App Forge**.

### New Database Table: `forge_listings`

Stores publicly published mini-apps that any user can browse, install, and invest in.

```text
forge_listings
  id: uuid (PK)
  creator_id: uuid (references auth.users)
  name: text
  description: text
  icon: text (emoji)
  code: text (the React component source)
  category: text ('utility' | 'game' | 'tool' | 'social' | 'finance' | 'other')
  version: integer (default 1)
  installs: integer (default 0)
  revenue: numeric (default 0) -- total OS earned
  price: numeric (default 0) -- install price in OS (0 = free)
  is_listed: boolean (default true) -- visible in forge
  ipo_active: boolean (default false) -- currently raising funds
  ipo_target: numeric (default 0) -- OS fundraise target
  ipo_raised: numeric (default 0) -- OS raised so far
  total_shares: integer (default 1000) -- shares issued for this app
  share_price: numeric (default 1) -- current price per share in OS
  created_at: timestamptz
  updated_at: timestamptz
```

### New Database Table: `app_shares`

Tracks who owns shares in which listed app.

```text
app_shares
  id: uuid (PK)
  user_id: uuid
  listing_id: uuid (references forge_listings)
  shares: integer
  avg_cost: numeric -- average purchase price
  created_at: timestamptz
```

### New Database Table: `share_orders`

Order book for buying/selling app shares.

```text
share_orders
  id: uuid (PK)
  user_id: uuid
  listing_id: uuid (references forge_listings)
  order_type: text ('buy' | 'sell')
  shares: integer
  price: numeric -- price per share in OS
  filled: integer (default 0)
  status: text ('open' | 'filled' | 'cancelled')
  created_at: timestamptz
```

### RLS Policies
- **forge_listings**: Anyone can SELECT (public marketplace). Only creator can INSERT. Updates go through edge function.
- **app_shares**: Users can SELECT their own shares. Admins can see all.
- **share_orders**: Users can SELECT their own orders. All open orders are visible (for the order book).

---

## Part 2: App Forge UI

### Upgrade MiniAppsApp to include Forge tabs

**Tabs:**
- **My Apps**: Current personal mini-apps (existing functionality)
- **Forge**: Public marketplace -- browse all published apps by category, search, sort by installs/price/trending
- **Create**: AI-powered app creator (calls `mini-app-gen` edge function) with a "Publish to Forge" option
- **Portfolio**: Your investments in app listings -- shares owned, P&L, dividends

### Publishing Flow
1. User creates a mini-app (via AI or manually)
2. Clicks "Publish to Forge"
3. Sets: name, description, category, install price (0 = free), and optionally launches an IPO
4. If IPO: sets a fundraise target (e.g., 50,000 OS) and issues 1,000 shares. Investors buy shares during the IPO phase. When target is reached, the app goes live and the creator receives the funds.
5. The app appears in the Forge for everyone to browse and install

### Install Flow
1. User browses Forge, finds an app they like
2. Clicks "Install" -- deducts the install price in OS from their wallet (via prime-bank)
3. The app code is saved to their personal `user-mini-apps` cloud storage
4. Creator earns the OS revenue

---

## Part 3: Stock Market Exchange

Every published Forge app with an IPO becomes a tradeable stock. Users can buy and sell shares using OS tokens.

### How It Works
- Each IPO app issues 1,000 shares at an initial price
- Share price fluctuates based on supply/demand (order book matching)
- Users place buy/sell limit orders
- The edge function matches orders: if a buy price >= a sell price, the trade executes
- Revenue metrics (installs, daily active users) influence perceived value
- Creators retain a percentage of shares (e.g., 30%) as founder shares

### PrimeBets Integration
The existing PrimeBets app gets upgraded from hardcoded mock data to real functionality:
- **App Markets**: Bet YES/NO on whether an app will hit install targets, revenue goals, etc.
- **Real OS wagers**: Bets use actual OS tokens via `prime-bank`
- Markets can be created by anyone (costs OS to create a market)
- Resolution is manual (admin or creator confirms outcome)

---

## Part 4: Edge Function Updates (`prime-bank`)

New actions added:

| Action | Description |
|--------|-------------|
| `forge-publish` | Publish an app to the Forge, optionally start IPO |
| `forge-install` | Install a Forge app (deducts OS, credits creator) |
| `forge-invest` | Buy shares in an IPO |
| `share-order` | Place a buy/sell order for app shares |
| `share-cancel` | Cancel an open order |
| `match-orders` | Execute matching orders (called after new orders) |
| `bet-place` | Place a real OS bet on a PrimeBets market |
| `bet-resolve` | Admin resolves a market, distributes winnings |

### Order Matching Logic
When a new order is placed:
1. Check for opposing orders on the same listing where buy price >= sell price
2. Execute the trade at the sell price (seller gets what they asked)
3. Transfer OS between buyer and seller wallets
4. Update share ownership in `app_shares`
5. Mark orders as filled

---

## Part 5: PrimeBets Real Markets

### New Database Table: `bet_markets`

```text
bet_markets
  id: uuid (PK)
  creator_id: uuid
  question: text
  category: text
  listing_id: uuid (nullable, links to a forge app)
  yes_pool: numeric (default 0) -- total OS bet on YES
  no_pool: numeric (default 0) -- total OS bet on NO
  status: text ('open' | 'resolved_yes' | 'resolved_no' | 'cancelled')
  expiry: timestamptz
  created_at: timestamptz
  creation_cost: numeric (default 1000) -- OS cost to create market
```

### New Database Table: `bets`

```text
bets
  id: uuid (PK)
  user_id: uuid
  market_id: uuid (references bet_markets)
  side: text ('YES' | 'NO')
  amount: numeric -- OS wagered
  claimed: boolean (default false)
  created_at: timestamptz
```

### Market Mechanics
- Creating a market costs 1,000 OS (anti-spam)
- Users bet OS on YES or NO
- Odds are determined by pool ratios (AMM-style: yes_price = yes_pool / (yes_pool + no_pool))
- When resolved, winning side splits the total pool proportionally
- Payout = (your_bet / winning_pool) * total_pool

---

## Technical Details

### Files to Create

| File | Description |
|------|-------------|
| `src/components/os/AppForgeApp.tsx` | New unified Forge app (replaces MiniAppsApp as the primary interface) |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/os/MiniAppsApp.tsx` | Refactor into a sub-component of AppForge, or redirect to Forge |
| `src/components/os/PrimeBetsApp.tsx` | Replace hardcoded markets with real database-backed markets and OS token wagering |
| `supabase/functions/prime-bank/index.ts` | Add forge-publish, forge-install, forge-invest, share-order, match-orders, bet-place, bet-resolve actions |
| `src/types/os.ts` | Add `'forge'` to AppType |
| `src/components/os/Desktop.tsx` | Register AppForgeApp |
| `src/components/os/Taskbar.tsx` | Add Forge to app menu (replace or supplement Mini Apps) |
| `src/components/os/DesktopIcons.tsx` | Add Forge desktop icon |

### Database Migrations
- Create `forge_listings` table with RLS
- Create `app_shares` table with RLS
- Create `share_orders` table with RLS
- Create `bet_markets` table with RLS
- Create `bets` table with RLS
- Enable realtime on `forge_listings`, `share_orders`, `bet_markets`

### Security
- All financial operations go through `prime-bank` edge function with service role
- Share trades are atomic (deduct OS + transfer shares in one operation)
- IPO investments are locked until target is met (or refunded if cancelled)
- Bet resolution is admin-only to prevent fraud
- Order matching validates balances before execution

### Mini-App API Access
Published Forge apps gain limited API access through a callback system:
- `onWalletCheck()`: returns user's OS balance (read-only)
- `onEarnReward(amount, reason)`: request OS reward (capped, rate-limited)
- These are passed as props to the MiniAppRenderer, not direct network access

