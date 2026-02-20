import { useState, useEffect, useRef, useCallback } from 'react';
import { Hash, Lock, Send, MessageSquare, Users, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ───
interface Message {
  id: string;
  user: string;
  text: string;
  time: string;
  isOwn: boolean;
}

interface Channel {
  name: string;
  encrypted: boolean;
  unread: number;
  messages: Message[];
}

// ─── Simulated mode data ───
const USERS = ['lattice-admin', 'q3-daemon', 'node-07', 'foldmem-gc', 'energy-harv', 'pfs-watcher'];
const AUTO_RESPONSES: Record<string, string[]> = {
  '#general': [
    'Lattice integrity nominal. All 649 cores reporting.',
    'Fibonacci Waltz scheduler running at 99.2% efficiency.',
    'Reminder: 11D → 4D fold maintenance window at 03:00 QK epoch.',
    'New qutrit entanglement protocol deployed to sector 7.',
    'System metrics looking good. COP holding above 3.0.',
  ],
  '#primenet-ops': [
    'Geodesic routing table refreshed. 6 nodes active.',
    'Packet throughput peaked at 342 pkt/s today.',
    'Route optimization: path ⟨2,3⟩→⟨7,11⟩ reduced to 2 hops.',
    'Node-07 latency spike detected, auto-rerouting traffic.',
    'Network scan complete. No anomalies detected.',
  ],
  '#q3-research': [
    'Training batch 47 complete. Accuracy: 97.3% on fold-classification.',
    'New inference model uses 3,221× less energy than classical.',
    'Qutrit superposition stability improved with Adinkra encoding.',
    'Exploring |2⟩ state transitions for temporal prediction.',
    'Paper draft on geometric ML ready for lattice-admin review.',
  ],
  '#energy-lab': [
    'COP measurement verified: 3.24 on satellite mode.',
    'Dimensional coupling test passed at 92% efficiency.',
    'Exceeded Carnot limit by 119% — geometric harvesting confirmed.',
    'New terrestrial mode calibration in progress.',
    'Energy surplus routed to FoldMem expansion.',
  ],
};

const CHANNELS = ['#general', '#primenet-ops', '#q3-research', '#energy-lab'];

function makeTime() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

function initChannels(): Channel[] {
  return [
    { name: '#general', encrypted: false, unread: 2, messages: [
      { id: '1', user: 'lattice-admin', text: 'System boot complete. All services nominal.', time: '08:00', isOwn: false },
      { id: '2', user: 'q3-daemon', text: 'Q3 inference engine initialized. 649 cores online.', time: '08:01', isOwn: false },
      { id: '3', user: 'node-07', text: 'PrimeNet mesh connected. Geodesic routing active.', time: '08:02', isOwn: false },
    ]},
    { name: '#primenet-ops', encrypted: false, unread: 0, messages: [
      { id: '1', user: 'node-07', text: 'Route table synced across all 6 active nodes.', time: '08:15', isOwn: false },
    ]},
    { name: '#q3-research', encrypted: true, unread: 1, messages: [
      { id: '1', user: 'q3-daemon', text: 'Training epoch 46 complete. Loss: 0.0023.', time: '07:45', isOwn: false },
      { id: '2', user: 'lattice-admin', text: 'Excellent convergence. Proceed to batch 47.', time: '07:48', isOwn: false },
    ]},
    { name: '#energy-lab', encrypted: true, unread: 0, messages: [
      { id: '1', user: 'energy-harv', text: 'Morning COP reading: 3.18. Within nominal range.', time: '06:30', isOwn: false },
    ]},
  ];
}

// ─── Simulated Chat (guest mode) ───
function SimulatedChat() {
  const [channels, setChannels] = useState<Channel[]>(initChannels);
  const [activeChannel, setActiveChannel] = useState(0);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState<string | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [channels, activeChannel, scrollToBottom]);

  const sendMessage = useCallback(() => {
    if (!input.trim()) return;
    const channelName = channels[activeChannel].name;
    const msg: Message = { id: Date.now().toString(), user: 'josh', text: input.trim(), time: makeTime(), isOwn: true };
    setChannels(prev => prev.map((ch, i) => i === activeChannel ? { ...ch, messages: [...ch.messages, msg] } : ch));
    setInput('');
    const responder = USERS[Math.floor(Math.random() * USERS.length)];
    setTyping(responder);
    setTimeout(() => {
      const pool = AUTO_RESPONSES[channelName] || AUTO_RESPONSES['#general'];
      const text = pool[Math.floor(Math.random() * pool.length)];
      const reply: Message = { id: (Date.now() + 1).toString(), user: responder, text, time: makeTime(), isOwn: false };
      setChannels(prev => prev.map((ch, i) => i === activeChannel ? { ...ch, messages: [...ch.messages, reply] } : ch));
      setTyping(null);
    }, 1000 + Math.random() * 1500);
  }, [input, activeChannel, channels]);

  const active = channels[activeChannel];

  return (
    <ChatLayout
      channels={channels.map(c => ({ name: c.name, encrypted: c.encrypted, unread: c.unread }))}
      activeChannel={activeChannel}
      onSelectChannel={i => { setActiveChannel(i); setChannels(prev => prev.map((c, j) => j === i ? { ...c, unread: 0 } : c)); }}
      messages={active.messages}
      input={input}
      onInputChange={setInput}
      onSend={sendMessage}
      channelName={active.name}
      encrypted={active.encrypted}
      typing={typing}
      messagesEndRef={messagesEnd}
      online={false}
      onlineCount={0}
    />
  );
}

// ─── Live Chat (authenticated mode) ───
function LiveChat({ userId, username }: { userId: string; username: string }) {
  const [activeChannel, setActiveChannel] = useState(0);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<Record<string, number>>({});
  const messagesEnd = useRef<HTMLDivElement>(null);
  const loadedRef = useRef<Set<string>>(new Set());

  const channelName = CHANNELS[activeChannel];

  // Load history for a channel
  const loadHistory = useCallback(async (ch: string) => {
    if (loadedRef.current.has(ch)) return;
    loadedRef.current.add(ch);
    const { data } = await (supabase as any).from('chat_messages')
      .select('*').eq('channel', ch).order('created_at', { ascending: true }).limit(100);
    if (data) {
      setMessages(prev => ({
        ...prev,
        [ch]: data.map((m: any) => ({
          id: m.id, user: m.username, text: m.content,
          time: new Date(m.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          isOwn: m.user_id === userId,
        })),
      }));
    }
  }, [userId]);

  useEffect(() => { loadHistory(channelName); }, [channelName, loadHistory]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('chat-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload: any) => {
        const m = payload.new;
        const msg: Message = {
          id: m.id, user: m.username, text: m.content,
          time: new Date(m.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          isOwn: m.user_id === userId,
        };
        setMessages(prev => ({ ...prev, [m.channel]: [...(prev[m.channel] || []), msg] }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Presence via channel
  useEffect(() => {
    const presenceChannel = supabase.channel('chat-presence', { config: { presence: { key: userId } } });
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const counts: Record<string, number> = {};
        CHANNELS.forEach(ch => { counts[ch] = 0; });
        Object.values(state).forEach((users: any) => {
          users.forEach((u: any) => { if (u.channel && counts[u.channel] !== undefined) counts[u.channel]++; });
        });
        setOnlineUsers(counts);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ username, channel: channelName });
        }
      });

    return () => { supabase.removeChannel(presenceChannel); };
  }, [userId, username, channelName]);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeChannel]);

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    await (supabase as any).from('chat_messages').insert({
      channel: channelName, user_id: userId, username, content: input.trim(),
    });
    setInput('');
  }, [input, channelName, userId, username]);

  const channelMessages = messages[channelName] || [];
  const encrypted = activeChannel >= 2;

  return (
    <ChatLayout
      channels={CHANNELS.map((name, i) => ({
        name, encrypted: i >= 2,
        unread: 0,
        onlineCount: onlineUsers[name] || 0,
      }))}
      activeChannel={activeChannel}
      onSelectChannel={setActiveChannel}
      messages={channelMessages}
      input={input}
      onInputChange={setInput}
      onSend={sendMessage}
      channelName={channelName}
      encrypted={encrypted}
      typing={null}
      messagesEndRef={messagesEnd}
      online={true}
      onlineCount={onlineUsers[channelName] || 0}
    />
  );
}

// ─── Shared Layout ───
interface ChatLayoutProps {
  channels: { name: string; encrypted: boolean; unread: number; onlineCount?: number }[];
  activeChannel: number;
  onSelectChannel: (i: number) => void;
  messages: Message[];
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  channelName: string;
  encrypted: boolean;
  typing: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  online: boolean;
  onlineCount: number;
}

function ChatLayout({ channels, activeChannel, onSelectChannel, messages, input, onInputChange, onSend, channelName, encrypted, typing, messagesEndRef, online, onlineCount }: ChatLayoutProps) {
  return (
    <div className="h-full flex bg-background/50">
      {/* Channel list */}
      <div className="w-44 border-r border-border bg-card/30 flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-border">
          <span className="font-display text-[9px] tracking-[0.2em] uppercase text-primary flex items-center gap-1.5">
            <MessageSquare size={10} /> PrimeChat
          </span>
          <span className="flex items-center gap-1 mt-1 text-[8px] font-mono">
            {online ? <><Wifi size={8} className="text-prime-green" /><span className="text-prime-green">Live</span></> : <><WifiOff size={8} className="text-muted-foreground/50" /><span className="text-muted-foreground/50">Simulated</span></>}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {channels.map((ch, i) => (
            <button
              key={ch.name}
              onClick={() => onSelectChannel(i)}
              className={`flex items-center gap-1.5 w-full px-3 py-1.5 text-[10px] font-mono transition-colors ${
                i === activeChannel ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              {ch.encrypted ? <Lock size={9} className="text-prime-amber shrink-0" /> : <Hash size={9} className="shrink-0" />}
              <span className="truncate">{ch.name}</span>
              {ch.onlineCount != null && ch.onlineCount > 0 && (
                <span className="ml-auto flex items-center gap-0.5 text-[8px] text-prime-green shrink-0">
                  <Users size={8} />{ch.onlineCount}
                </span>
              )}
              {ch.unread > 0 && (
                <span className="ml-auto w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] flex items-center justify-center font-bold shrink-0">
                  {ch.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-3 py-2 border-b border-border flex items-center gap-2">
          {encrypted ? <Lock size={11} className="text-prime-amber" /> : <Hash size={11} className="text-primary" />}
          <span className="font-mono text-xs text-foreground">{channelName}</span>
          {encrypted && <span className="text-[8px] font-display tracking-wider text-prime-amber uppercase">Encrypted</span>}
          {online && onlineCount > 0 && (
            <span className="ml-auto flex items-center gap-1 text-[9px] text-prime-green font-mono">
              <Users size={9} /> {onlineCount} online
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded px-2.5 py-1.5 ${
                msg.isOwn ? 'bg-primary/20 border border-primary/30' : 'bg-card/60 border border-border'
              }`}>
                {!msg.isOwn && (
                  <div className="font-display text-[8px] tracking-wider uppercase text-prime-violet mb-0.5">{msg.user}</div>
                )}
                <div className="font-mono text-[10px] text-foreground leading-relaxed">{msg.text}</div>
                <div className="font-mono text-[8px] text-muted-foreground/50 mt-0.5 text-right">{msg.time}</div>
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground animate-pulse">
              <span className="text-prime-violet">{typing}</span> is computing
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-3 py-2 border-t border-border flex gap-2">
          <input
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSend()}
            placeholder={`Message ${channelName}...`}
            className="flex-1 bg-muted/30 border border-border rounded px-2.5 py-1.5 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors"
          />
          <button onClick={onSend} className="px-2.5 py-1.5 rounded bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors">
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ───
export default function PrimeChatApp() {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        setUser({ id: session.user.id, name: meta?.full_name || meta?.name || 'Operator' });
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        setUser({ id: session.user.id, name: meta?.full_name || meta?.name || 'Operator' });
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (user) return <LiveChat userId={user.id} username={user.name} />;
  return <SimulatedChat />;
}
