

# Forge Publishing, Dashboard Widget, and Hover Previews

## Overview

Three enhancements to the App Forge ecosystem: (1) a streamlined "Publish to Forge" flow accessible directly from the OS desktop with full IPO configuration, (2) a new draggable Forge Dashboard desktop widget showing live IPO progress and market activity via Realtime, and (3) hover previews on Forge listings that show a live code snippet and a sandboxed mini-app preview.

---

## Part 1: Enhanced Publish-to-Forge Flow

Upgrade the existing publish flow in `AppForgeApp.tsx` to be more comprehensive.

### Changes
- Expand the publish form with: share price input, total shares input, a visual IPO summary card showing projected valuation
- Add a "Quick Publish" button directly in the My Apps tab that opens the publish modal with pre-filled defaults
- Show a confirmation step before publishing with a preview of how the listing will appear in the Forge marketplace

### File: `src/components/os/AppForgeApp.tsx`
- Extend `publishForm` state with `sharePrice` and `totalShares` fields (defaulting to 1 OS and 1000 shares)
- Add an IPO summary section when IPO is toggled on: "1,000 shares at [target/1000] OS each = [target] OS target"
- Add a preview card matching the Forge listing UI so users see exactly how their app will appear

---

## Part 2: Forge Dashboard Desktop Widget

A new draggable widget for the desktop showing real-time Forge and IPO activity.

### New Widget: `ForgeWidget`
Added inside `DesktopWidgets.tsx` alongside existing Clock/Stats/Notes/Network widgets.

**Displays:**
- Active IPO count and total capital raised across all IPOs
- Latest 3 Forge listings (name, icon, price/IPO badge)
- Live share order activity count (open orders)
- Auto-refreshes every 10 seconds via Supabase Realtime subscription on `forge_listings` and `share_orders`

### File: `src/components/os/DesktopWidgets.tsx`
- Add `forge: boolean` to `WidgetState` interface (default: false)
- Add `forge` position to `DEFAULTS.positions`
- Create `ForgeWidget` component that queries `forge_listings` (IPO-active and latest) and `share_orders` (open count)
- Subscribe to Realtime changes on both tables for live updates
- Register in the widgets array alongside clock/stats/notes/network

---

## Part 3: Hover Previews on Forge Listings

When hovering over a Forge listing in the marketplace tab, show a popover with a live code snippet and a tiny sandboxed preview of the mini-app.

### Implementation
- Use Radix `HoverCard` component (already installed) on each listing row in the Forge tab
- The hover card shows:
  - First 8 lines of the app's source code in a monospace pre block
  - A 200x150px sandboxed `MiniAppRenderer` showing the live running app
  - Install count, share price, and category badge

### File: `src/components/os/AppForgeApp.tsx`
- Import `HoverCard`, `HoverCardTrigger`, `HoverCardContent` from `@/components/ui/hover-card`
- Wrap each listing button in the Forge tab with `HoverCard` and `HoverCardTrigger`
- Add `HoverCardContent` with a two-section layout: code preview (top) and live app preview (bottom)
- The `MiniAppRenderer` is rendered at small scale inside a fixed-size container with `overflow: hidden`

---

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| `src/components/os/AppForgeApp.tsx` | Add hover previews on listings, enhance publish form with share price/total shares and IPO summary |
| `src/components/os/DesktopWidgets.tsx` | Add ForgeWidget with live IPO/market data and Realtime subscription |

### No Database Changes Required
All data is read from existing `forge_listings` and `share_orders` tables which already have appropriate SELECT RLS policies (public read for listings, open orders visible to all).

### Performance Considerations
- `ForgeWidget` polls every 10s with Realtime as supplement -- lightweight SELECT queries
- Hover preview renders `MiniAppRenderer` only when the hover card opens (lazy), preventing unnecessary code execution
- Code snippet is truncated to first 8 lines to keep the popover compact

