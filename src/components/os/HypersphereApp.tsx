import { useState, useRef, useEffect } from 'react';
import { Send, Coins, ChevronDown, ChevronUp, Share2, Mail, Activity, Wallet, TrendingUp, Gamepad2, Target, CalendarDays, BarChart3, MessageSquare, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { eventBus } from '@/hooks/useEventBus';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { WindowState } from '@/types/os';

interface Message {
  id: string;
  role: 'hyper' | 'user';
  text: string;
  fromPriorSession?: boolean;
}

interface AgentAction {
  type: 'post' | 'email' | 'trade' | 'wallet' | 'bet' | 'game' | 'market' | 'booking' | 'message' | 'audio';
  summary: string;
  timestamp: Date;
}

interface Permissions {
  canPost: boolean;
  canEmail: boolean;
  canWallet: boolean;
  canBooking: boolean;
}

interface HypersphereProps {
  openWindows?: WindowState[];
  activeWorkspace?: number;
}

function loadPermissions(): Permissions {
  try {
    const s = localStorage.getItem('prime-os-hyper-permissions');
    const p = s ? JSON.parse(s) : {};
    return { canPost: p.canPost ?? true, canEmail: p.canEmail ?? true, canWallet: p.canWallet ?? true, canBooking: p.canBooking ?? true };
  } catch { return { canPost: true, canEmail: true, canWallet: true, canBooking: true }; }
}

const GREETING = "Greetings, operator. I am Hyper — your geometric AI companion, powered by real intelligence. I can post to PrimeSocial, send emails, manage your wallet, trade shares, place bets, claim arcade rewards, fetch market data, manage your portfolio, book resources, send messages, and control audio playback. How may I assist your lattice operations?";

const QUICK_ACTIONS = [
  { label: 'System Status', prompt: 'Give me a full PRIME OS system status report including all subsystems.' },
  { label: 'Check Balance', prompt: 'Check my wallet balance.' },
  { label: 'Portfolio', prompt: 'What shares do I currently hold in the Forge marketplace?' },
  { label: 'Post Update', prompt: 'Post an update to PrimeSocial about the current state of all PRIME OS systems and any interesting metrics.' },
  { label: 'Send Report', prompt: 'Send a detailed system status report email to the operator with current metrics across all subsystems.' },
  { label: 'Energy Report', prompt: 'Generate a detailed energy harvesting report with COP metrics.' },
  { label: 'Markets', prompt: 'Get me live market data for AAPL, MSFT, GOOGL, TSLA.' },
  { label: 'My Portfolio', prompt: 'Show me my PrimeVault portfolio with current prices.' },
  { label: 'My Bookings', prompt: 'List my upcoming bookings.' },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function HypersphereApp({ openWindows, activeWorkspace }: HypersphereProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'greeting', role: 'hyper', text: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [osCharged, setOsCharged] = useState<number | null>(null);
  const [agentActions, setAgentActions] = useState<AgentAction[]>([]);
  const [permissions, setPermissions] = useState<Permissions>(loadPermissions);
  const [activityOpen, setActivityOpen] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionStartRef = useRef(Date.now());

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    localStorage.setItem('prime-os-hyper-permissions', JSON.stringify(permissions));
  }, [permissions]);

  // Load conversation history for signed-in users
  useEffect(() => {
    if (historyLoaded) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setHistoryLoaded(true); return; }
      try {
        const { data } = await (supabase as any).from('ai_conversations')
          .select('role, content, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(20);
        if (data && data.length > 0) {
          const priorMessages: Message[] = data.reverse().map((m: any, i: number) => ({
            id: `prior-${i}`,
            role: m.role === 'user' ? 'user' as const : 'hyper' as const,
            text: m.content,
            fromPriorSession: true,
          }));
          setMessages(prev => [
            prev[0], // greeting
            ...priorMessages,
            { id: 'divider', role: 'hyper' as const, text: '── New Session ──', fromPriorSession: true },
          ]);
        }
      } catch {}
      setHistoryLoaded(true);
    })();
  }, [historyLoaded]);

  // Save assistant streaming response to DB after it completes
  const saveAssistantResponse = async (content: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await (supabase as any).from('ai_conversations').insert({
        user_id: session.user.id,
        role: 'assistant',
        content,
      });
    } catch {}
  };

  const logAction = (type: AgentAction['type'], summary: string) => {
    const action: AgentAction = { type, summary, timestamp: new Date() };
    setAgentActions(prev => [action, ...prev].slice(0, 50));
    eventBus.emit('agent.action.logged', action);
  };

  // Build context payload
  const buildContext = () => {
    const profile = (() => {
      try {
        const p = JSON.parse(localStorage.getItem('prime-os-profile') || '{}');
        return { name: p.name || '', title: p.title || 'Operator', bio: p.bio || '' };
      } catch { return { name: '', title: 'Operator', bio: '' }; }
    })();

    const wallet = (() => {
      try {
        const w = JSON.parse(localStorage.getItem('prime-os-wallet-cache') || '{}');
        return { os: w.os_balance ?? null, ix: w.ix_balance ?? null };
      } catch { return { os: null, ix: null }; }
    })();

    return {
      profile,
      wallet,
      permissions,
      sessionMessages: messages.filter(m => !m.fromPriorSession && m.id !== 'greeting').length,
      openApps: openWindows?.filter(w => !w.isMinimized).map(w => w.app) || [],
      workspace: activeWorkspace || 1,
    };
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || thinking) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    setOsCharged(null);

    // Charge 50 OS for AI usage
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const chargeRes = await fetch(`${SUPABASE_URL}/functions/v1/prime-bank?action=ai-charge`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
          },
          body: JSON.stringify({ amount: 50, description: 'Hypersphere AI query' }),
        });
        const chargeData = await chargeRes.json();
        if (chargeData.charged) setOsCharged(50);
      }
    } catch {}

    // Build conversation history for API (exclude prior session messages and divider)
    const history = [...messages.filter(m => m.id !== 'greeting' && m.id !== 'divider' && !m.fromPriorSession), userMsg].map(m => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: m.text,
    }));

    const context = buildContext();

    const assistantId = `h-${Date.now()}`;
    let assistantSoFar = '';

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      // Get auth token for context-aware requests
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || SUPABASE_KEY;

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/hyper-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ messages: history, context }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
        const errorText = err.error || `Error ${resp.status}`;
        setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: `⚠️ ${errorText}` }]);
        setThinking(false);
        return;
      }

      const contentType = resp.headers.get('content-type') || '';

      // Tool call response (JSON)
      if (contentType.includes('application/json')) {
        const data = await resp.json();
        if (data.type === 'tool_call') {
          const tool = data.tool;
          if (tool === 'post_to_social') {
            if (permissions.canPost) {
              eventBus.emit('social.post.created', data.data);
              logAction('post', data.data?.content?.substring(0, 80) || 'Social post');
              setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.reply || '✅ Posted to PrimeSocial.' }]);
            } else {
              setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: '⚠️ Social posting is currently disabled by operator. Enable it in the permission toggles above.' }]);
            }
          } else if (tool === 'send_email') {
            if (permissions.canEmail) {
              eventBus.emit('mail.received', data.data);
              logAction('email', `To: ${data.data?.to || 'operator'} — ${data.data?.subject?.substring(0, 60) || 'Email'}`);
              setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.reply || '✅ Email sent.' }]);
            } else {
              setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: '⚠️ Email sending is currently disabled by operator. Enable it in the permission toggles above.' }]);
            }
          } else if (tool === 'check_balance') {
            setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.reply || 'Balance checked.' }]);
          } else if (tool === 'transfer_tokens') {
            if (permissions.canWallet) {
              eventBus.emit('wallet.transfer', data.data);
              logAction('wallet', `Transfer: ${data.data?.amount || '?'} ${data.data?.token_type || 'OS'} → ${data.data?.to || '?'}`);
              setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.reply || '✅ Transfer complete.' }]);
            } else {
              setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: '⚠️ Financial operations are currently disabled by operator.' }]);
            }
          } else if (tool === 'buy_shares' || tool === 'sell_shares') {
            if (permissions.canWallet) {
              eventBus.emit('trade.executed', data.data);
              logAction('trade', `${tool === 'buy_shares' ? 'Buy' : 'Sell'}: ${data.data?.app || '?'} (${data.data?.shares || '?'} shares)`);
              setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.reply || '✅ Trade executed.' }]);
            } else {
              setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: '⚠️ Financial operations are currently disabled by operator.' }]);
            }
          } else if (tool === 'place_bet') {
            if (permissions.canWallet) {
              eventBus.emit('bet.placed', data.data);
              logAction('bet', `Bet: ${data.data?.side || '?'} on "${data.data?.market?.substring(0, 50) || '?'}"`);
              setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.reply || '✅ Bet placed.' }]);
            } else {
              setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: '⚠️ Financial operations are currently disabled by operator.' }]);
            }
          } else if (tool === 'play_arcade') {
            logAction('game', `Arcade: ${data.data?.game || '?'} — ${data.data?.reward || '?'} OS`);
            setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.reply || '🎮 Arcade reward claimed.' }]);
          } else if (tool === 'get_market_data' || tool === 'get_stock_chart') {
            logAction('market', data.reply?.substring(0, 80) || 'Market data fetched');
            eventBus.emit('market.checked', data.data);
            setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.reply || 'Market data retrieved.' }]);
          } else if (tool === 'check_portfolio') {
            logAction('market', 'Portfolio check');
            setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.reply || 'Portfolio checked.' }]);
          } else if (tool === 'trade_stock') {
            if (permissions.canWallet) {
              eventBus.emit('trade.executed', data.data);
              logAction('trade', `${data.data?.action || 'Trade'}: ${data.data?.quantity || '?'} ${data.data?.symbol || '?'}`);
              setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.reply || '✅ Trade executed.' }]);
            } else {
              setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: '⚠️ Financial operations are currently disabled by operator.' }]);
            }
          } else if (tool === 'create_booking') {
            if (permissions.canBooking) {
              eventBus.emit('booking.created', data.data);
              logAction('booking', `Booked: ${data.data?.resource || '?'}`);
              setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.reply || '✅ Booking created.' }]);
            } else {
              setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: '⚠️ Booking is currently disabled by operator.' }]);
            }
          } else if (tool === 'cancel_booking') {
            if (permissions.canBooking) {
              eventBus.emit('booking.cancelled', data.data);
              logAction('booking', 'Booking cancelled');
              setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.reply || '✅ Booking cancelled.' }]);
            } else {
              setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: '⚠️ Booking is currently disabled by operator.' }]);
            }
          } else if (tool === 'list_bookings' || tool === 'list_conversations') {
            setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.reply || 'Data retrieved.' }]);
          } else if (tool === 'send_message') {
            eventBus.emit('social.post.created', data.data);
            logAction('message', `DM to ${data.data?.to || '?'}`);
            setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.reply || '✅ Message sent.' }]);
          } else if (tool === 'control_audio') {
            eventBus.emit('audio.control', data.data);
            logAction('audio', `Audio: ${data.data?.action || '?'}`);
            setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.reply || '🎵 Audio command sent.' }]);
          } else {
            setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.reply || 'Action completed.' }]);
          }
        } else {
          setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: data.error || 'Unexpected response.' }]);
        }
        setThinking(false);
        return;
      }

      // Streaming SSE response (normal chat)
      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const currentText = assistantSoFar;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.id === assistantId) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, text: currentText } : m);
                }
                return [...prev, { id: assistantId, role: 'hyper', text: currentText }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const currentText = assistantSoFar;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.id === assistantId) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, text: currentText } : m);
                }
                return [...prev, { id: assistantId, role: 'hyper', text: currentText }];
              });
            }
          } catch { /* ignore */ }
        }
      }

      if (!assistantSoFar) {
        setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: 'The lattice resonance is unclear. Please try again.' }]);
      } else {
        // Save assistant response to DB
        saveAssistantResponse(assistantSoFar);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: `⚠️ Connection error: ${e.message}` }]);
      }
    } finally {
      setThinking(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="h-full bg-background flex flex-col font-mono text-xs">
      {/* Hypersphere Visualization + Permission Toggles */}
      <div className="flex items-center justify-center py-4 border-b border-border bg-card/30 relative">
        <svg width="100" height="100" viewBox="0 0 100 100" className="select-none">
          <ellipse cx="50" cy="50" rx="45" ry="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4">
            <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur={thinking ? "2s" : "8s"} repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="50" cy="50" rx="35" ry="35" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.3">
            <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="-360 50 50" dur={thinking ? "3s" : "12s"} repeatCount="indefinite" />
          </ellipse>
          {[0, 30, 60, 90, 120, 150].map(angle => (
            <ellipse key={angle} cx="50" cy="50" rx="25" ry="25" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.5"
              transform={`rotate(${angle} 50 50)`}>
              <animateTransform attributeName="transform" type="rotate" from={`${angle} 50 50`} to={`${angle + 360} 50 50`} dur={thinking ? "4s" : "15s"} repeatCount="indefinite" />
            </ellipse>
          ))}
          <ellipse cx="50" cy="38" rx="20" ry="6" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.4" opacity="0.3" />
          <ellipse cx="50" cy="50" rx="25" ry="8" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.6" opacity="0.5" />
          <ellipse cx="50" cy="62" rx="20" ry="6" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.4" opacity="0.3" />
          <circle cx="50" cy="50" r="4" fill="hsl(var(--primary))" opacity={thinking ? "0.8" : "0.4"}>
            <animate attributeName="r" values={thinking ? "4;6;4" : "3;4;3"} dur={thinking ? "0.8s" : "2s"} repeatCount="indefinite" />
            <animate attributeName="opacity" values={thinking ? "0.8;1;0.8" : "0.3;0.5;0.3"} dur={thinking ? "0.8s" : "2s"} repeatCount="indefinite" />
          </circle>
        </svg>

        {/* Permission Toggles */}
        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Share2 size={9} className={permissions.canPost ? 'text-primary' : 'text-muted-foreground/40'} />
            <span className="text-[8px] text-muted-foreground w-8">Social</span>
            <Switch
              checked={permissions.canPost}
              onCheckedChange={v => setPermissions(p => ({ ...p, canPost: v }))}
              className="h-3.5 w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Mail size={9} className={permissions.canEmail ? 'text-primary' : 'text-muted-foreground/40'} />
            <span className="text-[8px] text-muted-foreground w-8">Mail</span>
            <Switch
              checked={permissions.canEmail}
              onCheckedChange={v => setPermissions(p => ({ ...p, canEmail: v }))}
              className="h-3.5 w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Wallet size={9} className={permissions.canWallet ? 'text-primary' : 'text-muted-foreground/40'} />
            <span className="text-[8px] text-muted-foreground w-8">Wallet</span>
            <Switch
              checked={permissions.canWallet}
              onCheckedChange={v => setPermissions(p => ({ ...p, canWallet: v }))}
              className="h-3.5 w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays size={9} className={permissions.canBooking ? 'text-primary' : 'text-muted-foreground/40'} />
            <span className="text-[8px] text-muted-foreground w-8">Book</span>
            <Switch
              checked={permissions.canBooking}
              onCheckedChange={v => setPermissions(p => ({ ...p, canBooking: v }))}
              className="h-3.5 w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map(msg => (
          <div key={msg.id}>
            {msg.id === 'divider' ? (
              <div className="flex items-center gap-2 py-2">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[8px] text-muted-foreground/50 font-display tracking-wider">PRIOR SESSION</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
            ) : (
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-lg text-[11px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary/15 text-foreground border border-primary/20'
                    : 'bg-card/60 text-muted-foreground border border-border'
                } ${msg.fromPriorSession ? 'opacity-60' : ''}`}>
                  {msg.role === 'hyper' && <span className="text-primary font-display text-[9px] tracking-wider block mb-1">HYPER</span>}
                  {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={i} className="text-foreground">{part.slice(2, -2)}</strong>
                      : <span key={i}>{part}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {thinking && !messages.some(m => m.id.startsWith('h-') && messages.indexOf(m) === messages.length - 1 && m.role === 'hyper') && (
          <div className="flex justify-start">
            <div className="bg-card/60 border border-border rounded-lg px-3 py-2">
              <span className="text-primary font-display text-[9px] tracking-wider block mb-1">HYPER</span>
              <span className="text-muted-foreground text-[11px] animate-pulse">Folding through dimensions...</span>
            </div>
          </div>
        )}
      </div>

      {/* Agent Activity Log */}
      {agentActions.length > 0 && (
        <Collapsible open={activityOpen} onOpenChange={setActivityOpen} className="border-t border-border/50">
          <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-1.5">
              <Activity size={10} className="text-primary" />
              <span className="text-[9px] font-display tracking-wider uppercase text-primary/70">Agent Activity</span>
              <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-primary/30 text-primary/70">
                {agentActions.length}
              </Badge>
            </div>
            {activityOpen ? <ChevronDown size={10} className="text-muted-foreground/50" /> : <ChevronUp size={10} className="text-muted-foreground/50" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="max-h-28 overflow-y-auto px-3 py-1 space-y-1">
              {agentActions.slice(0, 10).map((a, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[9px]">
                  {a.type === 'post' ? <Share2 size={8} className="text-primary/60 shrink-0" /> :
                   a.type === 'email' ? <Mail size={8} className="text-primary/60 shrink-0" /> :
                   a.type === 'wallet' ? <Wallet size={8} className="text-primary/60 shrink-0" /> :
                   a.type === 'trade' ? <TrendingUp size={8} className="text-primary/60 shrink-0" /> :
                   a.type === 'bet' ? <Target size={8} className="text-primary/60 shrink-0" /> :
                   a.type === 'game' ? <Gamepad2 size={8} className="text-primary/60 shrink-0" /> :
                   a.type === 'market' ? <BarChart3 size={8} className="text-primary/60 shrink-0" /> :
                   a.type === 'booking' ? <CalendarDays size={8} className="text-primary/60 shrink-0" /> :
                   a.type === 'message' ? <MessageSquare size={8} className="text-primary/60 shrink-0" /> :
                   a.type === 'audio' ? <Music size={8} className="text-primary/60 shrink-0" /> :
                   <Activity size={8} className="text-primary/60 shrink-0" />}
                  <span className="text-muted-foreground truncate flex-1">{a.summary}</span>
                  <span className="text-muted-foreground/40 text-[7px] shrink-0">{a.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Quick Actions */}
      <div className="px-3 py-1.5 flex gap-1.5 overflow-x-auto scrollbar-none border-t border-border/50">
        {QUICK_ACTIONS.map(qa => (
          <button
            key={qa.label}
            onClick={() => sendMessage(qa.prompt)}
            disabled={thinking}
            className="shrink-0 px-2 py-1 rounded-full border border-primary/20 text-[9px] text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-border">
        {osCharged && (
          <div className="flex items-center gap-1 mb-1.5 text-[8px] text-amber-400/70">
            <Coins size={8} /> {osCharged} OS charged for this query
          </div>
        )}
        <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask Hyper anything..."
          disabled={thinking}
          className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={thinking || !input.trim()}
          className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          <Send size={14} />
        </button>
        </div>
      </div>
    </div>
  );
}
