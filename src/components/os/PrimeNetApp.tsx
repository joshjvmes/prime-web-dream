import { useState, useEffect, useRef } from 'react';
import { NetworkNode } from '@/types/os';

const NODES: NetworkNode[] = [
  { id: 'n1', label: 'Hub-α', x: 100, y: 40, coord: '⟨2,3,5,...⟩', load: 0.72 },
  { id: 'n2', label: 'Hub-β', x: 50, y: 100, coord: '⟨7,11,13,...⟩', load: 0.45 },
  { id: 'n3', label: 'Hub-γ', x: 150, y: 100, coord: '⟨17,19,23,...⟩', load: 0.88 },
  { id: 'n4', label: 'Node-δ', x: 30, y: 160, coord: '⟨29,31,37,...⟩', load: 0.31 },
  { id: 'n5', label: 'Node-ε', x: 100, y: 170, coord: '⟨41,43,47,...⟩', load: 0.56 },
  { id: 'n6', label: 'Node-ζ', x: 170, y: 160, coord: '⟨53,59,61,...⟩', load: 0.67 },
];

const EDGES = [
  ['n1','n2'], ['n1','n3'], ['n2','n3'], ['n2','n4'], ['n2','n5'], ['n3','n5'], ['n3','n6'], ['n5','n6'], ['n4','n5'],
];

interface Packet { id: number; from: string; to: string; progress: number; }

export default function PrimeNetApp() {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [selected, setSelected] = useState<NetworkNode | null>(null);
  const [stats, setStats] = useState({ throughput: 0, decisions: 0 });
  const idRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const edge = EDGES[Math.floor(Math.random() * EDGES.length)];
      const rev = Math.random() > 0.5;
      setPackets(prev => [...prev, {
        id: idRef.current++,
        from: rev ? edge[1] : edge[0],
        to: rev ? edge[0] : edge[1],
        progress: 0,
      }]);
      setStats(s => ({ throughput: s.throughput + 1, decisions: s.decisions + 1 }));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const anim = setInterval(() => {
      setPackets(prev => prev
        .map(p => ({ ...p, progress: p.progress + 0.05 }))
        .filter(p => p.progress <= 1)
      );
    }, 50);
    return () => clearInterval(anim);
  }, []);

  const getNode = (id: string) => NODES.find(n => n.id === id)!;

  return (
    <div className="h-full flex bg-background text-xs font-mono">
      {/* Graph */}
      <div className="flex-1 relative p-2">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {/* Edges */}
          {EDGES.map(([a, b], i) => {
            const na = getNode(a), nb = getNode(b);
            return (
              <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke="hsl(var(--border))" strokeWidth={0.5} />
            );
          })}

          {/* Packets */}
          {packets.map(p => {
            const from = getNode(p.from), to = getNode(p.to);
            const x = from.x + (to.x - from.x) * p.progress;
            const y = from.y + (to.y - from.y) * p.progress;
            return (
              <circle key={p.id} cx={x} cy={y} r={2} fill="hsl(var(--primary))" opacity={0.8}>
                <animate attributeName="opacity" values="0.4;1;0.4" dur="0.5s" repeatCount="indefinite" />
              </circle>
            );
          })}

          {/* Nodes */}
          {NODES.map(n => (
            <g key={n.id} onClick={() => setSelected(n)} className="cursor-pointer">
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
      <div className="w-44 border-l border-border p-2 overflow-y-auto space-y-3">
        <div className="font-display text-[10px] tracking-wider text-primary uppercase">
          PrimeNet Stats
        </div>

        <div className="space-y-2">
          <StatRow label="Routing" value="O(1) geodesic" />
          <StatRow label="Decision ↓" value="99%" />
          <StatRow label="Speedup" value="3.4× vs Dijkstra" />
          <StatRow label="Packets" value={stats.throughput.toString()} />
          <StatRow label="Decisions" value={stats.decisions.toString()} />
        </div>

        {selected && (
          <div className="border-t border-border pt-2 space-y-1">
            <div className="text-[10px] text-primary font-display">{selected.label}</div>
            <StatRow label="Coord" value={selected.coord} />
            <StatRow label="Load" value={`${(selected.load * 100).toFixed(0)}%`} />
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary/60 rounded-full" style={{ width: `${selected.load * 100}%` }} />
            </div>
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
