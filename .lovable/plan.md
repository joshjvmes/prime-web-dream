

# Add Grok (xAI) as Primary AI Provider + Enhanced Settings

## Overview

Add xAI's Grok as a first-class AI provider in PRIME OS, making it the default for non-admin users. The xAI API is OpenAI-compatible (`https://api.x.ai/v1/chat/completions`), so integration is lightweight. ROKCAT's system prompt will be updated to reflect its Grok-powered personality.

## Changes

### 1. Add xAI/Grok to the AI Router

**File: `supabase/functions/_shared/ai-router.ts`**

- Add `"xai"` to the `UserAIConfig.provider` type union
- Add `getDefaultModel("xai")` returning `"grok-4-latest"`
- Add `callXAI()` function -- since xAI uses OpenAI-compatible format, it's essentially `callOpenAI()` but pointed at `https://api.x.ai/v1/chat/completions`
- Add `case "xai"` to the router switch
- Add `testAIKey("xai", ...)` that hits `https://api.x.ai/v1/models` to validate the key
- Update the provider CHECK constraint on `user_ai_keys` table to include `'xai'`

### 2. Add xAI to Settings Panel

**File: `src/components/os/SettingsApp.tsx`**

Add to `PROVIDER_MODELS`:
```text
xai: { label: 'xAI (Grok)', models: [
  { value: 'grok-4-latest', label: 'Grok 4' },
  { value: 'grok-3', label: 'Grok 3' },
  { value: 'grok-3-mini', label: 'Grok 3 Mini' },
  { value: 'grok-3-fast', label: 'Grok 3 Fast' },
]}
```

Update the description text to mention xAI/Grok prominently as the recommended provider.

### 3. Update ai-key-manager

**File: `supabase/functions/ai-key-manager/index.ts`**

The `test-key` action routes to `testAIKey` in `ai-router.ts`, which will now handle `"xai"`.

### 4. Update ROKCAT System Prompt

**File: `supabase/functions/hyper-chat/index.ts`**

Update the `BASE_SYSTEM_PROMPT` to include ROKCAT's identity as powered by Grok when the user's provider is xAI. The system prompt already gets sent with every call, so when routed through xAI, it naturally uses Grok.

### 5. Update Database Constraint

**New migration** to alter the CHECK constraint on `user_ai_keys.provider` to allow `'xai'` in addition to the existing providers. (If there's no CHECK constraint, just ensure the column accepts `'xai'` as a value -- checking the schema shows `provider` is just `text` with no CHECK, so no migration needed.)

### 6. Store xAI API Key as Secret

The user's xAI API key will be stored securely via the existing `ai-key-manager` edge function (per-user, in `user_ai_keys` table). However, since the user wants to provide their key now, I'll prompt them to enter it through the Settings UI after implementation, or use the secrets tool if they want a system-wide default.

## Technical Details

### xAI API Compatibility

The xAI API is fully OpenAI-compatible:
- Endpoint: `https://api.x.ai/v1/chat/completions`
- Auth: `Authorization: Bearer {key}`
- Supports `stream: true` with standard SSE format
- Same message format: `{role, content}`

This means `callXAI` is essentially `callOpenAI` with a different base URL. No format conversion needed.

### callXAI Implementation

```typescript
async function callXAI(config: UserAIConfig, opts: AIRouterOptions): Promise<Response> {
  const body: any = {
    model: config.model,
    messages: opts.messages,
    stream: opts.stream ?? false,
  };
  if (opts.tools?.length) {
    body.tools = opts.tools;
    if (opts.toolChoice) body.tool_choice = opts.toolChoice;
  }
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;

  return fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
```

### ROKCAT Prompt Update

When the active provider is xAI/Grok, ROKCAT's personality naturally channels through Grok. The existing system prompt in `hyper-chat` works as-is since it describes ROKCAT's personality and Grok will follow it. The prompt will be tweaked to say "You are ROKCAT, the Grok-powered AI companion of PRIME OS, a CEO orchestrator designed to interface the Prime OS by Rocket Logic Global."

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/_shared/ai-router.ts` | Add `callXAI`, `case "xai"`, `testAIKey("xai")`, update `getDefaultModel` |
| `src/components/os/SettingsApp.tsx` | Add xAI to `PROVIDER_MODELS`, update description text |
| `supabase/functions/hyper-chat/index.ts` | Update ROKCAT system prompt to reference Grok/Rocket Logic |
| `src/components/os/RokCatApp.tsx` | Update ROKCAT's chat system prompt to reference Grok identity |

### Execution Order

1. Update `ai-router.ts` with xAI support (callXAI + testAIKey + router case)
2. Update Settings panel with xAI provider option
3. Update ROKCAT and Hyper system prompts
4. Deploy edge functions

### API Key Handling

The user shared an xAI API key in the chat. After implementation, they can paste it into Settings > AI Provider > xAI > API Key field. The key gets stored encrypted server-side via `ai-key-manager` and is never exposed to the client.

