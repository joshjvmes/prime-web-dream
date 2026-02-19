import { useState, useEffect } from 'react';
import { AppType, WindowState } from '@/types/os';
import { Terminal, FolderTree, Activity, Cpu, Brain, Network, Code, HardDrive, Database, Zap } from 'lucide-react';

interface TaskbarProps {
  windows: WindowState[];
  onOpenApp: (app: AppType, title: string) => void;
  onFocusWindow: (id: string) => void;
}

const apps: { app: AppType; title: string; icon: React.ReactNode; label: string }[] = [
  { app: 'terminal', title: 'Prime Shell (psh)', icon: <Terminal size={16} />, label: 'psh' },
  { app: 'files', title: 'Prime File System', icon: <FolderTree size={16} />, label: 'PFS' },
  { app: 'processes', title: 'Qutrit Processes', icon: <Activity size={16} />, label: 'QP' },
  { app: 'sysinfo', title: 'System Info', icon: <Cpu size={16} />, label: 'SYS' },
  { app: 'q3inference', title: 'Q3-Inference Engine', icon: <Brain size={16} />, label: 'Q3' },
  { app: 'primenet', title: 'PrimeNet Monitor', icon: <Network size={16} />, label: 'NET' },
  { app: 'geomc', title: 'GeomC Compiler', icon: <Code size={16} />, label: 'GCC' },
  { app: 'foldmem', title: 'FoldMem Visualizer', icon: <HardDrive size={16} />, label: 'MEM' },
  { app: 'storage', title: 'Prime Storage', icon: <Database size={16} />, label: 'STO' },
  { app: 'energy', title: 'Energy Monitor', icon: <Zap size={16} />, label: 'NRG' },
];

export default function Taskbar({ windows, onOpenApp, onFocusWindow }: TaskbarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] flex items-center h-10 px-3 bg-card/90 backdrop-blur-md border-t border-border">
      <div className="flex items-center gap-2 mr-4 pr-4 border-r border-border">
        <div className="w-5 h-5 rounded-sm bg-primary/20 border border-primary/40 flex items-center justify-center">
          <span className="font-display text-[8px] font-bold text-primary">P</span>
        </div>
        <span className="font-display text-[9px] tracking-[0.2em] text-primary glow-text">PRIME</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {apps.map(a => {
          const isOpen = windows.some(w => w.app === a.app && !w.isMinimized);
          return (
            <button
              key={a.app}
              onClick={() => {
                const existing = windows.find(w => w.app === a.app);
                if (existing) onFocusWindow(existing.id);
                else onOpenApp(a.app, a.title);
              }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-body transition-all shrink-0 ${
                isOpen
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {a.icon}
              <span className="hidden sm:inline">{a.label}</span>
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
