import { useState, useEffect } from 'react';
import { QutritProcess } from '@/types/os';

const stateLabels = ['|0⟩ Past', '|1⟩ Present', '|2⟩ Future'] as const;
const stateColors = ['text-muted-foreground', 'text-prime-green', 'text-prime-violet'] as const;
const stateIcons = ['◆', '◈', '◇'] as const;

const initialProcesses: QutritProcess[] = [
  { id: '1', name: 'qk-scheduler', coord: '⟨2,3,5,...⟩', state: 1, potential: 0.92, cpu: 12, memory: 45 },
  { id: '2', name: 'pfs-daemon', coord: '⟨7,11,13,...⟩', state: 1, potential: 0.85, cpu: 4, memory: 120 },
  { id: '3', name: 'gfo-handler', coord: '⟨17,19,23,...⟩', state: 1, potential: 0.78, cpu: 8, memory: 67 },
  { id: '4', name: 'net-flow', coord: '⟨29,31,37,...⟩', state: 2, potential: 0.45, cpu: 0, memory: 30 },
  { id: '5', name: 'gc-evaporator', coord: '⟨41,43,47,...⟩', state: 0, potential: 0.12, cpu: 1, memory: 15 },
  { id: '6', name: 'psh-shell', coord: '⟨53,59,61,...⟩', state: 1, potential: 0.70, cpu: 3, memory: 22 },
  { id: '7', name: 'primede-render', coord: '⟨67,71,73,...⟩', state: 1, potential: 0.88, cpu: 15, memory: 210 },
  { id: '8', name: 'waltz-daemon', coord: '⟨79,83,89,...⟩', state: 2, potential: 0.55, cpu: 0, memory: 8 },
];

export default function ProcessesApp() {
  const [processes, setProcesses] = useState(initialProcesses);

  useEffect(() => {
    const interval = setInterval(() => {
      setProcesses(prev =>
        prev.map(p => ({
          ...p,
          cpu: Math.max(0, Math.min(100, p.cpu + (Math.random() * 6 - 3))),
          potential: Math.max(0, Math.min(1, p.potential + (Math.random() * 0.06 - 0.03))),
          state: Math.random() > 0.92 ? (((p.state * 2 - (p.state === 0 ? 0 : p.state - 1)) % 3 + 3) % 3 as 0 | 1 | 2) : p.state,
        }))
      );
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full bg-background p-3 overflow-y-auto font-mono text-xs">
      <div className="font-display text-[10px] tracking-wider text-primary mb-3 uppercase">
        Qutrit Process Monitor
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-3 text-[10px]">
        {stateLabels.map((label, i) => (
          <span key={i} className={stateColors[i]}>
            {stateIcons[i]} {label}
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground uppercase tracking-wider py-1 border-b border-border">
          <span className="w-6">ST</span>
          <span className="w-28">NAME</span>
          <span className="w-28">COORD</span>
          <span className="w-16">CPU</span>
          <span className="w-16">MEM (qt)</span>
          <span className="flex-1">POTENTIAL</span>
        </div>
        {processes.map(p => (
          <div key={p.id} className="flex items-center gap-2 py-1 hover:bg-muted/30 rounded px-0.5">
            <span className={`w-6 ${stateColors[p.state]}`}>{stateIcons[p.state]}</span>
            <span className="w-28 text-card-foreground truncate">{p.name}</span>
            <span className="w-28 text-muted-foreground truncate">{p.coord}</span>
            <span className="w-16 text-card-foreground">{p.cpu.toFixed(1)}%</span>
            <span className="w-16 text-card-foreground">{p.memory}</span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${p.potential * 100}%`,
                    background: p.potential > 0.7
                      ? 'hsl(var(--prime-green))'
                      : p.potential > 0.3
                      ? 'hsl(var(--prime-amber))'
                      : 'hsl(var(--prime-red))',
                  }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground w-8">{(p.potential * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-2 rounded bg-muted/30 border border-border text-[10px] text-muted-foreground">
        <span className="text-primary">Fibonacci Waltz:</span> |ψ_next⟩ = 2·|ψ_current⟩ − |ψ_previous⟩ (mod 3)
      </div>
    </div>
  );
}
