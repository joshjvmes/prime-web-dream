import { useState, useEffect, useRef, useCallback } from 'react';
import { X, GripHorizontal, Rocket, TrendingUp, Store, Activity, Share2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { eventBus } from '@/hooks/useEventBus';
import RokCatFace, { type RokCatFaceHandle } from '@/components/os/RokCatFace';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface WidgetPos { x: number; y: number; }
interface WidgetState {
  clock: boolean;
  stats: boolean;
  notes: boolean;
  network: boolean;
  forge: boolean;
  agentLog: boolean;
  rokcat: boolean;
  positions: Record<string, WidgetPos>;
}

const DEFAULTS: WidgetState = {
  clock: true, stats: true, notes: false, network: false, forge: false, agentLog: false, rokcat: true,
  positions: { clock: { x: 200, y: 80 }, stats: { x: 200, y: 220 }, notes: { x: 400, y: 80 }, network: { x: 400, y: 220 }, forge: { x: 600, y: 80 }, agentLog: { x: 600, y: 220 }, rokcat: { x: 900, y: 400 } },
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

function ForgeWidget() {
  const [data, setData] = useState<{ ipoCount: number; totalRaised: number; openOrders: number; latest: { name: string; icon: string; price: number; ipo_active: boolean }[] }>({
    ipoCount: 0, totalRaised: 0, openOrders: 0, latest: [],
  });

  const fetchData = useCallback(async () => {
    const [{ data: listings }, { count: orderCount }] = await Promise.all([
      supabase.from('forge_listings').select('name, icon, price, ipo_active, ipo_raised, ipo_target').eq('is_listed', true).order('created_at', { ascending: false }).limit(10),
      supabase.from('share_orders').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ]);
    if (listings) {
      const ipos = listings.filter((l: any) => l.ipo_active);
      setData({
        ipoCount: ipos.length,
        totalRaised: ipos.reduce((s: number, l: any) => s + Number(l.ipo_raised || 0), 0),
        openOrders: orderCount || 0,
        latest: listings.slice(0, 3).map((l: any) => ({ name: l.name, icon: l.icon, price: l.price, ipo_active: l.ipo_active })),
      });
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    const channel = supabase.channel('forge-widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forge_listings' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'share_orders' }, fetchData)
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [fetchData]);

  return (
    <div className="space-y-1.5 min-w-[160px]">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">Active IPOs</span>
        <span className="text-[9px] text-primary font-bold">{data.ipoCount}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">Capital Raised</span>
        <span className="text-[9px] text-foreground">{data.totalRaised.toLocaleString()} OS</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">Open Orders</span>
        <span className="text-[9px] text-foreground">{data.openOrders}</span>
      </div>
      {data.latest.length > 0 && (
        <div className="border-t border-border/30 pt-1 mt-1 space-y-0.5">
          <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider">Latest</span>
          {data.latest.map((l, i) => (
            <div key={i} className="flex items-center gap-1 text-[9px]">
              <span>{l.icon}</span>
              <span className="text-foreground truncate flex-1">{l.name}</span>
              {l.ipo_active ? (
                <span className="px-1 rounded bg-primary/20 text-primary text-[7px] font-bold">IPO</span>
              ) : (
                <span className="text-muted-foreground">{l.price === 0 ? 'Free' : `${l.price} OS`}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Agent Activity Log Widget
function AgentLogWidget() {
  const [actions, setActions] = useState<{ type: string; summary: string; timestamp: Date }[]>([]);

  useEffect(() => {
    const handler = (payload: any) => {
      if (!payload) return;
      setActions(prev => [
        { type: payload.type || 'post', summary: payload.summary || 'Agent action', timestamp: new Date(payload.timestamp || Date.now()) },
        ...prev,
      ].slice(0, 20));
    };
    eventBus.on('agent.action.logged', handler);
    return () => eventBus.off('agent.action.logged', handler);
  }, []);

  if (actions.length === 0) {
    return (
      <div className="min-w-[160px] text-center">
        <p className="text-[9px] text-muted-foreground/50">No agent activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 min-w-[180px] max-h-32 overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider">Recent</span>
        <span className="text-[7px] bg-primary/20 text-primary px-1 rounded">{actions.length}</span>
      </div>
      {actions.slice(0, 5).map((a, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[9px]">
          {a.type === 'post' ? <Share2 size={8} className="text-primary/60 shrink-0" /> : <Mail size={8} className="text-primary/60 shrink-0" />}
          <span className="text-muted-foreground truncate flex-1">{a.summary}</span>
          <span className="text-muted-foreground/40 text-[7px] shrink-0">
            {a.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ROKCAT Mini Widget
function RokCatWidget() {
  const faceRef = useRef<RokCatFaceHandle>(null);
  const [active, setActive] = useState(() => {
    try { return localStorage.getItem('prime-os-rokcat-active') === 'true'; } catch { return false; }
  });
  const speakingQueue = useRef(false);

  useEffect(() => {
    localStorage.setItem('prime-os-rokcat-active', String(active));
  }, [active]);

  const speakText = useCallback(async (text: string) => {
    if (!faceRef.current || speakingQueue.current) return;
    speakingQueue.current = true;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: text.slice(0, 200) }),
        }
      );
      if (!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      await faceRef.current.speak(url);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('[ROKCAT TTS]', e);
    } finally {
      speakingQueue.current = false;
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const onNotif = (payload: any) => {
      const summary = payload?.message || payload?.title || 'New notification';
      speakText(summary);
    };
    const onAgent = (payload: any) => {
      const summary = payload?.summary || 'Agent action completed';
      speakText(summary);
    };
    eventBus.on('notification.received', onNotif);
    eventBus.on('agent.action.logged', onAgent);
    return () => {
      eventBus.off('notification.received', onNotif);
      eventBus.off('agent.action.logged', onAgent);
    };
  }, [active, speakText]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="relative"
            onDoubleClick={(e) => { e.preventDefault(); setActive(a => !a); }}
          >
            <div className={`w-[120px] h-[120px] transition-all duration-300 ${active ? 'opacity-100' : 'opacity-40 grayscale'}`}>
              <RokCatFace ref={faceRef} className="w-full h-full" />
            </div>
            {/* Status dot */}
            <div className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-background ${
              active ? 'bg-prime-green animate-pulse' : 'bg-muted-foreground/40'
            }`} />
            {/* Sleep indicator */}
            {!active && (
              <span className="absolute top-1 right-1 text-[10px] text-muted-foreground/50 select-none">zzz</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px]">
          Double-click to {active ? 'sleep' : 'wake'} ROKCAT
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function DesktopWidgets() {
  const [state, setState] = useState<WidgetState>(loadState);

  useEffect(() => {
    const handler = () => setState(loadState());
    eventBus.on('widgets.updated', handler);
    return () => eventBus.off('widgets.updated', handler);
  }, []);

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
    { id: 'forge', title: 'Forge Market', enabled: state.forge, content: <ForgeWidget /> },
    { id: 'agentLog', title: 'Agent Activity', enabled: state.agentLog, content: <AgentLogWidget /> },
    { id: 'rokcat', title: 'ROKCAT', enabled: state.rokcat, content: <RokCatWidget /> },
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

