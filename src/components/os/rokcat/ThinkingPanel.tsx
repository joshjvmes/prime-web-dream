import { Brain, Loader2 } from 'lucide-react';

interface AgentThought {
  agent: string;
  text: string;
  status: 'thinking' | 'done';
}

const AGENT_COLORS: Record<string, string> = {
  'Grok': '#00e5ff',
  'Harper': '#ff6b9d',
  'Benjamin': '#ffd93d',
  'Lucas': '#6bff6b',
};

export default function RokCatThinkingPanel({ thoughts }: { thoughts: AgentThought[] }) {
  return (
    <div className="border-t border-[#00e5ff]/15 bg-[#040f1e]/80 px-2 py-1.5 max-h-20 overflow-y-auto">
      <div className="flex items-center gap-1.5 mb-1">
        <Brain size={10} className="text-[#00e5ff]/60" />
        <span className="text-[9px] font-mono text-[#00e5ff]/50 uppercase tracking-widest">Multi-Agent Reasoning</span>
      </div>
      <div className="space-y-0.5">
        {thoughts.map((t, i) => {
          const color = AGENT_COLORS[t.agent] || '#00e5ff';
          return (
            <div key={`${t.agent}-${i}`} className="flex items-start gap-1.5 text-[10px] font-mono">
              <div className="flex items-center gap-1 shrink-0 min-w-[60px]">
                {t.status === 'thinking' ? (
                  <Loader2 size={8} className="animate-spin" style={{ color }} />
                ) : (
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                )}
                <span className="font-bold" style={{ color }}>{t.agent}</span>
              </div>
              <span className="text-[#e2e8f0]/50 truncate">{t.text.slice(-80) || '...'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
