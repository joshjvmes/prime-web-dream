# PRIME OS — Internal Documentation

**Geometric Computing Interface** — Built by [Rocket Logic Global](https://rocketlogicglobal.com)

PRIME OS is a browser-based operating system with 50+ applications, powered by a cloud backend (Supabase). It explores geometric computation, ternary logic, and 11-dimensional folding architectures through an interactive desktop environment.

---

## 📚 Documentation Index

| Document | Description |
|---|---|
| [GETTING_STARTED.md](./GETTING_STARTED.md) | Quick start, project structure, how to add apps |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, routing, window management, EventBus, auth flow |
| [FEATURES.md](./FEATURES.md) | Deep-dives: AI integration, Action Chips, onboarding, mobile support |
| [APPS.md](./APPS.md) | Full catalog of 50+ apps with backend integrations and status |
| [BACKEND.md](./BACKEND.md) | Database tables, edge functions, secrets, storage buckets |
| [API_REFERENCE.md](./API_REFERENCE.md) | Edge function endpoints, auth, request/response schemas |
| [HOOKS.md](./HOOKS.md) | Custom React hooks reference |
| [TERMINAL.md](./TERMINAL.md) | Terminal commands, pipes, modes, and widget commands |
| [SECURITY.md](./SECURITY.md) | RLS policies, auth patterns, and security overview |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Code style, PR workflow, and contribution guidelines |

---

## 🚀 Quick Start

```bash
# Clone
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install
npm install

# Start dev server
npm run dev
```

The app opens at `http://localhost:5173`. Navigate to `/os` to enter the desktop environment.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State | React hooks + EventBus singleton |
| Data Viz | Recharts |
| Animation | Framer Motion |
| Icons | Lucide React |
| 3D | Three.js |
| Backend | Supabase (Postgres + Edge Functions) |
| Auth | Google OAuth via Supabase Auth |

---

## Project Structure

```
src/
├── components/
│   ├── os/              # All OS app components (50+ files)
│   │   ├── terminal/    # Terminal commands, modes, pipes
│   │   ├── browser/     # PrimeBrowser intranet pages
│   │   ├── rokcat/      # ROKCAT AI (ActionChip, parser, thinking)
│   │   └── calendar/    # Calendar utilities
│   └── ui/              # shadcn/ui components
├── hooks/               # Custom React hooks (12+ hooks)
├── lib/                 # Utilities (geomq compiler, markdown renderer)
├── types/               # TypeScript type definitions
├── pages/               # Route pages (LandingPage, Index, NotFound)
└── integrations/        # Supabase client & types (auto-generated)

supabase/
├── functions/           # 16 edge functions
│   ├── _shared/         # Shared utilities (CORS, AI router)
│   └── */index.ts       # Individual function handlers
├── migrations/          # Database migrations (read-only)
└── config.toml          # Function configuration

docs/                    # This documentation directory
```
