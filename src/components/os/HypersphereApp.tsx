import { useState, useRef, useEffect } from 'react';
import { Send, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'hyper' | 'user';
  text: string;
}

const GREETING = "Greetings, operator. I am Hyper — your geometric AI companion, powered by real intelligence. How may I assist your lattice operations?";

const QUICK_ACTIONS = [
  { label: 'System Status', prompt: 'Give me a full PRIME OS system status report including all subsystems.' },
  { label: 'Run Diagnostics', prompt: 'Run a complete diagnostic check on all PRIME OS systems and report results.' },
  { label: 'Threat Scan', prompt: 'Perform a security threat scan across all 11 dimensions and report findings.' },
  { label: 'Energy Report', prompt: 'Generate a detailed energy harvesting report with COP metrics.' },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function HypersphereApp() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'greeting', role: 'hyper', text: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [osCharged, setOsCharged] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

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

    // Build conversation history for API
    const history = [...messages.filter(m => m.id !== 'greeting'), userMsg].map(m => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: m.text,
    }));

    const assistantId = `h-${Date.now()}`;
    let assistantSoFar = '';

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/hyper-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
        const errorText = err.error || `Error ${resp.status}`;
        setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: `⚠️ ${errorText}` }]);
        setThinking(false);
        return;
      }

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

      // If no tokens arrived, add fallback
      if (!assistantSoFar) {
        setMessages(prev => [...prev, { id: assistantId, role: 'hyper', text: 'The lattice resonance is unclear. Please try again.' }]);
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
      {/* Hypersphere Visualization */}
      <div className="flex items-center justify-center py-4 border-b border-border bg-card/30">
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
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-lg text-[11px] leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-primary/15 text-foreground border border-primary/20'
                : 'bg-card/60 text-muted-foreground border border-border'
            }`}>
              {msg.role === 'hyper' && <span className="text-primary font-display text-[9px] tracking-wider block mb-1">HYPER</span>}
              {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                part.startsWith('**') && part.endsWith('**')
                  ? <strong key={i} className="text-foreground">{part.slice(2, -2)}</strong>
                  : <span key={i}>{part}</span>
              )}
            </div>
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
