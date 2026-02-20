

# Cross-Agent Commerce, Gaming, Trading, and Wallet Tools for Hyper

## Overview

Expand Hyper's autonomous capabilities beyond social/mail to include the full PRIME OS economy. Hyper will be able to check wallet balances, transfer tokens, trade shares on the Forge marketplace, place bets on prediction markets, and claim arcade rewards -- all via AI tool calling. The user tells Hyper what to do, and Hyper interacts with the financial systems on their behalf.

## What Changes

### 1. New Hyper Tools (Backend)

**File: `supabase/functions/hyper-chat/index.ts`**

Add 6 new tool definitions to the TOOLS array:

| Tool | Description | Parameters |
|------|-------------|------------|
| `check_balance` | Check the operator's wallet balance | (none) |
| `transfer_tokens` | Send OS or IX to another user | `to_name`, `amount`, `token_type` |
| `buy_shares` | Buy shares in a Forge app | `app_name`, `amount` |
| `sell_shares` | Sell shares in a Forge app | `app_name`, `shares` |
| `place_bet` | Place a bet on a prediction market | `market_question`, `side` (YES/NO), `amount` |
| `play_arcade` | Claim an arcade game reward | `game`, `score` |

For tools that need real backend interaction (balance, transfer, shares, bets), the edge function will call `prime-bank` directly using the service role key, since the user's auth token is passed through. The hyper-chat function will:

1. Detect tool calls as before (phase 1 non-streaming check)
2. For financial tools, execute the action server-side by calling prime-bank
3. Return a JSON response with the result and a conversational reply

Update the system prompt to inform Hyper about its financial capabilities.

### 2. Frontend Tool Call Handling

**File: `src/components/os/HypersphereApp.tsx`**

Extend the tool call handling to support the new tools:

- `check_balance` -- Display balance info in chat (no EventBus needed)
- `transfer_tokens` -- Show confirmation, log to agent activity
- `buy_shares` / `sell_shares` -- Show trade confirmation, log activity
- `place_bet` -- Show bet confirmation, log activity
- `play_arcade` -- Show reward confirmation, log activity

Add new permission toggles:
- "Wallet" toggle (controls transfer, trading, betting)

Add new quick action buttons:
- "Check Balance" -- asks Hyper to check wallet
- "Portfolio" -- asks Hyper about share holdings

Extend `AgentAction` type to include `'trade' | 'wallet' | 'bet' | 'game'` alongside existing `'post' | 'email'`.

### 3. EventBus Updates

**File: `src/hooks/useEventBus.ts`**

Add new event types:
- `wallet.transfer` -- for broadcasting transfers
- `trade.executed` -- for share trades
- `bet.placed` -- for bets

### 4. Confirm ai-social Actions

**File: `supabase/functions/ai-social/index.ts`**

The `generate-replies` and `generate-reply-email` actions are already implemented with structured tool calling output. No changes needed -- these are already live and working. The plan simply confirms they're properly exposed:

- `generate-replies`: accepts `postContent` + `postAuthor`, returns `{ replies: [{ author, text }] }`
- `generate-reply-email`: accepts `originalEmail` (from/to/subject/body), returns `{ email: { from, to, subject, body } }`

Both use dedicated tool definitions with `additionalProperties: false` for clean structured output.

## Technical Details

### Backend Tool Execution Flow

When Hyper decides to use a financial tool:

1. `hyper-chat` receives the tool call from the AI model
2. It forwards the user's auth token to `prime-bank` (extracted from the original request)
3. `prime-bank` executes the action (balance check, transfer, trade, bet)
4. `hyper-chat` returns the result as JSON: `{ type: "tool_call", tool: "check_balance", data: { os_balance: 50000, ... }, reply: "Your balance is..." }`
5. Frontend displays the reply and logs the action

### Auth Token Forwarding

The `hyper-chat` function will extract the `Authorization` header from the incoming request and pass it through when calling `prime-bank`. This ensures all financial operations are authenticated as the actual user.

### Permission Gating

A single "Wallet" permission toggle controls all financial tools (transfer, trade, bet). Balance checks are always allowed. If disabled, Hyper responds with "Financial operations are currently disabled by operator."

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/hyper-chat/index.ts` | Add 6 financial tool definitions, server-side prime-bank calls, auth forwarding |
| `src/components/os/HypersphereApp.tsx` | Handle new tool responses, add Wallet permission toggle, new quick actions, extended action types |
| `src/hooks/useEventBus.ts` | Add `wallet.transfer`, `trade.executed`, `bet.placed` event types |

### No Database Changes Required

All financial operations use existing `prime-bank` actions and existing tables (wallets, transactions, app_shares, bets, bet_markets). No new tables or migrations needed.

