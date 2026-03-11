import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { BookOpen, ZoomIn, ZoomOut, Search, Plus, Trash2, Download, Copy, Edit3, Eye, Globe, Image as ImageIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCloudStorage } from '@/hooks/useCloudStorage';
import { useIntranetPages } from '@/hooks/useIntranetPages';
import { renderMarkdown } from '@/lib/renderMarkdown';
import { supabase } from '@/integrations/supabase/client';
import { eventBus } from '@/hooks/useEventBus';

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

export default function PrimeDocsApp() {
  const { save, load } = useCloudStorage();
  const { publishPage } = useIntranetPages();
  const [docs, setDocs] = useState<Doc[]>(SAMPLE_DOCS);
  const [selectedId, setSelectedId] = useState(SAMPLE_DOCS[0].id);
  const [zoom, setZoom] = useState(100);
  const [searchText, setSearchText] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [publishSlug, setPublishSlug] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedDoc = docs.find(d => d.id === selectedId) || docs[0];

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

  const copyToClipboard = () => { navigator.clipboard.writeText(selectedDoc.content); };

  const startPublish = () => {
    setPublishSlug(selectedDoc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    setShowPublish(true);
  };

  const doPublish = () => {
    if (!publishSlug.trim()) return;
    const slug = publishSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    publishPage({
      slug, title: selectedDoc.title, content: selectedDoc.content,
      author: selectedDoc.author, category: 'page',
      publishedAt: new Date().toISOString(),
    });
    setShowPublish(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { alert('Sign in to upload images'); return; }
      const path = `${session.user.id}/intranet/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('user-files').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('user-files').getPublicUrl(path);
      const img = `![${file.name}](${publicUrl})`;
      const ta = editorRef.current;
      if (ta) {
        const start = ta.selectionStart;
        const before = selectedDoc.content.slice(0, start);
        const after = selectedDoc.content.slice(ta.selectionEnd);
        updateContent(before + img + after);
      } else {
        updateContent(selectedDoc.content + '\n' + img);
      }
    } catch (err) {
      console.error('Image upload failed', err);
    }
    e.target.value = '';
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
          <input
            value={selectedDoc.title}
            onChange={e => renameDoc(e.target.value)}
            className="bg-transparent text-[11px] font-display text-foreground outline-none max-w-[200px] border-b border-transparent focus:border-primary"
          />
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setEditMode(!editMode)} className={`p-1 rounded hover:bg-muted ${editMode ? 'text-primary' : 'text-muted-foreground'}`} title={editMode ? 'Preview' : 'Edit'}>
              {editMode ? <Eye size={12} /> : <Edit3 size={12} />}
            </button>
            <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.svg,.webp" className="hidden" onChange={handleImageUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Insert Image"><ImageIcon size={12} /></button>
            <button onClick={startPublish} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Publish to Intranet"><Globe size={12} /></button>
            <button onClick={copyToClipboard} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Copy Markdown"><Copy size={12} /></button>
            <button onClick={exportMd} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Export .md"><Download size={12} /></button>
            <button onClick={deleteDoc} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Delete"><Trash2 size={12} /></button>
            <div className="w-px h-4 bg-border mx-1" />
            <button onClick={() => setZoom(z => Math.max(60, z - 10))} className="p-0.5 rounded hover:bg-muted text-muted-foreground"><ZoomOut size={12} /></button>
            <span className="text-[9px] text-muted-foreground w-8 text-center">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(150, z + 10))} className="p-0.5 rounded hover:bg-muted text-muted-foreground"><ZoomIn size={12} /></button>
          </div>
        </div>

        {/* Publish bar */}
        {showPublish && (
          <div className="px-3 py-2 border-b border-primary/30 bg-primary/5 flex items-center gap-2">
            <span className="text-[9px] text-primary">Publish as:</span>
            <span className="text-[9px] text-muted-foreground">httpsp://pages/</span>
            <input value={publishSlug} onChange={e => setPublishSlug(e.target.value)} className="bg-muted/30 border border-border rounded px-1.5 py-0.5 text-[10px] w-40 outline-none focus:border-primary" />
            <button onClick={doPublish} className="text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded hover:bg-primary/90">Publish</button>
            <button onClick={() => setShowPublish(false)} className="text-[9px] text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        )}

        {/* Content area */}
        {editMode ? (
          <div className="flex flex-1 min-h-0">
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
            <div className="flex-1 flex flex-col">
              <div className="px-2 py-1 border-b border-border text-[9px] text-muted-foreground/60 uppercase tracking-wider">Preview</div>
              <ScrollArea className="flex-1">
                <div className="p-6 max-w-2xl" style={{ fontSize: `${zoom}%` }}>{renderMarkdown(selectedDoc.content)}</div>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 max-w-2xl mx-auto" style={{ fontSize: `${zoom}%` }}>{renderMarkdown(selectedDoc.content)}</div>
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
