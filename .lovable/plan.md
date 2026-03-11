

# Wire Up Grok Imagine (Image + Video) & Multi-Agent Mode

## Overview

Three features to add:
1. **Grok Imagine Image** — ROKCAT can generate images via xAI's `/v1/images/generations` endpoint
2. **Grok Imagine Video** — ROKCAT can generate videos via xAI's `/v1/videos/generations` endpoint (async with polling)
3. **Multi-Agent Mode** — Surface the multi-agent thinking process in the ROKCAT UI when using `grok-4.20-multi-agent`

All three require an xAI API key already configured by the user (BYOAK pattern already in place).

---

## 1. Grok Imagine Image

**Backend**: Add a new edge function `supabase/functions/grok-imagine/index.ts` that handles both image and video generation.

- **Image endpoint**: Proxies to `POST https://api.x.ai/v1/images/generations` with model `grok-imagine-image`
- Accepts `{ type: "image", prompt: string, n?: number }` from client
- Returns the generated image URL(s) from xAI's response
- Uses the user's xAI API key (loaded via the same `loadUserAIConfig` pattern from `ai-router.ts`)

**Frontend**: Add a `generate_image` tool to ROKCAT's tool system in `hyper-chat/index.ts`:
- Tool definition: `generate_image(prompt, style?)` 
- When triggered, calls the new `grok-imagine` edge function
- Returns image URL in the tool response, rendered as an inline `<img>` in the chat

**Chat rendering**: Update `RokCatApp.tsx` to detect image URLs in responses and render them as clickable thumbnails inline in the chat transcript.

## 2. Grok Imagine Video

**Backend** (same `grok-imagine` edge function):
- **Video endpoint**: Proxies to `POST https://api.x.ai/v1/videos/generations` with model `grok-imagine-video`
- Video generation is **async** — submit, then poll `GET /v1/videos/{request_id}` until `status: "done"`
- Accepts `{ type: "video", prompt: string, duration?: number, image_url?: string }`
- Polls with exponential backoff (max ~2 min), returns final video URL
- Returns `{ url, duration, status }` to client

**Frontend**: Add a `generate_video` tool to ROKCAT's tool system:
- Tool definition: `generate_video(prompt, duration?, image_url?)`
- Returns video URL rendered as an inline `<video>` player in the chat

**Chat rendering**: Update `RokCatApp.tsx` to detect video URLs and render them with a `<video>` tag with controls.

## 3. Multi-Agent Mode Visibility

The multi-agent model (`grok-4.20-multi-agent-experimental-beta-0304`) already works via the Responses API in `ai-router.ts`. The current implementation sets `reasoning: { effort: "medium" }` but doesn't surface agent activity to the user.

**Backend** (`ai-router.ts`):
- In `convertXAIResponsesStreamToOpenAI`, detect and forward agent-specific SSE events (e.g., `reasoning.delta`, agent name indicators) as custom SSE data fields
- Emit `{ agentStatus: "agent_name", thinking: "..." }` events alongside content deltas

**Frontend** (`RokCatApp.tsx`):
- When streaming from a multi-agent model, parse `agentStatus` events from the SSE stream
- Display a "thinking panel" below the face showing which agents are active (Grok, Harper, Benjamin, Lucas) with their current thinking snippets
- Show agent avatars/icons with pulsing animations while they're active
- Collapse the thinking panel once the final response arrives

## 4. Feature Gating

- Image and video generation are **only available when the user has an xAI key configured**
- Add toggle buttons in the ROKCAT header (similar to web/x search toggles) for Imagine features when xAI is active
- Multi-agent visibility is automatic when the multi-agent model is selected

## 5. System Prompt Update

Update `APP_ACTION_PROMPT` and `BASE_SYSTEM_PROMPT` in `hyper-chat/index.ts` to inform the model about:
- `generate_image` tool for creating images from descriptions
- `generate_video` tool for creating short video clips
- Instructions to use these tools when users ask for visual content

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/grok-imagine/index.ts` | **Create** — Image + video generation proxy with polling |
| `supabase/functions/hyper-chat/index.ts` | **Modify** — Add `generate_image` and `generate_video` tool definitions + handlers |
| `supabase/functions/_shared/ai-router.ts` | **Modify** — Forward agent thinking events in multi-agent stream |
| `src/components/os/RokCatApp.tsx` | **Modify** — Render images/videos inline, show multi-agent thinking panel |
| `src/components/os/rokcat/actionParser.ts` | **Modify** — Update prompt with imagine capabilities |

## Technical Notes

- xAI image generation returns base64 or URL — we'll use URL mode for efficiency
- Video generation is async with polling — the edge function handles the wait loop server-side so the client just gets the final result
- Multi-agent thinking events depend on what xAI actually sends in the SSE stream; we'll forward what's available and gracefully degrade if the format changes
- All Imagine features require the user's own xAI API key — they won't work with the default Lovable AI gateway

