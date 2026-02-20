import { useState, useEffect } from 'react';
import { Cog, Play, Square, RotateCcw, Battery, MapPin, Wifi } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

type UnitType = 'drone' | 'arm' | 'rover';
type UnitStatus = 'idle' | 'active' | 'charging' | 'error';
type TaskName = 'patrol' | 'scan' | 'transport' | 'calibrate';

interface RoboUnit {
  id: string;
  name: string;
  type: UnitType;
  status: UnitStatus;
  battery: number;
  task: TaskName | null;
  x: number;
  y: number;
  speed: number;
}

const INITIAL_UNITS: RoboUnit[] = [
  { id: 'dr-01', name: 'Falcon-01', type: 'drone', status: 'active', battery: 82, task: 'patrol', x: 12.4, y: 8.7, speed: 3.2 },
  { id: 'dr-02', name: 'Falcon-02', type: 'drone', status: 'idle', battery: 95, task: null, x: 0, y: 0, speed: 0 },
  { id: 'ar-01', name: 'Mantis-A1', type: 'arm', status: 'active', battery: 100, task: 'calibrate', x: 5.0, y: 2.0, speed: 0 },
  { id: 'ar-02', name: 'Mantis-A2', type: 'arm', status: 'error', battery: 100, task: null, x: 5.1, y: 2.1, speed: 0 },
  { id: 'rv-01', name: 'Pathfinder-1', type: 'rover', status: 'active', battery: 67, task: 'transport', x: 22.1, y: 15.3, speed: 1.1 },
  { id: 'rv-02', name: 'Pathfinder-2', type: 'rover', status: 'charging', battery: 31, task: null, x: 0, y: 0, speed: 0 },
];

const TASKS: TaskName[] = ['patrol', 'scan', 'transport', 'calibrate'];

const STATUS_COLORS: Record<UnitStatus, string> = {
  idle: 'bg-muted-foreground',
  active: 'bg-prime-green',
  charging: 'bg-prime-amber',
  error: 'bg-destructive',
};

const TYPE_ICONS: Record<UnitType, string> = { drone: '🛸', arm: '🦾', rover: '🤖' };

export default function PrimeRoboticsApp() {
  const [units, setUnits] = useState<RoboUnit[]>(INITIAL_UNITS);
  const [selected, setSelected] = useState<string | null>('dr-01');

  // Simulated live updates
  useEffect(() => {
    const iv = setInterval(() => {
      setUnits(prev => prev.map(u => {
        if (u.status === 'active') {
          return {
            ...u,
            x: +(u.x + (Math.random() - 0.5) * 0.8).toFixed(1),
            y: +(u.y + (Math.random() - 0.5) * 0.8).toFixed(1),
            speed: +(Math.max(0, u.speed + (Math.random() - 0.5) * 0.3)).toFixed(1),
            battery: Math.max(0, u.battery - Math.random() * 0.3),
          };
        }
        if (u.status === 'charging') {
          return { ...u, battery: Math.min(100, u.battery + Math.random() * 2) };
        }
        return u;
      }));
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const sel = units.find(u => u.id === selected);

  const startUnit = (id: string) => setUnits(prev => prev.map(u => u.id === id ? { ...u, status: 'active' as UnitStatus, speed: 1.0 } : u));
  const stopUnit = (id: string) => setUnits(prev => prev.map(u => u.id === id ? { ...u, status: 'idle' as UnitStatus, speed: 0, task: null } : u));
  const recallUnit = (id: string) => setUnits(prev => prev.map(u => u.id === id ? { ...u, status: 'idle' as UnitStatus, x: 0, y: 0, speed: 0, task: null } : u));
  const assignTask = (id: string, task: TaskName) => setUnits(prev => prev.map(u => u.id === id ? { ...u, task, status: 'active' as UnitStatus, speed: 1.5 } : u));

  return (
    <div className="flex h-full bg-background text-foreground font-mono text-xs">
      {/* Fleet List */}
      <div className="w-52 border-r border-border flex flex-col shrink-0">
        <div className="p-2 border-b border-border flex items-center gap-1.5">
          <Cog size={12} className="text-primary" />
          <span className="font-display text-[9px] tracking-widest uppercase text-primary">Fleet</span>
          <span className="ml-auto text-[9px] text-muted-foreground">{units.length} units</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-0.5">
            {units.map(u => (
              <button
                key={u.id}
                onClick={() => setSelected(u.id)}
                className={`w-full flex items-center gap-2 p-2 rounded text-left transition-colors ${
                  selected === u.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/30 text-foreground'
                }`}
              >
                <span>{TYPE_ICONS[u.type]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium truncate">{u.name}</p>
                  <p className="text-[9px] text-muted-foreground">{u.type} • {u.id}</p>
                </div>
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[u.status]}`} />
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Detail / Control */}
      <div className="flex-1 flex flex-col min-w-0">
        {sel ? (
          <>
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-lg">{TYPE_ICONS[sel.type]}</span>
                <div>
                  <h3 className="font-display text-sm text-foreground">{sel.name}</h3>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{sel.type} — {sel.id}</p>
                </div>
                <span className={`ml-auto px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  sel.status === 'active' ? 'bg-prime-green/20 text-prime-green' :
                  sel.status === 'error' ? 'bg-destructive/20 text-destructive' :
                  sel.status === 'charging' ? 'bg-prime-amber/20 text-prime-amber' :
                  'bg-muted text-muted-foreground'
                }`}>{sel.status}</span>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-4">
                {/* Telemetry */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded border border-border">
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1"><Battery size={10} /> Battery</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${sel.battery > 50 ? 'bg-prime-green' : sel.battery > 20 ? 'bg-prime-amber' : 'bg-destructive'}`} style={{ width: `${sel.battery}%` }} />
                      </div>
                      <span className="text-[10px] font-bold">{sel.battery.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="p-2 rounded border border-border">
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1"><MapPin size={10} /> Position</div>
                    <p className="text-[11px]">({sel.x.toFixed(1)}, {sel.y.toFixed(1)})</p>
                  </div>
                  <div className="p-2 rounded border border-border">
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1"><Wifi size={10} /> Speed</div>
                    <p className="text-[11px]">{sel.speed.toFixed(1)} m/s</p>
                  </div>
                  <div className="p-2 rounded border border-border">
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1">📋 Task</div>
                    <p className="text-[11px]">{sel.task || 'None'}</p>
                  </div>
                </div>

                {/* Controls */}
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Controls</p>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => startUnit(sel.id)} disabled={sel.status === 'active'} className="flex items-center gap-1 px-2 py-1 rounded border border-border text-[10px] hover:bg-primary/10 hover:text-primary disabled:opacity-30 transition-colors"><Play size={10} /> Start</button>
                    <button onClick={() => stopUnit(sel.id)} disabled={sel.status === 'idle'} className="flex items-center gap-1 px-2 py-1 rounded border border-border text-[10px] hover:bg-primary/10 hover:text-primary disabled:opacity-30 transition-colors"><Square size={10} /> Stop</button>
                    <button onClick={() => recallUnit(sel.id)} className="flex items-center gap-1 px-2 py-1 rounded border border-border text-[10px] hover:bg-primary/10 hover:text-primary transition-colors"><RotateCcw size={10} /> Recall</button>
                  </div>
                </div>

                {/* Task Assignment */}
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Assign Task</p>
                  <div className="flex gap-2 flex-wrap">
                    {TASKS.map(t => (
                      <button
                        key={t}
                        onClick={() => assignTask(sel.id, t)}
                        className={`px-2 py-1 rounded border text-[10px] transition-colors ${
                          sel.task === t ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30 hover:text-primary'
                        }`}
                      >{t}</button>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-[11px]">Select a unit from the fleet</div>
        )}
      </div>
    </div>
  );
}
