import { useState, useCallback, useRef, useEffect } from 'react';
import { File, FolderOpen, Plus, Save, X, ChevronRight } from 'lucide-react';

interface EditorFile {
  name: string;
  content: string;
  coord: string;
}

const SAMPLE_FILES: EditorFile[] = [
  { name: 'main.fold', coord: '⟨2,3,5⟩', content: '// PRIME OS Main Fold\n// Geometric entry point\n\nfold main() {\n  let lattice = map(P11, identity)\n  flow lattice -> scheduler\n  return lattice.state\n}\n\n// Init qutrit cores\nfold init_cores(n: int) {\n  let cores = map(range(n), |i| {\n    Qutrit { coord: prime(i), state: |1⟩ }\n  })\n  flow cores -> registry\n}' },
  { name: 'network.fold', coord: '⟨7,11,13⟩', content: '// PrimeNet Routing Module\n\nfold route(src, dst) {\n  let path = geodesic(src.coord, dst.coord)\n  flow packet -> path\n  return path.hops\n}\n\nfold broadcast(msg) {\n  let nodes = map(active_nodes(), |n| {\n    flow msg -> n.inbox\n  })\n}' },
  { name: 'energy.fold', coord: '⟨17,19,23⟩', content: '// Energy Harvesting Config\n\nlet modes = [\n  { name: "Satellite", cop: 3.2, input: 100 },\n  { name: "Terrestrial", cop: 2.8, input: 200 },\n  { name: "Lattice", cop: 4.1, input: 50 },\n]\n\nfold harvest(mode) {\n  let output = mode.input * mode.cop\n  flow output -> grid\n}' },
  { name: 'config.toml', coord: '⟨29,31,37⟩', content: '[prime-os]\nversion = "2.0.0"\narch = "T3-649"\ncores = 649\nlogic = "ternary"\n\n[foldmem]\ndimensions = 11\ntarget = 4\ncompression = "adinkra"\n\n[network]\nrouting = "geodesic"\nlatency_ms = 0.3' },
];

const KEYWORDS = /\b(fold|map|flow|let|return|if|else|for|in|fn|struct|enum|match|use|import)\b/g;
const TYPES = /\b(int|float|string|bool|Qutrit|Lattice|Node)\b/g;
const COMMENTS = /^(\s*\/\/.*)/;
const STRINGS = /"[^"]*"/g;

function highlightLine(line: string): React.ReactNode[] {
  if (COMMENTS.test(line)) {
    return [<span key="c" className="text-muted-foreground/50">{line}</span>];
  }
  const parts: React.ReactNode[] = [];
  let last = 0;
  const matches: { start: number; end: number; cls: string }[] = [];

  for (const m of line.matchAll(KEYWORDS)) {
    matches.push({ start: m.index!, end: m.index! + m[0].length, cls: 'text-prime-violet' });
  }
  for (const m of line.matchAll(TYPES)) {
    matches.push({ start: m.index!, end: m.index! + m[0].length, cls: 'text-prime-amber' });
  }
  for (const m of line.matchAll(STRINGS)) {
    matches.push({ start: m.index!, end: m.index! + m[0].length, cls: 'text-prime-green' });
  }

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
  if (parts.length === 0) parts.push(<span key="empty">{line || '\u00A0'}</span>);
  return parts;
}

export default function TextEditorApp() {
  const [files] = useState<EditorFile[]>(SAMPLE_FILES);
  const [openTabs, setOpenTabs] = useState<EditorFile[]>([SAMPLE_FILES[0]]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [contents, setContents] = useState<Record<string, string>>(
    () => Object.fromEntries(SAMPLE_FILES.map(f => [f.name, f.content]))
  );
  const [cursorLine, setCursorLine] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const activeFile = openTabs[activeIdx];

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
    const name = `untitled-${Date.now() % 10000}.fold`;
    const f: EditorFile = { name, coord: '⟨?,?,?⟩', content: '' };
    setContents(c => ({ ...c, [name]: '' }));
    setOpenTabs(prev => [...prev, f]);
    setActiveIdx(openTabs.length);
  }, [openTabs]);

  const handleChange = useCallback((val: string) => {
    if (!activeFile) return;
    setContents(c => ({ ...c, [activeFile.name]: val }));
  }, [activeFile]);

  const handleTextareaClick = useCallback(() => {
    if (textRef.current) {
      const text = textRef.current.value.substring(0, textRef.current.selectionStart);
      setCursorLine(text.split('\n').length);
    }
  }, []);

  const currentContent = activeFile ? (contents[activeFile.name] ?? '') : '';
  const lines = currentContent.split('\n');

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
        <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Save">
          <Save size={12} />
        </button>
        <span className="ml-auto font-display text-[8px] tracking-[0.2em] uppercase text-primary/60">PrimeEdit</span>
      </div>

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
              <span onClick={(e) => closeTab(i, e)} className="ml-1 hover:text-destructive">
                <X size={8} />
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-40 border-r border-border bg-card/30 overflow-y-auto shrink-0">
            <div className="px-2 py-1.5">
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
            {/* Line numbers + highlighted overlay */}
            <div className="flex flex-1 overflow-auto">
              <div className="shrink-0 py-2 pr-2 pl-2 text-right select-none border-r border-border/50 bg-card/20">
                {lines.map((_, i) => (
                  <div key={i} className="font-mono text-[10px] leading-[18px] text-muted-foreground/40 h-[18px]">
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="flex-1 relative">
                {/* Highlighted code layer */}
                <div className="absolute inset-0 py-2 pl-3 pr-3 pointer-events-none overflow-hidden" aria-hidden>
                  {lines.map((line, i) => (
                    <div key={i} className="font-mono text-[11px] leading-[18px] h-[18px] whitespace-pre">
                      {highlightLine(line)}
                    </div>
                  ))}
                </div>
                {/* Actual textarea */}
                <textarea
                  ref={textRef}
                  value={currentContent}
                  onChange={e => handleChange(e.target.value)}
                  onClick={handleTextareaClick}
                  onKeyUp={handleTextareaClick}
                  spellCheck={false}
                  className="absolute inset-0 w-full h-full py-2 pl-3 pr-3 font-mono text-[11px] leading-[18px] bg-transparent text-transparent caret-primary resize-none outline-none"
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
        {activeFile && <span className="ml-auto">{activeFile.coord}</span>}
        {activeFile && <span>{activeFile.name}</span>}
      </div>
    </div>
  );
}
