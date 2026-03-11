

## Plan: Video Progress Bar + Image-to-Video Feature

### 1. Progress Bar for Video Polling

**File: `src/components/os/RokCatApp.tsx`**

Replace the dots-based polling indicator (line 354) with a proper progress bar using the existing `Progress` component from `src/components/ui/progress.tsx`. During the polling loop, calculate percentage as `((i + 1) / maxAttempts) * 100` and render it inline in the message text area. Since messages are plain text rendered by `MediaRenderer`, we'll use a special tag pattern like `[PROGRESS:45]` that `MediaRenderer` can detect and render as a visual progress bar.

**File: `src/components/os/rokcat/MediaRenderer.tsx`**

Add a `PROGRESS` tag handler alongside `IMAGE` and `VIDEO`. When `[PROGRESS:XX]` is found, render it as a `<Progress value={XX} />` component with a label like "Generating video... 45%".

### 2. Image-to-Video: "Animate This" Button

**File: `src/components/os/rokcat/MediaRenderer.tsx`**

Add a small "🎬 Animate" button below each generated image. Clicking it will call a callback prop to trigger video generation using that image's URL as the `image_url` parameter.

**File: `src/components/os/RokCatApp.tsx`**

- Pass an `onAnimateImage` callback to `MediaRenderer` (or handle it at the message rendering level) that calls `handleImagine` with `type: 'video'` and passes the image URL.
- Update `handleImagine` signature to accept an optional `imageUrl` parameter.
- Pass `image_url` in the `invokeGrok` call body when provided.

The edge function already supports `image_url` in `submitVideo` (line 92-96), so no backend changes needed.

### Files to change:
- `src/components/os/RokCatApp.tsx` — progress tag in polling, `onAnimateImage` callback, `handleImagine` accepts optional `imageUrl`
- `src/components/os/rokcat/MediaRenderer.tsx` — render `[PROGRESS:XX]` as progress bar, add "Animate" button on images

