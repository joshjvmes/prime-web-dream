

## Deep Memory System + Multi-Agent Model Selection

Three interconnected features to implement:

### 1. Conversation Summarization on Compact

When the auto-compact triggers (>100 messages → trim to 60), instead of just deleting old messages, first summarize them using the AI and save the summary as a memory.

**`supabase/functions/hyper-chat/index.ts`** changes:
- Add a new function `summarizeAndCompact(userId)` that:
  1. Loads the oldest messages that are about to be deleted (the ones beyond the 60 newest)
  2. Calls the Lovable AI gateway (non-streaming, low-cost model `google/gemini-2.5-flash-lite`) with a prompt: "Summarize this conversation into key facts, preferences, and topics discussed"
  3. Saves the summary as an `ai_memories` entry with category `"summary"`
  4. Then deletes the old conversation rows
- Call this function inside `saveConversationMessage` when pruning (currently line 636-641), replacing the simple delete

**`src/components/os/RokCatApp.tsx`** changes:
- Update the client-side auto-compact (lines 64-72) to call a new backend endpoint instead of deleting directly, so the summarization happens server-side
- Or simpler: keep client-side delete but also call the edge function to trigger summarization before deletion

### 2. Adaptive System Learning Memory

Enable ROKCAT to learn from interactions and improve over time by adding a self-reflection tool and periodic learning cycles.

**`supabase/functions/hyper-chat/index.ts`** changes:
- Add a new tool `learn_pattern` to the TOOLS array:
  - Parameters: `pattern` (string), `context` (string: "system_usage", "user_preference", "error_recovery", "workflow")
  - Stores learned patterns in `ai_memories` with category `"learning"`
- Update `BASE_SYSTEM_PROMPT` with learning instructions:
  - "When you notice patterns in how the operator uses the system, save them with learn_pattern"
  - "When you make mistakes or the operator corrects you, learn from it"
  - "Before complex tasks, recall relevant learned patterns"
- Add `loadLearnings(userId)` function that loads `ai_memories` where category = 'learning', injected into system prompt as `[LEARNED PATTERNS]`
- Update `buildSystemPrompt` to include learned patterns as a separate section

### 3. Multi-Agent Model Toggle in ROKCAT UI

Currently the multi-agent model (`grok-4.20-multi-agent-experimental-beta-0304`) is only selectable from Settings. Add a quick-toggle in ROKCAT's toolbar so users with an xAI key can switch to multi-agent mode directly.

**`src/components/os/RokCatApp.tsx`** changes:
- Add a "Multi-Agent" toggle button (using the `Brain` icon, already imported) in the toolbar area, visible only when `isXAI` is true
- When toggled on: update `user_data` key `ai-provider` to set model to `grok-4.20-multi-agent-experimental-beta-0304`; set `isMultiAgent(true)` and `isGrok420(true)`
- When toggled off: revert to `grok-4.20-experimental-beta-0304-reasoning`; set `isMultiAgent(false)`
- The ThinkingPanel already handles multi-agent reasoning events from the SSE stream — no changes needed there

**`supabase/functions/_shared/ai-router.ts`** changes:
- The multi-agent model is already supported in `GROK_RESPONSES_MODELS` (line 459) and `callXAIResponses` already sets `reasoning.effort` for multi-agent (line 539-541)
- The stream converter already forwards `reasoning.delta`, `agent.start`, `agent.completed` events (lines 604-629)
- No changes needed — the infrastructure is already in place

### Files to modify:
1. **`supabase/functions/hyper-chat/index.ts`** — Add `summarizeAndCompact`, `learn_pattern` tool, `loadLearnings`, update prompt and compaction logic
2. **`src/components/os/RokCatApp.tsx`** — Add multi-agent toggle button, update compact to trigger server-side summarization

### No database changes needed
- `ai_memories` table already supports the `summary` and new `learning` categories via its text `category` column
- `ai_conversations` table is unchanged
- `user_data` table is unchanged

