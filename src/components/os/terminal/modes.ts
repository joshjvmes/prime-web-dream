// Interactive modal session handlers

export type TerminalMode = 'normal' | 'q3-train' | 'debug' | 'geomc-repl' | 'trace';

export interface ModeState {
  mode: TerminalMode;
  // q3-train
  trainSamples: number;
  trainCorrect: number;
  trainTarget: number;
  // geomc-repl
  replVars: Record<string, number>;
  // debug
  debugProcess: string;
  debugInterval: ReturnType<typeof setInterval> | null;
  // trace
  traceInterval: ReturnType<typeof setInterval> | null;
}

export const initialModeState: ModeState = {
  mode: 'normal',
  trainSamples: 0,
  trainCorrect: 0,
  trainTarget: 0,
  replVars: {},
  debugProcess: '',
  debugInterval: null,
  traceInterval: null,
};

export function getPrompt(mode: TerminalMode): string {
  switch (mode) {
    case 'q3-train': return 'q3-train ▸';
    case 'debug': return 'debug ▸';
    case 'geomc-repl': return 'geomc ▸';
    case 'trace': return 'trace ▸';
    default: return 'psh ▸';
  }
}

// --- Q3 Train Mode ---
export function enterQ3Train(): { lines: string[]; state: Partial<ModeState> } {
  const target = Math.floor(Math.random() * 50 + 20);
  return {
    lines: [
      '▸ Q3 Interactive Training Session',
      `▸ Target: classify ${target} qutrit samples`,
      '▸ Enter a number (0-100) for each sample. Type "done" to finish.',
      '',
    ],
    state: { mode: 'q3-train', trainSamples: 0, trainCorrect: 0, trainTarget: target },
  };
}

export function handleQ3TrainInput(input: string, state: ModeState): { lines: string[]; state: Partial<ModeState>; exit?: boolean } {
  if (input.toLowerCase() === 'done') {
    const acc = state.trainSamples > 0 ? ((state.trainCorrect / state.trainSamples) * 100).toFixed(1) : '0.0';
    return {
      lines: [
        '',
        '═══ Training Summary ═══',
        `▸ Samples processed: ${state.trainSamples}`,
        `▸ Correct: ${state.trainCorrect}`,
        `▸ Accuracy: ${acc}%`,
        `▸ Loss: ${(1 - state.trainCorrect / Math.max(state.trainSamples, 1)).toFixed(4)}`,
        '▸ Session ended.',
        '',
      ],
      state: { mode: 'normal' },
      exit: true,
    };
  }
  const val = parseInt(input);
  if (isNaN(val)) return { lines: ['▸ Enter a number (0-100) or "done".'], state: {} };
  const qutrit = val % 3;
  const correct = Math.random() > 0.25;
  const newSamples = state.trainSamples + 1;
  const newCorrect = state.trainCorrect + (correct ? 1 : 0);
  const acc = ((newCorrect / newSamples) * 100).toFixed(1);
  return {
    lines: [
      `  sample ${newSamples}: input=${val} → |${qutrit}⟩ → ${correct ? '✓ correct' : '✗ misclassified'}  [acc: ${acc}%  loss: ${(1 - newCorrect / newSamples).toFixed(4)}]`,
    ],
    state: { trainSamples: newSamples, trainCorrect: newCorrect },
  };
}

// --- Debug Mode ---
const PROCESS_NAMES = ['qk-scheduler', 'pfs-daemon', 'net-flow', 'gc-evaporator', 'gfo-handler', 'q3-engine', 'energy-harv'];
const STATES = ['|0⟩', '|1⟩', '|2⟩'];

export function enterDebug(processName: string): { lines: string[]; state: Partial<ModeState> } {
  const proc = processName || PROCESS_NAMES[Math.floor(Math.random() * PROCESS_NAMES.length)];
  return {
    lines: [
      `▸ Attaching to process: ${proc}`,
      '▸ Streaming state transitions... (type "detach" to exit)',
      '',
    ],
    state: { mode: 'debug', debugProcess: proc },
  };
}

export function generateDebugLine(process: string): string {
  const from = STATES[Math.floor(Math.random() * 3)];
  const to = STATES[Math.floor(Math.random() * 3)];
  const ts = new Date().toISOString().split('T')[1].slice(0, 12);
  return `  [${ts}] ${process}: ${from} → ${to}  (ΔE=${(Math.random() * 2 - 1).toFixed(3)})`;
}

// --- GeomC REPL ---
export function enterGeomcRepl(): { lines: string[]; state: Partial<ModeState> } {
  return {
    lines: [
      '▸ GeomC REPL v1.0 — Interactive Geometric Compiler',
      '▸ Type expressions to evaluate. Variables persist. ".exit" to leave.',
      '',
    ],
    state: { mode: 'geomc-repl', replVars: {} },
  };
}

export function handleGeomcReplInput(input: string, vars: Record<string, number>): { lines: string[]; vars: Record<string, number>; exit?: boolean } {
  if (input === '.exit') {
    return { lines: ['▸ REPL session ended.', ''], vars, exit: true };
  }
  // Simple assignment: x = expr
  const assignMatch = input.match(/^([a-z_]\w*)\s*=\s*(.+)$/i);
  if (assignMatch) {
    const name = assignMatch[1];
    const exprResult = evalSimpleExpr(assignMatch[2], vars);
    if (exprResult.error) return { lines: [`  error: ${exprResult.error}`], vars };
    const newVars = { ...vars, [name]: exprResult.value! };
    return { lines: [`  ${name} = ${exprResult.value}  (folded: ${(exprResult.value! * 0.67).toFixed(2)} geometric units)`], vars: newVars };
  }
  // Expression evaluation
  const result = evalSimpleExpr(input, vars);
  if (result.error) return { lines: [`  error: ${result.error}`], vars };
  return { lines: [`  → ${result.value}  (${(3 + Math.random() * 5).toFixed(1)}ms compile)`], vars };
}

function evalSimpleExpr(expr: string, vars: Record<string, number>): { value?: number; error?: string } {
  try {
    // Replace variable references
    let resolved = expr;
    for (const [k, v] of Object.entries(vars)) {
      resolved = resolved.replace(new RegExp(`\\b${k}\\b`, 'g'), String(v));
    }
    // Only allow numbers and basic operators
    if (!/^[\d\s+\-*/().]+$/.test(resolved)) return { error: 'invalid expression' };
    const value = Function(`"use strict"; return (${resolved})`)() as number;
    if (typeof value !== 'number' || isNaN(value)) return { error: 'NaN result' };
    return { value };
  } catch {
    return { error: 'parse error' };
  }
}

// --- Trace Mode ---
const COORDS = ['⟨2,3,5⟩', '⟨7,11,13⟩', '⟨17,19,23⟩', '⟨29,31,37⟩', '⟨41,43,47⟩', '⟨53,59,61⟩'];
const PROTOCOLS = ['FLOW', 'SYNC', 'FOLD', 'GEOD'];

export function enterTrace(): { lines: string[]; state: Partial<ModeState> } {
  return {
    lines: [
      '▸ PrimeNet Packet Trace — Live',
      '▸ Type "stop" to end trace.',
      '',
    ],
    state: { mode: 'trace' },
  };
}

export function generateTraceLine(): string {
  const src = COORDS[Math.floor(Math.random() * COORDS.length)];
  const dst = COORDS[Math.floor(Math.random() * COORDS.length)];
  const proto = PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)];
  const size = Math.floor(Math.random() * 2048 + 64);
  const ts = new Date().toISOString().split('T')[1].slice(0, 12);
  return `  [${ts}] ${proto} ${src} → ${dst}  ${size}q  ttl=${Math.floor(Math.random() * 8 + 1)}`;
}
