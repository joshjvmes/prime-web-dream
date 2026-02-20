import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { BookOpen, ZoomIn, ZoomOut, Search, Plus, Trash2, Download, Copy, Edit3, Eye } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCloudStorage } from '@/hooks/useCloudStorage';

interface Doc {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

const SAMPLE_DOCS: Doc[] = [
  {
    id: 'manifold-report', title: 'Manifold Status Report', author: 'QK Scheduler', createdAt: '2026-02-19', updatedAt: '2026-02-19',
    content: `# Lattice Manifold Overview

The primary 11D lattice manifold is operating within nominal parameters. All 649 qutrit cores report stable ternary states across the Fibonacci Waltz scheduling cycle #4,096.

\`\`\`
manifold.status();
// → { dimensions: 11, folded: 4, cores: 649, cop: 3.2 }
// Adinkra encoding: ACTIVE
\`\`\`

## Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Cores Online | 649/649 | ✓ |
| Fold Ratio | 11D → 4D | ✓ |
| COP | 3.21 | ▲ |

Geodesic routing latency has decreased by **12%** following the latest prime coordinate rebalance.`,
  },
  {
    id: 'fold-spec', title: 'Fold Operation Specification', author: 'GeomC Team', createdAt: '2026-02-15', updatedAt: '2026-02-15',
    content: `# Geometric Folding Protocol v2.0

The fold operation compresses higher-dimensional data into a lower-dimensional manifold while preserving topological invariants.

\`\`\`
fold :: Manifold(11D) → Manifold(4D)
fold M = project(adinkra_encode(M))

-- Preserves:
--   • Euler characteristic
--   • Betti numbers β₀..β₃
--   • Prime coordinate mappings
\`\`\`

The fold operator guarantees **O(1) retrieval** via geometric lookup. Any 4D slice contains the full holographic information of the original 11D manifold.`,
  },
  {
    id: 'energy-doc', title: 'Over-Unity Energy Harvesting', author: 'Energy Subsystem', createdAt: '2026-02-10', updatedAt: '2026-02-10',
    content: `# COP > 1: Dimensional Coupling

PRIME OS achieves over-unity energy harvesting by coupling to higher-dimensional energy gradients through the 11D lattice manifold.

| Mode | Input | Output | COP |
|------|-------|--------|-----|
| Satellite | 100W | 320W | 3.20 |
| Ground | 100W | 280W | 2.80 |
| Burst | 100W | 410W | 4.10 |`,
  },
];

// --- Lightweight markdown renderer ---
function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
      i++; // skip closing ```
      elements.push(
        <pre key={`code-${i}`} className="bg-card border border-border rounded p-3 mb-3 text-[10px] leading-relaxed overflow-x-auto">
          <code className="text-primary/80">{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Table
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        const row = lines[i].split('|').map(c => c.trim()).filter(Boolean);
        // skip separator rows like |---|---|
        if (!row.every(c => /^[-:]+$/.test(c))) tableRows.push(row);
        i++;
      }
      if (tableRows.length > 0) {
        elements.push(
          <div key={`tbl-${i}`} className="border border-border rounded mb-3 overflow-hidden">
            <table className="w-full text-[10px]">
              <thead><tr className="bg-muted/30">
                {tableRows[0].map((h, j) => <th key={j} className="text-left px-2 py-1 border-b border-border font-display text-primary">{h}</th>)}
              </tr></thead>
              <tbody>
                {tableRows.slice(1).map((row, ri) => (
                  <tr key={ri} className="hover:bg-muted/20">
                    {row.map((cell, ci) => <td key={ci} className="px-2 py-1 border-b border-border/50 text-muted-foreground">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Headings
    if (line.startsWith('### ')) { elements.push(<h3 key={`h3-${i}`} className="font-display text-xs tracking-wider text-primary mt-3 mb-1.5">{line.slice(4)}</h3>); i++; continue; }
    if (line.startsWith('## ')) { elements.push(<h2 key={`h2-${i}`} className="font-display text-sm tracking-wider text-primary mt-4 mb-2">{line.slice(3)}</h2>); i++; continue; }
    if (line.startsWith('# ')) { elements.push(<h1 key={`h1-${i}`} className="font-display text-lg tracking-wide text-foreground mb-1">{line.slice(2)}</h1>); i++; continue; }

    // Empty line
    if (!line.trim()) { i++; continue; }

    // Inline formatting for paragraph
    const formatted = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-muted px-1 rounded text-primary/80">$1</code>');
    elements.push(<p key={`p-${i}`} className="text-muted-foreground leading-relaxed mb-3" dangerouslySetInnerHTML={{ __html: formatted }} />);
    i++;
  }
  return elements;
}

export default function PrimeDocsApp() {
  const { save, load } = useCloudStorage();
  const [docs, setDocs] = useState<Doc[]>(SAMPLE_DOCS);
  const [selectedId, setSelectedId] = useState(SAMPLE_DOCS[0].id);
  const [zoom, setZoom] = useState(100);
  const [searchText, setSearchText] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const selectedDoc = docs.find(d => d.id === selectedId) || docs[0];

  // Load from cloud
  useEffect(() => {
    load<Doc[]>('docs-library').then(saved => {
      if (saved && saved.length > 0) setDocs(saved);
      setLoaded(true);
    });
  }, [load]);

  const persist = useCallback((next: Doc[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save('docs-library', next), 600);
  }, [save]);

  const updateContent = useCallback((content: string) => {
    setDocs(prev => {
      const next = prev.map(d => d.id === selectedId ? { ...d, content, updatedAt: new Date().toISOString().slice(0, 10) } : d);
      persist(next);
      return next;
    });
  }, [selectedId, persist]);

  const createDoc = () => {
    const doc: Doc = { id: `doc-${Date.now()}`, title: 'Untitled', content: '# New Document\n\nStart writing here...', author: 'User', createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10) };
    const next = [...docs, doc];
    setDocs(next);
    setSelectedId(doc.id);
    setEditMode(true);
    persist(next);
  };

  const deleteDoc = () => {
    if (docs.length <= 1) return;
    const next = docs.filter(d => d.id !== selectedId);
    setDocs(next);
    setSelectedId(next[0].id);
    persist(next);
  };

  const renameDoc = (title: string) => {
    setDocs(prev => {
      const next = prev.map(d => d.id === selectedId ? { ...d, title } : d);
      persist(next);
      return next;
    });
  };

  const exportMd = () => {
    const blob = new Blob([selectedDoc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${selectedDoc.title}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(selectedDoc.content);
  };

  const filteredDocs = useMemo(() => {
    if (!searchText) return docs;
    const q = searchText.toLowerCase();
    return docs.filter(d => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
  }, [docs, searchText]);

  if (!loaded) return <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">Loading…</div>;

  return (
    <div className="flex h-full bg-background font-mono text-xs">
      {/* Sidebar */}
      <div className="w-48 border-r border-border flex flex-col">
        <div className="p-2 border-b border-border flex items-center gap-1.5">
          <BookOpen size={12} className="text-primary" />
          <span className="font-display text-[9px] tracking-wider uppercase text-primary">Documents</span>
          <button onClick={createDoc} className="ml-auto p-0.5 rounded hover:bg-muted text-muted-foreground" title="New Document"><Plus size={12} /></button>
        </div>
        <div className="p-1.5 border-b border-border">
          <div className="flex items-center gap-1 border border-border rounded px-1.5 py-0.5">
            <Search size={10} className="text-muted-foreground" />
            <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search..." className="bg-transparent text-[10px] w-full outline-none placeholder:text-muted-foreground/50" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1">
            {filteredDocs.map(doc => (
              <button
                key={doc.id}
                onClick={() => setSelectedId(doc.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-[10px] transition-colors ${selectedId === doc.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
              >
                <div className="font-medium truncate">{doc.title}</div>
                <div className="text-[8px] text-muted-foreground/60 mt-0.5">{doc.author} • {doc.updatedAt}</div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-8 border-b border-border flex items-center px-3 gap-2">
          {/* Editable title */}
          <input
            value={selectedDoc.title}
            onChange={e => renameDoc(e.target.value)}
            className="bg-transparent text-[11px] font-display text-foreground outline-none max-w-[200px] border-b border-transparent focus:border-primary"
          />
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setEditMode(!editMode)} className={`p-1 rounded hover:bg-muted ${editMode ? 'text-primary' : 'text-muted-foreground'}`} title={editMode ? 'Preview' : 'Edit'}>
              {editMode ? <Eye size={12} /> : <Edit3 size={12} />}
            </button>
            <button onClick={copyToClipboard} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Copy Markdown"><Copy size={12} /></button>
            <button onClick={exportMd} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Export .md"><Download size={12} /></button>
            <button onClick={deleteDoc} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Delete"><Trash2 size={12} /></button>
            <div className="w-px h-4 bg-border mx-1" />
            <button onClick={() => setZoom(z => Math.max(60, z - 10))} className="p-0.5 rounded hover:bg-muted text-muted-foreground"><ZoomOut size={12} /></button>
            <span className="text-[9px] text-muted-foreground w-8 text-center">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(150, z + 10))} className="p-0.5 rounded hover:bg-muted text-muted-foreground"><ZoomIn size={12} /></button>
          </div>
        </div>

        {/* Content area — edit or preview */}
        {editMode ? (
          <div className="flex flex-1 min-h-0">
            {/* Editor pane */}
            <div className="flex-1 border-r border-border flex flex-col">
              <div className="px-2 py-1 border-b border-border text-[9px] text-muted-foreground/60 uppercase tracking-wider">Markdown</div>
              <textarea
                ref={editorRef}
                value={selectedDoc.content}
                onChange={e => updateContent(e.target.value)}
                spellCheck={false}
                className="flex-1 p-4 bg-transparent text-[11px] font-mono text-foreground resize-none outline-none leading-relaxed"
                style={{ fontSize: `${zoom}%` }}
              />
            </div>
            {/* Preview pane */}
            <div className="flex-1 flex flex-col">
              <div className="px-2 py-1 border-b border-border text-[9px] text-muted-foreground/60 uppercase tracking-wider">Preview</div>
              <ScrollArea className="flex-1">
                <div className="p-6 max-w-2xl" style={{ fontSize: `${zoom}%` }}>
                  {renderMarkdown(selectedDoc.content)}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 max-w-2xl mx-auto" style={{ fontSize: `${zoom}%` }}>
              {renderMarkdown(selectedDoc.content)}
            </div>
          </ScrollArea>
        )}

        {/* Status bar */}
        <div className="h-5 border-t border-border flex items-center px-3 text-[9px] text-muted-foreground/60">
          <span>{selectedDoc.content.split('\n').length} lines</span>
          <span className="ml-2">{selectedDoc.content.length} chars</span>
          <span className="ml-auto">{editMode ? 'Editing' : 'Preview'} • Zoom: {zoom}%</span>
        </div>
      </div>
    </div>
  );
}
