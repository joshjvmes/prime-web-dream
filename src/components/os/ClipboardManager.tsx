import { useState, useEffect, useCallback } from 'react';
import { X, Pin, Trash2, Search, Clipboard, Copy } from 'lucide-react';
import { eventBus } from '@/hooks/useEventBus';

interface ClipItem {
  id: string;
  text: string;
  timestamp: number;
  pinned: boolean;
}

const STORAGE_KEY = 'prime-os-clipboard-history';
const MAX_ITEMS = 20;

function loadItems(): ClipItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

interface ClipboardManagerProps {
  open: boolean;
  onClose: () => void;
}

export default function ClipboardManager({ open, onClose }: ClipboardManagerProps) {
  const [items, setItems] = useState<ClipItem[]>(loadItems);
  const [search, setSearch] = useState('');

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Listen for copy events
  useEffect(() => {
    const handler = () => {
      setTimeout(async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (!text?.trim()) return;
          setItems(prev => {
            // Dedupe
            const filtered = prev.filter(i => i.text !== text);
            const newItem: ClipItem = {
              id: `clip-${Date.now()}`,
              text,
              timestamp: Date.now(),
              pinned: false,
            };
            return [newItem, ...filtered].slice(0, MAX_ITEMS);
          });
          eventBus.emit('clipboard.copied', { text });
        } catch {
          // Clipboard API may fail, use Selection fallback
          const sel = document.getSelection()?.toString();
          if (sel?.trim()) {
            setItems(prev => {
              const filtered = prev.filter(i => i.text !== sel);
              const newItem: ClipItem = {
                id: `clip-${Date.now()}`,
                text: sel,
                timestamp: Date.now(),
                pinned: false,
              };
              return [newItem, ...filtered].slice(0, MAX_ITEMS);
            });
            eventBus.emit('clipboard.copied', { text: sel });
          }
        }
      }, 50);
    };
    document.addEventListener('copy', handler);
    return () => document.removeEventListener('copy', handler);
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  }, []);

  const togglePin = useCallback((id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, pinned: !i.pinned } : i));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setItems(prev => prev.filter(i => i.pinned));
  }, []);

  const filtered = search.trim()
    ? items.filter(i => i.text.toLowerCase().includes(search.toLowerCase()))
    : items;

  // Sort: pinned first
  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.timestamp - a.timestamp;
  });

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 bottom-10 w-72 z-[150] bg-card/95 backdrop-blur-md border-l border-border flex flex-col font-mono text-xs animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Clipboard size={12} className="text-primary" />
          <span className="font-display text-[10px] tracking-wider uppercase text-primary">Clipboard</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearAll} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Clear unpinned">
            <Trash2 size={11} />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-1.5 border-b border-border/50">
        <div className="flex items-center gap-2 bg-muted/30 border border-border rounded px-2 py-1">
          <Search size={10} className="text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter..."
            className="flex-1 bg-transparent outline-none text-foreground text-[10px]"
          />
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-[10px]">
            {items.length === 0 ? 'Copy text to start building history' : 'No matches'}
          </div>
        ) : sorted.map(item => (
          <div
            key={item.id}
            className="group px-3 py-2 border-b border-border/30 hover:bg-muted/30 cursor-pointer"
            onClick={() => copyToClipboard(item.text)}
          >
            <div className="flex items-start gap-2">
              <p className="flex-1 text-[10px] text-foreground leading-tight line-clamp-3 break-all">
                {item.text}
              </p>
              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e => { e.stopPropagation(); copyToClipboard(item.text); }} className="p-0.5 text-muted-foreground hover:text-primary" title="Copy">
                  <Copy size={10} />
                </button>
                <button onClick={e => { e.stopPropagation(); togglePin(item.id); }} className={`p-0.5 ${item.pinned ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`} title={item.pinned ? 'Unpin' : 'Pin'}>
                  <Pin size={10} />
                </button>
                <button onClick={e => { e.stopPropagation(); removeItem(item.id); }} className="p-0.5 text-muted-foreground hover:text-destructive" title="Remove">
                  <X size={9} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {item.pinned && <Pin size={8} className="text-primary" />}
              <span className="text-[8px] text-muted-foreground/50">
                {new Date(item.timestamp).toLocaleTimeString('en-US', { hour12: false })}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 py-1.5 border-t border-border text-[8px] text-muted-foreground/50 text-center">
        Ctrl+Shift+V to toggle • Click to copy
      </div>
    </div>
  );
}
