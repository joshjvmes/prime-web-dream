import { useState, useEffect, useRef, useCallback } from 'react';
import { X, GripHorizontal } from 'lucide-react';

interface WidgetPos { x: number; y: number; }
interface WidgetState {
  clock: boolean;
  stats: boolean;
  notes: boolean;
  network: boolean;
  positions: Record<string, WidgetPos>;
}

const DEFAULTS: WidgetState = {
  clock: true, stats: true, notes: false, network: false,
  positions: { clock: { x: 200, y: 80 }, stats: { x: 200, y: 220 }, notes: { x: 400, y: 80 }, network: { x: 400, y: 220 } },
};

function loadState(): WidgetState {
  try { const s = localStorage.getItem('prime-os-widgets'); return s ? { ...DEFAULTS, ...JSON.parse(s) } : DEFAULTS; } catch { return DEFAULTS; }
}

function saveState(s: WidgetState) { localStorage.setItem('prime-os-widgets', JSON.stringify(s)); }

// Draggable wrapper
function DraggableWidget({ id, pos, onMove, onClose, title, children }: {
  id: string; pos: WidgetPos; onMove: (id: string, pos: WidgetPos) => void; onClose: (id: string) => void; title: string; children: React.ReactNode;
}) {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      onMove(id, { x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
    };
    const onMouseUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [id, pos, onMove]);

  return (
    <div className="absolute select-none" style={{ left: pos.x, top: pos.y, zIndex: 5 }}>
      <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden min-w-[180px]">
        <div className="flex items-center justify-between px-2 py-1 border-b border-border/50 cursor-move" onMouseDown={onMouseDown}>
          <div className="flex items-center gap-1">
            <GripHorizontal size={10} className="text-muted-foreground/40" />
            <span className="font-display text-[8px] tracking-wider uppercase text-primary/60">{title}</span>
          </div>
          <button onClick={() => onClose(id)} className="text-muted-foreground/40 hover:text-foreground transition-colors">
            <X size={10} />
          </button>
        </div>
        <div className="p-2">{children}</div>
      </div>
    </div>
  );
}

// Clock Widget
function ClockWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  const SYNODIC = 29.53058867;
  const KNOWN = new Date(2000, 0, 6, 18, 14);
  const diff = now.getTime() - KNOWN.getTime();
  const phase = (((diff / 86400000) % SYNODIC) + SYNODIC) % SYNODIC;
  const moonIdx = Math.floor(phase / (SYNODIC / 8)) % 8;
  const moons = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];

  return (
    <div className="text-center">
      <p className="text-2xl font-display text-foreground/90 tracking-wider">
        {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      </p>
      <p className="text-[9px] text-muted-foreground/50 mt-0.5">{moons[moonIdx]}</p>
    </div>
  );
}

// System Stats Widget
function StatsWidget() {
  const [cpu, setCpu] = useState(42);
  const [mem, setMem] = useState(55);
  const [energy, setEnergy] = useState(321);

  useEffect(() => {
    const id = setInterval(() => {
      setCpu(c => Math.max(5, Math.min(95, c + (Math.random() - 0.5) * 10)));
      setMem(m => Math.max(30, Math.min(85, m + (Math.random() - 0.5) * 5)));
      setEnergy(e => Math.max(280, Math.min(360, e + (Math.random() - 0.5) * 20)));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const Bar = ({ label, value, max = 100 }: { label: string; value: number; max?: number }) => (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-muted-foreground w-10 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-[8px] text-muted-foreground/60 w-8 text-right">{Math.round(value)}{max === 100 ? '%' : 'W'}</span>
    </div>
  );

  return (
    <div className="space-y-1.5 min-w-[160px]">
      <Bar label="CPU" value={cpu} />
      <Bar label="MEM" value={mem} />
      <Bar label="COP" value={energy} max={400} />
    </div>
  );
}

// Quick Notes Widget
function NotesWidget() {
  const [text, setText] = useState(() => {
    try { return localStorage.getItem('prime-os-widget-notes') || ''; } catch { return ''; }
  });

  useEffect(() => { localStorage.setItem('prime-os-widget-notes', text); }, [text]);

  return (
    <textarea
      value={text}
      onChange={e => setText(e.target.value)}
      placeholder="Quick notes..."
      className="w-full h-20 bg-transparent text-[10px] text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none font-mono"
    />
  );
}

// Network Widget
function NetworkWidget() {
  const [nodes, setNodes] = useState(6);
  const [latency, setLatency] = useState(0.3);

  useEffect(() => {
    const id = setInterval(() => {
      setLatency(l => Math.max(0.1, Math.min(2, l + (Math.random() - 0.5) * 0.3)));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-1 min-w-[140px]">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">Nodes</span>
        <span className="text-[9px] text-primary">{nodes} active</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">Latency</span>
        <span className={`text-[9px] ${latency < 1 ? 'text-prime-green' : 'text-prime-amber'}`}>{latency.toFixed(1)}ms</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">Status</span>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-prime-green animate-pulse" />
          <span className="text-[9px] text-prime-green">Nominal</span>
        </div>
      </div>
    </div>
  );
}

export default function DesktopWidgets() {
  const [state, setState] = useState<WidgetState>(loadState);

  const updateState = useCallback((updater: (prev: WidgetState) => WidgetState) => {
    setState(prev => { const next = updater(prev); saveState(next); return next; });
  }, []);

  const moveWidget = useCallback((id: string, pos: WidgetPos) => {
    updateState(s => ({ ...s, positions: { ...s.positions, [id]: pos } }));
  }, [updateState]);

  const closeWidget = useCallback((id: string) => {
    updateState(s => ({ ...s, [id]: false }));
  }, [updateState]);

  const widgets: { id: string; title: string; enabled: boolean; content: React.ReactNode }[] = [
    { id: 'clock', title: 'Clock', enabled: state.clock, content: <ClockWidget /> },
    { id: 'stats', title: 'System Stats', enabled: state.stats, content: <StatsWidget /> },
    { id: 'notes', title: 'Quick Notes', enabled: state.notes, content: <NotesWidget /> },
    { id: 'network', title: 'PrimeNet', enabled: state.network, content: <NetworkWidget /> },
  ];

  return (
    <>
      {widgets.filter(w => w.enabled).map(w => (
        <DraggableWidget
          key={w.id}
          id={w.id}
          pos={state.positions[w.id] || { x: 200, y: 100 }}
          onMove={moveWidget}
          onClose={closeWidget}
          title={w.title}
        >
          {w.content}
        </DraggableWidget>
      ))}
    </>
  );
}

// Export for settings
export function useWidgetSettings() {
  const [state, setState] = useState<WidgetState>(loadState);

  const toggle = useCallback((id: string) => {
    setState(prev => {
      const next = { ...prev, [id]: !prev[id as keyof WidgetState] };
      saveState(next as WidgetState);
      return next as WidgetState;
    });
  }, []);

  return { state, toggle };
}
