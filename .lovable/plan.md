
# Hyper AI Agent: Autonomous Social and Mail Integration

## Overview

Give Hyper (the user's AI companion) the ability to autonomously post to PrimeSocial and send emails through PrimeMail. When the user asks Hyper to "post about the system status" or "send an email to Q3-Inference", Hyper will use AI tool calling to generate and inject real content into those apps in real time.

## How It Works

The approach uses three layers:

1. **Backend**: The `hyper-chat` edge function gets new "tools" -- `post_to_social` and `send_email`. When Hyper decides to use one, the AI returns structured data describing the post or email.

2. **Frontend Bridge**: HypersphereApp detects tool calls in the AI response, extracts the content, and broadcasts it over the EventBus so other apps can pick it up.

3. **Receiving Apps**: PrimeSocial and PrimeMail listen on the EventBus for incoming content and add it to their feeds in real time.

The result: you tell Hyper "post an update about the energy metrics" and seconds later a new post from "Hyper" appears in the PrimeSocial feed, visible while you're watching.

---

## Part 1: Backend Tool Definitions

### File: `supabase/functions/hyper-chat/index.ts`

Add two tool definitions so the AI model can choose to post or email:

**`post_to_social` tool:**
- Parameters: `content` (post text), `author` (defaults to "Hyper"), `role` (defaults to "Geometric AI")

**`send_email` tool:**
- Parameters: `to` (recipient), `subject`, `body`, `from` (defaults to "hyper@prime.os")

Switch the function to a two-phase approach:
1. First call: non-streaming, with tools enabled. Check if the AI wants to use a tool.
2. If tool call detected: extract the structured data, return it as a JSON response with `type: "tool_call"` so the frontend knows.
3. If no tool call: re-call with streaming enabled (no tools) and stream the text response as before.

This avoids the complexity of parsing tool calls from an SSE stream.

---

## Part 2: Frontend Tool Call Handling

### File: `src/components/os/HypersphereApp.tsx`

Update the `sendMessage` function:

1. Make the initial fetch to `hyper-chat` and check the response content type.
2. If the response is JSON (not SSE), it's a tool call result. Parse it and:
   - Emit `social.post.created` or `mail.received` on the EventBus with the content
   - Show a confirmation message in the chat like "Posted to PrimeSocial: [content preview]" or "Email sent to [recipient]: [subject]"
3. If the response is SSE (text/event-stream), handle streaming as before.

Add new quick action buttons:
- "Post Update" -- prompts Hyper to post something to PrimeSocial
- "Send Report" -- prompts Hyper to email a system report

---

## Part 3: PrimeSocial Event Listener

### File: `src/components/os/PrimeSocialApp.tsx`

- Import `eventBus` from `useEventBus`
- Add a `useEffect` that subscribes to `social.post.created`
- When received, prepend a new post to the feed with the payload data (author, content, role) and an "AI Agent" badge
- Clean up subscription on unmount

---

## Part 4: PrimeMail Event Listener

### File: `src/components/os/PrimeMailApp.tsx`

- Import `eventBus` from `useEventBus`
- Add a `useEffect` that subscribes to `mail.received`
- When received, prepend a new unread email to the inbox with the payload data (from, to, subject, body)
- Clean up subscription on unmount

---

## Part 5: EventBus Updates

### File: `src/hooks/useEventBus.ts`

Add two new event types to the `EVENT_TYPES` array:
- `social.post.created`
- `mail.received`

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/hyper-chat/index.ts` | Add tool definitions for post_to_social and send_email; implement two-phase response (tools check then stream) |
| `src/components/os/HypersphereApp.tsx` | Detect JSON tool-call responses, emit EventBus events, add quick action buttons for social/mail |
| `src/components/os/PrimeSocialApp.tsx` | Subscribe to `social.post.created` EventBus events and inject posts |
| `src/components/os/PrimeMailApp.tsx` | Subscribe to `mail.received` EventBus events and inject emails |
| `src/hooks/useEventBus.ts` | Add `social.post.created` and `mail.received` event types |

### No Database Changes Required

All content flows through ephemeral client-side state via the EventBus. No new tables or migrations needed.

### Edge Function Response Format

For tool calls, the edge function returns:
```text
{
  "type": "tool_call",
  "tool": "post_to_social" | "send_email",
  "data": { ... structured content ... },
  "reply": "Done! I've posted to PrimeSocial about..."
}
```

For normal chat, it streams SSE as before (no change to existing behavior).

### User Experience

- User says: "Post an update about today's energy metrics"
- Hyper processes the request, generates a social post via tool calling
- A confirmation appears in the Hyper chat: "Posted to PrimeSocial: [preview]"
- If PrimeSocial is open, the post appears instantly in the feed
- Same flow for emails: "Send Q3-Inference a report on fold compression" triggers a real email in PrimeMail
