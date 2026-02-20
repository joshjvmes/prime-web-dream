import { useState, useEffect } from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

// ─── prime:// Internal OS Pages (moved from PrimeBrowserApp) ───

export function HomePage() {
  return (
    <div className="p-4 space-y-4">
      <div className="border border-primary/20 rounded p-4 bg-primary/5">
        <h1 className="font-display text-lg tracking-wider text-primary mb-1">Welcome to PRIME OS Intranet</h1>
        <p className="font-mono text-[10px] text-muted-foreground">Lattice P¹¹ • 649 qutrit cores online • COP 3.2</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Active Nodes', value: '649', sub: 'all online' },
          { label: 'Network Throughput', value: '247 pkt/s', sub: 'geodesic routing' },
          { label: 'Memory', value: '11D→4D', sub: 'Adinkra folded' },
          { label: 'Energy COP', value: '3.21', sub: 'over-unity' },
        ].map(s => (
          <div key={s.label} className="border border-border rounded p-2 bg-card/50">
            <p className="font-mono text-[9px] text-muted-foreground">{s.label}</p>
            <p className="font-display text-sm text-primary">{s.value}</p>
            <p className="font-mono text-[8px] text-muted-foreground/60">{s.sub}</p>
          </div>
        ))}
      </div>
      <div className="text-[9px] font-mono text-muted-foreground/50 pt-2 border-t border-border/30">
        prime://home — PRIME OS Intranet Portal v2.0
      </div>
    </div>
  );
}

export function DocsPage() {
  const sections = [
    { title: 'Qutrit Computing', content: 'PRIME OS uses ternary (qutrit) logic with three states: |0⟩ (Past), |1⟩ (Present), |2⟩ (Future). Each qutrit core processes information using the Fibonacci Waltz scheduling algorithm, enabling 3× information density per unit compared to binary systems.' },
    { title: 'Geometric Routing', content: 'PrimeNet uses O(1) geodesic routing through prime coordinate space. Each node is mapped to a unique prime tuple, and data flows along the shortest geometric path in 11-dimensional folded space, achieving 3.4× speedup over Dijkstra\'s algorithm.' },
    { title: 'FoldMem Architecture', content: 'Memory is organized as an 11-dimensional manifold folded into 4D via Adinkra encoding. This eliminates fragmentation (0% after compaction) and provides 12× faster allocation than malloc through geometric coordinate lookup.' },
    { title: 'Energy Harvesting', content: 'The over-unity energy system achieves COP > 3.0 by coupling to higher-dimensional energy gradients. Satellite mode harvests 320W output from 100W input through 11D dimensional coupling at 92% geometric efficiency.' },
    { title: 'Prime File System', content: 'AFS (Adinkra File System) uses semantic prime coordinates instead of hierarchical paths. Files are addressed by meaning, enabling O(1) content-addressable retrieval with automatic 75% Adinkra compression.' },
  ];
  return (
    <div className="p-4 space-y-2">
      <h1 className="font-display text-sm tracking-wider text-primary mb-3">PRIME OS Documentation</h1>
      {sections.map(s => (
        <Collapsible key={s.title}>
          <CollapsibleTrigger className="w-full text-left px-3 py-2 border border-border rounded hover:bg-primary/5 transition-colors font-mono text-xs text-foreground flex items-center gap-2">
            <span className="text-primary">▸</span> {s.title}
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 py-2 ml-4 border-l border-primary/20 mt-1">
            <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">{s.content}</p>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

export function NetStatusPage() {
  const [stats, setStats] = useState({ packets: 247, latency: 0.3, nodes: 6 });
  useEffect(() => {
    const id = setInterval(() => setStats({
      packets: 200 + Math.floor(Math.random() * 100),
      latency: +(0.2 + Math.random() * 0.2).toFixed(1),
      nodes: 6,
    }), 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="p-4 space-y-3">
      <h1 className="font-display text-sm tracking-wider text-primary">PrimeNet Status</h1>
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: 'Packets/s', v: stats.packets },
          { l: 'Latency', v: `${stats.latency}ms` },
          { l: 'Nodes', v: stats.nodes },
        ].map(s => (
          <div key={s.l} className="border border-border rounded p-2 text-center">
            <p className="font-mono text-[9px] text-muted-foreground">{s.l}</p>
            <p className="font-display text-lg text-primary">{s.v}</p>
          </div>
        ))}
      </div>
      <div className="border border-border rounded p-2">
        <p className="font-mono text-[9px] text-muted-foreground mb-1">Route Table</p>
        {['⟨2,3,5⟩ → ⟨7,11,13⟩ : 1 hop', '⟨17,19,23⟩ → ⟨29,31,37⟩ : 2 hops', '⟨41,43,47⟩ → ⟨53,59,61⟩ : 1 hop'].map(r => (
          <p key={r} className="font-mono text-[10px] text-foreground/70">{r}</p>
        ))}
      </div>
    </div>
  );
}

export function Q3LabPage() {
  const [qutrits, setQutrits] = useState([0, 1, 2, 1, 0]);
  const toggle = (i: number) => setQutrits(prev => prev.map((v, j) => j === i ? (v + 1) % 3 : v));
  const stateSymbol = (s: number) => s === 0 ? '◆' : s === 1 ? '◈' : '◇';
  const stateLabel = (s: number) => s === 0 ? 'Past' : s === 1 ? 'Present' : 'Future';
  return (
    <div className="p-4 space-y-3">
      <h1 className="font-display text-sm tracking-wider text-primary">Q3 Qutrit Laboratory</h1>
      <p className="font-mono text-[10px] text-muted-foreground">Click qutrits to cycle through states |0⟩→|1⟩→|2⟩</p>
      <div className="flex gap-3 justify-center py-4">
        {qutrits.map((q, i) => (
          <button key={i} onClick={() => toggle(i)} className="flex flex-col items-center gap-1 p-3 border border-border rounded hover:border-primary/40 transition-colors bg-card/50">
            <span className={`text-2xl ${q === 0 ? 'text-muted-foreground' : q === 1 ? 'text-primary' : 'text-prime-amber'}`}>{stateSymbol(q)}</span>
            <span className="font-mono text-[9px] text-muted-foreground">|{q}⟩</span>
            <span className="font-mono text-[8px] text-muted-foreground/60">{stateLabel(q)}</span>
          </button>
        ))}
      </div>
      <div className="border border-border rounded p-2">
        <p className="font-mono text-[9px] text-muted-foreground">Superposition: |ψ⟩ = {qutrits.map(q => `|${q}⟩`).join(' ⊗ ')}</p>
        <p className="font-mono text-[9px] text-muted-foreground">Coordinate: ⟨{qutrits.map((_, i) => [2,3,5,7,11][i]).join(',')}⟩</p>
      </div>
    </div>
  );
}

export function EnergyGridPage() {
  const [cop, setCop] = useState(3.21);
  useEffect(() => {
    const id = setInterval(() => setCop(3.0 + Math.random() * 0.4), 3000);
    return () => clearInterval(id);
  }, []);
  const modes = [
    { name: 'Satellite', eff: 92 },
    { name: 'Crystalline', eff: 78 },
    { name: 'Vacuum', eff: 85 },
  ];
  return (
    <div className="p-4 space-y-3">
      <h1 className="font-display text-sm tracking-wider text-primary">Energy Grid</h1>
      <div className="text-center py-3 border border-primary/20 rounded bg-primary/5">
        <p className="font-mono text-[9px] text-muted-foreground">Current COP</p>
        <p className="font-display text-3xl text-primary">{cop.toFixed(2)}</p>
        <p className="font-mono text-[9px] text-prime-green">OVER-UNITY ACTIVE</p>
      </div>
      <div className="space-y-1">
        {modes.map(m => (
          <div key={m.name} className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground w-20">{m.name}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary/60 rounded-full" style={{ width: `${m.eff}%` }} />
            </div>
            <span className="font-mono text-[9px] text-muted-foreground w-8">{m.eff}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotFoundPage({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 text-center">
      <p className="font-display text-4xl text-primary/30 mb-2">404</p>
      <p className="font-display text-xs tracking-wider text-muted-foreground mb-1">Coordinate not found in lattice</p>
      <p className="font-mono text-[10px] text-muted-foreground/50">No manifold mapped for: {url}</p>
    </div>
  );
}
