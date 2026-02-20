

# Real Web Browser via Content Proxy

## Overview

Upgrade PrimeBrowser to fetch and display real websites through a backend proxy edge function, while keeping the existing `prime://` intranet pages and adding a new `httpsp://` protocol for curated private intranet content.

## How It Works

The browser currently only renders hardcoded `prime://` pages. After this upgrade:

- **prime://** -- Existing internal OS pages (home, docs, net-status, etc.) remain unchanged
- **httpsp://** -- New private intranet protocol with curated PRIME OS content pages (wiki, research papers, operator handbook, etc.)
- **https://** -- Real external websites fetched through a backend proxy, rendered as cleaned HTML

## Architecture

**Edge Function: `web-proxy`**
- Accepts a URL parameter
- Fetches the target webpage server-side (bypasses CORS)
- Strips scripts, iframes, and dangerous elements for security
- Rewrites relative URLs to absolute
- Returns sanitized HTML content
- Rate-limited and restricted to http/https protocols

**Browser Component Updates**
- URL bar accepts all three protocols
- `prime://` and `httpsp://` render as React components (fast, no network)
- `https://` triggers edge function call, displays result in a sandboxed container using `dangerouslySetInnerHTML` with sanitized content
- Loading states while fetching external pages
- Error handling for blocked/unreachable sites

## New httpsp:// Intranet Pages

| Page | Description |
|------|-------------|
| `httpsp://wiki` | PRIME OS knowledge base / wiki |
| `httpsp://research` | Research papers and technical reports |
| `httpsp://handbook` | Operator handbook and procedures |
| `httpsp://changelog` | System changelog and version history |
| `httpsp://status` | Live system status dashboard |

## Chat Status

PrimeChat already supports real-time messaging between all authenticated users via database realtime subscriptions and presence tracking. No changes needed -- it's fully functional for signed-in users.

## Gmail Status

Connecting to Gmail is not feasible with the current authentication setup. The managed Google sign-in only provides basic profile scopes. Gmail API access would require a custom Google Cloud project with Gmail API enabled and additional OAuth scopes, which is significant external configuration beyond what can be done here.

---

## Technical Details

### Files Changed

| File | Action |
|------|--------|
| `supabase/functions/web-proxy/index.ts` | New edge function -- fetches and sanitizes external web pages |
| `supabase/config.toml` | Add `web-proxy` function config (verify_jwt = false) |
| `src/components/os/PrimeBrowserApp.tsx` | Major rewrite -- add httpsp:// pages, https:// proxy integration, sanitized HTML rendering |

### Edge Function: web-proxy

```
POST /web-proxy
Body: { "url": "https://example.com" }
Response: { "html": "<sanitized HTML>", "title": "Page Title", "status": 200 }
```

Security measures:
- Only allows http:// and https:// target URLs
- Strips all script tags, event handlers, iframes, objects, embeds
- Converts relative asset URLs (images, CSS) to absolute
- Returns text content with inline styles preserved
- 10-second fetch timeout
- Response size capped at 2MB

### Browser Rendering

External pages are rendered using a container div with `dangerouslySetInnerHTML` after server-side sanitization. The container is scoped with CSS isolation to prevent style leakage into the OS UI. Images and CSS from external sites will load directly from their original servers (URLs rewritten to absolute).

### Bookmarks Update

Add new default bookmarks for httpsp:// intranet pages alongside existing prime:// bookmarks.

