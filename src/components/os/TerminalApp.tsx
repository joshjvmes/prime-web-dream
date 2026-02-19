import { useState, useRef, useEffect, useCallback } from 'react';

const WELCOME = [
  'PRIME Shell (psh) v1.0.0',
  'Geometric Computing Interface',
  'Type "help" for available commands.',
  '',
];

const HELP_TEXT = [
  'Available commands:',
  '  help              — Show this help',
  '  flow_to <tags>    — Navigate to semantic region',
  '  fold_read <file>  — Read file from PFS',
  '  qstat             — Show qutrit process states',
  '  sysinfo           — Display system information',
  '  prime_dist <a> <b>— Compute prime distance',
  '  waltz <state>     — Apply Fibonacci Waltz',
  '  clear             — Clear terminal',
  '  echo <text>       — Echo text',
  '',
];

const SYSINFO = [
  '┌─ PRIME OS System Information ─────────────┐',
  '│ Kernel:    Qutrit Kernel (QK) v1.0         │',
  '│ Arch:      T3-649 (649 qutrit cores)       │',
  '│ Memory:    11D → 4D Folded (Adinkra)       │',
  '│ Scheduler: Fibonacci Waltz (FWS)           │',
  '│ FileSystem: PFS (Prime File System)         │',
  '│ Network:   PrimeNet Geometric Routing       │',
  '│ Logic:     Ternary (|0⟩, |1⟩, |2⟩)         │',
  '│ Compress:  75% Adinkra folding ratio        │',
  '└─────────────────────────────────────────────┘',
  '',
];

export default function TerminalApp() {
  const [lines, setLines] = useState<string[]>([...WELCOME]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const processCommand = useCallback((cmd: string) => {
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1).join(' ');

    switch (command) {
      case 'help':
        return HELP_TEXT;
      case 'clear':
        setLines([]);
        return null;
      case 'sysinfo':
        return SYSINFO;
      case 'echo':
        return [args || ''];
      case 'qstat':
        return [
          'QUTRIT PROCESS TABLE',
          '─────────────────────────────────────────────',
          'COORD          STATE    NAME           CPU',
          '⟨2,3,5,...⟩    |1⟩ ◈    qk-scheduler   12%',
          '⟨7,11,13,...⟩  |1⟩ ◈    pfs-daemon      4%',
          '⟨17,19,23,...⟩ |2⟩ ◇    net-flow        0%',
          '⟨29,31,37,...⟩ |0⟩ ◆    gc-evaporator   1%',
          '⟨41,43,47,...⟩ |1⟩ ◈    gfo-handler     8%',
          '',
          'States: |0⟩=Past ◆  |1⟩=Present ◈  |2⟩=Future ◇',
          '',
        ];
      case 'flow_to':
        if (!args) return ['Usage: flow_to <semantic,tags>'];
        return [
          `▸ Computing prime coordinate for ⟨${args}⟩...`,
          `▸ Geodesic found: 3 hops via prime lattice`,
          `▸ Flowed to region: ${args}`,
          '',
        ];
      case 'fold_read':
        if (!args) return ['Usage: fold_read <file_tags>'];
        return [
          `▸ Resolving semantic coordinate ⟨${args}⟩...`,
          `▸ Unfolding data from 11D → 4D...`,
          `▸ Content (${Math.floor(Math.random() * 1000 + 100)} qutrits):`,
          `  [geometric data stream — rendered in Prime C format]`,
          '',
        ];
      case 'prime_dist':
        return [
          `▸ d(A, B) = ${(Math.random() * 100).toFixed(3)} prime units`,
          `▸ Geodesic hops: ${Math.floor(Math.random() * 5 + 1)}`,
          '',
        ];
      case 'waltz': {
        const st = parseInt(parts[1]) || 0;
        const next = (2 * 1 - st) % 3;
        return [
          `▸ Current state: |${st}⟩`,
          `▸ Fibonacci Waltz: |ψ_next⟩ = 2·|ψ_curr⟩ − |ψ_prev⟩ (mod 3)`,
          `▸ Next state: |${Math.abs(next)}⟩`,
          '',
        ];
      }
      default:
        if (!command) return null;
        return [`psh: command not found: ${command}`, 'Type "help" for available commands.', ''];
    }
  }, []);

  const handleSubmit = () => {
    const cmd = input.trim();
    if (!cmd) {
      setLines(prev => [...prev, 'psh ▸ ', '']);
      return;
    }
    setHistory(prev => [cmd, ...prev]);
    setHistIdx(-1);
    const output = processCommand(cmd);
    if (output !== null) {
      setLines(prev => [...prev, `psh ▸ ${cmd}`, ...output]);
    } else {
      // clear was called
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
    }
  };

  return (
    <div
      className="h-full bg-background p-3 font-mono text-xs overflow-y-auto cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          className={
            line.startsWith('psh ▸')
              ? 'text-primary'
              : line.startsWith('▸')
              ? 'text-prime-cyan'
              : line.startsWith('┌') || line.startsWith('│') || line.startsWith('└') || line.startsWith('─')
              ? 'text-prime-amber'
              : 'text-card-foreground'
          }
        >
          {line || '\u00A0'}
        </div>
      ))}
      <div className="flex items-center">
        <span className="text-primary mr-1">psh ▸</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-foreground caret-primary"
          autoFocus
          spellCheck={false}
        />
      </div>
      <div ref={endRef} />
    </div>
  );
}
