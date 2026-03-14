# Getting Started

A developer guide for setting up, running, and contributing to PRIME OS.

---

## Prerequisites

- **Node.js** 18+ (recommended: 20 LTS)
- **Git**
- **npm** or **bun** package manager

---

## Quick Start

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open `http://localhost:5173` in your browser. Navigate to `/os` to enter the desktop environment.

---

## Environment Setup

### Lovable Cloud (Default)

If you're developing inside Lovable, the backend is automatically configured — no additional setup needed. Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) are injected automatically.

### Manual Supabase Setup

If running outside Lovable:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Create a `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

4. Run the migrations in `supabase/migrations/` against your project
5. Deploy edge functions from `supabase/functions/`

---

## Project Structure

```
src/
├── components/
│   ├── os/                  # All OS app components (50+ files)
│   │   ├── terminal/        # Terminal commands, modes, pipes
│   │   ├── browser/         # PrimeBrowser intranet pages
│   │   ├── calendar/        # Calendar utilities
│   │   └── rokcat/          # ROKCAT AI companion (ActionChip, parser)
│   └── ui/                  # shadcn/ui components
├── hooks/                   # Custom React hooks (12+ hooks)
├── lib/                     # Utilities (geomq compiler, markdown renderer)
├── types/                   # TypeScript type definitions
├── pages/                   # Route pages (LandingPage, Index, NotFound)
└── integrations/            # Supabase client & types (auto-generated)

supabase/
├── functions/               # 16 edge functions
│   ├── _shared/             # Shared utilities (CORS, AI router)
│   └── */index.ts           # Individual function handlers
├── migrations/              # Database migrations (read-only)
└── config.toml              # Function configuration

docs/                        # Documentation directory
```

---

## How to Add a New App

### 1. Create the Component

Create `src/components/os/YourApp.tsx`:

```tsx
export default function YourApp() {
  return (
    <div className="h-full p-4 text-foreground font-mono text-xs overflow-auto">
      <h2 className="text-primary font-display text-sm tracking-wider mb-4">YOUR APP</h2>
      {/* App content */}
    </div>
  );
}
```

### 2. Register the AppType

Add your app key to `src/types/os.ts`:

```typescript
export type AppType = 
  | 'terminal' | 'files' | /* ... existing types ... */
  | 'yourapp';
```

### 3. Register in Desktop.tsx

1. Import your component at the top of `src/components/os/Desktop.tsx`
2. Add an entry to `APP_NAME_MAP`:
   ```typescript
   'yourapp': { app: 'yourapp', title: 'Your App' },
   ```
3. Add a case in `renderApp()`:
   ```typescript
   case 'yourapp': return <YourApp />;
   ```

### 4. Add a Desktop Icon

In `src/components/os/DesktopIcons.tsx`, add to the `APPS` array:

```typescript
{ id: 'yourapp', label: 'Your App', icon: YourIcon, category: 'Productivity' }
```

### 5. Set Window Size (Optional)

In `src/hooks/useWindowManager.ts`, add to `getSize()`:

```typescript
case 'yourapp': return { width: 700, height: 450 };
```

### 6. Add to ActionChip (Optional)

In `src/components/os/rokcat/ActionChip.tsx`, add to `FRIENDLY_NAMES`:

```typescript
yourapp: 'Your App',
```

And in `actionParser.ts`, add to `FRIENDLY_TO_ID`:

```typescript
'your app': 'yourapp',
```

---

## Running Tests

```bash
npm run test
```

Tests use Vitest and are located in `src/test/`.

---

## Building for Production

```bash
npm run build
```

Output is written to `dist/`. The build uses Vite with TypeScript compilation.

---

## Key Concepts

| Concept | Location | Description |
|---|---|---|
| Window Manager | `src/hooks/useWindowManager.ts` | Manages all windowed app state |
| EventBus | `src/hooks/useEventBus.ts` | Singleton pub/sub for cross-app communication |
| Cloud Storage | `src/hooks/useCloudStorage.ts` | localStorage + database sync |
| Action Chips | `src/components/os/rokcat/` | Interactive app references in AI output |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design.
