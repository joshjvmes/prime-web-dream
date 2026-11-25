# Fix home screen app buttons

## Problem
On desktop-size screens, the app buttons on the home screen only open an app on a double-click. A single click does nothing, so the buttons look broken. Phones and tablets already open on a single click.

## Fix
- Open the app on a single click on every screen size.
- Ignore the second click of a double-click so the app doesn't open twice.
- Check that nothing on the desktop (widgets, backgrounds) sits on top of the buttons and blocks clicks; raise the buttons above it if so.

## Verify
Open the home screen in the preview, click several app buttons once, and confirm each app window opens.

## Technical details
- `src/components/os/DesktopIcons.tsx`: replace the `onClick`/`onDoubleClick` split with a single `onClick={() => onOpenApp(app, title)}`; ignore `e.detail > 1`.
- If widgets overlap the icon column (icons are `z-[2]`), bump the column's z-index.
