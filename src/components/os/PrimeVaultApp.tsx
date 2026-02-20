import { useState, useMemo } from 'react';
import { Vault, TrendingUp, TrendingDown, PieChart as PieIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';

interface Holding {
  id: string;
  name: string;
  category: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
}

interface Transaction {
  id: string;
  asset: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  date: string;
}

const HOLDINGS: Holding[] = [
  { id: 'h1', name: 'Lattice Core', category: 'Compute', quantity: 120, avgCost: 142.00, currentPrice: 158.30 },
  { id: 'h2', name: 'QutritNode', category: 'Compute', quantity: 85, avgCost: 89.50, currentPrice: 94.20 },
  { id: 'h3', name: 'EnergyCell-A', category: 'Energy', quantity: 300, avgCost: 22.40, currentPrice: 25.80 },
  { id: 'h4', name: 'PrimeNet Bond', category: 'Network', quantity: 50, avgCost: 200.00, currentPrice: 212.50 },
  { id: 'h5', name: 'FoldStorage', category: 'Storage', quantity: 200, avgCost: 15.60, currentPrice: 14.90 },
  { id: 'h6', name: 'Adinkra Token', category: 'Storage', quantity: 500, avgCost: 8.20, currentPrice: 9.10 },
  { id: 'h7', name: 'GeomC License', category: 'Compute', quantity: 10, avgCost: 450.00, currentPrice: 520.00 },
];

const TRANSACTIONS: Transaction[] = [
  { id: 't1', asset: 'Lattice Core', type: 'buy', quantity: 20, price: 155.00, date: '2026-02-18' },
  { id: 't2', asset: 'EnergyCell-A', type: 'buy', quantity: 100, price: 24.50, date: '2026-02-15' },
  { id: 't3', asset: 'FoldStorage', type: 'sell', quantity: 50, price: 15.20, date: '2026-02-12' },
  { id: 't4', asset: 'QutritNode', type: 'buy', quantity: 35, price: 92.00, date: '2026-02-10' },
  { id: 't5', asset: 'Adinkra Token', type: 'buy', quantity: 200, price: 8.80, date: '2026-02-08' },
];

const CAT_COLORS: Record<string, string> = { Compute: 'hsl(var(--primary))', Energy: 'hsl(45 90% 55%)', Network: 'hsl(200 80% 55%)', Storage: 'hsl(280 60% 55%)' };

function generatePerformance() {
  const data = [];
  let val = 45000;
  let bench = 45000;
  for (let i = 0; i < 30; i++) {
    val += (Math.random() - 0.45) * 800;
    bench += (Math.random() - 0.48) * 600;
    data.push({ day: i + 1, portfolio: Math.round(val), benchmark: Math.round(bench) });
  }
  return data;
}

export default function PrimeVaultApp() {
  const [tab, setTab] = useState<'overview' | 'holdings' | 'history'>('overview');
  const [showBenchmark, setShowBenchmark] = useState(false);
  const perfData = useMemo(() => generatePerformance(), []);

  const totalValue = HOLDINGS.reduce((s, h) => s + h.quantity * h.currentPrice, 0);
  const totalCost = HOLDINGS.reduce((s, h) => s + h.quantity * h.avgCost, 0);
  const totalPnL = totalValue - totalCost;
  const dailyChange = totalValue * 0.012;

  const allocationData = useMemo(() => {
    const cats: Record<string, number> = {};
    HOLDINGS.forEach(h => { cats[h.category] = (cats[h.category] || 0) + h.quantity * h.currentPrice; });
    return Object.entries(cats).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, []);

  return (
    <div className="h-full flex flex-col bg-background text-foreground font-mono text-xs">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Vault size={14} className="text-primary" />
        <span className="font-display text-[10px] tracking-wider text-primary">PRIMEVAULT</span>
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
                <p className="text-lg text-foreground font-bold">{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} Ł</p>
              </div>
              <div className="border border-border rounded p-2">
                <p className="text-[8px] text-muted-foreground">DAILY CHANGE</p>
                <p className="text-lg text-primary font-bold flex items-center gap-1"><TrendingUp size={14} />+{dailyChange.toFixed(2)} Ł</p>
              </div>
              <div className="border border-border rounded p-2">
                <p className="text-[8px] text-muted-foreground">TOTAL P&L</p>
                <p className={`text-lg font-bold ${totalPnL >= 0 ? 'text-primary' : 'text-destructive'}`}>{totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} Ł</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-3 border border-border rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] text-muted-foreground">PERFORMANCE</p>
                  <button onClick={() => setShowBenchmark(!showBenchmark)} className={`text-[8px] px-1.5 py-0.5 rounded ${showBenchmark ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
                    vs Lattice Index
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={perfData}>
                    <XAxis dataKey="day" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 10 }} />
                    <Line type="monotone" dataKey="portfolio" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} name="Portfolio" />
                    {showBenchmark && <Line type="monotone" dataKey="benchmark" stroke="hsl(var(--muted-foreground))" strokeWidth={1} dot={false} strokeDasharray="4 2" name="Benchmark" />}
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
              <span className="col-span-2">Asset</span><span>Qty</span><span>Avg Cost</span><span>Price</span><span>P&L</span><span>Weight</span>
            </div>
            {HOLDINGS.map(h => {
              const pnl = h.quantity * (h.currentPrice - h.avgCost);
              const weight = (h.quantity * h.currentPrice / totalValue * 100);
              return (
                <div key={h.id} className="grid grid-cols-7 gap-1 px-2 py-1.5 border-b border-border/50 text-[9px] hover:bg-muted/20">
                  <div className="col-span-2">
                    <span className="text-foreground">{h.name}</span>
                    <span className="text-[8px] text-muted-foreground ml-1">{h.category}</span>
                  </div>
                  <span className="text-foreground">{h.quantity}</span>
                  <span className="text-muted-foreground">{h.avgCost.toFixed(2)}</span>
                  <span className="text-foreground">{h.currentPrice.toFixed(2)}</span>
                  <span className={pnl >= 0 ? 'text-primary' : 'text-destructive'}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}</span>
                  <span className="text-muted-foreground">{weight.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'history' && (
          <div className="border border-border rounded">
            <div className="grid grid-cols-5 gap-1 px-2 py-1.5 border-b border-border text-[8px] text-muted-foreground">
              <span>Date</span><span>Asset</span><span>Type</span><span>Qty</span><span>Price</span>
            </div>
            {TRANSACTIONS.map(t => (
              <div key={t.id} className="grid grid-cols-5 gap-1 px-2 py-1.5 border-b border-border/50 text-[9px] hover:bg-muted/20">
                <span className="text-muted-foreground">{t.date}</span>
                <span className="text-foreground">{t.asset}</span>
                <span className={t.type === 'buy' ? 'text-primary' : 'text-destructive'}>{t.type.toUpperCase()}</span>
                <span className="text-foreground">{t.quantity}</span>
                <span className="text-muted-foreground">{t.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
