import { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AppType } from '@/types/os';

interface CoresPopoverProps {
  onOpenApp: (app: AppType, title: string) => void;
}

const TOTAL_CORES = 649;
const SUBSYSTEMS = [
  { name: 'Kernel', cores: 72 },
  { name: 'Network', cores: 128 },
  { name: 'Inference', cores: 256 },
  { name: 'User', cores: 129 },
  { name: 'I/O', cores: 64 },
];

function randomStates(): number[] {
  return Array.from({ length: TOTAL_CORES }, () => {
    const r = Math.random();
    return r < 0.6 ? 1 : r < 0.85 ? 0 : 2; // 1=active, 0=idle, 2=busy
  });
}

export default function CoresPopover({ onOpenApp }: CoresPopoverProps) {
  const [states, setStates] = useState(randomStates);

  useEffect(() => {
    const id = setInterval(() => setStates(randomStates()), 2000);
    return () => clearInterval(id);
  }, []);

  const active = states.filter(s => s === 1).length;
  const idle = states.filter(s => s === 0).length;
  const busy = states.filter(s => s === 2).length;
  const avgLoad = +((((active + busy) / TOTAL_CORES) * 100)).toFixed(0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded px-1.5 py-0.5 transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-prime-green animate-pulse-glow" />
          <span>{TOTAL_CORES} cores</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="center" sideOffset={8} className="w-64 p-3 bg-card/95 backdrop-blur-md border-border z-[200]">
        <p className="font-display text-[9px] tracking-[0.2em] uppercase text-primary mb-2">Compute Array</p>

        {/* Core grid */}
        <div className="flex flex-wrap gap-[2px] mb-2 max-h-24 overflow-hidden">
          {states.map((s, i) => (
            <span
              key={i}
              className={`block w-[4px] h-[4px] rounded-[1px] ${
                s === 1 ? 'bg-prime-green' : s === 2 ? 'bg-prime-amber' : 'bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-3 text-[7px] text-muted-foreground mb-2">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-[1px] bg-prime-green inline-block" /> Active</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-[1px] bg-prime-amber inline-block" /> Busy</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-[1px] bg-muted-foreground/20 inline-block" /> Idle</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] mb-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Active</span><span className="text-prime-green font-mono">{active}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Busy</span><span className="text-prime-amber font-mono">{busy}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Idle</span><span className="text-foreground font-mono">{idle}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Avg Load</span><span className="text-foreground font-mono">{avgLoad}%</span></div>
        </div>

        {/* Architecture */}
        <p className="text-[8px] text-muted-foreground italic mb-2">Architecture: 11D Folded → 4D</p>

        {/* Subsystem distribution */}
        <div className="mb-2">
          <p className="text-[7px] text-muted-foreground mb-1 uppercase tracking-wider">Subsystem Distribution</p>
          {SUBSYSTEMS.map(sub => (
            <div key={sub.name} className="flex items-center gap-2 text-[8px] mb-0.5">
              <span className="w-14 text-muted-foreground">{sub.name}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(sub.cores / TOTAL_CORES) * 100}%` }} />
              </div>
              <span className="text-muted-foreground font-mono w-6 text-right">{sub.cores}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => onOpenApp('monitor', 'System Monitor')}
          className="w-full text-[9px] py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors font-display tracking-wider uppercase"
        >
          Open System Monitor
        </button>
      </PopoverContent>
    </Popover>
  );
}
