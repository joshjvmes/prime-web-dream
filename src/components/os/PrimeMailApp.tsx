import { useState, useEffect, useRef } from 'react';
import { Mail, FileText, Inbox, ArrowLeft, Trash2, Bot, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { eventBus } from '@/hooks/useEventBus';

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  folder: 'inbox' | 'sent' | 'drafts';
  aiGenerated?: boolean;
}

const INITIAL_EMAILS: Email[] = [
  {
    id: '1', from: 'system@prime.os', to: 'operator', subject: 'Welcome to PRIME OS',
    body: 'Welcome, Operator.\n\nYour PRIME OS workstation has been initialized with full geometric computing capabilities. All 649 cores are online and the qutrit kernel is operating within nominal parameters.\n\nKey resources:\n- Terminal (psh) for command-line access\n- Q3-Inference for quantum analysis\n- GeomC Compiler for geometric code\n\nStay within the lattice.\n\n— PRIME System',
    date: '2026-02-20T08:00:00', read: false, folder: 'inbox',
  },
  {
    id: '2', from: 'security@prime.os', to: 'operator', subject: 'Lattice Shield: Weekly Report',
    body: 'Security Summary — Week 8\n\nThreats blocked: 2,847\nLattice integrity: 99.97%\nZero-day patches: 3 applied\nAnomaly detections: 12 (all resolved)\n\nNo action required. The lattice holds.\n\n— Lattice Shield',
    date: '2026-02-19T16:30:00', read: true, folder: 'inbox',
  },
  {
    id: '3', from: 'rocketlogic@global.net', to: 'operator', subject: 'Rocket Logic: Q1 Update',
    body: 'Greetings from Rocket Logic Global.\n\nWe are pleased to report that the T3-649 architecture is exceeding performance benchmarks by 14%. The 11D fold compression is stable and COP ratings remain above 3.0 across all nodes.\n\nUpcoming: SchemaForge v2 release, PrimeNet mesh expansion.\n\n— Rocket Logic Global',
    date: '2026-02-18T10:00:00', read: true, folder: 'inbox',
  },
];

const FOLDERS = [
  { id: 'inbox' as const, label: 'Inbox', icon: <Inbox size={14} /> },
];

export default function PrimeMailApp() {
  const [emails, setEmails] = useState<Email[]>(INITIAL_EMAILS);
  const [folder, setFolder] = useState<'inbox'>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);

  const fetchAIEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-social', {
        body: { action: 'generate-emails' },
      });
      if (error) throw error;
      if (data?.emails) {
        const now = Date.now();
        const newEmails: Email[] = data.emails.map((e: any, i: number) => ({
          id: `ai-${now}-${i}`,
          from: e.from,
          to: e.to || 'operator',
          subject: e.subject,
          body: e.body,
          date: new Date(now - i * 3600000).toISOString(),
          read: false,
          folder: 'inbox' as const,
          aiGenerated: true,
        }));
        setEmails(prev => [...newEmails, ...prev]);
      }
    } catch (e) {
      console.error('Failed to fetch AI emails:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchAIEmails();
    }
  }, []);

  // Listen for Hyper agent emails via EventBus + trigger cross-agent reply
  useEffect(() => {
    const handler = (payload: any) => {
      if (!payload?.subject) return;
      const newEmail: Email = {
        id: `hyper-${Date.now()}`,
        from: payload.from || 'hyper@prime.os',
        to: payload.to || 'operator',
        subject: payload.subject,
        body: payload.body || '',
        date: new Date().toISOString(),
        read: false,
        folder: 'inbox',
        aiGenerated: true,
      };
      setEmails(prev => [newEmail, ...prev]);

      // Cross-agent: generate a reply email from recipient persona after delay
      setTimeout(async () => {
        try {
          const { data, error } = await supabase.functions.invoke('ai-social', {
            body: {
              action: 'generate-reply-email',
              originalEmail: {
                from: payload.from || 'hyper@prime.os',
                to: payload.to || 'operator',
                subject: payload.subject,
                body: payload.body || '',
              },
            },
          });
          if (!error && data?.email) {
            const replyEmail: Email = {
              id: `reply-${Date.now()}`,
              from: data.email.from,
              to: data.email.to || 'operator',
              subject: data.email.subject,
              body: data.email.body,
              date: new Date().toISOString(),
              read: false,
              folder: 'inbox',
              aiGenerated: true,
            };
            setEmails(prev => [replyEmail, ...prev]);
            // Log cross-agent activity
            eventBus.emit('agent.action.logged', {
              type: 'email',
              summary: `${data.email.from} replied to Hyper's email`,
              timestamp: new Date(),
            });
          }
        } catch (e) {
          console.error('Failed to generate cross-agent email reply:', e);
        }
      }, 4000);
    };
    eventBus.on('mail.received', handler);
    return () => eventBus.off('mail.received', handler);
  }, []);

  const folderEmails = emails.filter(e => e.folder === folder);
  const selected = selectedId ? emails.find(e => e.id === selectedId) : null;

  const openEmail = (id: string) => {
    setSelectedId(id);
    setEmails(prev => prev.map(e => e.id === id ? { ...e, read: true } : e));
  };

  const deleteEmail = (id: string) => {
    setEmails(prev => prev.filter(e => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const unreadCount = emails.filter(e => e.folder === 'inbox' && !e.read).length;

  // Read view
  if (selected) {
    return (
      <div className="h-full bg-background flex flex-col font-mono text-xs">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={14} /></button>
          <span className="font-display text-[10px] tracking-wider uppercase text-primary flex-1 truncate">{selected.subject}</span>
          {selected.aiGenerated && (
            <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-primary/30 text-primary/70">
              <Bot size={7} className="mr-0.5" /> AI
            </Badge>
          )}
          <button onClick={() => deleteEmail(selected.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex justify-between mb-2">
            <div>
              <p className="text-foreground text-xs">{selected.from}</p>
              <p className="text-muted-foreground/60 text-[10px]">to {selected.to}</p>
            </div>
            <span className="text-[9px] text-muted-foreground/50">{new Date(selected.date).toLocaleString()}</span>
          </div>
          <div className="border-t border-border pt-3 whitespace-pre-wrap text-muted-foreground leading-relaxed">{selected.body}</div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="h-full bg-background flex font-mono text-xs">
      {/* Sidebar */}
      <div className="w-28 border-r border-border flex flex-col bg-card/30">
        <div className="px-3 py-2 border-b border-border">
          <h2 className="font-display text-[10px] tracking-wider uppercase text-primary flex items-center gap-1.5">
            <Mail size={12} /> Mail
          </h2>
        </div>
        <div className="flex flex-col py-1">
          {FOLDERS.map(f => (
            <button key={f.id} onClick={() => { setFolder(f.id); setSelectedId(null); }}
              className={`flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                folder === f.id ? 'bg-primary/10 text-primary border-r-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}>
              {f.icon}
              <span className="text-[10px]">{f.label}</span>
              {f.id === 'inbox' && unreadCount > 0 && (
                <span className="ml-auto text-[8px] bg-primary/20 text-primary px-1 rounded">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="mt-auto p-2 border-t border-border space-y-1.5">
          <button
            onClick={fetchAIEmails}
            disabled={loading}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors text-[9px] font-display tracking-wider uppercase disabled:opacity-40"
          >
            {loading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            Refresh
          </button>
          <div className="flex items-center gap-1 px-1 py-1 text-[8px] text-muted-foreground/50">
            <Bot size={9} /> AI Managed
          </div>
        </div>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {loading && emails.length <= INITIAL_EMAILS.length && (
          <div className="p-4 text-center text-muted-foreground/50 text-[10px] flex items-center justify-center gap-1.5">
            <Loader2 size={12} className="animate-spin" /> Generating mail…
          </div>
        )}
        {folderEmails.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground/50 text-[10px]">No messages</div>
        ) : (
          folderEmails.map(e => (
            <button key={e.id} onClick={() => openEmail(e.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-border/30 hover:bg-muted/20 transition-colors ${!e.read ? 'bg-primary/5' : ''}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] truncate ${!e.read ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                  {e.from}
                </span>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {e.aiGenerated && <Bot size={8} className="text-primary/50" />}
                  <span className="text-[8px] text-muted-foreground/50">
                    {new Date(e.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p className={`text-[10px] truncate mt-0.5 ${!e.read ? 'text-foreground' : 'text-muted-foreground/70'}`}>{e.subject}</p>
              <p className="text-[9px] text-muted-foreground/40 truncate mt-0.5">{e.body.substring(0, 80)}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
