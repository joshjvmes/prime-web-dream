

# Fix Build Errors & Redeploy Edge Functions

There are 28 TypeScript build errors across several edge functions that need fixing before redeployment. The errors fall into three categories:

## Error Categories

1. **`'err' is of type 'unknown'`** — Catch blocks need `(e as Error).message` casting
   - `admin-actions/index.ts` line 147
   - `elevenlabs-tts/index.ts` line 69
   - `market-data/index.ts` line 96
   - `sports-odds/index.ts` line 144
   - `system-analytics/index.ts` line 132

2. **`.catch()` does not exist on PostgREST builder** — Supabase query builders don't support `.catch()`. Must use `const { error } = await ...` pattern instead
   - `github-app/index.ts` line 173
   - `cron-dispatcher/index.ts` line 119

3. **`never` type errors from untyped Supabase client** — `createClient()` without type parameter causes all table operations to infer `never`. Fix by adding `as any` casts on the data or using explicit typing
   - `resolve-markets/index.ts` — 15 errors across wallet updates, transaction inserts, bet updates
   - `bot-api/index.ts` — 6 errors across bookings insert, ai_memories insert, and `checkRateLimit`/`executeServerTool` function signatures

## Changes

| File | Fix |
|---|---|
| `admin-actions/index.ts` | Cast `err` to `Error` |
| `bot-api/index.ts` | Cast Supabase client params with `as any`, cast insert data |
| `cron-dispatcher/index.ts` | Replace `.catch()` with `const { error } = await ...` |
| `elevenlabs-tts/index.ts` | Cast `error` to `Error` |
| `github-app/index.ts` | Replace `.catch()` with error-checked `await` |
| `market-data/index.ts` | Cast `e` to `Error` |
| `resolve-markets/index.ts` | Add `as any` casts on wallet/transaction/bet query results and inserts |
| `sports-odds/index.ts` | Cast `err` to `Error` |
| `system-analytics/index.ts` | Cast `err` to `Error` |

All 9 files will be updated and automatically redeployed.

