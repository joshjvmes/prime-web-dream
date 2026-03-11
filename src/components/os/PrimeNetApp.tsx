import { useState, useEffect, useRef, useCallback } from 'react';
import { eventBus } from '@/hooks/useEventBus';
import { NetworkNode } from '@/types/os';

const INITIAL_NODES: NetworkNode[] = [
  { id: 'n1', label: 'Hub-α', x: 100, y: 40, coord: '⟨2,3,5,...⟩', load: 0.72 },
  { id: 'n2', label: 'Hub-β', x: 50, y: 100, coord: '⟨7,11,13,...⟩', load: 0.45 },
  { id: 'n3', label: 'Hub-γ', x: 150, y: 100, coord: '⟨17,19,23,...⟩', load: 0.88 },
  { id: 'n4', label: 'Node-δ', x: 30, y: 160, coord: '⟨29,31,37,...⟩', load: 0.31 },
  { id: 'n5', label: 'Node-ε', x: 100, y: 170, coord: '⟨41,43,47,...⟩', load: 0.56 },
  { id: 'n6', label: 'Node-ζ', x: 170, y: 160, coord: '⟨53,59,61,...⟩', load: 0.67 },
];

const INITIAL_EDGES: [string, string][] = [
  ['n1','n2'], ['n1','n3'], ['n2','n3'], ['n2','n4'], ['n2','n5'], ['n3','n5'], ['n3','n6'], ['n5','n6'], ['n4','n5'],
];

interface Packet { id: number; from: string; to: string; progress: number; }

const GREEK = ['η','θ','ι','κ','λ','μ','ν','ξ','ο','π'];
const PRIMES = [73,79,83,89,97,101,103,107,109,113];

export default function PrimeNetApp() {
  const [nodes, setNodes] = useState<NetworkNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<[string,string][]>(INITIAL_EDGES);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [selected, setSelected] = useState<NetworkNode | null>(null);
  const [stats, setStats] = useState({ throughput: 0, decisions: 0, latency: 0.3 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  // ROKCAT navigation listener
  useEffect(() => {
    const handler = (payload: any) => {
      if (payload?.app === 'net' && payload?.context) {
        const ctx = payload.context.toLowerCase();
        if (ctx === 'pause') setPaused(true);
        if (ctx === 'resume') setPaused(false);
        if (ctx === 'stats') setSelected(null); // deselect to show overview
      }
    };
    eventBus.on('app.navigate', handler);
    return () => eventBus.off('app.navigate', handler);
  }, []);
  const idRef = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const nextNodeId = useRef(7);

  // Live load fluctuation
  useEffect(() => {
    const id = setInterval(() => {
      setNodes(prev => prev.map(n => ({
        ...n,
        load: Math.max(0.05, Math.min(1, n.load + (Math.random() - 0.5) * 0.08)),
      })));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // Packet generation
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      if (edges.length === 0) return;
      const edge = edges[Math.floor(Math.random() * edges.length)];
      const rev = Math.random() > 0.5;
      setPackets(prev => [...prev, {
        id: idRef.current++,
        from: rev ? edge[1] : edge[0],
        to: rev ? edge[0] : edge[1],
        progress: 0,
      }]);
      setStats(s => ({
        throughput: s.throughput + 1,
        decisions: s.decisions + 1,
        latency: +(0.2 + Math.random() * 0.2).toFixed(1),
      }));
    }, 800);
    return () => clearInterval(interval);
  }, [paused, edges]);

  // Packet animation
  useEffect(() => {
    if (paused) return;
    const anim = setInterval(() => {
      setPackets(prev => prev
        .map(p => ({ ...p, progress: p.progress + 0.05 }))
        .filter(p => p.progress <= 1)
      );
    }, 50);
    return () => clearInterval(anim);
  }, [paused]);

  const getNode = useCallback((id: string) => nodes.find(n => n.id === id), [nodes]);

  // Drag nodes in SVG
  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 200;
    const y = ((e.clientY - rect.top) / rect.height) * 200;
    setNodes(prev => prev.map(n => n.id === dragging ? { ...n, x: Math.max(10, Math.min(190, x)), y: Math.max(10, Math.min(190, y)) } : n));
  }, [dragging]);

  const addNode = useCallback(() => {
    const idx = nextNodeId.current - 7;
    const name = GREEK[idx % GREEK.length];
    const newNode: NetworkNode = {
      id: `n${nextNodeId.current}`,
      label: `Node-${name}`,
      x: 30 + Math.random() * 140,
      y: 30 + Math.random() * 140,
      coord: `⟨${PRIMES[idx % PRIMES.length]},${PRIMES[(idx+1) % PRIMES.length]},${PRIMES[(idx+2) % PRIMES.length]},...⟩`,
      load: Math.random() * 0.5 + 0.2,
    };
    nextNodeId.current++;
    // Connect to nearest node
    let nearest = nodes[0];
    let minDist = Infinity;
    for (const n of nodes) {
      const d = Math.hypot(n.x - newNode.x, n.y - newNode.y);
      if (d < minDist) { minDist = d; nearest = n; }
    }
    setNodes(prev => [...prev, newNode]);
    setEdges(prev => [...prev, [newNode.id, nearest.id]]);
    setLog(prev => [`+ Node ${newNode.label} joined at ${newNode.coord}`, ...prev].slice(0, 20));
  }, [nodes]);

  const removeNode = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id);
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(([a, b]) => a !== id && b !== id));
    setPackets(prev => prev.filter(p => p.from !== id && p.to !== id));
    if (selected?.id === id) setSelected(null);
    if (node) setLog(prev => [`- Node ${node.label} removed`, ...prev].slice(0, 20));
  }, [nodes, selected]);

  return (
    <div className="h-full flex bg-background text-xs font-mono">
      {/* Graph */}
      <div className="flex-1 relative p-2">
        <svg
          ref={svgRef}
          viewBox="0 0 200 200"
          className="w-full h-full"
          onMouseMove={handleSvgMouseMove}
          onMouseUp={() => setDragging(null)}
          onMouseLeave={() => setDragging(null)}
        >
          {/* Edges */}
          {edges.map(([a, b], i) => {
            const na = getNode(a), nb = getNode(b);
            if (!na || !nb) return null;
            return (
              <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke="hsl(var(--border))" strokeWidth={0.5} />
            );
          })}

          {/* Packets */}
          {packets.map(p => {
            const from = getNode(p.from), to = getNode(p.to);
            if (!from || !to) return null;
            const x = from.x + (to.x - from.x) * p.progress;
            const y = from.y + (to.y - from.y) * p.progress;
            return (
              <circle key={p.id} cx={x} cy={y} r={2} fill="hsl(var(--primary))" opacity={0.8}>
                <animate attributeName="opacity" values="0.4;1;0.4" dur="0.5s" repeatCount="indefinite" />
              </circle>
            );
          })}

          {/* Nodes */}
          {nodes.map(n => (
            <g key={n.id}
              onClick={() => setSelected(n)}
              onMouseDown={e => { e.stopPropagation(); setDragging(n.id); }}
              className="cursor-grab active:cursor-grabbing"
            >
              <circle cx={n.x} cy={n.y} r={8} fill="hsl(var(--card))" stroke="hsl(var(--primary))"
                strokeWidth={selected?.id === n.id ? 1.5 : 0.5} opacity={0.9} />
              <circle cx={n.x} cy={n.y} r={3} fill="hsl(var(--primary))" opacity={n.load}>
                <animate attributeName="r" values="2;4;2" dur={`${2 + n.load}s`} repeatCount="indefinite" />
              </circle>
              <text x={n.x} y={n.y - 12} textAnchor="middle" fontSize="5"
                fill="hsl(var(--muted-foreground))">{n.label}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Side panel */}
      <div className="w-48 border-l border-border p-2 overflow-y-auto space-y-3 flex flex-col">
        <div className="font-display text-[10px] tracking-wider text-primary uppercase">
          PrimeNet Stats
        </div>

        <div className="space-y-2">
          <StatRow label="Routing" value="O(1) geodesic" />
          <StatRow label="Nodes" value={`${nodes.length} active`} />
          <StatRow label="Latency" value={`${stats.latency}ms`} />
          <StatRow label="Packets" value={stats.throughput.toString()} />
          <StatRow label="Decisions" value={stats.decisions.toString()} />
        </div>

        {/* Controls */}
        <div className="flex gap-1">
          <button
            onClick={() => setPaused(!paused)}
            className={`flex-1 px-2 py-1 rounded border text-[9px] font-display tracking-wider transition-all ${
              paused ? 'border-prime-amber/30 text-prime-amber hover:bg-prime-amber/10' : 'border-primary/30 text-primary hover:bg-primary/10'
            }`}
          >
            {paused ? 'RESUME' : 'PAUSE'}
          </button>
          <button
            onClick={addNode}
            className="flex-1 px-2 py-1 rounded border border-prime-green/30 text-prime-green text-[9px] font-display tracking-wider hover:bg-prime-green/10"
          >
            +NODE
          </button>
        </div>

        {selected && (
          <div className="border-t border-border pt-2 space-y-1">
            <div className="text-[10px] text-primary font-display">{selected.label}</div>
            <StatRow label="Coord" value={selected.coord} />
            <StatRow label="Load" value={`${(selected.load * 100).toFixed(0)}%`} />
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${selected.load * 100}%` }} />
            </div>
            {nodes.length > 3 && (
              <button
                onClick={() => removeNode(selected.id)}
                className="w-full mt-1 px-2 py-1 rounded border border-destructive/30 text-destructive/70 text-[9px] hover:text-destructive hover:bg-destructive/5"
              >
                Remove Node
              </button>
            )}
          </div>
        )}

        {/* Event log */}
        {log.length > 0 && (
          <div className="border-t border-border pt-2 flex-1 min-h-0 overflow-y-auto">
            <div className="text-[9px] font-display tracking-wider text-muted-foreground uppercase mb-1">Event Log</div>
            {log.map((entry, i) => (
              <div key={i} className={`text-[9px] leading-relaxed ${entry.startsWith('+') ? 'text-prime-green' : 'text-destructive/70'}`}>
                {entry}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-prime-cyan">{value}</span>
    </div>
  );
}
