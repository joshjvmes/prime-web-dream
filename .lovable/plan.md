

## Plan: Re-Run Setup Wizard from Settings + GitHub Repo Guide

### Part 1: Re-Run Setup Wizard from Settings

**What**: Add a button in the Settings "Profile" panel that clears the `prime-os-setup-completed` localStorage flag and triggers the Setup Wizard overlay.

**How**:

**`src/components/os/SettingsApp.tsx`**
- In the Profile panel section, add a "Re-run Setup Wizard" button (with a `RotateCcw` icon)
- On click, emit a new EventBus event `system.rerun-setup`

**`src/components/os/Desktop.tsx`**
- Listen for `system.rerun-setup` on the EventBus
- When received, clear `prime-os-setup-completed` from localStorage and set `showTour = true`

This is a small, contained change — two files, ~10 lines each.

---

### Part 2: Comprehensive GitHub Repo Guide

**What**: Create a polished, open-source-ready documentation structure in `docs/` that serves as both an internal reference and a public-facing guide for developers who discover the repo.

**New files to create**:

1. **`docs/GETTING_STARTED.md`** — Quick start for contributors
   - Prerequisites (Node 18+, Git)
   - Clone, install, run
   - Environment setup (Lovable Cloud auto-config vs manual Supabase)
   - Project structure overview with directory tree
   - How to add a new app (create component, register in Desktop.tsx, add to AVAILABLE_APPS)

2. **`docs/CONTRIBUTING.md`** — Contribution guidelines
   - Code style (TypeScript strict, Tailwind, shadcn/ui patterns)
   - PR workflow (branch naming, commit conventions)
   - Testing approach
   - How to add edge functions
   - How to add database migrations

3. **`docs/FEATURES.md`** — Deep-dive feature pages
   - **Desktop Environment**: window management, workspaces, taskbar, context menus
   - **AI Integration**: BYOK flow, provider routing, memory system, ROKCAT personality
   - **Terminal**: command system, pipes, modes, AI shell integration
   - **Action Chips**: how `[ACTION:...]` tags and app mentions become interactive
   - **EventBus**: cross-app communication patterns with examples
   - **Cloud Storage**: localStorage + database sync pattern
   - **Onboarding**: Setup Wizard flow
   - **Mobile Support**: responsive detection, MobileLauncher, MobileAppView

4. **`docs/API_REFERENCE.md`** — Edge function API docs
   - For each of the 16 edge functions: endpoint, auth requirements, request/response schemas, example curl commands
   - Organized by domain (AI, Finance, Social, System)

5. **Update `README.md`** — Make it open-source ready
   - Add badges (TypeScript, React, License)
   - Expand "Features" with screenshots/descriptions
   - Add "Documentation" section linking to all docs
   - Add "Contributing" section
   - Add "Architecture" quick diagram (ASCII)
   - Add license section (or placeholder)

6. **Update `docs/README.md`** — Add links to new docs

### Files summary
| Action | File |
|--------|------|
| Modify | `src/components/os/SettingsApp.tsx` — add re-run wizard button |
| Modify | `src/components/os/Desktop.tsx` — listen for rerun event |
| Create | `docs/GETTING_STARTED.md` |
| Create | `docs/CONTRIBUTING.md` |
| Create | `docs/FEATURES.md` |
| Create | `docs/API_REFERENCE.md` |
| Update | `README.md` — open-source polish |
| Update | `docs/README.md` — add new doc links |

### No backend changes needed

