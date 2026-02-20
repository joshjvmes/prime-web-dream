import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Star, Code2, Plus, X, Globe, Shield, Loader2, Clock, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useCloudStorage } from '@/hooks/useCloudStorage';
import { HomePage, DocsPage, NetStatusPage, Q3LabPage, EnergyGridPage, NotFoundPage } from './browser/PrimePages';
import { WikiPage, ResearchPage, HandbookPage, ChangelogPage, StatusPage } from './browser/IntranetPages';

interface Tab {
  id: string;
  url: string;
  history: string[];
  historyIndex: number;
  externalHtml?: string;
  externalTitle?: string;
  externalError?: string;
  externalLoading?: boolean;
}

interface Bookmark {
  label: string;
  url: string;
  addedAt: string;
}

interface HistoryEntry {
  url: string;
  title: string;
  visitedAt: string;
}

const DEFAULT_BOOKMARKS: Bookmark[] = [
  { label: 'Home', url: 'prime://home', addedAt: '' },
  { label: 'Docs', url: 'prime://docs', addedAt: '' },
  { label: 'Wiki', url: 'httpsp://wiki', addedAt: '' },
  { label: 'Research', url: 'httpsp://research', addedAt: '' },
  { label: 'Handbook', url: 'httpsp://handbook', addedAt: '' },
  { label: 'Changelog', url: 'httpsp://changelog', addedAt: '' },
  { label: 'Status', url: 'httpsp://status', addedAt: '' },
  { label: 'Net Status', url: 'prime://net-status', addedAt: '' },
  { label: 'Q3 Lab', url: 'prime://q3-lab', addedAt: '' },
  { label: 'Energy Grid', url: 'prime://energy-grid', addedAt: '' },
];

const HISTORY_MAX = 200;

function createTab(url = 'prime://home'): Tab {
  return { id: `tab-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, url, history: [url], historyIndex: 0 };
}

function isExternalUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://');
}

function pageSource(url: string) {
  const map: Record<string, string> = {
    'prime://home': `<prime-page lattice="P¹¹">\n  <header class="portal">\n    <title>PRIME OS Intranet</title>\n    <status cores="649" cop="3.2" />\n  </header>\n</prime-page>`,
    'prime://docs': `<prime-docs version="2.0">\n  <section title="Qutrit Computing" />\n</prime-docs>`,
    'prime://net-status': `<primenet-status>\n  <live-metrics interval="2000ms" />\n</primenet-status>`,
    'prime://q3-lab': `<q3-lab interactive="true">\n  <qutrit-array size="5" onclick="cycle" />\n</q3-lab>`,
    'prime://energy-grid': `<energy-grid mode="satellite">\n  <cop-display precision="2" live="true" />\n</energy-grid>`,
    'httpsp://wiki': `<prime-wiki articles="5" />\n`,
    'httpsp://research': `<prime-research papers="4" />\n`,
    'httpsp://handbook': `<prime-handbook sections="4" />\n`,
    'httpsp://changelog': `<prime-changelog />\n`,
    'httpsp://status': `<prime-status refresh="3s" />\n`,
  };
  return map[url] || `<!-- No source for ${url} -->`;
}

function renderInternalPage(url: string) {
  switch (url) {
    case 'prime://home': return <HomePage />;
    case 'prime://docs': return <DocsPage />;
    case 'prime://net-status': return <NetStatusPage />;
    case 'prime://q3-lab': return <Q3LabPage />;
    case 'prime://energy-grid': return <EnergyGridPage />;
    case 'httpsp://wiki': return <WikiPage />;
    case 'httpsp://research': return <ResearchPage />;
    case 'httpsp://handbook': return <HandbookPage />;
    case 'httpsp://changelog': return <ChangelogPage />;
    case 'httpsp://status': return <StatusPage />;
    default: return <NotFoundPage url={url} />;
  }
}

const TITLE_MAP: Record<string, string> = {
  'prime://home': 'Home', 'prime://docs': 'Docs', 'prime://net-status': 'Net Status',
  'prime://q3-lab': 'Q3 Lab', 'prime://energy-grid': 'Energy Grid',
  'httpsp://wiki': 'Wiki', 'httpsp://research': 'Research', 'httpsp://handbook': 'Handbook',
  'httpsp://changelog': 'Changelog', 'httpsp://status': 'Status',
};

// ─── Main Browser Component ───

export default function PrimeBrowserApp() {
  const [tabs, setTabs] = useState<Tab[]>([createTab()]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [showSource, setShowSource] = useState(false);
  const [urlInput, setUrlInput] = useState('prime://home');
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Cloud-persisted bookmarks & history
  const { save, load } = useCloudStorage();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(DEFAULT_BOOKMARKS);
  const [browsingHistory, setBrowsingHistory] = useState<HistoryEntry[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load<Bookmark[]>('browser-bookmarks').then(b => { if (b && b.length) setBookmarks([...DEFAULT_BOOKMARKS, ...b.filter(ub => !DEFAULT_BOOKMARKS.some(d => d.url === ub.url))]); });
    load<HistoryEntry[]>('browser-history').then(h => { if (h) setBrowsingHistory(h); });
  }, [load]);

  const saveBookmarks = useCallback((bks: Bookmark[]) => {
    const userOnly = bks.filter(b => !DEFAULT_BOOKMARKS.some(d => d.url === b.url));
    save('browser-bookmarks', userOnly);
  }, [save]);

  const saveHistory = useCallback((h: HistoryEntry[]) => {
    save('browser-history', h);
  }, [save]);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];

  const titleForUrl = useCallback((url: string) => {
    if (TITLE_MAP[url]) return TITLE_MAP[url];
    const tab = tabs.find(t => t.url === url);
    if (tab?.externalTitle) return tab.externalTitle;
    try { return new URL(url).hostname; } catch { return url.slice(0, 20); }
  }, [tabs]);

  const addHistoryEntry = useCallback((url: string) => {
    setBrowsingHistory(prev => {
      const entry: HistoryEntry = { url, title: titleForUrl(url), visitedAt: new Date().toISOString() };
      const next = [entry, ...prev].slice(0, HISTORY_MAX);
      saveHistory(next);
      return next;
    });
  }, [titleForUrl, saveHistory]);

  const isBookmarked = bookmarks.some(b => b.url === activeTab.url);

  const toggleBookmark = useCallback(() => {
    setBookmarks(prev => {
      const existing = prev.find(b => b.url === activeTab.url);
      let next: Bookmark[];
      if (existing) {
        // Only remove if it's a user bookmark
        if (DEFAULT_BOOKMARKS.some(d => d.url === activeTab.url)) return prev;
        next = prev.filter(b => b.url !== activeTab.url);
      } else {
        next = [...prev, { label: titleForUrl(activeTab.url), url: activeTab.url, addedAt: new Date().toISOString() }];
      }
      saveBookmarks(next);
      return next;
    });
  }, [activeTab.url, titleForUrl, saveBookmarks]);

  const removeBookmark = useCallback((url: string) => {
    if (DEFAULT_BOOKMARKS.some(d => d.url === url)) return;
    setBookmarks(prev => {
      const next = prev.filter(b => b.url !== url);
      saveBookmarks(next);
      return next;
    });
  }, [saveBookmarks]);

  const clearHistory = useCallback(() => {
    setBrowsingHistory([]);
    saveHistory([]);
  }, [saveHistory]);

  const fetchExternal = useCallback(async (url: string, tabId: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, externalLoading: true, externalError: undefined, externalHtml: undefined } : t));

    try {
      const { data, error } = await supabase.functions.invoke('web-proxy', { body: { url } });
      if (controller.signal.aborted) return;
      if (error) throw new Error(error.message || 'Proxy error');
      if (data?.error) throw new Error(data.error);

      setTabs(prev => prev.map(t => t.id === tabId ? {
        ...t, externalHtml: data.html, externalTitle: data.title || url, externalLoading: false, externalError: undefined,
      } : t));
    } catch (err) {
      if (controller.signal.aborted) return;
      setTabs(prev => prev.map(t => t.id === tabId ? {
        ...t, externalLoading: false, externalError: err instanceof Error ? err.message : 'Failed to load page',
      } : t));
    }
  }, []);

  const navigate = useCallback((url: string) => {
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('prime://') && !normalizedUrl.startsWith('httpsp://') && !normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      if (normalizedUrl.includes('.') && !normalizedUrl.includes(' ')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }
    }

    setShowSource(false);
    addHistoryEntry(normalizedUrl);

    if (isExternalUrl(normalizedUrl)) {
      setTabs(prev => prev.map(t => {
        if (t.id !== activeTabId) return t;
        const newHistory = [...t.history.slice(0, t.historyIndex + 1), normalizedUrl];
        return { ...t, url: normalizedUrl, history: newHistory, historyIndex: newHistory.length - 1, externalHtml: undefined, externalError: undefined, externalLoading: true };
      }));
      setUrlInput(normalizedUrl);
      fetchExternal(normalizedUrl, activeTabId);
    } else {
      setLoading(true);
      setLoadProgress(0);
      const steps = [20, 50, 80, 100];
      steps.forEach((p, i) => setTimeout(() => setLoadProgress(p), (i + 1) * 150));
      setTimeout(() => {
        setTabs(prev => prev.map(t => {
          if (t.id !== activeTabId) return t;
          const newHistory = [...t.history.slice(0, t.historyIndex + 1), normalizedUrl];
          return { ...t, url: normalizedUrl, history: newHistory, historyIndex: newHistory.length - 1, externalHtml: undefined, externalError: undefined, externalLoading: false };
        }));
        setUrlInput(normalizedUrl);
        setLoading(false);
      }, 700);
    }
  }, [activeTabId, fetchExternal, addHistoryEntry]);

  const historyNav = useCallback((dir: -1 | 1) => {
    const newIdx = activeTab.historyIndex + dir;
    if (newIdx < 0 || newIdx >= activeTab.history.length) return;
    const url = activeTab.history[newIdx];
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url, historyIndex: newIdx, externalHtml: undefined, externalError: undefined, externalLoading: false } : t));
    setUrlInput(url);
    if (isExternalUrl(url)) fetchExternal(url, activeTabId);
  }, [activeTab, activeTabId, fetchExternal]);

  const addTab = () => {
    const t = createTab();
    setTabs(prev => [...prev, t]);
    setActiveTabId(t.id);
    setUrlInput('prime://home');
  };

  const closeTab = (id: string) => {
    if (tabs.length <= 1) return;
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (id === activeTabId) { setActiveTabId(next[0].id); setUrlInput(next[0].url); }
      return next;
    });
  };

  const switchTab = (id: string) => {
    setActiveTabId(id);
    const t = tabs.find(t => t.id === id);
    if (t) setUrlInput(t.url);
    setShowSource(false);
  };

  const protocolIcon = (url: string) => {
    if (url.startsWith('prime://')) return <span className="text-primary text-[9px]">⬡</span>;
    if (url.startsWith('httpsp://')) return <Shield size={10} className="text-prime-green" />;
    return <Globe size={10} className="text-muted-foreground" />;
  };

  const renderContent = () => {
    if (showSource) {
      if (isExternalUrl(activeTab.url)) {
        return (
          <pre className="p-4 font-mono text-[10px] text-muted-foreground whitespace-pre-wrap leading-relaxed overflow-auto">
            {activeTab.externalHtml ? activeTab.externalHtml.slice(0, 5000) + (activeTab.externalHtml.length > 5000 ? '\n\n<!-- truncated -->' : '') : '<!-- loading... -->'}
          </pre>
        );
      }
      return <pre className="p-4 font-mono text-[10px] text-muted-foreground whitespace-pre-wrap leading-relaxed">{pageSource(activeTab.url)}</pre>;
    }

    if (isExternalUrl(activeTab.url)) {
      if (activeTab.externalLoading) {
        return (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <Loader2 size={24} className="text-primary animate-spin" />
            <p className="font-mono text-[10px] text-muted-foreground">Fetching via secure proxy...</p>
            <p className="font-mono text-[9px] text-muted-foreground/50">{activeTab.url}</p>
          </div>
        );
      }
      if (activeTab.externalError) {
        return (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4">
            <p className="font-display text-2xl text-destructive/50 mb-2">⚠</p>
            <p className="font-display text-xs tracking-wider text-muted-foreground mb-1">Unable to load page</p>
            <p className="font-mono text-[10px] text-destructive/70 mb-3">{activeTab.externalError}</p>
            <button onClick={() => fetchExternal(activeTab.url, activeTabId)} className="font-mono text-[10px] text-primary hover:underline">Try again</button>
          </div>
        );
      }
      if (activeTab.externalHtml) {
        return (
          <div
            className="prime-browser-external p-2 overflow-auto h-full"
            style={{ all: 'initial', fontFamily: 'sans-serif', fontSize: '14px', color: '#222', background: '#fff', display: 'block', overflow: 'auto', height: '100%', padding: '8px' }}
            dangerouslySetInnerHTML={{ __html: activeTab.externalHtml }}
          />
        );
      }
      return null;
    }

    return renderInternalPage(activeTab.url);
  };

  return (
    <div className="flex flex-col h-full bg-background font-mono text-xs">
      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-1 pt-1 bg-card/50 border-b border-border overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <div
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded-t text-[10px] cursor-pointer max-w-32 group ${t.id === activeTabId ? 'bg-background border border-b-0 border-border text-foreground' : 'text-muted-foreground hover:bg-muted/30'}`}
          >
            {protocolIcon(t.url)}
            <span className="truncate">{titleForUrl(t.url)}</span>
            {tabs.length > 1 && (
              <button onClick={e => { e.stopPropagation(); closeTab(t.id); }} className="opacity-0 group-hover:opacity-100 hover:text-destructive"><X size={10} /></button>
            )}
          </div>
        ))}
        <button onClick={addTab} className="p-1 text-muted-foreground hover:text-primary"><Plus size={12} /></button>
      </div>

      {/* Address bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-card/30">
        <button onClick={() => historyNav(-1)} disabled={activeTab.historyIndex <= 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowLeft size={14} /></button>
        <button onClick={() => historyNav(1)} disabled={activeTab.historyIndex >= activeTab.history.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowRight size={14} /></button>
        <button onClick={() => isExternalUrl(activeTab.url) ? fetchExternal(activeTab.url, activeTabId) : navigate(activeTab.url)} className="p-1 text-muted-foreground hover:text-foreground"><RotateCw size={14} /></button>
        <form onSubmit={e => { e.preventDefault(); navigate(urlInput); }} className="flex-1 flex">
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="Enter URL or prime:// address..."
            className="flex-1 bg-muted/30 border border-border rounded px-2 py-0.5 text-[11px] font-mono text-foreground focus:outline-none focus:border-primary/40"
          />
        </form>
        <button onClick={toggleBookmark} title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'} className={`p-1 transition-colors ${isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          <Star size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>
        <button onClick={() => setShowHistory(!showHistory)} title="History" className={`p-1 transition-colors ${showHistory ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          <Clock size={14} />
        </button>
        <button onClick={() => setShowSource(!showSource)} className={`p-1 transition-colors ${showSource ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}><Code2 size={14} /></button>
      </div>

      {/* Bookmarks bar */}
      <div className="flex items-center gap-1 px-2 py-0.5 border-b border-border/50 bg-card/20 overflow-x-auto scrollbar-none">
        <Star size={10} className="text-muted-foreground/40 shrink-0" />
        {bookmarks.map(b => (
          <div key={b.url} className="relative group flex items-center">
            <button onClick={() => navigate(b.url)} className="text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/5 whitespace-nowrap transition-colors flex items-center gap-1">
              {b.url.startsWith('httpsp://') && <Shield size={8} className="text-prime-green/60" />}
              {b.label}
            </button>
            {!DEFAULT_BOOKMARKS.some(d => d.url === b.url) && (
              <button onClick={() => removeBookmark(b.url)} className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 bg-background border border-border rounded-full p-0.5 hover:text-destructive transition-opacity">
                <X size={7} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Loading bar */}
      {loading && (
        <div className="px-2 py-1 bg-card/20">
          <Progress value={loadProgress} className="h-1" />
          <p className="text-[8px] text-muted-foreground/60 mt-0.5">Resolving geometric route...</p>
        </div>
      )}

      {/* Main area: content + optional history sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>

        {/* History sidebar */}
        {showHistory && (
          <div className="w-56 border-l border-border bg-card/30 flex flex-col">
            <div className="p-2 border-b border-border flex items-center justify-between">
              <span className="font-display text-[9px] tracking-wider uppercase text-primary">History</span>
              <button onClick={clearHistory} title="Clear History" className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 size={10} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-1">
              {browsingHistory.length === 0 ? (
                <p className="text-[9px] text-muted-foreground/50 text-center py-4">No history yet</p>
              ) : (
                browsingHistory.map((h, i) => (
                  <button
                    key={`${h.visitedAt}-${i}`}
                    onClick={() => { navigate(h.url); setShowHistory(false); }}
                    className="w-full text-left px-2 py-1 rounded hover:bg-primary/5 transition-colors group"
                  >
                    <p className="text-[10px] text-foreground/80 truncate">{h.title}</p>
                    <p className="text-[8px] text-muted-foreground/50 truncate">{h.url}</p>
                    <p className="text-[7px] text-muted-foreground/30">{new Date(h.visitedAt).toLocaleString()}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
