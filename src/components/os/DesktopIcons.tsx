import { useState } from 'react';
import { Terminal, FolderTree, Activity, Cpu, Brain, Network, Code, HardDrive, Database, Zap, Settings, Globe, Server, LayoutList, Image, Link2, Orbit, CalendarDays, BookOpen, Table, Workflow, Paintbrush, Smartphone, Map, Package, Music, Dices, TrendingUp, Radio, Vault, Video, Bot, Cog, CalendarCheck, Wifi, Monitor, FileText, MessageSquare, Shield, Mail, Users, ChevronDown, ChevronRight, Gamepad2, ShieldCheck, PenLine, Wallet } from 'lucide-react';
import { AppType } from '@/types/os';

interface DesktopIconsProps {
  onOpenApp: (app: AppType, title: string) => void;
}

interface AppEntry { app: AppType; title: string; icon: React.ReactNode; label: string; }

const categories: { name: string; apps: AppEntry[] }[] = [
  {
    name: 'Core',
    apps: [
      { app: 'terminal', title: 'Prime Shell (psh)', icon: <Terminal size={22} />, label: 'Terminal' },
      { app: 'files', title: 'Prime File System', icon: <FolderTree size={22} />, label: 'Files' },
      { app: 'processes', title: 'Qutrit Processes', icon: <Activity size={22} />, label: 'Processes' },
      { app: 'sysinfo', title: 'System Info', icon: <Cpu size={22} />, label: 'SysInfo' },
      { app: 'monitor', title: 'System Monitor', icon: <Monitor size={22} />, label: 'Monitor' },
      { app: 'settings', title: 'Settings', icon: <Settings size={22} />, label: 'Settings' },
    ],
  },
  {
    name: 'AI & Compute',
    apps: [
      { app: 'hypersphere', title: 'Hyper AI', icon: <Orbit size={22} />, label: 'Hyper AI' },
      { app: 'q3inference', title: 'Q3-Inference Engine', icon: <Brain size={22} />, label: 'Q3 Inference' },
      { app: 'agent', title: 'PrimeAgent', icon: <Bot size={22} />, label: 'Agent' },
      { app: 'geomc', title: 'GeomC Compiler', icon: <Code size={22} />, label: 'GeomC' },
    ],
  },
  {
    name: 'Network',
    apps: [
      { app: 'primenet', title: 'PrimeNet Monitor', icon: <Network size={22} />, label: 'PrimeNet' },
      { app: 'browser', title: 'PrimeBrowser', icon: <Globe size={22} />, label: 'Browser' },
      { app: 'datacenter', title: 'LatticeCore', icon: <Server size={22} />, label: 'Data Center' },
      { app: 'cloudhooks', title: 'Cloud Hooks', icon: <Link2 size={22} />, label: 'Cloud Hooks' },
      { app: 'signals', title: 'PrimeSignals', icon: <TrendingUp size={22} />, label: 'Signals' },
    ],
  },
  {
    name: 'Productivity',
    apps: [
      { app: 'editor', title: 'PrimeEdit', icon: <FileText size={22} />, label: 'Editor' },
      { app: 'docs', title: 'PrimeDocs', icon: <BookOpen size={22} />, label: 'Docs' },
      { app: 'spreadsheet', title: 'PrimeGrid', icon: <Table size={22} />, label: 'Spreadsheet' },
      { app: 'board', title: 'PrimeBoard', icon: <LayoutList size={22} />, label: 'Board' },
      { app: 'canvas', title: 'PrimeCanvas', icon: <Paintbrush size={22} />, label: 'Canvas' },
      { app: 'calendar', title: 'Prime Calendar', icon: <CalendarDays size={22} />, label: 'Calendar' },
      { app: 'booking', title: 'PrimeBooking', icon: <CalendarCheck size={22} />, label: 'Booking' },
      { app: 'journal', title: 'PrimeJournal', icon: <PenLine size={22} />, label: 'Journal' },
      { app: 'wallet', title: 'PrimeWallet', icon: <Wallet size={22} />, label: 'Wallet' },
      { app: 'schemaforge', title: 'SchemaForge', icon: <Workflow size={22} />, label: 'SchemaForge' },
    ],
  },
  {
    name: 'Communication',
    apps: [
      { app: 'chat', title: 'PrimeChat', icon: <MessageSquare size={22} />, label: 'Chat' },
      { app: 'comm', title: 'PrimeComm', icon: <Smartphone size={22} />, label: 'PrimeComm' },
      { app: 'mail', title: 'PrimeMail', icon: <Mail size={22} />, label: 'Mail' },
      { app: 'social', title: 'PrimeSocial', icon: <Users size={22} />, label: 'Social' },
      { app: 'videocall', title: 'PrimeLink', icon: <Video size={22} />, label: 'Video' },
    ],
  },
  {
    name: 'Control',
    apps: [
      { app: 'security', title: 'Lattice Shield', icon: <Shield size={22} />, label: 'Security' },
      { app: 'energy', title: 'Energy Monitor', icon: <Zap size={22} />, label: 'Energy' },
      { app: 'foldmem', title: 'FoldMem Visualizer', icon: <HardDrive size={22} />, label: 'FoldMem' },
      { app: 'storage', title: 'Prime Storage', icon: <Database size={22} />, label: 'Storage' },
      { app: 'vault', title: 'PrimeVault', icon: <Vault size={22} />, label: 'Vault' },
      { app: 'robotics', title: 'PrimeRobotics', icon: <Cog size={22} />, label: 'Robotics' },
      { app: 'iot', title: 'PrimeIoT', icon: <Wifi size={22} />, label: 'IoT' },
      { app: 'admin', title: 'Admin Console', icon: <ShieldCheck size={22} />, label: 'Admin' },
    ],
  },
  {
    name: 'Media',
    apps: [
      { app: 'gallery', title: 'PrimeGallery', icon: <Image size={22} />, label: 'Gallery' },
      { app: 'audio', title: 'PrimeAudio', icon: <Music size={22} />, label: 'Audio' },
      { app: 'stream', title: 'PrimeStream', icon: <Radio size={22} />, label: 'Stream' },
      { app: 'maps', title: 'PrimeMaps', icon: <Map size={22} />, label: 'Maps' },
      { app: 'bets', title: 'PrimeBets', icon: <Dices size={22} />, label: 'Bets' },
      { app: 'arcade', title: 'PrimeArcade', icon: <Gamepad2 size={22} />, label: 'Arcade' },
      { app: 'pkg', title: 'PrimePkg', icon: <Package size={22} />, label: 'Packages' },
    ],
  },
];

export default function DesktopIcons({ onOpenApp }: DesktopIconsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // Start with Core expanded
    return { Core: true };
  });

  const toggle = (name: string) => setExpanded(prev => ({ ...prev, [name]: !prev[name] }));

  return (
    <div className="absolute top-14 left-4 flex flex-col gap-0.5 select-none z-[2] max-h-[calc(100vh-100px)] overflow-y-auto scrollbar-none w-[84px]">
      {categories.map(cat => (
        <div key={cat.name}>
          <button
            onClick={() => toggle(cat.name)}
            className="flex items-center gap-1 w-full px-1 py-0.5 rounded hover:bg-primary/5 transition-colors"
          >
            {expanded[cat.name] ? <ChevronDown size={8} className="text-primary/40" /> : <ChevronRight size={8} className="text-muted-foreground/40" />}
            <span className="font-display text-[7px] tracking-wider uppercase text-muted-foreground/50">{cat.name}</span>
          </button>
          {expanded[cat.name] && (
            <div className="flex flex-col gap-0">
              {cat.apps.map(({ app, title, icon, label }) => (
                <button
                  key={app}
                  onDoubleClick={() => onOpenApp(app, title)}
                  className="flex flex-col items-center justify-center w-full py-1.5 rounded hover:bg-primary/10 transition-colors group"
                >
                  <div className="text-muted-foreground group-hover:text-primary transition-colors">{icon}</div>
                  <span className="font-body text-[8px] mt-0.5 text-muted-foreground group-hover:text-foreground text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
