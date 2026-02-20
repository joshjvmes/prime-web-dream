import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { AppType } from '@/types/os';
import { Terminal, Cpu, LayoutGrid, Layers, Info, Search } from 'lucide-react';

interface DesktopContextMenuProps {
  children: React.ReactNode;
  onOpenApp: (app: AppType, title: string) => void;
  onTileAll: () => void;
  onCascade: () => void;
  onSearch: () => void;
}

export default function DesktopContextMenu({ children, onOpenApp, onTileAll, onCascade, onSearch }: DesktopContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56 bg-card border-border font-body text-xs">
        <ContextMenuItem className="gap-2 text-xs" onClick={onSearch}>
          <Search size={14} /> Global Search
          <span className="ml-auto text-[9px] text-muted-foreground">Ctrl+K</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="gap-2 text-xs"
          onClick={() => onOpenApp('terminal', 'Prime Shell (psh)')}
        >
          <Terminal size={14} /> Open Terminal
        </ContextMenuItem>
        <ContextMenuItem
          className="gap-2 text-xs"
          onClick={() => onOpenApp('sysinfo', 'System Info')}
        >
          <Cpu size={14} /> System Info
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="gap-2 text-xs" onClick={onTileAll}>
          <LayoutGrid size={14} /> Tile All Windows
        </ContextMenuItem>
        <ContextMenuItem className="gap-2 text-xs" onClick={onCascade}>
          <Layers size={14} /> Cascade Windows
          <span className="ml-auto text-[9px] text-muted-foreground">Alt+Tab</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="gap-2 text-xs"
          onClick={() => onOpenApp('settings', 'Settings')}
        >
          <Info size={14} /> Settings
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
