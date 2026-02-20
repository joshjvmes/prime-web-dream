import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { File, FolderOpen, Plus, Save, X, ChevronRight, Search, Replace, WrapText } from 'lucide-react';
import { useCloudStorage } from '@/hooks/useCloudStorage';
import { supabase } from '@/integrations/supabase/client';

interface EditorFile {
  name: string;
  content: string;
  cloudPath?: string; // userId/editor/filename
  dirty?: boolean;
}

const SAMPLE_FILES: EditorFile[] = [
  { name: 'main.fold', content: '// PRIME OS Main Fold\n// Geometric entry point\n\nfold main() {\n  let lattice = map(P11, identity)\n  flow lattice -> scheduler\n  return lattice.state\n}\n\n// Init qutrit cores\nfold init_cores(n: int) {\n  let cores = map(range(n), |i| {\n    Qutrit { coord: prime(i), state: |1⟩ }\n  })\n  flow cores -> registry\n}' },
  { name: 'network.fold', content: '// PrimeNet Routing Module\n\nfold route(src, dst) {\n  let path = geodesic(src.coord, dst.coord)\n  flow packet -> path\n  return path.hops\n}\n\nfold broadcast(msg) {\n  let nodes = map(active_nodes(), |n| {\n    flow msg -> n.inbox\n  })\n}' },
  { name: 'config.toml', content: '[prime-os]\nversion = "2.0.0"\narch = "T3-649"\ncores = 649\nlogic = "ternary"\n\n[foldmem]\ndimensions = 11\ntarget = 4\ncompression = "adinkra"\n\n[network]\nrouting = "geodesic"\nlatency_ms = 0.3' },
];

// --- Syntax highlighting ---
const FOLD_KW = /\b(fold|map|flow|let|return|if|else|for|in|fn|struct|enum|match|use|import)\b/g;
const FOLD_TYPES = /\b(int|float|string|bool|Qutrit|Lattice|Node)\b/g;
const COMMENTS_RE = /^(\s*\/\/.*)/;
const STRINGS_RE = /"[^"]*"/g;
const JSON_KEYS = /"([^"]+)"\s*:/g;
const TOML_SECTION = /^\[.+\]/;
const TOML_KEY = /^(\w[\w.-]*)\s*=/;
const MD_HEADING = /^#{1,6}\s/;

function getHighlighter(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'json') return highlightJSON;
  if (ext === 'toml') return highlightTOML;
  if (ext === 'md') return highlightMD;
  return highlightFold;
}

function highlightFold(line: string): React.ReactNode[] {
  if (COMMENTS_RE.test(line)) return [<span key="c" className="text-muted-foreground/50">{line}</span>];
  const parts: React.ReactNode[] = [];
  let last = 0;
  const matches: { start: number; end: number; cls: string }[] = [];
  for (const m of line.matchAll(FOLD_KW)) matches.push({ start: m.index!, end: m.index! + m[0].length, cls: 'text-prime-violet' });
  for (const m of line.matchAll(FOLD_TYPES)) matches.push({ start: m.index!, end: m.index! + m[0].length, cls: 'text-prime-amber' });
  for (const m of line.matchAll(STRINGS_RE)) matches.push({ start: m.index!, end: m.index! + m[0].length, cls: 'text-prime-green' });
  matches.sort((a, b) => a.start - b.start);
  const used = new Set<number>();
  for (const m of matches) {
    let skip = false;
    for (let i = m.start; i < m.end; i++) if (used.has(i)) { skip = true; break; }
    if (skip) continue;
    if (m.start > last) parts.push(<span key={`t${last}`}>{line.slice(last, m.start)}</span>);
    parts.push(<span key={`h${m.start}`} className={m.cls}>{line.slice(m.start, m.end)}</span>);
    for (let i = m.start; i < m.end; i++) used.add(i);
    last = m.end;
  }
  if (last < line.length) parts.push(<span key={`e${last}`}>{line.slice(last)}</span>);
  if (!parts.length) parts.push(<span key="empty">{line || '\u00A0'}</span>);
  return parts;
}

function highlightJSON(line: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  const matches: { start: number; end: number; cls: string }[] = [];
  for (const m of line.matchAll(JSON_KEYS)) matches.push({ start: m.index!, end: m.index! + m[1].length + 1, cls: 'text-prime-violet' });
  for (const m of line.matchAll(STRINGS_RE)) {
    if (!matches.some(x => x.start <= m.index! && x.end >= m.index! + m[0].length))
      matches.push({ start: m.index!, end: m.index! + m[0].length, cls: 'text-prime-green' });
  }
  matches.sort((a, b) => a.start - b.start);
  for (const m of matches) {
    if (m.start > last) parts.push(<span key={`t${last}`}>{line.slice(last, m.start)}</span>);
    parts.push(<span key={`h${m.start}`} className={m.cls}>{line.slice(m.start, m.end)}</span>);
    last = m.end;
  }
  if (last < line.length) parts.push(<span key={`e${last}`}>{line.slice(last)}</span>);
  if (!parts.length) parts.push(<span key="empty">{line || '\u00A0'}</span>);
  return parts;
}

function highlightTOML(line: string): React.ReactNode[] {
  if (TOML_SECTION.test(line)) return [<span key="s" className="text-prime-violet font-bold">{line}</span>];
  if (COMMENTS_RE.test(line)) return [<span key="c" className="text-muted-foreground/50">{line}</span>];
  const km = line.match(TOML_KEY);
  if (km) {
    return [
      <span key="k" className="text-prime-amber">{km[1]}</span>,
      <span key="r">{line.slice(km[1].length)}</span>,
    ];
  }
  return [<span key="d">{line || '\u00A0'}</span>];
}

function highlightMD(line: string): React.ReactNode[] {
  if (MD_HEADING.test(line)) return [<span key="h" className="text-primary font-bold">{line}</span>];
  if (line.startsWith('```')) return [<span key="cb" className="text-muted-foreground/50">{line}</span>];
  const formatted = line
    .replace(/\*\*(.+?)\*\*/g, '⟦B⟧$1⟦/B⟧')
    .replace(/\*(.+?)\*/g, '⟦I⟧$1⟦/I⟧')
    .replace(/`(.+?)`/g, '⟦C⟧$1⟦/C⟧');
  if (formatted === line) return [<span key="p">{line || '\u00A0'}</span>];
  const parts: React.ReactNode[] = [];
  let rest = formatted;
  let idx = 0;
  const re = /⟦(B|I|C)⟧(.*?)⟦\/(B|I|C)⟧/;
  let match;
  while ((match = rest.match(re))) {
    if (match.index! > 0) parts.push(<span key={`t${idx++}`}>{rest.slice(0, match.index)}</span>);
    const cls = match[1] === 'B' ? 'font-bold text-foreground' : match[1] === 'I' ? 'italic text-foreground' : 'bg-muted px-0.5 rounded text-primary/80';
    parts.push(<span key={`h${idx++}`} className={cls}>{match[2]}</span>);
    rest = rest.slice(match.index! + match[0].length);
  }
  if (rest) parts.push(<span key={`e${idx}`}>{rest}</span>);
  return parts;
}

export default function TextEditorApp() {
  const { save, load } = useCloudStorage();
  const [files, setFiles] = useState<EditorFile[]>(SAMPLE_FILES);
  const [openTabs, setOpenTabs] = useState<EditorFile[]>([SAMPLE_FILES[0]]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [contents, setContents] = useState<Record<string, string>>(
    () => Object.fromEntries(SAMPLE_FILES.map(f => [f.name, f.content]))
  );
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [cursorLine, setCursorLine] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [tabSize] = useState(2);
  const [loaded, setLoaded] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const activeFile = openTabs[activeIdx];

  // Load file list from cloud on mount
  useEffect(() => {
    load<EditorFile[]>('editor-files').then(saved => {
      if (saved && saved.length > 0) {
        setFiles(saved);
        setOpenTabs([saved[0]]);
        setContents(Object.fromEntries(saved.map(f => [f.name, f.content])));
      }
      setLoaded(true);
    });
  }, [load]);

  const persistFiles = useCallback((fileList: EditorFile[], allContents: Record<string, string>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const toSave = fileList.map(f => ({ ...f, content: allContents[f.name] || f.content }));
      save('editor-files', toSave);
    }, 800);
  }, [save]);

  const openFile = useCallback((f: EditorFile) => {
    const idx = openTabs.findIndex(t => t.name === f.name);
    if (idx >= 0) { setActiveIdx(idx); return; }
    setOpenTabs(prev => [...prev, f]);
    setActiveIdx(openTabs.length);
    if (!contents[f.name]) setContents(c => ({ ...c, [f.name]: f.content }));
  }, [openTabs, contents]);

  const closeTab = useCallback((i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs(prev => prev.filter((_, idx) => idx !== i));
    setActiveIdx(prev => Math.min(prev, openTabs.length - 2));
  }, [openTabs]);

  const newFile = useCallback(() => {
    const ext = prompt('File name (e.g. notes.md):', `untitled-${Date.now() % 10000}.md`);
    if (!ext) return;
    const f: EditorFile = { name: ext, content: '' };
    const nextFiles = [...files, f];
    setFiles(nextFiles);
    setContents(c => { const next = { ...c, [ext]: '' }; persistFiles(nextFiles, next); return next; });
    setOpenTabs(prev => [...prev, f]);
    setActiveIdx(openTabs.length);
  }, [openTabs, files, persistFiles]);

  const deleteFile = useCallback(() => {
    if (!activeFile || files.length <= 1) return;
    const nextFiles = files.filter(f => f.name !== activeFile.name);
    setFiles(nextFiles);
    setOpenTabs(prev => prev.filter(t => t.name !== activeFile.name));
    setActiveIdx(0);
    setContents(c => {
      const next = { ...c };
      delete next[activeFile.name];
      persistFiles(nextFiles, next);
      return next;
    });
  }, [activeFile, files, persistFiles]);

  const handleChange = useCallback((val: string) => {
    if (!activeFile) return;
    setContents(c => {
      const next = { ...c, [activeFile.name]: val };
      persistFiles(files, next);
      return next;
    });
    setDirty(d => ({ ...d, [activeFile.name]: true }));
  }, [activeFile, files, persistFiles]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const spaces = ' '.repeat(tabSize);
      const newVal = val.substring(0, start) + spaces + val.substring(end);
      handleChange(newVal);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + tabSize; }, 0);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setShowFind(true); }
  }, [tabSize, handleChange]);

  const handleTextareaClick = useCallback(() => {
    if (textRef.current) {
      const text = textRef.current.value.substring(0, textRef.current.selectionStart);
      setCursorLine(text.split('\n').length);
    }
  }, []);

  // Find & Replace
  const doReplace = useCallback(() => {
    if (!activeFile || !findText) return;
    const curr = contents[activeFile.name] || '';
    handleChange(curr.replace(findText, replaceText));
  }, [activeFile, findText, replaceText, contents, handleChange]);

  const doReplaceAll = useCallback(() => {
    if (!activeFile || !findText) return;
    const curr = contents[activeFile.name] || '';
    handleChange(curr.split(findText).join(replaceText));
  }, [activeFile, findText, replaceText, contents, handleChange]);

  const currentContent = activeFile ? (contents[activeFile.name] ?? '') : '';
  const lines = currentContent.split('\n');
  const highlighter = activeFile ? getHighlighter(activeFile.name) : highlightFold;

  const findCount = useMemo(() => {
    if (!findText || !currentContent) return 0;
    let count = 0; let idx = 0;
    while ((idx = currentContent.indexOf(findText, idx)) !== -1) { count++; idx += findText.length; }
    return count;
  }, [findText, currentContent]);

  if (!loaded) return <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">Loading…</div>;

  return (
    <div className="h-full flex flex-col bg-background/50">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-card/40">
        <button onClick={() => setSidebarOpen(s => !s)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <FolderOpen size={12} />
        </button>
        <button onClick={newFile} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="New File">
          <Plus size={12} />
        </button>
        <button onClick={() => setShowFind(f => !f)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Find & Replace">
          <Search size={12} />
        </button>
        <button onClick={() => setWordWrap(w => !w)} className={`p-1 rounded hover:bg-muted transition-colors ${wordWrap ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} title="Word Wrap">
          <WrapText size={12} />
        </button>
        <span className="ml-auto font-display text-[8px] tracking-[0.2em] uppercase text-primary/60">PrimeEdit</span>
      </div>

      {/* Find & Replace bar */}
      {showFind && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card/60 text-[10px]">
          <Search size={10} className="text-muted-foreground" />
          <input value={findText} onChange={e => setFindText(e.target.value)} placeholder="Find…" className="bg-transparent border border-border rounded px-1.5 py-0.5 w-32 outline-none text-foreground" />
          <Replace size={10} className="text-muted-foreground" />
          <input value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Replace…" className="bg-transparent border border-border rounded px-1.5 py-0.5 w-32 outline-none text-foreground" />
          <button onClick={doReplace} className="px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground">Replace</button>
          <button onClick={doReplaceAll} className="px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground">All</button>
          {findText && <span className="text-muted-foreground/60">{findCount} found</span>}
          <button onClick={() => setShowFind(false)} className="ml-auto p-0.5 rounded hover:bg-muted text-muted-foreground"><X size={10} /></button>
        </div>
      )}

      {/* Tabs */}
      {openTabs.length > 0 && (
        <div className="flex items-center border-b border-border bg-card/20 overflow-x-auto scrollbar-none">
          {openTabs.map((t, i) => (
            <button
              key={t.name}
              onClick={() => setActiveIdx(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono border-r border-border shrink-0 transition-colors ${
                i === activeIdx ? 'bg-card/80 text-primary border-b-2 border-b-primary' : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
              }`}
            >
              <File size={10} />
              {t.name}
              {dirty[t.name] && <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />}
              <span onClick={(e) => closeTab(i, e)} className="ml-1 hover:text-destructive"><X size={8} /></span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-40 border-r border-border bg-card/30 overflow-y-auto shrink-0">
            <div className="px-2 py-1.5 flex items-center justify-between">
              <span className="font-display text-[8px] tracking-[0.15em] uppercase text-muted-foreground">Files</span>
            </div>
            {files.map(f => (
              <button
                key={f.name}
                onClick={() => openFile(f)}
                className={`flex items-center gap-1.5 w-full px-2 py-1 text-[10px] font-mono transition-colors ${
                  activeFile?.name === f.name ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                <ChevronRight size={8} className="text-muted-foreground/50" />
                <File size={10} />
                {f.name}
              </button>
            ))}
          </div>
        )}

        {/* Editor */}
        {activeFile ? (
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            <div className="flex flex-1 overflow-auto">
              <div className="shrink-0 py-2 pr-2 pl-2 text-right select-none border-r border-border/50 bg-card/20">
                {lines.map((_, i) => (
                  <div key={i} className="font-mono text-[10px] leading-[18px] text-muted-foreground/40 h-[18px]">{i + 1}</div>
                ))}
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-0 py-2 pl-3 pr-3 pointer-events-none overflow-hidden" aria-hidden>
                  {lines.map((line, i) => (
                    <div key={i} className={`font-mono text-[11px] leading-[18px] h-[18px] ${wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'}`}>
                      {highlighter(line)}
                    </div>
                  ))}
                </div>
                <textarea
                  ref={textRef}
                  value={currentContent}
                  onChange={e => handleChange(e.target.value)}
                  onClick={handleTextareaClick}
                  onKeyUp={handleTextareaClick}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  className={`absolute inset-0 w-full h-full py-2 pl-3 pr-3 font-mono text-[11px] leading-[18px] bg-transparent text-transparent caret-primary resize-none outline-none ${wordWrap ? 'whitespace-pre-wrap' : ''}`}
                  style={{ caretColor: 'hsl(var(--primary))' }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs font-mono">
            Open a file to begin editing
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 px-3 py-1 border-t border-border bg-card/40 text-[9px] font-mono text-muted-foreground">
        <span>Ln {cursorLine}</span>
        <span>{lines.length} lines</span>
        <span>Tab: {tabSize}</span>
        {wordWrap && <span>Wrap</span>}
        <span className="ml-auto">{activeFile?.name || ''}</span>
      </div>
    </div>
  );
}
