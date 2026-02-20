

# Utility Apps: Full Functionality Upgrade

## Overview

Upgrade the three core productivity apps -- Spreadsheet, Docs, and Text Editor -- from demo/read-only state into real, cloud-backed tools you can actually use day to day.

---

## 1. Spreadsheet (PrimeGrid) -- CSV Import/Export + Cloud Save

### Current State
- 8 columns, 20 rows, hardcoded demo sheets
- In-memory only (data lost on refresh)
- Basic formulas: SUM, AVG, PRIME, FACTOR

### Upgrades

**Cloud Persistence**
- Use the existing `useCloudStorage` hook to auto-save/load spreadsheet data
- Each "workbook" is saved under a unique key (e.g., `spreadsheet-{id}`)
- Add a workbook manager: create new workbooks, rename, delete, switch between them

**CSV Import/Export**
- Toolbar buttons for Import CSV and Export CSV
- Import: file picker, parse CSV, populate current sheet
- Export: generate CSV from current sheet data, trigger download

**Expanded Grid**
- Increase to 26 columns (A-Z) and 100 rows
- Add column/row insert and delete
- Add new sheet tab creation and renaming

**More Formulas**
- MIN, MAX, COUNT, IF (basic conditional)
- Cell references in formulas (e.g., =A1+B2)

**Toolbar Enhancements**
- Bold/italic formatting flags per cell (stored as metadata)
- Undo/redo stack
- Copy/paste cell ranges

### Files Changed
| File | Action |
|------|--------|
| `src/components/os/PrimeGridApp.tsx` | Major rewrite -- cloud save, CSV, expanded grid, toolbar |

---

## 2. Docs (PrimeDocs) -- Markdown Editor + Cloud Storage

### Current State
- Read-only viewer of 4 hardcoded documents
- No creating, editing, or saving

### Upgrades

**Full Markdown Editor**
- Replace the read-only viewer with a split-pane editor: left side = markdown source, right side = live preview
- Support standard markdown: headings, bold, italic, lists, code blocks, tables, links
- Toolbar with formatting buttons (bold, italic, heading, code, list, table)

**Document Management**
- Create new documents, rename, delete
- Document list saved to cloud via `useCloudStorage`
- Each document stored as `{ title, content (markdown), author, updatedAt }`
- Keep the 4 sample docs as defaults for new users

**Export**
- Download as .md file
- Copy markdown to clipboard

**Search**
- Search across all documents (not just the open one)
- Highlight matches in the document list sidebar

### Files Changed
| File | Action |
|------|--------|
| `src/components/os/PrimeDocsApp.tsx` | Major rewrite -- markdown editor, CRUD, cloud persistence |

---

## 3. Text Editor -- Cloud File Integration

### Current State
- Hardcoded sample .fold files
- No save, no load, no integration with the Files app or cloud storage

### Upgrades

**Cloud Save/Load**
- Save files to cloud storage (the existing `user-files` bucket) with proper paths
- Load files from cloud storage
- "Save As" to choose filename/path
- Auto-save on edit (debounced)

**Real File Integration**
- Open files from the Files app (via the existing file metadata system)
- Create new files with custom extensions
- Delete files

**Enhanced Editing**
- Line numbers already exist -- keep them
- Add find & replace (Ctrl+F / Ctrl+H)
- Tab key inserts spaces (configurable 2/4)
- Word wrap toggle
- File type detection for syntax highlighting (.md, .json, .toml, .fold)

**Multiple File Types**
- Beyond .fold, support .md, .json, .toml, .txt
- JSON files get basic JSON syntax highlighting
- Markdown files get heading/bold/italic highlighting

### Files Changed
| File | Action |
|------|--------|
| `src/components/os/TextEditorApp.tsx` | Major rewrite -- cloud integration, find/replace, multi-format |

---

## No Database Changes Required

All three apps will use the existing infrastructure:
- `useCloudStorage` hook for document/workbook metadata (uses the existing `user_data` table)
- `user-files` storage bucket for raw file content (text editor)
- No new tables or migrations needed

---

## Technical Notes

- **Spreadsheet data format**: Each workbook is stored as a JSON blob in `user_data` with key `spreadsheet-{id}`. Contains `{ name, sheets: { [sheetName]: { [cellKey]: { value, bold?, italic? } } } }`.
- **Docs data format**: All documents stored under key `docs-library` as an array of `{ id, title, content, author, createdAt, updatedAt }`.
- **Text Editor**: Files are stored in the `user-files` bucket under `{userId}/editor/{filename}`. File metadata entries are created in `file_metadata` for discoverability from the Files app.
- **CSV parsing**: Built-in, no external library needed. Handles quoted fields and newlines within quotes.
- **Markdown rendering**: Custom lightweight renderer (headings, bold, italic, code, lists, tables, links) -- no external markdown library needed. Uses regex-based parsing similar to the existing syntax highlighter in TextEditorApp.
- **All three apps** fall back gracefully to localStorage for guest users, matching the existing pattern.

