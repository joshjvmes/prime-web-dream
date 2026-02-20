import { useState, useMemo } from 'react';
import { Dices, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Wallet, BarChart3, Clock, ChevronLeft } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface Market {
  id: string;
  question: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  expiry: string;
  trend: number;
}

interface Position {
  marketId: string;
  question: string;
  side: 'YES' | 'NO';
  shares: number;
  avgCost: number;
  currentPrice: number;
}

const CATEGORIES = ['All', 'Lattice Events', 'Compute', 'Energy', 'Network'];

const MARKETS: Market[] = [
  { id: 'm1', question: 'Lattice expansion to P¹³ by Q2?', category: 'Lattice Events', yesPrice: 0.72, noPrice: 0.28, volume: 142300, expiry: '2026-06-30', trend: 3.2 },
  { id: 'm2', question: 'Q3 Engine inference < 400μs?', category: 'Compute', yesPrice: 0.45, noPrice: 0.55, volume: 89100, expiry: '2026-04-15', trend: -1.8 },
  { id: 'm3', question: 'COP exceeds 4.0 in satellite mode?', category: 'Energy', yesPrice: 0.61, noPrice: 0.39, volume: 201500, expiry: '2026-05-01', trend: 5.1 },
  { id: 'm4', question: 'PrimeNet 1000+ active nodes?', category: 'Network', yesPrice: 0.33, noPrice: 0.67, volume: 67800, expiry: '2026-07-31', trend: -0.5 },
  { id: 'm5', question: 'GeomC compiler 10× energy reduction?', category: 'Compute', yesPrice: 0.82, noPrice: 0.18, volume: 312000, expiry: '2026-03-15', trend: 2.1 },
  { id: 'm6', question: 'Adinkra compression reaches 80%?', category: 'Lattice Events', yesPrice: 0.54, noPrice: 0.46, volume: 95600, expiry: '2026-08-01', trend: 0.9 },
  { id: 'm7', question: 'FoldMem zero-fragmentation for 30 days?', category: 'Compute', yesPrice: 0.68, noPrice: 0.32, volume: 78200, expiry: '2026-04-30', trend: 1.3 },
  { id: 'm8', question: 'Geodesic routing latency < 0.1ms?', category: 'Network', yesPrice: 0.22, noPrice: 0.78, volume: 54300, expiry: '2026-09-01', trend: -2.4 },
];

const POSITIONS: Position[] = [
  { marketId: 'm1', question: 'Lattice expansion to P¹³ by Q2?', side: 'YES', shares: 150, avgCost: 0.58, currentPrice: 0.72 },
  { marketId: 'm3', question: 'COP exceeds 4.0 in satellite mode?', side: 'NO', shares: 200, avgCost: 0.52, currentPrice: 0.39 },
  { marketId: 'm5', question: 'GeomC compiler 10× energy reduction?', side: 'YES', shares: 80, avgCost: 0.71, currentPrice: 0.82 },
];

function generateChartData(yesBase: number) {
  const data = [];
  let yes = yesBase - 0.15 + Math.random() * 0.1;
  for (let i = 0; i < 30; i++) {
    yes += (Math.random() - 0.48) * 0.03;
    yes = Math.max(0.05, Math.min(0.95, yes));
    data.push({ day: i + 1, yes: +yes.toFixed(3), no: +(1 - yes).toFixed(3) });
  }
  return data;
}

function generateOrderBook() {
  const bids = Array.from({ length: 8 }, (_, i) => ({
    price: +(0.70 - i * 0.02).toFixed(2),
    size: Math.floor(500 + Math.random() * 2000),
  }));
  const asks = Array.from({ length: 8 }, (_, i) => ({
    price: +(0.72 + i * 0.02).toFixed(2),
    size: Math.floor(500 + Math.random() * 2000),
  }));
  return { bids, asks };
}

const ACTIVITY = [
  { user: 'node-α', side: 'YES', shares: 50, price: 0.71, time: '2m ago' },
  { user: 'sector-7', side: 'NO', shares: 120, price: 0.29, time: '5m ago' },
  { user: 'lattice-9', side: 'YES', shares: 30, price: 0.72, time: '8m ago' },
  { user: 'fold-ops', side: 'YES', shares: 200, price: 0.70, time: '12m ago' },
  { user: 'qutrit-3', side: 'NO', shares: 80, price: 0.30, time: '15m ago' },
];

export default function PrimeBetsApp() {
  const [tab, setTab] = useState<'markets' | 'portfolio'>('markets');
  const [selectedCat, setSelectedCat] = useState('All');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [betSide, setBetSide] = useState<'YES' | 'NO'>('YES');
  const [betAmount, setBetAmount] = useState('');
  const walletBalance = 2847.50;

  const filtered = useMemo(() =>
    selectedCat === 'All' ? MARKETS : MARKETS.filter(m => m.category === selectedCat),
    [selectedCat]
  );

  const chartData = useMemo(() => selectedMarket ? generateChartData(selectedMarket.yesPrice) : [], [selectedMarket]);
  const orderBook = useMemo(() => selectedMarket ? generateOrderBook() : null, [selectedMarket]);
  const maxBookSize = useMemo(() => orderBook ? Math.max(...orderBook.bids.map(b => b.size), ...orderBook.asks.map(a => a.size)) : 1, [orderBook]);

  const shares = betAmount ? parseFloat(betAmount) / (betSide === 'YES' ? (selectedMarket?.yesPrice || 1) : (selectedMarket?.noPrice || 1)) : 0;
  const payout = shares * 1;

  if (selectedMarket) {
    return (
      <div className="h-full flex flex-col bg-background text-foreground font-mono text-xs">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button onClick={() => setSelectedMarket(null)} className="p-1 hover:bg-muted rounded"><ChevronLeft size={14} /></button>
          <span className="text-muted-foreground truncate flex-1">{selectedMarket.question}</span>
          <div className="flex items-center gap-1 text-muted-foreground"><Wallet size={12} /> <span className="text-primary">{walletBalance.toLocaleString()} Ł</span></div>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {/* Price Chart */}
          <div className="border border-border rounded p-2">
            <p className="text-[9px] text-muted-foreground mb-1">30-DAY PRICE</p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="yesGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient>
                  <linearGradient id="noGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(0 70% 50%)" stopOpacity={0.3} /><stop offset="100%" stopColor="hsl(0 70% 50%)" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 1]} tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 10 }} />
                <Area type="monotone" dataKey="yes" stroke="hsl(var(--primary))" fill="url(#yesGrad)" strokeWidth={1.5} name="YES" />
                <Area type="monotone" dataKey="no" stroke="hsl(0 70% 50%)" fill="url(#noGrad)" strokeWidth={1.5} name="NO" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Order Book */}
            <div className="border border-border rounded p-2">
              <p className="text-[9px] text-muted-foreground mb-1">ORDER BOOK</p>
              <div className="space-y-0.5">
                {orderBook?.asks.slice().reverse().map((a, i) => (
                  <div key={`a${i}`} className="flex items-center gap-1 text-[9px]">
                    <span className="w-8 text-right text-destructive">{a.price.toFixed(2)}</span>
                    <div className="flex-1 h-3 bg-muted rounded overflow-hidden"><div className="h-full bg-destructive/30 rounded" style={{ width: `${(a.size / maxBookSize) * 100}%` }} /></div>
                    <span className="w-10 text-right text-muted-foreground">{a.size}</span>
                  </div>
                ))}
                <div className="border-t border-border my-1" />
                {orderBook?.bids.map((b, i) => (
                  <div key={`b${i}`} className="flex items-center gap-1 text-[9px]">
                    <span className="w-8 text-right text-primary">{b.price.toFixed(2)}</span>
                    <div className="flex-1 h-3 bg-muted rounded overflow-hidden"><div className="h-full bg-primary/30 rounded" style={{ width: `${(b.size / maxBookSize) * 100}%` }} /></div>
                    <span className="w-10 text-right text-muted-foreground">{b.size}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Betting Panel */}
            <div className="border border-border rounded p-2 space-y-2">
              <p className="text-[9px] text-muted-foreground">PLACE BET</p>
              <div className="flex gap-1">
                <button onClick={() => setBetSide('YES')} className={`flex-1 py-1 rounded text-[10px] font-bold transition-colors ${betSide === 'YES' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/20'}`}>YES {selectedMarket.yesPrice.toFixed(2)}</button>
                <button onClick={() => setBetSide('NO')} className={`flex-1 py-1 rounded text-[10px] font-bold transition-colors ${betSide === 'NO' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground hover:bg-destructive/20'}`}>NO {selectedMarket.noPrice.toFixed(2)}</button>
              </div>
              <input type="number" placeholder="Amount (Ł)" value={betAmount} onChange={e => setBetAmount(e.target.value)} className="w-full px-2 py-1 rounded bg-muted border border-border text-[10px] text-foreground" />
              <div className="flex gap-1">
                {[10, 50, 100, 500].map(a => (
                  <button key={a} onClick={() => setBetAmount(String(a))} className="flex-1 py-0.5 rounded bg-muted hover:bg-primary/20 text-[9px] text-muted-foreground transition-colors">{a}</button>
                ))}
              </div>
              {betAmount && (
                <div className="text-[9px] text-muted-foreground space-y-0.5">
                  <div className="flex justify-between"><span>Shares</span><span className="text-foreground">{shares.toFixed(1)}</span></div>
                  <div className="flex justify-between"><span>Payout if {betSide}</span><span className="text-primary">{payout.toFixed(2)} Ł</span></div>
                </div>
              )}
              <button className="w-full py-1.5 rounded bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors">Confirm Bet</button>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="border border-border rounded p-2">
            <p className="text-[9px] text-muted-foreground mb-1">RECENT ACTIVITY</p>
            <div className="space-y-1">
              {ACTIVITY.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-[9px]">
                  <span className="text-muted-foreground">{a.user}</span>
                  <span className={a.side === 'YES' ? 'text-primary' : 'text-destructive'}>{a.side}</span>
                  <span className="text-foreground">{a.shares} @ {a.price}</span>
                  <span className="ml-auto text-muted-foreground">{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground font-mono text-xs">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Dices size={14} className="text-primary" />
        <span className="font-display text-[10px] tracking-wider text-primary">PRIMEBETS</span>
        <div className="ml-auto flex items-center gap-1 text-muted-foreground"><Wallet size={12} /> <span className="text-primary">{walletBalance.toLocaleString()} Ł</span></div>
      </div>

      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border">
        <button onClick={() => setTab('markets')} className={`px-2 py-0.5 rounded text-[9px] transition-colors ${tab === 'markets' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Markets</button>
        <button onClick={() => setTab('portfolio')} className={`px-2 py-0.5 rounded text-[9px] transition-colors ${tab === 'portfolio' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Portfolio</button>
        {tab === 'markets' && (
          <div className="ml-2 flex gap-1">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setSelectedCat(c)} className={`px-1.5 py-0.5 rounded text-[8px] transition-colors ${selectedCat === c ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{c}</button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-2">
        {tab === 'markets' ? (
          <div className="space-y-1">
            {filtered.map(m => (
              <button key={m.id} onClick={() => setSelectedMarket(m)} className="w-full text-left p-2 rounded border border-border hover:border-primary/40 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] text-foreground leading-tight">{m.question}</p>
                  <span className={`flex items-center gap-0.5 text-[9px] shrink-0 ${m.trend >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {m.trend >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}{Math.abs(m.trend).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1"><span className="text-[8px] text-muted-foreground">YES</span><span className="text-[10px] text-primary font-bold">{(m.yesPrice * 100).toFixed(0)}¢</span></div>
                  <div className="flex items-center gap-1"><span className="text-[8px] text-muted-foreground">NO</span><span className="text-[10px] text-destructive font-bold">{(m.noPrice * 100).toFixed(0)}¢</span></div>
                  <span className="text-[8px] text-muted-foreground ml-auto flex items-center gap-0.5"><BarChart3 size={8} />{(m.volume / 1000).toFixed(0)}K vol</span>
                  <span className="text-[8px] text-muted-foreground flex items-center gap-0.5"><Clock size={8} />{m.expiry}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${m.yesPrice * 100}%` }} />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="border border-border rounded p-2 text-center">
                <p className="text-[8px] text-muted-foreground">TOTAL VALUE</p>
                <p className="text-sm text-foreground font-bold">{(POSITIONS.reduce((s, p) => s + p.shares * p.currentPrice, 0)).toFixed(2)} Ł</p>
              </div>
              <div className="border border-border rounded p-2 text-center">
                <p className="text-[8px] text-muted-foreground">TOTAL P&L</p>
                <p className="text-sm text-primary font-bold">+{(POSITIONS.reduce((s, p) => s + p.shares * (p.currentPrice - p.avgCost), 0)).toFixed(2)} Ł</p>
              </div>
              <div className="border border-border rounded p-2 text-center">
                <p className="text-[8px] text-muted-foreground">POSITIONS</p>
                <p className="text-sm text-foreground font-bold">{POSITIONS.length}</p>
              </div>
            </div>
            <div className="border border-border rounded">
              <div className="grid grid-cols-6 gap-1 px-2 py-1 border-b border-border text-[8px] text-muted-foreground">
                <span className="col-span-2">Market</span><span>Side</span><span>Shares</span><span>Avg</span><span>P&L</span>
              </div>
              {POSITIONS.map(p => {
                const pnl = p.shares * (p.currentPrice - p.avgCost);
                return (
                  <div key={p.marketId} className="grid grid-cols-6 gap-1 px-2 py-1.5 border-b border-border/50 text-[9px]">
                    <span className="col-span-2 truncate text-foreground">{p.question}</span>
                    <span className={p.side === 'YES' ? 'text-primary' : 'text-destructive'}>{p.side}</span>
                    <span className="text-foreground">{p.shares}</span>
                    <span className="text-muted-foreground">{p.avgCost.toFixed(2)}</span>
                    <span className={pnl >= 0 ? 'text-primary' : 'text-destructive'}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
