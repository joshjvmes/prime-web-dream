

# Create Missing GitHub Tables for the GitHub App Flow

## Problem

The edge function logs show repeated errors:
```
Could not find the table 'public.github_events' in the schema cache
```

The `github-app` edge function references two tables that don't exist:
- **`github_events`** — stores incoming webhook events
- **`github_installations`** — stores linked GitHub App installations per user

Without these tables, the entire flow fails:
1. Webhook handler can't store events
2. OAuth callback can't store/update installations
3. `link-installation` action can't claim installations
4. PrimeGit can't query for linked installations

## Plan

### 1. Create `github_installations` table (database migration)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | references nothing (standard pattern) |
| installation_id | integer | unique, GitHub's installation ID |
| account_login | text | GitHub username/org |
| account_type | text | "User" or "Organization" |
| access_token | text | OAuth token (nullable) |
| token_expires_at | timestamptz | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

RLS policies: users can SELECT/UPDATE their own rows. Service role handles INSERT/upsert from the edge function.

### 2. Create `github_events` table (database migration)

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| installation_id | integer | |
| event_type | text | e.g. "push", "pull_request" |
| action | text | nullable |
| repository | text | nullable, full_name |
| sender | text | nullable, login |
| payload | jsonb | full webhook payload |
| created_at | timestamptz | default now() |

RLS: users can SELECT events linked to their installation. Service role handles INSERT from webhooks.

### 3. Verify the full flow

After creating the tables, the existing code in `github-app/index.ts` and `Desktop.tsx` should work as-is since they already reference these exact column names.

