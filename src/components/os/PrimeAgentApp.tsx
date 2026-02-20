import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Play, Square, Loader2, CheckCircle2, AlertCircle, Terminal, Zap, Shield, Rocket } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AppType } from '@/types/os';

interface PrimeAgentAppProps {
  onOpenApp: (app: AppType, title: string) => void;
  onCloseApp: (app: string) => void;
}

type ActionType = 'open-app' | 'close-app' | 'check-status' | 'report' | 'run-command';

interface AgentAction {
  id: string;
  type: ActionType;
  label: string;
  payload?: Record<string, string>;
  status: 'pending' | 'running' | 'done' | 'error';
  result?: string;
}

interface ChatMessage {
  role: 'user' | 'agent';
  text: string;
  timestamp: number;
}

const QUICK_COMMANDS = [
  { label: 'Full System Check', icon: <Zap size={12} />, instruction: 'Run a full system diagnostics check' },
  { label: 'Secure All', icon: <Shield size={12} />, instruction: 'Lock down all security protocols' },
  { label: 'Check Wallet', icon: <Zap size={12} />, instruction: 'Check my wallet balance' },
  { label: 'Check Markets', icon: <Zap size={12} />, instruction: 'Check current market data for top tickers' },
  { label: 'My Portfolio', icon: <Zap size={12} />, instruction: 'Show my PrimeVault portfolio' },
  { label: 'Book Resource', icon: <Rocket size={12} />, instruction: 'Book a quantum lab resource' },
  { label: 'Play Music', icon: <Rocket size={12} />, instruction: 'Play some ambient music' },
  { label: 'Send Message', icon: <Rocket size={12} />, instruction: 'Open PrimeComm to send a message' },
  { label: 'Launch Game', icon: <Rocket size={12} />, instruction: 'Launch a random arcade game' },
  { label: 'Create Mini-App', icon: <Rocket size={12} />, instruction: 'Create a new mini-app' },
  { label: 'Deploy Build', icon: <Rocket size={12} />, instruction: 'Deploy the latest build to production' },
];

const APP_TITLES: Record<string, string> = {
  terminal: 'Prime Shell (psh)', energy: 'Energy Monitor', security: 'Lattice Shield',
  sysinfo: 'System Info', processes: 'Qutrit Processes', primenet: 'PrimeNet Monitor',
  monitor: 'System Monitor', storage: 'Prime Storage', datacenter: 'LatticeCore',
  wallet: 'PrimeWallet', arcade: 'PrimeArcade', miniapps: 'Mini Apps',
  journal: 'PrimeJournal', browser: 'PrimeBrowser', calendar: 'Prime Calendar',
  signals: 'PrimeSignals', vault: 'PrimeVault', canvas: 'PrimeCanvas',
  booking: 'PrimeBooking', comm: 'PrimeComm', audio: 'PrimeAudio',
};

function parseInstruction(input: string): AgentAction[] {
  const lower = input.toLowerCase();
  const actions: AgentAction[] = [];
  const id = () => Math.random().toString(36).slice(2, 8);

  if (lower.includes('full system') || lower.includes('diagnostics') || lower.includes('check everything')) {
    actions.push(
      { id: id(), type: 'open-app', label: 'Open System Info', payload: { app: 'sysinfo', title: 'System Info' }, status: 'pending' },
      { id: id(), type: 'check-status', label: 'Run kernel diagnostics', status: 'pending' },
      { id: id(), type: 'open-app', label: 'Open Energy Monitor', payload: { app: 'energy', title: 'Energy Monitor' }, status: 'pending' },
      { id: id(), type: 'check-status', label: 'Verify energy COP levels', status: 'pending' },
      { id: id(), type: 'open-app', label: 'Open Process Manager', payload: { app: 'processes', title: 'Qutrit Processes' }, status: 'pending' },
      { id: id(), type: 'check-status', label: 'Scan qutrit process health', status: 'pending' },
      { id: id(), type: 'report', label: 'Generate diagnostics report', status: 'pending' },
    );
  } else if (lower.includes('secure') || lower.includes('security') || lower.includes('lock')) {
    actions.push(
      { id: id(), type: 'open-app', label: 'Open Security Console', payload: { app: 'security', title: 'Lattice Shield' }, status: 'pending' },
      { id: id(), type: 'run-command', label: 'Activate lattice shields', status: 'pending' },
      { id: id(), type: 'check-status', label: 'Verify firewall integrity', status: 'pending' },
      { id: id(), type: 'run-command', label: 'Rotate encryption keys', status: 'pending' },
      { id: id(), type: 'report', label: 'Security status report', status: 'pending' },
    );
  } else if (lower.includes('energy') || lower.includes('optimize') || lower.includes('power')) {
    actions.push(
      { id: id(), type: 'open-app', label: 'Open Energy Monitor', payload: { app: 'energy', title: 'Energy Monitor' }, status: 'pending' },
      { id: id(), type: 'run-command', label: 'Recalibrate COP parameters', status: 'pending' },
      { id: id(), type: 'check-status', label: 'Measure dimensional coupling', status: 'pending' },
      { id: id(), type: 'run-command', label: 'Optimize harvesting mode', status: 'pending' },
      { id: id(), type: 'report', label: 'Energy optimization report', status: 'pending' },
    );
  } else if (lower.includes('wallet') || lower.includes('balance') || lower.includes('token')) {
    actions.push(
      { id: id(), type: 'open-app', label: 'Open PrimeWallet', payload: { app: 'wallet', title: 'PrimeWallet' }, status: 'pending' },
      { id: id(), type: 'check-status', label: 'Checking OS & IX balances', status: 'pending' },
      { id: id(), type: 'report', label: 'Wallet status retrieved', status: 'pending' },
    );
  } else if (lower.includes('game') || lower.includes('arcade') || lower.includes('play game')) {
    actions.push(
      { id: id(), type: 'open-app', label: 'Open PrimeArcade', payload: { app: 'arcade', title: 'PrimeArcade' }, status: 'pending' },
      { id: id(), type: 'report', label: 'Arcade ready — earn OS tokens by playing!', status: 'pending' },
    );
  } else if (lower.includes('market') || lower.includes('stock') || lower.includes('price') || lower.includes('ticker')) {
    actions.push(
      { id: id(), type: 'open-app', label: 'Open PrimeSignals', payload: { app: 'signals', title: 'PrimeSignals' }, status: 'pending' },
      { id: id(), type: 'check-status', label: 'Fetching live market data', status: 'pending' },
      { id: id(), type: 'report', label: 'Market data loaded', status: 'pending' },
    );
  } else if (lower.includes('portfolio') || lower.includes('holdings') || lower.includes('vault') || lower.includes('investment')) {
    actions.push(
      { id: id(), type: 'open-app', label: 'Open PrimeVault', payload: { app: 'vault', title: 'PrimeVault' }, status: 'pending' },
      { id: id(), type: 'check-status', label: 'Loading portfolio data', status: 'pending' },
      { id: id(), type: 'report', label: 'Portfolio loaded', status: 'pending' },
    );
  } else if (lower.includes('book') || lower.includes('schedule') || lower.includes('reservation')) {
    actions.push(
      { id: id(), type: 'open-app', label: 'Open PrimeBooking', payload: { app: 'booking', title: 'PrimeBooking' }, status: 'pending' },
      { id: id(), type: 'report', label: 'Booking system ready', status: 'pending' },
    );
  } else if (lower.includes('music') || lower.includes('audio') || lower.includes('play') || lower.includes('sound')) {
    actions.push(
      { id: id(), type: 'open-app', label: 'Open PrimeAudio', payload: { app: 'audio', title: 'PrimeAudio' }, status: 'pending' },
      { id: id(), type: 'report', label: 'Audio player ready', status: 'pending' },
    );
  } else if (lower.includes('message') || lower.includes('chat') || lower.includes('dm') || lower.includes('comm')) {
    actions.push(
      { id: id(), type: 'open-app', label: 'Open PrimeComm', payload: { app: 'comm', title: 'PrimeComm' }, status: 'pending' },
      { id: id(), type: 'report', label: 'Messaging ready', status: 'pending' },
    );
  } else if (lower.includes('draw') || lower.includes('canvas') || lower.includes('paint') || lower.includes('sketch')) {
    actions.push(
      { id: id(), type: 'open-app', label: 'Open PrimeCanvas', payload: { app: 'canvas', title: 'PrimeCanvas' }, status: 'pending' },
      { id: id(), type: 'report', label: 'Canvas ready', status: 'pending' },
    );
  } else if (lower.includes('mini-app') || lower.includes('miniapp') || lower.includes('create app')) {
    actions.push(
      { id: id(), type: 'open-app', label: 'Open Mini Apps', payload: { app: 'miniapps', title: 'Mini Apps' }, status: 'pending' },
      { id: id(), type: 'open-app', label: 'Open Hyper AI', payload: { app: 'hypersphere', title: 'Hyper AI' }, status: 'pending' },
      { id: id(), type: 'report', label: 'Ask Hyper AI: "Create a mini-app that..."', status: 'pending' },
    );
  } else if (lower.includes('journal') || lower.includes('publish')) {
    actions.push(
      { id: id(), type: 'open-app', label: 'Open PrimeJournal', payload: { app: 'journal', title: 'PrimeJournal' }, status: 'pending' },
      { id: id(), type: 'report', label: 'Journal ready', status: 'pending' },
    );
  } else if (lower.includes('deploy') || lower.includes('build') || lower.includes('ship')) {
    actions.push(
      { id: id(), type: 'run-command', label: 'Run pre-deploy checks', status: 'pending' },
      { id: id(), type: 'run-command', label: 'Compile GeomC modules', status: 'pending' },
      { id: id(), type: 'run-command', label: 'Fold binary to 11D', status: 'pending' },
      { id: id(), type: 'check-status', label: 'Verify deployment integrity', status: 'pending' },
      { id: id(), type: 'report', label: 'Deployment complete', status: 'pending' },
    );
  } else {
    // Try to extract app names
    const appKeys = Object.keys(APP_TITLES);
    const mentionedApps = appKeys.filter(k => lower.includes(k));
    if (mentionedApps.length > 0) {
      mentionedApps.forEach(app => {
        actions.push({ id: id(), type: 'open-app', label: `Open ${APP_TITLES[app]}`, payload: { app, title: APP_TITLES[app] }, status: 'pending' });
      });
      if (lower.includes('check') || lower.includes('status')) {
        actions.push({ id: id(), type: 'check-status', label: 'Check system status', status: 'pending' });
      }
      actions.push({ id: id(), type: 'report', label: 'Task complete', status: 'pending' });
    } else {
      actions.push(
        { id: id(), type: 'check-status', label: `Processing: "${input}"`, status: 'pending' },
        { id: id(), type: 'report', label: 'Analysis complete', status: 'pending' },
      );
    }
  }
  return actions;
}

function generateResult(action: AgentAction): string {
  switch (action.type) {
    case 'open-app': return `✓ Opened ${action.payload?.title || 'application'}`;
    case 'close-app': return `✓ Closed ${action.payload?.app || 'application'}`;
    case 'check-status': {
      const statuses = [
        'All systems nominal. COP: 3.21, cores: 649/649 active.',
        'Lattice integrity: 99.97%. No anomalies detected.',
        'Energy coupling stable at 11D. Efficiency: 92.4%.',
        'Qutrit states synchronized. No decoherence events.',
        'Network throughput: 247 packets/s. Latency: 0.3ms avg.',
        'Storage regions healthy. Compression ratio: 75.2%.',
      ];
      return statuses[Math.floor(Math.random() * statuses.length)];
    }
    case 'run-command': {
      const results = [
        '▸ Command executed successfully. Exit code: 0',
        '▸ Operation complete. 0 errors, 0 warnings.',
        '▸ Process finished in 2.4ms. All checks passed.',
        '▸ Geometric folding applied. Result verified.',
      ];
      return results[Math.floor(Math.random() * results.length)];
    }
    case 'report': return '◉ All tasks completed successfully. System operating within optimal parameters.';
    default: return '✓ Done';
  }
}

export default function PrimeAgentApp({ onOpenApp, onCloseApp }: PrimeAgentAppProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'agent', text: 'PrimeAgent v1.0 online. I am the autonomous operator for PRIME OS. Give me high-level instructions and I will execute them across the system.\n\nTry: "Run a full system diagnostics check" or use the quick commands below.', timestamp: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [taskQueue, setTaskQueue] = useState<AgentAction[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, taskQueue]);

  const executeQueue = useCallback(async (actions: AgentAction[]) => {
    setIsRunning(true);
    for (let i = 0; i < actions.length; i++) {
      setTaskQueue(prev => prev.map((a, idx) => idx === i ? { ...a, status: 'running' } : a));
      await new Promise(r => setTimeout(r, 600 + Math.random() * 800));

      if (actions[i].type === 'open-app' && actions[i].payload) {
        onOpenApp(actions[i].payload!.app as AppType, actions[i].payload!.title);
      } else if (actions[i].type === 'close-app' && actions[i].payload) {
        onCloseApp(actions[i].payload!.app);
      }

      const result = generateResult(actions[i]);
      setTaskQueue(prev => prev.map((a, idx) => idx === i ? { ...a, status: 'done', result } : a));
      setMessages(prev => [...prev, { role: 'agent', text: `[${actions[i].label}] ${result}`, timestamp: Date.now() }]);
    }
    setMessages(prev => [...prev, { role: 'agent', text: '◉ All queued tasks executed. Awaiting further instructions.', timestamp: Date.now() }]);
    setIsRunning(false);
  }, [onOpenApp, onCloseApp]);

  const handleSubmit = useCallback((instruction: string) => {
    if (!instruction.trim() || isRunning) return;
    const text = instruction.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text, timestamp: Date.now() }]);
    const actions = parseInstruction(text);
    setTaskQueue(actions);
    setMessages(prev => [...prev, { role: 'agent', text: `Understood. Breaking down into ${actions.length} tasks. Executing...`, timestamp: Date.now() }]);
    executeQueue(actions);
  }, [isRunning, executeQueue]);

  return (
    <div className="flex h-full bg-background text-foreground font-mono text-xs">
      {/* Task Queue Panel */}
      <div className="w-56 border-r border-border flex flex-col shrink-0">
        <div className="p-2 border-b border-border flex items-center gap-1.5">
          <Bot size={12} className="text-primary" />
          <span className="font-display text-[9px] tracking-widest uppercase text-primary">Task Queue</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {taskQueue.length === 0 ? (
              <p className="text-[10px] text-muted-foreground p-2">No active tasks. Send an instruction to begin.</p>
            ) : taskQueue.map((action, i) => (
              <div key={action.id} className={`flex items-start gap-1.5 p-1.5 rounded text-[10px] ${
                action.status === 'running' ? 'bg-primary/10 text-primary' :
                action.status === 'done' ? 'text-muted-foreground' : 'text-foreground'
              }`}>
                <span className="mt-0.5 shrink-0">
                  {action.status === 'pending' && <span className="text-muted-foreground">○</span>}
                  {action.status === 'running' && <Loader2 size={10} className="animate-spin text-primary" />}
                  {action.status === 'done' && <CheckCircle2 size={10} className="text-prime-green" />}
                  {action.status === 'error' && <AlertCircle size={10} className="text-destructive" />}
                </span>
                <span className="leading-tight">{action.label}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat / Action Log */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-2 border-b border-border flex items-center gap-2">
          <Terminal size={12} className="text-primary" />
          <span className="font-display text-[9px] tracking-widest uppercase text-primary">Agent Log</span>
          {isRunning && <Loader2 size={10} className="animate-spin text-primary ml-auto" />}
        </div>

        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="p-3 space-y-2">
            {messages.map((msg, i) => (
              <div key={i} className={`text-[11px] leading-relaxed ${msg.role === 'user' ? 'text-primary' : 'text-muted-foreground'}`}>
                <span className="font-bold">{msg.role === 'user' ? '▸ you' : '◈ agent'}:</span>{' '}
                <span className="whitespace-pre-wrap">{msg.text}</span>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Quick Commands */}
        <div className="px-3 py-1.5 border-t border-border/50 flex gap-1.5 flex-wrap">
          {QUICK_COMMANDS.map(cmd => (
            <button
              key={cmd.label}
              onClick={() => handleSubmit(cmd.instruction)}
              disabled={isRunning}
              className="flex items-center gap-1 px-2 py-1 rounded border border-border text-[9px] text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors disabled:opacity-40"
            >
              {cmd.icon}
              {cmd.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-2 border-t border-border flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit(input)}
            placeholder="Give the agent instructions..."
            disabled={isRunning}
            className="flex-1 bg-muted/30 border border-border rounded px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 disabled:opacity-50"
          />
          <button
            onClick={() => handleSubmit(input)}
            disabled={isRunning || !input.trim()}
            className="px-3 py-1.5 rounded bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors disabled:opacity-40 text-[10px]"
          >
            {isRunning ? <Square size={12} /> : <Play size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}
