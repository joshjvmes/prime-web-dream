# Contributing to PRIME OS

Thank you for your interest in contributing! This guide covers the workflow, code style, and conventions used in the project.

---

## Development Workflow

### Branch Naming

```
feature/short-description
fix/issue-description
docs/what-changed
refactor/area-name
```

### Commit Conventions

Use conventional commits:

```
feat: add PrimeWeather app
fix: calendar reminder timezone offset
docs: update API reference for bot-runner
refactor: extract ActionChip from RokCatApp
chore: update dependencies
```

### Pull Request Process

1. Fork the repository and create a feature branch
2. Make your changes with clear, focused commits
3. Ensure the build passes (`npm run build`)
4. Run tests if applicable (`npm run test`)
5. Open a PR with a description of what changed and why
6. Link any related issues

---

## Code Style

### TypeScript

- **Strict mode** enabled (`tsconfig.app.json`)
- Use explicit return types for exported functions
- Prefer `interface` over `type` for object shapes
- Use `as const` for readonly arrays and literal unions

### React Components

- **Functional components** only (no class components)
- Use `export default function ComponentName()` pattern
- Keep components focused — extract sub-components when > 200 lines
- Use `useCallback` and `useMemo` for performance-critical paths

### Styling

- **Tailwind CSS** with semantic design tokens from `index.css`
- **Never** use hardcoded colors — always use tokens (`text-foreground`, `bg-primary`, etc.)
- All colors must be HSL via CSS custom properties
- Use shadcn/ui components from `src/components/ui/`
- Font classes: `font-display` (headings), `font-mono` (code/data), `font-body` (body text)

### File Organization

```
src/components/os/YourApp.tsx        # Main app component
src/components/os/yourapp/           # Sub-components (if needed)
src/hooks/useYourHook.ts             # Custom hooks
supabase/functions/your-function/    # Edge functions
```

---

## Adding Edge Functions

1. Create `supabase/functions/your-function/index.ts`
2. Use the shared CORS handler:

```typescript
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth check
  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader! } } }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Your logic here
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

3. Functions are auto-deployed in Lovable Cloud

---

## Database Migrations

- Migrations live in `supabase/migrations/` (read-only in repo)
- All tables should have **Row-Level Security (RLS)** enabled
- Use `auth.uid() = user_id` as the default policy pattern
- Never reference `auth.users` directly — use the `profiles` table
- Use validation triggers instead of CHECK constraints for time-based validations

---

## EventBus Events

When adding cross-app communication:

1. Add the event type to `EVENT_TYPES` in `src/hooks/useEventBus.ts`
2. Document the payload shape in `docs/ARCHITECTURE.md`
3. Use `eventBus.emit('your.event', payload)` to publish
4. Use `eventBus.on('your.event', handler)` to subscribe
5. Always clean up with `eventBus.off()` in `useEffect` return

---

## Testing

- Test framework: **Vitest**
- Config: `vitest.config.ts`
- Test files: `src/test/*.test.ts`
- Run: `npm run test`

Focus on:
- Edge function logic (request/response)
- Utility functions (parsers, formatters)
- Hook behavior (state transitions)

---

## Documentation

When adding features, update:

1. `docs/APPS.md` — if adding a new app
2. `docs/BACKEND.md` — if adding tables or edge functions
3. `docs/HOOKS.md` — if adding hooks
4. `docs/FEATURES.md` — if adding significant user-facing features
5. `docs/API_REFERENCE.md` — if adding or changing edge function APIs
