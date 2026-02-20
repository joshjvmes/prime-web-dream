import { useState, useEffect, useCallback, useMemo } from 'react';
import { Blocks, Plus, Trash2, Play, Code, ArrowLeft, Store, Briefcase, Upload, Download, Search, TrendingUp, BarChart3, DollarSign, Users, Star, Filter, ChevronLeft, ShoppingCart, Rocket, LineChart } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { supabase } from '@/integrations/supabase/client';
import { useCloudStorage } from '@/hooks/useCloudStorage';
import MiniAppRenderer from './MiniAppRenderer';

interface MiniApp {
  id: string;
  name: string;
  description: string;
  code: string;
  icon: string;
  createdAt: string;
}

interface ForgeListing {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  icon: string;
  code: string;
  category: string;
  version: number;
  installs: number;
  revenue: number;
  price: number;
  is_listed: boolean;
  ipo_active: boolean;
  ipo_target: number;
  ipo_raised: number;
  total_shares: number;
  share_price: number;
  created_at: string;
  updated_at: string;
}

interface ShareHolding {
  id: string;
  listing_id: string;
  shares: number;
  avg_cost: number;
}

const CATEGORIES = ['All', 'utility', 'game', 'tool', 'social', 'finance', 'other'];
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

export default function AppForgeApp() {
  const { save, load } = useCloudStorage();
  const [tab, setTab] = useState('myapps');
  const [myApps, setMyApps] = useState<MiniApp[]>([]);
  const [forgeListings, setForgeListings] = useState<ForgeListing[]>([]);
  const [myShares, setMyShares] = useState<ShareHolding[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [selectedListing, setSelectedListing] = useState<ForgeListing | null>(null);
  const [publishingApp, setPublishingApp] = useState<MiniApp | null>(null);
  const [publishForm, setPublishForm] = useState({ category: 'utility', price: 0, ipoActive: false, ipoTarget: 0, sharePrice: 1, totalShares: 1000 });
  const [creating, setCreating] = useState(false);
  const [createPrompt, setCreatePrompt] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  // Trading
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [orderShares, setOrderShares] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [investAmount, setInvestAmount] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [stored, { data: listings }, { data: shares }] = await Promise.all([
      load<MiniApp[]>('user-mini-apps', []),
      supabase.from('forge_listings').select('*').eq('is_listed', true).order('installs', { ascending: false }),
      supabase.from('app_shares').select('*'),
    ]);
    setMyApps(stored || []);
    setForgeListings((listings as ForgeListing[]) || []);
    setMyShares((shares as ShareHolding[]) || []);
    setLoading(false);
  }, [load]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Realtime for forge_listings
  useEffect(() => {
    const channel = supabase.channel('forge-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forge_listings' }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAll]);

  const deleteApp = async (id: string) => {
    const updated = myApps.filter(a => a.id !== id);
    setMyApps(updated);
    await save('user-mini-apps', updated);
    if (running === id) setRunning(null);
    if (viewing === id) setViewing(null);
  };

  const installForgeApp = async (listing: ForgeListing) => {
    if (listing.price > 0) {
      const res = await bankAction('forge-install', { listing_id: listing.id, price: listing.price });
      if (res?.error) return alert(res.error);
    }
    const newApp: MiniApp = {
      id: `forge-${listing.id}-${Date.now()}`,
      name: listing.name,
      description: listing.description,
      code: listing.code,
      icon: listing.icon,
      createdAt: new Date().toISOString(),
    };
    const updated = [...myApps, newApp];
    setMyApps(updated);
    await save('user-mini-apps', updated);
    setSelectedListing(null);
    setTab('myapps');
  };

  const publishToForge = async () => {
    if (!publishingApp) return;
    const res = await bankAction('forge-publish', {
      name: publishingApp.name,
      description: publishingApp.description,
      icon: publishingApp.icon,
      code: publishingApp.code,
      category: publishForm.category,
      price: publishForm.price,
      ipo_active: publishForm.ipoActive,
      ipo_target: publishForm.ipoTarget,
      share_price: publishForm.sharePrice,
      total_shares: publishForm.totalShares,
    });
    if (res?.error) return alert(res.error);
    setPublishingApp(null);
    setPublishForm({ category: 'utility', price: 0, ipoActive: false, ipoTarget: 0, sharePrice: 1, totalShares: 1000 });
    loadAll();
  };

  const investInIPO = async (listing: ForgeListing) => {
    const amt = Number(investAmount);
    if (!amt || amt <= 0) return;
    const res = await bankAction('forge-invest', { listing_id: listing.id, amount: amt });
    if (res?.error) return alert(res.error);
    setInvestAmount('');
    loadAll();
  };

  const placeOrder = async (listing: ForgeListing) => {
    const shares = Number(orderShares);
    const price = Number(orderPrice);
    if (!shares || !price || shares <= 0 || price <= 0) return;
    const res = await bankAction('share-order', { listing_id: listing.id, order_type: orderType, shares, price });
    if (res?.error) return alert(res.error);
    setOrderShares('');
    setOrderPrice('');
    loadAll();
  };

  const createMiniApp = async () => {
    if (!createPrompt.trim()) return;
    setCreateLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert('Please sign in'); return; }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mini-app-gen`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: createPrompt }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      const newApp: MiniApp = {
        id: `app-${Date.now()}`,
        name: data.name || 'Mini App',
        description: data.description || createPrompt,
        code: data.code,
        icon: data.icon || '🔧',
        createdAt: new Date().toISOString(),
      };
      const updated = [...myApps, newApp];
      setMyApps(updated);
      await save('user-mini-apps', updated);
      setCreatePrompt('');
      setCreating(false);
      setTab('myapps');
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredListings = useMemo(() => {
    let list = forgeListings;
    if (catFilter !== 'All') list = list.filter(l => l.category === catFilter);
    if (searchQ) list = list.filter(l => l.name.toLowerCase().includes(searchQ.toLowerCase()) || l.description.toLowerCase().includes(searchQ.toLowerCase()));
    return list;
  }, [forgeListings, catFilter, searchQ]);

  const runningApp = myApps.find(a => a.id === running);
  const viewingApp = myApps.find(a => a.id === viewing);

  // Running a mini-app
  if (runningApp) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button onClick={() => setRunning(null)} className="p-1 rounded hover:bg-muted text-muted-foreground"><ArrowLeft size={12} /></button>
          <span className="text-sm">{runningApp.icon}</span>
          <span className="font-display text-[9px] tracking-wider uppercase text-primary">{runningApp.name}</span>
        </div>
        <div className="flex-1"><MiniAppRenderer code={runningApp.code} name={runningApp.name} /></div>
      </div>
    );
  }

  // Viewing source
  if (viewingApp) {
    return (
      <div className="h-full flex flex-col bg-background font-mono text-xs">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button onClick={() => setViewing(null)} className="p-1 rounded hover:bg-muted text-muted-foreground"><ArrowLeft size={12} /></button>
          <Code size={12} className="text-primary" />
          <span className="font-display text-[9px] tracking-wider uppercase text-primary">{viewingApp.name} — Source</span>
        </div>
        <ScrollArea className="flex-1"><pre className="p-3 text-[11px] text-muted-foreground whitespace-pre-wrap">{viewingApp.code}</pre></ScrollArea>
      </div>
    );
  }

  // Publishing modal
  if (publishingApp) {
    return (
      <div className="h-full flex flex-col bg-background font-mono text-xs">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button onClick={() => setPublishingApp(null)} className="p-1 rounded hover:bg-muted text-muted-foreground"><ArrowLeft size={12} /></button>
          <Upload size={12} className="text-primary" />
          <span className="font-display text-[9px] tracking-wider uppercase text-primary">Publish to Forge</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{publishingApp.icon}</span>
              <div>
                <p className="text-foreground font-display text-[11px] tracking-wider">{publishingApp.name}</p>
                <p className="text-[9px] text-muted-foreground">{publishingApp.description}</p>
              </div>
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground">Category</label>
              <select value={publishForm.category} onChange={e => setPublishForm(p => ({ ...p, category: e.target.value }))}
                className="w-full mt-1 px-2 py-1 rounded bg-muted border border-border text-[10px] text-foreground">
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground">Install Price (OS, 0 = free)</label>
              <input type="number" value={publishForm.price} onChange={e => setPublishForm(p => ({ ...p, price: Number(e.target.value) }))}
                className="w-full mt-1 px-2 py-1 rounded bg-muted border border-border text-[10px] text-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={publishForm.ipoActive} onChange={e => setPublishForm(p => ({ ...p, ipoActive: e.target.checked }))}
                className="rounded border-border" />
              <label className="text-[9px] text-muted-foreground">Launch IPO (fundraise)</label>
            </div>
            {publishForm.ipoActive && (
              <div className="space-y-2">
                <div>
                  <label className="text-[9px] text-muted-foreground">IPO Target (OS)</label>
                  <input type="number" value={publishForm.ipoTarget} onChange={e => setPublishForm(p => ({ ...p, ipoTarget: Number(e.target.value) }))}
                    className="w-full mt-1 px-2 py-1 rounded bg-muted border border-border text-[10px] text-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-muted-foreground">Share Price (OS)</label>
                    <input type="number" value={publishForm.sharePrice} onChange={e => setPublishForm(p => ({ ...p, sharePrice: Math.max(0.01, Number(e.target.value)) }))}
                      className="w-full mt-1 px-2 py-1 rounded bg-muted border border-border text-[10px] text-foreground" min="0.01" step="0.01" />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">Total Shares</label>
                    <input type="number" value={publishForm.totalShares} onChange={e => setPublishForm(p => ({ ...p, totalShares: Math.max(1, Math.round(Number(e.target.value))) }))}
                      className="w-full mt-1 px-2 py-1 rounded bg-muted border border-border text-[10px] text-foreground" min="1" step="1" />
                  </div>
                </div>
                {/* IPO Summary Card */}
                <div className="border border-primary/30 rounded-lg p-3 bg-primary/5 space-y-1.5">
                  <p className="text-[9px] text-primary font-bold flex items-center gap-1"><Rocket size={10} /> IPO Summary</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
                    <span className="text-muted-foreground">Shares Issued</span>
                    <span className="text-foreground text-right">{publishForm.totalShares.toLocaleString()}</span>
                    <span className="text-muted-foreground">Price / Share</span>
                    <span className="text-foreground text-right">{publishForm.sharePrice} OS</span>
                    <span className="text-muted-foreground">Valuation</span>
                    <span className="text-primary font-bold text-right">{(publishForm.totalShares * publishForm.sharePrice).toLocaleString()} OS</span>
                    <span className="text-muted-foreground">Fundraise Target</span>
                    <span className="text-foreground text-right">{publishForm.ipoTarget.toLocaleString()} OS</span>
                  </div>
                </div>
              </div>
            )}

            {/* Listing Preview */}
            <div className="border border-border rounded-lg p-3 bg-card/30">
              <p className="text-[8px] text-muted-foreground/60 uppercase tracking-wider mb-2">Preview — How it will appear</p>
              <div className="flex items-start gap-2">
                <span className="text-xl">{publishingApp.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-foreground font-display text-[10px] tracking-wider uppercase truncate">{publishingApp.name}</p>
                    {publishForm.ipoActive && <span className="px-1 py-0.5 rounded bg-primary/20 text-primary text-[7px] font-bold">IPO</span>}
                  </div>
                  <p className="text-[9px] text-muted-foreground truncate">{publishingApp.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[8px] text-muted-foreground flex items-center gap-0.5"><Download size={8} />0</span>
                    <span className="text-[8px] text-muted-foreground flex items-center gap-0.5"><DollarSign size={8} />{publishForm.price === 0 ? 'Free' : `${publishForm.price} OS`}</span>
                    {publishForm.ipoActive && <span className="text-[8px] text-muted-foreground flex items-center gap-0.5"><LineChart size={8} />{publishForm.sharePrice} OS/share</span>}
                    <span className="text-[8px] text-muted-foreground px-1 rounded bg-muted">{publishForm.category}</span>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={publishToForge}
              className="w-full py-2 rounded bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1">
              <Rocket size={12} /> Publish to Forge
            </button>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Listing detail
  if (selectedListing) {
    const myShareCount = myShares.find(s => s.listing_id === selectedListing.id)?.shares || 0;
    return (
      <div className="h-full flex flex-col bg-background font-mono text-xs">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button onClick={() => setSelectedListing(null)} className="p-1 rounded hover:bg-muted text-muted-foreground"><ChevronLeft size={12} /></button>
          <span className="text-lg">{selectedListing.icon}</span>
          <span className="font-display text-[9px] tracking-wider uppercase text-primary">{selectedListing.name}</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            <p className="text-[10px] text-muted-foreground">{selectedListing.description}</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="border border-border rounded p-2 text-center">
                <p className="text-[8px] text-muted-foreground">INSTALLS</p>
                <p className="text-sm text-foreground font-bold">{selectedListing.installs}</p>
              </div>
              <div className="border border-border rounded p-2 text-center">
                <p className="text-[8px] text-muted-foreground">PRICE</p>
                <p className="text-sm text-foreground font-bold">{selectedListing.price === 0 ? 'Free' : `${selectedListing.price} OS`}</p>
              </div>
              <div className="border border-border rounded p-2 text-center">
                <p className="text-[8px] text-muted-foreground">SHARE PRICE</p>
                <p className="text-sm text-primary font-bold">{selectedListing.share_price} OS</p>
              </div>
            </div>

            {/* Install Button */}
            <button onClick={() => installForgeApp(selectedListing)}
              className="w-full py-2 rounded bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1">
              <Download size={12} /> Install {selectedListing.price > 0 ? `(${selectedListing.price} OS)` : '(Free)'}
            </button>

            {/* IPO Section */}
            {selectedListing.ipo_active && (
              <div className="border border-primary/30 rounded p-3 space-y-2">
                <div className="flex items-center gap-1 text-primary text-[10px] font-bold">
                  <Rocket size={12} /> IPO Active
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (selectedListing.ipo_raised / (selectedListing.ipo_target || 1)) * 100)}%` }} />
                </div>
                <p className="text-[9px] text-muted-foreground">{selectedListing.ipo_raised.toLocaleString()} / {selectedListing.ipo_target.toLocaleString()} OS raised</p>
                <div className="flex gap-1">
                  <input type="number" placeholder="Amount (OS)" value={investAmount} onChange={e => setInvestAmount(e.target.value)}
                    className="flex-1 px-2 py-1 rounded bg-muted border border-border text-[10px] text-foreground" />
                  <button onClick={() => investInIPO(selectedListing)}
                    className="px-3 py-1 rounded bg-primary/20 text-primary text-[9px] hover:bg-primary/30">Invest</button>
                </div>
              </div>
            )}

            {/* Trading Section */}
            <div className="border border-border rounded p-3 space-y-2">
              <p className="text-[9px] text-muted-foreground font-bold">TRADE SHARES</p>
              <p className="text-[9px] text-muted-foreground">You own: <span className="text-foreground">{myShareCount} shares</span></p>
              <div className="flex gap-1">
                <button onClick={() => setOrderType('buy')}
                  className={`flex-1 py-1 rounded text-[9px] font-bold transition-colors ${orderType === 'buy' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>BUY</button>
                <button onClick={() => setOrderType('sell')}
                  className={`flex-1 py-1 rounded text-[9px] font-bold transition-colors ${orderType === 'sell' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`}>SELL</button>
              </div>
              <input type="number" placeholder="Shares" value={orderShares} onChange={e => setOrderShares(e.target.value)}
                className="w-full px-2 py-1 rounded bg-muted border border-border text-[10px] text-foreground" />
              <input type="number" placeholder="Price per share (OS)" value={orderPrice} onChange={e => setOrderPrice(e.target.value)}
                className="w-full px-2 py-1 rounded bg-muted border border-border text-[10px] text-foreground" />
              {orderShares && orderPrice && (
                <p className="text-[9px] text-muted-foreground">Total: <span className="text-foreground">{(Number(orderShares) * Number(orderPrice)).toLocaleString()} OS</span></p>
              )}
              <button onClick={() => placeOrder(selectedListing)}
                className="w-full py-1.5 rounded bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90">Place Order</button>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background font-mono text-xs">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Store size={14} className="text-primary" />
        <span className="font-display text-[9px] tracking-[0.2em] uppercase text-primary">App Forge</span>
        <span className="ml-auto text-[9px] text-muted-foreground">{forgeListings.length} listed</span>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList className="mx-2 mt-1 h-7 bg-muted/50">
          <TabsTrigger value="myapps" className="text-[9px] h-5 px-2">My Apps</TabsTrigger>
          <TabsTrigger value="forge" className="text-[9px] h-5 px-2">Forge</TabsTrigger>
          <TabsTrigger value="create" className="text-[9px] h-5 px-2">Create</TabsTrigger>
          <TabsTrigger value="portfolio" className="text-[9px] h-5 px-2">Portfolio</TabsTrigger>
        </TabsList>

        {/* MY APPS */}
        <TabsContent value="myapps" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-3">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : myApps.length === 0 ? (
                <div className="text-center py-8">
                  <Blocks size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground mb-1">No apps installed</p>
                  <p className="text-[10px] text-muted-foreground/60">Browse the Forge or create one</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {myApps.map(app => (
                    <div key={app.id} className="p-3 rounded border border-border bg-card/30 hover:border-primary/30 transition-colors">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-lg">{app.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-display text-[10px] tracking-wider uppercase truncate">{app.name}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{app.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setRunning(app.id)}
                          className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-primary/10 text-primary text-[9px] hover:bg-primary/20">
                          <Play size={8} /> Run
                        </button>
                        <button onClick={() => setPublishingApp(app)}
                          className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Publish">
                          <Upload size={10} />
                        </button>
                        <button onClick={() => setViewing(app.id)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground"><Code size={10} /></button>
                        <button onClick={() => deleteApp(app.id)}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={10} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* FORGE MARKETPLACE */}
        <TabsContent value="forge" className="flex-1 overflow-hidden mt-0">
          <div className="px-3 pt-2 flex items-center gap-1">
            <div className="flex-1 relative">
              <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search apps..."
                className="w-full pl-6 pr-2 py-1 rounded bg-muted border border-border text-[10px] text-foreground" />
            </div>
          </div>
          <div className="px-3 pt-1 flex gap-1 overflow-x-auto scrollbar-none">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`px-2 py-0.5 rounded text-[8px] shrink-0 transition-colors ${catFilter === c ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>{c}</button>
            ))}
          </div>
          <ScrollArea className="flex-1 h-0">
            <div className="p-3 space-y-1.5">
              {filteredListings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No apps found</div>
              ) : filteredListings.map(l => (
                <HoverCard key={l.id} openDelay={400} closeDelay={200}>
                  <HoverCardTrigger asChild>
                    <button onClick={() => setSelectedListing(l)}
                      className="w-full text-left p-3 rounded border border-border hover:border-primary/40 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-2">
                        <span className="text-xl">{l.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-foreground font-display text-[10px] tracking-wider uppercase truncate">{l.name}</p>
                            {l.ipo_active && <span className="px-1 py-0.5 rounded bg-primary/20 text-primary text-[7px] font-bold">IPO</span>}
                          </div>
                          <p className="text-[9px] text-muted-foreground truncate">{l.description}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[8px] text-muted-foreground flex items-center gap-0.5"><Download size={8} />{l.installs}</span>
                            <span className="text-[8px] text-muted-foreground flex items-center gap-0.5"><DollarSign size={8} />{l.price === 0 ? 'Free' : `${l.price} OS`}</span>
                            <span className="text-[8px] text-muted-foreground flex items-center gap-0.5"><LineChart size={8} />{l.share_price} OS/share</span>
                            <span className="text-[8px] text-muted-foreground px-1 rounded bg-muted">{l.category}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent side="right" align="start" className="w-72 p-0 overflow-hidden">
                    {/* Code snippet */}
                    <div className="border-b border-border">
                      <p className="px-2 py-1 text-[8px] text-muted-foreground/60 uppercase tracking-wider bg-muted/30">Source Preview</p>
                      <pre className="px-2 py-1.5 text-[9px] text-muted-foreground font-mono leading-relaxed overflow-hidden max-h-[120px]">
                        {l.code.split('\n').slice(0, 8).join('\n')}
                      </pre>
                    </div>
                    {/* Live mini-app preview */}
                    <div>
                      <p className="px-2 py-1 text-[8px] text-muted-foreground/60 uppercase tracking-wider bg-muted/30">Live Preview</p>
                      <div className="h-[150px] overflow-hidden">
                        <MiniAppRenderer code={l.code} name={l.name} />
                      </div>
                    </div>
                    {/* Stats footer */}
                    <div className="flex items-center gap-3 px-2 py-1.5 bg-muted/20 border-t border-border text-[8px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Download size={8} />{l.installs} installs</span>
                      <span className="flex items-center gap-0.5"><LineChart size={8} />{l.share_price} OS</span>
                      <span className="px-1 rounded bg-muted">{l.category}</span>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* CREATE */}
        <TabsContent value="create" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              <div className="text-center py-4">
                <Plus size={32} className="mx-auto text-primary/30 mb-2" />
                <p className="text-foreground font-display text-[11px] tracking-wider">Create a Mini-App</p>
                <p className="text-[9px] text-muted-foreground mt-1">Describe what you want and AI will build it</p>
              </div>
              <textarea value={createPrompt} onChange={e => setCreatePrompt(e.target.value)} placeholder="Create a mini-app that..."
                className="w-full h-24 px-3 py-2 rounded bg-muted border border-border text-[10px] text-foreground resize-none" />
              <button onClick={createMiniApp} disabled={createLoading || !createPrompt.trim()}
                className="w-full py-2 rounded bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                {createLoading ? 'Generating...' : <><Rocket size={12} /> Generate App (500 OS)</>}
              </button>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* PORTFOLIO */}
        <TabsContent value="portfolio" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {myShares.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No investments yet</p>
                  <p className="text-[9px] text-muted-foreground/60">Buy shares in Forge apps to start your portfolio</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="border border-border rounded p-2 text-center">
                      <p className="text-[8px] text-muted-foreground">POSITIONS</p>
                      <p className="text-sm text-foreground font-bold">{myShares.length}</p>
                    </div>
                    <div className="border border-border rounded p-2 text-center">
                      <p className="text-[8px] text-muted-foreground">TOTAL SHARES</p>
                      <p className="text-sm text-foreground font-bold">{myShares.reduce((s, h) => s + h.shares, 0)}</p>
                    </div>
                    <div className="border border-border rounded p-2 text-center">
                      <p className="text-[8px] text-muted-foreground">AVG COST</p>
                      <p className="text-sm text-primary font-bold">{myShares.length > 0 ? (myShares.reduce((s, h) => s + h.avg_cost * h.shares, 0) / myShares.reduce((s, h) => s + h.shares, 0)).toFixed(2) : '0'} OS</p>
                    </div>
                  </div>
                  <div className="border border-border rounded">
                    <div className="grid grid-cols-4 gap-1 px-2 py-1 border-b border-border text-[8px] text-muted-foreground">
                      <span>App</span><span>Shares</span><span>Avg Cost</span><span>Value</span>
                    </div>
                    {myShares.map(h => {
                      const listing = forgeListings.find(l => l.id === h.listing_id);
                      return (
                        <div key={h.id} className="grid grid-cols-4 gap-1 px-2 py-1.5 border-b border-border/50 text-[9px]">
                          <span className="truncate text-foreground">{listing?.icon} {listing?.name || 'Unknown'}</span>
                          <span className="text-foreground">{h.shares}</span>
                          <span className="text-muted-foreground">{h.avg_cost.toFixed(2)}</span>
                          <span className="text-primary">{(h.shares * (listing?.share_price || h.avg_cost)).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
