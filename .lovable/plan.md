

## Answer: Yes, There Is Already a Fallback

The AI router (`_shared/ai-router.ts`) already has a complete fallback system. Here's how it works:

1. **User has a custom API key configured** → routes to their chosen provider (xAI, OpenAI, Anthropic, Google)
2. **Custom provider call fails** → automatically falls back to the Lovable AI gateway (line 748-749)
3. **No custom key configured / guest / new user** → goes directly to the Lovable AI gateway (line 759-760)

The Lovable AI gateway uses the `LOVABLE_API_KEY` secret (already configured) and defaults to `google/gemini-3-flash-preview` as the model. This means:

- **Guest users**: ROKCAT chat works via Lovable AI (Gemini Flash)
- **New users without keys**: Same — fully functional chat
- **Users with keys**: Uses their provider, falls back to Lovable AI on failure

**The only feature that does NOT have a fallback is image/video generation** (`grok-imagine`), which requires an xAI API key with no alternative. The `grok-imagine` edge function checks for the user's xAI key and returns a 400 error if missing.

### No code changes needed for chat — but we could add a fallback for image generation.

Since Lovable AI supports `google/gemini-3-pro-image-preview` and `google/gemini-3.1-flash-image-preview` for image generation, we could add a fallback in `grok-imagine` so users without an xAI key can still generate images via Lovable AI's image models. This would make the creative features accessible to everyone.

Want me to plan that image generation fallback?

