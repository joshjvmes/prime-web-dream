# Feature Deep-Dives

Detailed documentation of PRIME OS's major features and subsystems.

---

## Desktop Environment

### Window Management

PRIME OS provides a full windowed desktop experience powered by `useWindowManager`:

- **Drag & resize** — All windows can be freely positioned and resized
- **Snap** — Drag to screen edges to snap windows to half-screen
- **Maximize** — Double-click title bar or click maximize button
- **Minimize** — Windows minimize to the taskbar
- **Tile / Cascade** — Right-click desktop → Tile All or Cascade
- **Z-ordering** — Click to focus; focused window gets highest z-index
- **Single instance** — Each app type can only have one window open at a time

### Workspaces

4 virtual workspaces accessible via the taskbar or keyboard shortcuts (Ctrl+1–4):

- Windows belong to a workspace and only render when that workspace is active
- `moveWindowToWorkspace(id, ws)` moves a window between workspaces
- `WorkspaceSwitcher` component provides a visual overview

### Taskbar

The bottom taskbar shows:
- Open windows in the current workspace (click to focus/minimize)
- Workspace indicators with window counts
- System tray (clock, notification bell, voice control indicator)
- Popover panels (COP — Command Operations Panel, Cores — system resources)

### Context Menu

Right-click the desktop for quick actions:
- Open common apps (Terminal, Browser, Settings)
- Tile All Windows / Cascade Windows
- Toggle widgets
- Lock screen
- About dialog

### Global Search

`Ctrl+K` opens a search overlay that:
- Fuzzy-matches against all 50+ app names
- Shows recent apps
- Enter to open the selected app

---

## AI Integration

### BYOK (Bring Your Own Key)

Users can connect their own AI provider API keys:

1. **Setup Wizard** — On first launch, the onboarding wizard prompts for an xAI (Grok) API key
2. **Settings → AI Provider** — Configure keys for xAI, OpenAI, Anthropic, or Google Gemini at any time
3. **Re-run Setup Wizard** — Settings → Profile → "Re-run Setup Wizard" to revisit onboarding
4. **Key storage** — Keys are stored server-side via the `ai-key-manager` edge function and the `user_ai_keys` table
5. **Key testing** — Real-time validation before saving
6. **Fallback** — If a user's key fails, the system falls back to the built-in AI

### Provider Routing

The `ai-router.ts` shared module handles provider selection:

```
User request → Check user_ai_keys for active provider
  → If found: route to user's provider (xAI, OpenAI, Anthropic, Google)
  → If not found: route to built-in Lovable AI
```

Supported providers and models:

| Provider | Models |
|---|---|
| xAI | Grok 4, Grok 4.20 (Reasoning/Non-Reasoning/Multi-Agent), Grok 3, Grok 3 Mini/Fast |
| OpenAI | GPT-4o, GPT-4o Mini, GPT-4 Turbo, o1, o1 Mini |
| Anthropic | Claude Sonnet 4, Claude 3.5 Haiku, Claude 3 Opus |
| Google | Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash |

### Memory System

ROKCAT maintains persistent memory across sessions:

- **Conversations** — Stored in `ai_conversations` table, auto-compacted beyond 100 messages
- **Memories** — Stored in `ai_memories` table with categories (preference, fact, instruction)
- **Context window** — Recent messages + relevant memories are injected into each AI request
- **Data management** — Settings → AI Provider → "Clear History" to wipe conversation data

### ROKCAT Personality

ROKCAT is the AI companion with a distinct personality:

- Geometric computing lore and terminology
- Contextual awareness of open windows, active workspace, and recent activity
- Can execute actions via `[ACTION:...]` tags (open apps, navigate, etc.)
- Learns user preferences through the memory system

---

## Action Chips

AI-generated text can contain interactive elements that render as clickable chips.

### How It Works

1. **AI generates** `[ACTION:open-app:terminal]` tags in its response
2. **Parser** (`actionParser.ts`) auto-executes the action via EventBus AND replaces the tag with a `{{chip:open:terminal}}` placeholder
3. **App mention detection** — Plain text mentions of app names (e.g., "CloudHooks", "Terminal") are also detected and wrapped in chip placeholders
4. **Rendering** — `renderMarkdown.tsx` post-processes placeholders into `<ActionChip>` React components
5. **User clicks** — Chip emits `app.request-open` / `app.request-close` via EventBus

### Chip Variants

| Variant | Context | Styling |
|---|---|---|
| `rokcat` | ROKCAT chat messages | Cyan pill with ⚡ icon |
| `terminal` | Terminal output lines | Underlined cyan text |

### Supported Actions

- `open` — Opens an app (`app.request-open`)
- `close` — Closes an app (`app.request-close`)
- `navigate` — Opens app then navigates to a context (`app.navigate`)

---

## Terminal

### Command System

The terminal (`TerminalApp.tsx`) provides a command-line interface with:

- **Built-in commands** — `ls`, `cat`, `echo`, `clear`, `help`, `open`, `close`, etc.
- **App launching** — `open terminal`, `open browser`, etc.
- **Pipe system** — Chain commands with `|` (e.g., `ls | grep .tsx | wc`)
- **Modes** — `mode hacker`, `mode retro`, `mode matrix` for visual themes
- **AI shell** — `hyper <prompt>` or `ai <prompt>` to query ROKCAT from the terminal
- **Widget commands** — `widget list`, `widget toggle clock`, `widget move clock 100 200`

See [TERMINAL.md](./TERMINAL.md) for the full command reference.

### AI Shell Integration

When using `hyper` or `ai` commands in the terminal:

1. The prompt is sent to the `hyper-chat` edge function
2. Response streams back and renders in the terminal
3. App mentions in the response become clickable ActionChips (terminal variant)
4. `[ACTION:...]` tags auto-execute

---

## EventBus

A singleton pub/sub system for cross-app communication.

### Pattern

```typescript
import { eventBus } from '@/hooks/useEventBus';

// Subscribe (in useEffect)
useEffect(() => {
  const handler = (payload) => { /* ... */ };
  eventBus.on('event.name', handler);
  return () => eventBus.off('event.name', handler);
}, []);

// Publish
eventBus.emit('event.name', { data: 'value' });
```

### Common Patterns

| Pattern | Events | Description |
|---|---|---|
| App lifecycle | `app.opened`, `app.closed` | Track which apps are running |
| App control | `app.request-open`, `app.request-close` | Programmatically open/close apps |
| Navigation | `app.navigate` | Deep-link into an app's sub-view |
| Notifications | `notification.received` | Push system notifications |
| Auth | `user.signed-in`, `user.signed-out` | Auth state changes |
| Widgets | `widget.toggle`, `widget.move` | Control desktop widgets |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full event type reference.

---

## Cloud Storage

The `useCloudStorage` hook provides a unified persistence layer:

### How It Works

1. **Read** — `load(key)` checks the `user_data` table for the user's stored value
2. **Write** — `save(key, value)` upserts to the `user_data` table
3. **Fallback** — If not signed in, returns `undefined` (apps fall back to localStorage)

### Apps Using Cloud Storage

| App | Storage Key | Data |
|---|---|---|
| PrimeCanvasApp | `canvas-state` | Drawing layers and paths |
| TextEditorApp | `editor-content` | Document text |
| PrimeGridApp | `grid-data` | Spreadsheet cells |
| PrimeJournalApp | `journal-entries` | Journal entries |
| SettingsApp | `os-settings` | Display, widget, and lock settings |
| AI Provider | `ai-provider` | Selected provider and model |

---

## Onboarding (Setup Wizard)

### Flow

1. User signs in → `LockScreen` authenticates via Google OAuth
2. `BootSequence` plays animated boot sequence
3. If `prime-os-setup-completed` not in localStorage → `SetupWizard` opens
4. Wizard steps:
   - **Welcome** — Personalized greeting with Google profile data
   - **Power Your AI** — BYOK flow for xAI/Grok API key
   - **Your Profile** — Display name and title customization
   - **Navigation** — Keyboard shortcuts and gestures
   - **Meet ROKCAT** — Introduction to the AI companion
5. On finish → opens ROKCAT as first app
6. "Don't show again" checkbox sets `prime-os-setup-completed` in localStorage

### Re-running

Users can re-run the Setup Wizard from **Settings → Profile → Re-run Setup Wizard**. This clears the completion flag and re-opens the wizard overlay.

---

## Mobile Support

### Device Detection

`useDeviceClass()` returns `mobile`, `tablet`, or `desktop` based on viewport width:

| Breakpoint | Class | Rendering |
|---|---|---|
| ≤ 767px | `mobile` | `MobileLauncher` → `MobileAppView` |
| 768–1024px | `tablet` | `MobileLauncher` → `MobileAppView` |
| > 1024px | `desktop` | Full windowed Desktop |

### Mobile Rendering

- **MobileLauncher** — Grid of app icons, tap to open
- **MobileAppView** — Full-screen app with a back button header
- No windowing, no drag/resize, no workspaces
- Same app components render in both mobile and desktop contexts
