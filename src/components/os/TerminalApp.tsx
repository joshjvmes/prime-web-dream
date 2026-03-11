import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WELCOME, ALL_COMMANDS, type CommandContext } from './terminal/commands';
import { executeWithPipesAndChains } from './terminal/pipes';
import {
  type TerminalMode, type ModeState, initialModeState, getPrompt,
  enterQ3Train, handleQ3TrainInput,
  enterDebug, generateDebugLine,
  enterGeomcRepl, handleGeomcReplInput,
  enterTrace, generateTraceLine,
  enterScan, generateScanLine,
  enterDisk, handleDiskInput,
} from './terminal/modes';

interface TerminalAppProps {
  onOpenApp?: (app: string, title: string) => void;
  onCloseApp?: (id: string) => void;
  isFirstOpen?: boolean;
}

export default function TerminalApp({ onOpenApp, onCloseApp, isFirstOpen }: TerminalAppProps) {
  const [lines, setLines] = useState<string[]>([...WELCOME]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [modeState, setModeState] = useState<ModeState>({ ...initialModeState });
  const [outputQueue, setOutputQueue] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [tabSuggestions, setTabSuggestions] = useState<string[] | null>(null);
  const [aiStreaming, setAiStreaming] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, tabSuggestions]);

  // Typewriter output queue
  useEffect(() => {
    if (outputQueue.length === 0) {
      if (isStreaming) setIsStreaming(false);
      return;
    }
    setIsStreaming(true);
    const timer = setTimeout(() => {
      setLines(prev => [...prev, outputQueue[0]]);
      setOutputQueue(prev => prev.slice(1));
    }, 30);
    return () => clearTimeout(timer);
  }, [outputQueue, isStreaming]);

  // Cleanup streaming intervals on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // AI streaming helper
  const streamAiResponse = useCallback(async (prompt: string, systemNote?: string) => {
    setAiStreaming(true);
    setLines(prev => [...prev, '▸ Hyper is thinking...']);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || apiKey;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const userMessage = systemNote
        ? `${systemNote}\n\nUser: ${prompt}`
        : prompt;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/hyper-chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': apiKey, 'Authorization': `Bearer ${authToken}` },
          body: JSON.stringify({ messages: [{ role: 'user', content: userMessage }] }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (!res.ok) throw new Error('AI unavailable');

      // Remove the "thinking" line
      setLines(prev => prev.slice(0, -1));

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let currentLine = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
          try {
            const json = JSON.parse(line.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              for (const char of delta) {
                if (char === '\n') {
                  const finalLine = currentLine;
                  setLines(prev => [...prev, `  ${finalLine}`]);
                  currentLine = '';
                } else {
                  currentLine += char;
                }
              }
            }
          } catch {}
        }
      }
      if (currentLine) {
        const finalLine = currentLine;
        setLines(prev => [...prev, `  ${finalLine}`]);
      }
      setLines(prev => [...prev, '']);
    } catch {
      setLines(prev => {
        const cleaned = prev[prev.length - 1] === '▸ Hyper is thinking...' ? prev.slice(0, -1) : prev;
        return [...cleaned, '  [Hyper unavailable — lattice connection timeout]', ''];
      });
    } finally {
      setAiStreaming(false);
    }
  }, []);

  // AI greeting on first terminal open
  useEffect(() => {
    if (!isFirstOpen) return;
    const name = (() => {
      try { const p = localStorage.getItem('prime-os-profile'); return p ? JSON.parse(p).name || '' : ''; } catch { return ''; }
    })();
    const h = new Date().getHours();
    const greeting = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    const prompt = `You are greeting the user in a terminal shell. It's ${greeting}. ${name ? `Their name is ${name}.` : ''} Give a warm, short (2-3 lines) personalized welcome to PRIME OS. Mention one system tip or suggestion. Stay in character as Hyper, the geometric AI. No markdown formatting.`;
    streamAiResponse(prompt);
  }, [isFirstOpen, streamAiResponse]);
  // Start/stop streaming intervals for debug, trace, and scan modes
  useEffect(() => {
    if (modeState.mode === 'debug') {
      intervalRef.current = setInterval(() => {
        setLines(prev => [...prev, generateDebugLine(modeState.debugProcess)]);
      }, 800);
    } else if (modeState.mode === 'trace') {
      intervalRef.current = setInterval(() => {
        setLines(prev => [...prev, generateTraceLine()]);
      }, 500);
    } else if (modeState.mode === 'scan') {
      let progress = modeState.scanProgress;
      intervalRef.current = setInterval(() => {
        const result = generateScanLine(modeState.scanTarget, progress);
        setLines(prev => [...prev, result.line]);
        progress = result.progress;
        if (result.done) {
          setModeState(prev => ({ ...prev, mode: 'normal' }));
        } else {
          setModeState(prev => ({ ...prev, scanProgress: result.progress }));
        }
      }, 600);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [modeState.mode, modeState.debugProcess, modeState.scanTarget, modeState.scanProgress]);

  const ctx: CommandContext = {
    envVars,
    setEnvVars,
    onOpenApp,
    onCloseApp,
    history,
  };

  const enterMode = useCallback((rawCmd: string) => {
    const parts = rawCmd.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();

    if (cmd === 'q3' && parts[1] === 'train') {
      const r = enterQ3Train();
      setOutputQueue(r.lines);
      setModeState(prev => ({ ...prev, ...r.state }));
    } else if (cmd === 'psh' && parts[1] === 'debug') {
      const r = enterDebug(parts.slice(2).join(' '));
      setOutputQueue(r.lines);
      setModeState(prev => ({ ...prev, ...r.state }));
    } else if (cmd === 'geomc' && parts[1] === 'repl') {
      const r = enterGeomcRepl();
      setOutputQueue(r.lines);
      setModeState(prev => ({ ...prev, ...r.state }));
    } else if (cmd === 'primenet' && parts[1] === 'trace') {
      const r = enterTrace();
      setOutputQueue(r.lines);
      setModeState(prev => ({ ...prev, ...r.state }));
    } else if (cmd === 'primenet' && parts[1] === 'scan') {
      const r = enterScan(parts[2]);
      setOutputQueue(r.lines);
      setModeState(prev => ({ ...prev, ...r.state }));
    } else if (cmd === 'disk') {
      const r = enterDisk();
      setOutputQueue(r.lines);
      setModeState(prev => ({ ...prev, ...r.state }));
    }
  }, []);

  const handleModeInput = useCallback((cmd: string) => {
    const prompt = getPrompt(modeState.mode);
    setLines(prev => [...prev, `${prompt} ${cmd}`]);

    switch (modeState.mode) {
      case 'q3-train': {
        const r = handleQ3TrainInput(cmd, modeState);
        setOutputQueue(r.lines);
        setModeState(prev => ({ ...prev, ...r.state }));
        break;
      }
      case 'debug': {
        if (cmd.toLowerCase() === 'detach') {
          setModeState(prev => ({ ...prev, mode: 'normal' }));
          setLines(prev => [...prev, '▸ Detached.', '']);
        }
        break;
      }
      case 'geomc-repl': {
        const r = handleGeomcReplInput(cmd, modeState.replVars);
        setOutputQueue(r.lines);
        if (r.exit) {
          setModeState(prev => ({ ...prev, mode: 'normal' }));
        } else {
          setModeState(prev => ({ ...prev, replVars: r.vars }));
        }
        break;
      }
      case 'trace': {
        if (cmd.toLowerCase() === 'stop') {
          setModeState(prev => ({ ...prev, mode: 'normal' }));
          setLines(prev => [...prev, '▸ Trace stopped.', '']);
        }
        break;
      }
      case 'scan': {
        if (cmd.toLowerCase() === 'stop') {
          setModeState(prev => ({ ...prev, mode: 'normal' }));
          setLines(prev => [...prev, '▸ Scan aborted.', '']);
        }
        break;
      }
      case 'disk': {
        const r = handleDiskInput(cmd);
        setOutputQueue(r.lines);
        if (r.exit) {
          setModeState(prev => ({ ...prev, mode: 'normal' }));
        }
        break;
      }
    }
  }, [modeState]);

  const handleSubmit = useCallback(() => {
    const cmd = input.trim();
    setTabSuggestions(null);

    if (!cmd) {
      setLines(prev => [...prev, `${getPrompt(modeState.mode)} `, '']);
      setInput('');
      return;
    }

    setHistory(prev => [cmd, ...prev]);
    setHistIdx(-1);

    if (modeState.mode !== 'normal') {
      handleModeInput(cmd);
      setInput('');
      return;
    }

    // Normal mode
    setLines(prev => [...prev, `psh ▸ ${cmd}`]);
    const result = executeWithPipesAndChains(cmd, ctx);

    if (result.clear) {
      setLines([]);
    }

    if (result.enterMode) {
      const parts = result.enterMode.trim().split(/\s+/);
      if (parts[0]?.toLowerCase() === 'ask') {
        // AI ask command
        const question = parts.slice(1).join(' ');
        if (question) {
          streamAiResponse(question, 'The user is asking a question from the PRIME OS terminal shell. Answer concisely. No markdown formatting, plain text only.');
        }
      } else if (parts[0] === '__chat__') {
        // Chat fallback — unknown command treated as natural language
        const chatText = parts.slice(1).join(' ');
        if (chatText) {
          streamAiResponse(chatText, 'You are ROKCAT / Hyper, the AI assistant inside the PRIME OS terminal shell. The user typed something that is not a recognized command — treat it as natural conversation. Be helpful, concise (2-3 lines), and stay in character. No markdown formatting, plain text only.');
        }
      } else {
        enterMode(result.enterMode);
      }
    }

    if (result.output.length > 0) {
      if (result.output.length > 4) {
        setOutputQueue(result.output);
      } else {
        setLines(prev => [...prev, ...result.output]);
      }
    }

    setInput('');
  }, [input, modeState, ctx, handleModeInput, enterMode]);

  const handleTab = useCallback(() => {
    if (modeState.mode !== 'normal') return;
    const val = input.trim().toLowerCase();
    if (!val) return;

    const matches = ALL_COMMANDS.filter(c => c.startsWith(val));
    if (matches.length === 1) {
      setInput(matches[0] + ' ');
      setTabSuggestions(null);
    } else if (matches.length > 1) {
      setTabSuggestions(matches);
    }
  }, [input, modeState.mode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTab();
      return;
    }
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const idx = Math.min(histIdx + 1, history.length - 1);
        setHistIdx(idx);
        setInput(history[idx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx > 0) {
        setHistIdx(histIdx - 1);
        setInput(history[histIdx - 1]);
      } else {
        setHistIdx(-1);
        setInput('');
      }
    } else {
      setTabSuggestions(null);
    }
  };

  const prompt = getPrompt(modeState.mode);

  return (
    <div
      className="h-full bg-background p-3 font-mono text-xs overflow-y-auto cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          className={
            line.startsWith('psh ▸') || line.startsWith('q3-train ▸') || line.startsWith('debug ▸') || line.startsWith('geomc ▸') || line.startsWith('trace ▸') || line.startsWith('scan ▸') || line.startsWith('disk ▸')
              ? 'text-primary'
              : line.startsWith('▸') || line.startsWith('═')
              ? 'text-prime-cyan'
              : line.startsWith('┌') || line.startsWith('│') || line.startsWith('└') || line.startsWith('─')
              ? 'text-prime-amber'
              : line.includes('✓')
              ? 'text-green-400'
              : line.includes('✗')
              ? 'text-red-400'
              : line.startsWith('  [!]')
              ? 'text-prime-amber'
              : 'text-card-foreground'
          }
        >
          {line || '\u00A0'}
        </div>
      ))}
      {tabSuggestions && (
        <div className="text-muted-foreground">
          {tabSuggestions.join('  ')}
        </div>
      )}
      <div className="flex items-center">
        <span className="text-primary mr-1">{prompt}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-foreground caret-primary"
          autoFocus
          spellCheck={false}
          disabled={isStreaming || aiStreaming}
          placeholder={aiStreaming ? 'Hyper is responding...' : ''}
        />
      </div>
      <div ref={endRef} />
    </div>
  );
}
