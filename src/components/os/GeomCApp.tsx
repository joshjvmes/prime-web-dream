import { useState } from 'react';
import { motion } from 'framer-motion';

const SAMPLES = [
  { label: 'Arithmetic Fold', code: 'int a = 2 + 3;\nint b = a * 4;\nreturn b;', optimized: 'return 20; // folded at compile', savings: '67%' },
  { label: 'Loop Elimination', code: 'for (int i=0; i<10; i++) {\n  sum += arr[i];\n}', optimized: 'sum = geometric_fold(arr, 10);\n// O(1) via 11D mapping', savings: '90%' },
  { label: 'Branch Collapse', code: 'if (x > 0) {\n  y = x * 2;\n} else {\n  y = -x * 2;\n}', optimized: 'y = abs_fold(x) * 2;\n// ternary collapse', savings: '50%' },
];

const PHASES = ['Parse', '11D Map', 'Fold', 'Emit'] as const;

export default function GeomCApp() {
  const [code, setCode] = useState(SAMPLES[0].code);
  const [selectedSample, setSelectedSample] = useState(0);
  const [compiling, setCompiling] = useState(false);
  const [phase, setPhase] = useState(-1);
  const [result, setResult] = useState<{ optimized: string; time: number; savings: string } | null>(null);

  const compile = () => {
    setCompiling(true);
    setResult(null);
    setPhase(0);
    setTimeout(() => setPhase(1), 400);
    setTimeout(() => setPhase(2), 800);
    setTimeout(() => setPhase(3), 1200);
    setTimeout(() => {
      setResult({
        optimized: SAMPLES[selectedSample].optimized,
        time: 3 + Math.random() * 7,
        savings: SAMPLES[selectedSample].savings,
      });
      setCompiling(false);
    }, 1600);
  };

  const selectSample = (i: number) => {
    setSelectedSample(i);
    setCode(SAMPLES[i].code);
    setResult(null);
    setPhase(-1);
  };

  return (
    <div className="h-full flex flex-col bg-background text-xs font-mono p-3 overflow-y-auto">
      <div className="font-display text-[10px] tracking-wider text-primary uppercase mb-2">
        GeomC Compiler — Geometric Code Folding
      </div>

      {/* Sample selector */}
      <div className="flex gap-1 mb-2">
        {SAMPLES.map((s, i) => (
          <button key={i} onClick={() => selectSample(i)}
            className={`px-2 py-0.5 rounded text-[9px] border transition-all ${
              selectedSample === i ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Code editor */}
      <div className="flex-1 flex gap-2 min-h-[100px] mb-2">
        <div className="flex-1 flex flex-col">
          <div className="text-[9px] text-muted-foreground mb-1">Source (Prime C)</div>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            className="flex-1 bg-muted/30 border border-border rounded p-2 text-foreground outline-none focus:border-primary/50 resize-none font-mono text-[11px]"
            spellCheck={false}
          />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="text-[9px] text-muted-foreground mb-1">Optimized Output</div>
          <div className="flex-1 bg-muted/30 border border-border rounded p-2 text-prime-green font-mono text-[11px]">
            {result ? result.optimized : <span className="text-muted-foreground">Compile to see output...</span>}
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="flex items-center gap-1 mb-2">
        {PHASES.map((p, i) => (
          <div key={p} className="flex items-center gap-1">
            <motion.div
              animate={phase === i ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3 }}
              className={`px-2 py-0.5 rounded text-[9px] border ${
                phase === i ? 'bg-prime-amber/20 border-prime-amber/40 text-prime-amber' :
                phase > i ? 'bg-prime-green/10 border-prime-green/30 text-prime-green' :
                'bg-muted/30 border-border text-muted-foreground'
              }`}
            >
              {p}
            </motion.div>
            {i < 3 && <span className="text-muted-foreground text-[8px]">→</span>}
          </div>
        ))}
      </div>

      {/* Actions & stats */}
      <div className="flex items-center gap-3">
        <button onClick={compile} disabled={compiling}
          className="px-4 py-1.5 bg-primary/20 border border-primary/40 text-primary rounded hover:bg-primary/30 disabled:opacity-50 font-display text-[10px] tracking-wider">
          {compiling ? 'COMPILING...' : 'COMPILE'}
        </button>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 text-[10px]">
            <span className="text-muted-foreground">Time: <span className="text-prime-cyan">{result.time.toFixed(1)}ms</span></span>
            <span className="text-muted-foreground">Energy saved: <span className="text-prime-green">{result.savings}</span></span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
