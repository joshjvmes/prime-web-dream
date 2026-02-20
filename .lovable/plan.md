

# Intranet Search, PDF Export, and PRIME Financial System

## Overview

Three major additions: (1) full-text search across intranet pages and PDF export for journal entries, (2) a complete internal financial system with OS Tokens and ICE-IX tokens, and (3) an admin Central Bank management console.

---

## Part 1: Intranet Search and Journal PDF Export

### Intranet Search
- Add a search bar to the browser that filters across all `httpsp://` intranet pages (both hardcoded and user-published)
- Results show title, snippet, and link -- clicking navigates to the page
- Search is already partially in the Hub page; this extends it to work from the browser's URL bar (typing a search query auto-searches intranet)

### Journal PDF Export
- Add an "Export PDF" button to the Journal toolbar
- Uses the browser's `window.print()` API with a hidden print-friendly iframe
- Generates a clean formatted document with title, date, tags, and rendered markdown content
- Alternative: generate a downloadable HTML file styled for printing (no external PDF library needed)

### Files Changed
| File | Change |
|------|--------|
| `src/components/os/PrimeJournalApp.tsx` | Add Export PDF/HTML button |
| `src/components/os/PrimeBrowserApp.tsx` | Add intranet search from URL bar |

---

## Part 2: PRIME Financial System

### Token Economics

**OS Tokens**
- Initial supply: 100 trillion (100,000,000,000,000)
- Controlled by the Central Bank (system wallet)
- Users earn tokens by contributing (compute, content publishing, chat activity)
- Can be traded and sent between users
- Earns nightly interest (distributed from Central Bank reserves)

**ICE-IX Tokens (IX)**
- Fixed supply: 22 million (22,000,000) -- never changes
- Exchange rate: 2,000,000 OS per 1 IX
- Premium reserve currency -- scarce by design
- Future: intended for blockchain release on Base or custom chain
- Initially held entirely by the Central Bank

### Database Schema

New tables required:

**wallets**
```text
id: uuid (PK)
user_id: uuid (unique, references auth.users)
os_balance: numeric (default 0, precision 20,2)
ix_balance: numeric (default 0, precision 20,6)
is_system: boolean (default false) -- true for Central Bank wallet
created_at: timestamptz
updated_at: timestamptz
```

**transactions**
```text
id: uuid (PK)
from_wallet_id: uuid (nullable, null = system mint)
to_wallet_id: uuid (nullable, null = system burn)
token_type: text ('OS' or 'IX')
amount: numeric (precision 20,6)
tx_type: text ('transfer' | 'interest' | 'reward' | 'exchange' | 'escrow_lock' | 'escrow_release' | 'mint')
description: text
escrow_id: uuid (nullable, references escrow deals)
created_at: timestamptz
```

**escrow_deals**
```text
id: uuid (PK)
creator_id: uuid (references auth.users)
counterparty_id: uuid (references auth.users)
token_type: text
amount: numeric
status: text ('pending' | 'locked' | 'released' | 'cancelled')
description: text
created_at: timestamptz
resolved_at: timestamptz (nullable)
```

### RLS Policies
- **wallets**: Users can SELECT their own wallet; system wallet is readable by admins
- **transactions**: Users can SELECT transactions where they are sender or receiver
- **escrow_deals**: Users can SELECT deals where they are creator or counterparty
- All write operations go through the edge function (service role) for atomicity

### Edge Function: `prime-bank`

A secure backend function handling all financial operations with atomic transactions:

| Action | Description |
|--------|-------------|
| `balance` | Get current user's wallet balances |
| `transfer` | Send OS or IX tokens to another user |
| `exchange` | Swap 2M OS for 1 IX (or reverse) |
| `escrow-create` | Lock tokens in escrow for a deal |
| `escrow-release` | Release escrowed tokens to counterparty |
| `escrow-cancel` | Return escrowed tokens to creator |
| `distribute-interest` | Admin-only: run nightly interest distribution |
| `reward` | Admin-only: reward a user with tokens |
| `admin-stats` | Admin-only: full financial overview |
| `admin-adjust` | Admin-only: manual balance adjustments |
| `leaderboard` | Top holders (public) |

All mutations use database transactions (BEGIN/COMMIT) to ensure atomicity. Balance checks prevent overdrafts.

### Interest Distribution
- Rate: configurable, e.g. 0.01% daily on OS token balances
- Distributed from Central Bank reserves
- Triggered by admin (or future cron job)
- Each distribution creates individual transaction records
- If Central Bank reserves run low, interest rate auto-adjusts

### Auto-Rewards System
Users earn OS tokens for activity:
- Publishing an intranet page: 1,000 OS
- Sending a chat message: 10 OS (capped per day)
- Daily login bonus: 500 OS
- These are tracked client-side and claimed via the edge function

---

## Part 3: User Wallet App

### New App: PrimeWallet

A full-featured wallet interface accessible from the taskbar and desktop.

**Tabs:**
- **Overview**: Current OS and IX balances, recent transactions, daily interest earned
- **Send**: Transfer tokens to another user (search by display name or email)
- **Exchange**: Swap OS for IX at the fixed 2M:1 rate (and reverse)
- **Escrow**: Create escrow deals, view pending deals, release/cancel
- **History**: Full transaction log with filters (type, date range, token)
- **Leaderboard**: Top token holders

### UI Design
- Matches the existing OS aesthetic (dark theme, monospace, subtle borders)
- Balance displayed prominently with token icons
- Transaction list with color-coded types (green = received, red = sent, blue = interest, yellow = escrow)

---

## Part 4: Admin Central Bank Console

### New Tab in AdminConsoleApp: "Bank"

Extends the existing Admin Console with a new "Bank" tab providing:

- **Treasury Overview**: Central Bank OS and IX reserves, total circulating supply, total locked in escrow
- **Interest Controls**: Set interest rate, trigger distribution, view distribution history
- **User Wallets**: Browse all user wallet balances, search by user
- **Mint/Burn**: Adjust Central Bank reserves (with audit log)
- **Escrow Manager**: View all active escrow deals, force-release or cancel
- **Transaction Audit**: Full transaction log across all users with filters
- **Token Stats**: Charts showing velocity, daily volume, holder distribution

---

## Part 5: System Initialization

When the `prime-bank` edge function first runs (or on admin trigger):
1. Create the Central Bank system wallet if it doesn't exist
2. Mint 100 trillion OS tokens into the Central Bank
3. Mint 22 million IX tokens into the Central Bank
4. These are one-time operations tracked via a `system_initialized` flag in the wallet metadata

When a new user signs up or first opens the wallet:
1. Create their wallet with 0 balances
2. Grant a "welcome bonus" of 10,000 OS from the Central Bank

---

## Technical Details

### Files Changed

| File | Action |
|------|--------|
| `src/components/os/PrimeJournalApp.tsx` | Add PDF/HTML export button |
| `src/components/os/PrimeBrowserApp.tsx` | Add intranet search integration |
| `supabase/functions/prime-bank/index.ts` | New edge function for all financial operations |
| `src/components/os/PrimeWalletApp.tsx` | New wallet UI app |
| `src/components/os/AdminConsoleApp.tsx` | Add "Bank" tab with Central Bank management |
| `src/types/os.ts` | Add `'wallet'` to AppType |
| `src/components/os/Desktop.tsx` | Register PrimeWalletApp |
| `src/components/os/Taskbar.tsx` | Add Wallet to app menu |
| `src/components/os/DesktopIcons.tsx` | Add Wallet desktop icon |

### Database Migrations
- Create `wallets` table with RLS
- Create `transactions` table with RLS
- Create `escrow_deals` table with RLS
- Enable realtime on `wallets` (for live balance updates)
- Enable realtime on `transactions` (for live transaction feed)

### Edge Function Security
- All write operations require authentication
- Balance mutations use service role for atomicity
- Admin operations verify admin role via `has_role()` function
- Exchange rate is hardcoded server-side (not client-configurable)
- Overdraft protection: all transfers check balance before executing

### Token Display Format
- OS Tokens: displayed with commas and 2 decimal places (e.g., "1,234,567.89 OS")
- IX Tokens: displayed with 6 decimal places due to scarcity (e.g., "0.500000 IX")
- Exchange rate badge: "2,000,000 OS = 1 IX"

