import { useState, useEffect, useCallback, useRef } from 'react';
import { Phone, PhoneOff, MessageSquare, Users, Signal, Battery, Delete, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface Contact {
  id: string;
  name: string;
  avatar: string;
  userId: string;
  online?: boolean;
  unread?: number;
}

interface Message {
  id: string;
  from: string;
  text: string;
  time: string;
  isMine: boolean;
}

// Fallback demo contacts for guests
const DEMO_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Node Alpha', avatar: 'α', userId: '' },
  { id: 'c2', name: 'Sector 7 Admin', avatar: 'Σ', userId: '' },
  { id: 'c3', name: 'QK Scheduler', avatar: 'Q', userId: '' },
];

const DEMO_MESSAGES: Message[] = [
  { id: '1', from: 'them', text: 'Lattice node ⟨2,3,5⟩ reporting stable.', time: '14:22', isMine: false },
  { id: '2', from: 'me', text: 'Copy. Running diagnostics now.', time: '14:23', isMine: true },
  { id: '3', from: 'them', text: 'COP readings nominal at 3.21.', time: '14:25', isMine: false },
];

type Tab = 'calls' | 'messages' | 'contacts';

export default function PrimeCommApp() {
  const [tab, setTab] = useState<Tab>('messages');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>(DEMO_CONTACTS);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [dialNumber, setDialNumber] = useState('');
  const [calling, setCalling] = useState(false);
  const [phoneTime, setPhoneTime] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('Operator');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load user profile name
  useEffect(() => {
    if (!userId) return;
    (supabase as any).from('profiles').select('display_name').eq('user_id', userId).maybeSingle()
      .then(({ data }: any) => { if (data?.display_name) setUserName(data.display_name); });
  }, [userId]);

  // Clock
  useEffect(() => {
    const update = () => setPhoneTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Load contacts from profiles
  useEffect(() => {
    if (!userId) { setContacts(DEMO_CONTACTS); return; }
    const load = async () => {
      try {
        const { data } = await (supabase as any).from('profiles').select('user_id, display_name, avatar_url');
        if (data) {
          const c: Contact[] = data
            .filter((p: any) => p.user_id !== userId)
            .map((p: any) => ({
              id: p.user_id,
              name: p.display_name || 'Unknown',
              avatar: (p.display_name || 'U')[0].toUpperCase(),
              userId: p.user_id,
            }));
          setContacts(c.length > 0 ? c : DEMO_CONTACTS);
        }
      } catch { setContacts(DEMO_CONTACTS); }
    };
    load();
  }, [userId]);

  // Get DM channel name
  const getChannel = useCallback((otherUserId: string) => {
    if (!userId) return '';
    const sorted = [userId, otherUserId].sort();
    return `dm-${sorted[0]}-${sorted[1]}`;
  }, [userId]);

  // Load messages for selected contact
  const loadMessages = useCallback(async () => {
    if (!userId || !selectedContact) {
      if (selectedContact === 'c1') setMessages(DEMO_MESSAGES);
      else setMessages([]);
      return;
    }
    const contact = contacts.find(c => c.id === selectedContact);
    if (!contact?.userId) { setMessages(DEMO_MESSAGES); return; }

    const channel = getChannel(contact.userId);
    try {
      const { data } = await (supabase as any).from('chat_messages')
        .select('*')
        .eq('channel', channel)
        .order('created_at', { ascending: true })
        .limit(100);
      if (data) {
        setMessages(data.map((m: any) => ({
          id: m.id,
          from: m.user_id,
          text: m.content,
          time: new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          isMine: m.user_id === userId,
        })));
      }
    } catch {}
  }, [userId, selectedContact, contacts, getChannel]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Realtime for DMs
  useEffect(() => {
    if (!userId || !selectedContact) return;
    const contact = contacts.find(c => c.id === selectedContact);
    if (!contact?.userId) return;
    const channel = getChannel(contact.userId);

    const sub = supabase
      .channel(`dm-${channel}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel=eq.${channel}` }, (payload: any) => {
        const m = payload.new;
        setMessages(prev => [...prev, {
          id: m.id,
          from: m.user_id,
          text: m.content,
          time: new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          isMine: m.user_id === userId,
        }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [userId, selectedContact, contacts, getChannel]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!messageInput.trim()) return;
    if (!userId) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), from: 'me', text: messageInput, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), isMine: true,
      }]);
      setMessageInput('');
      return;
    }

    const contact = contacts.find(c => c.id === selectedContact);
    if (!contact?.userId) return;
    const channel = getChannel(contact.userId);

    try {
      await (supabase as any).from('chat_messages').insert({
        channel,
        content: messageInput,
        user_id: userId,
        username: userName,
      });
      setMessageInput('');
    } catch (e) { console.error('Send failed:', e); }
  }, [messageInput, userId, selectedContact, contacts, getChannel, userName]);

  const dialPad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  const contact = selectedContact ? contacts.find(c => c.id === selectedContact) : null;

  return (
    <div className="flex h-full items-center justify-center bg-background p-4">
      <div className="w-[280px] h-full max-h-[520px] bg-card border-2 border-border rounded-[28px] flex flex-col overflow-hidden shadow-lg relative">
        {/* Status bar */}
        <div className="h-6 bg-card flex items-center justify-between px-4 pt-1">
          <span className="text-[8px] text-muted-foreground font-mono">{phoneTime}</span>
          <div className="flex items-center gap-1">
            <Signal size={8} className="text-primary" />
            <Battery size={8} className="text-primary" />
          </div>
        </div>

        <div className="flex justify-center -mt-0.5 mb-1">
          <div className="w-20 h-4 bg-background rounded-b-xl" />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Calls tab */}
          {tab === 'calls' && (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <div className="text-lg font-mono text-foreground mb-2 tracking-widest min-h-[28px]">{dialNumber || '—'}</div>
              {calling && <div className="text-[10px] text-primary animate-pulse mb-2">Connecting via PrimeNet...</div>}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {dialPad.map(d => (
                  <button key={d} onClick={() => setDialNumber(prev => prev + d)} className="w-12 h-10 rounded-lg bg-muted/30 hover:bg-muted text-foreground text-sm font-mono transition-colors">{d}</button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setDialNumber(prev => prev.slice(0, -1))} className="p-2 rounded-full text-muted-foreground hover:bg-muted"><Delete size={16} /></button>
                {!calling ? (
                  <button onClick={() => { if (dialNumber) setCalling(true); }} className="p-3 rounded-full bg-primary text-primary-foreground"><Phone size={18} /></button>
                ) : (
                  <button onClick={() => setCalling(false)} className="p-3 rounded-full bg-destructive text-destructive-foreground"><PhoneOff size={18} /></button>
                )}
              </div>
            </div>
          )}

          {/* Messages - contact list */}
          {tab === 'messages' && !selectedContact && (
            <ScrollArea className="flex-1">
              <div className="p-2">
                {!userId && (
                  <div className="text-[9px] text-muted-foreground text-center p-2 mb-2 bg-muted/20 rounded">
                    Sign in to send real messages
                  </div>
                )}
                {contacts.map(c => (
                  <button key={c.id} onClick={() => setSelectedContact(c.id)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold relative">
                      {c.avatar}
                      {c.online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-[11px] text-foreground truncate">{c.name}</div>
                      <div className="text-[9px] text-muted-foreground truncate">Tap to message</div>
                    </div>
                    {c.unread && c.unread > 0 && (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[8px] text-primary-foreground font-bold">{c.unread}</div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Messages - conversation */}
          {tab === 'messages' && selectedContact && contact && (
            <div className="flex-1 flex flex-col">
              <button onClick={() => setSelectedContact(null)} className="flex items-center gap-2 p-2 border-b border-border">
                <span className="text-[10px] text-primary">←</span>
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">{contact.avatar}</div>
                <span className="text-[11px] text-foreground">{contact.name}</span>
              </button>
              <ScrollArea className="flex-1 p-2">
                <div className="flex flex-col gap-1.5">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-2.5 py-1.5 rounded-xl text-[10px] ${m.isMine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'}`}>
                        {m.text}
                        <div className={`text-[7px] mt-0.5 ${m.isMine ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>{m.time}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
              {/* Message input */}
              <div className="border-t border-border p-2 flex items-center gap-1.5">
                <input
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                  placeholder="Type a message..."
                  className="flex-1 bg-muted/30 border border-border rounded-full px-3 py-1.5 text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button onClick={sendMessage} className="p-1.5 rounded-full bg-primary text-primary-foreground">
                  <Send size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Contacts tab */}
          {tab === 'contacts' && (
            <ScrollArea className="flex-1">
              <div className="p-2">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">{c.avatar}</div>
                    <div>
                      <div className="text-[11px] text-foreground">{c.name}</div>
                      <div className="text-[8px] text-muted-foreground">{c.online ? '● Online' : '○ Offline'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Bottom tabs */}
        <div className="h-12 border-t border-border flex items-center justify-around bg-card">
          {([
            { id: 'calls' as Tab, icon: <Phone size={16} />, label: 'Calls' },
            { id: 'messages' as Tab, icon: <MessageSquare size={16} />, label: 'Messages' },
            { id: 'contacts' as Tab, icon: <Users size={16} />, label: 'Contacts' },
          ]).map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSelectedContact(null); }}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded transition-colors ${tab === t.id ? 'text-primary' : 'text-muted-foreground'}`}>
              {t.icon}
              <span className="text-[8px]">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-center pb-1">
          <div className="w-16 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}
