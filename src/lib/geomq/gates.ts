// GeomQ Ternary Quantum Gate Simulation

export interface QutritState {
  probs: [number, number, number]; // probability amplitudes for |0>, |1>, |2>
}

export function createQutrit(state: 0 | 1 | 2): QutritState {
  const probs: [number, number, number] = [0, 0, 0];
  probs[state] = 1;
  return { probs };
}

// HADAMARD: creates uniform superposition
export function hadamard(q: QutritState): QutritState {
  const inv = 1 / Math.sqrt(3);
  return {
    probs: [
      Math.abs(q.probs[0] * inv + q.probs[1] * inv + q.probs[2] * inv),
      Math.abs(q.probs[0] * inv + q.probs[1] * Math.cos(2 * Math.PI / 3) * inv + q.probs[2] * Math.cos(4 * Math.PI / 3) * inv),
      Math.abs(q.probs[0] * inv + q.probs[1] * Math.cos(4 * Math.PI / 3) * inv + q.probs[2] * Math.cos(2 * Math.PI / 3) * inv),
    ],
  };
}

// PHASE: rotates the phase of states
export function phase(q: QutritState): QutritState {
  return {
    probs: [q.probs[0], q.probs[2], q.probs[1]],
  };
}

// CNOT: controlled-NOT (ternary version: adds control to target mod 3)
export function cnot(control: QutritState, target: QutritState): [QutritState, QutritState] {
  // Simplified: if control is mostly in state k, shift target by k mod 3
  const controlState = measure(control);
  const newProbs: [number, number, number] = [0, 0, 0];
  for (let t = 0; t < 3; t++) {
    const shifted = (t + controlState) % 3;
    newProbs[shifted] += target.probs[t];
  }
  return [control, { probs: newProbs }];
}

// SHIFT: cyclically shifts |0>->|1>->|2>->|0>
export function shift(q: QutritState): QutritState {
  return { probs: [q.probs[2], q.probs[0], q.probs[1]] };
}

// MEASURE: collapse to classical value
export function measure(q: QutritState): 0 | 1 | 2 {
  // Normalize
  const total = q.probs[0] + q.probs[1] + q.probs[2];
  if (total === 0) return 0;
  const norm = q.probs.map(p => p / total);
  const r = Math.random();
  if (r < norm[0]) return 0;
  if (r < norm[0] + norm[1]) return 1;
  return 2;
}

export const GATES: Record<string, (q: QutritState) => QutritState> = {
  HADAMARD: hadamard,
  PHASE: phase,
  SHIFT: shift,
  NOT: (q) => ({ probs: [q.probs[2], q.probs[1], q.probs[0]] }),
  IDENTITY: (q) => ({ probs: [...q.probs] }),
};

export const DUAL_GATES: Record<string, (a: QutritState, b: QutritState) => [QutritState, QutritState]> = {
  CNOT: cnot,
  SWAP: (a, b) => [b, a],
};
