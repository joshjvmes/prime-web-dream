import { useState, useCallback, useEffect, useRef } from 'react';
import { BookOpen, Plus, Trash2, Eye, Edit3, Search, Globe, Tag, Image as ImageIcon, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCloudStorage } from '@/hooks/useCloudStorage';
import { useIntranetPages } from '@/hooks/useIntranetPages';
import { renderMarkdown } from '@/lib/renderMarkdown';
import { supabase } from '@/integrations/supabase/client';
import { eventBus } from '@/hooks/useEventBus';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  published: boolean;
  slug?: string;
  coverImage?: string;
}

export default function PrimeJournalApp() {
  const { save, load, isSignedIn } = useCloudStorage();
  const { publishPage } = useIntranetPages();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showPublish, setShowPublish] = useState(false);
  const [publishSlug, setPublishSlug] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = entries.find(e => e.id === selectedId) || null;

  useEffect(() => {
    load<JournalEntry[]>('journal-entries').then(saved => {
      if (saved && saved.length > 0) { setEntries(saved); setSelectedId(saved[0].id); }
      setLoaded(true);
    });
  }, [load]);

  const persist = useCallback((next: JournalEntry[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save('journal-entries', next), 600);
  }, [save]);

  const createEntry = () => {
    const entry: JournalEntry = {
      id: `j-${Date.now()}`, title: 'Untitled Entry',
      content: '# New Entry\n\nStart writing...', tags: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      published: false,
    };
    const next = [entry, ...entries];
    setEntries(next);
    setSelectedId(entry.id);
    setEditMode(true);
    persist(next);
  };

  const updateEntry = useCallback((field: keyof JournalEntry, value: unknown) => {
    setEntries(prev => {
      const next = prev.map(e => e.id === selectedId ? { ...e, [field]: value, updatedAt: new Date().toISOString() } : e);
      persist(next);
      return next;
    });
  }, [selectedId, persist]);

  const deleteEntry = () => {
    if (!selectedId) return;
    const next = entries.filter(e => e.id !== selectedId);
    setEntries(next);
    setSelectedId(next[0]?.id || null);
    persist(next);
  };

  const addTag = () => {
    if (!tagInput.trim() || !selected) return;
    const tags = [...selected.tags, tagInput.trim()];
    updateEntry('tags', tags);
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    if (!selected) return;
    updateEntry('tags', selected.tags.filter(t => t !== tag));
  };

  const doPublish = () => {
    if (!selected || !publishSlug.trim()) return;
    const slug = publishSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const userName = (() => { try { const p = localStorage.getItem('prime-os-profile'); if (p) return JSON.parse(p).name || 'Anonymous'; } catch {} return 'Anonymous'; })();
    publishPage({
      slug, title: selected.title, content: selected.content,
      author: userName, category: 'blog',
      coverImage: selected.coverImage,
      publishedAt: new Date().toISOString(),
    });
    updateEntry('published', true);
    updateEntry('slug', slug);
    setShowPublish(false);
  };

  const startPublish = () => {
    if (!selected) return;
    setPublishSlug(selected.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    setShowPublish(true);
  };

  const exportHTML = () => {
    if (!selected) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${selected.title}</title>
<style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:0 20px;color:#222;line-height:1.7}
h1{font-size:28px;margin-bottom:4px}
.meta{color:#888;font-size:13px;margin-bottom:24px;border-bottom:1px solid #eee;padding-bottom:12px}
.tags span{background:#f0f0f0;padding:2px 8px;border-radius:3px;font-size:12px;margin-right:4px}
img{max-width:100%;border-radius:4px;margin:12px 0}
pre{background:#f5f5f5;padding:12px;border-radius:4px;overflow-x:auto;font-size:13px}
code{background:#f5f5f5;padding:1px 4px;border-radius:2px;font-size:13px}
@media print{body{margin:0;max-width:100%}}</style></head><body>
<h1>${selected.title}</h1>
<div class="meta"><span>${new Date(selected.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</span>
${selected.tags.length > 0 ? `<div class="tags" style="margin-top:6px">${selected.tags.map(t => `<span>${t}</span>`).join('')}</div>` : ''}</div>
<div>${selected.content.replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>').replace(/\n/g, '<br>')}</div>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${selected.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
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
        const before = selected.content.slice(0, start);
        const after = selected.content.slice(ta.selectionEnd);
        updateEntry('content', before + img + after);
      } else {
        updateEntry('content', selected.content + '\n' + img);
      }
    } catch (err) {
      console.error('Image upload failed', err);
    }
    e.target.value = '';
  };

  const filtered = searchText
    ? entries.filter(e => e.title.toLowerCase().includes(searchText.toLowerCase()) || e.content.toLowerCase().includes(searchText.toLowerCase()))
    : entries;

  if (!loaded) return <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">Loading…</div>;

  return (
    <div className="flex h-full bg-background font-mono text-xs">
      {/* Sidebar */}
      <div className="w-52 border-r border-border flex flex-col">
        <div className="p-2 border-b border-border flex items-center gap-1.5">
          <BookOpen size={12} className="text-primary" />
          <span className="font-display text-[9px] tracking-wider uppercase text-primary">Journal</span>
          <button onClick={createEntry} className="ml-auto p-0.5 rounded hover:bg-muted text-muted-foreground" title="New Entry"><Plus size={12} /></button>
        </div>
        <div className="p-1.5 border-b border-border">
          <div className="flex items-center gap-1 border border-border rounded px-1.5 py-0.5">
            <Search size={10} className="text-muted-foreground" />
            <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search..." className="bg-transparent text-[10px] w-full outline-none placeholder:text-muted-foreground/50" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1">
            {filtered.map(entry => (
              <button
                key={entry.id}
                onClick={() => setSelectedId(entry.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-[10px] transition-colors ${selectedId === entry.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
              >
                <div className="font-medium truncate flex items-center gap-1">
                  {entry.published && <Globe size={8} className="text-prime-green shrink-0" />}
                  {entry.title}
                </div>
                <div className="text-[8px] text-muted-foreground/60 mt-0.5">{new Date(entry.updatedAt).toLocaleDateString()}</div>
                {entry.tags.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap">
                    {entry.tags.slice(0, 3).map(t => <span key={t} className="bg-primary/10 text-primary/70 text-[7px] px-1 rounded">{t}</span>)}
                  </div>
                )}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-[9px] text-muted-foreground/50 text-center py-4">No entries</p>}
          </div>
        </ScrollArea>
      </div>

      {/* Main */}
      {selected ? (
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="h-8 border-b border-border flex items-center px-3 gap-2">
            <input
              value={selected.title}
              onChange={e => updateEntry('title', e.target.value)}
              className="bg-transparent text-[11px] font-display text-foreground outline-none max-w-[200px] border-b border-transparent focus:border-primary"
            />
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setEditMode(!editMode)} className={`p-1 rounded hover:bg-muted ${editMode ? 'text-primary' : 'text-muted-foreground'}`} title={editMode ? 'Preview' : 'Edit'}>
                {editMode ? <Eye size={12} /> : <Edit3 size={12} />}
              </button>
              <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.svg,.webp" className="hidden" onChange={handleImageUpload} />
              <button onClick={() => fileInputRef.current?.click()} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Insert Image"><ImageIcon size={12} /></button>
              <button onClick={startPublish} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Publish to Intranet"><Globe size={12} /></button>
              <button onClick={exportHTML} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Export HTML/PDF"><Download size={12} /></button>
              <button onClick={deleteEntry} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Delete"><Trash2 size={12} /></button>
            </div>
          </div>

          {/* Tags */}
          <div className="px-3 py-1 border-b border-border/50 flex items-center gap-1 flex-wrap">
            <Tag size={9} className="text-muted-foreground/50" />
            {selected.tags.map(t => (
              <span key={t} className="bg-primary/10 text-primary/70 text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                {t}
                <button onClick={() => removeTag(t)} className="hover:text-destructive">×</button>
              </span>
            ))}
            <input
              value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="add tag..."
              className="bg-transparent text-[8px] outline-none w-16 placeholder:text-muted-foreground/30"
            />
          </div>

          {/* Publish modal */}
          {showPublish && (
            <div className="px-3 py-2 border-b border-primary/30 bg-primary/5 flex items-center gap-2">
              <span className="text-[9px] text-primary">Publish as:</span>
              <span className="text-[9px] text-muted-foreground">httpsp://pages/</span>
              <input value={publishSlug} onChange={e => setPublishSlug(e.target.value)} className="bg-muted/30 border border-border rounded px-1.5 py-0.5 text-[10px] w-40 outline-none focus:border-primary" />
              <button onClick={doPublish} className="text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded hover:bg-primary/90">Publish</button>
              <button onClick={() => setShowPublish(false)} className="text-[9px] text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          )}

          {/* Content */}
          {editMode ? (
            <div className="flex flex-1 min-h-0">
              <div className="flex-1 border-r border-border flex flex-col">
                <div className="px-2 py-1 border-b border-border text-[9px] text-muted-foreground/60 uppercase tracking-wider">Markdown</div>
                <textarea
                  ref={editorRef}
                  value={selected.content}
                  onChange={e => updateEntry('content', e.target.value)}
                  spellCheck={false}
                  className="flex-1 p-4 bg-transparent text-[11px] font-mono text-foreground resize-none outline-none leading-relaxed"
                />
              </div>
              <div className="flex-1 flex flex-col">
                <div className="px-2 py-1 border-b border-border text-[9px] text-muted-foreground/60 uppercase tracking-wider">Preview</div>
                <ScrollArea className="flex-1">
                  <div className="p-6 max-w-2xl">{renderMarkdown(selected.content)}</div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-6 max-w-2xl mx-auto">{renderMarkdown(selected.content)}</div>
            </ScrollArea>
          )}

          {/* Status bar */}
          <div className="h-5 border-t border-border flex items-center px-3 text-[9px] text-muted-foreground/60">
            <span>{selected.content.split('\n').length} lines</span>
            <span className="ml-2">{selected.content.length} chars</span>
            <span className="ml-auto">
              {selected.published ? `Published → httpsp://pages/${selected.slug}` : 'Draft'}
              {' • '}{editMode ? 'Editing' : 'Preview'}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground/50 text-xs">
          Create a new journal entry to get started
        </div>
      )}
    </div>
  );
}
