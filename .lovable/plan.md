

# Landing Page Viewport & Spacing Fix

## Problem
The hero section has excessive padding and margins, causing the terminal preview and even the CTA buttons to get cut off below the viewport fold. The page correctly scrolls for all the other sections, but the first impression (hero) should fit within the initial viewport.

## Solution
Tighten the hero section spacing so the headline, tagline, CTA buttons, and terminal preview all fit within the initial viewport on desktop. Keep the page scrollable for the remaining sections (stats, features, architecture, CTA, footer).

## Changes

### `src/pages/LandingPage.tsx`

**Hero section spacing adjustments:**
- Reduce top padding from `pt-32 md:pt-44` to `pt-24 md:pt-32` (less dead space above the hero)
- Reduce bottom padding from `pb-20 md:pb-32` to `pb-12 md:pb-20`
- Reduce the version badge bottom margin from `mb-8` to `mb-6`
- Reduce the subtitle bottom margin from `mb-10` to `mb-6`
- Reduce the terminal preview top margin from `mt-16 md:mt-20` to `mt-10 md:mt-14`

These are small tweaks that bring everything up so the hero content -- including the terminal preview -- is visible on first load without scrolling on standard desktop screens (1080p+). On smaller screens it will still scroll naturally, which is expected.

No other files are affected. The rest of the page sections remain unchanged.
