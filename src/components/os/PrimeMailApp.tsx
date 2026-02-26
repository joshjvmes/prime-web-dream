import { useState, useEffect, useRef, useCallback } from 'react';
import { Mail, Inbox, ArrowLeft, Trash2, Bot, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { eventBus } from '@/hooks/useEventBus';

interface Email {
  id: string;
  from_address: string;
  to_address: string;
  subject: string;
  body: string;
  folder: string;
  read: boolean;
  ai_generated: boolean;
  created_at: string;
}

export default function PrimeMailApp() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const loadEmails = useCallback(async () => {
    const { data } = await (supabase
      .from('user_emails') as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setEmails((data as Email[]) || []);
    setInitialLoading(false);
  }, []);

  useEffect(() => { loadEmails(); }, [loadEmails]);

  // Seed welcome emails on first load if inbox is empty
  const seedWelcomeEmails = async (uid: string) => {
    const welcomeEmails = [
      {
        user_id: uid, from_address: 'system@prime.os', to_address: 'operator',
        subject: 'Welcome to PRIME OS',
        body: 'Welcome, Operator.\n\nYour PRIME OS workstation has been initialized with full geometric computing capabilities. All 649 cores are online and the qutrit kernel is operating within nominal parameters.\n\nKey resources:\n- Terminal (psh) for command-line access\n- Q3-Inference for quantum analysis\n- GeomC Compiler for geometric code\n\nStay within the lattice.\n\n— PRIME System',
        folder: 'inbox', read: false, ai_generated: false,
      },
      {
        user_id: uid, from_address: 'security@prime.os', to_address: 'operator',
        subject: 'Lattice Shield: Weekly Report',
        body: 'Security Summary — Week 8\n\nThreats blocked: 2,847\nLattice integrity: 99.97%\nZero-day patches: 3 applied\nAnomaly detections: 12 (all resolved)\n\nNo action required. The lattice holds.\n\n— Lattice Shield',
        folder: 'inbox', read: false, ai_generated: false,
      },
    ];
    await (supabase.from('user_emails') as any).insert(welcomeEmails);
    await loadEmails();
  };

  // Generate AI emails and persist
  const fetchAIEmails = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-social', {
        body: { action: 'generate-emails' },
      });
      if (error) throw error;
      if (data?.emails) {
        const toInsert = data.emails.map((e: any) => ({
          user_id: userId, from_address: e.from, to_address: e.to || 'operator',
          subject: e.subject, body: e.body, folder: 'inbox',
          read: false, ai_generated: true,
        }));
        await (supabase.from('user_emails') as any).insert(toInsert);
        await loadEmails();
      }
    } catch (e) {
      console.error('Failed to fetch AI emails:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetched.current && userId) {
      hasFetched.current = true;
      (supabase.from('user_emails') as any).select('id', { count: 'exact', head: true }).then(({ count }: any) => {
        if ((count ?? 0) === 0) seedWelcomeEmails(userId);
      });
    }
  }, [userId]);

  // Listen for Hyper agent emails via EventBus
  useEffect(() => {
    if (!userId) return;
    const handler = async (payload: any) => {
      if (!payload?.subject) return;
      await (supabase.from('user_emails') as any).insert({
        user_id: userId, from_address: payload.from || 'hyper@prime.os',
        to_address: payload.to || 'operator', subject: payload.subject,
        body: payload.body || '', folder: 'inbox', read: false, ai_generated: true,
      });

      // Cross-agent reply
      setTimeout(async () => {
        try {
          const { data, error } = await supabase.functions.invoke('ai-social', {
            body: {
              action: 'generate-reply-email',
              originalEmail: { from: payload.from || 'hyper@prime.os', to: payload.to || 'operator', subject: payload.subject, body: payload.body || '' },
            },
          });
          if (!error && data?.email) {
            await (supabase.from('user_emails') as any).insert({
              user_id: userId, from_address: data.email.from, to_address: data.email.to || 'operator',
              subject: data.email.subject, body: data.email.body,
              folder: 'inbox', read: false, ai_generated: true,
            });
            eventBus.emit('agent.action.logged', {
              type: 'email', summary: `${data.email.from} replied to Hyper's email`, timestamp: new Date(),
            });
            await loadEmails();
          }
        } catch (e) {
          console.error('Failed to generate cross-agent email reply:', e);
        }
      }, 4000);

      await loadEmails();
    };
    eventBus.on('mail.received', handler);
    return () => eventBus.off('mail.received', handler);
  }, [userId, loadEmails]);

  const inboxEmails = emails.filter(e => e.folder === 'inbox');
  const selected = selectedId ? emails.find(e => e.id === selectedId) : null;
  const unreadCount = inboxEmails.filter(e => !e.read).length;

  const openEmail = async (id: string) => {
    setSelectedId(id);
    await (supabase.from('user_emails') as any).update({ read: true }).eq('id', id);
    setEmails(prev => prev.map(e => e.id === id ? { ...e, read: true } : e));
  };

  const deleteEmail = async (id: string) => {
    await (supabase.from('user_emails') as any).delete().eq('id', id);
    setEmails(prev => prev.filter(e => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  if (initialLoading) {
    return (
      <div className="h-full bg-background flex items-center justify-center font-mono text-xs">
        <Loader2 size={16} className="animate-spin text-primary" />
      </div>
    );
  }

  // Read view
  if (selected) {
    return (
      <div className="h-full bg-background flex flex-col font-mono text-xs">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={14} /></button>
          <span className="font-display text-[10px] tracking-wider uppercase text-primary flex-1 truncate">{selected.subject}</span>
          {selected.ai_generated && (
            <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-primary/30 text-primary/70">
              <Bot size={7} className="mr-0.5" /> AI
            </Badge>
          )}
          <button onClick={() => deleteEmail(selected.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex justify-between mb-2">
            <div>
              <p className="text-foreground text-xs">{selected.from_address}</p>
              <p className="text-muted-foreground/60 text-[10px]">to {selected.to_address}</p>
            </div>
            <span className="text-[9px] text-muted-foreground/50">{new Date(selected.created_at).toLocaleString()}</span>
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
          <button className="flex items-center gap-2 px-3 py-2 text-left bg-primary/10 text-primary border-r-2 border-primary">
            <Inbox size={14} />
            <span className="text-[10px]">Inbox</span>
            {unreadCount > 0 && (
              <span className="ml-auto text-[8px] bg-primary/20 text-primary px-1 rounded">{unreadCount}</span>
            )}
          </button>
        </div>
        <div className="mt-auto p-2 border-t border-border space-y-1.5">
          <button
            onClick={fetchAIEmails}
            disabled={loading || !userId}
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
        {loading && emails.length === 0 && (
          <div className="p-4 text-center text-muted-foreground/50 text-[10px] flex items-center justify-center gap-1.5">
            <Loader2 size={12} className="animate-spin" /> Generating mail…
          </div>
        )}
        {inboxEmails.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground/50 text-[10px]">No messages</div>
        ) : (
          inboxEmails.map(e => (
            <button key={e.id} onClick={() => openEmail(e.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-border/30 hover:bg-muted/20 transition-colors ${!e.read ? 'bg-primary/5' : ''}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] truncate ${!e.read ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                  {e.from_address}
                </span>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {e.ai_generated && <Bot size={8} className="text-primary/50" />}
                  <span className="text-[8px] text-muted-foreground/50">
                    {new Date(e.created_at).toLocaleDateString()}
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
