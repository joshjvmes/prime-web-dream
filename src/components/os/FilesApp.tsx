import { useState, useMemo, useCallback } from 'react';
import { PrimeFile } from '@/types/os';
import { ChevronRight, ChevronDown, FileText, Folder, Hexagon, Search, Plus, Trash2, Edit3, FolderPlus, Eye, ArrowLeft } from 'lucide-react';

// Mutable file tree stored in state
const DEFAULT_TREE: PrimeFile[] = [
  {
    name: '⟨system, kernel⟩',
    semanticTags: ['system', 'kernel'],
    coord: '⟨2,3,5,7,11,0,0,0,0,0,0⟩',
    type: 'manifold',
    size: '∞',
    curvature: 0.92,
    torsion: 0.1,
    children: [
      { name: '⟨kernel, scheduler, fws⟩', semanticTags: ['kernel', 'scheduler'], coord: '⟨2,3,5,...⟩', type: 'region', size: '2.4K qt', curvature: 0.87, torsion: 0.05 },
      { name: '⟨kernel, memory, pmm⟩', semanticTags: ['kernel', 'memory'], coord: '⟨2,3,7,...⟩', type: 'region', size: '8.1K qt', curvature: 0.95, torsion: 0.02 },
      { name: '⟨kernel, flow, gfo⟩', semanticTags: ['kernel', 'flow'], coord: '⟨2,5,7,...⟩', type: 'region', size: '3.7K qt', curvature: 0.78, torsion: 0.08 },
    ],
  },
  {
    name: '⟨apps, user⟩',
    semanticTags: ['apps', 'user'],
    coord: '⟨13,17,19,23,29,0,0,0,0,0,0⟩',
    type: 'manifold',
    size: '∞',
    curvature: 0.65,
    torsion: 0.3,
    children: [
      { name: '⟨app, terminal, psh⟩', semanticTags: ['app', 'terminal'], coord: '⟨13,17,19,...⟩', type: 'region', size: '1.2K qt', curvature: 0.55, torsion: 0.12 },
      { name: '⟨app, browser, flow⟩', semanticTags: ['app', 'browser'], coord: '⟨13,17,23,...⟩', type: 'region', size: '15.3K qt', curvature: 0.72, torsion: 0.25 },
      { name: '⟨app, editor, prime⟩', semanticTags: ['app', 'editor'], coord: '⟨13,19,23,...⟩', type: 'region', size: '9.8K qt', curvature: 0.60, torsion: 0.18 },
    ],
  },
  {
    name: '⟨data, user:josh⟩',
    semanticTags: ['data', 'user'],
    coord: '⟨31,37,41,43,47,0,0,0,0,0,0⟩',
    type: 'manifold',
    size: '∞',
    curvature: 0.40,
    torsion: 0.5,
    children: [
      { name: '⟨doc, type:pdf, topic:geometry⟩', semanticTags: ['doc', 'pdf', 'geometry'], coord: '⟨31,37,41,...⟩', type: 'fold', size: '42.5K qt', curvature: 0.35, torsion: 0.45 },
      { name: '⟨doc, type:primec, topic:flow⟩', semanticTags: ['doc', 'code', 'flow'], coord: '⟨31,37,43,...⟩', type: 'fold', size: '7.2K qt', curvature: 0.28, torsion: 0.52 },
    ],
  },
  {
    name: '⟨network, primenet⟩',
    semanticTags: ['network', 'primenet'],
    coord: '⟨53,59,61,67,71,0,0,0,0,0,0⟩',
    type: 'manifold',
    size: '∞',
    curvature: 0.88,
    torsion: 0.15,
  },
];

const PRIMES = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97];

function randomCoord(): string {
  const p = Array.from({length: 3}, () => PRIMES[Math.floor(Math.random()*PRIMES.length)]);
  return `⟨${p.join(',')},...⟩`;
}

function randomSize(): string {
  return `${(Math.random()*50+0.5).toFixed(1)}K qt`;
}

// File content simulation
function generateFileContent(file: PrimeFile): string[] {
  if (file.type === 'manifold') {
    return [
      `; Manifold descriptor: ${file.name}`,
      `; Coordinate: ${file.coord}`,
      `; Children: ${file.children?.length ?? 0} regions`,
      '',
      'MANIFOLD_HEADER {',
      `  curvature: ${file.curvature.toFixed(4)}`,
      `  torsion:   ${file.torsion.toFixed(4)}`,
      `  topology:  connected, orientable`,
      `  dim:       11 → 4 (folded)`,
      '}',
    ];
  }
  if (file.type === 'fold') {
    return [
      `; Fold data: ${file.name}`,
      `; Size: ${file.size}`,
      '',
      'BEGIN FOLD_STREAM',
      `  κ = ${file.curvature.toFixed(4)}`,
      `  τ = ${file.torsion.toFixed(4)}`,
      `  encoding: adinkra_11d`,
      '',
      '  0x4F 0x72 0x69 0x67 0x61 0x6D 0x69',
      '  0x50 0x72 0x69 0x6D 0x65 0x46 0x6F',
      '  [... qutrit stream continues ...]',
      'END FOLD_STREAM',
    ];
  }
  return [
    `; Region: ${file.name}`,
    `; Tags: ${file.semanticTags.join(', ')}`,
    '',
    'REGION_DATA {',
    `  coord: ${file.coord}`,
    `  size:  ${file.size}`,
    `  access: owner(d<R_o), group(d<R_g)`,
    '}',
  ];
}

function flattenFiles(files: PrimeFile[]): PrimeFile[] {
  const result: PrimeFile[] = [];
  for (const f of files) {
    result.push(f);
    if (f.children) result.push(...flattenFiles(f.children));
  }
  return result;
}

function computeRelevance(file: PrimeFile, query: string): number {
  const q = query.toLowerCase();
  const tags = file.semanticTags.join(' ').toLowerCase();
  const name = file.name.toLowerCase();
  let score = 0;
  for (const w of q.split(/\s+/)) {
    if (tags.includes(w)) score += 0.5;
    if (name.includes(w)) score += 0.3;
  }
  return Math.min(score, 1);
}

// Deep clone helper
function cloneTree(tree: PrimeFile[]): PrimeFile[] {
  return tree.map(f => ({ ...f, children: f.children ? cloneTree(f.children) : undefined }));
}

export default function FilesApp() {
  const [fileTree, setFileTree] = useState<PrimeFile[]>(() => cloneTree(DEFAULT_TREE));
  const [selected, setSelected] = useState<PrimeFile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewFile, setPreviewFile] = useState<PrimeFile | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<PrimeFile[]>([]);
  const [renamingFile, setRenamingFile] = useState<PrimeFile | null>(null);
  const [renameText, setRenameText] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState<'file' | 'folder' | null>(null);
  const [createName, setCreateName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<PrimeFile | null>(null);

  const allFiles = useMemo(() => flattenFiles(fileTree), [fileTree]);
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return allFiles
      .map(f => ({ file: f, relevance: computeRelevance(f, searchQuery) }))
      .filter(r => r.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance);
  }, [searchQuery, allFiles]);

  // Get the current folder contents based on breadcrumb
  const currentItems = useMemo(() => {
    if (breadcrumb.length === 0) return fileTree;
    const last = breadcrumb[breadcrumb.length - 1];
    return last.children ?? [];
  }, [breadcrumb, fileTree]);

  const navigateInto = useCallback((file: PrimeFile) => {
    if (file.type === 'manifold' && file.children) {
      setBreadcrumb(prev => [...prev, file]);
      setSelected(null);
    }
  }, []);

  const navigateUp = useCallback(() => {
    setBreadcrumb(prev => prev.slice(0, -1));
    setSelected(null);
  }, []);

  const navigateToBreadcrumb = useCallback((idx: number) => {
    setBreadcrumb(prev => prev.slice(0, idx + 1));
    setSelected(null);
  }, []);

  // Recursive helpers for CRUD
  const addToTree = useCallback((tree: PrimeFile[], parent: PrimeFile | null, newFile: PrimeFile): PrimeFile[] => {
    if (!parent) return [...tree, newFile];
    return tree.map(f => {
      if (f === parent) return { ...f, children: [...(f.children ?? []), newFile] };
      if (f.children) return { ...f, children: addToTree(f.children, parent, newFile) };
      return f;
    });
  }, []);

  const removeFromTree = useCallback((tree: PrimeFile[], target: PrimeFile): PrimeFile[] => {
    return tree.filter(f => f !== target).map(f => {
      if (f.children) return { ...f, children: removeFromTree(f.children, target) };
      return f;
    });
  }, []);

  const renameInTree = useCallback((tree: PrimeFile[], target: PrimeFile, newName: string): PrimeFile[] => {
    return tree.map(f => {
      if (f === target) {
        const tags = newName.replace(/[⟨⟩]/g, '').split(',').map(s => s.trim()).filter(Boolean);
        return { ...f, name: newName, semanticTags: tags.length > 0 ? tags : f.semanticTags };
      }
      if (f.children) return { ...f, children: renameInTree(f.children, target, newName) };
      return f;
    });
  }, []);

  const handleCreate = useCallback((type: 'file' | 'folder') => {
    if (!createName.trim()) return;
    const tags = createName.split(',').map(s => s.trim()).filter(Boolean);
    const name = `⟨${tags.join(', ')}⟩`;
    const parent = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1] : null;
    const newFile: PrimeFile = {
      name,
      semanticTags: tags,
      coord: randomCoord(),
      type: type === 'folder' ? 'manifold' : 'region',
      size: type === 'folder' ? '∞' : randomSize(),
      curvature: Math.random(),
      torsion: Math.random(),
      children: type === 'folder' ? [] : undefined,
    };
    setFileTree(prev => addToTree(prev, parent, newFile));
    setShowCreateDialog(null);
    setCreateName('');
  }, [createName, breadcrumb, addToTree]);

  const handleDelete = useCallback(() => {
    if (!confirmDelete) return;
    setFileTree(prev => removeFromTree(prev, confirmDelete));
    if (selected === confirmDelete) setSelected(null);
    if (previewFile === confirmDelete) setPreviewFile(null);
    setConfirmDelete(null);
  }, [confirmDelete, selected, previewFile, removeFromTree]);

  const handleRename = useCallback(() => {
    if (!renamingFile || !renameText.trim()) return;
    setFileTree(prev => renameInTree(prev, renamingFile, renameText));
    setRenamingFile(null);
    setRenameText('');
  }, [renamingFile, renameText, renameInTree]);

  return (
    <div className="h-full flex flex-col bg-background text-xs font-mono">
      {/* Toolbar */}
      <div className="p-2 border-b border-border flex items-center gap-1.5">
        {breadcrumb.length > 0 && (
          <button onClick={navigateUp} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Go back">
            <ArrowLeft size={12} />
          </button>
        )}
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
          <button onClick={() => { setBreadcrumb([]); setSelected(null); }} className="text-[10px] text-primary hover:underline shrink-0">/</button>
          {breadcrumb.map((bc, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              <ChevronRight size={8} className="text-muted-foreground" />
              <button onClick={() => navigateToBreadcrumb(i)} className="text-[10px] text-primary/70 hover:text-primary hover:underline truncate max-w-20">
                {bc.semanticTags[0]}
              </button>
            </span>
          ))}
        </div>
        <button onClick={() => setShowCreateDialog('file')} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary" title="New file">
          <Plus size={12} />
        </button>
        <button onClick={() => setShowCreateDialog('folder')} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary" title="New folder">
          <FolderPlus size={12} />
        </button>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 border-b border-border">
        <div className="flex items-center gap-2 bg-muted/30 border border-border rounded px-2 py-1">
          <Search size={12} className="text-muted-foreground shrink-0" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Semantic search..."
            className="flex-1 bg-transparent outline-none text-foreground text-[11px]"
            spellCheck={false}
          />
          {searchQuery && <span className="text-[9px] text-primary shrink-0">0.6ms</span>}
        </div>
      </div>

      {/* Create dialog */}
      {showCreateDialog && (
        <div className="px-2 py-2 border-b border-primary/20 bg-primary/5">
          <p className="text-[9px] text-primary font-display tracking-wider uppercase mb-1">
            New {showCreateDialog === 'folder' ? 'Manifold' : 'Region'}
          </p>
          <div className="flex gap-1.5">
            <input
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              placeholder="tag1, tag2, tag3..."
              className="flex-1 bg-background border border-border rounded px-1.5 py-1 text-[10px] text-foreground"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(showCreateDialog); if (e.key === 'Escape') setShowCreateDialog(null); }}
            />
            <button onClick={() => handleCreate(showCreateDialog)} className="px-2 py-1 rounded border border-primary/30 text-primary text-[10px] hover:bg-primary/10">Create</button>
            <button onClick={() => setShowCreateDialog(null)} className="px-2 py-1 rounded border border-border text-muted-foreground text-[10px] hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="px-2 py-2 border-b border-destructive/20 bg-destructive/5">
          <p className="text-[9px] text-destructive mb-1">Delete "{confirmDelete.name}"?</p>
          <div className="flex gap-1.5">
            <button onClick={handleDelete} className="px-2 py-1 rounded border border-destructive/30 text-destructive text-[10px] hover:bg-destructive/10">Delete</button>
            <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 rounded border border-border text-muted-foreground text-[10px]">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Tree or search results */}
        <div className="w-1/2 border-r border-border overflow-y-auto p-2">
          {searchResults ? (
            <>
              <div className="text-[10px] font-display tracking-wider text-muted-foreground mb-2 uppercase">
                Results ({searchResults.length})
              </div>
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 py-1 px-1.5 rounded cursor-pointer hover:bg-muted/50 ${
                    selected === r.file ? 'bg-primary/10 text-primary' : 'text-card-foreground'
                  }`}
                  onClick={() => setSelected(r.file)}
                >
                  <span className="text-prime-green text-[9px] w-8 shrink-0">{(r.relevance * 100).toFixed(0)}%</span>
                  <span className="truncate">{r.file.name}</span>
                </div>
              ))}
              {searchResults.length === 0 && (
                <div className="text-muted-foreground text-center mt-4">No regions found</div>
              )}
            </>
          ) : previewFile ? (
            /* File preview */
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setPreviewFile(null)} className="text-primary hover:underline text-[10px]">← Back</button>
                <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase truncate">{previewFile.name}</span>
              </div>
              <div className="flex-1 bg-background/50 border border-border rounded p-2 overflow-y-auto">
                {generateFileContent(previewFile).map((line, i) => (
                  <div key={i} className={`leading-relaxed ${
                    line.startsWith(';') ? 'text-muted-foreground' : 
                    line.startsWith('  ') ? 'text-prime-cyan' : 'text-card-foreground'
                  }`}>
                    <span className="text-muted-foreground/40 mr-2 select-none">{String(i+1).padStart(2)}</span>
                    {line || '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Folder view */
            <>
              <div className="text-[10px] font-display tracking-wider text-muted-foreground mb-2 uppercase">
                {breadcrumb.length > 0 ? breadcrumb[breadcrumb.length-1].name : 'Prime Manifold'}
              </div>
              {currentItems.map((f, i) => (
                <FileNode
                  key={`${f.name}-${i}`}
                  file={f}
                  onSelect={setSelected}
                  selected={selected}
                  onDoubleClick={navigateInto}
                  onRename={(file) => { setRenamingFile(file); setRenameText(file.name); }}
                  onDelete={(file) => setConfirmDelete(file)}
                  onPreview={(file) => setPreviewFile(file)}
                  renamingFile={renamingFile}
                  renameText={renameText}
                  onRenameChange={setRenameText}
                  onRenameSubmit={handleRename}
                  onRenameCancel={() => setRenamingFile(null)}
                />
              ))}
              {currentItems.length === 0 && (
                <div className="text-muted-foreground text-center mt-4 text-[10px]">Empty manifold</div>
              )}
            </>
          )}
        </div>

        {/* Detail panel */}
        <div className="w-1/2 p-3 overflow-y-auto">
          {selected ? (
            <div className="space-y-3">
              <div className="font-display text-[10px] tracking-wider text-primary uppercase">
                File Properties
              </div>
              <div className="space-y-1.5 text-card-foreground">
                <Row label="Name" value={selected.name} />
                <Row label="Coord" value={selected.coord} />
                <Row label="Type" value={selected.type} />
                <Row label="Size" value={selected.size} />
                <Row label="κ (curvature)" value={selected.curvature.toFixed(3)} />
                <Row label="τ (torsion)" value={selected.torsion.toFixed(3)} />
                <Row label="Tags" value={selected.semanticTags.join(', ')} />
              </div>
              <div className="mt-3 p-2 rounded bg-muted/50 border border-border">
                <div className="text-[10px] text-muted-foreground mb-1">Access (geometric proximity)</div>
                <div className="flex gap-2">
                  <span className="text-prime-green text-[10px]">● owner (d &lt; R_owner)</span>
                  <span className="text-prime-amber text-[10px]">● group (d &lt; R_group)</span>
                </div>
              </div>
              {/* Actions */}
              <div className="flex gap-1.5 pt-2">
                <button
                  onClick={() => setPreviewFile(selected)}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-primary/30 text-primary text-[10px] hover:bg-primary/10"
                >
                  <Eye size={10} /> Preview
                </button>
                <button
                  onClick={() => { setRenamingFile(selected); setRenameText(selected.name); }}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-border text-muted-foreground text-[10px] hover:text-foreground"
                >
                  <Edit3 size={10} /> Rename
                </button>
                <button
                  onClick={() => setConfirmDelete(selected)}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-destructive/30 text-destructive/70 text-[10px] hover:text-destructive hover:bg-destructive/5"
                >
                  <Trash2 size={10} /> Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-center mt-8">
              Select a region to view properties
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="text-muted-foreground w-24 shrink-0">{label}:</span>
      <span className="text-prime-cyan">{value}</span>
    </div>
  );
}

interface FileNodeProps {
  file: PrimeFile;
  onSelect: (f: PrimeFile) => void;
  selected: PrimeFile | null;
  onDoubleClick: (f: PrimeFile) => void;
  onRename: (f: PrimeFile) => void;
  onDelete: (f: PrimeFile) => void;
  onPreview: (f: PrimeFile) => void;
  renamingFile: PrimeFile | null;
  renameText: string;
  onRenameChange: (v: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
}

function FileNode({ file, onSelect, selected, onDoubleClick, onRename, onDelete, onPreview, renamingFile, renameText, onRenameChange, onRenameSubmit, onRenameCancel }: FileNodeProps) {
  const isSelected = selected === file;
  const isRenaming = renamingFile === file;
  const Icon = file.type === 'manifold' ? Folder : file.type === 'fold' ? Hexagon : FileText;
  const hasChildren = file.type === 'manifold';

  return (
    <div
      className={`group flex items-center gap-1.5 py-1 px-1.5 rounded cursor-pointer hover:bg-muted/50 ${
        isSelected ? 'bg-primary/10 text-primary' : 'text-card-foreground'
      }`}
      onClick={() => onSelect(file)}
      onDoubleClick={() => onDoubleClick(file)}
    >
      {hasChildren ? <ChevronRight size={10} className="text-muted-foreground shrink-0" /> : <span className="w-[10px] shrink-0" />}
      <Icon size={12} className={`shrink-0 ${file.type === 'manifold' ? 'text-prime-amber' : 'text-prime-cyan'}`} />
      {isRenaming ? (
        <input
          value={renameText}
          onChange={e => onRenameChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onRenameSubmit(); if (e.key === 'Escape') onRenameCancel(); }}
          onBlur={onRenameSubmit}
          className="flex-1 bg-background border border-primary/30 rounded px-1 py-0.5 text-[10px] text-foreground outline-none"
          autoFocus
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span className="truncate flex-1">{file.name}</span>
      )}
      <span className="ml-auto text-muted-foreground text-[9px] shrink-0">{file.size}</span>
      {/* Hover actions */}
      {!isRenaming && (
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          {file.type !== 'manifold' && (
            <button onClick={e => { e.stopPropagation(); onPreview(file); }} className="p-0.5 text-muted-foreground hover:text-primary" title="Preview"><Eye size={10} /></button>
          )}
          <button onClick={e => { e.stopPropagation(); onRename(file); }} className="p-0.5 text-muted-foreground hover:text-foreground" title="Rename"><Edit3 size={10} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(file); }} className="p-0.5 text-muted-foreground hover:text-destructive" title="Delete"><Trash2 size={10} /></button>
        </div>
      )}
    </div>
  );
}
