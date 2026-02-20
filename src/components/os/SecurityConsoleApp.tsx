import { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Scan, Wifi, Lock } from 'lucide-react';

interface ThreatEvent {
  id: string;
  time: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

interface FirewallRule {
  id: string;
  action: 'allow' | 'deny';
  source: string;
  destination: string;
  enabled: boolean;
}

interface ActiveConnection {
  id: string;
  node: string;
  coord: string;
  encrypted: boolean;
  status: 'active' | 'idle';
}

const THREAT_MESSAGES: { msg: string; severity: 'low' | 'medium' | 'high' }[] = [
  { msg: 'Lattice integrity verified: sector 7', severity: 'low' },
  { msg: 'Coordinate handshake completed: node-04 ↔ node-07', severity: 'low' },
  { msg: 'Routine geodesic path audit passed', severity: 'low' },
  { msg: 'Unusual qutrit state transition at ⟨41,43,47⟩', severity: 'medium' },
  { msg: 'Elevated packet rate from external coord ⟨97,101,103⟩', severity: 'medium' },
  { msg: 'FoldMem access pattern anomaly in sector 3', severity: 'medium' },
  { msg: 'Unauthorized coordinate probe at ⟨41,43,47⟩', severity: 'high' },
  { msg: 'Brute-force prime factorization attempt blocked', severity: 'high' },
  { msg: 'Lattice breach attempt: dimensional fold injection', severity: 'high' },
];

const SCAN_RESULTS = [
  { item: 'Qutrit core integrity', pass: true },
  { item: 'PrimeNet routing table', pass: true },
  { item: 'FoldMem boundary check', pass: true },
  { item: 'Adinkra encoding validation', pass: true },
  { item: 'Energy coupling isolation', pass: true },
  { item: 'Dimensional fold boundaries', pass: Math.random() > 0.3 },
  { item: 'External coordinate firewall', pass: Math.random() > 0.2 },
  { item: 'Lattice key rotation', pass: true },
];

function makeTime() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function ThreatGauge({ level }: { level: number }) {
  const r = 35;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const pct = Math.min(level / 100, 1);
  const offset = arc * (1 - pct);
  const color = level < 33 ? 'prime-green' : level < 66 ? 'prime-amber' : 'prime-red';
  const label = level < 33 ? 'LOW' : level < 66 ? 'MEDIUM' : 'HIGH';

  return (
    <div className="flex flex-col items-center">
      <svg width="90" height="70" viewBox="0 0 90 80">
        <path d="M 8 62 A 35 35 0 1 1 82 62" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" strokeLinecap="round" />
        <path
          d="M 8 62 A 35 35 0 1 1 82 62" fill="none"
          stroke={`hsl(var(--${color}))`} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={arc} strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
        <text x="45" y="48" textAnchor="middle" fill={`hsl(var(--${color}))`} fontSize="12" fontFamily="var(--font-display)" fontWeight="700">
          {label}
        </text>
      </svg>
      <span className="text-[8px] font-display tracking-wider text-muted-foreground uppercase">Threat Level</span>
    </div>
  );
}

export default function SecurityConsoleApp() {
  const [events, setEvents] = useState<ThreatEvent[]>(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const t = THREAT_MESSAGES[Math.floor(Math.random() * 6)];
      return { id: `init-${i}`, time: makeTime(), message: t.msg, severity: t.severity };
    });
  });
  const [threatLevel, setThreatLevel] = useState(25);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<typeof SCAN_RESULTS | null>(null);
  const [rules, setRules] = useState<FirewallRule[]>([
    { id: '1', action: 'allow', source: '⟨2,3,5⟩', destination: '⟨7,11,13⟩', enabled: true },
    { id: '2', action: 'allow', source: '⟨17,19,23⟩', destination: '*', enabled: true },
    { id: '3', action: 'deny', source: '⟨97,101,103⟩', destination: '*', enabled: true },
    { id: '4', action: 'deny', source: 'external', destination: '⟨41,43,47⟩', enabled: false },
  ]);
  const [connections] = useState<ActiveConnection[]>([
    { id: '1', node: 'node-01', coord: '⟨2,3,5⟩', encrypted: true, status: 'active' },
    { id: '2', node: 'node-04', coord: '⟨17,19,23⟩', encrypted: true, status: 'active' },
    { id: '3', node: 'node-07', coord: '⟨41,43,47⟩', encrypted: true, status: 'idle' },
    { id: '4', node: 'gateway-ext', coord: '⟨97,101,103⟩', encrypted: false, status: 'active' },
  ]);
  const feedRef = useRef<HTMLDivElement>(null);

  // Auto-generate events
  useEffect(() => {
    const id = setInterval(() => {
      const t = THREAT_MESSAGES[Math.floor(Math.random() * THREAT_MESSAGES.length)];
      setEvents(prev => [...prev.slice(-30), { id: Date.now().toString(), time: makeTime(), message: t.msg, severity: t.severity }]);
      setThreatLevel(l => Math.max(5, Math.min(90, l + (Math.random() - 0.45) * 20)));
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [events]);

  const runScan = useCallback(() => {
    if (scanning) return;
    setScanning(true);
    setScanProgress(0);
    setScanResults(null);
    const start = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / 5000, 1);
      setScanProgress(pct * 100);
      if (pct >= 1) {
        clearInterval(iv);
        setScanning(false);
        setScanResults(SCAN_RESULTS.map(r => ({ ...r, pass: r.item === 'Qutrit core integrity' || r.item === 'PrimeNet routing table' ? true : Math.random() > 0.15 })));
      }
    }, 100);
  }, [scanning]);

  const toggleRule = useCallback((id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }, []);

  const sevColor = (s: string) => s === 'high' ? 'text-prime-red' : s === 'medium' ? 'text-prime-amber' : 'text-prime-green';
  const sevBg = (s: string) => s === 'high' ? 'bg-prime-red/10' : s === 'medium' ? 'bg-prime-amber/10' : 'bg-prime-green/10';

  return (
    <div className="h-full flex flex-col bg-background/50 p-3 gap-3 overflow-auto">
      <div className="flex items-center gap-2">
        <Shield size={14} className="text-prime-green" />
        <span className="font-display text-[10px] tracking-[0.2em] uppercase text-prime-green">Lattice Shield</span>
        <span className="ml-auto font-mono text-[9px] text-muted-foreground">ACTIVE</span>
        <span className="w-1.5 h-1.5 rounded-full bg-prime-green animate-pulse" />
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* Threat Feed */}
        <div className="rounded border border-border bg-card/60 flex flex-col overflow-hidden">
          <div className="px-2 py-1.5 border-b border-border flex items-center gap-1.5">
            <AlertTriangle size={10} className="text-prime-amber" />
            <span className="font-display text-[8px] tracking-wider uppercase text-muted-foreground">Threat Feed</span>
          </div>
          <div ref={feedRef} className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {events.map(ev => (
              <div key={ev.id} className={`flex items-start gap-1.5 px-1.5 py-1 rounded text-[9px] font-mono ${sevBg(ev.severity)}`}>
                <span className={`shrink-0 ${sevColor(ev.severity)}`}>
                  {ev.severity === 'high' ? '●' : ev.severity === 'medium' ? '◐' : '○'}
                </span>
                <span className="text-muted-foreground shrink-0">{ev.time}</span>
                <span className={sevColor(ev.severity)}>{ev.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: gauge + scanner */}
        <div className="flex flex-col gap-3">
          {/* Threat Gauge */}
          <div className="rounded border border-border bg-card/60 p-3 flex items-center justify-center">
            <ThreatGauge level={threatLevel} />
          </div>

          {/* Scanner */}
          <div className="rounded border border-border bg-card/60 p-2 flex flex-col gap-2">
            <button
              onClick={runScan}
              disabled={scanning}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-primary/20 border border-primary/40 text-primary text-[10px] font-display tracking-wider uppercase hover:bg-primary/30 disabled:opacity-50 transition-colors"
            >
              <Scan size={10} className={scanning ? 'animate-spin' : ''} />
              {scanning ? 'Scanning...' : 'Run Lattice Scan'}
            </button>
            {scanning && (
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-100 rounded-full"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            )}
            {scanResults && (
              <div className="space-y-0.5">
                {scanResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[9px] font-mono">
                    {r.pass
                      ? <CheckCircle size={9} className="text-prime-green shrink-0" />
                      : <XCircle size={9} className="text-prime-red shrink-0" />
                    }
                    <span className={r.pass ? 'text-muted-foreground' : 'text-prime-red'}>{r.item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Firewall Rules */}
        <div className="rounded border border-border bg-card/60 flex flex-col overflow-hidden">
          <div className="px-2 py-1.5 border-b border-border flex items-center gap-1.5">
            <Shield size={10} className="text-primary" />
            <span className="font-display text-[8px] tracking-wider uppercase text-muted-foreground">Firewall Rules</span>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center gap-2 text-[9px] font-mono">
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`w-7 h-3.5 rounded-full flex items-center transition-colors ${rule.enabled ? 'bg-primary/40 justify-end' : 'bg-muted justify-start'}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full mx-0.5 transition-colors ${rule.enabled ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                </button>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-display uppercase tracking-wider ${
                  rule.action === 'allow' ? 'bg-prime-green/10 text-prime-green' : 'bg-prime-red/10 text-prime-red'
                }`}>
                  {rule.action}
                </span>
                <span className="text-muted-foreground">{rule.source}</span>
                <span className="text-muted-foreground/40">→</span>
                <span className="text-muted-foreground">{rule.destination}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Connections */}
        <div className="rounded border border-border bg-card/60 flex flex-col overflow-hidden">
          <div className="px-2 py-1.5 border-b border-border flex items-center gap-1.5">
            <Wifi size={10} className="text-prime-green" />
            <span className="font-display text-[8px] tracking-wider uppercase text-muted-foreground">Active Connections</span>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {connections.map(conn => (
              <div key={conn.id} className="flex items-center gap-2 text-[9px] font-mono px-1">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conn.status === 'active' ? 'bg-prime-green' : 'bg-prime-amber'}`} />
                <span className="text-foreground">{conn.node}</span>
                <span className="text-muted-foreground">{conn.coord}</span>
                {conn.encrypted
                  ? <Lock size={8} className="text-prime-green ml-auto shrink-0" />
                  : <span className="text-[7px] text-prime-red ml-auto font-display tracking-wider uppercase">Unencrypted</span>
                }
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
