

## Mobile ROKCAT Optimization

Two issues to fix:

### 1. Code blocks overflow viewport
The `renderMarkdown` function renders `<pre>` tags with `overflow-x-auto` but no `max-width` constraint. On mobile, inside the ROKCAT inline `div`, these break out because the parent container doesn't constrain width.

**Fix in `RokCatApp.tsx` (line 819)**: Add `overflow-hidden max-w-full` and `break-words` to the `.rokcat-md` wrapper div. Also update `renderMarkdown.tsx` to add `max-w-[calc(100vw-3rem)]` and `whitespace-pre-wrap word-break-all` on `<pre>` elements so code wraps instead of overflowing.

### 2. Virtual keyboard resizes the viewport
When the mobile keyboard opens, the viewport shrinks and the layout jumps. This is caused by the component using viewport-relative heights.

**Fix in `RokCatApp.tsx`**:
- Change the input area (line 837) to use `position: sticky` at the bottom or add CSS `height: 100dvh` on the outer container instead of `h-full`, and use the `visualViewport` API or CSS `dvh` units to prevent resize on keyboard open.
- Add a focused state that prevents the chat area from being resized by adding `env(keyboard-inset-height)` or using the simpler approach: set the outer RokCatApp container to use `height: 100%` with `overflow: hidden`, and ensure the input doesn't trigger a relayout by applying meta viewport `interactive-widget=resizes-content` handling — but since we can't change the meta tag easily, the practical fix is:
  - Use CSS `dvh` on the mobile wrapper (`MobileAppView`) 
  - Make the input bar fixed at the bottom with a fixed height, and give the scroll area `flex-1 overflow-auto` with `pb` to account for the input bar

### Files to change:
1. **`src/lib/renderMarkdown.tsx`** — Add `overflow-x-auto max-w-full` and `whitespace-pre-wrap break-all` to `<pre>` code blocks
2. **`src/components/os/RokCatApp.tsx`** — Add `overflow-hidden min-w-0 max-w-full` to the rokcat-md wrapper; use `dvh` units on the outer container
3. **`src/components/os/MobileAppView.tsx`** — Use `height: 100dvh` instead of `100vh` (via `fixed inset-0`) and add `overflow: hidden` to prevent keyboard-triggered resizing
4. **`src/index.css`** — Optional: add a utility class for mobile keyboard stability

