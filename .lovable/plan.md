

# Tighten Spacing on Stats, Features & Architecture Sections

## Problem
Same issue as the hero -- the Stats, Features, and Architecture sections have generous padding that causes content to be cut off at the bottom of the viewport when scrolling to each section.

## Changes

### `src/pages/LandingPage.tsx`

**Stats section (line 256):**
- Reduce padding from `py-16 md:py-24` to `py-12 md:py-16`

**Features section (line 279):**
- Reduce padding from `py-20 md:py-32` to `py-14 md:py-20`

**Architecture section (line 295):**
- Reduce padding from `py-20 md:py-32` to `py-14 md:py-20`

**SectionHeader component (line 93):**
- Reduce bottom margin from `mb-16` to `mb-10` (affects both Features and Architecture headers)

These are the same kind of small tweaks applied to the hero -- just pulling in the vertical breathing room so each section's content fits more comfortably within a single viewport height on standard desktop screens.

No other files affected.

