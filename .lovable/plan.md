

# Fix Browser Content Containment and Security

## Problem

External website HTML is rendered via `dangerouslySetInnerHTML` directly into the DOM (line 325-329 of `PrimeBrowserApp.tsx`). This causes two issues:

1. **Content overflow**: External CSS (absolute positioning, fixed elements, full-width styles) breaks out of the browser window boundaries
2. **Security risk**: Despite server-side sanitization in the edge function, `dangerouslySetInnerHTML` still allows CSS-based attacks, form phishing, and any sanitization bypass to inject content into the app's DOM

## Solution

Replace `dangerouslySetInnerHTML` with a sandboxed `<iframe>` using `srcDoc`. This provides true DOM isolation -- external content cannot affect the parent app.

### File: `src/components/os/PrimeBrowserApp.tsx`

**Replace lines 323-330** (the `dangerouslySetInnerHTML` div) with a sandboxed iframe:

```tsx
if (activeTab.externalHtml) {
  return (
    <iframe
      srcDoc={activeTab.externalHtml}
      sandbox="allow-same-origin"
      title={activeTab.externalTitle || 'External page'}
      className="w-full h-full border-0"
      style={{ background: '#fff' }}
      referrerPolicy="no-referrer"
    />
  );
}
```

### Why this works

| Concern | Before (dangerouslySetInnerHTML) | After (sandboxed iframe) |
|---------|--------------------------------|--------------------------|
| CSS overflow | External CSS leaks into parent DOM | Fully isolated -- CSS cannot escape the iframe |
| Script injection | Relies solely on server-side sanitization | `sandbox="allow-same-origin"` blocks all script execution regardless |
| Form phishing | Forms could POST from user's session | Sandbox blocks form submission |
| Content containment | `style={{ all: 'initial' }}` is a weak boundary | True DOM boundary via iframe |
| Link clicks | Links navigate the entire app | Links are contained within the iframe (no `allow-top-navigation`) |

### Sandbox attribute details

- `allow-same-origin`: Lets the iframe read its own `srcDoc` content (needed for CSS/images to render correctly)
- **Omitted** `allow-scripts`: No JavaScript execution
- **Omitted** `allow-forms`: No form submission
- **Omitted** `allow-top-navigation`: Links cannot navigate the parent window
- **Omitted** `allow-popups`: No popups or new windows

This is a single-line change (replacing the div with an iframe) that solves both the visual overflow and the security concern completely.

