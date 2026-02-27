import { useState, useEffect, useCallback } from 'react';
import { Server, Thermometer, Cpu, HardDrive, RefreshCw, ArrowRightLeft, Search, X, MapPin, LayoutGrid, Database, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface ServerNode {
  id: string;
  hostname: string;
  coord: string;
  rack: number;
  slot: number;
  status: 'online' | 'high-load' | 'critical' | 'offline';
  temp: number;
  cpu: number;
  memory: number;
  uptime: number;
  processes: string[];
  connections: number;
  loadHistory: number[];
  realData?: { table?: string; rowCount?: number };
}

// Map real tables to "server nodes"
const TABLE_NODE_MAP: Record<string, string> = {
  'calendar_events': 'node-alpha',
  'chat_messages': 'node-beta',
  'file_metadata': 'node-gamma',
  'social_posts': 'node-delta',
  'user_emails': 'node-epsilon',
  'bot_registry': 'node-zeta',
  'agent_tasks': 'node-eta',
  'vault_holdings': 'node-theta',
  'bookings': 'node-iota',
  'cloud_hooks': 'node-kappa',
  'wallets': 'node-lambda',
  'ai_conversations': 'node-mu',
  'ai_memories': 'node-nu',
};

const HOSTNAMES = [
  'node-alpha', 'node-beta', 'node-gamma', 'node-delta', 'node-epsilon', 'node-zeta',
  'node-eta', 'node-theta', 'node-iota', 'node-kappa', 'node-lambda', 'node-mu',
  'node-nu', 'node-xi', 'node-omicron', 'node-pi', 'node-rho', 'node-sigma',
  'node-tau', 'node-upsilon', 'node-phi', 'node-chi', 'node-psi', 'node-omega',
];
const PRIMES = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89];
const PROCESSES = ['qk-scheduler','pfs-daemon','net-flow','gc-evap','gfo-handler','q3-engine','energy-harv','fold-compact','adinkra-enc','lattice-sync'];

function initNodes(): ServerNode[] {
  const nodes: ServerNode[] = [];
  const tableEntries = Object.entries(TABLE_NODE_MAP);
  for (let rack = 0; rack < 4; rack++) {
    for (let slot = 0; slot < 6; slot++) {
      const idx = rack * 6 + slot;
      const tableEntry = tableEntries[idx];
      nodes.push({
        id: `r${rack}s${slot}`,
        hostname: HOSTNAMES[idx] || `node-${idx}`,
        coord: `⟨${PRIMES[idx]},${PRIMES[(idx+1)%24]},${PRIMES[(idx+2)%24]}⟩`,
        rack, slot,
        status: 'online',
        temp: 45 + Math.floor(Math.random() * 25),
        cpu: Math.floor(Math.random() * 60 + 10),
        memory: Math.floor(Math.random() * 50 + 20),
        uptime: Math.floor(Math.random() * 72000 + 3600),
        processes: PROCESSES.slice(0, Math.floor(Math.random() * 5 + 3)),
        connections: Math.floor(Math.random() * 20 + 2),
        loadHistory: Array.from({ length: 20 }, () => Math.floor(Math.random() * 80 + 10)),
        realData: tableEntry ? { table: tableEntry[0], rowCount: 0 } : undefined,
      });
    }
  }
  return nodes;
}

type AlertSeverity = 'info' | 'warning' | 'critical';
interface Alert { id: string; message: string; severity: AlertSeverity; time: string; }

function statusColor(s: string) {
  switch (s) {
    case 'online': return 'bg-prime-green/70 border-prime-green/40';
    case 'high-load': return 'bg-prime-amber/70 border-prime-amber/40';
    case 'critical': return 'bg-destructive/70 border-destructive/40';
    default: return 'bg-muted/40 border-border';
  }
}

function tempColor(t: number) {
  if (t < 50) return 'text-prime-green';
  if (t < 65) return 'text-prime-amber';
  return 'text-destructive';
}

function MiniSparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const w = 100; const h = 20;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-5">
      <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.7" />
    </svg>
  );
}

export default function DataCenterApp() {
  const [nodes, setNodes] = useState<ServerNode[]>(initNodes);
  const [selected, setSelected] = useState<ServerNode | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [realStats, setRealStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch real analytics on mount
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('system-analytics', {
          body: { action: 'edge-function-stats' },
        });
        if (!error && data) {
          setRealStats(data);
          // Update nodes with real row counts
          setNodes(prev => prev.map(n => {
            if (n.realData?.table && data.tableCounts) {
              const count = data.tableCounts[n.realData.table] || 0;
              return {
                ...n,
                realData: { ...n.realData, rowCount: count },
                // Scale CPU based on activity volume
                cpu: Math.min(95, 10 + count * 3),
                connections: count,
              };
            }
            return n;
          }));
          // Convert real activity to alerts
          if (data.activityByTarget) {
            const realAlerts: Alert[] = Object.entries(data.activityByTarget)
              .slice(0, 10)
              .map(([target, count]) => ({
                id: `real-${target}`,
                message: `${target}: ${count} operations recorded`,
                severity: (count as number) > 20 ? 'warning' as AlertSeverity : 'info' as AlertSeverity,
                time: new Date().toLocaleTimeString('en-US', { hour12: false }),
              }));
            setAlerts(realAlerts);
          }
        }
      } catch {}
      setLoading(false);
    };
    fetchStats();
  }, []);

  // Live metric fluctuations
  useEffect(() => {
    const id = setInterval(() => {
      setNodes(prev => prev.map(n => {
        if (n.status === 'offline') return n;
        const cpu = Math.max(5, Math.min(99, n.cpu + Math.floor(Math.random() * 11 - 5)));
        const temp = Math.max(35, Math.min(85, n.temp + Math.floor(Math.random() * 5 - 2)));
        const memory = Math.max(10, Math.min(95, n.memory + Math.floor(Math.random() * 5 - 2)));
        const status = temp > 75 || cpu > 90 ? 'critical' : cpu > 70 ? 'high-load' : 'online';
        return { ...n, cpu, temp, memory, status, uptime: n.uptime + 2, loadHistory: [...n.loadHistory.slice(1), cpu] };
      }));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (selected) {
      const updated = nodes.find(n => n.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [nodes, selected]);

  const restartNode = useCallback((id: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, status: 'offline' as const, cpu: 0, temp: 20, memory: 0 } : n));
    setTimeout(() => setNodes(prev => prev.map(n => n.id === id ? { ...n, status: 'online' as const, cpu: 15, temp: 42, memory: 25, uptime: 0 } : n)), 3000);
  }, []);

  const onlineCount = nodes.filter(n => n.status !== 'offline').length;
  const avgTemp = Math.round(nodes.filter(n => n.status !== 'offline').reduce((a, n) => a + n.temp, 0) / Math.max(onlineCount, 1));
  const totalCpu = Math.round(nodes.filter(n => n.status !== 'offline').reduce((a, n) => a + n.cpu, 0) / Math.max(onlineCount, 1));
  const formatUptime = (s: number) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return `${h}h ${m}m`; };

  return (
    <div className="flex flex-col h-full bg-background font-mono text-xs">
      <div className="flex items-center gap-4 px-3 py-2 border-b border-border bg-card/30">
        <div className="flex items-center gap-1.5">
          <Server size={12} className="text-primary" />
          <span className="font-display text-[9px] tracking-wider text-primary">LATTICE CORE</span>
          {loading && <Loader2 size={10} className="animate-spin text-primary" />}
        </div>
        <div className="flex items-center gap-3 ml-auto text-[9px] text-muted-foreground">
          {realStats && <span className="text-primary"><Database size={10} className="inline" /> {realStats.totalActivity} ops</span>}
          <span><span className="text-prime-green">●</span> {onlineCount}/24 online</span>
          <span><Thermometer size={10} className="inline" /> {avgTemp}°C avg</span>
          <span><Cpu size={10} className="inline" /> {totalCpu}% avg</span>
          <button onClick={() => setView(view === 'grid' ? 'map' : 'grid')} className="p-1 hover:text-primary transition-colors">
            {view === 'grid' ? <MapPin size={12} /> : <LayoutGrid size={12} />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-3">
            {view === 'grid' ? (
              <div className="grid grid-cols-4 gap-3">
                {[0,1,2,3].map(rack => (
                  <div key={rack} className="border border-border rounded p-2 bg-card/20">
                    <p className="text-[8px] text-muted-foreground mb-1.5 text-center">Rack {rack}</p>
                    <div className="space-y-1">
                      {nodes.filter(n => n.rack === rack).map(n => (
                        <button key={n.id} onClick={() => setSelected(n)} className={`w-full flex items-center gap-1 p-1 rounded border text-[8px] transition-colors hover:border-primary/40 ${statusColor(n.status)} ${selected?.id === n.id ? 'ring-1 ring-primary' : ''}`}>
                          <span className="truncate text-foreground">{n.hostname.replace('node-', '')}</span>
                          {n.realData && <Database size={7} className="text-primary shrink-0" />}
                          <span className="ml-auto text-muted-foreground">{n.cpu}%</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative w-full h-full min-h-[250px]">
                <svg viewBox="0 0 400 250" className="w-full h-full">
                  {nodes.filter(n => n.status !== 'offline').map((n, i) => {
                    const x = 40 + (i % 6) * 55;
                    const y = 30 + Math.floor(i / 6) * 55;
                    const next = nodes.filter(nn => nn.status !== 'offline')[(i + 1) % nodes.filter(nn => nn.status !== 'offline').length];
                    const nx = 40 + (nodes.indexOf(next) % 6) * 55;
                    const ny = 30 + Math.floor(nodes.indexOf(next) / 6) * 55;
                    return <line key={`l-${n.id}`} x1={x} y1={y} x2={nx} y2={ny} stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.15" />;
                  })}
                  {nodes.map((n, i) => {
                    const x = 40 + (i % 6) * 55;
                    const y = 30 + Math.floor(i / 6) * 55;
                    const fill = n.status === 'online' ? 'hsl(var(--prime-green))' : n.status === 'high-load' ? 'hsl(var(--prime-amber))' : n.status === 'critical' ? 'hsl(0,70%,50%)' : 'hsl(var(--muted))';
                    return (
                      <g key={n.id} onClick={() => setSelected(n)} className="cursor-pointer">
                        <circle cx={x} cy={y} r={8} fill={fill} opacity={0.7} stroke={selected?.id === n.id ? 'hsl(var(--primary))' : 'none'} strokeWidth="2" />
                        <text x={x} y={y + 16} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="6">{n.hostname.replace('node-', '')}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>

          {/* Alert feed */}
          <div className="border-t border-border h-24 overflow-hidden">
            <div className="px-3 py-1 border-b border-border/50 text-[8px] text-muted-foreground">
              Alert Feed {realStats ? '(Live Data)' : ''}
            </div>
            <ScrollArea className="h-[calc(100%-20px)]">
              <div className="px-3 py-1 space-y-0.5">
                {alerts.map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-[9px]">
                    <span className="text-muted-foreground/50 w-14 shrink-0">{a.time}</span>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.severity === 'critical' ? 'bg-destructive' : a.severity === 'warning' ? 'bg-prime-amber' : 'bg-prime-green'}`} />
                    <span className="text-muted-foreground truncate">{a.message}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Detail sidebar */}
        {selected && (
          <div className="w-56 border-l border-border bg-card/20 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="font-display text-[9px] tracking-wider text-primary">{selected.hostname}</span>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {selected.realData?.table && (
                  <div className="border border-primary/30 rounded p-2 bg-primary/5">
                    <p className="text-[8px] text-primary font-display tracking-wider">LIVE DATA SOURCE</p>
                    <p className="text-[10px] text-foreground mt-0.5">{selected.realData.table}</p>
                    <p className="text-[9px] text-muted-foreground">{selected.realData.rowCount} rows</p>
                  </div>
                )}
                <div>
                  <p className="text-[8px] text-muted-foreground">Coordinate</p>
                  <p className="text-[10px] text-foreground">{selected.coord}</p>
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground">Status</p>
                  <p className={`text-[10px] ${selected.status === 'online' ? 'text-prime-green' : selected.status === 'critical' ? 'text-destructive' : 'text-prime-amber'}`}>{selected.status}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-[8px] text-muted-foreground">CPU</p><p className="text-[10px] text-foreground">{selected.cpu}%</p></div>
                  <div><p className="text-[8px] text-muted-foreground">Memory</p><p className="text-[10px] text-foreground">{selected.memory}%</p></div>
                  <div><p className="text-[8px] text-muted-foreground">Temp</p><p className={`text-[10px] ${tempColor(selected.temp)}`}>{selected.temp}°C</p></div>
                  <div><p className="text-[8px] text-muted-foreground">Uptime</p><p className="text-[10px] text-foreground">{formatUptime(selected.uptime)}</p></div>
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground mb-1">Load History</p>
                  <MiniSparkline data={selected.loadHistory} />
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground mb-1">Processes ({selected.processes.length})</p>
                  {selected.processes.map(p => (<p key={p} className="text-[9px] text-foreground/70">{p}</p>))}
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground">Connections: {selected.connections}</p>
                  <p className="text-[8px] text-muted-foreground">OS: QK v2.0</p>
                </div>
                <div className="flex flex-col gap-1 pt-1">
                  <button onClick={() => restartNode(selected.id)} className="flex items-center gap-1 px-2 py-1 text-[9px] border border-border rounded hover:bg-primary/10 hover:text-primary transition-colors">
                    <RefreshCw size={10} /> Restart
                  </button>
                  <button className="flex items-center gap-1 px-2 py-1 text-[9px] border border-border rounded hover:bg-primary/10 hover:text-primary transition-colors">
                    <ArrowRightLeft size={10} /> Migrate
                  </button>
                  <button className="flex items-center gap-1 px-2 py-1 text-[9px] border border-border rounded hover:bg-primary/10 hover:text-primary transition-colors">
                    <Search size={10} /> Diagnostics
                  </button>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
