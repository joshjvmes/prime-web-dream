import { useState, useRef, useEffect, useCallback } from 'react';

const WELCOME = [
  'PRIME Shell (psh) v2.0.0',
  'Geometric Computing Interface — Full Ecosystem',
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
  '  q3 infer <data>   — Run Q3 inference engine',
  '  netstat           — Show PrimeNet routing stats',
  '  geomc <code>      — Compile with GeomC',
  '  foldmem stats     — Show memory stats',
  '  energy status     — Show energy harvesting status',
  '  storage info      — Show Prime Storage capacity',
  '  clear             — Clear terminal',
  '  echo <text>       — Echo text',
  '',
];

const SYSINFO = [
  '┌─ PRIME OS System Information ─────────────┐',
  '│ Kernel:    Qutrit Kernel (QK) v2.0         │',
  '│ Arch:      T3-649 (649 qutrit cores)       │',
  '│ Memory:    FoldMem 11D → 4D (Adinkra)      │',
  '│ Scheduler: Fibonacci Waltz (FWS)           │',
  '│ FileSystem: AFS (Semantic Prime FS)         │',
  '│ Network:   PrimeNet Geometric Routing       │',
  '│ Compiler:  GeomC (Geometric Folding)        │',
  '│ ML Engine: Q3-Inference (Qutrit)            │',
  '│ Storage:   Infinite Database (Folded)       │',
  '│ Energy:    Over-Unity Harvesting (COP>1)    │',
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

    // Handle two-word commands
    const twoWord = `${parts[0]?.toLowerCase()} ${parts[1]?.toLowerCase()}`;

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
          '⟨53,59,61,...⟩ |1⟩ ◈    q3-engine       6%',
          '⟨67,71,73,...⟩ |2⟩ ◇    energy-harv     3%',
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
      case 'q3':
        if (parts[1] === 'infer') {
          const data = parts.slice(2).join(' ') || '42,17,89';
          return [
            `▸ Q3 Inference Engine v1.0`,
            `▸ Input: [${data}]`,
            `▸ Encoding to qutrits: ${data.split(',').map(v => `|${parseInt(v)%3}⟩`).join(' ')}`,
            `▸ Mapping to 11D prime coordinates...`,
            `▸ Flowing to attractor...`,
            `▸ Classification: Geometric (confidence: ${(94 + Math.random()*5).toFixed(1)}%)`,
            `▸ Time: ${(480 + Math.random()*50).toFixed(0)}μs | Ops: 3 (vs 9,664 FLOPs)`,
            `▸ Energy reduction: 3,221×`,
            '',
          ];
        }
        return ['Usage: q3 infer <data>'];
      case 'netstat':
        return [
          '┌─ PrimeNet Status ─────────────────────────┐',
          '│ Routing:    O(1) Geodesic                  │',
          '│ Nodes:      6 active                       │',
          `│ Throughput: ${Math.floor(100 + Math.random()*200)} packets/s           │`,
          '│ Decision↓:  99% vs Dijkstra                │',
          '│ Speedup:    3.4× routing, 2.1× throughput  │',
          '│ Latency:    0.3ms avg geodesic              │',
          '└─────────────────────────────────────────────┘',
          '',
        ];
      case 'geomc': {
        const src = args || 'a = 2 + 3';
        return [
          `▸ GeomC Compiler v1.0`,
          `▸ Source: ${src}`,
          `▸ Phase: Parse → 11D Map → Fold → Emit`,
          `▸ Output: ${src.includes('+') ? src.replace(/(\d+)\s*\+\s*(\d+)/, (_, a, b) => String(Number(a)+Number(b))) : 'geometric_fold(...)'}`,
          `▸ Compile time: ${(3 + Math.random()*7).toFixed(1)}ms`,
          `▸ Energy saved: 67%`,
          '',
        ];
      }
      case 'foldmem':
        if (parts[1] === 'stats') {
          return [
            '┌─ FoldMem Statistics ───────────────────────┐',
            '│ Alloc time:     388μs                      │',
            '│ Free time:      22μs                       │',
            '│ Fragmentation:  0% (after compact)         │',
            '│ vs malloc:      12× faster                 │',
            '│ vs jemalloc:    8× faster                  │',
            '│ Mapping:        11D folded space            │',
            '└─────────────────────────────────────────────┘',
            '',
          ];
        }
        return ['Usage: foldmem stats'];
      case 'energy':
        if (parts[1] === 'status') {
          const cop = (3.0 + Math.random() * 0.4).toFixed(2);
          return [
            '┌─ Energy Harvesting Status ─────────────────┐',
            `│ COP:          ${cop} (OVER-UNITY)            │`,
            '│ Mode:         Satellite                     │',
            '│ Input:        100W                          │',
            `│ Output:       ${Math.round(100 * parseFloat(cop))}W                         │`,
            '│ Coupling:     11D dimensional               │',
            '│ Efficiency:   92% geometric                 │',
            '│ Carnot limit: 42% (exceeded)                │',
            '└─────────────────────────────────────────────┘',
            '',
          ];
        }
        return ['Usage: energy status'];
      case 'storage':
        if (parts[1] === 'info') {
          return [
            '┌─ Prime Storage (Infinite Database) ────────┐',
            '│ Compression:   75% (Adinkra folding)        │',
            '│ Capacity:      223.8 TB (folded)             │',
            '│ Retrieval:     O(1) geometric lookup         │',
            '│ Regions:       5 active manifolds            │',
            '│ Encoding:      11D → 4D Adinkra              │',
            '│ Redundancy:    Holographic (any 4D slice)     │',
            '└─────────────────────────────────────────────┘',
            '',
          ];
        }
        return ['Usage: storage info'];
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
