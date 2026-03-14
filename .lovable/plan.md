

## Actionable AI Output: Auto-Execute + Clickable Chips

### Current Behavior
- `parseAndExecuteActions()` in `actionParser.ts` auto-executes `[ACTION:...]` tags via EventBus, then **strips them** from displayed text — user never sees them
- App names like "CloudHooks" in plain text are just plain text — not interactive
- Terminal output is plain text lines with no interactive elements

### Proposed Changes

**1. New component: `src/components/os/rokcat/ActionChip.tsx`**

A small clickable pill/badge that renders inline. Shows the app name with an icon, and on click emits the corresponding EventBus event.

```text
┌─────────────────────────────────────────┐
│ I suggest checking  [⚡ CloudHooks]     │
│ and reviewing your  [📊 Monitor]  data. │
└─────────────────────────────────────────┘
```

Styled as small `bg-[#00e5ff]/15 text-[#00e5ff] rounded-full px-2 py-0.5 cursor-pointer hover:bg-[#00e5ff]/30` inline chips.

**2. Update `actionParser.ts`**

- Keep auto-execute behavior (EventBus emit on parse)
- New export: `replaceActionTagsWithPlaceholders(text)` — replaces `[ACTION:open-app:X]` with a marker like `{{chip:open:X}}` instead of stripping
- New export: `replaceAppMentionsWithPlaceholders(text)` — scans for known app names in plain text (case-insensitive match against `AVAILABLE_APPS` + friendly name map like "CloudHooks" → "cloudhooks") and wraps them in `{{chip:open:X}}`

**3. Update `renderMarkdown.tsx`**

- After rendering markdown, post-process text nodes to find `{{chip:open:X}}` markers and replace with `<ActionChip appId="X" />` React elements
- This keeps the markdown pipeline clean and handles chips as a final render pass

**4. Update `RokCatApp.tsx` message rendering**

- Pass the enhanced rendering through the updated markdown pipeline (no structural changes needed — the markdown renderer handles it)

**5. Update `TerminalApp.tsx` line rendering**

- For terminal lines, detect `{{chip:...}}` markers and render them as clickable spans within the monospace output
- Simpler styling: underlined cyan text that emits EventBus on click

### App Name Map (for smart detection in plain text)

```typescript
const FRIENDLY_NAMES: Record<string, string> = {
  'cloudhooks': 'CloudHooks', 'terminal': 'Terminal',
  'monitor': 'System Monitor', 'settings': 'Settings',
  'calendar': 'Calendar', 'mail': 'Mail', 'vault': 'Vault',
  'wallet': 'Wallet', 'browser': 'Browser', 'social': 'Social',
  // ... all ~50 apps
};
```

### Files to modify
1. **Create** `src/components/os/rokcat/ActionChip.tsx` — clickable pill component
2. **Modify** `src/components/os/rokcat/actionParser.ts` — add placeholder functions, app name detection
3. **Modify** `src/lib/renderMarkdown.tsx` — post-process chips in rendered output
4. **Modify** `src/components/os/TerminalApp.tsx` — render clickable app references in terminal lines

### No backend changes needed

