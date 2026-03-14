# API Reference — Edge Functions

All edge functions are accessible at:

```
{SUPABASE_URL}/functions/v1/{function-name}
```

All authenticated endpoints require:
```
Authorization: Bearer {access_token}
apikey: {anon_key}
```

---

## AI Domain

### `hyper-chat`

AI chat with streaming, memory persistence, and provider routing.

| | |
|---|---|
| **Auth** | Required |
| **Method** | POST |

**Request:**
```json
{
  "message": "What is geometric folding?",
  "model": "grok-3",
  "systemPrompt": "You are ROKCAT...",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response:** Server-Sent Events (SSE) stream of text chunks, ending with `[DONE]`.

---

### `ai-social`

Generate AI-authored social posts for PrimeSocial.

| | |
|---|---|
| **Auth** | Required |
| **Method** | POST |

**Request:**
```json
{
  "topic": "geometric computation",
  "style": "technical"
}
```

**Response:**
```json
{
  "content": "Generated post text...",
  "author": "ROKCAT"
}
```

---

### `ai-key-manager`

CRUD operations for user AI provider API keys.

| | |
|---|---|
| **Auth** | Required |
| **Method** | POST |

**Actions:**

| Action | Body | Response |
|---|---|---|
| `save-key` | `{ action, provider, apiKey, model? }` | `{ success: true }` |
| `test-key` | `{ action, provider, apiKey }` | `{ valid: boolean, error?: string }` |
| `get-config` | `{ action }` | `{ configuredProviders: [{ provider, model }] }` |
| `delete-key` | `{ action, provider }` | `{ success: true }` |

---

### `mini-app-gen`

AI-powered mini-app code generation for AppForge.

| | |
|---|---|
| **Auth** | Required |
| **Method** | POST |

**Request:**
```json
{
  "prompt": "Create a pomodoro timer",
  "name": "Pomodoro"
}
```

**Response:**
```json
{
  "code": "<div>...</div>",
  "name": "Pomodoro",
  "description": "A simple pomodoro timer"
}
```

---

### `grok-imagine`

Image generation via xAI's Grok image model.

| | |
|---|---|
| **Auth** | Required |
| **Method** | POST |

**Request:**
```json
{
  "prompt": "A geometric crystal lattice",
  "n": 1
}
```

**Response:**
```json
{
  "images": [{ "url": "https://..." }]
}
```

---

### `elevenlabs-tts`

Text-to-speech via ElevenLabs API.

| | |
|---|---|
| **Auth** | Required |
| **Method** | POST |
| **Secret** | `ELEVENLABS_API_KEY` |

**Request:**
```json
{
  "text": "Hello from PRIME OS",
  "voice_id": "optional-voice-id"
}
```

**Response:** Audio binary (MP3).

---

## Finance Domain

### `prime-bank`

Token economy operations (mint, transfer, debit).

| | |
|---|---|
| **Auth** | Required (service role for mint) |
| **Method** | POST |

**Actions:**

| Action | Body | Description |
|---|---|---|
| `mint` | `{ action, userId, amount, tokenType }` | Mint tokens (admin only) |
| `transfer` | `{ action, toUserId, amount, tokenType }` | Transfer between users |
| `debit` | `{ action, amount, tokenType, description }` | Debit from user's wallet |
| `balance` | `{ action }` | Get current balances |

---

### `market-data`

Stock and crypto price lookup.

| | |
|---|---|
| **Auth** | Required |
| **Method** | POST |
| **Secret** | `POLYGON_API_KEY` |

**Request:**
```json
{
  "symbols": ["AAPL", "BTC-USD"],
  "type": "stock"
}
```

**Response:**
```json
{
  "prices": {
    "AAPL": { "price": 195.50, "change": 2.3 }
  }
}
```

---

### `sports-odds`

Sports betting odds via The Odds API.

| | |
|---|---|
| **Auth** | Required |
| **Method** | POST |
| **Secret** | `THE_ODDS_API_KEY` |

**Request:**
```json
{
  "sport": "basketball_nba",
  "action": "get-odds"
}
```

**Response:**
```json
{
  "events": [
    {
      "id": "...",
      "home_team": "Lakers",
      "away_team": "Celtics",
      "commence_time": "...",
      "bookmakers": [...]
    }
  ]
}
```

---

### `resolve-markets`

Resolve prediction market outcomes.

| | |
|---|---|
| **Auth** | Required (admin) |
| **Method** | POST |

**Request:**
```json
{
  "marketId": "uuid",
  "outcome": "yes"
}
```

---

## Bot & Agent Domain

### `bot-api`

Bot lifecycle management (create, update, delete, list).

| | |
|---|---|
| **Auth** | Required |
| **Method** | POST |

**Actions:** `create`, `update`, `delete`, `list`, `get`

---

### `bot-runner`

Execute a bot's scheduled or triggered task.

| | |
|---|---|
| **Auth** | Required |
| **Method** | POST |

**Request:**
```json
{
  "botId": "uuid",
  "instruction": "Check for new emails and summarize"
}
```

---

### `agent-runtime`

Autonomous agent execution with multi-step tool use.

| | |
|---|---|
| **Auth** | Required |
| **Method** | POST |

**Request:**
```json
{
  "taskId": "uuid",
  "botId": "uuid"
}
```

---

## System Domain

### `system-analytics`

Real-time table counts and activity aggregation.

| | |
|---|---|
| **Auth** | Required (admin) |
| **Method** | POST |

**Request:**
```json
{
  "action": "dashboard"
}
```

**Response:**
```json
{
  "users": 42,
  "messages": 1500,
  "bots": 12,
  "recentActivity": [...]
}
```

---

### `admin-actions`

Role management and admin operations.

| | |
|---|---|
| **Auth** | Required (admin) |
| **Method** | POST |

**Actions:** `list-users`, `set-role`, `remove-role`, `ban-user`

---

### `web-proxy`

CORS proxy for PrimeBrowser to load external web pages.

| | |
|---|---|
| **Auth** | Required |
| **Method** | GET |
| **Query** | `?url=https://example.com` |

**Response:** Proxied HTML content.

---

### `cron-dispatcher`

Scheduled task execution for bots with cron schedules.

| | |
|---|---|
| **Auth** | Service role |
| **Method** | POST |

Checks `bot_registry` for bots with active schedules and dispatches to `bot-runner`.

---

### `hook-dispatcher`

Executes Cloud Hooks when their trigger events fire.

| | |
|---|---|
| **Auth** | Required |
| **Method** | POST |

**Request:**
```json
{
  "event": "file.uploaded",
  "payload": { "name": "report.pdf" }
}
```

---

### `github-app`

GitHub App OAuth flow and webhook receiver.

| | |
|---|---|
| **Auth** | Varies (webhook: signature verification; link: user auth) |
| **Method** | POST / GET |

**Actions:**

| Query Param | Description |
|---|---|
| `action=link-installation&installation_id=123` | Link GitHub installation to user |
| POST body (webhook) | GitHub webhook event payload |

---

## Secrets Reference

| Secret | Used By | Description |
|---|---|---|
| `POLYGON_API_KEY` | `market-data` | Stock/crypto price data |
| `THE_ODDS_API_KEY` | `sports-odds` | Sports betting odds |
| `ELEVENLABS_API_KEY` | `elevenlabs-tts` | Text-to-speech |
| `GITHUB_APP_PRIVATE_KEY` | `github-app` | GitHub App authentication |
| `GITHUB_APP_ID` | `github-app` | GitHub App ID |
| `GITHUB_WEBHOOK_SECRET` | `github-app` | Webhook signature verification |
