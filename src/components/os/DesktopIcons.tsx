import { Terminal, FolderTree, Activity, Cpu, Brain, Network, Code, HardDrive, Database, Zap, Settings, Globe, Server, LayoutList, Image, Link2, Orbit, CalendarDays, BookOpen, Table, Workflow, Paintbrush, Smartphone, Map, Package, Music, Dices, TrendingUp, Radio, Vault, Video } from 'lucide-react';
import { AppType } from '@/types/os';

interface DesktopIconsProps {
  onOpenApp: (app: AppType, title: string) => void;
}

const icons: { app: AppType; title: string; icon: React.ReactNode; label: string }[] = [
  { app: 'terminal', title: 'Prime Shell (psh)', icon: <Terminal size={28} />, label: 'Terminal' },
  { app: 'files', title: 'Prime File System', icon: <FolderTree size={28} />, label: 'Files' },
  { app: 'q3inference', title: 'Q3-Inference Engine', icon: <Brain size={28} />, label: 'Q3 Inference' },
  { app: 'primenet', title: 'PrimeNet Monitor', icon: <Network size={28} />, label: 'PrimeNet' },
  { app: 'geomc', title: 'GeomC Compiler', icon: <Code size={28} />, label: 'GeomC' },
  { app: 'foldmem', title: 'FoldMem Visualizer', icon: <HardDrive size={28} />, label: 'FoldMem' },
  { app: 'storage', title: 'Prime Storage', icon: <Database size={28} />, label: 'Storage' },
  { app: 'energy', title: 'Energy Monitor', icon: <Zap size={28} />, label: 'Energy' },
  { app: 'processes', title: 'Qutrit Processes', icon: <Activity size={28} />, label: 'Processes' },
  { app: 'sysinfo', title: 'System Info', icon: <Cpu size={28} />, label: 'SysInfo' },
  { app: 'settings', title: 'Settings', icon: <Settings size={28} />, label: 'Settings' },
  { app: 'browser', title: 'PrimeBrowser', icon: <Globe size={28} />, label: 'Browser' },
  { app: 'datacenter', title: 'LatticeCore', icon: <Server size={28} />, label: 'Data Center' },
  { app: 'board', title: 'PrimeBoard', icon: <LayoutList size={28} />, label: 'Board' },
  { app: 'gallery', title: 'PrimeGallery', icon: <Image size={28} />, label: 'Gallery' },
  { app: 'cloudhooks', title: 'Cloud Hooks', icon: <Link2 size={28} />, label: 'Cloud Hooks' },
  { app: 'hypersphere', title: 'Hyper AI', icon: <Orbit size={28} />, label: 'Hyper AI' },
  { app: 'calendar', title: 'Prime Calendar', icon: <CalendarDays size={28} />, label: 'Calendar' },
  { app: 'docs', title: 'PrimeDocs', icon: <BookOpen size={28} />, label: 'Docs' },
  { app: 'spreadsheet', title: 'PrimeGrid', icon: <Table size={28} />, label: 'Spreadsheet' },
  { app: 'schemaforge', title: 'SchemaForge', icon: <Workflow size={28} />, label: 'SchemaForge' },
  { app: 'canvas', title: 'PrimeCanvas', icon: <Paintbrush size={28} />, label: 'Canvas' },
  { app: 'comm', title: 'PrimeComm', icon: <Smartphone size={28} />, label: 'PrimeComm' },
  { app: 'maps', title: 'PrimeMaps', icon: <Map size={28} />, label: 'Maps' },
  { app: 'pkg', title: 'PrimePkg', icon: <Package size={28} />, label: 'Packages' },
  { app: 'audio', title: 'PrimeAudio', icon: <Music size={28} />, label: 'Audio' },
  { app: 'bets', title: 'PrimeBets', icon: <Dices size={28} />, label: 'Bets' },
  { app: 'signals', title: 'PrimeSignals', icon: <TrendingUp size={28} />, label: 'Signals' },
  { app: 'stream', title: 'PrimeStream', icon: <Radio size={28} />, label: 'Stream' },
  { app: 'vault', title: 'PrimeVault', icon: <Vault size={28} />, label: 'Vault' },
  { app: 'videocall', title: 'PrimeLink', icon: <Video size={28} />, label: 'Video' },
];

export default function DesktopIcons({ onOpenApp }: DesktopIconsProps) {
  return (
    <div className="absolute top-14 left-4 flex flex-col gap-1 select-none z-[2]">
      {icons.map(({ app, title, icon, label }) => (
        <button
          key={app}
          onDoubleClick={() => onOpenApp(app, title)}
          className="flex flex-col items-center justify-center w-[72px] py-2 rounded hover:bg-primary/10 transition-colors group"
        >
          <div className="text-muted-foreground group-hover:text-primary transition-colors">
            {icon}
          </div>
          <span className="font-body text-[9px] mt-1 text-muted-foreground group-hover:text-foreground text-center leading-tight">
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
