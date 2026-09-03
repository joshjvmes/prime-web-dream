# PRIME OS System Audit — Findings and Improvement Plan

An audit of the running system (code, database, auth, performance, resilience) with a prioritised improvement roadmap. Findings below come from scanning the codebase and querying the live backend.

## What the audit found

**Scale:** ~42k lines across app code and edge functions, 78 OS components, 20 edge functions, 38 tables.

**Backend health (checked live):** database and connection pooler up, no restarts, memory 40%, disk 10%, connections 12/60. Healthy — but ~9,800 rolled-back transactions since boot, which usually means a repeated failing query or permission error somewhere in the app rather than real load.

**Security warnings (from the database linter):**
- 10 warnings about `SECURITY DEFINER` functions being executable by anonymous and signed-in users. Some are intentional (`has_role`, `get_waitlist_count`), others should have `EXECUTE` revoked.
- Leaked-password protection is disabled on auth.

**Resilience gaps:**
- Only one error boundary in the whole app (`MiniAppRenderer`). A single app crash can take down the whole desktop.
- No code splitting anywhere — every one of the 78 apps loads on first paint, so boot time carries the whole bundle.
- One real test file (`src/test/example.test.ts`) — no coverage on window management, ternary logic, the AI router, or the token economy.

**Maintainability:**
- Oversized files: `hyper-chat` (1,399 lines), `SettingsApp` (1,043), `PrimeArcadeApp` (1,029), `BotLabApp` (976), `RokCatApp` (942), `prime-bank` (893).
- ~110 occurrences of `as any` / `@ts-ignore` / TODO across app components, concentrated in PrimeSocial, PrimeVault, CloudHooks, PrimeMail.
- Many queries use `select('*')` on tables with wide rows, pulling more data than the UI renders.

## Proposed work, in priority order

### Phase 1 — Stability and security (do first)
1. Trace the rolled-back transactions: instrument the failing query path, identify the offending call, and fix it.
2. Lock down `SECURITY DEFINER` functions: audit each one, revoke `EXECUTE` from `anon`/`authenticated` where it isn't needed, keep it for `has_role` and the public waitlist counter.
3. Enable leaked-password protection in auth settings.
4. Add a top-level error boundary around the desktop plus a per-window boundary in `OSWindow`, so one broken app shows a recoverable error card instead of a blank screen.

### Phase 2 — Performance
5. Lazy-load app components through the window manager's app registry, so only opened apps download.
6. Replace `select('*')` with explicit column lists on the highest-traffic apps (Vault, Social, Calendar, Bets, Mail, Wallet).
7. Add pagination or row limits to feed-style lists that currently fetch unbounded result sets.

### Phase 3 — Confidence
8. Add tests for the pieces where breakage is expensive and invisible: window manager operations, ternary/GeomQ compiler, AI router provider selection, and the bank's mint/transfer/debit math.
9. Wire those tests into the repo's existing vitest setup.

### Phase 4 — Maintainability
10. Split the largest files into focused modules (`hyper-chat` tool handlers, `SettingsApp` tab panels, `prime-bank` operations).
11. Burn down the `as any` usages in the four worst components using the generated database types.

## Technical notes

- Function lockdown ships as one migration containing `REVOKE EXECUTE` statements; no schema change, no data risk.
- Lazy loading uses `React.lazy` plus `Suspense` inside `OSWindow`, keyed off the existing `AppType` map — the window manager API stays unchanged.
- Error boundaries are class components with a reset action that closes or reloads the offending window.
- Auth's leaked-password setting is a backend config toggle, not code.
- Rolled-back transactions are diagnosed from function logs and query stats before any fix is written; the cause is currently unconfirmed.

## Out of scope unless you want it

New features, visual redesign, and mobile layout changes. This is a hardening pass.

## Suggested first slice

Phase 1 alone — it removes the crash risk, closes the security warnings, and finds the source of the failing transactions. Phases 2-4 can follow one at a time.
