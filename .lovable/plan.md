

## Enhanced Onboarding: Setup Wizard with BYOK Flow

### Current State
- New users see a 5-step **QuickTour** (welcome, desktop tips, apps, search, launch terminal) — purely informational
- Auth is Google OAuth on the lock screen — no signup form
- AI key setup is buried in Settings > AI Provider panel
- No guided profile or API key setup during first login

### Proposed: Post-Auth Setup Wizard

Replace the QuickTour with a richer **SetupWizard** that runs after a user's first sign-in. It combines the tour content with actionable setup steps.

**New file: `src/components/os/SetupWizard.tsx`**

6 steps:

1. **Welcome** — "Welcome to PRIME OS, [name]" with avatar pulled from Google auth. Brief intro.

2. **Power Your AI** — The BYOK recommendation step. Explains that PRIME OS is powered by AI and recommends getting a Grok API key from xAI.com. Shows:
   - A prominent card: "Get your API key at console.x.ai" with an external link button
   - A text input to paste the key right there
   - A "Test Key" button that calls the existing `ai-key-manager` edge function
   - A "Skip for now" option (system works with Lovable AI fallback, but limited)
   - Brief note: "You can also add OpenAI, Anthropic, or Gemini keys later in Settings > AI"

3. **Set Your Profile** — Display name + optional title/bio (pre-filled from Google data). Saves to `profiles` table.

4. **Desktop & Navigation** — Condensed version of current tour steps 2+4 (window management + Ctrl+K search)

5. **Meet ROKCAT** — Introduces the AI assistant. "ROKCAT is your geometric AI companion — ask questions, run commands, or just chat."

6. **Launch** — "You're ready. Launch ROKCAT to begin." with the "Don't show again" checkbox. Opens ROKCAT instead of terminal.

**`src/components/os/Desktop.tsx` changes:**
- Replace QuickTour import/usage with SetupWizard
- Pass `user` object to SetupWizard so it can display name/avatar and save profile
- On completion, open ROKCAT (not terminal)
- Track completion via `localStorage` key `prime-os-setup-completed` (distinct from old tour key)

**`supabase/functions/hyper-chat/index.ts`** — No changes needed. The `ai-key-manager` edge function already handles key saving/testing.

### Files to create/modify
1. **Create** `src/components/os/SetupWizard.tsx` — Full setup wizard component
2. **Modify** `src/components/os/Desktop.tsx` — Swap QuickTour for SetupWizard, pass user prop

### No database changes needed
- `profiles` table already exists with display_name, title, bio
- `user_ai_keys` table already handles key storage
- `ai-key-manager` edge function already supports save-key and test-key actions

