import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Plus, Eye, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts';

interface Signal {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entry: number;
  target: number;
  stopLoss: number;
  conviction: 'High' | 'Medium' | 'Low';
  status: 'active' | 'hit' | 'stopped';
  timestamp: string;
}

interface TickerItem { symbol: string; price: number; change: number }

const SIGNALS: Signal[] = [
  { id: 's1', symbol: 'LATT', direction: 'long', entry: 142.50, target: 168.00, stopLoss: 131.00, conviction: 'High', status: 'active', timestamp: '2h ago' },
  { id: 's2', symbol: 'QBIT', direction: 'short', entry: 89.20, target: 72.00, stopLoss: 96.50, conviction: 'Medium', status: 'active', timestamp: '4h ago' },
  { id: 's3', symbol: 'FOLD', direction: 'long', entry: 224.00, target: 260.00, stopLoss: 208.00, conviction: 'High', status: 'hit', timestamp: '1d ago' },
  { id: 's4', symbol: 'NRGY', direction: 'long', entry: 56.80, target: 65.00, stopLoss: 52.00, conviction: 'Low', status: 'active', timestamp: '6h ago' },
  { id: 's5', symbol: 'MESH', direction: 'short', entry: 312.00, target: 280.00, stopLoss: 330.00, conviction: 'Medium', status: 'stopped', timestamp: '2d ago' },
  { id: 's6', symbol: 'GEOM', direction: 'long', entry: 78.40, target: 92.00, stopLoss: 71.00, conviction: 'High', status: 'active', timestamp: '30m ago' },
];

const TICKER_BASE: TickerItem[] = [
  { symbol: 'LATT', price: 145.20, change: 1.9 },
  { symbol: 'QBIT', price: 87.60, change: -1.8 },
  { symbol: 'FOLD', price: 261.30, change: 3.2 },
  { symbol: 'NRGY', price: 57.90, change: 1.1 },
  { symbol: 'MESH', price: 318.40, change: 2.1 },
  { symbol: 'GEOM', price: 80.10, change: 2.2 },
  { symbol: 'PRIM', price: 1049.00, change: 0.8 },
  { symbol: 'ADRK', price: 33.50, change: -0.5 },
];

function generateSignalChart(entry: number, target: number, stopLoss: number) {
  const data = [];
  let p = entry * 0.97;
  for (let i = 0; i < 40; i++) {
    p += (Math.random() - 0.45) * (entry * 0.01);
    p = Math.max(stopLoss * 0.95, Math.min(target * 1.05, p));
    data.push({ t: i, price: +p.toFixed(2) });
  }
  return data;
}

const CONVICTION_COLORS: Record<string, string> = { High: 'bg-primary/20 text-primary', Medium: 'bg-accent text-accent-foreground', Low: 'bg-muted text-muted-foreground' };

export default function PrimeSignalsApp() {
  const [ticker, setTicker] = useState(TICKER_BASE);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [view, setView] = useState<'signals' | 'analytics'>('signals');

  useEffect(() => {
    const id = setInterval(() => {
      setTicker(prev => prev.map(t => {
        const delta = (Math.random() - 0.5) * t.price * 0.002;
        const newPrice = +(t.price + delta).toFixed(2);
        return { ...t, price: newPrice, change: +((newPrice / (t.price / (1 + t.change / 100)) - 1) * 100).toFixed(2) };
      }));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const chartData = useMemo(() => selectedSignal ? generateSignalChart(selectedSignal.entry, selectedSignal.target, selectedSignal.stopLoss) : [], [selectedSignal]);

  const stats = useMemo(() => {
    const hit = SIGNALS.filter(s => s.status === 'hit').length;
    const stopped = SIGNALS.filter(s => s.status === 'stopped').length;
    const total = hit + stopped;
    return { winRate: total ? ((hit / total) * 100).toFixed(0) : '—', avgReturn: '14.2', riskReward: '2.3', totalSignals: SIGNALS.length };
  }, []);

  return (
    <div className="h-full flex flex-col bg-background text-foreground font-mono text-xs">
      {/* Ticker */}
      <div className="flex items-center gap-3 px-3 py-1 border-b border-border overflow-x-auto scrollbar-none">
        {ticker.map(t => (
          <div key={t.symbol} className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] text-muted-foreground">{t.symbol}</span>
            <span className="text-[10px] text-foreground">{t.price.toFixed(2)}</span>
            <span className={`text-[9px] flex items-center ${t.change >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {t.change >= 0 ? <ArrowUpRight size={8} /> : <ArrowDownRight size={8} />}{Math.abs(t.change).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border">
        <TrendingUp size={14} className="text-primary" />
        <span className="font-display text-[10px] tracking-wider text-primary">PRIMESIGNALS</span>
        <div className="ml-auto flex gap-1">
          <button onClick={() => setView('signals')} className={`px-2 py-0.5 rounded text-[9px] ${view === 'signals' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>Signals</button>
          <button onClick={() => setView('analytics')} className={`px-2 py-0.5 rounded text-[9px] ${view === 'analytics' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>Analytics</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {view === 'analytics' ? (
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <div className="border border-border rounded p-2 text-center"><p className="text-[8px] text-muted-foreground">WIN RATE</p><p className="text-lg text-primary font-bold">{stats.winRate}%</p></div>
              <div className="border border-border rounded p-2 text-center"><p className="text-[8px] text-muted-foreground">AVG RETURN</p><p className="text-lg text-foreground font-bold">{stats.avgReturn}%</p></div>
              <div className="border border-border rounded p-2 text-center"><p className="text-[8px] text-muted-foreground">RISK/REWARD</p><p className="text-lg text-foreground font-bold">{stats.riskReward}:1</p></div>
              <div className="border border-border rounded p-2 text-center"><p className="text-[8px] text-muted-foreground">TOTAL SIGNALS</p><p className="text-lg text-foreground font-bold">{stats.totalSignals}</p></div>
            </div>
            <div className="border border-border rounded p-2">
              <p className="text-[9px] text-muted-foreground mb-1">SIGNAL STATUS DISTRIBUTION</p>
              <div className="flex gap-2 mt-2">
                {['active', 'hit', 'stopped'].map(s => {
                  const count = SIGNALS.filter(sig => sig.status === s).length;
                  return (
                    <div key={s} className="flex-1 text-center">
                      <div className="h-16 flex items-end justify-center">
                        <div className={`w-8 rounded-t ${s === 'hit' ? 'bg-primary' : s === 'stopped' ? 'bg-destructive' : 'bg-accent'}`} style={{ height: `${(count / SIGNALS.length) * 100}%` }} />
                      </div>
                      <p className="text-[8px] text-muted-foreground mt-1 capitalize">{s} ({count})</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : selectedSignal ? (
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedSignal(null)} className="text-muted-foreground hover:text-foreground">← Back</button>
              <span className="text-foreground font-bold">{selectedSignal.symbol}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${CONVICTION_COLORS[selectedSignal.conviction]}`}>{selectedSignal.conviction}</span>
              <span className={`flex items-center gap-0.5 text-[9px] ${selectedSignal.direction === 'long' ? 'text-primary' : 'text-destructive'}`}>
                {selectedSignal.direction === 'long' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{selectedSignal.direction.toUpperCase()}
              </span>
            </div>
            <div className="border border-border rounded p-2">
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={chartData}>
                  <XAxis dataKey="t" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 10 }} />
                  <ReferenceLine y={selectedSignal.entry} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: 'Entry', fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} />
                  <ReferenceLine y={selectedSignal.target} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: 'Target', fontSize: 8, fill: 'hsl(var(--primary))' }} />
                  <ReferenceLine y={selectedSignal.stopLoss} stroke="hsl(0 70% 50%)" strokeDasharray="3 3" label={{ value: 'Stop', fontSize: 8, fill: 'hsl(0 70% 50%)' }} />
                  <Line type="monotone" dataKey="price" stroke="hsl(var(--foreground))" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="border border-border rounded p-2"><p className="text-[8px] text-muted-foreground">ENTRY</p><p className="text-foreground">{selectedSignal.entry.toFixed(2)}</p></div>
              <div className="border border-border rounded p-2"><p className="text-[8px] text-muted-foreground">TARGET</p><p className="text-primary">{selectedSignal.target.toFixed(2)}</p></div>
              <div className="border border-border rounded p-2"><p className="text-[8px] text-muted-foreground">STOP LOSS</p><p className="text-destructive">{selectedSignal.stopLoss.toFixed(2)}</p></div>
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {SIGNALS.map(s => {
              const currentPrice = ticker.find(t => t.symbol === s.symbol)?.price ?? s.entry;
              const pnl = s.direction === 'long' ? ((currentPrice - s.entry) / s.entry) * 100 : ((s.entry - currentPrice) / s.entry) * 100;
              return (
                <button key={s.id} onClick={() => setSelectedSignal(s)} className="w-full text-left p-2 rounded border border-border hover:border-primary/40 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-bold">{s.symbol}</span>
                    <span className={`flex items-center gap-0.5 text-[9px] ${s.direction === 'long' ? 'text-primary' : 'text-destructive'}`}>
                      {s.direction === 'long' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{s.direction.toUpperCase()}
                    </span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded ${CONVICTION_COLORS[s.conviction]}`}>{s.conviction}</span>
                    <span className={`ml-auto text-[9px] ${s.status === 'hit' ? 'text-primary' : s.status === 'stopped' ? 'text-destructive' : 'text-muted-foreground'}`}>● {s.status}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-[9px] text-muted-foreground">
                    <span>Entry: {s.entry.toFixed(2)}</span>
                    <span>Target: <span className="text-primary">{s.target.toFixed(2)}</span></span>
                    <span>Stop: <span className="text-destructive">{s.stopLoss.toFixed(2)}</span></span>
                    {s.status === 'active' && <span className={`ml-auto ${pnl >= 0 ? 'text-primary' : 'text-destructive'}`}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}%</span>}
                    <span className="text-muted-foreground">{s.timestamp}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
