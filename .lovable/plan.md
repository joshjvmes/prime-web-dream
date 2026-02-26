

# Fix Widget Toggle Click Registration

## Problem

The `Toggle` component is defined **inside** the SettingsApp component body (line 186). This is a classic React anti-pattern -- every render creates a new function reference, so React treats it as a brand new component type and unmounts/remounts it. This causes clicks to be lost because the element disappears and reappears between the mousedown and mouseup events.

## Solution

Two changes to `src/components/os/SettingsApp.tsx`:

### 1. Move Toggle outside the component (fixes click registration)

Move the `Toggle` component definition **outside** of the `SettingsApp` function (above it or below it as a standalone component). This ensures React sees a stable component identity across renders and stops unmounting/remounting it.

### 2. Make the full row clickable (improves UX)

While fixing the core bug, also make the entire row clickable instead of just the tiny 32x16px switch:
- Wrap in a clickable `div` with `cursor-pointer` and `hover:bg-muted/30`
- Add padding for a larger hit target
- Keep the switch as a visual indicator (not a nested button)

### Before (broken -- defined inside component)
```text
const SettingsApp = () => {
  // ... state ...
  const Toggle = ({ label, value, onChange }) => (  // <-- recreated every render
    <div className="flex items-center justify-between py-1.5">
      <span>...</span>
      <button onClick={() => onChange(!value)}>...</button>
    </div>
  );
  return <Toggle ... />;
};
```

### After (fixed -- defined outside component)
```text
// Standalone component with stable identity
const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <div
    className="flex items-center justify-between py-2 px-1 -mx-1 rounded cursor-pointer hover:bg-muted/30 transition-colors"
    onClick={() => onChange(!value)}
  >
    <span className="font-body text-xs text-card-foreground">{label}</span>
    <div className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${value ? 'bg-primary/60' : 'bg-muted'}`}>
      <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${value ? 'left-4 bg-primary' : 'left-0.5 bg-muted-foreground'}`} />
    </div>
  </div>
);

const SettingsApp = () => {
  // ... uses <Toggle /> with stable identity
};
```

### Also move SliderRow outside

The `SliderRow` component (line 195) has the same anti-pattern and should also be moved outside to prevent similar issues with slider interactions.

## File changed

| File | Change |
|------|--------|
| `src/components/os/SettingsApp.tsx` | Move `Toggle` and `SliderRow` component definitions outside of `SettingsApp` function body; make Toggle row fully clickable with hover feedback |

