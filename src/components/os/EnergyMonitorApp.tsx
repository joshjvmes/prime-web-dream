import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EnergyMode } from '@/types/os';

const MODES: EnergyMode[] = [
  { name: 'Satellite', cop: 3.2, input: 100, output: 320, efficiency: 92 },
  { name: 'Chemical', cop: 2.8, input: 150, output: 420, efficiency: 88 },
  { name: 'Biological', cop: 4.1, input: 50, output: 205, efficiency: 96 },
  { name: 'Thermal', cop: 2.1, input: 200, output: 420, efficiency: 78 },
];

export default function EnergyMonitorApp() {
  const [activeMode, setActiveMode] = useState(0);
  const [cop, setCop] = useState(1.0);
  const [tick, setTick] = useState(0);

  const mode = MODES[activeMode];

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      setCop(MODES[activeMode].cop + (Math.random() - 0.5) * 0.2);
    }, 1000);
    return () => clearInterval(id);
  }, [activeMode]);

  return (
    <div className="h-full flex flex-col bg-background text-xs font-mono p-3 overflow-y-auto">
      <div className="font-display text-[10px] tracking-wider text-primary uppercase mb-3">
        Energy Monitor — Over-Unity Harvesting
      </div>

      {/* COP Gauge */}
      <div className="flex items-center justify-center mb-3">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Background arc */}
            <circle cx={50} cy={50} r={40} fill="none" stroke="hsl(var(--muted))" strokeWidth={6}
              strokeDasharray="188.5" strokeDashoffset="62.8" transform="rotate(135 50 50)" />
            {/* Value arc */}
            <circle cx={50} cy={50} r={40} fill="none" stroke="hsl(var(--primary))" strokeWidth={6}
              strokeDasharray="188.5"
              strokeDashoffset={188.5 - (Math.min(cop / 5, 1) * 125.7)}
              transform="rotate(135 50 50)"
              strokeLinecap="round"
            />
            {/* Over-unity marker */}
            <circle cx={50} cy={50} r={40} fill="none" stroke="hsl(var(--destructive))" strokeWidth={1}
              strokeDasharray="1 187.5" strokeDashoffset={-25.1} transform="rotate(135 50 50)" opacity={0.5} />
            <text x={50} y={45} textAnchor="middle" fontSize="14" fontFamily="Orbitron"
              fill={cop > 1 ? 'hsl(142 70% 45%)' : 'hsl(var(--foreground))'}>
              {cop.toFixed(2)}
            </text>
            <text x={50} y={58} textAnchor="middle" fontSize="6" fill="hsl(var(--muted-foreground))">
              COP
            </text>
            {cop > 1 && (
              <text x={50} y={68} textAnchor="middle" fontSize="5" fill="hsl(142 70% 45%)">
                OVER-UNITY
              </text>
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

      {/* Energy flow */}
      <div className="flex items-center justify-between mb-3 p-2 border border-border rounded bg-muted/20">
        <div className="text-center">
          <div className="text-[9px] text-muted-foreground">Input</div>
          <div className="text-sm font-display text-prime-amber">{mode.input}W</div>
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
          <div className="text-sm font-display text-prime-green">{mode.output}W</div>
        </div>
      </div>

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
