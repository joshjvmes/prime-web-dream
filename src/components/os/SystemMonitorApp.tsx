import { useState, useEffect, useRef } from 'react';
import { Cpu, HardDrive, Network, Zap, Activity, Database } from 'lucide-react';

function ArcGauge({ value, max, label, color, icon: Icon }: { value: number; max: number; label: string; color: string; icon: React.ElementType }) {
  const pct = Math.min(value / max, 1);
  const r = 40;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const offset = arc * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="80" viewBox="0 0 100 90">
        <path
          d="M 10 70 A 40 40 0 1 1 90 70"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 10 70 A 40 40 0 1 1 90 70"
          fill="none"
          stroke={`hsl(var(--${color}))`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${arc}`}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
        <text x="50" y="50" textAnchor="middle" fill={`hsl(var(--${color}))`} fontSize="16" fontFamily="var(--font-display)" fontWeight="700">
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <div className="flex items-center gap-1 text-[9px] font-display tracking-wider uppercase" style={{ color: `hsl(var(--${color}))` }}>
        <Icon size={10} />
        {label}
      </div>
    </div>
  );
}

function Sparkline({ data, color, width = 120, height = 40 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - (v / max) * height}`).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={`hsl(var(--${color}))`} strokeWidth="1.5" opacity="0.8" />
    </svg>
  );
}

function DonutChart({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = Math.min(used / total, 1);
  const r = 30;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
      <circle
        cx="40" cy="40" r={r} fill="none"
        stroke={`hsl(var(--${color}))`} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        transform="rotate(-90 40 40)"
        className="transition-all duration-700"
      />
      <text x="40" y="43" textAnchor="middle" fill={`hsl(var(--${color}))`} fontSize="11" fontFamily="var(--font-display)" fontWeight="700">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

export default function SystemMonitorApp() {
  const [cpu, setCpu] = useState(45);
  const [mem, setMem] = useState(62);
  const [netPps, setNetPps] = useState(180);
  const [cop, setCop] = useState(3.2);
  const [storageUsed] = useState(167);
  const [storageTotal] = useState(224);
  const [processHistory, setProcessHistory] = useState<number[]>(() => Array.from({ length: 30 }, () => 5 + Math.random() * 3));
  const [netHistory, setNetHistory] = useState<number[]>(() => Array.from({ length: 30 }, () => 100 + Math.random() * 200));
  const [cpuHistory, setCpuHistory] = useState<number[]>(() => Array.from({ length: 30 }, () => 30 + Math.random() * 40));
  const [states, setStates] = useState({ past: 2, present: 4, future: 1 });

  useEffect(() => {
    const id = setInterval(() => {
      const newCpu = Math.max(5, Math.min(95, cpu + (Math.random() - 0.5) * 15));
      const newMem = Math.max(20, Math.min(90, mem + (Math.random() - 0.5) * 8));
      const newNet = Math.max(50, Math.min(400, netPps + (Math.random() - 0.5) * 80));
      const newCop = Math.max(2.5, Math.min(4.0, cop + (Math.random() - 0.5) * 0.3));
      setCpu(newCpu);
      setMem(newMem);
      setNetPps(Math.round(newNet));
      setCop(parseFloat(newCop.toFixed(2)));
      setProcessHistory(h => [...h.slice(-29), 5 + Math.random() * 4]);
      setNetHistory(h => [...h.slice(-29), newNet]);
      setCpuHistory(h => [...h.slice(-29), newCpu]);
      setStates({
        past: 1 + Math.floor(Math.random() * 3),
        present: 3 + Math.floor(Math.random() * 3),
        future: Math.floor(Math.random() * 3),
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cpu, mem, netPps, cop]);

  return (
    <div className="h-full flex flex-col bg-background/50 p-3 gap-3 overflow-auto">
      <div className="flex items-center gap-2 mb-1">
        <Activity size={14} className="text-primary" />
        <span className="font-display text-[10px] tracking-[0.2em] uppercase text-primary">System Monitor</span>
        <span className="ml-auto font-mono text-[9px] text-muted-foreground">LIVE</span>
        <span className="w-1.5 h-1.5 rounded-full bg-prime-green animate-pulse" />
      </div>

      <div className="grid grid-cols-3 grid-rows-2 gap-3 flex-1 min-h-0">
        {/* CPU Gauge */}
        <div className="rounded border border-border bg-card/60 p-3 flex flex-col items-center justify-center">
          <ArcGauge value={cpu} max={100} label="CPU Load" color="primary" icon={Cpu} />
          <Sparkline data={cpuHistory} color="primary" width={90} height={25} />
        </div>

        {/* Memory Gauge */}
        <div className="rounded border border-border bg-card/60 p-3 flex flex-col items-center justify-center">
          <ArcGauge value={mem} max={100} label="FoldMem" color="prime-violet" icon={HardDrive} />
          <div className="font-mono text-[9px] text-muted-foreground mt-1">
            {(mem * 0.11).toFixed(1)} / 11.0 D-units
          </div>
        </div>

        {/* Process Sparklines */}
        <div className="rounded border border-border bg-card/60 p-3 flex flex-col items-center justify-center gap-2">
          <div className="font-display text-[9px] tracking-wider uppercase text-prime-amber flex items-center gap-1">
            <Activity size={10} /> Processes
          </div>
          <Sparkline data={processHistory} color="prime-amber" width={90} height={30} />
          <div className="flex gap-2 text-[8px] font-mono">
            <span className="text-muted-foreground">◆{states.past}</span>
            <span className="text-primary">◈{states.present}</span>
            <span className="text-prime-violet">◇{states.future}</span>
          </div>
        </div>

        {/* Network Throughput */}
        <div className="rounded border border-border bg-card/60 p-3 flex flex-col items-center justify-center gap-2">
          <div className="font-display text-[9px] tracking-wider uppercase text-prime-green flex items-center gap-1">
            <Network size={10} /> Network
          </div>
          <Sparkline data={netHistory} color="prime-green" width={90} height={30} />
          <div className="font-mono text-[10px] text-prime-green">{netPps} pkt/s</div>
        </div>

        {/* Energy COP */}
        <div className="rounded border border-border bg-card/60 p-3 flex flex-col items-center justify-center gap-2">
          <div className="font-display text-[9px] tracking-wider uppercase text-prime-amber flex items-center gap-1">
            <Zap size={10} /> Energy
          </div>
          <div className="font-display text-2xl font-bold text-prime-amber">{cop}</div>
          <div className="text-[8px] font-mono text-muted-foreground">COP (OVER-UNITY)</div>
          <div className="px-2 py-0.5 rounded-full bg-prime-amber/10 border border-prime-amber/30 text-[8px] font-display text-prime-amber tracking-wider">
            SATELLITE
          </div>
        </div>

        {/* Storage Ring */}
        <div className="rounded border border-border bg-card/60 p-3 flex flex-col items-center justify-center gap-1">
          <div className="font-display text-[9px] tracking-wider uppercase text-prime-teal flex items-center gap-1">
            <Database size={10} /> Storage
          </div>
          <DonutChart used={storageUsed} total={storageTotal} color="prime-teal" />
          <div className="font-mono text-[8px] text-muted-foreground">{storageUsed} / {storageTotal} TB</div>
        </div>
      </div>
    </div>
  );
}
