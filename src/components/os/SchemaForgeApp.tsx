import { useState, useCallback, useRef } from 'react';
import { Plus, GitBranch, LayoutGrid, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Column {
  name: string;
  type: string;
  pk?: boolean;
  fk?: string;
}

interface Entity {
  id: string;
  name: string;
  x: number;
  y: number;
  columns: Column[];
}

interface Relation {
  from: string;
  fromCol: string;
  to: string;
  toCol: string;
}

const INITIAL_ENTITIES: Entity[] = [
  { id: 'e1', name: 'QutritNode', x: 60, y: 40, columns: [
    { name: 'id', type: 'prime_coord', pk: true },
    { name: 'state', type: 'qutrit(0|1|2)' },
    { name: 'potential', type: 'float64' },
    { name: 'region_id', type: 'prime_coord', fk: 'LatticeRegion' },
  ]},
  { id: 'e2', name: 'LatticeRegion', x: 350, y: 30, columns: [
    { name: 'id', type: 'prime_coord', pk: true },
    { name: 'name', type: 'string' },
    { name: 'curvature', type: 'float64' },
    { name: 'torsion', type: 'float64' },
    { name: 'dimension', type: 'int' },
  ]},
  { id: 'e3', name: 'FoldOperation', x: 60, y: 250, columns: [
    { name: 'id', type: 'uuid', pk: true },
    { name: 'source_dim', type: 'int' },
    { name: 'target_dim', type: 'int' },
    { name: 'node_id', type: 'prime_coord', fk: 'QutritNode' },
    { name: 'timestamp', type: 'epoch_ns' },
  ]},
  { id: 'e4', name: 'EnergyReading', x: 350, y: 260, columns: [
    { name: 'id', type: 'uuid', pk: true },
    { name: 'mode', type: 'enum(sat|gnd|amb|burst)' },
    { name: 'input_w', type: 'float64' },
    { name: 'output_w', type: 'float64' },
    { name: 'cop', type: 'float64' },
    { name: 'region_id', type: 'prime_coord', fk: 'LatticeRegion' },
  ]},
  { id: 'e5', name: 'PrimeCoord', x: 620, y: 140, columns: [
    { name: 'coord', type: 'prime_tuple', pk: true },
    { name: 'semantic_tags', type: 'string[]' },
    { name: 'geodesic_dist', type: 'float64' },
  ]},
];

const INITIAL_RELATIONS: Relation[] = [
  { from: 'e1', fromCol: 'region_id', to: 'e2', toCol: 'id' },
  { from: 'e3', fromCol: 'node_id', to: 'e1', toCol: 'id' },
  { from: 'e4', fromCol: 'region_id', to: 'e2', toCol: 'id' },
];

const ENTITY_W = 220;
const COL_H = 16;
const HEADER_H = 24;

export default function SchemaForgeApp() {
  const [entities, setEntities] = useState<Entity[]>(INITIAL_ENTITIES);
  const [relations] = useState<Relation[]>(INITIAL_RELATIONS);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    const ent = entities.find(en => en.id === id);
    if (!ent) return;
    setDragging({ id, ox: e.clientX - ent.x, oy: e.clientY - ent.y });
    setSelected(id);
  }, [entities]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setEntities(prev => prev.map(en => en.id === dragging.id ? { ...en, x: e.clientX - dragging.ox, y: e.clientY - dragging.oy } : en));
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  const autoLayout = useCallback(() => {
    const cols = 3;
    const gapX = 280;
    const gapY = 230;
    setEntities(prev => prev.map((en, i) => ({
      ...en,
      x: 40 + (i % cols) * gapX,
      y: 40 + Math.floor(i / cols) * gapY,
    })));
  }, []);

  const addEntity = useCallback(() => {
    const id = `e${Date.now()}`;
    setEntities(prev => [...prev, {
      id, name: 'NewEntity', x: 100 + Math.random() * 200, y: 100 + Math.random() * 100,
      columns: [{ name: 'id', type: 'uuid', pk: true }],
    }]);
    setSelected(id);
  }, []);

  const selectedEntity = entities.find(e => e.id === selected);

  const getEntityCenter = (id: string, colName: string): { x: number; y: number } => {
    const ent = entities.find(e => e.id === id);
    if (!ent) return { x: 0, y: 0 };
    const colIdx = ent.columns.findIndex(c => c.name === colName);
    return { x: ent.x + ENTITY_W / 2, y: ent.y + HEADER_H + (colIdx + 0.5) * COL_H };
  };

  const exportSchema = useCallback(() => {
    const text = entities.map(e =>
      `${e.name} {\n${e.columns.map(c => `  ${c.name}: ${c.type}${c.pk ? ' [PK]' : ''}${c.fk ? ` → ${c.fk}` : ''}`).join('\n')}\n}`
    ).join('\n\n');
    navigator.clipboard.writeText(text).catch(() => {});
  }, [entities]);

  return (
    <div className="flex h-full bg-background font-mono text-xs">
      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="h-8 border-b border-border flex items-center px-3 gap-2">
          <button onClick={addEntity} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
            <Plus size={12} /> Entity
          </button>
          <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
            <GitBranch size={12} /> Relation
          </button>
          <button onClick={autoLayout} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
            <LayoutGrid size={12} /> Auto-layout
          </button>
          <button onClick={exportSchema} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors ml-auto">
            <FileText size={12} /> Export
          </button>
        </div>
        <svg
          ref={svgRef}
          className="flex-1 w-full cursor-default"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => setSelected(null)}
        >
          {/* Grid dots */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" className="fill-muted-foreground/10" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Relations */}
          {relations.map((rel, i) => {
            const from = getEntityCenter(rel.from, rel.fromCol);
            const to = getEntityCenter(rel.to, rel.toCol);
            const mx = (from.x + to.x) / 2;
            return (
              <path
                key={i}
                d={`M ${from.x} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${to.x} ${to.y}`}
                className="stroke-primary/40 fill-none"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                markerEnd="url(#arrow)"
              />
            );
          })}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-primary/40" />
            </marker>
          </defs>

          {/* Entities */}
          {entities.map(ent => {
            const h = HEADER_H + ent.columns.length * COL_H;
            const isSel = selected === ent.id;
            return (
              <g key={ent.id} onMouseDown={e => { e.stopPropagation(); handleMouseDown(ent.id, e); }} style={{ cursor: 'grab' }}>
                <rect x={ent.x} y={ent.y} width={ENTITY_W} height={h} rx={4}
                  className={`fill-card stroke-border ${isSel ? 'stroke-primary stroke-[1.5]' : ''}`} />
                <rect x={ent.x} y={ent.y} width={ENTITY_W} height={HEADER_H} rx={4}
                  className="fill-primary/10" />
                <rect x={ent.x} y={ent.y + HEADER_H - 4} width={ENTITY_W} height={4} className="fill-primary/10" />
                <text x={ent.x + 8} y={ent.y + 16} className="fill-primary text-[11px] font-bold" style={{ fontFamily: 'monospace' }}>{ent.name}</text>
                {ent.columns.map((col, ci) => (
                  <g key={ci}>
                    <text x={ent.x + 8} y={ent.y + HEADER_H + ci * COL_H + 12} className="fill-foreground text-[10px]" style={{ fontFamily: 'monospace' }}>
                      {col.pk ? '🔑 ' : col.fk ? '→ ' : '  '}{col.name}
                    </text>
                    <text x={ent.x + ENTITY_W - 8} y={ent.y + HEADER_H + ci * COL_H + 12} textAnchor="end" className="fill-muted-foreground text-[9px]" style={{ fontFamily: 'monospace' }}>
                      {col.type}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Side panel */}
      {selectedEntity && (
        <div className="w-52 border-l border-border flex flex-col">
          <div className="p-2 border-b border-border">
            <span className="font-display text-[9px] tracking-wider uppercase text-primary">Entity Details</span>
          </div>
          <ScrollArea className="flex-1 p-2">
            <div className="text-[10px] text-foreground font-bold mb-2">{selectedEntity.name}</div>
            {selectedEntity.columns.map((col, i) => (
              <div key={i} className="flex items-center justify-between py-0.5 border-b border-border/30">
                <span className="text-[10px] text-muted-foreground">{col.pk ? '🔑 ' : ''}{col.name}</span>
                <span className="text-[9px] text-muted-foreground/60">{col.type}</span>
              </div>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
