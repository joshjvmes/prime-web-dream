import { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, Pause, Play, Filter, AlertTriangle, Activity } from 'lucide-react';

interface Pipeline {
  id: string;
  name: string;
  eventsPerSec: number;
  latencyMs: number;
  errorRate: number;
  schema: { field: string; type: string }[];
}

interface StreamRow {
  id: string;
  timestamp: string;
  data: Record<string, string | number>;
  age: number;
}

const PIPELINES: Pipeline[] = [
  { id: 'p1', name: 'Lattice Telemetry', eventsPerSec: 1240, latencyMs: 0.8, errorRate: 0.02, schema: [{ field: 'node_id', type: 'string' }, { field: 'coord', type: 'vec3' }, { field: 'load', type: 'float' }, { field: 'state', type: 'qutrit' }, { field: 'ts', type: 'timestamp' }] },
  { id: 'p2', name: 'Qutrit State Stream', eventsPerSec: 890, latencyMs: 1.2, errorRate: 0.01, schema: [{ field: 'qutrit_id', type: 'string' }, { field: 'state', type: 'int(0-2)' }, { field: 'potential', type: 'float' }, { field: 'ts', type: 'timestamp' }] },
  { id: 'p3', name: 'Energy Flow', eventsPerSec: 420, latencyMs: 2.1, errorRate: 0.05, schema: [{ field: 'mode', type: 'string' }, { field: 'cop', type: 'float' }, { field: 'input_w', type: 'float' }, { field: 'output_w', type: 'float' }, { field: 'ts', type: 'timestamp' }] },
  { id: 'p4', name: 'Network Packets', eventsPerSec: 2100, latencyMs: 0.3, errorRate: 0.001, schema: [{ field: 'src', type: 'addr' }, { field: 'dst', type: 'addr' }, { field: 'size', type: 'int' }, { field: 'hops', type: 'int' }, { field: 'ts', type: 'timestamp' }] },
];

function generateRow(pipeline: Pipeline): StreamRow {
  const now = new Date();
  const data: Record<string, string | number> = {};
  for (const f of pipeline.schema) {
    switch (f.type) {
      case 'string': case 'addr': data[f.field] = `${f.field.slice(0, 3)}-${Math.random().toString(36).slice(2, 6)}`; break;
      case 'vec3': data[f.field] = `⟨${Math.floor(Math.random() * 100)},${Math.floor(Math.random() * 100)},${Math.floor(Math.random() * 100)}⟩`; break;
      case 'float': data[f.field] = +(Math.random() * 100).toFixed(2); break;
      case 'int': case 'int(0-2)': data[f.field] = Math.floor(Math.random() * (f.type.includes('0-2') ? 3 : 1500)); break;
      case 'qutrit': data[f.field] = `|${Math.floor(Math.random() * 3)}⟩`; break;
      case 'timestamp': data[f.field] = now.toISOString().slice(11, 23); break;
    }
  }
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: now.toISOString().slice(11, 23), data, age: 0 };
}

export default function PrimeStreamApp() {
  const [selectedPipeline, setSelectedPipeline] = useState(PIPELINES[0]);
  const [rows, setRows] = useState<StreamRow[]>([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const [showSchema, setShowSchema] = useState(false);
  const [metrics, setMetrics] = useState({ eps: 0, lat: 0, err: 0 });
  const countRef = useRef(0);

  useEffect(() => {
    setRows([]);
    countRef.current = 0;
  }, [selectedPipeline]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      countRef.current++;
      const newRow = generateRow(selectedPipeline);
      setRows(prev => [newRow, ...prev].slice(0, 50));
      setMetrics({
        eps: selectedPipeline.eventsPerSec + Math.floor((Math.random() - 0.5) * 100),
        lat: +(selectedPipeline.latencyMs + (Math.random() - 0.5) * 0.4).toFixed(2),
        err: +(selectedPipeline.errorRate + (Math.random() - 0.5) * 0.01).toFixed(3),
      });
    }, 400);
    return () => clearInterval(id);
  }, [selectedPipeline, paused]);

  const filteredRows = filter ? rows.filter(r => JSON.stringify(r.data).toLowerCase().includes(filter.toLowerCase())) : rows;

  return (
    <div className="h-full flex bg-background text-foreground font-mono text-xs">
      {/* Pipeline List */}
      <div className="w-44 shrink-0 border-r border-border flex flex-col">
        <div className="px-2 py-1.5 border-b border-border flex items-center gap-1">
          <Radio size={12} className="text-primary" />
          <span className="font-display text-[9px] tracking-wider text-primary">PIPELINES</span>
        </div>
        <div className="flex-1 overflow-auto p-1 space-y-0.5">
          {PIPELINES.map(p => (
            <button key={p.id} onClick={() => setSelectedPipeline(p)} className={`w-full text-left px-2 py-1.5 rounded text-[9px] transition-colors ${selectedPipeline.id === p.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {p.name}
              </div>
              <div className="text-[8px] text-muted-foreground mt-0.5">{p.eventsPerSec} evt/s</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Metrics bar */}
        <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border">
          <div className="flex items-center gap-1"><Activity size={10} className="text-primary" /><span className="text-muted-foreground">Events/s:</span><span className="text-foreground font-bold">{metrics.eps.toLocaleString()}</span></div>
          <div className="flex items-center gap-1"><span className="text-muted-foreground">Latency:</span><span className="text-foreground">{metrics.lat}ms</span></div>
          <div className="flex items-center gap-1"><span className="text-muted-foreground">Errors:</span><span className={metrics.err > 0.03 ? 'text-destructive' : 'text-foreground'}>{(metrics.err * 100).toFixed(1)}%</span></div>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setShowSchema(!showSchema)} className={`px-1.5 py-0.5 rounded text-[8px] ${showSchema ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>Schema</button>
            <button onClick={() => setPaused(!paused)} className="p-1 rounded hover:bg-muted text-muted-foreground">
              {paused ? <Play size={12} /> : <Pause size={12} />}
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1 px-3 py-1 border-b border-border">
          <Filter size={10} className="text-muted-foreground" />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter stream..." className="flex-1 bg-transparent text-[10px] text-foreground outline-none placeholder:text-muted-foreground" />
        </div>

        {showSchema ? (
          <div className="flex-1 overflow-auto p-3">
            <p className="text-[9px] text-muted-foreground mb-2">SCHEMA — {selectedPipeline.name}</p>
            <div className="border border-border rounded">
              {selectedPipeline.schema.map((f, i) => (
                <div key={f.field} className={`flex items-center gap-3 px-3 py-1.5 text-[9px] ${i < selectedPipeline.schema.length - 1 ? 'border-b border-border/50' : ''}`}>
                  <span className="text-foreground font-bold w-24">{f.field}</span>
                  <span className="text-primary">{f.type}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-2 py-1 text-left text-[8px] text-muted-foreground font-normal">TIME</th>
                  {selectedPipeline.schema.filter(f => f.type !== 'timestamp').map(f => (
                    <th key={f.field} className="px-2 py-1 text-left text-[8px] text-muted-foreground font-normal">{f.field.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr key={r.id} className="border-b border-border/30 hover:bg-muted/20" style={{ opacity: Math.max(0.3, 1 - i * 0.015) }}>
                    <td className="px-2 py-0.5 text-[9px] text-muted-foreground">{r.timestamp}</td>
                    {selectedPipeline.schema.filter(f => f.type !== 'timestamp').map(f => (
                      <td key={f.field} className="px-2 py-0.5 text-[9px] text-foreground">{String(r.data[f.field])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
