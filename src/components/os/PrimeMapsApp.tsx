import { useState, useCallback, useRef } from 'react';
import { Search, Layers } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MapNode {
  id: string;
  label: string;
  coord: string;
  x: number;
  y: number;
  load: number;
  connections: string[];
}

const NODES: MapNode[] = [
  { id: 'n1', label: 'Σ-Alpha', coord: '⟨2,3,5⟩', x: 200, y: 150, load: 0.78, connections: ['n2', 'n3', 'n6'] },
  { id: 'n2', label: 'Σ-Beta', coord: '⟨7,11,13⟩', x: 400, y: 100, load: 0.65, connections: ['n1', 'n4'] },
  { id: 'n3', label: 'Σ-Gamma', coord: '⟨17,19,23⟩', x: 150, y: 300, load: 0.42, connections: ['n1', 'n5'] },
  { id: 'n4', label: 'Σ-Delta', coord: '⟨29,31,37⟩', x: 500, y: 250, load: 0.91, connections: ['n2', 'n5', 'n6'] },
  { id: 'n5', label: 'Σ-Epsilon', coord: '⟨41,43,47⟩', x: 350, y: 350, load: 0.55, connections: ['n3', 'n4'] },
  { id: 'n6', label: 'Σ-Zeta', coord: '⟨53,59,61⟩', x: 550, y: 150, load: 0.33, connections: ['n1', 'n4'] },
  { id: 'n7', label: 'Σ-Eta', coord: '⟨67,71,73⟩', x: 100, y: 180, load: 0.72, connections: ['n3'] },
  { id: 'n8', label: 'Σ-Theta', coord: '⟨79,83,89⟩', x: 450, y: 380, load: 0.48, connections: ['n5', 'n4'] },
];

function loadColor(load: number): string {
  if (load > 0.8) return 'hsl(0, 70%, 50%)';
  if (load > 0.6) return 'hsl(45, 90%, 50%)';
  return 'hsl(140, 60%, 45%)';
}

export default function PrimeMapsApp() {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [layers, setLayers] = useState({ nodes: true, edges: true, labels: true, heatmap: false });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const selectedNode = NODES.find(n => n.id === selected);
  const filteredIds = search ? NODES.filter(n => n.label.toLowerCase().includes(search.toLowerCase())).map(n => n.id) : null;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'rect') {
      setDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  return (
    <div className="flex h-full bg-background font-mono text-xs">
      {/* Map */}
      <div className="flex-1 flex flex-col">
        <div className="h-8 border-b border-border flex items-center px-3 gap-2">
          <Search size={10} className="text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="bg-transparent text-[10px] flex-1 outline-none placeholder:text-muted-foreground/50"
          />
          <div className="flex items-center gap-1 ml-2">
            <Layers size={10} className="text-muted-foreground" />
            {Object.entries(layers).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setLayers(l => ({ ...l, [key]: !val }))}
                className={`text-[8px] px-1 py-0.5 rounded ${val ? 'bg-primary/15 text-primary' : 'text-muted-foreground/50'}`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <svg
          ref={svgRef}
          className="flex-1 w-full"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setDragging(false)}
          onMouseLeave={() => setDragging(false)}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {layers.edges && NODES.map(node =>
              node.connections.map(cid => {
                const target = NODES.find(n => n.id === cid);
                if (!target || node.id > cid) return null;
                return (
                  <line key={`${node.id}-${cid}`}
                    x1={node.x} y1={node.y} x2={target.x} y2={target.y}
                    className="stroke-border" strokeWidth={1} strokeDasharray="3 3"
                  />
                );
              })
            )}

            {/* Heat map circles */}
            {layers.heatmap && NODES.map(node => (
              <circle key={`heat-${node.id}`} cx={node.x} cy={node.y} r={40}
                fill={loadColor(node.load)} opacity={0.15}
              />
            ))}

            {/* Nodes */}
            {layers.nodes && NODES.map(node => {
              const highlighted = filteredIds === null || filteredIds.includes(node.id);
              const isSel = selected === node.id;
              return (
                <g key={node.id} onClick={e => { e.stopPropagation(); setSelected(node.id); }} style={{ cursor: 'pointer' }}>
                  <circle cx={node.x} cy={node.y} r={isSel ? 14 : 10}
                    fill={loadColor(node.load)}
                    opacity={highlighted ? 1 : 0.3}
                    stroke={isSel ? 'hsl(var(--primary))' : 'none'}
                    strokeWidth={2}
                  />
                  {layers.labels && (
                    <text x={node.x} y={node.y - 16} textAnchor="middle"
                      className="fill-foreground text-[9px]" style={{ fontFamily: 'monospace' }}
                      opacity={highlighted ? 1 : 0.3}
                    >
                      {node.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Legend */}
          <g transform="translate(10, 10)">
            <rect width="80" height="50" rx="4" className="fill-card/80 stroke-border" />
            <circle cx={12} cy={14} r={4} fill="hsl(140, 60%, 45%)" />
            <text x={20} y={17} className="fill-muted-foreground text-[7px]" style={{ fontFamily: 'monospace' }}>Low (&lt;60%)</text>
            <circle cx={12} cy={28} r={4} fill="hsl(45, 90%, 50%)" />
            <text x={20} y={31} className="fill-muted-foreground text-[7px]" style={{ fontFamily: 'monospace' }}>Med (60-80%)</text>
            <circle cx={12} cy={42} r={4} fill="hsl(0, 70%, 50%)" />
            <text x={20} y={45} className="fill-muted-foreground text-[7px]" style={{ fontFamily: 'monospace' }}>High (&gt;80%)</text>
          </g>
        </svg>
      </div>

      {/* Detail panel */}
      {selectedNode && (
        <div className="w-48 border-l border-border flex flex-col">
          <div className="p-2 border-b border-border">
            <span className="font-display text-[9px] tracking-wider uppercase text-primary">Node Detail</span>
          </div>
          <ScrollArea className="flex-1 p-2">
            <div className="text-[11px] text-foreground font-bold mb-1">{selectedNode.label}</div>
            <div className="text-[9px] text-muted-foreground mb-2">{selectedNode.coord}</div>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between"><span className="text-muted-foreground">Load</span><span className="text-foreground">{(selectedNode.load * 100).toFixed(0)}%</span></div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${selectedNode.load * 100}%`, backgroundColor: loadColor(selectedNode.load) }} />
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Position</span><span className="text-foreground">{selectedNode.x}, {selectedNode.y}</span></div>
              <div className="mt-2">
                <span className="text-muted-foreground">Connections:</span>
                <div className="mt-1 flex flex-col gap-0.5">
                  {selectedNode.connections.map(cid => {
                    const cn = NODES.find(n => n.id === cid);
                    return cn ? (
                      <button key={cid} onClick={() => setSelected(cid)} className="text-[9px] text-primary hover:underline text-left">{cn.label}</button>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
