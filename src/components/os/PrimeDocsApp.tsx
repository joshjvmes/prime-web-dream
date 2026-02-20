import { useState } from 'react';
import { BookOpen, ZoomIn, ZoomOut, Printer, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DocSection {
  type: 'heading' | 'paragraph' | 'code' | 'table';
  content: string;
  rows?: string[][];
}

interface Doc {
  id: string;
  title: string;
  author: string;
  date: string;
  sections: DocSection[];
}

const DOCS: Doc[] = [
  {
    id: 'manifold-report', title: 'Manifold Status Report', author: 'QK Scheduler', date: '2026-02-19',
    sections: [
      { type: 'heading', content: 'Lattice Manifold Overview' },
      { type: 'paragraph', content: 'The primary 11D lattice manifold is operating within nominal parameters. All 649 qutrit cores report stable ternary states across the Fibonacci Waltz scheduling cycle #4,096.' },
      { type: 'code', content: 'manifold.status();\n// → { dimensions: 11, folded: 4, cores: 649, cop: 3.2 }\n// Adinkra encoding: ACTIVE\n// Compression ratio: 75%' },
      { type: 'paragraph', content: 'Geodesic routing latency has decreased by 12% following the latest prime coordinate rebalance. No topological anomalies detected in sectors Σ-7 through Σ-42.' },
      { type: 'table', content: 'Metrics', rows: [['Metric', 'Value', 'Status'], ['Cores Online', '649/649', '✓'], ['Fold Ratio', '11D → 4D', '✓'], ['COP', '3.21', '▲'], ['Fragmentation', '0.0%', '✓']] },
    ]
  },
  {
    id: 'fold-spec', title: 'Fold Operation Specification', author: 'GeomC Team', date: '2026-02-15',
    sections: [
      { type: 'heading', content: 'Geometric Folding Protocol v2.0' },
      { type: 'paragraph', content: 'The fold operation compresses higher-dimensional data into a lower-dimensional manifold while preserving topological invariants. This document specifies the Adinkra-encoded folding procedure used by the GeomC compiler.' },
      { type: 'code', content: 'fold :: Manifold(11D) → Manifold(4D)\nfold M = project(adinkra_encode(M))\n\n-- Preserves:\n--   • Euler characteristic\n--   • Betti numbers β₀..β₃\n--   • Prime coordinate mappings' },
      { type: 'paragraph', content: 'The fold operator guarantees O(1) retrieval via geometric lookup. Any 4D slice contains the full holographic information of the original 11D manifold, enabling redundant storage across lattice regions.' },
    ]
  },
  {
    id: 'energy-doc', title: 'Over-Unity Energy Harvesting', author: 'Energy Subsystem', date: '2026-02-10',
    sections: [
      { type: 'heading', content: 'COP > 1: Dimensional Coupling' },
      { type: 'paragraph', content: 'PRIME OS achieves over-unity energy harvesting by coupling to higher-dimensional energy gradients through the 11D lattice manifold. The Coefficient of Performance (COP) consistently exceeds 3.0 in satellite mode.' },
      { type: 'table', content: 'Energy Modes', rows: [['Mode', 'Input', 'Output', 'COP'], ['Satellite', '100W', '320W', '3.20'], ['Ground', '100W', '280W', '2.80'], ['Ambient', '100W', '250W', '2.50'], ['Burst', '100W', '410W', '4.10']] },
      { type: 'code', content: 'energy.harvest({ mode: "satellite" });\n// Coupling: 11D dimensional gradient\n// Exceeds Carnot limit (42%) at 92% geometric efficiency' },
    ]
  },
  {
    id: 'primenet-guide', title: 'PrimeNet Routing Guide', author: 'Network Division', date: '2026-02-08',
    sections: [
      { type: 'heading', content: 'O(1) Geodesic Routing' },
      { type: 'paragraph', content: 'PrimeNet uses prime coordinate addressing to achieve O(1) routing decisions. Each node is assigned a unique coordinate in the prime lattice, and the shortest path between any two nodes is computed as a geodesic through the lattice topology.' },
      { type: 'paragraph', content: 'Unlike traditional routing protocols (Dijkstra: O(V log V), Bellman-Ford: O(VE)), PrimeNet computes routes in constant time by exploiting the geometric structure of the prime number distribution.' },
      { type: 'code', content: 'route = primenet.geodesic(src="⟨2,3,5⟩", dst="⟨71,73,79⟩")\n// Hops: 3\n// Latency: 0.3ms\n// Decision time: O(1)' },
    ]
  },
];

export default function PrimeDocsApp() {
  const [selectedDoc, setSelectedDoc] = useState(DOCS[0]);
  const [zoom, setZoom] = useState(100);
  const [searchText, setSearchText] = useState('');

  return (
    <div className="flex h-full bg-background font-mono text-xs">
      {/* Sidebar */}
      <div className="w-48 border-r border-border flex flex-col">
        <div className="p-2 border-b border-border flex items-center gap-1.5">
          <BookOpen size={12} className="text-primary" />
          <span className="font-display text-[9px] tracking-wider uppercase text-primary">Documents</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1">
            {DOCS.map(doc => (
              <button
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full text-left px-2 py-1.5 rounded text-[10px] transition-colors ${selectedDoc.id === doc.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
              >
                <div className="font-medium truncate">{doc.title}</div>
                <div className="text-[8px] text-muted-foreground/60 mt-0.5">{doc.author} • {doc.date}</div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-8 border-b border-border flex items-center px-3 gap-2">
          <div className="flex items-center gap-1 border border-border rounded px-1.5 py-0.5">
            <Search size={10} className="text-muted-foreground" />
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search..."
              className="bg-transparent text-[10px] w-24 outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(60, z - 10))} className="p-0.5 rounded hover:bg-muted"><ZoomOut size={12} /></button>
            <span className="text-[9px] text-muted-foreground w-8 text-center">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(150, z + 10))} className="p-0.5 rounded hover:bg-muted"><ZoomIn size={12} /></button>
            <button className="p-0.5 rounded hover:bg-muted ml-2" title="Print"><Printer size={12} /></button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-2xl mx-auto" style={{ fontSize: `${zoom}%` }}>
            <h1 className="font-display text-lg tracking-wide text-foreground mb-1">{selectedDoc.title}</h1>
            <p className="text-[10px] text-muted-foreground mb-4">{selectedDoc.author} — {selectedDoc.date}</p>
            {selectedDoc.sections.map((s, i) => {
              const highlight = searchText && s.content.toLowerCase().includes(searchText.toLowerCase());
              switch (s.type) {
                case 'heading':
                  return <h2 key={i} className={`font-display text-sm tracking-wider text-primary mt-4 mb-2 ${highlight ? 'bg-primary/10 rounded px-1' : ''}`}>{s.content}</h2>;
                case 'paragraph':
                  return <p key={i} className={`text-muted-foreground leading-relaxed mb-3 ${highlight ? 'bg-primary/10 rounded px-1' : ''}`}>{s.content}</p>;
                case 'code':
                  return (
                    <pre key={i} className={`bg-card border border-border rounded p-3 mb-3 text-[10px] leading-relaxed overflow-x-auto ${highlight ? 'ring-1 ring-primary/40' : ''}`}>
                      <code className="text-primary/80">{s.content}</code>
                    </pre>
                  );
                case 'table':
                  return (
                    <div key={i} className="border border-border rounded mb-3 overflow-hidden">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="bg-muted/30">
                            {s.rows?.[0]?.map((h, j) => <th key={j} className="text-left px-2 py-1 border-b border-border font-display text-primary">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {s.rows?.slice(1).map((row, ri) => (
                            <tr key={ri} className="hover:bg-muted/20">
                              {row.map((cell, ci) => <td key={ci} className="px-2 py-1 border-b border-border/50 text-muted-foreground">{cell}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                default: return null;
              }
            })}
          </div>
        </ScrollArea>

        {/* Status bar */}
        <div className="h-5 border-t border-border flex items-center px-3 text-[9px] text-muted-foreground/60">
          <span>{selectedDoc.sections.length} sections</span>
          <span className="ml-auto">Zoom: {zoom}%</span>
        </div>
      </div>
    </div>
  );
}
