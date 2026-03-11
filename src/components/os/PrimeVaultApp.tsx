import { useState, useEffect, useMemo, useCallback } from 'react';
import { Vault, TrendingUp, TrendingDown } from 'lucide-react';
import { eventBus } from '@/hooks/useEventBus';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface Holding {
  id: string;
  name: string;
  symbol: string;
  category: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
}

interface Transaction {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  date: string;
}

const FALLBACK_HOLDINGS: Holding[] = [
  { id: 'h1', name: 'Apple Inc.', symbol: 'AAPL', category: 'Tech', quantity: 50, avgCost: 175.00, currentPrice: 0 },
  { id: 'h2', name: 'Tesla Inc.', symbol: 'TSLA', category: 'Auto', quantity: 20, avgCost: 220.00, currentPrice: 0 },
  { id: 'h3', name: 'NVIDIA Corp.', symbol: 'NVDA', category: 'Tech', quantity: 30, avgCost: 450.00, currentPrice: 0 },
  { id: 'h4', name: 'Amazon', symbol: 'AMZN', category: 'Tech', quantity: 25, avgCost: 145.00, currentPrice: 0 },
  { id: 'h5', name: 'Microsoft', symbol: 'MSFT', category: 'Tech', quantity: 40, avgCost: 380.00, currentPrice: 0 },
];

const CAT_COLORS: Record<string, string> = { Tech: 'hsl(var(--primary))', Auto: 'hsl(45 90% 55%)', Energy: 'hsl(140 70% 45%)', Finance: 'hsl(200 80% 55%)' };

export default function PrimeVaultApp() {
  const [tab, setTab] = useState<'overview' | 'holdings' | 'history'>('overview');
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [perfData, setPerfData] = useState<{ day: number; portfolio: number; benchmark: number }[]>([]);

  // Listen for app.navigate events
  useEffect(() => {
    const handler = (payload: any) => {
      if (payload?.app === 'vault' && payload?.context) {
        const ctx = payload.context.toLowerCase();
        const tabMap: Record<string, 'overview' | 'holdings' | 'history'> = {
          overview: 'overview', holdings: 'holdings', history: 'history', trade: 'holdings',
        };
        if (tabMap[ctx]) setTab(tabMap[ctx]);
      }
    };
    eventBus.on('app.navigate', handler);
    return () => eventBus.off('app.navigate', handler);
  }, []);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Fetch live prices
  const fetchPrices = useCallback(async (symbols: string[]): Promise<Record<string, number>> => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-data?action=get-tickers&symbols=${symbols.join(',')}`,
        { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const json = await res.json();
      const prices: Record<string, number> = {};
      if (json.data) json.data.forEach((d: any) => { prices[d.symbol || d.T] = d.c || 0; });
      return prices;
    } catch { return {}; }
  }, []);

  // Load data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let h = FALLBACK_HOLDINGS;
      let tx: Transaction[] = [];

      if (userId) {
        try {
          const { data: dbH } = await (supabase as any).from('vault_holdings').select('*').eq('user_id', userId);
          if (dbH && dbH.length > 0) {
            h = dbH.map((r: any) => ({
              id: r.id, name: r.name, symbol: r.symbol, category: r.category,
              quantity: Number(r.quantity), avgCost: Number(r.avg_cost), currentPrice: 0,
            }));
          }
          const { data: dbTx } = await (supabase as any).from('vault_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
          if (dbTx) {
            tx = dbTx.map((r: any) => ({
              id: r.id, symbol: r.symbol, type: r.tx_type, quantity: Number(r.quantity),
              price: Number(r.price), date: new Date(r.created_at).toISOString().slice(0, 10),
            }));
          }
        } catch {}
      }

      // Fetch live prices
      const symbols = h.map(x => x.symbol);
      const prices = await fetchPrices(symbols);
      h = h.map(x => ({ ...x, currentPrice: prices[x.symbol] || x.avgCost }));

      setHoldings(h);
      setTransactions(tx);

      // Generate perf data based on total value
      const totalVal = h.reduce((s, x) => s + x.quantity * x.currentPrice, 0);
      const pd = [];
      let val = totalVal * 0.92;
      let bench = val;
      for (let i = 0; i < 30; i++) {
        val += (Math.random() - 0.45) * totalVal * 0.015;
        bench += (Math.random() - 0.48) * totalVal * 0.012;
        pd.push({ day: i + 1, portfolio: Math.round(val), benchmark: Math.round(bench) });
      }
      setPerfData(pd);
      setLoading(false);
    };
    load();
  }, [userId, fetchPrices]);

  const totalValue = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0);
  const totalCost = holdings.reduce((s, h) => s + h.quantity * h.avgCost, 0);
  const totalPnL = totalValue - totalCost;

  const allocationData = useMemo(() => {
    const cats: Record<string, number> = {};
    holdings.forEach(h => { cats[h.category] = (cats[h.category] || 0) + h.quantity * h.currentPrice; });
    return Object.entries(cats).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [holdings]);

  // Buy/Sell handler
  const handleTrade = useCallback(async (symbol: string, name: string, category: string, qty: number, price: number, type: 'buy' | 'sell') => {
    if (!userId) return;
    try {
      // Record transaction
      await (supabase as any).from('vault_transactions').insert({
        user_id: userId, symbol, tx_type: type, quantity: qty, price,
      });

      // Update holding
      const existing = holdings.find(h => h.symbol === symbol);
      if (type === 'buy') {
        if (existing) {
          const newQty = existing.quantity + qty;
          const newCost = (existing.avgCost * existing.quantity + price * qty) / newQty;
          await (supabase as any).from('vault_holdings').update({ quantity: newQty, avg_cost: newCost }).eq('id', existing.id);
        } else {
          await (supabase as any).from('vault_holdings').insert({
            user_id: userId, symbol, name, category, quantity: qty, avg_cost: price,
          });
        }
      } else if (type === 'sell' && existing) {
        const newQty = Math.max(0, existing.quantity - qty);
        if (newQty === 0) {
          await (supabase as any).from('vault_holdings').delete().eq('id', existing.id);
        } else {
          await (supabase as any).from('vault_holdings').update({ quantity: newQty }).eq('id', existing.id);
        }
      }

      // Refresh
      const { data: dbH } = await (supabase as any).from('vault_holdings').select('*').eq('user_id', userId);
      if (dbH) {
        const prices = await fetchPrices(dbH.map((r: any) => r.symbol));
        setHoldings(dbH.map((r: any) => ({
          id: r.id, name: r.name, symbol: r.symbol, category: r.category,
          quantity: Number(r.quantity), avgCost: Number(r.avg_cost), currentPrice: prices[r.symbol] || Number(r.avg_cost),
        })));
      }
      const { data: dbTx } = await (supabase as any).from('vault_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
      if (dbTx) setTransactions(dbTx.map((r: any) => ({
        id: r.id, symbol: r.symbol, type: r.tx_type, quantity: Number(r.quantity),
        price: Number(r.price), date: new Date(r.created_at).toISOString().slice(0, 10),
      })));
    } catch (e) { console.error('Trade error:', e); }
  }, [userId, holdings, fetchPrices]);

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-background p-3 space-y-2">
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground font-mono text-xs">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Vault size={14} className="text-primary" />
        <span className="font-display text-[10px] tracking-wider text-primary">PRIMEVAULT</span>
        {!userId && <span className="text-[8px] text-muted-foreground ml-1">(Guest Mode)</span>}
        <div className="ml-auto flex gap-1">
          {(['overview', 'holdings', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-2 py-0.5 rounded text-[9px] capitalize ${tab === t ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {tab === 'overview' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="border border-border rounded p-2">
                <p className="text-[8px] text-muted-foreground">TOTAL VALUE</p>
                <p className="text-lg text-foreground font-bold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="border border-border rounded p-2">
                <p className="text-[8px] text-muted-foreground">TOTAL COST</p>
                <p className="text-lg text-foreground font-bold">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="border border-border rounded p-2">
                <p className="text-[8px] text-muted-foreground">TOTAL P&L</p>
                <p className={`text-lg font-bold ${totalPnL >= 0 ? 'text-primary' : 'text-destructive'}`}>{totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-3 border border-border rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] text-muted-foreground">PERFORMANCE</p>
                  <button onClick={() => setShowBenchmark(!showBenchmark)} className={`text-[8px] px-1.5 py-0.5 rounded ${showBenchmark ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
                    vs S&P 500
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={perfData}>
                    <XAxis dataKey="day" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 10 }} />
                    <Line type="monotone" dataKey="portfolio" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} name="Portfolio" />
                    {showBenchmark && <Line type="monotone" dataKey="benchmark" stroke="hsl(var(--muted-foreground))" strokeWidth={1} dot={false} strokeDasharray="4 2" name="S&P 500" />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="col-span-2 border border-border rounded p-2">
                <p className="text-[9px] text-muted-foreground mb-1">ALLOCATION</p>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={allocationData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 8 }}>
                      {allocationData.map((entry) => <Cell key={entry.name} fill={CAT_COLORS[entry.name] || 'hsl(var(--muted))'} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {tab === 'holdings' && (
          <div className="border border-border rounded">
            <div className="grid grid-cols-7 gap-1 px-2 py-1.5 border-b border-border text-[8px] text-muted-foreground">
              <span className="col-span-2">Asset</span><span>Qty</span><span>Avg Cost</span><span>Price</span><span>P&L</span><span>Action</span>
            </div>
            {holdings.map(h => {
              const pnl = h.quantity * (h.currentPrice - h.avgCost);
              return (
                <div key={h.id} className="grid grid-cols-7 gap-1 px-2 py-1.5 border-b border-border/50 text-[9px] hover:bg-muted/20 items-center">
                  <div className="col-span-2">
                    <span className="text-foreground">{h.symbol}</span>
                    <span className="text-[8px] text-muted-foreground ml-1">{h.name}</span>
                  </div>
                  <span className="text-foreground">{h.quantity}</span>
                  <span className="text-muted-foreground">${h.avgCost.toFixed(2)}</span>
                  <span className="text-foreground">${h.currentPrice.toFixed(2)}</span>
                  <span className={pnl >= 0 ? 'text-primary' : 'text-destructive'}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</span>
                  <div className="flex gap-1">
                    {userId && (
                      <>
                        <button onClick={() => handleTrade(h.symbol, h.name, h.category, 1, h.currentPrice, 'buy')} className="text-[7px] px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">+1</button>
                        <button onClick={() => handleTrade(h.symbol, h.name, h.category, 1, h.currentPrice, 'sell')} className="text-[7px] px-1 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/30">-1</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'history' && (
          <div className="border border-border rounded">
            <div className="grid grid-cols-5 gap-1 px-2 py-1.5 border-b border-border text-[8px] text-muted-foreground">
              <span>Date</span><span>Symbol</span><span>Type</span><span>Qty</span><span>Price</span>
            </div>
            {transactions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-[10px]">
                {userId ? 'No transactions yet' : 'Sign in to track transactions'}
              </div>
            ) : transactions.map(t => (
              <div key={t.id} className="grid grid-cols-5 gap-1 px-2 py-1.5 border-b border-border/50 text-[9px] hover:bg-muted/20">
                <span className="text-muted-foreground">{t.date}</span>
                <span className="text-foreground">{t.symbol}</span>
                <span className={t.type === 'buy' ? 'text-primary' : 'text-destructive'}>{t.type.toUpperCase()}</span>
                <span className="text-foreground">{t.quantity}</span>
                <span className="text-muted-foreground">${t.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
