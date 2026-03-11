import { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Radio } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { eventBus } from '@/hooks/useEventBus';

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

interface TickerItem { symbol: string; price: number; change: number; open?: number }

const WATCHLIST = ['AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT', 'GOOG', 'META', 'AMD'];

// Generate signals based on live prices
function generateSignals(tickers: TickerItem[]): Signal[] {
  return tickers.slice(0, 6).map((t, i) => {
    const dir = t.change >= 0 ? 'long' as const : 'short' as const;
    const entry = t.price;
    const spread = t.price * 0.05;
    return {
      id: `s${i}`,
      symbol: t.symbol,
      direction: dir,
      entry: +entry.toFixed(2),
      target: +(dir === 'long' ? entry + spread : entry - spread).toFixed(2),
      stopLoss: +(dir === 'long' ? entry - spread * 0.6 : entry + spread * 0.6).toFixed(2),
      conviction: Math.abs(t.change) > 2 ? 'High' : Math.abs(t.change) > 0.8 ? 'Medium' : 'Low',
      status: 'active',
      timestamp: 'Live',
    };
  });
}

const CONVICTION_COLORS: Record<string, string> = { High: 'bg-primary/20 text-primary', Medium: 'bg-accent text-accent-foreground', Low: 'bg-muted text-muted-foreground' };

export default function PrimeSignalsApp() {
  const [ticker, setTicker] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [chartData, setChartData] = useState<{ t: string; price: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [view, setView] = useState<'signals' | 'analytics'>('signals');

  const fetchTickers = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('market-data', {
        body: null,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      // Use URL params approach
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-data?action=get-tickers&symbols=${WATCHLIST.join(',')}`,
        { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const items: TickerItem[] = json.data.map((d: any) => ({
          symbol: d.symbol || d.T,
          price: d.c || d.close || 0,
          change: d.c && d.o ? +((d.c - d.o) / d.o * 100).toFixed(2) : 0,
          open: d.o || d.open || 0,
        }));
        setTicker(items.filter(i => i.price > 0));
        setIsCached(json.cached || false);
      }
    } catch (e) {
      console.error('Failed to fetch tickers:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickers();
    const id = setInterval(fetchTickers, 60000);
    return () => clearInterval(id);
  }, [fetchTickers]);

  const fetchChart = useCallback(async (symbol: string) => {
    setChartLoading(true);
    try {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-data?action=get-chart&ticker=${symbol}&from=${from}&to=${to}&timespan=hour`,
        { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const json = await res.json();
      const results = json.data?.results || [];
      setChartData(results.map((r: any, i: number) => ({
        t: new Date(r.t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }),
        price: r.c,
      })));
    } catch {
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSignal) fetchChart(selectedSignal.symbol);
  }, [selectedSignal, fetchChart]);

  const signals = useMemo(() => generateSignals(ticker), [ticker]);

  const stats = useMemo(() => {
    const bullish = signals.filter(s => s.direction === 'long').length;
    const bearish = signals.filter(s => s.direction === 'short').length;
    const highConv = signals.filter(s => s.conviction === 'High').length;
    return { bullish, bearish, highConv, total: signals.length };
  }, [signals]);

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-background p-3 space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground font-mono text-xs">
      {/* Ticker */}
      <div className="flex items-center gap-3 px-3 py-1 border-b border-border overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 shrink-0 mr-1">
          <Radio size={8} className={isCached ? 'text-muted-foreground' : 'text-primary animate-pulse'} />
          <span className="text-[7px] text-muted-foreground">{isCached ? 'CACHED' : 'LIVE'}</span>
        </div>
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
              <div className="border border-border rounded p-2 text-center"><p className="text-[8px] text-muted-foreground">BULLISH</p><p className="text-lg text-primary font-bold">{stats.bullish}</p></div>
              <div className="border border-border rounded p-2 text-center"><p className="text-[8px] text-muted-foreground">BEARISH</p><p className="text-lg text-destructive font-bold">{stats.bearish}</p></div>
              <div className="border border-border rounded p-2 text-center"><p className="text-[8px] text-muted-foreground">HIGH CONV</p><p className="text-lg text-foreground font-bold">{stats.highConv}</p></div>
              <div className="border border-border rounded p-2 text-center"><p className="text-[8px] text-muted-foreground">TOTAL</p><p className="text-lg text-foreground font-bold">{stats.total}</p></div>
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
              {chartLoading ? <Skeleton className="h-[150px] w-full" /> : (
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="t" tick={{ fontSize: 7 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 10 }} />
                    <ReferenceLine y={selectedSignal.entry} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: 'Entry', fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} />
                    <ReferenceLine y={selectedSignal.target} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: 'Target', fontSize: 8, fill: 'hsl(var(--primary))' }} />
                    <ReferenceLine y={selectedSignal.stopLoss} stroke="hsl(0 70% 50%)" strokeDasharray="3 3" label={{ value: 'Stop', fontSize: 8, fill: 'hsl(0 70% 50%)' }} />
                    <Line type="monotone" dataKey="price" stroke="hsl(var(--foreground))" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="border border-border rounded p-2"><p className="text-[8px] text-muted-foreground">ENTRY</p><p className="text-foreground">{selectedSignal.entry.toFixed(2)}</p></div>
              <div className="border border-border rounded p-2"><p className="text-[8px] text-muted-foreground">TARGET</p><p className="text-primary">{selectedSignal.target.toFixed(2)}</p></div>
              <div className="border border-border rounded p-2"><p className="text-[8px] text-muted-foreground">STOP LOSS</p><p className="text-destructive">{selectedSignal.stopLoss.toFixed(2)}</p></div>
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {signals.map(s => {
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
                    <span className="ml-auto text-[9px] text-muted-foreground">● {s.status}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-[9px] text-muted-foreground">
                    <span>Entry: {s.entry.toFixed(2)}</span>
                    <span>Target: <span className="text-primary">{s.target.toFixed(2)}</span></span>
                    <span>Stop: <span className="text-destructive">{s.stopLoss.toFixed(2)}</span></span>
                    <span className={`ml-auto ${pnl >= 0 ? 'text-primary' : 'text-destructive'}`}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}%</span>
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
