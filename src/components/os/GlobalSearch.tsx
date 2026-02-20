import { useCallback } from 'react';
import { AppType, WindowState } from '@/types/os';
import {
  CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty, CommandSeparator,
} from '@/components/ui/command';
import {
  Terminal, FolderTree, Activity, Cpu, Brain, Network, Code, HardDrive,
  Database, Zap, Settings, Monitor, FileText, MessageSquare, Shield,
  Globe, Server, LayoutList, Image, LayoutGrid, Layers, Search, Link2, Orbit,
  CalendarDays, BookOpen, Table, Workflow, Paintbrush, Smartphone, Map,
  Package, Music, Dices, TrendingUp, Radio, Vault, Video, Mail, Users,
  Bot, Cog, CalendarCheck, Wifi, Gamepad2, ShieldCheck,
} from 'lucide-react';

const allApps: { app: AppType; title: string; icon: React.ReactNode; label: string }[] = [
  { app: 'terminal', title: 'Prime Shell (psh)', icon: <Terminal size={16} />, label: 'Terminal' },
  { app: 'files', title: 'Prime File System', icon: <FolderTree size={16} />, label: 'Files' },
  { app: 'q3inference', title: 'Q3-Inference Engine', icon: <Brain size={16} />, label: 'Q3 Inference' },
  { app: 'primenet', title: 'PrimeNet Monitor', icon: <Network size={16} />, label: 'PrimeNet' },
  { app: 'geomc', title: 'GeomC Compiler', icon: <Code size={16} />, label: 'GeomC' },
  { app: 'foldmem', title: 'FoldMem Visualizer', icon: <HardDrive size={16} />, label: 'FoldMem' },
  { app: 'storage', title: 'Prime Storage', icon: <Database size={16} />, label: 'Storage' },
  { app: 'energy', title: 'Energy Monitor', icon: <Zap size={16} />, label: 'Energy' },
  { app: 'processes', title: 'Qutrit Processes', icon: <Activity size={16} />, label: 'Processes' },
  { app: 'sysinfo', title: 'System Info', icon: <Cpu size={16} />, label: 'SysInfo' },
  { app: 'monitor', title: 'System Monitor', icon: <Monitor size={16} />, label: 'Monitor' },
  { app: 'editor', title: 'PrimeEdit', icon: <FileText size={16} />, label: 'Editor' },
  { app: 'chat', title: 'PrimeChat', icon: <MessageSquare size={16} />, label: 'Chat' },
  { app: 'security', title: 'Lattice Shield', icon: <Shield size={16} />, label: 'Security' },
  { app: 'browser', title: 'PrimeBrowser', icon: <Globe size={16} />, label: 'Browser' },
  { app: 'datacenter', title: 'LatticeCore', icon: <Server size={16} />, label: 'Data Center' },
  { app: 'board', title: 'PrimeBoard', icon: <LayoutList size={16} />, label: 'Board' },
  { app: 'gallery', title: 'PrimeGallery', icon: <Image size={16} />, label: 'Gallery' },
  { app: 'cloudhooks', title: 'Cloud Hooks', icon: <Link2 size={16} />, label: 'Cloud Hooks' },
  { app: 'hypersphere', title: 'Hyper AI', icon: <Orbit size={16} />, label: 'Hyper AI' },
  { app: 'calendar', title: 'Prime Calendar', icon: <CalendarDays size={16} />, label: 'Calendar' },
  { app: 'docs', title: 'PrimeDocs', icon: <BookOpen size={16} />, label: 'Docs' },
  { app: 'spreadsheet', title: 'PrimeGrid', icon: <Table size={16} />, label: 'Spreadsheet' },
  { app: 'schemaforge', title: 'SchemaForge', icon: <Workflow size={16} />, label: 'SchemaForge' },
  { app: 'canvas', title: 'PrimeCanvas', icon: <Paintbrush size={16} />, label: 'Canvas' },
  { app: 'comm', title: 'PrimeComm', icon: <Smartphone size={16} />, label: 'PrimeComm' },
  { app: 'maps', title: 'PrimeMaps', icon: <Map size={16} />, label: 'Maps' },
  { app: 'pkg', title: 'PrimePkg', icon: <Package size={16} />, label: 'Packages' },
  { app: 'audio', title: 'PrimeAudio', icon: <Music size={16} />, label: 'Audio' },
  { app: 'bets', title: 'PrimeBets', icon: <Dices size={16} />, label: 'Bets' },
  { app: 'signals', title: 'PrimeSignals', icon: <TrendingUp size={16} />, label: 'Signals' },
  { app: 'stream', title: 'PrimeStream', icon: <Radio size={16} />, label: 'Stream' },
  { app: 'vault', title: 'PrimeVault', icon: <Vault size={16} />, label: 'Vault' },
  { app: 'videocall', title: 'PrimeLink', icon: <Video size={16} />, label: 'Video' },
  { app: 'mail', title: 'PrimeMail', icon: <Mail size={16} />, label: 'Mail' },
  { app: 'social', title: 'PrimeSocial', icon: <Users size={16} />, label: 'Social' },
  { app: 'agent', title: 'PrimeAgent', icon: <Bot size={16} />, label: 'Agent' },
  { app: 'robotics', title: 'PrimeRobotics', icon: <Cog size={16} />, label: 'Robotics' },
  { app: 'booking', title: 'PrimeBooking', icon: <CalendarCheck size={16} />, label: 'Booking' },
  { app: 'iot', title: 'PrimeIoT', icon: <Wifi size={16} />, label: 'IoT' },
  { app: 'arcade', title: 'PrimeArcade', icon: <Gamepad2 size={16} />, label: 'Arcade' },
  { app: 'admin', title: 'Admin Console', icon: <ShieldCheck size={16} />, label: 'Admin Console' },
  { app: 'settings', title: 'Settings', icon: <Settings size={16} />, label: 'Settings' },
];

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  windows: WindowState[];
  onOpenApp: (app: AppType, title: string) => void;
  onFocusWindow: (id: string) => void;
  onTileAll: () => void;
  onCascade: () => void;
}

export default function GlobalSearch({ open, onOpenChange, windows, onOpenApp, onFocusWindow, onTileAll, onCascade }: GlobalSearchProps) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleSelectApp = useCallback((app: AppType, title: string) => {
    const existing = windows.find(w => w.app === app);
    if (existing) onFocusWindow(existing.id);
    else onOpenApp(app, title);
    close();
  }, [windows, onFocusWindow, onOpenApp, close]);

  const handleFocusWindow = useCallback((id: string) => {
    onFocusWindow(id);
    close();
  }, [onFocusWindow, close]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search apps, windows, actions..." />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-1 py-2">
            <Search size={20} className="text-muted-foreground/50" />
            <span className="font-mono text-xs text-muted-foreground">No results found in lattice</span>
          </div>
        </CommandEmpty>

        {windows.length > 0 && (
          <>
            <CommandGroup heading="Open Windows">
              {windows.map(w => {
                const appDef = allApps.find(a => a.app === w.app);
                return (
                  <CommandItem key={w.id} onSelect={() => handleFocusWindow(w.id)} className="gap-2 font-mono text-xs">
                    {appDef?.icon ?? <Monitor size={16} />}
                    <span>{w.title}</span>
                    {w.isMinimized && <span className="ml-auto text-[9px] text-muted-foreground/60">minimized</span>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Applications">
          {allApps.map(a => (
            <CommandItem key={a.app} onSelect={() => handleSelectApp(a.app, a.title)} className="gap-2 font-mono text-xs">
              {a.icon}
              <span>{a.label}</span>
              <span className="ml-auto text-[9px] text-muted-foreground/50">{a.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => { onTileAll(); close(); }} className="gap-2 font-mono text-xs">
            <LayoutGrid size={16} />
            <span>Tile All Windows</span>
          </CommandItem>
          <CommandItem onSelect={() => { onCascade(); close(); }} className="gap-2 font-mono text-xs">
            <Layers size={16} />
            <span>Cascade Windows</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelectApp('settings', 'Settings')} className="gap-2 font-mono text-xs">
            <Settings size={16} />
            <span>Open Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelectApp('terminal', 'Prime Shell (psh)')} className="gap-2 font-mono text-xs">
            <Terminal size={16} />
            <span>Open Terminal</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
