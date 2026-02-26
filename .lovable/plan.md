
# Bring-Your-Own-AI-Key System

## Overview

Let users plug in their own API keys for Claude (Anthropic), ChatGPT (OpenAI), or Gemini (Google) directly from Settings. When a key is configured, the OS routes AI calls through their chosen provider instead of the default Lovable AI gateway -- giving them "unchained" access to their preferred model.

## How It Works (User Perspective)

1. Open **Settings > AI Provider** (new panel)
2. Choose a provider: **Default (Built-in)**, **OpenAI**, **Anthropic**, or **Google Gemini**
3. Paste their API key
4. Pick a model (dropdown shows available models for that provider)
5. All AI features (Hypersphere, ROKCAT, BotLab, mini-app generation) now use their key

Keys are stored securely in the cloud database (encrypted at rest) and never leave the backend -- the frontend only sends a provider/model preference, and the edge function reads the key server-side.

## Architecture

```text
User Browser                    Edge Function (hyper-chat)
    |                                    |
    |-- provider: "openai"  ------------>|
    |-- model: "gpt-4o"                  |
    |                                    |-- Load user's API key from DB
    |                                    |-- Route to OpenAI / Anthropic / Google
    |                                    |-- OR fall back to Lovable AI gateway
    |<--- streamed response -------------|
```

## Changes

### 1. New Settings Panel: "AI Provider"

**File: `src/components/os/SettingsApp.tsx`**

Add a new panel `'ai'` to PANELS list with a Brain/Cpu icon. The panel contains:
- Provider selector (radio buttons): Default, OpenAI, Anthropic, Google Gemini
- API key input field (password type, with show/hide toggle)
- Model dropdown (populated based on selected provider)
- "Save" button that stores config via `useCloudStorage`
- "Test Connection" button that calls a new edge function endpoint to validate the key
- Status indicator showing current active provider

Provider-to-model mappings:
- **OpenAI**: gpt-4o, gpt-4o-mini, gpt-4-turbo, o1, o1-mini
- **Anthropic**: claude-sonnet-4-20250514, claude-3.5-haiku, claude-3-opus
- **Google Gemini**: gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash

### 2. Secure Key Storage via Cloud

**File: `src/components/os/SettingsApp.tsx`** (uses existing `useCloudStorage`)

- Save provider config: `cloudStorage.save('ai-provider', { provider, model })`
- Save API key separately via a **new edge function** (not stored in client-accessible cloud storage for security)

### 3. New Edge Function: `ai-key-manager`

**File: `supabase/functions/ai-key-manager/index.ts`**

Endpoints:
- `POST { action: 'save-key', provider, apiKey }` -- stores encrypted key in `user_data` table with key `ai-api-key-{provider}`
- `POST { action: 'test-key', provider, apiKey }` -- makes a minimal API call to validate the key works
- `POST { action: 'get-config' }` -- returns which provider/model is configured (never returns the actual key)
- `POST { action: 'delete-key', provider }` -- removes a stored key

Requires authentication (reads user ID from auth header). Keys are stored server-side only.

### 4. Update `hyper-chat` Edge Function

**File: `supabase/functions/hyper-chat/index.ts`**

Before making the AI call:
1. Check if the authenticated user has a custom AI provider configured
2. Load their API key from `user_data` table
3. Route the request to the appropriate provider's API:
   - **OpenAI**: `https://api.openai.com/v1/chat/completions` (same format as current gateway)
   - **Anthropic**: `https://api.anthropic.com/v1/messages` (needs message format conversion)
   - **Google Gemini**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` (needs format conversion)
4. If no custom provider or key fails, fall back to the default Lovable AI gateway

Add a helper function `callAIProvider(provider, model, apiKey, messages, tools, stream)` that handles the format differences between providers:
- OpenAI: native format (same as current)
- Anthropic: convert `messages` array to Anthropic format, map `tools` to Anthropic tool format, handle streaming via SSE
- Gemini: convert to Google's `contents` format, map tools to `function_declarations`

### 5. Update Other AI Edge Functions

**Files: `supabase/functions/ai-social/index.ts`, `supabase/functions/bot-runner/index.ts`, `supabase/functions/mini-app-gen/index.ts`**

Add the same provider routing logic (extract into a shared utility):

**File: `supabase/functions/_shared/ai-router.ts`**

Shared module that:
- Loads user AI config from DB
- Provides `routeAICall({ userId, messages, tools, stream, systemPrompt })` function
- Handles provider-specific request/response format conversion
- Falls back to Lovable AI gateway when no custom key is set

### 6. Database: User AI Keys Table

**New migration** to create a dedicated table (more secure than generic `user_data`):

```sql
CREATE TABLE public.user_ai_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
  encrypted_key TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.user_ai_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own AI keys"
  ON public.user_ai_keys FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## Technical Details

### Provider API Format Differences

| Feature | OpenAI | Anthropic | Google Gemini |
|---------|--------|-----------|---------------|
| Endpoint | `/v1/chat/completions` | `/v1/messages` | `/v1beta/models/{model}:generateContent` |
| Auth header | `Authorization: Bearer` | `x-api-key` + `anthropic-version` | `?key=` query param |
| Message format | `{role, content}` | `{role, content}` (no "system" in messages) | `{parts: [{text}]}` |
| System prompt | In messages array | Separate `system` field | In `systemInstruction` |
| Tool calling | `tools` array | `tools` array (similar) | `function_declarations` |
| Streaming | SSE `data:` lines | SSE `event:` lines | SSE or JSON chunks |

### AI Router Shared Module

The `_shared/ai-router.ts` module will:
1. Accept a unified request format (OpenAI-compatible)
2. Transform to provider-specific format
3. Make the API call
4. Transform the response back to OpenAI-compatible format
5. Handle streaming by converting provider-specific SSE to standard format

### Security Model

- API keys are stored in a dedicated RLS-protected table
- Keys are only readable by the owning user
- The edge function reads keys server-side -- they never transit through the client
- The Settings UI only shows masked key values (last 4 characters)
- Users can delete their keys at any time

### Files Modified/Created

| File | Change |
|------|--------|
| `src/components/os/SettingsApp.tsx` | Add "AI Provider" panel with provider/model/key configuration UI |
| `supabase/functions/ai-key-manager/index.ts` | **New** -- save, test, delete API keys securely |
| `supabase/functions/_shared/ai-router.ts` | **New** -- shared AI provider routing and format conversion |
| `supabase/functions/hyper-chat/index.ts` | Use `ai-router` to support custom providers |
| `supabase/functions/ai-social/index.ts` | Use `ai-router` for custom provider support |
| `supabase/functions/bot-runner/index.ts` | Use `ai-router` for custom provider support |
| `supabase/functions/mini-app-gen/index.ts` | Use `ai-router` for custom provider support |
| `supabase/config.toml` | Add `ai-key-manager` function config |
| New migration | Create `user_ai_keys` table with RLS |

### Execution Order

1. Create the `user_ai_keys` database table with RLS
2. Create `_shared/ai-router.ts` with provider routing logic
3. Create `ai-key-manager` edge function
4. Update `hyper-chat` to use the AI router
5. Update other AI edge functions (`ai-social`, `bot-runner`, `mini-app-gen`)
6. Add the AI Provider settings panel to the Settings app
7. Update `supabase/config.toml` with the new function
