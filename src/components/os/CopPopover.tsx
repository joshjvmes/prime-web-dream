import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Zap } from 'lucide-react';
import { AppType } from '@/types/os';

interface CopPopoverProps {
  onOpenApp: (app: AppType, title: string) => void;
}

function generateCop(base: number) {
  return +(base + (Math.random() - 0.5) * 0.4).toFixed(2);
}

export default function CopPopover({ onOpenApp }: CopPopoverProps) {
  const [copValue, setCopValue] = useState(3.2);
  const [history, setHistory] = useState<number[]>(() =>
    Array.from({ length: 30 }, () => generateCop(3.2))
  );

  useEffect(() => {
    const id = setInterval(() => {
      const next = generateCop(3.2);
      setCopValue(next);
      setHistory(h => [...h.slice(-29), next]);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const inputPower = +(copValue * 12.4).toFixed(1);
  const outputPower = +(inputPower * copValue).toFixed(1);
  const efficiency = +((copValue / 5) * 100).toFixed(0);

  // Arc gauge SVG
  const arcAngle = (copValue / 5) * 180;
  const rad = (a: number) => ((a - 180) * Math.PI) / 180;
  const cx = 60, cy = 55, r = 40;
  const arcEnd = (a: number) => ({ x: cx + r * Math.cos(rad(a)), y: cy + r * Math.sin(rad(a)) });
  const end = arcEnd(arcAngle);
  const largeArc = arcAngle > 180 ? 1 : 0;

  // Sparkline
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const sparkPoints = history
    .map((v, i) => `${(i / 29) * 100},${40 - ((v - min) / range) * 35}`)
    .join(' ');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded px-1.5 py-0.5 transition-colors">
          <Zap size={10} className="text-prime-amber" />
          <span>COP {copValue.toFixed(1)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="center" sideOffset={8} className="w-56 p-3 bg-card/95 backdrop-blur-md border-border z-[200]">
        <p className="font-display text-[9px] tracking-[0.2em] uppercase text-primary mb-2">Energy Performance</p>

        {/* Arc Gauge */}
        <div className="flex justify-center mb-2">
          <svg width="120" height="65" viewBox="0 0 120 65">
            {/* Background arc */}
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Value arc */}
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <text x={cx} y={cy - 5} textAnchor="middle" className="fill-foreground font-mono text-base font-bold">
              {copValue.toFixed(1)}
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" className="fill-muted-foreground text-[7px]">
              COP
            </text>
            <text x={cx - r} y={cy + 12} textAnchor="middle" className="fill-muted-foreground text-[6px]">0</text>
            <text x={cx + r} y={cy + 12} textAnchor="middle" className="fill-muted-foreground text-[6px]">5</text>
          </svg>
        </div>

        {/* Explanation */}
        <p className="text-[8px] text-muted-foreground leading-tight mb-2 italic">
          Coefficient of Performance — ratio of useful energy output to input. Values above 1.0 indicate over-unity operation.
        </p>

        {/* Live stats */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] mb-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Input</span><span className="text-foreground font-mono">{inputPower} kW</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Output</span><span className="text-foreground font-mono">{outputPower} kW</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Efficiency</span><span className="text-foreground font-mono">{efficiency}%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="text-primary font-mono">Satellite</span></div>
        </div>

        {/* Sparkline */}
        <div className="mb-2">
          <p className="text-[7px] text-muted-foreground mb-0.5">History (30 readings)</p>
          <svg width="100%" height="40" viewBox="0 0 100 40" preserveAspectRatio="none">
            <polyline
              points={sparkPoints}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <button
          onClick={() => onOpenApp('energy', 'Energy Monitor')}
          className="w-full text-[9px] py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors font-display tracking-wider uppercase"
        >
          Open Energy Monitor
        </button>
      </PopoverContent>
    </Popover>
  );
}
