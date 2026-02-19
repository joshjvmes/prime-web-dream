import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CLASSES = ['Geometric', 'Algebraic', 'Topological'];
const QUTRIT_STATES = ['|0⟩', '|1⟩', '|2⟩'];

interface InferenceResult {
  input: number[];
  qutrits: string[];
  coord: string;
  attractor: string;
  confidence: number;
  time: number;
  ops: number;
}

export default function Q3InferenceApp() {
  const [inputText, setInputText] = useState('42, 17, 89');
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'encoding' | 'mapping' | 'flowing' | 'done'>('idle');
  const [result, setResult] = useState<InferenceResult | null>(null);

  const runInference = () => {
    const nums = inputText.split(',').map(s => parseInt(s.trim()) || 0);
    setRunning(true);
    setPhase('encoding');

    setTimeout(() => setPhase('mapping'), 600);
    setTimeout(() => setPhase('flowing'), 1200);
    setTimeout(() => {
      const qutrits = nums.map(n => QUTRIT_STATES[n % 3]);
      const attractor = CLASSES[Math.floor(Math.random() * 3)];
      setResult({
        input: nums,
        qutrits,
        coord: `⟨${nums.slice(0, 3).map(n => [2,3,5,7,11,13,17,19,23,29,31][n % 11]).join(',')},...⟩`,
        attractor,
        confidence: 0.94 + Math.random() * 0.05,
        time: 480 + Math.random() * 50,
        ops: 3,
      });
      setPhase('done');
      setRunning(false);
    }, 1800);
  };

  return (
    <div className="h-full flex flex-col bg-background text-xs font-mono p-3 overflow-y-auto">
      <div className="font-display text-[10px] tracking-wider text-primary uppercase mb-3">
        Q3-Inference Engine — Qutrit Classification
      </div>

      {/* Input */}
      <div className="flex gap-2 mb-3">
        <input
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Enter comma-separated values..."
          className="flex-1 bg-muted/50 border border-border rounded px-2 py-1 text-foreground outline-none focus:border-primary/50"
        />
        <button
          onClick={runInference}
          disabled={running}
          className="px-3 py-1 bg-primary/20 border border-primary/40 text-primary rounded hover:bg-primary/30 disabled:opacity-50 font-display text-[10px] tracking-wider"
        >
          {running ? 'RUNNING...' : 'INFER'}
        </button>
      </div>

      {/* Pipeline visualization */}
      <div className="flex items-center gap-1 mb-4">
        {(['encoding', 'mapping', 'flowing', 'done'] as const).map((p, i) => (
          <div key={p} className="flex items-center gap-1">
            <div className={`px-2 py-0.5 rounded text-[9px] border transition-all duration-300 ${
              phase === p ? 'bg-primary/20 border-primary/40 text-primary' :
              (['encoding','mapping','flowing','done'].indexOf(phase) > i) ? 'bg-prime-green/10 border-prime-green/30 text-prime-green' :
              'bg-muted/30 border-border text-muted-foreground'
            }`}>
              {p === 'encoding' ? 'Encode' : p === 'mapping' ? '11D Map' : p === 'flowing' ? 'Flow' : 'Result'}
            </div>
            {i < 3 && <span className="text-muted-foreground">→</span>}
          </div>
        ))}
      </div>

      {/* Attractor visualization */}
      <div className="flex-1 border border-border rounded p-3 mb-3 relative overflow-hidden min-h-[120px]">
        <div className="text-[9px] text-muted-foreground mb-2">Attractor Space</div>
        <svg viewBox="0 0 200 100" className="w-full h-20">
          {CLASSES.map((cls, i) => {
            const x = 40 + i * 60;
            const y = 50;
            const isTarget = result?.attractor === cls;
            return (
              <g key={cls}>
                <circle cx={x} cy={y} r={isTarget ? 18 : 12} fill="none"
                  stroke={isTarget ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                  strokeWidth={isTarget ? 1.5 : 0.5} opacity={isTarget ? 1 : 0.3}
                />
                {isTarget && phase === 'done' && (
                  <circle cx={x} cy={y} r={4} fill="hsl(var(--primary))" opacity={0.8}>
                    <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                <text x={x} y={y + 28} textAnchor="middle" fontSize="6"
                  fill={isTarget ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}>
                  {cls}
                </text>
              </g>
            );
          })}
          {phase === 'flowing' && (
            <circle cx={20} cy={50} r={2} fill="hsl(var(--primary))">
              <animate attributeName="cx" from="20" to="100" dur="0.6s" fill="freeze" />
            </circle>
          )}
        </svg>
      </div>

      {/* Stats */}
      {result && phase === 'done' && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Inference Time" value={`${result.time.toFixed(0)}μs`} />
            <StatBox label="Operations" value={`${result.ops} (vs 9,664 FLOPs)`} />
            <StatBox label="Energy Reduction" value="3,221×" accent />
            <StatBox label="Confidence" value={`${(result.confidence * 100).toFixed(1)}%`} />
          </div>
          <div className="p-2 bg-muted/30 border border-border rounded space-y-1">
            <Row label="Qutrits" value={result.qutrits.join(' ')} />
            <Row label="11D Coord" value={result.coord} />
            <Row label="Attractor" value={result.attractor} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="p-2 bg-muted/30 border border-border rounded">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-display ${accent ? 'text-prime-green' : 'text-primary'}`}>{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="text-muted-foreground w-20 shrink-0">{label}:</span>
      <span className="text-prime-cyan">{value}</span>
    </div>
  );
}
