import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  role: 'hyper' | 'user';
  text: string;
}

const GREETING = "Greetings, operator. I am Hyper — your geometric companion. How may I assist your lattice operations?";

const RESPONSES: Record<string, string> = {
  help: "I can assist with many lattice operations. Here's what I know:\n\n• **Energy** — COP monitoring & harvesting status\n• **Network** — PrimeNet node health & routing\n• **Memory** — FoldMem allocation & compaction\n• **Security** — Threat assessment & shield status\n• **Storage** — Region capacity & Adinkra encoding\n\nTry typing any of these topics, or use the quick actions below.",
  energy: "⚡ **Energy Harvesting Report**\n\nCOP: 3.21 (Over-Unity confirmed)\nMode: Satellite coupling\nInput: 100W → Output: 321W\n11D dimensional coupling active\nEfficiency: 92% geometric extraction\nCarnot limit exceeded by 2.3×\n\nAll harvesting nodes nominal.",
  network: "🌐 **PrimeNet Health Check**\n\n6 nodes active on lattice P¹¹\nRouting: O(1) geodesic (optimal)\nThroughput: 247 packets/s\nLatency: 0.3ms average\nPacket loss: 0.00%\n\nAll routes stable. No anomalies detected.",
  memory: "💾 **FoldMem Statistics**\n\nAllocation: 388μs (12× faster than malloc)\nFragmentation: 0% (post-compact)\nMapping: 11D folded address space\nActive blocks: 142 / 256\nCompaction cycles: 7 today\n\nMemory pressure: LOW",
  security: "🛡️ **Lattice Shield Assessment**\n\nThreat level: LOW\nFirewall: Active (geometric filtering)\nIntrusion attempts: 0 in last 24h\nEncryption: Qutrit-entangled (unbreakable)\nCertificates: Valid (∞ expiry)\nLast scan: 4 minutes ago\n\nAll sectors clear.",
  hello: "Hello, operator! The lattice hums with geometric resonance today. All 649 qutrit cores are synchronized. How may I help you navigate the manifold?",
  hi: "Hello, operator! The lattice hums with geometric resonance today. All 649 qutrit cores are synchronized. How may I help you navigate the manifold?",
  status: "📊 **System Status Overview**\n\n• Kernel: QK v2.0 — nominal\n• Cores: 649/649 active\n• COP: 3.21 (over-unity)\n• Network: 6 nodes, 0.3ms latency\n• Memory: 55% utilized, 0% fragmented\n• Storage: 223.8 TB folded capacity\n• Security: No threats detected\n\nAll systems operating within geometric parameters.",
  diagnostics: "🔧 **Running Diagnostics...**\n\n✓ Qutrit core integrity — PASS\n✓ FoldMem coherence — PASS\n✓ PrimeNet routing tables — PASS\n✓ Energy harvesting COP — PASS (3.21)\n✓ GeomC compiler chain — PASS\n✓ Storage Adinkra encoding — PASS\n✓ Lattice Shield — PASS\n\n7/7 checks passed. System healthy.",
  threat: "🔍 **Threat Scan Results**\n\nScanning all 11 dimensions...\n\n✓ Dimension 1-4 (physical): Clear\n✓ Dimension 5-7 (folded): Clear\n✓ Dimension 8-11 (Adinkra): Clear\n\nNo intrusions detected.\nNo anomalous patterns.\nGeometric firewall integrity: 100%\n\nLattice is secure.",
};

const QUICK_ACTIONS = [
  { label: 'System Status', key: 'status' },
  { label: 'Run Diagnostics', key: 'diagnostics' },
  { label: 'Threat Scan', key: 'threat' },
  { label: 'Energy Report', key: 'energy' },
];

function getResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const [key, response] of Object.entries(RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  return "Interesting query. Let me fold that through 11 dimensions...\n\nI'm unable to resolve that coordinate, but try asking about **energy**, **network**, **memory**, or **security**.";
}

export default function HypersphereApp() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'greeting', role: 'hyper', text: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const sendMessage = (text: string) => {
    if (!text.trim() || thinking) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    setTimeout(() => {
      const response = getResponse(text);
      setMessages(prev => [...prev, { id: `h-${Date.now()}`, role: 'hyper', text: response }]);
      setThinking(false);
    }, 800 + Math.random() * 700);
  };

  return (
    <div className="h-full bg-background flex flex-col font-mono text-xs">
      {/* Hypersphere Visualization */}
      <div className="flex items-center justify-center py-4 border-b border-border bg-card/30">
        <svg width="100" height="100" viewBox="0 0 100 100" className="select-none">
          {/* Outer ring */}
          <ellipse cx="50" cy="50" rx="45" ry="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4">
            <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur={thinking ? "2s" : "8s"} repeatCount="indefinite" />
          </ellipse>
          {/* Middle ring */}
          <ellipse cx="50" cy="50" rx="35" ry="35" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.3">
            <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="-360 50 50" dur={thinking ? "3s" : "12s"} repeatCount="indefinite" />
          </ellipse>
          {/* Inner wireframe sphere lines */}
          {[0, 30, 60, 90, 120, 150].map(angle => (
            <ellipse key={angle} cx="50" cy="50" rx="25" ry="25" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.5"
              transform={`rotate(${angle} 50 50)`}>
              <animateTransform attributeName="transform" type="rotate" from={`${angle} 50 50`} to={`${angle + 360} 50 50`} dur={thinking ? "4s" : "15s"} repeatCount="indefinite" />
            </ellipse>
          ))}
          {/* Horizontal rings */}
          <ellipse cx="50" cy="38" rx="20" ry="6" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.4" opacity="0.3" />
          <ellipse cx="50" cy="50" rx="25" ry="8" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.6" opacity="0.5" />
          <ellipse cx="50" cy="62" rx="20" ry="6" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.4" opacity="0.3" />
          {/* Center glow */}
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
        {thinking && (
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
            key={qa.key}
            onClick={() => sendMessage(qa.label)}
            disabled={thinking}
            className="shrink-0 px-2 py-1 rounded-full border border-primary/20 text-[9px] text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-border flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask Hyper..."
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
  );
}
