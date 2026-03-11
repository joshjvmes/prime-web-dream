

## Plan: Fix Video Generation + Add Dev Test Bypass

### 1. Fix Video Generation

**Root cause:** The edge function's server-side polling loop (up to ~2 min) likely exceeds the edge function execution timeout (~60s on Supabase). The function times out silently, or returns before the video is ready. Additionally, the actual xAI response shape isn't being logged, so we can't confirm we're parsing it correctly.

**Fix approach — client-side polling:**

Instead of polling inside the edge function (which times out), split into two calls:

1. **Submit endpoint** (`type: "video"`): Sends the generation request to xAI, returns the `requestId` immediately to the client.
2. **Poll endpoint** (`type: "video-poll"`): Client calls this every few seconds with the `requestId`; the edge function checks status once and returns immediately.

**Changes to `supabase/functions/grok-imagine/index.ts`:**
- `generateVideo` → only submits the job, returns `{ type: "video", requestId, status: "pending" }` immediately
- Add `pollVideo(apiKey, requestId)` → single status check, returns `{ status: "pending"|"done"|"failed", url? }`
- Add `type: "video-poll"` route in the main handler
- Add detailed `console.log` of the raw xAI response bodies at every step

**Changes to `src/components/os/RokCatApp.tsx` (`handleImagine`):**
- When `type === "video"` and response has `requestId` + `status: "pending"`, start a client-side polling interval (~5s, up to 40 attempts = ~3.3 min)
- Update the placeholder message with progress dots
- On `status: "done"`, render the `[VIDEO:url]` tag
- On failure/timeout, show error

### 2. Dev Test Auth Bypass

Add a `/os?dev=1` query param mode that auto-signs in with a test account, so the browser tool can access the OS without manual login.

**Changes to `src/pages/Index.tsx`:**
- On mount, check for `?dev=1` in the URL
- If present and no active session, call `supabase.auth.signInWithPassword()` with a dedicated test account
- This only works in preview/development URLs (check `window.location.hostname`)

**Requires:** A test user account in the auth system. We'll create one via a small migration or manual setup, and store the credentials as secrets (or hardcode for dev-only with hostname guard).

**Alternative (simpler):** Skip the dev bypass for now since it requires credential management. Instead, the user can log in once in the preview, and the browser tool session will persist.

---

**Summary of file changes:**
- `supabase/functions/grok-imagine/index.ts` — split video into submit + poll, add logging
- `src/components/os/RokCatApp.tsx` — client-side polling loop for video generation

