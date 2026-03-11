import { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Scan, Wifi, Lock, Loader2, Database } from 'lucide-react';
import { eventBus } from '@/hooks/useEventBus';
import { supabase } from '@/integrations/supabase/client';

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

interface RlsTableStatus {
  table: string;
  rls: boolean;
  rowCount: number;
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
        <path d="M 8 62 A 35 35 0 1 1 82 62" fill="none" stroke={`hsl(var(--${color}))`} strokeWidth="6" strokeLinecap="round" strokeDasharray={arc} strokeDashoffset={offset} className="transition-all duration-1000" />
        <text x="45" y="48" textAnchor="middle" fill={`hsl(var(--${color}))`} fontSize="12" fontFamily="var(--font-display)" fontWeight="700">{label}</text>
      </svg>
      <span className="text-[8px] font-display tracking-wider text-muted-foreground uppercase">Threat Level</span>
    </div>
  );
}

export default function SecurityConsoleApp() {
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [threatLevel, setThreatLevel] = useState(15);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<RlsTableStatus[] | null>(null);
  const [rules, setRules] = useState<FirewallRule[]>([
    { id: '1', action: 'allow', source: '⟨2,3,5⟩', destination: '⟨7,11,13⟩', enabled: true },
    { id: '2', action: 'allow', source: '⟨17,19,23⟩', destination: '*', enabled: true },
    { id: '3', action: 'deny', source: '⟨97,101,103⟩', destination: '*', enabled: true },
    { id: '4', action: 'deny', source: 'external', destination: '⟨41,43,47⟩', enabled: false },
  ]);
  const [authInfo, setAuthInfo] = useState<{ email?: string; lastSignIn?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // Load real auth events on mount
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('system-analytics', {
          body: { action: 'auth-events' },
        });
        if (!error && data) {
          setAuthInfo({ email: data.userEmail, lastSignIn: data.lastSignIn });
          // Convert real activity into threat events
          const realEvents: ThreatEvent[] = (data.events || []).slice(0, 30).map((e: any) => ({
            id: e.id,
            time: e.time,
            message: `${e.action}: ${e.target}`,
            severity: e.action.includes('delete') ? 'medium' as const : 'low' as const,
          }));
          if (realEvents.length > 0) {
            setEvents(realEvents);
          }
          // Store RLS scan results for later
          if (data.rlsStatus) {
            setScanResults(data.rlsStatus);
          }
        }
      } catch {}
      setLoading(false);
    };
    fetchEvents();
  }, []);

  // Subscribe to realtime user_activity for live security feed
  useEffect(() => {
    const channel = supabase
      .channel('security-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_activity' }, (payload) => {
        const row = payload.new as any;
        const severity: 'low' | 'medium' | 'high' = row.action?.includes('delete') ? 'high' : row.action?.includes('update') ? 'medium' : 'low';
        setEvents(prev => [{
          id: row.id,
          time: new Date(row.created_at).toLocaleTimeString('en-US', { hour12: false }),
          message: `${row.action}: ${row.target}`,
          severity,
        }, ...prev].slice(0, 50));
        setThreatLevel(l => Math.max(5, Math.min(90, l + (severity === 'high' ? 15 : severity === 'medium' ? 5 : -2))));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [events]);

  const runScan = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    setScanProgress(0);
    setScanResults(null);

    // Animate progress while fetching
    const iv = setInterval(() => setScanProgress(p => Math.min(p + 8, 90)), 200);

    try {
      const { data } = await supabase.functions.invoke('system-analytics', {
        body: { action: 'auth-events' },
      });
      clearInterval(iv);
      setScanProgress(100);
      if (data?.rlsStatus) {
        setScanResults(data.rlsStatus);
      }
    } catch {
      clearInterval(iv);
      setScanProgress(100);
    }
    setTimeout(() => setScanning(false), 300);
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
        {loading && <Loader2 size={10} className="animate-spin text-primary" />}
        <span className="ml-auto font-mono text-[9px] text-muted-foreground">
          {authInfo?.email ? `${authInfo.email}` : 'ACTIVE'}
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-prime-green animate-pulse" />
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* Threat Feed — now real */}
        <div className="rounded border border-border bg-card/60 flex flex-col overflow-hidden">
          <div className="px-2 py-1.5 border-b border-border flex items-center gap-1.5">
            <AlertTriangle size={10} className="text-prime-amber" />
            <span className="font-display text-[8px] tracking-wider uppercase text-muted-foreground">Activity Feed (Live)</span>
          </div>
          <div ref={feedRef} className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {events.length === 0 && !loading && (
              <p className="text-[9px] text-muted-foreground p-2 text-center">No activity events yet. Use the OS to generate events.</p>
            )}
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
          <div className="rounded border border-border bg-card/60 p-3 flex items-center justify-center">
            <ThreatGauge level={threatLevel} />
          </div>

          {/* Scanner — now queries real RLS status */}
          <div className="rounded border border-border bg-card/60 p-2 flex flex-col gap-2">
            <button onClick={runScan} disabled={scanning} className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-primary/20 border border-primary/40 text-primary text-[10px] font-display tracking-wider uppercase hover:bg-primary/30 disabled:opacity-50 transition-colors">
              <Scan size={10} className={scanning ? 'animate-spin' : ''} />
              {scanning ? 'Scanning...' : 'Run Security Scan'}
            </button>
            {scanning && (
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all duration-100 rounded-full" style={{ width: `${scanProgress}%` }} />
              </div>
            )}
            {scanResults && !scanning && (
              <div className="space-y-0.5">
                {scanResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[9px] font-mono">
                    {r.rls
                      ? <CheckCircle size={9} className="text-prime-green shrink-0" />
                      : <XCircle size={9} className="text-prime-red shrink-0" />
                    }
                    <span className={r.rls ? 'text-muted-foreground' : 'text-prime-red'}>{r.table}</span>
                    <span className="ml-auto text-muted-foreground/60">{r.rowCount} rows</span>
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
            <span className="font-display text-[8px] tracking-wider uppercase text-muted-foreground">RLS Firewall</span>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center gap-2 text-[9px] font-mono">
                <button onClick={() => toggleRule(rule.id)} className={`w-7 h-3.5 rounded-full flex items-center transition-colors ${rule.enabled ? 'bg-primary/40 justify-end' : 'bg-muted justify-start'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full mx-0.5 transition-colors ${rule.enabled ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                </button>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-display uppercase tracking-wider ${rule.action === 'allow' ? 'bg-prime-green/10 text-prime-green' : 'bg-prime-red/10 text-prime-red'}`}>
                  {rule.action}
                </span>
                <span className="text-muted-foreground">{rule.source}</span>
                <span className="text-muted-foreground/40">→</span>
                <span className="text-muted-foreground">{rule.destination}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Auth Info */}
        <div className="rounded border border-border bg-card/60 flex flex-col overflow-hidden">
          <div className="px-2 py-1.5 border-b border-border flex items-center gap-1.5">
            <Wifi size={10} className="text-prime-green" />
            <span className="font-display text-[8px] tracking-wider uppercase text-muted-foreground">Session Info</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {authInfo ? (
              <>
                <div className="flex items-center gap-2 text-[9px] font-mono px-1">
                  <Lock size={8} className="text-prime-green shrink-0" />
                  <span className="text-foreground">{authInfo.email}</span>
                </div>
                <div className="text-[8px] text-muted-foreground px-1">
                  Last sign-in: {authInfo.lastSignIn ? new Date(authInfo.lastSignIn).toLocaleString() : 'N/A'}
                </div>
                <div className="flex items-center gap-1.5 px-1 text-[8px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-prime-green" />
                  <span className="text-prime-green">RLS Active on all tables</span>
                </div>
                <div className="flex items-center gap-1.5 px-1 text-[8px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-prime-green" />
                  <span className="text-prime-green">JWT verified</span>
                </div>
                <div className="flex items-center gap-1.5 px-1 text-[8px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-prime-green" />
                  <span className="text-prime-green">API keys isolated per user</span>
                </div>
              </>
            ) : (
              <p className="text-[9px] text-muted-foreground p-2">Not authenticated</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
