
# AI Memory, Context, and Identity System for Hyper

## Overview

Give Hyper persistent memory, user identity awareness, and session context so it seamlessly knows who the user is, what they've done, and what they care about -- across sessions and devices. This transforms Hyper from a stateless chatbot into a personalized AI companion.

## What Changes

### 1. User Context Injection (Frontend -> Backend)

**File: `src/components/os/HypersphereApp.tsx`**

Before sending messages to hyper-chat, gather and inject a context payload:

- **Profile**: Display name, title, bio (from `profiles` table or localStorage)
- **Wallet snapshot**: OS/IX balances (from localStorage cache or quick fetch)
- **Active apps**: Which windows are currently open (from window manager state)
- **Current workspace**: Which workspace the user is on
- **Permissions**: What Hyper is allowed to do
- **Session stats**: How long they've been active, number of messages this session

Send this as a `context` field alongside `messages` in the request body.

### 2. Persistent AI Memory (New Database Table)

**New table: `ai_memories`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| category | text | 'preference', 'fact', 'instruction', 'summary' |
| content | text | The memory content |
| created_at | timestamptz | When stored |
| updated_at | timestamptz | Last updated |

RLS: Users can only read/write their own memories.

Hyper gets a new tool `save_memory` to store important facts about the user (e.g., "Operator prefers concise responses", "Operator's favorite app is Terminal", "Operator is working on a trading strategy"). Also a `recall_memories` tool that searches stored memories.

### 3. Conversation History Persistence

**New table: `ai_conversations`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| role | text | 'user' or 'assistant' |
| content | text | Message text |
| created_at | timestamptz | When sent |

RLS: Users can only read/write their own conversations.

On each exchange, save the user message and Hyper's response. On session start, load the last N messages as conversation history so Hyper remembers what was discussed previously.

### 4. Backend: Context-Aware System Prompt

**File: `supabase/functions/hyper-chat/index.ts`**

- Accept `context` object from frontend
- Load user's memories from `ai_memories` table (last 20 entries)
- Load recent conversation history from `ai_conversations` (last 10 messages from prior sessions)
- Inject all of this into the system prompt as structured context blocks:

```text
[OPERATOR PROFILE]
Name: {name} | Title: {title} | Bio: {bio}

[WALLET]
OS: {balance} | IX: {balance}

[MEMORIES]
- Operator prefers detailed technical reports
- Operator is building a trading bot
- ...

[RECENT HISTORY]
(last 10 messages from previous sessions)
```

- Add two new tools: `save_memory` and `recall_memories`

### 5. New Hyper Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `save_memory` | Store a fact/preference about the operator for future reference | `category`, `content` |
| `recall_memories` | Search stored memories by keyword | `query` |

When Hyper detects the user sharing a preference, fact, or instruction, it proactively saves it. When it needs context, it can recall memories.

### 6. Session Context from Frontend

**File: `src/components/os/HypersphereApp.tsx`**

Build and send context object on each message:

```typescript
const context = {
  profile: { name, title, bio },
  permissions: { canPost, canEmail, canWallet },
  sessionMessages: messages.length,
  openApps: windows.filter(w => !w.isMinimized).map(w => w.app),
  workspace: currentWorkspace,
};
```

This requires accepting optional props for open windows and workspace from the parent Desktop component.

### 7. Conversation Persistence in Frontend

- On mount, load last 20 messages from `ai_conversations` for the signed-in user
- Display them in the chat (with a "Previous session" divider)
- After each exchange, save both user and assistant messages to the table
- For guests (not signed in), keep current in-memory-only behavior

## Technical Details

### Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/functions/hyper-chat/index.ts` | Accept context, load memories + history, inject into system prompt, add save_memory/recall_memories tools |
| `src/components/os/HypersphereApp.tsx` | Build context payload, load/save conversation history, accept window/workspace props |
| `src/components/os/Desktop.tsx` | Pass open windows and workspace to HypersphereApp |
| Database migration | Create `ai_memories` and `ai_conversations` tables with RLS |

### Database Migration

```sql
CREATE TABLE ai_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'fact',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own memories" ON ai_memories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memories" ON ai_memories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memories" ON ai_memories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own memories" ON ai_memories FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own conversations" ON ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON ai_conversations FOR DELETE USING (auth.uid() = user_id);
```

### Memory Management

- Memories are capped at 50 per user; oldest auto-pruned when saving new ones
- Conversation history is trimmed to last 100 messages per user (older deleted on save)
- The system prompt receives at most 20 memories and 10 prior-session messages to stay within token limits

### Auth Flow

- Signed-in users: Full memory + history persistence
- Guests: In-memory only, no persistence (current behavior preserved)
- The hyper-chat edge function extracts the user from the auth header to load their memories server-side
