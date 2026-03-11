

# Three Issues — ROKCAT First Boot, Terminal Chat Fallback, Autonomous Mode

## Issue 1: App windows not opening from ROKCAT

The `APP_NAME_MAP` and EventBus wiring look correct in the code. The likely issue is that the `handleEventBusClose` listener captures `windows` in its closure (line 286), but the `useEffect` dependency array includes `windows` — meaning the listeners are re-registered on every window change, which is fine. Let me check if there's a timing issue: `parseAndExecuteActions` fires events with a 300ms `setTimeout`, and the Desktop listener should be active. This needs live debugging — but one code-level issue I see is that `handleEventBusClose` uses a stale `windows` reference because the effect re-runs, but `handleEventBusOpen` should work fine since it just calls `openWindow`. I'll verify this works during implementation by also adding a console log temporarily if needed.

## Issue 2: Terminal should fall back to AI chat

Currently, unknown commands return `"psh: command not found"` (line 365-366 of commands.ts). The user wants: if input doesn't match any known command, treat it as a natural language message to ROKCAT/Hyper.

**Change**: In `commands.ts`, replace the `default` case to return a new sentinel value `'ai-chat'`. In `TerminalApp.tsx`, handle `'ai-chat'` similar to `'ai-ask'` but without requiring the `ask` prefix. The system prompt should note this is conversational chat from the terminal.

## Issue 3: ROKCAT opens first + Autonomous Mode

**Boot change**: After boot, open ROKCAT instead of terminal (or open both — ROKCAT as primary).

**Autonomous mode**: Add a toggle button in ROKCAT's UI that enables a self-driving loop:
1. When enabled, ROKCAT sends itself a prompt every 10-15 seconds asking "What should I do next?"
2. The AI responds with actions (open apps, navigate, analyze) + commentary
3. Actions execute via the existing action tag system
4. The loop continues until the user disables it
5. The AI is given full OS context (open windows, current workspace, recent activity) so it can make meaningful decisions

## Plan

### 1. Terminal chat fallback (`commands.ts` + `TerminalApp.tsx`)
- In `processCommand` default case: return `'ai-chat'` instead of the "command not found" error
- In `pipes.ts`: handle `'ai-chat'` like `'ai-ask'` — return it as `enterMode`
- In `TerminalApp.tsx` `handleSubmit`: when `enterMode` starts with neither `ask` nor a known mode command, treat the entire input as an AI chat message with a conversational system prompt

### 2. ROKCAT as default boot app (`Desktop.tsx`)
- Change `handleBootComplete` to open ROKCAT instead of (or alongside) terminal
- `setTimeout(() => openWindow('rokcat', 'ROKCAT'), 300)`

### 3. Autonomous mode (`RokCatApp.tsx`)
- Add state: `autonomousMode: boolean`, `autonomousInterval: ref`
- Add a toggle button (e.g., a "brain" or "play" icon) in the top-right control bar
- When enabled, start an interval (12-15s) that:
  - Builds a context prompt with: open windows, current workspace, recent messages, system state
  - Sends it to the AI with a system prompt like: "You are in autonomous mode. Decide what to do next on the user's desktop. Open apps, check data, navigate, analyze. Be proactive and creative. Use action tags."
  - The response streams in like a normal message, action tags execute
  - After response completes, schedule the next iteration
- Visual indicator: pulsing border or badge showing "AUTONOMOUS" when active
- User can type at any time to interrupt/guide ROKCAT — autonomous loop pauses during user interaction, resumes after response

### Files changed
1. `src/components/os/terminal/commands.ts` — default case returns `'ai-chat'`
2. `src/components/os/terminal/pipes.ts` — handle `'ai-chat'` return
3. `src/components/os/TerminalApp.tsx` — handle chat fallback in `handleSubmit`
4. `src/components/os/Desktop.tsx` — boot opens ROKCAT
5. `src/components/os/RokCatApp.tsx` — autonomous mode toggle + loop

