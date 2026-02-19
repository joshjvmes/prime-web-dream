import { useState, useEffect } from 'react';
import { AppType, WindowState } from '@/types/os';
import { Terminal, FolderTree, Activity, Cpu, Brain, Network, Code, HardDrive, Database, Zap, Settings, ChevronUp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TaskbarProps {
  windows: WindowState[];
  onOpenApp: (app: AppType, title: string) => void;
  onFocusWindow: (id: string) => void;
}

const allApps: { app: AppType; title: string; icon: React.ReactNode; label: string }[] = [
  { app: 'terminal', title: 'Prime Shell (psh)', icon: <Terminal size={18} />, label: 'Terminal' },
  { app: 'files', title: 'Prime File System', icon: <FolderTree size={18} />, label: 'Files' },
  { app: 'q3inference', title: 'Q3-Inference Engine', icon: <Brain size={18} />, label: 'Q3 Inference' },
  { app: 'primenet', title: 'PrimeNet Monitor', icon: <Network size={18} />, label: 'PrimeNet' },
  { app: 'geomc', title: 'GeomC Compiler', icon: <Code size={18} />, label: 'GeomC' },
  { app: 'foldmem', title: 'FoldMem Visualizer', icon: <HardDrive size={18} />, label: 'FoldMem' },
  { app: 'storage', title: 'Prime Storage', icon: <Database size={18} />, label: 'Storage' },
  { app: 'energy', title: 'Energy Monitor', icon: <Zap size={18} />, label: 'Energy' },
  { app: 'processes', title: 'Qutrit Processes', icon: <Activity size={18} />, label: 'Processes' },
  { app: 'sysinfo', title: 'System Info', icon: <Cpu size={18} />, label: 'SysInfo' },
  { app: 'settings', title: 'Settings', icon: <Settings size={18} />, label: 'Settings' },
];

export default function Taskbar({ windows, onOpenApp, onFocusWindow }: TaskbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const openWindows = windows.filter(w => !w.isMinimized);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] flex items-center h-10 px-3 bg-card/90 backdrop-blur-md border-t border-border">
      {/* PRIME Menu Button */}
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 mr-4 pr-4 border-r border-border hover:bg-primary/10 rounded px-2 py-1 transition-colors">
            <div className="w-5 h-5 rounded-sm bg-primary/20 border border-primary/40 flex items-center justify-center">
              <span className="font-display text-[8px] font-bold text-primary">P</span>
            </div>
            <span className="font-display text-[9px] tracking-[0.2em] text-primary glow-text">PRIME</span>
            <ChevronUp size={10} className={`text-primary transition-transform ${menuOpen ? '' : 'rotate-180'}`} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={8}
          className="w-56 p-2 bg-card/95 backdrop-blur-md border-border z-[200]"
        >
          <div className="mb-2 px-2 pt-1">
            <p className="font-display text-[9px] tracking-[0.2em] uppercase text-primary">Applications</p>
          </div>
          <div className="flex flex-col gap-0.5 max-h-80 overflow-y-auto">
            {allApps.map(a => (
              <button
                key={a.app}
                onClick={() => {
                  const existing = windows.find(w => w.app === a.app);
                  if (existing) onFocusWindow(existing.id);
                  else onOpenApp(a.app, a.title);
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded text-xs font-body transition-all text-muted-foreground hover:text-foreground hover:bg-primary/10"
              >
                <span className="text-muted-foreground">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Open windows */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {openWindows.map(w => {
          const appDef = allApps.find(a => a.app === w.app);
          return (
            <button
              key={w.id}
              onClick={() => onFocusWindow(w.id)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-body transition-all shrink-0 bg-primary/10 text-primary border border-primary/20"
            >
              {appDef?.icon && <span className="[&>svg]:size-4">{appDef.icon}</span>}
              <span className="hidden sm:inline max-w-20 truncate">{w.title}</span>
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
          <Zap size={10} className="text-prime-amber" />
          <span>COP 3.2</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-prime-green animate-pulse-glow" />
          <span>649 cores</span>
        </div>
        <ClockDisplay />
      </div>
    </div>
  );
}

function ClockDisplay() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="text-[10px] font-mono text-muted-foreground">{time}</span>;
}
