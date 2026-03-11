

# Add Missing Apps to Mobile Launcher

The MobileLauncher is missing 16 apps that exist on the desktop. Here's the diff:

## Missing Apps by Category

| Desktop Category | Missing from Mobile |
|---|---|
| Core | `processes`, `sysinfo` |
| AI & Compute | `botlab`, `rokcat` |
| Network (entire category missing) | `primenet`, `datacenter`, `cloudhooks`, `github` |
| Productivity | `schemaforge` |
| Control (split/missing) | `energy`, `foldmem`, `storage`, `robotics`, `iot`, `admin` |
| Media | `pkg` |

## Plan

**Single file change**: `src/components/os/MobileLauncher.tsx`

1. Add missing icon imports: `Activity`, `Cpu`, `Network`, `Server`, `Link2`, `Workflow`, `HardDrive`, `Database`, `Zap`, `Cog`, `Wifi`, `ShieldCheck`, `Package`, `GitBranch`
2. Restructure mobile categories to match desktop — 7 categories (Core, AI & Compute, Network, Productivity, Communication, Control, Media) with all apps present
3. Add ROKCAT to the bottom dock as a 5th pinned app (it's the AI assistant and should be quickly accessible on mobile)

All apps already have their renderers wired up in `renderApp` — this is purely about making them launchable from the mobile grid.

