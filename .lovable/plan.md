

# Intranet CMS, Journal App, and Image Support

## Overview

Transform the private intranet (`httpsp://`) from hardcoded pages into a dynamic, user-authored content system. Add a Journal app for blog-style writing. Connect PrimeDocs so documents can be published directly to the intranet. Support embedded images in all intranet content.

---

## 1. Shared Intranet Page Store

All user-created intranet content (pages, blog posts) will be stored via `useCloudStorage` under the key `intranet-pages`. Each page is a simple object:

```text
{
  slug: string        // URL path after httpsp://pages/
  title: string
  content: string     // Markdown with image support
  author: string
  category: "page" | "blog"
  coverImage?: string // URL to image in user-files bucket
  publishedAt: string
  updatedAt: string
}
```

The browser will dynamically resolve any `httpsp://pages/{slug}` URL by looking up the slug in this store and rendering the markdown content. The existing hardcoded pages (wiki, research, handbook, changelog, status) remain untouched.

---

## 2. Intranet Hub Page (`httpsp://hub`)

A new landing page for user-created content. Shows:
- **Blog posts** section: latest journal entries sorted by date, with title, author, date, and optional cover image
- **Pages** section: all user-published pages in a grid/list
- Search bar to filter across all user content
- Links to each piece of content via `httpsp://pages/{slug}`

This becomes a new default bookmark in the browser.

---

## 3. PrimeDocs: "Publish to Intranet" Button

Add a "Publish" button to the PrimeDocs toolbar (next to Export/Copy). When clicked:
- Prompts for a URL slug (auto-generated from title, editable)
- Saves the document's markdown content as an intranet page with `category: "page"`
- The page immediately becomes accessible at `httpsp://pages/{slug}`
- If a page with that slug already exists, it updates it
- Shows a confirmation with the intranet URL

---

## 4. Journal App (New App)

A new app called **PrimeJournal** -- a focused blog/journal writing tool.

**Features:**
- Chronological list of journal entries in a sidebar
- Markdown editor with live preview (reuses the same `renderMarkdown` function from PrimeDocs)
- Each entry has: title, content (markdown), date, tags
- "Publish to Intranet" button that pushes the entry as a blog post (`category: "blog"`) to the shared intranet store
- Draft/Published status indicator
- Cover image support: upload an image via the `user-files` bucket, reference it in the entry

**Data storage:** Journal entries stored via `useCloudStorage` under key `journal-entries`.

---

## 5. Image Support in Markdown and Intranet

**Markdown renderer upgrade:**
- Add `![alt](url)` image syntax support to the existing `renderMarkdown` function in PrimeDocs
- Images render as `<img>` tags with appropriate styling (max-width, rounded corners)
- Support both external URLs (`https://...`) and internal storage URLs

**Image upload in editors:**
- Add an "Insert Image" button to PrimeDocs and PrimeJournal toolbars
- Opens a file picker for PNG/SVG/JPG
- Uploads the file to the `user-files` bucket under `{userId}/intranet/`
- Generates a public URL and inserts `![filename](url)` at the cursor position
- For non-authenticated users, falls back to external URL input

**Intranet page rendering:**
- The dynamic page renderer in the browser handles images naturally since it uses the same markdown renderer

---

## 6. Intranet Web Editor

Add an "Edit Page" button on intranet pages (only for the page author). Clicking it opens an inline markdown editor directly in the browser, allowing quick edits without switching to PrimeDocs. Changes save back to the `intranet-pages` store.

Also add a "New Page" option accessible from `httpsp://hub` that opens a simple create form (title, slug, markdown content, optional cover image).

---

## Technical Details

### Files Changed

| File | Action |
|------|--------|
| `src/types/os.ts` | Add `'journal'` to the `AppType` union |
| `src/components/os/PrimeJournalApp.tsx` | New file -- Journal app with markdown editor, entry management, publish-to-intranet |
| `src/components/os/PrimeDocsApp.tsx` | Add "Publish to Intranet" button, image insert button, upgrade `renderMarkdown` for images |
| `src/components/os/browser/IntranetPages.tsx` | Add `HubPage`, `DynamicPage`, `IntranetEditor` components for user content |
| `src/components/os/PrimeBrowserApp.tsx` | Add `httpsp://hub` and `httpsp://pages/*` routing, register hub in bookmarks/titles |
| `src/components/os/Desktop.tsx` | Register Journal app in the window renderer |
| `src/components/os/Taskbar.tsx` | Add Journal to the app menu |
| `src/components/os/DesktopIcons.tsx` | Add Journal desktop icon |
| `src/hooks/useIntranetPages.ts` | New shared hook for reading/writing intranet pages from cloud storage |

### Shared Hook: useIntranetPages

A custom hook that wraps `useCloudStorage` for the `intranet-pages` key. Used by PrimeDocs (publish), PrimeJournal (publish), and IntranetPages (read/render). Provides:
- `pages`: all intranet pages
- `publishPage(page)`: create or update a page
- `deletePage(slug)`: remove a page
- `getPage(slug)`: find a single page

### Image Upload Flow

1. User clicks "Insert Image" in the toolbar
2. File picker opens (accepts `.png`, `.jpg`, `.svg`, `.webp`)
3. File is uploaded to the `user-files` bucket at path `{userId}/intranet/{timestamp}-{filename}`
4. A signed/public URL is generated
5. Markdown image syntax is inserted at cursor: `![filename](url)`

### Browser Routing Changes

The `renderInternalPage` function gains a new pattern:
- `httpsp://hub` renders the `HubPage` component
- `httpsp://pages/{slug}` renders the `DynamicPage` component, which loads the page from the intranet store and renders its markdown

### No Database Changes Required

All data uses the existing `useCloudStorage` / `user_data` table and `user-files` storage bucket. No new tables or migrations needed.

