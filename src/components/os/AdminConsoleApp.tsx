import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, ListChecks, MessageSquare, BarChart3, ShieldCheck, Trash2, Search, Download, Plus, Minus, Activity } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

type Tab = 'users' | 'waitlist' | 'chat' | 'stats' | 'activity';

interface AdminUser {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  title: string | null;
  email: string;
  provider: string;
  roles: string[];
  created_at: string;
}

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

interface ChatMessage {
  id: string;
  username: string;
  channel: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface Stats {
  users: number;
  waitlist: number;
  files: number;
  totalFileSize: number;
  messages: number;
}

interface PresenceUser {
  id: string;
  username: string;
  channel: string;
  last_seen: string;
  user_id: string;
}

async function adminAction(action: string, method = 'GET', body?: object) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions?action=${action}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export default function AdminConsoleApp() {
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      switch (tab) {
        case 'users': setUsers(await adminAction('users')); break;
        case 'waitlist': setWaitlist(await adminAction('waitlist')); break;
        case 'chat': setMessages(await adminAction('messages')); break;
        case 'stats': setStats(await adminAction('stats')); break;
        case 'activity': {
          const { data } = await supabase.from('chat_presence').select('*').order('last_seen', { ascending: false });
          setPresenceUsers(data || []);
          break;
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  // Real-time presence subscription for activity tab
  useEffect(() => {
    if (tab !== 'activity') return;

    const channel = supabase
      .channel('admin-presence-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_presence' }, () => {
        supabase.from('chat_presence').select('*').order('last_seen', { ascending: false })
          .then(({ data }) => setPresenceUsers(data || []));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tab]);

  const assignRole = async (userId: string, role: string) => {
    try {
      await adminAction('assign-role', 'POST', { target_user_id: userId, role });
      load();
    } catch (e: any) { setError(e.message); }
  };

  const removeRole = async (userId: string, role: string) => {
    try {
      await adminAction('remove-role', 'POST', { target_user_id: userId, role });
      load();
    } catch (e: any) { setError(e.message); }
  };

  const deleteWaitlistEntry = async (id: string) => {
    try {
      await adminAction(`waitlist&id=${id}`, 'DELETE');
      setWaitlist(prev => prev.filter(w => w.id !== id));
    } catch (e: any) { setError(e.message); }
  };

  const deleteMessage = async (id: string) => {
    try {
      await adminAction('delete-message', 'POST', { message_id: id });
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (e: any) { setError(e.message); }
  };

  const exportWaitlistCSV = () => {
    const csv = ['email,name,date', ...waitlist.map(w => `${w.email},${w.name || ''},${new Date(w.created_at).toLocaleDateString()}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'waitlist.csv';
    a.click();
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const isOnline = (dateStr: string) => Date.now() - new Date(dateStr).getTime() < 5 * 60 * 1000;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'users', label: 'Users', icon: <Users size={14} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={14} /> },
    { id: 'waitlist', label: 'Waitlist', icon: <ListChecks size={14} /> },
    { id: 'chat', label: 'Chat Mod', icon: <MessageSquare size={14} /> },
    { id: 'stats', label: 'Stats', icon: <BarChart3 size={14} /> },
  ];

  const filteredUsers = users.filter(u =>
    (u.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const onlineCount = presenceUsers.filter(p => isOnline(p.last_seen)).length;

  return (
    <div className="h-full flex flex-col bg-card/50 text-foreground font-mono text-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/80">
        <ShieldCheck size={16} className="text-primary" />
        <span className="font-display text-[10px] tracking-[0.2em] uppercase text-primary">Admin Console</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); }}
            className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-display tracking-wider uppercase transition-colors border-b-2 ${
              tab === t.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t.icon} {t.label}
            {t.id === 'activity' && onlineCount > 0 && (
              <span className="ml-1 w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[8px] flex items-center justify-center">{onlineCount}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="px-3 py-1.5 bg-destructive/10 text-destructive text-[10px] border-b border-destructive/20">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-[10px]">Loading...</div>
        ) : (
          <>
            {tab === 'users' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search users..." className="w-full pl-7 pr-2 py-1.5 bg-background border border-border rounded text-xs text-foreground placeholder:text-muted-foreground/50" />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{users.length} users</span>
                </div>
                <div className="space-y-1">
                  {filteredUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-2 rounded border border-border/50 hover:bg-muted/20">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={u.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                          {(u.display_name || u.email || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground truncate">{u.display_name || 'No name'}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {u.roles.map(r => (
                          <span key={r} className={`px-1.5 py-0.5 rounded text-[8px] font-display tracking-wider uppercase ${
                            r === 'admin' ? 'bg-primary/20 text-primary' : r === 'moderator' ? 'bg-amber-500/20 text-amber-400' : 'bg-muted text-muted-foreground'
                          }`}>
                            {r}
                            <button onClick={() => removeRole(u.user_id, r)} className="ml-1 hover:text-destructive"><Minus size={8} /></button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-0.5">
                        {(['admin', 'moderator', 'user'] as const).filter(r => !u.roles.includes(r)).map(r => (
                          <button key={r} onClick={() => assignRole(u.user_id, r)}
                            className="px-1.5 py-0.5 rounded border border-border text-[8px] text-muted-foreground hover:text-foreground hover:bg-muted/30 flex items-center gap-0.5">
                            <Plus size={8} />{r}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'activity' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-foreground">{onlineCount} online now</span>
                  </div>
                  <button onClick={load} className="text-[9px] text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border">Refresh</button>
                </div>
                <div className="space-y-1">
                  {presenceUsers.map(p => {
                    const online = isOnline(p.last_seen);
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-2 rounded border border-border/50 hover:bg-muted/20">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                            <span className="font-display text-[10px] text-primary">{(p.username || 'U').charAt(0).toUpperCase()}</span>
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${online ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-xs truncate">{p.username}</p>
                          <p className="text-[9px] text-muted-foreground">#{p.channel}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[9px] ${online ? 'text-emerald-400' : 'text-muted-foreground/50'}`}>
                            {online ? 'Online' : getTimeAgo(p.last_seen)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {presenceUsers.length === 0 && <p className="text-center text-muted-foreground py-8">No activity data</p>}
                </div>
              </div>
            )}

            {tab === 'waitlist' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground">{waitlist.length} entries</span>
                  <button onClick={exportWaitlistCSV} className="flex items-center gap-1 px-2 py-1 rounded border border-border text-[9px] text-muted-foreground hover:text-foreground">
                    <Download size={10} /> Export CSV
                  </button>
                </div>
                <div className="space-y-1">
                  {waitlist.map(w => (
                    <div key={w.id} className="flex items-center justify-between p-2 rounded border border-border/50 hover:bg-muted/20">
                      <div>
                        <p className="text-foreground">{w.email}</p>
                        <p className="text-[9px] text-muted-foreground">{w.name || 'No name'} • {new Date(w.created_at).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => deleteWaitlistEntry(w.id)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {waitlist.length === 0 && <p className="text-center text-muted-foreground py-8">No waitlist entries</p>}
                </div>
              </div>
            )}

            {tab === 'chat' && (
              <div className="space-y-1">
                {messages.map(m => (
                  <div key={m.id} className="flex items-start gap-2 p-2 rounded border border-border/50 hover:bg-muted/20 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-display text-[9px] tracking-wider">{m.username}</span>
                        <span className="text-[8px] text-muted-foreground/50">#{m.channel}</span>
                        <span className="text-[8px] text-muted-foreground/50">{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-foreground mt-0.5 break-words">{m.content}</p>
                    </div>
                    <button onClick={() => deleteMessage(m.id)} className="p-1 text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {messages.length === 0 && <p className="text-center text-muted-foreground py-8">No messages</p>}
              </div>
            )}

            {tab === 'stats' && stats && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Registered Users', value: stats.users, color: 'text-primary' },
                  { label: 'Waitlist Signups', value: stats.waitlist, color: 'text-amber-400' },
                  { label: 'Files Stored', value: stats.files, color: 'text-emerald-400' },
                  { label: 'Total Storage', value: formatBytes(stats.totalFileSize), color: 'text-emerald-400' },
                  { label: 'Chat Messages', value: stats.messages, color: 'text-blue-400' },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded border border-border/50 bg-background/50">
                    <p className="text-[9px] text-muted-foreground font-display tracking-wider uppercase">{s.label}</p>
                    <p className={`text-2xl font-mono mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
