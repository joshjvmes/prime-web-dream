import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Save, FolderOpen, Trash2 } from 'lucide-react';
import { compile, EXAMPLE_PROGRAMS } from '@/lib/geomq/compiler';
import { useCloudStorage } from '@/hooks/useCloudStorage';

// ─── Original GeomC Demo ───
const SAMPLES = [
  { label: 'Arithmetic Fold', code: 'int a = 2 + 3;\nint b = a * 4;\nreturn b;', optimized: 'return 20; // folded at compile', savings: '67%' },
  { label: 'Loop Elimination', code: 'for (int i=0; i<10; i++) {\n  sum += arr[i];\n}', optimized: 'sum = geometric_fold(arr, 10);\n// O(1) via 11D mapping', savings: '90%' },
  { label: 'Branch Collapse', code: 'if (x > 0) {\n  y = x * 2;\n} else {\n  y = -x * 2;\n}', optimized: 'y = abs_fold(x) * 2;\n// ternary collapse', savings: '50%' },
];
const PHASES = ['Parse', '11D Map', 'Fold', 'Emit'] as const;

function GeomCDemo() {
  const [code, setCode] = useState(SAMPLES[0].code);
  const [selectedSample, setSelectedSample] = useState(0);
  const [compiling, setCompiling] = useState(false);
  const [phase, setPhase] = useState(-1);
  const [result, setResult] = useState<{ optimized: string; time: number; savings: string } | null>(null);

  const compileDemo = () => {
    setCompiling(true); setResult(null); setPhase(0);
    setTimeout(() => setPhase(1), 400);
    setTimeout(() => setPhase(2), 800);
    setTimeout(() => setPhase(3), 1200);
    setTimeout(() => {
      setResult({ optimized: SAMPLES[selectedSample].optimized, time: 3 + Math.random() * 7, savings: SAMPLES[selectedSample].savings });
      setCompiling(false);
    }, 1600);
  };

  const selectSample = (i: number) => { setSelectedSample(i); setCode(SAMPLES[i].code); setResult(null); setPhase(-1); };

  return (
    <div className="h-full flex flex-col text-xs font-mono p-3 overflow-y-auto">
      <div className="flex gap-1 mb-2">
        {SAMPLES.map((s, i) => (
          <button key={i} onClick={() => selectSample(i)}
            className={`px-2 py-0.5 rounded text-[9px] border transition-all ${selectedSample === i ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex-1 flex gap-2 min-h-[100px] mb-2">
        <div className="flex-1 flex flex-col">
          <div className="text-[9px] text-muted-foreground mb-1">Source (Prime C)</div>
          <textarea value={code} onChange={e => setCode(e.target.value)}
            className="flex-1 bg-muted/30 border border-border rounded p-2 text-foreground outline-none focus:border-primary/50 resize-none font-mono text-[11px]" spellCheck={false} />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="text-[9px] text-muted-foreground mb-1">Optimized Output</div>
          <div className="flex-1 bg-muted/30 border border-border rounded p-2 text-prime-green font-mono text-[11px]">
            {result ? result.optimized : <span className="text-muted-foreground">Compile to see output...</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 mb-2">
        {PHASES.map((p, i) => (
          <div key={p} className="flex items-center gap-1">
            <motion.div animate={phase === i ? { scale: [1, 1.1, 1] } : {}} transition={{ duration: 0.3 }}
              className={`px-2 py-0.5 rounded text-[9px] border ${phase === i ? 'bg-prime-amber/20 border-prime-amber/40 text-prime-amber' : phase > i ? 'bg-prime-green/10 border-prime-green/30 text-prime-green' : 'bg-muted/30 border-border text-muted-foreground'}`}>
              {p}
            </motion.div>
            {i < 3 && <span className="text-muted-foreground text-[8px]">→</span>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={compileDemo} disabled={compiling}
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

// ─── GeomQ REPL ───
function GeomQRepl() {
  const { save, load } = useCloudStorage();
  const [code, setCode] = useState(EXAMPLE_PROGRAMS[0].code);
  const [output, setOutput] = useState<string[]>([]);
  const [phases, setPhases] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [savedPrograms, setSavedPrograms] = useState<{ name: string; code: string }[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const runCode = () => {
    setCompiling(true);
    setOutput([]);
    setPhases([]);
    setError(null);
    // Small delay for visual feedback
    setTimeout(() => {
      const result = compile(code);
      setOutput(result.output);
      setPhases(result.phases);
      setError(result.error || null);
      setCompiling(false);
    }, 100);
  };

  const saveProgram = async () => {
    const name = prompt('Program name:');
    if (!name) return;
    const updated = [...savedPrograms.filter(p => p.name !== name), { name, code }];
    setSavedPrograms(updated);
    await save('geomq-programs', updated);
  };

  const loadPrograms = async () => {
    const stored = await load<{ name: string; code: string }[]>('geomq-programs', []);
    setSavedPrograms(stored || []);
    setShowSaved(true);
  };

  const deleteProgram = async (name: string) => {
    const updated = savedPrograms.filter(p => p.name !== name);
    setSavedPrograms(updated);
    await save('geomq-programs', updated);
  };

  return (
    <div className="h-full flex flex-col text-xs font-mono p-3 overflow-hidden">
      {/* Example selector */}
      <div className="flex gap-1 mb-2 flex-wrap">
        {EXAMPLE_PROGRAMS.map((ex, i) => (
          <button key={i} onClick={() => { setCode(ex.code); setOutput([]); setError(null); }}
            className="px-2 py-0.5 rounded text-[9px] border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
            {ex.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex gap-2 min-h-0">
        {/* Editor */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="text-[9px] text-muted-foreground mb-1">GeomQ Source</div>
          <textarea value={code} onChange={e => setCode(e.target.value)}
            className="flex-1 bg-muted/30 border border-border rounded p-2 text-foreground outline-none focus:border-primary/50 resize-none font-mono text-[11px] min-h-0"
            spellCheck={false} />
        </div>

        {/* Output */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="text-[9px] text-muted-foreground mb-1">Output</div>
          <ScrollArea className="flex-1 bg-muted/30 border border-border rounded p-2 min-h-0">
            <div ref={outputRef}>
              {phases.map((p, i) => (
                <div key={i} className="text-[9px] text-muted-foreground/50">▸ {p}</div>
              ))}
              {error && <div className="text-destructive text-[11px] mt-1">⚠ {error}</div>}
              {output.length > 0 && (
                <div className="mt-1 border-t border-border/30 pt-1">
                  {output.map((line, i) => (
                    <div key={i} className="text-prime-green text-[11px]">{line}</div>
                  ))}
                </div>
              )}
              {!compiling && output.length === 0 && !error && phases.length === 0 && (
                <span className="text-muted-foreground/50 text-[10px]">Press RUN to execute...</span>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Saved programs dropdown */}
      {showSaved && savedPrograms.length > 0 && (
        <div className="mt-1 p-2 border border-border rounded bg-card/50 max-h-24 overflow-y-auto">
          {savedPrograms.map(p => (
            <div key={p.name} className="flex items-center gap-2 py-0.5">
              <button onClick={() => { setCode(p.code); setShowSaved(false); }}
                className="flex-1 text-left text-[10px] text-foreground hover:text-primary truncate">{p.name}</button>
              <button onClick={() => deleteProgram(p.name)} className="text-muted-foreground hover:text-destructive"><Trash2 size={8} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-2">
        <button onClick={runCode} disabled={compiling}
          className="flex items-center gap-1 px-4 py-1.5 bg-primary/20 border border-primary/40 text-primary rounded hover:bg-primary/30 disabled:opacity-50 font-display text-[10px] tracking-wider">
          <Play size={10} /> {compiling ? 'RUNNING...' : 'RUN'}
        </button>
        <button onClick={saveProgram} className="flex items-center gap-1 px-2 py-1.5 border border-border text-muted-foreground rounded hover:text-foreground text-[10px]">
          <Save size={10} /> Save
        </button>
        <button onClick={loadPrograms} className="flex items-center gap-1 px-2 py-1.5 border border-border text-muted-foreground rounded hover:text-foreground text-[10px]">
          <FolderOpen size={10} /> Load
        </button>
      </div>
    </div>
  );
}

// ─── Main App ───
export default function GeomCApp() {
  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs defaultValue="geomc" className="flex-1 flex flex-col">
        <div className="px-3 py-1.5 border-b border-border">
          <TabsList className="h-7 bg-muted/30">
            <TabsTrigger value="geomc" className="text-[10px] font-display tracking-wider uppercase h-5 px-3">
              GeomC Compiler
            </TabsTrigger>
            <TabsTrigger value="geomq" className="text-[10px] font-display tracking-wider uppercase h-5 px-3">
              GeomQ REPL
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="geomc" className="flex-1 mt-0 overflow-hidden">
          <GeomCDemo />
        </TabsContent>
        <TabsContent value="geomq" className="flex-1 mt-0 overflow-hidden">
          <GeomQRepl />
        </TabsContent>
      </Tabs>
    </div>
  );
}
