import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Star, Code2, Plus, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

interface Tab {
  id: string;
  url: string;
  history: string[];
  historyIndex: number;
}

const BOOKMARKS = [
  { label: 'Home', url: 'prime://home' },
  { label: 'Docs', url: 'prime://docs' },
  { label: 'Net Status', url: 'prime://net-status' },
  { label: 'Q3 Lab', url: 'prime://q3-lab' },
  { label: 'Energy Grid', url: 'prime://energy-grid' },
];

function createTab(url = 'prime://home'): Tab {
  return { id: `tab-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, url, history: [url], historyIndex: 0 };
}

// ─── Page Components ───

function HomePage() {
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

function DocsPage() {
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

function NetStatusPage() {
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

function Q3LabPage() {
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

function EnergyGridPage() {
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

function NotFoundPage({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 text-center">
      <p className="font-display text-4xl text-primary/30 mb-2">404</p>
      <p className="font-display text-xs tracking-wider text-muted-foreground mb-1">Coordinate not found in lattice</p>
      <p className="font-mono text-[10px] text-muted-foreground/50">No manifold mapped for: {url}</p>
    </div>
  );
}

function renderPage(url: string) {
  switch (url) {
    case 'prime://home': return <HomePage />;
    case 'prime://docs': return <DocsPage />;
    case 'prime://net-status': return <NetStatusPage />;
    case 'prime://q3-lab': return <Q3LabPage />;
    case 'prime://energy-grid': return <EnergyGridPage />;
    default: return <NotFoundPage url={url} />;
  }
}

function pageSource(url: string) {
  const map: Record<string, string> = {
    'prime://home': `<prime-page lattice="P¹¹">\n  <header class="portal">\n    <title>PRIME OS Intranet</title>\n    <status cores="649" cop="3.2" />\n  </header>\n  <grid cols="2">\n    <metric label="Active Nodes" value="649" />\n    <metric label="Throughput" value="247 pkt/s" />\n    <metric label="Memory" value="11D→4D" />\n    <metric label="COP" value="3.21" />\n  </grid>\n</prime-page>`,
    'prime://docs': `<prime-docs version="2.0">\n  <section title="Qutrit Computing">\n    <fold:content encoding="adinkra" />\n  </section>\n  <section title="Geometric Routing">\n    <fold:content encoding="adinkra" />\n  </section>\n  <!-- 3 more sections -->\n</prime-docs>`,
    'prime://net-status': `<primenet-status>\n  <live-metrics interval="2000ms">\n    <packets per-second="dynamic" />\n    <latency unit="ms" />\n    <nodes count="6" />\n  </live-metrics>\n  <route-table protocol="geodesic" />\n</primenet-status>`,
    'prime://q3-lab': `<q3-lab interactive="true">\n  <qutrit-array size="5">\n    <qutrit state="|0⟩" onclick="cycle" />\n    <qutrit state="|1⟩" onclick="cycle" />\n    <!-- ... -->\n  </qutrit-array>\n  <superposition display="tensor-product" />\n</q3-lab>`,
    'prime://energy-grid': `<energy-grid mode="satellite">\n  <cop-display precision="2" live="true" />\n  <mode-list>\n    <mode name="Satellite" efficiency="92%" />\n    <mode name="Crystalline" efficiency="78%" />\n    <mode name="Vacuum" efficiency="85%" />\n  </mode-list>\n</energy-grid>`,
  };
  return map[url] || `<!-- 404: No source for ${url} -->`;
}

// ─── Main Browser Component ───

export default function PrimeBrowserApp() {
  const [tabs, setTabs] = useState<Tab[]>([createTab()]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [showSource, setShowSource] = useState(false);
  const [urlInput, setUrlInput] = useState('prime://home');

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];

  const navigate = useCallback((url: string) => {
    setLoading(true);
    setLoadProgress(0);
    setShowSource(false);
    const steps = [20, 50, 80, 100];
    steps.forEach((p, i) => setTimeout(() => setLoadProgress(p), (i + 1) * 150));
    setTimeout(() => {
      setTabs(prev => prev.map(t => {
        if (t.id !== activeTabId) return t;
        const newHistory = [...t.history.slice(0, t.historyIndex + 1), url];
        return { ...t, url, history: newHistory, historyIndex: newHistory.length - 1 };
      }));
      setUrlInput(url);
      setLoading(false);
    }, 700);
  }, [activeTabId]);

  const goBack = useCallback(() => {
    if (activeTab.historyIndex <= 0) return;
    const newIdx = activeTab.historyIndex - 1;
    const url = activeTab.history[newIdx];
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url, historyIndex: newIdx } : t));
    setUrlInput(url);
  }, [activeTab, activeTabId]);

  const goForward = useCallback(() => {
    if (activeTab.historyIndex >= activeTab.history.length - 1) return;
    const newIdx = activeTab.historyIndex + 1;
    const url = activeTab.history[newIdx];
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url, historyIndex: newIdx } : t));
    setUrlInput(url);
  }, [activeTab, activeTabId]);

  const addTab = () => {
    const t = createTab();
    setTabs(prev => [...prev, t]);
    setActiveTabId(t.id);
    setUrlInput('prime://home');
  };

  const closeTab = (id: string) => {
    if (tabs.length <= 1) return;
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (id === activeTabId) {
        setActiveTabId(next[0].id);
        setUrlInput(next[0].url);
      }
      return next;
    });
  };

  const switchTab = (id: string) => {
    setActiveTabId(id);
    const t = tabs.find(t => t.id === id);
    if (t) setUrlInput(t.url);
    setShowSource(false);
  };

  const titleForUrl = (url: string) => {
    const map: Record<string, string> = {
      'prime://home': 'Home', 'prime://docs': 'Docs', 'prime://net-status': 'Net Status',
      'prime://q3-lab': 'Q3 Lab', 'prime://energy-grid': 'Energy Grid',
    };
    return map[url] || url.replace('prime://', '');
  };

  return (
    <div className="flex flex-col h-full bg-background font-mono text-xs">
      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-1 pt-1 bg-card/50 border-b border-border overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <div
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded-t text-[10px] cursor-pointer max-w-32 group ${t.id === activeTabId ? 'bg-background border border-b-0 border-border text-foreground' : 'text-muted-foreground hover:bg-muted/30'}`}
          >
            <span className="truncate">{titleForUrl(t.url)}</span>
            {tabs.length > 1 && (
              <button onClick={e => { e.stopPropagation(); closeTab(t.id); }} className="opacity-0 group-hover:opacity-100 hover:text-destructive">
                <X size={10} />
              </button>
            )}
          </div>
        ))}
        <button onClick={addTab} className="p-1 text-muted-foreground hover:text-primary"><Plus size={12} /></button>
      </div>

      {/* Address bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-card/30">
        <button onClick={goBack} disabled={activeTab.historyIndex <= 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowLeft size={14} /></button>
        <button onClick={goForward} disabled={activeTab.historyIndex >= activeTab.history.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowRight size={14} /></button>
        <button onClick={() => navigate(activeTab.url)} className="p-1 text-muted-foreground hover:text-foreground"><RotateCw size={14} /></button>
        <form onSubmit={e => { e.preventDefault(); navigate(urlInput); }} className="flex-1 flex">
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            className="flex-1 bg-muted/30 border border-border rounded px-2 py-0.5 text-[11px] font-mono text-foreground focus:outline-none focus:border-primary/40"
          />
        </form>
        <button onClick={() => setShowSource(!showSource)} className={`p-1 transition-colors ${showSource ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}><Code2 size={14} /></button>
      </div>

      {/* Bookmarks */}
      <div className="flex items-center gap-1 px-2 py-0.5 border-b border-border/50 bg-card/20 overflow-x-auto scrollbar-none">
        <Star size={10} className="text-muted-foreground/40 shrink-0" />
        {BOOKMARKS.map(b => (
          <button key={b.url} onClick={() => navigate(b.url)} className="text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/5 whitespace-nowrap transition-colors">
            {b.label}
          </button>
        ))}
      </div>

      {/* Loading bar */}
      {loading && (
        <div className="px-2 py-1 bg-card/20">
          <Progress value={loadProgress} className="h-1" />
          <p className="text-[8px] text-muted-foreground/60 mt-0.5">Resolving geometric route...</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {showSource ? (
          <pre className="p-4 font-mono text-[10px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {pageSource(activeTab.url)}
          </pre>
        ) : (
          renderPage(activeTab.url)
        )}
      </div>
    </div>
  );
}
