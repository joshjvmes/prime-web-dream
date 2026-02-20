import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

type Category = 'all' | 'adinkra' | 'fractals' | 'lattice' | 'spirals';

interface ArtPiece {
  id: string;
  title: string;
  category: Exclude<Category, 'all'>;
  description: string;
  coord: string;
  seed: number;
}

const PIECES: Omit<ArtPiece, 'id' | 'seed'>[] = [
  { title: 'Adinkra Butterfly', category: 'adinkra', description: 'Supersymmetric graph encoding dimensional relationships', coord: '⟨2,3,5⟩' },
  { title: 'Sankofa Loop', category: 'adinkra', description: 'Time-reversal symmetry in prime lattice space', coord: '⟨7,11,13⟩' },
  { title: 'Gye Nyame Fold', category: 'adinkra', description: 'Supreme dimensional folding pattern', coord: '⟨17,19,23⟩' },
  { title: 'Koch Lattice', category: 'fractals', description: 'Self-similar prime coordinate fractal', coord: '⟨29,31,37⟩' },
  { title: 'Sierpinski Qutrit', category: 'fractals', description: 'Ternary subdivision in geometric space', coord: '⟨41,43,47⟩' },
  { title: 'Julia Fold', category: 'fractals', description: 'Complex manifold boundary visualization', coord: '⟨53,59,61⟩' },
  { title: 'P¹¹ Projection', category: 'lattice', description: '11D→2D lattice projection with prime nodes', coord: '⟨67,71,73⟩' },
  { title: 'Geodesic Web', category: 'lattice', description: 'Shortest-path network in prime space', coord: '⟨79,83,89⟩' },
  { title: 'Coordinate Grid', category: 'lattice', description: 'Prime number grid with harmonic overlays', coord: '⟨97,101,103⟩' },
  { title: 'Ulam Helix', category: 'spirals', description: 'Prime spiral in polar coordinates', coord: '⟨107,109,113⟩' },
  { title: 'Fibonacci Vortex', category: 'spirals', description: 'Golden ratio spiral with qutrit mapping', coord: '⟨127,131,137⟩' },
  { title: 'Archimedes Flow', category: 'spirals', description: 'Uniform spiral through prime lattice', coord: '⟨139,149,151⟩' },
];

// ─── SVG Generators ───

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function AdinkraSVG({ seed }: { seed: number }) {
  const r = seededRandom(seed);
  const nodes: [number, number][] = [];
  for (let i = 0; i < 8; i++) nodes.push([30 + r() * 140, 30 + r() * 140]);
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <rect width="200" height="200" fill="hsl(var(--background))" />
      {nodes.map((n, i) => nodes.slice(i + 1).filter(() => r() > 0.4).map((m, j) => (
        <line key={`${i}-${j}`} x1={n[0]} y1={n[1]} x2={m[0]} y2={m[1]} stroke="hsl(var(--primary))" strokeWidth="1" opacity={0.3 + r() * 0.4} />
      )))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n[0]} cy={n[1]} r={4 + r() * 4} fill={i % 2 === 0 ? 'hsl(var(--primary))' : 'none'} stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.8" />
        </g>
      ))}
    </svg>
  );
}

function FractalSVG({ seed }: { seed: number }) {
  const r = seededRandom(seed);
  const depth = 3 + Math.floor(r() * 2);
  const lines: { x1: number; y1: number; x2: number; y2: number; o: number }[] = [];
  function branch(x: number, y: number, angle: number, len: number, d: number) {
    if (d <= 0 || len < 3) return;
    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;
    lines.push({ x1: x, y1: y, x2, y2, o: 0.3 + (d / depth) * 0.5 });
    const spread = 0.4 + r() * 0.6;
    branch(x2, y2, angle - spread, len * (0.6 + r() * 0.15), d - 1);
    branch(x2, y2, angle + spread, len * (0.6 + r() * 0.15), d - 1);
    if (r() > 0.5) branch(x2, y2, angle, len * 0.5, d - 1);
  }
  branch(100, 180, -Math.PI / 2, 50 + r() * 20, depth);
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <rect width="200" height="200" fill="hsl(var(--background))" />
      {lines.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="hsl(var(--primary))" strokeWidth="1.2" opacity={l.o} />)}
    </svg>
  );
}

function LatticeSVG({ seed }: { seed: number }) {
  const r = seededRandom(seed);
  const pts: [number, number][] = [];
  for (let i = 0; i < 16; i++) pts.push([20 + r() * 160, 20 + r() * 160]);
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <rect width="200" height="200" fill="hsl(var(--background))" />
      {pts.map((p, i) => {
        const nearest = pts.filter((_, j) => j !== i).sort((a, b) => Math.hypot(a[0]-p[0],a[1]-p[1]) - Math.hypot(b[0]-p[0],b[1]-p[1])).slice(0, 3);
        return nearest.map((n, j) => <line key={`${i}-${j}`} x1={p[0]} y1={p[1]} x2={n[0]} y2={n[1]} stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.25" />);
      })}
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={2.5 + r() * 2} fill="hsl(var(--primary))" opacity={0.5 + r() * 0.4} />)}
    </svg>
  );
}

function SpiralSVG({ seed }: { seed: number }) {
  const r = seededRandom(seed);
  const turns = 3 + r() * 3;
  const pts: string[] = [];
  for (let i = 0; i <= 200; i++) {
    const t = (i / 200) * turns * Math.PI * 2;
    const rad = 5 + (i / 200) * 85;
    pts.push(`${100 + Math.cos(t) * rad},${100 + Math.sin(t) * rad}`);
  }
  // dots on primes
  const primes = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47];
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <rect width="200" height="200" fill="hsl(var(--background))" />
      <polyline points={pts.join(' ')} fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.4" />
      {primes.map(p => {
        const t = (p / 50) * turns * Math.PI * 2;
        const rad = 5 + (p / 50) * 85;
        return <circle key={p} cx={100 + Math.cos(t) * rad} cy={100 + Math.sin(t) * rad} r={3} fill="hsl(var(--primary))" opacity="0.7" />;
      })}
    </svg>
  );
}

function ArtSVG({ category, seed }: { category: string; seed: number }) {
  switch (category) {
    case 'adinkra': return <AdinkraSVG seed={seed} />;
    case 'fractals': return <FractalSVG seed={seed} />;
    case 'lattice': return <LatticeSVG seed={seed} />;
    case 'spirals': return <SpiralSVG seed={seed} />;
    default: return <LatticeSVG seed={seed} />;
  }
}

export default function PrimeGalleryApp() {
  const [category, setCategory] = useState<Category>('all');
  const [selected, setSelected] = useState<ArtPiece | null>(null);

  const pieces = useMemo(() =>
    PIECES.map((p, i) => ({ ...p, id: `art-${i}`, seed: Date.now() + i * 7919 })),
    []
  );

  const filtered = category === 'all' ? pieces : pieces.filter(p => p.category === category);

  const categories: { key: Category; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'adinkra', label: 'Adinkra' },
    { key: 'fractals', label: 'Fractals' },
    { key: 'lattice', label: 'Lattice Maps' },
    { key: 'spirals', label: 'Prime Spirals' },
  ];

  return (
    <div className="flex h-full bg-background font-mono text-xs">
      {/* Sidebar */}
      <div className="w-28 border-r border-border bg-card/20 p-2 flex flex-col gap-0.5">
        <p className="font-display text-[8px] tracking-wider text-primary mb-1 px-1">CATEGORIES</p>
        {categories.map(c => (
          <button
            key={c.key}
            onClick={() => { setCategory(c.key); setSelected(null); }}
            className={`text-left px-2 py-1 rounded text-[10px] transition-colors ${category === c.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          /* Full viewer */
          <div className="flex-1 flex flex-col p-4 overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-sm tracking-wider text-primary">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <div className="flex-1 flex items-center justify-center border border-border rounded bg-card/20 mb-3 max-h-[300px]">
              <div className="w-full max-w-[300px] aspect-square">
                <ArtSVG category={selected.category} seed={selected.seed} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">{selected.description}</p>
              <p className="text-[9px] text-muted-foreground/60">Category: {selected.category} • Coordinate: {selected.coord}</p>
              <p className="text-[9px] text-muted-foreground/60">Seed: {selected.seed} • Generated procedurally</p>
            </div>
          </div>
        ) : (
          /* Gallery grid */
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-3 gap-2 p-3">
              {filtered.map(piece => (
                <button
                  key={piece.id}
                  onClick={() => setSelected(piece)}
                  className="flex flex-col border border-border rounded overflow-hidden hover:border-primary/40 transition-colors bg-card/20 group"
                >
                  <div className="aspect-square">
                    <ArtSVG category={piece.category} seed={piece.seed} />
                  </div>
                  <div className="px-2 py-1.5 border-t border-border/50">
                    <p className="text-[9px] text-foreground group-hover:text-primary transition-colors truncate">{piece.title}</p>
                    <p className="text-[7px] text-muted-foreground/60">{piece.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
