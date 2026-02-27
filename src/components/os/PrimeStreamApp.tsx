import { useState, useEffect, useRef } from 'react';
import { Radio, Pause, Play, Filter, Activity, Database, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Pipeline {
  id: string;
  name: string;
  table: string;
  eventsPerSec: number;
  latencyMs: number;
  schema: { field: string; type: string }[];
}

interface StreamRow {
  id: string;
  timestamp: string;
  data: Record<string, string | number>;
  source: 'realtime' | 'simulated';
}

const PIPELINES: Pipeline[] = [
  { id: 'social', name: 'Social Feed', table: 'social_posts', eventsPerSec: 0, latencyMs: 0, schema: [{ field: 'author', type: 'string' }, { field: 'content', type: 'text' }, { field: 'likes', type: 'int' }, { field: 'ts', type: 'timestamp' }] },
  { id: 'chat', name: 'Chat Messages', table: 'chat_messages', eventsPerSec: 0, latencyMs: 0, schema: [{ field: 'username', type: 'string' }, { field: 'content', type: 'text' }, { field: 'channel', type: 'string' }, { field: 'ts', type: 'timestamp' }] },
  { id: 'activity', name: 'User Activity', table: 'user_activity', eventsPerSec: 0, latencyMs: 0, schema: [{ field: 'action', type: 'string' }, { field: 'target', type: 'string' }, { field: 'ts', type: 'timestamp' }] },
  { id: 'calendar', name: 'Calendar Events', table: 'calendar_events', eventsPerSec: 0, latencyMs: 0, schema: [{ field: 'title', type: 'string' }, { field: 'start_time', type: 'timestamp' }, { field: 'color', type: 'string' }] },
  { id: 'emails', name: 'Mail Stream', table: 'user_emails', eventsPerSec: 0, latencyMs: 0, schema: [{ field: 'from_address', type: 'string' }, { field: 'subject', type: 'string' }, { field: 'folder', type: 'string' }, { field: 'ts', type: 'timestamp' }] },
];

export default function PrimeStreamApp() {
  const [selectedPipeline, setSelectedPipeline] = useState(PIPELINES[0]);
  const [rows, setRows] = useState<StreamRow[]>([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const [showSchema, setShowSchema] = useState(false);
  const [metrics, setMetrics] = useState({ total: 0, realtime: 0, latency: 0 });
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<any>(null);

  // Load initial data from the selected table
  useEffect(() => {
    setRows([]);
    setConnected(false);
    setMetrics({ total: 0, realtime: 0, latency: 0 });

    const loadInitial = async () => {
      const { data } = await supabase
        .from(selectedPipeline.table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (data) {
        const mapped = data.map((row: any) => mapRowToStream(row, selectedPipeline));
        setRows(mapped);
        setMetrics(m => ({ ...m, total: mapped.length }));
      }
    };
    loadInitial();
  }, [selectedPipeline]);

  // Subscribe to Realtime changes
  useEffect(() => {
    if (paused) return;

    channelRef.current = supabase
      .channel(`stream-${selectedPipeline.table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: selectedPipeline.table },
        (payload) => {
          const start = performance.now();
          const row = mapRowToStream(payload.new as any, selectedPipeline, 'realtime');
          const latency = +(performance.now() - start).toFixed(1);
          setRows(prev => [row, ...prev].slice(0, 50));
          setMetrics(m => ({ total: m.total + 1, realtime: m.realtime + 1, latency }));
          setConnected(true);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnected(true);
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [selectedPipeline, paused]);

  const filteredRows = filter
    ? rows.filter(r => JSON.stringify(r.data).toLowerCase().includes(filter.toLowerCase()))
    : rows;

  return (
    <div className="h-full flex bg-background text-foreground font-mono text-xs">
      {/* Pipeline List */}
      <div className="w-44 shrink-0 border-r border-border flex flex-col">
        <div className="px-2 py-1.5 border-b border-border flex items-center gap-1">
          <Radio size={12} className="text-primary" />
          <span className="font-display text-[9px] tracking-wider text-primary">REALTIME STREAMS</span>
        </div>
        <div className="flex-1 overflow-auto p-1 space-y-0.5">
          {PIPELINES.map(p => (
            <button key={p.id} onClick={() => setSelectedPipeline(p)} className={`w-full text-left px-2 py-1.5 rounded text-[9px] transition-colors ${selectedPipeline.id === p.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
              <div className="flex items-center gap-1">
                <Database size={8} className="text-primary shrink-0" />
                {p.name}
              </div>
              <div className="text-[8px] text-muted-foreground mt-0.5">{p.table}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Metrics bar */}
        <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border">
          <div className="flex items-center gap-1">
            <Wifi size={10} className={connected ? 'text-prime-green' : 'text-muted-foreground'} />
            <span className="text-[9px]" style={{ color: connected ? 'hsl(var(--prime-green))' : undefined }}>
              {connected ? 'LIVE' : 'CONNECTING'}
            </span>
          </div>
          <div className="flex items-center gap-1"><Activity size={10} className="text-primary" /><span className="text-muted-foreground">Total:</span><span className="text-foreground font-bold">{metrics.total}</span></div>
          <div className="flex items-center gap-1"><span className="text-muted-foreground">Realtime:</span><span className="text-prime-green">{metrics.realtime}</span></div>
          <div className="flex items-center gap-1"><span className="text-muted-foreground">Latency:</span><span className="text-foreground">{metrics.latency}ms</span></div>
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
            <p className="text-[9px] text-muted-foreground mb-2">SCHEMA — {selectedPipeline.name} ({selectedPipeline.table})</p>
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
                  <th className="px-2 py-1 text-left text-[8px] text-muted-foreground font-normal">SRC</th>
                  <th className="px-2 py-1 text-left text-[8px] text-muted-foreground font-normal">TIME</th>
                  {selectedPipeline.schema.filter(f => f.type !== 'timestamp').map(f => (
                    <th key={f.field} className="px-2 py-1 text-left text-[8px] text-muted-foreground font-normal">{f.field.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr key={r.id} className="border-b border-border/30 hover:bg-muted/20" style={{ opacity: Math.max(0.3, 1 - i * 0.015) }}>
                    <td className="px-2 py-0.5">
                      <span className={`text-[7px] px-1 py-0.5 rounded ${r.source === 'realtime' ? 'bg-prime-green/20 text-prime-green' : 'bg-muted text-muted-foreground'}`}>
                        {r.source === 'realtime' ? 'RT' : 'DB'}
                      </span>
                    </td>
                    <td className="px-2 py-0.5 text-[9px] text-muted-foreground">{r.timestamp}</td>
                    {selectedPipeline.schema.filter(f => f.type !== 'timestamp').map(f => (
                      <td key={f.field} className="px-2 py-0.5 text-[9px] text-foreground max-w-[200px] truncate">{String(r.data[f.field] ?? '')}</td>
                    ))}
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground text-[10px]">No data yet. Interact with {selectedPipeline.name} to see events here.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function mapRowToStream(row: any, pipeline: Pipeline, source: 'realtime' | 'simulated' = 'simulated'): StreamRow {
  if (!row) return { id: Date.now().toString(), timestamp: '', data: {}, source };
  const ts = row.created_at || row.start_time || '';
  const timestamp = ts ? new Date(ts).toLocaleTimeString('en-US', { hour12: false }) : '';
  const data: Record<string, string | number> = {};
  for (const f of pipeline.schema) {
    if (f.type === 'timestamp') continue;
    const val = row[f.field];
    if (val !== undefined && val !== null) {
      data[f.field] = typeof val === 'string' && val.length > 80 ? val.slice(0, 77) + '...' : val;
    } else {
      data[f.field] = '';
    }
  }
  return { id: row.id || `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp, data, source };
}
