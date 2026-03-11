

# Wire Up PrimeDocsApp, PrimeGitApp, PrimeIoTApp to ROKCAT Navigation

## Apps & Navigation Contexts

| App | Existing State | Contexts |
|-----|---------------|----------|
| **PrimeDocsApp** | `editMode`, `selectedId` | `edit` (toggle edit mode), `new` (create new doc) |
| **PrimeGitApp** | `view` (View type: repos/issues/prs/commits/connect) | `repos`, `issues`, `prs`, `commits` |
| **PrimeIoTApp** | `zoneFilter`, `view` | `alerts`, zone names: `lab-a`, `server-room`, `energy-wing`, `perimeter` |

## Changes

### 1. PrimeDocsApp — add navigate listener
- Import `eventBus`, add `useEffect` listening for `app === 'docs'`
- `edit` → `setEditMode(true)`, `new` → trigger new doc creation

### 2. PrimeGitApp — add navigate listener
- Import `eventBus`, add `useEffect` listening for `app === 'github'`
- Map `repos`/`issues`/`prs`/`commits` to `setView()`

### 3. PrimeIoTApp — add navigate listener
- Import `eventBus`, add `useEffect` listening for `app === 'iot'`
- `alerts` → `setView('alerts')`, zone names → `setZoneFilter(zone)` with proper casing

### 4. Update actionParser.ts APP_ACTION_PROMPT
Add navigation contexts:
- `docs`: `"edit"`, `"new"`
- `github`: `"repos"`, `"issues"`, `"prs"`, `"commits"`
- `iot`: `"alerts"`, `"lab-a"`, `"server-room"`, `"energy-wing"`, `"perimeter"`

## Files to Modify
1. `src/components/os/PrimeDocsApp.tsx`
2. `src/components/os/PrimeGitApp.tsx`
3. `src/components/os/PrimeIoTApp.tsx`
4. `src/components/os/rokcat/actionParser.ts`

