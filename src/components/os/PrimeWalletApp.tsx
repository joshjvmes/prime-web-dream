import { useState, useEffect, useCallback } from 'react';
import { Wallet, Send, ArrowLeftRight, Shield, History, Trophy, RefreshCw, Search, ShoppingBag } from 'lucide-react';
import { eventBus } from '@/hooks/useEventBus';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useCloudStorage } from '@/hooks/useCloudStorage';

const EXCHANGE_RATE = 2_000_000;

function fmt(n: number | string, decimals = 2) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

async function bankAction(action: string, body?: object) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prime-bank?action=${action}`;
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export { bankAction };

type Tab = 'overview' | 'send' | 'exchange' | 'escrow' | 'history' | 'leaderboard' | 'shop';

const SHOP_ITEMS = [
  { id: 'dark_neon_theme', name: 'Dark Neon Theme', cost: 10000, desc: 'Unlock a neon color scheme for the OS', icon: '🌈' },
  { id: 'extra_workspace', name: 'Extra Workspace', cost: 25000, desc: 'Adds a 5th workspace slot', icon: '🖥️' },
  { id: 'ai_priority', name: 'AI Priority', cost: 50000, desc: 'Faster AI responses', icon: '⚡' },
  { id: 'custom_widget', name: 'Custom Widget', cost: 15000, desc: 'Unlock custom widget placement', icon: '🧩' },
  { id: 'geomq_pro', name: 'GeomQ Pro Toolkit', cost: 30000, desc: 'Advanced GeomQ gate operations', icon: '🔬' },
];

export default function PrimeWalletApp() {
  const [tab, setTab] = useState<Tab>('overview');

  // ROKCAT navigate listener
  useEffect(() => {
    const handler = (payload: any) => {
      if (payload?.app !== 'wallet' || !payload?.context) return;
      const ctx = payload.context.toLowerCase() as Tab;
      if (['overview', 'send', 'exchange', 'escrow', 'history', 'leaderboard', 'shop'].includes(ctx)) {
        setTab(ctx);
      }
    };
    eventBus.on('app.navigate', handler);
    return () => eventBus.off('app.navigate', handler);
  }, []);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { save, load } = useCloudStorage();

  // Send state
  const [sendSearch, setSendSearch] = useState('');
  const [sendResults, setSendResults] = useState<any[]>([]);
  const [sendTo, setSendTo] = useState<any>(null);
  const [sendAmount, setSendAmount] = useState('');
  const [sendToken, setSendToken] = useState<'OS' | 'IX'>('OS');
  const [sendDesc, setSendDesc] = useState('');

  // Exchange state
  const [exDir, setExDir] = useState<'buy_ix' | 'sell_ix'>('buy_ix');
  const [exAmount, setExAmount] = useState('');

  // History state
  const [txHistory, setTxHistory] = useState<any[]>([]);
  const [myWalletId, setMyWalletId] = useState('');

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Escrow
  const [escrows, setEscrows] = useState<any[]>([]);
  const [escrowCounterparty, setEscrowCounterparty] = useState('');
  const [escrowAmount, setEscrowAmount] = useState('');
  const [escrowToken, setEscrowToken] = useState<'OS' | 'IX'>('OS');
  const [escrowDesc, setEscrowDesc] = useState('');

  // Shop
  const [unlocks, setUnlocks] = useState<string[]>([]);
  const [purchasing, setPurchasing] = useState('');

  const loadWallet = useCallback(async () => {
    try {
      setLoading(true);
      const w = await bankAction('balance');
      setWallet(w);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  useEffect(() => {
    load<string[]>('user-unlocks', []).then(u => setUnlocks(u || []));
  }, [load]);

  const searchUsers = async (q: string) => {
    setSendSearch(q);
    if (q.length < 2) { setSendResults([]); return; }
    const { data } = await supabase.from('profiles').select('user_id, display_name, avatar_url').ilike('display_name', `%${q}%`).limit(5);
    setSendResults(data || []);
  };

  const doSend = async () => {
    if (!sendTo || !sendAmount) return;
    setError(''); setSuccess('');
    try {
      await bankAction('transfer', { to_user_id: sendTo.user_id, token_type: sendToken, amount: sendAmount, description: sendDesc });
      setSuccess(`Sent ${fmt(sendAmount)} ${sendToken}`);
      setSendTo(null); setSendAmount(''); setSendDesc('');
      loadWallet();
    } catch (e: any) { setError(e.message); }
  };

  const doExchange = async () => {
    if (!exAmount) return;
    setError(''); setSuccess('');
    try {
      await bankAction('exchange', { direction: exDir, amount: exAmount });
      setSuccess(exDir === 'buy_ix' ? `Bought ${exAmount} IX` : `Sold ${exAmount} IX`);
      setExAmount('');
      loadWallet();
    } catch (e: any) { setError(e.message); }
  };

  const loadHistory = async () => {
    try {
      const data = await bankAction('history');
      setTxHistory(data.transactions || []);
      setMyWalletId(data.wallet_id || '');
    } catch (e: any) { setError(e.message); }
  };

  const loadLeaderboard = async () => {
    try {
      const data = await bankAction('leaderboard');
      setLeaderboard(data);
    } catch (e: any) { setError(e.message); }
  };

  const loadEscrows = async () => {
    const { data } = await supabase.from('escrow_deals').select('*').order('created_at', { ascending: false });
    setEscrows(data || []);
  };

  const createEscrow = async () => {
    if (!escrowCounterparty || !escrowAmount) return;
    setError(''); setSuccess('');
    try {
      await bankAction('escrow-create', { counterparty_id: escrowCounterparty, token_type: escrowToken, amount: escrowAmount, description: escrowDesc });
      setSuccess('Escrow created');
      setEscrowCounterparty(''); setEscrowAmount(''); setEscrowDesc('');
      loadEscrows(); loadWallet();
    } catch (e: any) { setError(e.message); }
  };

  const releaseEscrow = async (id: string) => {
    try { await bankAction('escrow-release', { escrow_id: id }); loadEscrows(); loadWallet(); } catch (e: any) { setError(e.message); }
  };
  const cancelEscrow = async (id: string) => {
    try { await bankAction('escrow-cancel', { escrow_id: id }); loadEscrows(); loadWallet(); } catch (e: any) { setError(e.message); }
  };

  const purchaseItem = async (item: typeof SHOP_ITEMS[0]) => {
    if (unlocks.includes(item.id)) return;
    setPurchasing(item.id);
    setError(''); setSuccess('');
    try {
      await bankAction('purchase-unlock', { item_id: item.id, cost: item.cost });
      const newUnlocks = [...unlocks, item.id];
      setUnlocks(newUnlocks);
      await save('user-unlocks', newUnlocks);
      setSuccess(`Unlocked: ${item.name}`);
      loadWallet();
    } catch (e: any) { setError(e.message); }
    finally { setPurchasing(''); }
  };

  useEffect(() => {
    if (tab === 'history') loadHistory();
    if (tab === 'leaderboard') loadLeaderboard();
    if (tab === 'escrow') loadEscrows();
  }, [tab]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Wallet size={12} /> },
    { id: 'send', label: 'Send', icon: <Send size={12} /> },
    { id: 'exchange', label: 'Exchange', icon: <ArrowLeftRight size={12} /> },
    { id: 'escrow', label: 'Escrow', icon: <Shield size={12} /> },
    { id: 'history', label: 'History', icon: <History size={12} /> },
    { id: 'leaderboard', label: 'Board', icon: <Trophy size={12} /> },
    { id: 'shop', label: 'Shop', icon: <ShoppingBag size={12} /> },
  ];

  const txColor = (tx: any) => {
    if (tx.tx_type === 'interest') return 'text-blue-400';
    if (tx.tx_type === 'reward') return 'text-emerald-400';
    if (tx.tx_type === 'escrow_lock' || tx.tx_type === 'escrow_release') return 'text-amber-400';
    if (tx.to_wallet_id === myWalletId) return 'text-emerald-400';
    return 'text-destructive';
  };

  return (
    <div className="h-full flex flex-col bg-card/50 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Wallet size={14} className="text-primary" />
        <span className="font-display text-[9px] tracking-[0.2em] uppercase text-primary">Prime Wallet</span>
        <button onClick={loadWallet} className="ml-auto p-1 rounded hover:bg-muted text-muted-foreground"><RefreshCw size={10} /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setError(''); setSuccess(''); }}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-display tracking-wider uppercase whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {error && <div className="px-3 py-1 bg-destructive/10 text-destructive text-[10px]">{error}</div>}
      {success && <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px]">{success}</div>}

      <ScrollArea className="flex-1">
        <div className="p-3">
          {loading && !wallet ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">Loading wallet...</div>
          ) : (
            <>
              {/* Overview */}
              {tab === 'overview' && wallet && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded border border-border bg-background/50">
                      <p className="text-[9px] text-muted-foreground font-display tracking-wider uppercase">OS Tokens</p>
                      <p className="text-xl font-mono text-primary mt-1">{fmt(wallet.os_balance)}</p>
                      <p className="text-[8px] text-muted-foreground mt-1">Earns daily interest</p>
                    </div>
                    <div className="p-4 rounded border border-border bg-background/50">
                      <p className="text-[9px] text-muted-foreground font-display tracking-wider uppercase">ICE-IX (IX)</p>
                      <p className="text-xl font-mono text-amber-400 mt-1">{fmt(wallet.ix_balance, 6)}</p>
                      <p className="text-[8px] text-muted-foreground mt-1">Reserve currency</p>
                    </div>
                  </div>
                  <div className="p-3 rounded border border-border/50 bg-muted/20">
                    <p className="text-[9px] text-muted-foreground">Exchange Rate</p>
                    <p className="text-foreground mt-0.5">{fmt(EXCHANGE_RATE, 0)} OS = 1 IX</p>
                  </div>
                </div>
              )}

              {/* Send */}
              {tab === 'send' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] text-muted-foreground block mb-1">Recipient</label>
                    {sendTo ? (
                      <div className="flex items-center gap-2 p-2 rounded border border-primary/30 bg-primary/5">
                        <span className="text-foreground">{sendTo.display_name}</span>
                        <button onClick={() => setSendTo(null)} className="text-muted-foreground hover:text-destructive text-[8px]">✕</button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input value={sendSearch} onChange={e => searchUsers(e.target.value)}
                          placeholder="Search by name..." className="w-full pl-7 pr-2 py-1.5 bg-background border border-border rounded text-xs" />
                        {sendResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-b mt-0.5 z-10">
                            {sendResults.map(u => (
                              <button key={u.user_id} onClick={() => { setSendTo(u); setSendResults([]); setSendSearch(''); }}
                                className="w-full text-left px-3 py-1.5 hover:bg-muted/30 text-xs">{u.display_name || 'Anonymous'}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[9px] text-muted-foreground block mb-1">Amount</label>
                      <input value={sendAmount} onChange={e => setSendAmount(e.target.value)} type="number" min="0" step="0.01"
                        className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs" />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground block mb-1">Token</label>
                      <select value={sendToken} onChange={e => setSendToken(e.target.value as any)}
                        className="px-2 py-1.5 bg-background border border-border rounded text-xs">
                        <option value="OS">OS</option>
                        <option value="IX">IX</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground block mb-1">Note (optional)</label>
                    <input value={sendDesc} onChange={e => setSendDesc(e.target.value)}
                      className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs" />
                  </div>
                  <button onClick={doSend} disabled={!sendTo || !sendAmount}
                    className="w-full py-2 rounded bg-primary text-primary-foreground text-[10px] font-display tracking-wider uppercase disabled:opacity-50 hover:bg-primary/90">
                    Send {sendToken}
                  </button>
                </div>
              )}

              {/* Exchange */}
              {tab === 'exchange' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button onClick={() => setExDir('buy_ix')}
                      className={`flex-1 py-2 rounded text-[10px] font-display tracking-wider uppercase border ${exDir === 'buy_ix' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                      Buy IX
                    </button>
                    <button onClick={() => setExDir('sell_ix')}
                      className={`flex-1 py-2 rounded text-[10px] font-display tracking-wider uppercase border ${exDir === 'sell_ix' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                      Sell IX
                    </button>
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground block mb-1">
                      {exDir === 'buy_ix' ? 'IX to buy' : 'IX to sell'}
                    </label>
                    <input value={exAmount} onChange={e => setExAmount(e.target.value)} type="number" min="0" step="0.000001"
                      className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs" />
                    {exAmount && (
                      <p className="text-[9px] text-muted-foreground mt-1">
                        {exDir === 'buy_ix'
                          ? `Cost: ${fmt(Number(exAmount) * EXCHANGE_RATE, 0)} OS`
                          : `Receive: ${fmt(Number(exAmount) * EXCHANGE_RATE, 0)} OS`}
                      </p>
                    )}
                  </div>
                  <button onClick={doExchange} disabled={!exAmount}
                    className="w-full py-2 rounded bg-primary text-primary-foreground text-[10px] font-display tracking-wider uppercase disabled:opacity-50 hover:bg-primary/90">
                    {exDir === 'buy_ix' ? 'Buy IX' : 'Sell IX'}
                  </button>
                </div>
              )}

              {/* Escrow */}
              {tab === 'escrow' && (
                <div className="space-y-4">
                  <div className="space-y-2 p-3 rounded border border-border bg-background/30">
                    <p className="text-[9px] font-display tracking-wider uppercase text-primary">Create Escrow</p>
                    <input value={escrowCounterparty} onChange={e => setEscrowCounterparty(e.target.value)}
                      placeholder="Counterparty user ID" className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs" />
                    <div className="flex gap-2">
                      <input value={escrowAmount} onChange={e => setEscrowAmount(e.target.value)} type="number" placeholder="Amount"
                        className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-xs" />
                      <select value={escrowToken} onChange={e => setEscrowToken(e.target.value as any)}
                        className="px-2 py-1.5 bg-background border border-border rounded text-xs">
                        <option value="OS">OS</option>
                        <option value="IX">IX</option>
                      </select>
                    </div>
                    <input value={escrowDesc} onChange={e => setEscrowDesc(e.target.value)} placeholder="Description"
                      className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs" />
                    <button onClick={createEscrow} className="w-full py-1.5 rounded bg-primary/20 text-primary text-[10px] hover:bg-primary/30">Create</button>
                  </div>
                  <div className="space-y-1">
                    {escrows.map((e: any) => (
                      <div key={e.id} className="p-2 rounded border border-border/50 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground truncate">{e.description || 'Escrow deal'}</p>
                          <p className="text-[9px] text-muted-foreground">{fmt(e.amount)} {e.token_type} • {e.status}</p>
                        </div>
                        {e.status === 'locked' && (
                          <div className="flex gap-1">
                            <button onClick={() => releaseEscrow(e.id)} className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[8px]">Release</button>
                            <button onClick={() => cancelEscrow(e.id)} className="px-2 py-0.5 rounded bg-destructive/20 text-destructive text-[8px]">Cancel</button>
                          </div>
                        )}
                      </div>
                    ))}
                    {escrows.length === 0 && <p className="text-center text-muted-foreground py-4">No escrow deals</p>}
                  </div>
                </div>
              )}

              {/* History */}
              {tab === 'history' && (
                <div className="space-y-1">
                  {txHistory.map((tx: any) => (
                    <div key={tx.id} className="p-2 rounded border border-border/50 flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${txColor(tx).replace('text-', 'bg-')}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground truncate text-[10px]">{tx.description || tx.tx_type}</p>
                        <p className="text-[8px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`text-[10px] font-mono ${txColor(tx)}`}>
                        {tx.to_wallet_id === myWalletId ? '+' : '-'}{fmt(tx.amount)} {tx.token_type}
                      </span>
                    </div>
                  ))}
                  {txHistory.length === 0 && <p className="text-center text-muted-foreground py-4">No transactions yet</p>}
                </div>
              )}

              {/* Leaderboard */}
              {tab === 'leaderboard' && (
                <div className="space-y-1">
                  {leaderboard.map((entry: any, i: number) => (
                    <div key={entry.user_id} className="p-2 rounded border border-border/50 flex items-center gap-2">
                      <span className={`w-5 text-center font-display text-[10px] ${i < 3 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground truncate">{entry.display_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-primary font-mono">{fmt(entry.os_balance)} OS</p>
                        {Number(entry.ix_balance) > 0 && (
                          <p className="text-[9px] text-amber-400 font-mono">{fmt(entry.ix_balance, 6)} IX</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {leaderboard.length === 0 && <p className="text-center text-muted-foreground py-4">No data</p>}
                </div>
              )}

              {/* Shop */}
              {tab === 'shop' && (
                <div className="space-y-3">
                  <p className="text-[9px] text-muted-foreground font-display tracking-wider uppercase">
                    Balance: <span className="text-primary">{wallet ? fmt(wallet.os_balance) : '—'} OS</span>
                  </p>
                  {SHOP_ITEMS.map(item => {
                    const owned = unlocks.includes(item.id);
                    const canAfford = wallet && Number(wallet.os_balance) >= item.cost;
                    return (
                      <div key={item.id} className={`p-3 rounded border ${owned ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-background/30'}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-lg">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground text-[11px] font-medium">{item.name}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{item.desc}</p>
                          </div>
                          <div className="text-right shrink-0">
                            {owned ? (
                              <span className="text-[9px] text-emerald-400 font-display tracking-wider uppercase">Owned</span>
                            ) : (
                              <>
                                <p className="text-[10px] text-primary font-mono">{fmt(item.cost, 0)} OS</p>
                                <button
                                  onClick={() => purchaseItem(item)}
                                  disabled={!canAfford || purchasing === item.id}
                                  className="mt-1 px-2 py-0.5 rounded bg-primary/20 text-primary text-[8px] hover:bg-primary/30 disabled:opacity-40 font-display tracking-wider uppercase"
                                >
                                  {purchasing === item.id ? '...' : 'Buy'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
