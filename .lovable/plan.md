

## Move "Clear Chat" from ROKCAT toolbar to Settings App

### What changes

1. **`src/components/os/RokCatApp.tsx`**
   - Remove the trash icon button and `clearChat` callback from the ROKCAT toolbar (lines ~717-735)
   - Add auto-compact: when chat history exceeds 100 messages, automatically trim the oldest messages down to 60 (keeping recent context), both in state and in the database. This runs silently on history load.

2. **`src/components/os/SettingsApp.tsx`**
   - Add a "ROKCAT" section under the `ai` settings panel (after the AI Provider panel content)
   - Include a "Clear Chat History" button with a confirmation step (click once shows "Are you sure?", click again deletes)
   - The button calls `supabase.from('ai_conversations').delete().eq('user_id', user.id)` and dispatches an event bus message (`rokcat:clear`) so the live ROKCAT instance can clear its local state
   - Show the approximate message count loaded from the DB

3. **`src/components/os/RokCatApp.tsx`** (additional)
   - Listen for the `rokcat:clear` event on the event bus and reset `messages` to `[]` when received, so clearing from Settings takes effect immediately if ROKCAT is open

### Auto-compact logic (in RokCatApp)
- On history load: if loaded messages > 100, delete the oldest rows (keeping the newest 60) from `ai_conversations`, and only load those 60 into state
- This keeps the DB lean without manual intervention

