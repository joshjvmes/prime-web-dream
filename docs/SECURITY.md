# Security & RLS Overview

---

## Row-Level Security (RLS)

All 30+ tables have RLS **enabled**. The standard pattern is:

```sql
-- Owner-scoped access
CREATE POLICY "Users can view own data"
  ON public.<table> FOR SELECT
  USING (auth.uid() = user_id);
```

### Access Patterns

| Pattern | Tables | Description |
|---|---|---|
| **Owner CRUD** | `calendar_events`, `board_tasks`, `file_metadata`, `user_emails`, `cloud_hooks`, `bot_registry`, `user_data`, `vault_holdings`, `user_ai_keys`, `ai_memories`, `agent_memory` | Full create/read/update/delete scoped to `auth.uid() = user_id` |
| **Owner read + insert** | `bets`, `vault_transactions`, `ai_conversations` | Users can create and view but not modify |
| **Authenticated read** | `chat_messages`, `social_posts`, `social_comments`, `social_likes`, `bookings`, `chat_presence` | Any authenticated user can read; write is owner-scoped |
| **Public read** | `profiles`, `bet_markets`, `forge_listings`, `user_roles` | Anyone (including anonymous) can read |
| **Admin-only write** | `user_roles` | Only users with `admin` role can INSERT/DELETE |
| **Service-role only** | `wallets`, `transactions`, `escrow_deals`, `app_shares`, `bot_audit_log` | No client-side write; mutations happen through edge functions using the service role key |
| **Public insert only** | `waitlist` | Anyone can insert (landing page signup) |

### Role System

The `has_role(user_id, role)` database function checks the `user_roles` table:

```sql
-- Enum: app_role = 'admin' | 'moderator' | 'user'
SELECT has_role(auth.uid(), 'admin');
```

Used in policies for `user_roles`, `wallets`, `transactions`, `escrow_deals`, `app_shares`, and `bot_audit_log`.

---

## Edge Function Authentication

All edge functions use `verify_jwt = false` in `config.toml` and handle auth manually:

```typescript
// Standard pattern in every edge function
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

const { data: { user }, error } = await supabase.auth.getUser(token);
if (!user) return new Response('Unauthorized', { status: 401 });

// All subsequent queries use the authenticated supabase client
// which respects RLS policies
```

### Service Role Usage

Some functions create a service-role client for elevated operations:

```typescript
const serviceClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
```

**Used by:** `prime-bank` (wallet mutations), `bot-runner` (bot execution), `admin-actions` (role management), `system-analytics` (cross-user activity), `cron-dispatcher` (scheduled tasks).

The service role key is **never** exposed to the client. It only exists in edge function environment variables.

---

## API Key Storage

The `user_ai_keys` table stores user-provided API keys for BYOAK (Bring Your Own API Key):

| Column | Type | Note |
|---|---|---|
| `encrypted_key` | text | **⚠️ Currently stored as plaintext** despite the column name |
| `provider` | text | `openai`, `google`, `anthropic` |
| `model` | text | Optional model preference |

**Security consideration:** The `encrypted_key` column does not use actual encryption. Keys are stored as-is. This is acceptable for a demo/development context but should be addressed before production use. RLS ensures only the owning user can read their own keys.

---

## Client-Side Security

### Supabase Client

```typescript
// src/integrations/supabase/client.ts (auto-generated, never edit)
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
```

- The publishable (anon) key is safe to expose — it only grants access that RLS policies allow.
- Session tokens are stored in `localStorage` with auto-refresh enabled.
- All client queries go through RLS; no direct table access is possible beyond policy rules.

### Environment Variables

| Variable | Exposure | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Client (public) | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client (public) | Anon key for client SDK |
| `VITE_SUPABASE_PROJECT_ID` | Client (public) | Project ID for edge function URLs |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Full database access (edge functions only) |

---

## CORS

All edge functions include permissive CORS headers:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, ...",
};
```

This is standard for Supabase edge functions accessed from a browser client.

---

## Security Recommendations

1. **Encrypt API keys** — Replace plaintext storage in `user_ai_keys.encrypted_key` with actual encryption (e.g., `pgsodium` or application-layer encryption)
2. **Rate limiting** — Edge functions currently rely on bot-level `rate_limit` config but have no global rate limiting
3. **Input validation** — Edge functions do basic checks but could benefit from schema validation (e.g., Zod)
4. **Audit logging** — `user_activity` and `bot_audit_log` provide traceability; consider adding edge function invocation logging
5. **Token expiry** — `bot_api_keys` supports `expires_at` but expiry enforcement should be verified
