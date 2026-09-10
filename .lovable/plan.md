# Hardening Pass — Transaction Audit and Function Lockdown

Two items only, as requested. One of them turned out to need no work; the details are below.

## Item 1 — The rolled-back transactions: checked, nothing to fix

I traced this before planning any work, and the alarm was mine, not the system's.

The counter reads 9,877 rolled-back transactions against 11,875,072 successful ones — a rate of 0.08% — accumulated over 276 days of uptime. That is normal background noise for Postgres, not a failing query path.

Corroborating checks:
- No error or fatal database log entries in the last 72 hours (only routine informational lines).
- No failing function calls in the last 72 hours — the only traffic was the scheduled dispatcher, all successful.

Conclusion: no instrumentation and no fix needed. I'd rather tell you this than invent work. If the rate climbs later, the right move is to re-check the same two log sources and compare against a fresh reading of the counter.

## Item 2 — Lock down SECURITY DEFINER functions

There are six functions in question. I checked exactly who calls each one:

| Function | Who actually calls it | Access it should have |
|---|---|---|
| `has_role` | Access rules across 7 tables, plus the banking function | Keep for signed-in and public — access rules depend on it |
| `get_waitlist_count` | The public landing page | Keep for public and signed-in |
| `check_booking_conflict` | The AI assistant, acting as the signed-in user | Keep for signed-in only; remove public |
| `cleanup_old_activity` | The scheduled dispatcher, with admin credentials | Remove public and signed-in |
| `handle_new_user` | Runs automatically on signup only | Remove public and signed-in |
| `update_updated_at_column` | Runs automatically on record updates only | Remove public and signed-in |

The last three are never called by anyone using the app — they run internally — so exposing them through the public interface is pure surface area with no benefit.

### The change

One database migration containing `REVOKE EXECUTE` statements only. No schema change, no table change, no data touched, nothing dropped. Explicit `GRANT EXECUTE` to the internal admin role is included where the scheduled dispatcher needs it, so the cleanup task keeps working.

### Verification after applying

1. Re-run the database checker and confirm the function warnings drop from 10 to the small number that remain intentional (`has_role`, `get_waitlist_count`, and the booking check for signed-in users).
2. Confirm the landing page still shows its waitlist count.
3. Confirm signing up still creates a profile, and editing a record still stamps its update time — these prove the internal triggers still fire after the revoke.

## Also worth flagging (not in scope, your call)

Leaked-password protection is switched off on sign-in. It's a single backend setting that blocks passwords known to be in public breach lists. Say the word and I'll turn it on; otherwise I'll leave it.

## Explicitly skipped

Error boundaries, code splitting, query tightening, tests, and file splitting — all dropped per your instruction.
