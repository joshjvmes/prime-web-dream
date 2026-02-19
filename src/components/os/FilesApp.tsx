import { useState } from 'react';
import { PrimeFile } from '@/types/os';
import { ChevronRight, ChevronDown, FileText, Folder, Hexagon } from 'lucide-react';

const fileTree: PrimeFile[] = [
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
      { name: '⟨doc, type:pdf, topic:geometry⟩', semanticTags: ['doc', 'pdf'], coord: '⟨31,37,41,...⟩', type: 'fold', size: '42.5K qt', curvature: 0.35, torsion: 0.45 },
      { name: '⟨doc, type:primec, topic:flow⟩', semanticTags: ['doc', 'code'], coord: '⟨31,37,43,...⟩', type: 'fold', size: '7.2K qt', curvature: 0.28, torsion: 0.52 },
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

export default function FilesApp() {
  const [selected, setSelected] = useState<PrimeFile | null>(null);

  return (
    <div className="h-full flex bg-background text-xs font-mono">
      {/* Tree */}
      <div className="w-1/2 border-r border-border overflow-y-auto p-2">
        <div className="text-[10px] font-display tracking-wider text-muted-foreground mb-2 uppercase">
          Prime Manifold
        </div>
        {fileTree.map((f, i) => (
          <FileNode key={i} file={f} depth={0} onSelect={setSelected} selected={selected} />
        ))}
      </div>
      {/* Detail */}
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
          </div>
        ) : (
          <div className="text-muted-foreground text-center mt-8">
            Select a region to view properties
          </div>
        )}
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

function FileNode({ file, depth, onSelect, selected }: { file: PrimeFile; depth: number; onSelect: (f: PrimeFile) => void; selected: PrimeFile | null }) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = file.children && file.children.length > 0;
  const isSelected = selected === file;
  const Icon = file.type === 'manifold' ? Folder : file.type === 'fold' ? Hexagon : FileText;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer hover:bg-muted/50 ${
          isSelected ? 'bg-primary/10 text-primary' : 'text-card-foreground'
        }`}
        style={{ paddingLeft: depth * 12 + 4 }}
        onClick={() => {
          onSelect(file);
          if (hasChildren) setOpen(!open);
        }}
      >
        {hasChildren ? (
          open ? <ChevronDown size={10} className="text-muted-foreground" /> : <ChevronRight size={10} className="text-muted-foreground" />
        ) : (
          <span className="w-[10px]" />
        )}
        <Icon size={12} className={file.type === 'manifold' ? 'text-prime-amber' : 'text-prime-cyan'} />
        <span className="truncate">{file.name}</span>
        <span className="ml-auto text-muted-foreground text-[9px]">{file.size}</span>
      </div>
      {open && file.children?.map((c, i) => (
        <FileNode key={i} file={c} depth={depth + 1} onSelect={onSelect} selected={selected} />
      ))}
    </div>
  );
}
