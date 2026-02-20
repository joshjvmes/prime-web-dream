import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dices, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Wallet, BarChart3, Clock, ChevronLeft, Plus, RefreshCw, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BetMarket {
  id: string;
  creator_id: string;
  question: string;
  category: string;
  listing_id: string | null;
  yes_pool: number;
  no_pool: number;
  status: string;
  expiry: string | null;
  created_at: string;
  creation_cost: number;
  source?: string;
  external_id?: string;
  sport_key?: string;
  sport_title?: string;
  home_team?: string;
  away_team?: string;
  commence_time?: string;
  odds_data?: { bookmakers: Array<{ title: string; markets: Array<{ outcomes: Array<{ name: string; price: number }> }> }> };
}

interface UserBet {
  id: string;
  market_id: string;
  side: string;
  amount: number;
  claimed: boolean;
}

const CATEGORIES = ['All', 'general', 'apps', 'compute', 'network', 'energy', 'sports'];
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function bankAction(action: string, body?: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/prime-bank?action=${action}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

function generateChartData(yesRatio: number) {
  const data = [];
  let yes = yesRatio - 0.15 + Math.random() * 0.1;
  for (let i = 0; i < 30; i++) {
    yes += (Math.random() - 0.48) * 0.03;
    yes = Math.max(0.05, Math.min(0.95, yes));
    data.push({ day: i + 1, yes: +yes.toFixed(3), no: +(1 - yes).toFixed(3) });
  }
  return data;
}

function americanToImplied(odds: number): number {
  if (odds < 0) return Math.abs(odds) / (Math.abs(odds) + 100);
  return 100 / (odds + 100);
}

function getBookmakerAvgOdds(market: BetMarket): { homeProb: number; awayProb: number } | null {
  if (!market.odds_data?.bookmakers?.length) return null;
  let homeSum = 0, awaySum = 0, count = 0;
  for (const bk of market.odds_data.bookmakers) {
    const h2h = bk.markets?.find((m: any) => m.key === 'h2h');
    if (!h2h?.outcomes?.length) continue;
    const homeOutcome = h2h.outcomes.find((o: any) => o.name === market.home_team);
    const awayOutcome = h2h.outcomes.find((o: any) => o.name === market.away_team);
    if (homeOutcome && awayOutcome) {
      homeSum += americanToImplied(homeOutcome.price);
      awaySum += americanToImplied(awayOutcome.price);
      count++;
    }
  }
  if (count === 0) return null;
  return { homeProb: homeSum / count, awayProb: awaySum / count };
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Started';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function PrimeBetsApp() {
  const [tab, setTab] = useState<'markets' | 'portfolio' | 'create'>('markets');
  const [selectedCat, setSelectedCat] = useState('All');
  const [markets, setMarkets] = useState<BetMarket[]>([]);
  const [myBets, setMyBets] = useState<UserBet[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<BetMarket | null>(null);
  const [betSide, setBetSide] = useState<'YES' | 'NO'>('YES');
  const [betAmount, setBetAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Create market
  const [newQuestion, setNewQuestion] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newExpiry, setNewExpiry] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: mkts }, { data: bets }] = await Promise.all([
      supabase.from('bet_markets').select('*').order('created_at', { ascending: false }),
      supabase.from('bets').select('*'),
    ]);
    setMarkets((mkts as BetMarket[]) || []);
    setMyBets((bets as UserBet[]) || []);
    const bal = await bankAction('balance');
    if (bal?.os_balance) setWalletBalance(Number(bal.os_balance));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const channel = supabase.channel('bets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bet_markets' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const refreshSports = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sports-odds?action=refresh-odds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      await res.json();
      await loadData();
    } catch (e) {
      console.error('Failed to refresh sports:', e);
    }
    setRefreshing(false);
  };

  const placeBet = async () => {
    if (!selectedMarket || !betAmount) return;
    const res = await bankAction('bet-place', { market_id: selectedMarket.id, side: betSide, amount: Number(betAmount) });
    if (res?.error) return alert(res.error);
    setBetAmount('');
    loadData();
  };

  const createMarket = async () => {
    if (!newQuestion.trim()) return;
    const res = await bankAction('bet-create-market', {
      question: newQuestion, category: newCategory,
      expiry: newExpiry || null,
    });
    if (res?.error) return alert(res.error);
    setNewQuestion('');
    setNewExpiry('');
    setTab('markets');
    loadData();
  };

  const resolveMarket = async (marketId: string, outcome: string) => {
    const res = await bankAction('bet-resolve', { market_id: marketId, outcome });
    if (res?.error) return alert(res.error);
    setSelectedMarket(null);
    loadData();
  };

  const filtered = useMemo(() => {
    let list = markets.filter(m => m.status === 'open');
    if (selectedCat !== 'All') list = list.filter(m => m.category === selectedCat);
    return list;
  }, [markets, selectedCat]);

  const chartData = useMemo(() => {
    if (!selectedMarket) return [];
    const total = Number(selectedMarket.yes_pool) + Number(selectedMarket.no_pool);
    const yesRatio = total > 0 ? Number(selectedMarket.yes_pool) / total : 0.5;
    return generateChartData(yesRatio);
  }, [selectedMarket]);

  const isSportsMarket = (m: BetMarket) => m.source === 'sports_api';

  // ─── Market Detail View ───
  if (selectedMarket) {
    const total = Number(selectedMarket.yes_pool) + Number(selectedMarket.no_pool);
    const yesPrice = total > 0 ? Number(selectedMarket.yes_pool) / total : 0.5;
    const noPrice = 1 - yesPrice;
    const shares = betAmount ? parseFloat(betAmount) / (betSide === 'YES' ? yesPrice || 0.5 : noPrice || 0.5) : 0;
    const payout = shares;
    const myMarketBets = myBets.filter(b => b.market_id === selectedMarket.id);
    const bookOdds = isSportsMarket(selectedMarket) ? getBookmakerAvgOdds(selectedMarket) : null;

    return (
      <div className="h-full flex flex-col bg-background text-foreground font-mono text-xs">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button onClick={() => setSelectedMarket(null)} className="p-1 hover:bg-muted rounded"><ChevronLeft size={14} /></button>
          <span className="text-muted-foreground truncate flex-1">{selectedMarket.question}</span>
          <div className="flex items-center gap-1 text-muted-foreground"><Wallet size={12} /> <span className="text-primary">{walletBalance.toLocaleString()} OS</span></div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {/* Sports header */}
            {isSportsMarket(selectedMarket) && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[8px] font-bold">{selectedMarket.sport_title || selectedMarket.sport_key}</span>
                <span className="text-[9px] text-foreground font-bold">{selectedMarket.home_team} vs {selectedMarket.away_team}</span>
                {selectedMarket.commence_time && (
                  <span className="ml-auto flex items-center gap-0.5 text-[8px] text-muted-foreground"><Clock size={8} />{timeUntil(selectedMarket.commence_time)}</span>
                )}
              </div>
            )}

            {/* Price Chart */}
            <div className="border border-border rounded p-2">
              <p className="text-[9px] text-muted-foreground mb-1">PROBABILITY</p>
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

            {/* Pool Stats + Bookmaker Odds */}
            <div className="grid grid-cols-3 gap-2">
              <div className="border border-border rounded p-2 text-center">
                <p className="text-[8px] text-muted-foreground">YES POOL</p>
                <p className="text-sm text-primary font-bold">{Number(selectedMarket.yes_pool).toLocaleString()} OS</p>
              </div>
              <div className="border border-border rounded p-2 text-center">
                <p className="text-[8px] text-muted-foreground">NO POOL</p>
                <p className="text-sm text-destructive font-bold">{Number(selectedMarket.no_pool).toLocaleString()} OS</p>
              </div>
              <div className="border border-border rounded p-2 text-center">
                <p className="text-[8px] text-muted-foreground">TOTAL</p>
                <p className="text-sm text-foreground font-bold">{total.toLocaleString()} OS</p>
              </div>
            </div>

            {/* Bookmaker odds comparison */}
            {bookOdds && (
              <div className="border border-border rounded p-2 space-y-1">
                <p className="text-[9px] text-muted-foreground font-bold flex items-center gap-1"><Zap size={8} className="text-primary" />BOOKMAKER vs POOL ODDS</p>
                <div className="grid grid-cols-2 gap-2 text-[9px]">
                  <div>
                    <span className="text-muted-foreground">Home ({selectedMarket.home_team})</span>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-primary">Pool: {(yesPrice * 100).toFixed(0)}%</span>
                      <span className="text-accent-foreground">Book: {(bookOdds.homeProb * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Away ({selectedMarket.away_team})</span>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-destructive">Pool: {(noPrice * 100).toFixed(0)}%</span>
                      <span className="text-accent-foreground">Book: {(bookOdds.awayProb * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Betting Panel */}
            {selectedMarket.status === 'open' && (
              <div className="border border-border rounded p-3 space-y-2">
                <p className="text-[9px] text-muted-foreground font-bold">PLACE BET</p>
                <div className="flex gap-1">
                  <button onClick={() => setBetSide('YES')} className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-colors ${betSide === 'YES' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/20'}`}>YES {(yesPrice * 100).toFixed(0)}¢</button>
                  <button onClick={() => setBetSide('NO')} className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-colors ${betSide === 'NO' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground hover:bg-destructive/20'}`}>NO {(noPrice * 100).toFixed(0)}¢</button>
                </div>
                <input type="number" placeholder="Amount (OS)" value={betAmount} onChange={e => setBetAmount(e.target.value)} className="w-full px-2 py-1.5 rounded bg-muted border border-border text-[10px] text-foreground" />
                <div className="flex gap-1">
                  {[100, 500, 1000, 5000].map(a => (
                    <button key={a} onClick={() => setBetAmount(String(a))} className="flex-1 py-0.5 rounded bg-muted hover:bg-primary/20 text-[9px] text-muted-foreground transition-colors">{a}</button>
                  ))}
                </div>
                {betAmount && (
                  <div className="text-[9px] text-muted-foreground space-y-0.5">
                    <div className="flex justify-between"><span>Shares</span><span className="text-foreground">{shares.toFixed(1)}</span></div>
                    <div className="flex justify-between"><span>Payout if {betSide}</span><span className="text-primary">{payout.toFixed(2)} OS</span></div>
                  </div>
                )}
                <button onClick={placeBet} disabled={!betAmount} className="w-full py-1.5 rounded bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">Confirm Bet</button>
              </div>
            )}

            {/* My Bets on this market */}
            {myMarketBets.length > 0 && (
              <div className="border border-border rounded p-2">
                <p className="text-[9px] text-muted-foreground mb-1">YOUR BETS</p>
                {myMarketBets.map(b => (
                  <div key={b.id} className="flex items-center gap-2 text-[9px] py-1">
                    <span className={b.side === 'YES' ? 'text-primary font-bold' : 'text-destructive font-bold'}>{b.side}</span>
                    <span className="text-foreground">{Number(b.amount).toLocaleString()} OS</span>
                    {b.claimed && <span className="text-muted-foreground">(claimed)</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Resolve buttons (creator/admin) - hidden for sports markets */}
            {selectedMarket.status === 'open' && !isSportsMarket(selectedMarket) && (
              <div className="border border-border rounded p-2 space-y-1">
                <p className="text-[9px] text-muted-foreground">RESOLVE (creator/admin only)</p>
                <div className="flex gap-1">
                  <button onClick={() => resolveMarket(selectedMarket.id, 'yes')} className="flex-1 py-1 rounded bg-primary/20 text-primary text-[9px] hover:bg-primary/30">Resolve YES</button>
                  <button onClick={() => resolveMarket(selectedMarket.id, 'no')} className="flex-1 py-1 rounded bg-destructive/20 text-destructive text-[9px] hover:bg-destructive/30">Resolve NO</button>
                  <button onClick={() => resolveMarket(selectedMarket.id, 'cancelled')} className="flex-1 py-1 rounded bg-muted text-muted-foreground text-[9px] hover:bg-muted/80">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // ─── Market List View ───
  return (
    <div className="h-full flex flex-col bg-background text-foreground font-mono text-xs">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Dices size={14} className="text-primary" />
        <span className="font-display text-[10px] tracking-wider text-primary">PRIMEBETS</span>
        <div className="ml-auto flex items-center gap-1 text-muted-foreground"><Wallet size={12} /> <span className="text-primary">{walletBalance.toLocaleString()} OS</span></div>
      </div>

      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border">
        <button onClick={() => setTab('markets')} className={`px-2 py-0.5 rounded text-[9px] transition-colors ${tab === 'markets' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Markets</button>
        <button onClick={() => setTab('portfolio')} className={`px-2 py-0.5 rounded text-[9px] transition-colors ${tab === 'portfolio' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>My Bets</button>
        <button onClick={() => setTab('create')} className={`px-2 py-0.5 rounded text-[9px] transition-colors ${tab === 'create' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          <Plus size={10} className="inline mr-0.5" />Create
        </button>
        {tab === 'markets' && (
          <>
            <div className="ml-2 flex gap-1 overflow-x-auto scrollbar-none">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setSelectedCat(c)} className={`px-1.5 py-0.5 rounded text-[8px] shrink-0 transition-colors ${selectedCat === c ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{c}</button>
              ))}
            </div>
            <button onClick={refreshSports} disabled={refreshing} className="ml-1 p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors disabled:opacity-50" title="Refresh Sports Feed">
              <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {tab === 'markets' && (
            loading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> :
            filtered.length === 0 ? (
              <div className="text-center py-8">
                <Dices size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No open markets</p>
                <p className="text-[9px] text-muted-foreground/60">Create one or refresh sports feed</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map(m => {
                  const total = Number(m.yes_pool) + Number(m.no_pool);
                  const yesPrice = total > 0 ? Number(m.yes_pool) / total : 0.5;
                  const noPrice = 1 - yesPrice;
                  const isSport = isSportsMarket(m);
                  const bookOdds = isSport ? getBookmakerAvgOdds(m) : null;

                  return (
                    <button key={m.id} onClick={() => setSelectedMarket(m)} className="w-full text-left p-2 rounded border border-border hover:border-primary/40 hover:bg-muted/30 transition-colors">
                      {isSport && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-1 py-0.5 rounded bg-primary/20 text-primary text-[7px] font-bold">{m.sport_title || m.sport_key}</span>
                          <span className="text-[8px] text-foreground font-bold">{m.home_team} vs {m.away_team}</span>
                          {m.commence_time && (
                            <span className="ml-auto flex items-center gap-0.5 text-[7px] text-muted-foreground"><Clock size={7} />{timeUntil(m.commence_time)}</span>
                          )}
                        </div>
                      )}
                      {!isSport && <p className="text-[10px] text-foreground leading-tight">{m.question}</p>}
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1"><span className="text-[8px] text-muted-foreground">YES</span><span className="text-[10px] text-primary font-bold">{(yesPrice * 100).toFixed(0)}¢</span></div>
                        <div className="flex items-center gap-1"><span className="text-[8px] text-muted-foreground">NO</span><span className="text-[10px] text-destructive font-bold">{(noPrice * 100).toFixed(0)}¢</span></div>
                        {bookOdds && (
                          <div className="flex items-center gap-1 text-[7px] text-muted-foreground">
                            <Zap size={7} className="text-primary" />
                            <span>Book: {(bookOdds.homeProb * 100).toFixed(0)}%</span>
                          </div>
                        )}
                        <span className="text-[8px] text-muted-foreground ml-auto flex items-center gap-0.5"><BarChart3 size={8} />{total.toLocaleString()} OS</span>
                        <span className="text-[8px] text-muted-foreground px-1 rounded bg-muted">{m.category}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${yesPrice * 100}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          )}

          {tab === 'portfolio' && (
            myBets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No bets placed yet</div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-border rounded p-2 text-center">
                    <p className="text-[8px] text-muted-foreground">TOTAL BETS</p>
                    <p className="text-sm text-foreground font-bold">{myBets.length}</p>
                  </div>
                  <div className="border border-border rounded p-2 text-center">
                    <p className="text-[8px] text-muted-foreground">TOTAL WAGERED</p>
                    <p className="text-sm text-primary font-bold">{myBets.reduce((s, b) => s + Number(b.amount), 0).toLocaleString()} OS</p>
                  </div>
                </div>
                <div className="border border-border rounded">
                  <div className="grid grid-cols-4 gap-1 px-2 py-1 border-b border-border text-[8px] text-muted-foreground">
                    <span className="col-span-2">Market</span><span>Side</span><span>Amount</span>
                  </div>
                  {myBets.map(b => {
                    const mkt = markets.find(m => m.id === b.market_id);
                    return (
                      <div key={b.id} className="grid grid-cols-4 gap-1 px-2 py-1.5 border-b border-border/50 text-[9px]">
                        <span className="col-span-2 truncate text-foreground">{mkt?.question || 'Unknown'}</span>
                        <span className={b.side === 'YES' ? 'text-primary' : 'text-destructive'}>{b.side}</span>
                        <span className="text-foreground">{Number(b.amount).toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {tab === 'create' && (
            <div className="p-2 space-y-3">
              <div className="text-center py-2">
                <Plus size={24} className="mx-auto text-primary/30 mb-2" />
                <p className="text-foreground font-display text-[11px] tracking-wider">Create a Prediction Market</p>
                <p className="text-[9px] text-muted-foreground mt-1">Costs 1,000 OS to create</p>
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground">Question</label>
                <textarea value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="Will X happen by Y date?"
                  className="w-full mt-1 px-2 py-1.5 rounded bg-muted border border-border text-[10px] text-foreground resize-none h-16" />
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground">Category</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                  className="w-full mt-1 px-2 py-1 rounded bg-muted border border-border text-[10px] text-foreground">
                  {CATEGORIES.filter(c => c !== 'All' && c !== 'sports').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground">Expiry (optional)</label>
                <input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)}
                  className="w-full mt-1 px-2 py-1 rounded bg-muted border border-border text-[10px] text-foreground" />
              </div>
              <button onClick={createMarket} disabled={!newQuestion.trim()}
                className="w-full py-2 rounded bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
                Create Market (1,000 OS)
              </button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
