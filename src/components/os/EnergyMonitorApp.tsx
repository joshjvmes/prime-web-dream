import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { EnergyMode } from '@/types/os';

const MODES: EnergyMode[] = [
  { name: 'Satellite', cop: 3.2, input: 100, output: 320, efficiency: 92 },
  { name: 'Chemical', cop: 2.8, input: 150, output: 420, efficiency: 88 },
  { name: 'Biological', cop: 4.1, input: 50, output: 205, efficiency: 96 },
  { name: 'Thermal', cop: 2.1, input: 200, output: 420, efficiency: 78 },
];

interface HistoryPoint { time: number; cop: number; output: number; }

export default function EnergyMonitorApp() {
  const [activeMode, setActiveMode] = useState(0);
  const [cop, setCop] = useState(3.2);
  const [inputPower, setInputPower] = useState(100);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [harvesting, setHarvesting] = useState(true);
  const tickRef = useRef(0);

  const mode = MODES[activeMode];
  const actualOutput = Math.round(inputPower * cop);

  useEffect(() => {
    if (!harvesting) return;
    const id = setInterval(() => {
      tickRef.current++;
      const newCop = MODES[activeMode].cop + (Math.random() - 0.5) * 0.3;
      setCop(newCop);
      setHistory(prev => {
        const point = { time: tickRef.current, cop: newCop, output: Math.round(inputPower * newCop) };
        return [...prev, point].slice(-30);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [activeMode, inputPower, harvesting]);

  // Reset history on mode change
  useEffect(() => {
    setHistory([]);
    setCop(MODES[activeMode].cop);
    setInputPower(MODES[activeMode].input);
  }, [activeMode]);

  // Mini sparkline
  const sparklinePath = history.length > 1
    ? history.map((p, i) => {
        const x = (i / (history.length - 1)) * 100;
        const y = 100 - ((p.cop / 5) * 100);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ')
    : '';

  return (
    <div className="h-full flex flex-col bg-background text-xs font-mono p-3 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-[10px] tracking-wider text-primary uppercase">
          Energy Monitor — Over-Unity Harvesting
        </div>
        <button
          onClick={() => setHarvesting(!harvesting)}
          className={`px-2 py-0.5 rounded border text-[9px] font-display tracking-wider transition-all ${
            harvesting ? 'border-prime-green/30 text-prime-green' : 'border-destructive/30 text-destructive'
          }`}
        >
          {harvesting ? 'ACTIVE' : 'OFFLINE'}
        </button>
      </div>

      {/* COP Gauge */}
      <div className="flex items-center justify-center mb-3">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx={50} cy={50} r={40} fill="none" stroke="hsl(var(--muted))" strokeWidth={6}
              strokeDasharray="188.5" strokeDashoffset="62.8" transform="rotate(135 50 50)" />
            <circle cx={50} cy={50} r={40} fill="none" stroke="hsl(var(--primary))" strokeWidth={6}
              strokeDasharray="188.5"
              strokeDashoffset={188.5 - (Math.min(cop / 5, 1) * 125.7)}
              transform="rotate(135 50 50)"
              strokeLinecap="round"
              className="transition-all duration-500"
            />
            <circle cx={50} cy={50} r={40} fill="none" stroke="hsl(var(--destructive))" strokeWidth={1}
              strokeDasharray="1 187.5" strokeDashoffset={-25.1} transform="rotate(135 50 50)" opacity={0.5} />
            <text x={50} y={45} textAnchor="middle" fontSize="14" fontFamily="Orbitron"
              fill={cop > 1 ? 'hsl(142 70% 45%)' : 'hsl(var(--foreground))'}>
              {cop.toFixed(2)}
            </text>
            <text x={50} y={58} textAnchor="middle" fontSize="6" fill="hsl(var(--muted-foreground))">COP</text>
            {cop > 1 && (
              <text x={50} y={68} textAnchor="middle" fontSize="5" fill="hsl(142 70% 45%)">OVER-UNITY</text>
            )}
          </svg>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-1 mb-3">
        {MODES.map((m, i) => (
          <button key={m.name} onClick={() => setActiveMode(i)}
            className={`flex-1 px-2 py-1 rounded text-[9px] border transition-all font-display tracking-wider ${
              activeMode === i ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
            }`}>
            {m.name}
          </button>
        ))}
      </div>

      {/* Input power slider */}
      <div className="mb-3 p-2 border border-border rounded bg-muted/20">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-muted-foreground">Input Power</span>
          <span className="text-[10px] text-prime-amber font-display">{inputPower}W</span>
        </div>
        <input
          type="range"
          min={10}
          max={500}
          value={inputPower}
          onChange={e => setInputPower(+e.target.value)}
          className="w-full h-1 appearance-none bg-muted rounded-full cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
        />
      </div>

      {/* Energy flow */}
      <div className="flex items-center justify-between mb-3 p-2 border border-border rounded bg-muted/20">
        <div className="text-center">
          <div className="text-[9px] text-muted-foreground">Input</div>
          <div className="text-sm font-display text-prime-amber">{inputPower}W</div>
        </div>
        <div className="flex items-center gap-1">
          <motion.div animate={{ x: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
            className="text-primary text-[10px]">→</motion.div>
          <div className="px-2 py-1 border border-primary/30 rounded text-[8px] text-primary font-display">
            11D COUPLING
          </div>
          <motion.div animate={{ x: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
            className="text-prime-green text-[10px]">→</motion.div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-muted-foreground">Output</div>
          <div className="text-sm font-display text-prime-green">{actualOutput}W</div>
        </div>
      </div>

      {/* COP History sparkline */}
      {history.length > 2 && (
        <div className="mb-3 p-2 border border-border rounded bg-muted/20">
          <div className="text-[9px] text-muted-foreground mb-1">COP History</div>
          <svg viewBox="0 0 100 40" className="w-full h-8" preserveAspectRatio="none">
            {/* Over-unity line */}
            <line x1="0" y1={40 - (1/5)*40} x2="100" y2={40 - (1/5)*40} stroke="hsl(var(--destructive))" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
            <path d={history.map((p, i) => {
              const x = (i / (history.length - 1)) * 100;
              const y = 40 - ((p.cop / 5) * 40);
              return `${i === 0 ? 'M' : 'L'} ${x} ${Math.max(0, Math.min(40, y))}`;
            }).join(' ')} fill="none" stroke="hsl(var(--primary))" strokeWidth="1" />
          </svg>
        </div>
      )}

      {/* Comparison */}
      <div className="space-y-2">
        <div className="text-[9px] text-muted-foreground uppercase font-display tracking-wider">Efficiency Comparison</div>
        <BarRow label="Carnot Limit" value={42} />
        <BarRow label="PRIME Geometric" value={mode.efficiency} accent />
        <BarRow label="Classical Best" value={38} />
      </div>
    </div>
  );
}

function BarRow({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-28 shrink-0 text-[10px]">{label}</span>
      <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1 }}
          className={`h-full rounded-full ${accent ? 'bg-prime-green' : 'bg-primary/40'}`}
        />
      </div>
      <span className={`text-[10px] w-8 text-right ${accent ? 'text-prime-green' : 'text-muted-foreground'}`}>{value}%</span>
    </div>
  );
}
