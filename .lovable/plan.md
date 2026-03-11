

# Give ROKCAT the Ability to Open & Navigate Apps

## Approach

Use the existing **EventBus** pattern to let ROKCAT open apps without prop drilling. Then enhance ROKCAT's AI system prompt and client-side parsing to detect action commands embedded in responses.

## Changes

### 1. Add `app.request-open` event to EventBus

Add a new event type to `src/hooks/useEventBus.ts`. Desktop.tsx will listen for it and call `openWindow()`.

### 2. Desktop.tsx: listen for `app.request-open`

In the existing CloudHooks/Bot event listener `useEffect`, add an EventBus listener:
```
eventBus.on('app.request-open', ({ app, title }) => openWindow(app, title))
```
This reuses the existing `APP_NAME_MAP` lookup or accepts direct `AppType` values.

### 3. ROKCAT: update system prompt with available apps

Expand the system prompt to tell the AI it can emit action blocks like:
```
[ACTION:open-app:terminal]
```
Include the full list of available app IDs so the model knows what it can open.

### 4. ROKCAT: parse action tags from AI responses

After receiving the full streamed response, scan for `[ACTION:open-app:XXX]` patterns. For each match:
- Emit `eventBus.emit('app.request-open', { app, title })` to open the app
- Strip the action tag from the displayed message so it reads cleanly

This mirrors how PrimeAgent already handles `open-app` actions but uses EventBus instead of props.

### 5. App name mapping

Create a lookup mapping friendly names to `AppType` + window titles (e.g., `"terminal"` → `{ app: 'terminal', title: 'Prime Shell (psh)' }`). This will be shared so both Desktop's `APP_NAME_MAP` and ROKCAT's action parser use the same mapping.

