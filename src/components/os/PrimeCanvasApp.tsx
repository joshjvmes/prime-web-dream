import { useState, useRef, useCallback, useEffect } from 'react';
import { Pencil, Minus, Square, Circle, Eraser, Undo, Redo, Grid3x3 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

type Tool = 'pencil' | 'line' | 'rect' | 'circle' | 'eraser';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(270, 80%, 60%)',
  'hsl(45, 90%, 55%)',
  'hsl(140, 70%, 45%)',
  'hsl(0, 0%, 100%)',
  'hsl(0, 0%, 0%)',
  'hsl(0, 75%, 55%)',
  'hsl(200, 80%, 55%)',
];

const LAYERS = ['Background', 'Layer 1', 'Layer 2'];

export default function PrimeCanvasApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(3);
  const [activeLayer, setActiveLayer] = useState(1);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const saveState = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    const data = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory(prev => [...prev.slice(0, historyIdx + 1), data]);
    setHistoryIdx(prev => prev + 1);
  }, [historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const newIdx = historyIdx - 1;
    ctx.putImageData(history[newIdx], 0, 0);
    setHistoryIdx(newIdx);
  }, [history, historyIdx]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const newIdx = historyIdx + 1;
    ctx.putImageData(history[newIdx], 0, 0);
    setHistoryIdx(newIdx);
  }, [history, historyIdx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      canvas.width = width;
      canvas.height = height;
      setCanvasSize({ w: Math.round(width), h: Math.round(height) });
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'hsl(0, 0%, 8%)';
        ctx.fillRect(0, 0, width, height);
        saveState();
      }
    });
    obs.observe(parent);
    return () => obs.disconnect();
  }, []);

  const getPos = (e: React.MouseEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleDown = (e: React.MouseEvent) => {
    const pos = getPos(e);
    setDrawing(true);
    setStartPos(pos);
    if (tool === 'pencil' || tool === 'eraser') {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const handleMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    if (tool === 'pencil' || tool === 'eraser') {
      ctx.strokeStyle = tool === 'eraser' ? 'hsl(0, 0%, 8%)' : color;
      ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize;
      ctx.lineCap = 'round';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const handleUp = (e: React.MouseEvent) => {
    if (!drawing || !startPos) { setDrawing(false); return; }
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) { setDrawing(false); return; }
    const pos = getPos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';

    if (tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'rect') {
      ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
    } else if (tool === 'circle') {
      const rx = Math.abs(pos.x - startPos.x) / 2;
      const ry = Math.abs(pos.y - startPos.y) / 2;
      const cx = (startPos.x + pos.x) / 2;
      const cy = (startPos.y + pos.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    setDrawing(false);
    saveState();
  };

  const drawLattice = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    const { width, height } = canvasRef.current;
    ctx.strokeStyle = 'hsla(270, 80%, 60%, 0.3)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 0; y < height; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    saveState();
  };

  const drawPrimeSpiral = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    const { width, height } = canvasRef.current;
    const cx = width / 2, cy = height / 2;
    ctx.strokeStyle = 'hsla(45, 90%, 55%, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 500; i++) {
      const angle = i * 0.3;
      const r = i * 0.5;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    saveState();
  };

  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'pencil', icon: <Pencil size={14} />, label: 'Pencil' },
    { id: 'line', icon: <Minus size={14} />, label: 'Line' },
    { id: 'rect', icon: <Square size={14} />, label: 'Rect' },
    { id: 'circle', icon: <Circle size={14} />, label: 'Circle' },
    { id: 'eraser', icon: <Eraser size={14} />, label: 'Eraser' },
  ];

  return (
    <div className="flex h-full bg-background font-mono text-xs">
      {/* Left toolbar */}
      <div className="w-10 border-r border-border flex flex-col items-center py-2 gap-1">
        {tools.map(t => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.label}
            className={`p-1.5 rounded transition-colors ${tool === t.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
          >
            {t.icon}
          </button>
        ))}
        <div className="border-t border-border my-1 w-6" />
        <button onClick={undo} title="Undo" className="p-1.5 rounded text-muted-foreground hover:bg-muted"><Undo size={14} /></button>
        <button onClick={redo} title="Redo" className="p-1.5 rounded text-muted-foreground hover:bg-muted"><Redo size={14} /></button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="h-8 border-b border-border flex items-center px-3 gap-3">
          <div className="flex items-center gap-1">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-4 h-4 rounded-sm border ${color === c ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-[9px] text-muted-foreground">Size:</span>
            <Slider value={[brushSize]} onValueChange={v => setBrushSize(v[0])} min={1} max={20} step={1} className="w-20" />
            <span className="text-[9px] text-muted-foreground w-4">{brushSize}</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={drawLattice} className="text-[9px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors">
              <Grid3x3 size={10} className="inline mr-0.5" />Lattice
            </button>
            <button onClick={drawPrimeSpiral} className="text-[9px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors">
              Spiral
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            onMouseDown={handleDown}
            onMouseMove={handleMove}
            onMouseUp={handleUp}
            onMouseLeave={() => { if (drawing) { setDrawing(false); saveState(); } }}
          />
        </div>

        {/* Status bar */}
        <div className="h-5 border-t border-border flex items-center px-3 text-[9px] text-muted-foreground/60">
          <span>{canvasSize.w} × {canvasSize.h}</span>
          <span className="ml-auto">Tool: {tool} | Brush: {brushSize}px</span>
        </div>
      </div>

      {/* Layers panel */}
      <div className="w-32 border-l border-border flex flex-col">
        <div className="p-2 border-b border-border">
          <span className="font-display text-[9px] tracking-wider uppercase text-primary">Layers</span>
        </div>
        <div className="p-1 flex flex-col gap-0.5">
          {LAYERS.map((l, i) => (
            <button
              key={l}
              onClick={() => setActiveLayer(i)}
              className={`text-left text-[10px] px-2 py-1 rounded transition-colors ${activeLayer === i ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
