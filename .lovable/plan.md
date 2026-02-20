

# GeomQ Language, AI Mini-Apps, Agent Upgrade, and Token Economy Expansion

## Overview

This is a massive feature set. To keep it achievable, we'll split it into four focused deliverables:

1. **GeomQ Programming Language** -- A ternary/quantum-gate scripting language that compiles to executable JavaScript within the OS
2. **AI-Powered Mini-App Creator** -- The Hypersphere AI gains the ability to generate and install user mini-apps from natural language descriptions
3. **PrimeAgent Upgrade** -- Expanded capabilities covering wallet operations, arcade, journal, browser, and more
4. **Token Economy Expansion** -- Arcade rewards, AI token costs, and unlockable upgrades

---

## Part 1: GeomQ -- The Ternary Programming Language

A custom scripting language that uses ternary quantum gate simulation syntax and compiles to executable JavaScript. This lives in the existing GeomC app, which gets upgraded from a static demo to a real interpreter.

### Language Design

```text
-- GeomQ Syntax Examples --

qutrit x = |2>          -- declare a qutrit in state 2
qutrit y = |0>

gate HADAMARD x         -- apply quantum-inspired gate
gate CNOT x y           -- controlled gate

measure x -> result     -- collapse to classical value (0, 1, or 2)

fold sum = 0            -- fold block (loop equivalent)
  over range(10) as i
    sum = sum + i
endfold

emit "Result: " + result   -- output

fn fibonacci(n)             -- function definition
  if n < 2 then return n
  return fibonacci(n-1) + fibonacci(n-2)
endfn
```

### Compilation Pipeline

```text
GeomQ Source --> Lexer/Tokenizer --> AST --> Ternary Gate Simulator --> JavaScript Emitter --> eval()
```

- **Lexer**: Tokenizes keywords (`qutrit`, `gate`, `fold`, `emit`, `fn`, `measure`, `if/then/else`)
- **Gates**: Simulated ternary gates (HADAMARD produces superposition probabilities, CNOT applies controlled transforms, PHASE rotates state)
- **Output**: Compiles to plain JavaScript that runs in a sandboxed function scope
- **Persistence**: User programs saved via `useCloudStorage` under key `geomq-programs`

### Changes to GeomCApp

The existing GeomC app gets a second tab: "GeomQ REPL" -- a live coding environment where users write GeomQ code, see compilation phases, and view output. The existing compiler demo stays as the first tab.

---

## Part 2: AI Mini-App Creator

The Hypersphere AI gains a new capability: generating mini-apps from natural language descriptions. These mini-apps are rendered as sandboxed React components inside the OS.

### How It Works

1. User opens Hypersphere and says: "Create a mini-app that shows a countdown timer"
2. AI generates a self-contained React component as a string (JSX + state + logic)
3. The component is stored in cloud storage under `user-mini-apps`
4. A new "Mini Apps" panel in the OS lets users browse, launch, and delete their created apps
5. Mini-apps run inside a sandboxed iframe or a controlled eval renderer

### Mini-App Structure

```text
{
  id: string,
  name: string,
  description: string,
  code: string,        // React component source
  icon: string,        // emoji or lucide icon name
  createdAt: string,
  geomqSource?: string // optional GeomQ source that generated it
}
```

### AI Integration

A new edge function `mini-app-gen` calls the AI gateway with a specialized system prompt that instructs it to output a single self-contained React functional component using only inline styles and basic React hooks (useState, useEffect, useCallback). No imports -- everything self-contained.

### Rendering Engine

Mini-apps render via `new Function()` in a controlled wrapper component that:
- Provides React, useState, useEffect as globals
- Catches errors gracefully and shows error boundaries
- Limits execution time (5-second timeout)
- Cannot access the parent window, localStorage, or network

### Desktop Integration

- New app type: `miniapps` -- a gallery/launcher for user-created mini-apps
- Each mini-app can also be opened as its own OS window
- Mini-apps appear in the desktop icon grid if pinned

---

## Part 3: PrimeAgent Upgrade

The agent currently uses keyword matching to generate task queues. We'll upgrade it to:

### New Capabilities

| Capability | Description |
|-----------|-------------|
| Wallet ops | Check balance, send tokens, exchange OS/IX |
| Arcade | Launch games, check high scores |
| Journal | Create/publish journal entries |
| Browser | Navigate to intranet pages, search content |
| Mini-apps | Install and launch user mini-apps |
| Calendar | Create events, check schedule |
| Files | Upload/download files |
| Multi-step workflows | Chain complex operations with conditionals |

### Implementation

Expand the `parseInstruction` function with new keyword patterns and action types:
- `'wallet-check'`, `'wallet-send'`, `'wallet-exchange'` action types
- `'arcade-launch'`, `'journal-create'`, `'calendar-add'` action types  
- Add actual API calls in the executor (currently just simulated delays)
- For wallet operations, call the `prime-bank` edge function
- For journal operations, use the `useIntranetPages` hook patterns

### Quick Commands Update

Add new quick command buttons:
- "Check Wallet" -- shows OS/IX balance
- "Publish Journal" -- creates a quick journal entry
- "Launch Game" -- opens a random arcade game
- "Create Mini-App" -- triggers the AI mini-app flow

---

## Part 4: Token Economy Expansion

### Arcade Rewards

- Completing a game awards OS tokens based on score:
  - Minesweeper win: 500 OS (Easy), 1500 OS (Medium), 5000 OS (Hard)
  - Snake: 10 OS per food eaten
  - Pong win: 200 OS per game
  - Cascade level clear: 300 OS per level
  - Tetris: 100 OS per line cleared
- Rewards claimed via `prime-bank` edge function with a new `arcade-reward` action
- Anti-cheat: server validates that the reward amount is within expected bounds and limits claims to once per game session

### AI Token Costs

- Using Hypersphere AI costs 50 OS per message (deducted via prime-bank)
- Creating a mini-app costs 500 OS
- Users with 0 OS get 3 free AI messages per day (tracked client-side)

### Unlockable Upgrades (Token Shop)

A new "Shop" tab in the Wallet app where users spend OS tokens on:

| Item | Cost | Effect |
|------|------|--------|
| Dark Neon Theme | 10,000 OS | Unlocks a neon color scheme for the OS |
| Extra Workspace | 25,000 OS | Adds a 5th workspace slot |
| AI Priority | 50,000 OS | Faster AI responses (client-side flag) |
| Custom Desktop Widget | 15,000 OS | Unlock custom widget placement |
| GeomQ Pro Toolkit | 30,000 OS | Unlock advanced GeomQ gate operations |

Purchases stored in `useCloudStorage` under `user-unlocks`.

### prime-bank Edge Function Updates

New actions added:
- `arcade-reward`: Validate and grant arcade earnings
- `ai-charge`: Deduct OS for AI usage  
- `purchase-unlock`: Buy shop items

---

## Technical Details

### Files to Create

| File | Description |
|------|-------------|
| `src/lib/geomq/lexer.ts` | GeomQ tokenizer |
| `src/lib/geomq/parser.ts` | GeomQ AST parser |
| `src/lib/geomq/compiler.ts` | GeomQ to JavaScript compiler |
| `src/lib/geomq/gates.ts` | Ternary quantum gate simulation |
| `src/components/os/MiniAppsApp.tsx` | Mini-app gallery and launcher |
| `src/components/os/MiniAppRenderer.tsx` | Sandboxed mini-app renderer |
| `supabase/functions/mini-app-gen/index.ts` | AI-powered mini-app generator |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/os/GeomCApp.tsx` | Add GeomQ REPL tab with live interpreter |
| `src/components/os/HypersphereApp.tsx` | Add "Create Mini-App" mode, AI token charging |
| `src/components/os/PrimeAgentApp.tsx` | Expand capabilities, add real API calls |
| `src/components/os/PrimeArcadeApp.tsx` | Add OS token rewards on game completion |
| `src/components/os/PrimeWalletApp.tsx` | Add "Shop" tab for unlockables |
| `supabase/functions/prime-bank/index.ts` | Add arcade-reward, ai-charge, purchase-unlock actions |
| `src/types/os.ts` | Add `'miniapps'` to AppType |
| `src/components/os/Desktop.tsx` | Register MiniAppsApp |
| `src/components/os/Taskbar.tsx` | Add Mini Apps to menu |
| `src/components/os/DesktopIcons.tsx` | Add Mini Apps icon |
| `supabase/config.toml` | Register mini-app-gen function |

### Edge Function: mini-app-gen

Uses the Lovable AI Gateway (google/gemini-3-flash-preview) with a system prompt that constrains output to a single React functional component string. The function:
1. Accepts a natural language description
2. Deducts 500 OS from the user's wallet via prime-bank
3. Calls the AI to generate the component
4. Returns the component source code
5. Client saves it to cloud storage

### Security Considerations

- Mini-app code runs in a sandboxed `new Function()` scope with no access to `window`, `document`, `fetch`, or `localStorage`
- GeomQ `eval` output is wrapped in a try/catch with timeout
- Arcade rewards are rate-limited server-side (max 1 claim per game type per 30 seconds)
- AI charges verified server-side before forwarding to AI gateway

### No New Database Tables Required

All new data (GeomQ programs, mini-apps, unlocks, arcade sessions) uses the existing `user_data` table via `useCloudStorage`. Only the `prime-bank` edge function gains new action handlers.

