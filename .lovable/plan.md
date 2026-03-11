

## Fix: Update Deprecated xAI Model Names

### Root Cause
The edge function logs show xAI deprecated `grok-2-image-1212` on 2026-02-24. The replacement model is `grok-imagine-image`. The user also mentioned `grok-imagine-image-pro` and `grok-imagine-video` as available models.

### Changes

**`supabase/functions/grok-imagine/index.ts`**
- Change image model from `"grok-2-image-1212"` to `"grok-imagine-image"` (or `"grok-imagine-image-pro"` for higher quality)
- Change video model from `"grok-2-video"` to `"grok-imagine-video"`
- Add detailed `console.log` statements before/after API calls so future issues are easier to diagnose: log the model used, prompt length, response status, and any error body

