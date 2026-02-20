

# Fix Navigation Anchor Alignment on Landing Page

## Problem
The fixed navbar is 56px tall (`h-14`). When clicking "Features", "Architecture", or "Specs" nav links, the browser scrolls the target section to the very top of the viewport, causing the navbar to overlap the section header.

## Solution
Add `scroll-margin-top` to the three anchor sections so they account for the fixed navbar height.

## Changes

### File: `src/pages/LandingPage.tsx`

Add `scroll-mt-20` (80px) class to three sections:

1. **Stats section** (line 361): Add `scroll-mt-20` to the `<section id="stats">` element
2. **Features section** (line 384): Add `scroll-mt-20` to the `<section id="features">` element
3. **Architecture section** (line 400): Add `scroll-mt-20` to the `<section id="architecture">` element

This uses Tailwind's `scroll-margin-top` utility, which tells the browser to leave 80px of clearance above the section when scrolling to it via anchor links -- enough to clear the 56px navbar plus some breathing room.

No other files need to change.
