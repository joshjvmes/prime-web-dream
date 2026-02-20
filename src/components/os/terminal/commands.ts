// Static command output data and the main command processor

export const WELCOME = [
  'PRIME Shell (psh) v2.0.0',
  'Geometric Computing Interface — Full Ecosystem',
  'Type "help" for available commands.',
  '',
];

export const HELP_TEXT = [
  'Available commands:',
  '  help              — Show this help',
  '  clear             — Clear terminal',
  '  echo <text>       — Echo text',
  '  sysinfo           — Display system information',
  '  qstat             — Show qutrit process states',
  '  netstat           — Show PrimeNet routing stats',
  '  flow_to <tags>    — Navigate to semantic region',
  '  fold_read <file>  — Read file from PFS',
  '  prime_dist <a> <b>— Compute prime distance',
  '  waltz <state>     — Apply Fibonacci Waltz',
  '  q3 infer <data>   — Run Q3 inference engine',
  '  q3 train          — Interactive training session',
  '  geomc <code>      — Compile with GeomC',
  '  geomc repl        — GeomC interactive REPL',
  '  foldmem stats     — Show memory stats',
  '  energy status     — Show energy harvesting status',
  '  storage info      — Show Prime Storage capacity',
  '  psh debug <proc>  — Live process inspector',
  '  primenet trace    — Packet trace mode',
  '  primenet scan [t] — Network security scanner',
  '  disk              — Interactive disk analyzer',
  '  open <app>        — Open an app window',
  '  kill <app>        — Close an app window',
  '  export VAR=val    — Set environment variable',
  '  env               — List environment variables',
  '  grep <pattern>    — Filter piped input',
  '  uptime            — System uptime',
  '  whoami            — Current user',
  '  date              — Current timestamp',
  '  history           — Show command history',
  '',
  'Operators: cmd1 | cmd2 (pipe)  cmd1 ; cmd2 (chain)',
  'Tab for autocomplete. $VAR for variable substitution.',
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

export const ALL_COMMANDS = [
  'help', 'clear', 'echo', 'sysinfo', 'qstat', 'netstat',
  'flow_to', 'fold_read', 'fold_write', 'prime_dist', 'waltz',
  'q3 infer', 'q3 train', 'geomc', 'geomc repl',
  'foldmem stats', 'energy status', 'storage info',
  'psh debug', 'primenet trace', 'primenet scan',
  'disk', 'open', 'kill', 'export', 'env', 'grep',
  'uptime', 'whoami', 'date', 'history',
];

export type CommandContext = {
  envVars: Record<string, string>;
  setEnvVars: (vars: Record<string, string>) => void;
  onOpenApp?: (app: string, title: string) => void;
  onCloseApp?: (id: string) => void;
  history?: string[];
};

const APP_MAP: Record<string, { app: string; title: string }> = {
  terminal: { app: 'terminal', title: 'Prime Shell (psh)' },
  files: { app: 'files', title: 'Prime FS' },
  processes: { app: 'processes', title: 'Processes' },
  sysinfo: { app: 'sysinfo', title: 'System Info' },
  q3inference: { app: 'q3inference', title: 'Q3 Inference' },
  q3: { app: 'q3inference', title: 'Q3 Inference' },
  primenet: { app: 'primenet', title: 'PrimeNet' },
  geomc: { app: 'geomc', title: 'GeomC Compiler' },
  foldmem: { app: 'foldmem', title: 'FoldMem' },
  storage: { app: 'storage', title: 'Prime Storage' },
  energy: { app: 'energy', title: 'Energy Monitor' },
  settings: { app: 'settings', title: 'Settings' },
};

// Boot timestamp for uptime
const BOOT_TIME = Date.now();

/** Process a single command (no pipes/chains). Returns lines or null (for clear). */
export function processCommand(cmd: string, ctx: CommandContext): string[] | null | 'mode' {
  const parts = cmd.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();
  const args = parts.slice(1).join(' ');

  switch (command) {
    case 'help':
      return HELP_TEXT;
    case 'clear':
      return null;
    case 'sysinfo':
      return SYSINFO;
    case 'echo':
      return [args || ''];
    case 'uptime': {
      const ms = Date.now() - BOOT_TIME;
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      return [`▸ up ${h}h ${m % 60}m ${s % 60}s, load average: ${(0.3 + Math.random() * 0.5).toFixed(2)}, ${(0.2 + Math.random() * 0.3).toFixed(2)}, ${(0.1 + Math.random() * 0.2).toFixed(2)}`, ''];
    }
    case 'whoami':
      return ['josh@prime-os (uid=1000, gid=100, lattice=P¹¹)', ''];
    case 'date':
      return [`${new Date().toISOString()} [QK epoch: ${Math.floor(Date.now() / 1000)}]`, ''];
    case 'history': {
      const hist = ctx.history ?? [];
      if (hist.length === 0) return ['No command history.', ''];
      return [...hist.slice(0, 20).map((h, i) => `  ${String(i + 1).padStart(3)}  ${h}`), ''];
    }
    case 'env':
      return Object.entries(ctx.envVars).length === 0
        ? ['No environment variables set.', '']
        : [...Object.entries(ctx.envVars).map(([k, v]) => `${k}=${v}`), ''];
    case 'export': {
      const match = args.match(/^([A-Za-z_]\w*)=(.*)$/);
      if (!match) return ['Usage: export VAR=value'];
      ctx.setEnvVars({ ...ctx.envVars, [match[1]]: match[2] });
      return [`${match[1]}=${match[2]}`, ''];
    }
    case 'grep':
      return ['grep: requires piped input (e.g., qstat | grep engine)', ''];
    case 'open': {
      const target = parts[1]?.toLowerCase();
      const mapped = target ? APP_MAP[target] : null;
      if (!mapped) return [`open: unknown app "${target}". Available: ${Object.keys(APP_MAP).join(', ')}`, ''];
      ctx.onOpenApp?.(mapped.app, mapped.title);
      return [`▸ Opened ${mapped.title}`, ''];
    }
    case 'kill': {
      const target = parts[1]?.toLowerCase();
      const mapped = target ? APP_MAP[target] : null;
      if (!mapped) return [`kill: unknown app "${target}".`, ''];
      ctx.onCloseApp?.(mapped.app);
      return [`▸ Closed ${mapped.title}`, ''];
    }
    case 'disk':
      return 'mode';
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
    case 'fold_write':
      if (!args) return ['Usage: fold_write <file_tags>'];
      return [
        `▸ Writing to semantic coordinate ⟨${args}⟩...`,
        `▸ Folding data 4D → 11D...`,
        `▸ Written successfully.`,
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
      if (parts[1] === 'train') return 'mode';
      if (parts[1] === 'infer') {
        const data = parts.slice(2).join(' ') || '42,17,89';
        return [
          `▸ Q3 Inference Engine v1.0`,
          `▸ Input: [${data}]`,
          `▸ Encoding to qutrits: ${data.split(',').map(v => `|${parseInt(v) % 3}⟩`).join(' ')}`,
          `▸ Mapping to 11D prime coordinates...`,
          `▸ Flowing to attractor...`,
          `▸ Classification: Geometric (confidence: ${(94 + Math.random() * 5).toFixed(1)}%)`,
          `▸ Time: ${(480 + Math.random() * 50).toFixed(0)}μs | Ops: 3 (vs 9,664 FLOPs)`,
          `▸ Energy reduction: 3,221×`,
          '',
        ];
      }
      return ['Usage: q3 infer <data> | q3 train'];
    case 'psh':
      if (parts[1] === 'debug') return 'mode';
      return [`psh: unknown subcommand "${parts[1]}"`, ''];
    case 'primenet':
      if (parts[1] === 'trace') return 'mode';
      if (parts[1] === 'scan') return 'mode';
      return [`primenet: unknown subcommand "${parts[1]}"`, ''];
    case 'netstat':
      return [
        '┌─ PrimeNet Status ─────────────────────────┐',
        '│ Routing:    O(1) Geodesic                  │',
        '│ Nodes:      6 active                       │',
        `│ Throughput: ${Math.floor(100 + Math.random() * 200)} packets/s           │`,
        '│ Decision↓:  99% vs Dijkstra                │',
        '│ Speedup:    3.4× routing, 2.1× throughput  │',
        '│ Latency:    0.3ms avg geodesic              │',
        '└─────────────────────────────────────────────┘',
        '',
      ];
    case 'geomc':
      if (parts[1] === 'repl') return 'mode';
      {
        const src = args || 'a = 2 + 3';
        return [
          `▸ GeomC Compiler v1.0`,
          `▸ Source: ${src}`,
          `▸ Phase: Parse → 11D Map → Fold → Emit`,
          `▸ Output: ${src.includes('+') ? src.replace(/(\d+)\s*\+\s*(\d+)/, (_, a, b) => String(Number(a) + Number(b))) : 'geometric_fold(...)'}`,
          `▸ Compile time: ${(3 + Math.random() * 7).toFixed(1)}ms`,
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
}
