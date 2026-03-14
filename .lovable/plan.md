

## Fix: System Prompt Leaking into Chat History

### The Problem
The terminal sends AI requests with system instructions embedded in the user message content (e.g., `"You are greeting the user in a terminal shell...\n\nUser: Hi Rokcat"`). The edge function saves this raw content to `ai_conversations`, and when ROKCAT loads chat history, those system prompts appear as visible user messages.

### Root Cause
- **`src/components/os/TerminalApp.tsx` line 75-77**: Combines `systemNote` + user text into a single user message
- **`supabase/functions/hyper-chat/index.ts` line 1310-1311**: Saves the full `lastUserMsg.content` to the database, including embedded system instructions

### Fix (two parts)

**1. Terminal: Use `systemContext` field instead of embedding in user content**

In `src/components/os/TerminalApp.tsx`, change the `streamAiResponse` function to send the system note as a separate `systemContext` field in the request body (same pattern ROKCAT already uses on line 513), rather than concatenating it into the user message content.

**2. Edge function: Strip system-like content before saving**

In `supabase/functions/hyper-chat/index.ts`, add a guard in `saveConversationMessage` or at the save call site (line 1310-1311) to skip saving messages that look like system instructions (start with "You are greeting" or "You are ROKCAT" patterns). Alternatively, accept a `skipSave` flag from the request body for terminal-originated requests that shouldn't persist.

The cleaner approach: add a `noSave: true` field to the terminal's request body, and check it at line 1309 to skip conversation persistence entirely for terminal AI calls.

**3. Hide learnings from `recall_memories` results**

Already handled — line 623 filters out `category = 'learning'` from `loadMemories`. The `recallMemories` function (line 695-698) does NOT filter learnings though. Add `.not("category", "eq", "learning")` to `recallMemories` as well.

### Files to modify
1. **`src/components/os/TerminalApp.tsx`** — Send `systemContext` separately, add `noSave: true`
2. **`supabase/functions/hyper-chat/index.ts`** — Respect `noSave` flag, filter learnings from `recallMemories`

