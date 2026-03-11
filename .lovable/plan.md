

# Test & Expose New Beta Grok Features

## Current State

Your xAI key is already configured and working with `grok-4-latest`. The backend ai-router already supports three Grok 4.20 beta models via the Responses API:
- `grok-4.20-experimental-beta-0304-reasoning` (reasoning model)
- `grok-4.20-experimental-beta-0304-non-reasoning` (fast non-reasoning)
- `grok-4.20-multi-agent-experimental-beta-0304` (multi-agent with 4 agents)

It also supports xAI built-in server-side tools: `web_search`, `x_search`, and `code_execution`.

**However**, these beta models are not selectable in the Settings UI — users can only pick `grok-4-latest`, `grok-3`, etc.

## Plan

### 1. Add Grok 4.20 beta models to Settings UI

Update `src/components/os/SettingsApp.tsx` to add the three beta models to the xAI model picker:
- Grok 4.20 Reasoning (Beta)
- Grok 4.20 Non-Reasoning (Beta)
- Grok 4.20 Multi-Agent (Beta)

### 2. Enable xAI built-in tools in hyper-chat

Update `supabase/functions/hyper-chat/index.ts` to pass `web_search` and `x_search` as additional tools when the user's provider is xAI and using a Grok 4.20 model. This lets Grok natively search the web and X/Twitter during conversations.

### 3. Add streaming support for Grok 4.20 Responses API

Currently `callXAIResponses` only handles non-streaming responses. For ROKCAT's token-by-token chat experience, add streaming support so Grok 4.20 models stream properly through the SSE pipeline (the legacy `callXAIChatCompletions` already streams).

These changes will let you select a Grok 4.20 beta model in Settings, then use ROKCAT or the terminal to chat with it — including web search and X search capabilities.

