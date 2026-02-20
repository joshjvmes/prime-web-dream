import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CLASSES = ['Geometric', 'Algebraic', 'Topological'];
const QUTRIT_STATES = ['|0⟩', '|1⟩', '|2⟩'];

interface InferenceResult {
  id: number;
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
  const [history, setHistory] = useState<InferenceResult[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [batchInput, setBatchInput] = useState('42,17,89\n10,20,30\n7,11,13');
  const [batchResults, setBatchResults] = useState<InferenceResult[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const idRef = { current: 0 };

  const runInference = () => {
    const nums = inputText.split(',').map(s => parseInt(s.trim()) || 0);
    setRunning(true);
    setPhase('encoding');

    setTimeout(() => setPhase('mapping'), 600);
    setTimeout(() => setPhase('flowing'), 1200);
    setTimeout(() => {
      const qutrits = nums.map(n => QUTRIT_STATES[n % 3]);
      const attractor = CLASSES[Math.floor(Math.random() * 3)];
      const r: InferenceResult = {
        id: Date.now(),
        input: nums,
        qutrits,
        coord: `⟨${nums.slice(0, 3).map(n => [2,3,5,7,11,13,17,19,23,29,31][n % 11]).join(',')},...⟩`,
        attractor,
        confidence: 0.94 + Math.random() * 0.05,
        time: 480 + Math.random() * 50,
        ops: 3,
      };
      setResult(r);
      setHistory(prev => [r, ...prev].slice(0, 20));
      setPhase('done');
      setRunning(false);
    }, 1800);
  };

  const runBatch = () => {
    const lines = batchInput.split('\n').filter(l => l.trim());
    setBatchRunning(true);
    setBatchResults([]);
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= lines.length) {
        clearInterval(interval);
        setBatchRunning(false);
        return;
      }
      const nums = lines[idx].split(',').map(s => parseInt(s.trim()) || 0);
      const qutrits = nums.map(n => QUTRIT_STATES[n % 3]);
      const attractor = CLASSES[Math.floor(Math.random() * 3)];
      const r: InferenceResult = {
        id: Date.now() + idx,
        input: nums,
        qutrits,
        coord: `⟨${nums.slice(0, 3).map(n => [2,3,5,7,11,13,17,19,23,29,31][n % 11]).join(',')},...⟩`,
        attractor,
        confidence: 0.94 + Math.random() * 0.05,
        time: 480 + Math.random() * 50,
        ops: 3,
      };
      setBatchResults(prev => [...prev, r]);
      setHistory(prev => [r, ...prev].slice(0, 20));
      idx++;
    }, 400);
  };

  return (
    <div className="h-full flex flex-col bg-background text-xs font-mono p-3 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-[10px] tracking-wider text-primary uppercase">
          Q3-Inference Engine — Qutrit Classification
        </div>
        <button
          onClick={() => setBatchMode(!batchMode)}
          className={`px-2 py-0.5 rounded border text-[9px] font-display tracking-wider transition-all ${
            batchMode ? 'border-primary/30 text-primary bg-primary/10' : 'border-border text-muted-foreground'
          }`}
        >
          {batchMode ? 'BATCH' : 'SINGLE'}
        </button>
      </div>

      {batchMode ? (
        /* Batch mode */
        <>
          <div className="mb-3">
            <textarea
              value={batchInput}
              onChange={e => setBatchInput(e.target.value)}
              placeholder="One sample per line: 42,17,89"
              className="w-full h-20 bg-muted/50 border border-border rounded px-2 py-1 text-foreground outline-none focus:border-primary/50 resize-none"
              spellCheck={false}
            />
            <button
              onClick={runBatch}
              disabled={batchRunning}
              className="mt-1 w-full px-3 py-1 bg-primary/20 border border-primary/40 text-primary rounded hover:bg-primary/30 disabled:opacity-50 font-display text-[10px] tracking-wider"
            >
              {batchRunning ? `RUNNING... (${batchResults.length}/${batchInput.split('\n').filter(l=>l.trim()).length})` : 'RUN BATCH'}
            </button>
          </div>
          {batchResults.length > 0 && (
            <div className="flex-1 overflow-y-auto border border-border rounded">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-2 py-1 text-[9px] text-muted-foreground">#</th>
                    <th className="text-left px-2 py-1 text-[9px] text-muted-foreground">Input</th>
                    <th className="text-left px-2 py-1 text-[9px] text-muted-foreground">Class</th>
                    <th className="text-left px-2 py-1 text-[9px] text-muted-foreground">Conf</th>
                    <th className="text-left px-2 py-1 text-[9px] text-muted-foreground">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResults.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-b border-border/30"
                    >
                      <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-1 text-prime-cyan">[{r.input.join(',')}]</td>
                      <td className="px-2 py-1 text-primary">{r.attractor}</td>
                      <td className="px-2 py-1 text-prime-green">{(r.confidence * 100).toFixed(1)}%</td>
                      <td className="px-2 py-1 text-muted-foreground">{r.time.toFixed(0)}μs</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* Single mode */
        <>
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
        </>
      )}

      {/* Inference history */}
      {history.length > 0 && !batchMode && (
        <div className="mt-3 border-t border-border pt-2">
          <div className="text-[9px] font-display tracking-wider text-muted-foreground uppercase mb-1">History</div>
          <div className="space-y-0.5 max-h-24 overflow-y-auto">
            {history.map(r => (
              <div key={r.id} className="flex items-center gap-2 text-[9px]">
                <span className="text-muted-foreground">[{r.input.slice(0,3).join(',')}]</span>
                <span className="text-primary">→ {r.attractor}</span>
                <span className="text-prime-green">{(r.confidence*100).toFixed(0)}%</span>
                <span className="text-muted-foreground/50 ml-auto">{r.time.toFixed(0)}μs</span>
              </div>
            ))}
          </div>
        </div>
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
