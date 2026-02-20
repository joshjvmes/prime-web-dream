import { useState, useRef, useCallback, useEffect } from 'react';
import { Pencil, Minus, Square, Circle, Eraser, Undo, Redo, Download, Trash2, Save, FolderOpen, Eye, EyeOff, Plus, Copy, Merge, ChevronUp, ChevronDown, PaintBucket, Pipette, Type, MousePointer2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { eventBus } from '@/hooks/useEventBus';
import { useCloudStorage } from '@/hooks/useCloudStorage';

type Tool = 'pencil' | 'line' | 'rect' | 'circle' | 'eraser' | 'fill' | 'eyedropper' | 'text' | 'select';

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

const BLEND_MODES: GlobalCompositeOperation[] = ['source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn'];

interface Layer {
  id: string;
  name: string;
  opacity: number;
  visible: boolean;
  blendMode: GlobalCompositeOperation;
  data: ImageData | null;
}

interface HistoryEntry {
  layers: { id: string; data: ImageData }[];
  activeLayerId: string;
}

function createLayerId() { return `l-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

// Checkerboard pattern for transparency
function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const size = 8;
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#1a1a1a' : '#222222';
      ctx.fillRect(x, y, size, size);
    }
  }
}

// Flood fill on ImageData
function floodFill(imageData: ImageData, sx: number, sy: number, fillColor: [number, number, number, number]) {
  const { width, height, data } = imageData;
  const x = Math.floor(sx), y = Math.floor(sy);
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const idx = (y * width + x) * 4;
  const target = [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]] as const;
  if (target[0] === fillColor[0] && target[1] === fillColor[1] && target[2] === fillColor[2] && target[3] === fillColor[3]) return;
  const stack = [[x, y]];
  const match = (i: number) => data[i] === target[0] && data[i + 1] === target[1] && data[i + 2] === target[2] && data[i + 3] === target[3];
  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    const ci = (cy * width + cx) * 4;
    if (cx < 0 || cx >= width || cy < 0 || cy >= height || !match(ci)) continue;
    data[ci] = fillColor[0]; data[ci + 1] = fillColor[1]; data[ci + 2] = fillColor[2]; data[ci + 3] = fillColor[3];
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}

function parseHSLColor(hsl: string): [number, number, number, number] {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = hsl;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2], 255];
}

export default function PrimeCanvasApp() {
  const { save, load } = useCloudStorage();
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(3);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [layers, setLayers] = useState<Layer[]>([{ id: createLayerId(), name: 'Layer 1', opacity: 1, visible: true, blendMode: 'source-over', data: null }]);
  const [activeLayerId, setActiveLayerId] = useState(layers[0].id);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [showLayers, setShowLayers] = useState(true);
  const [textInput, setTextInput] = useState('');
  const [showTextPrompt, setShowTextPrompt] = useState<{ x: number; y: number } | null>(null);

  // Off-screen canvases per layer
  const layerCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const getLayerCanvas = useCallback((layerId: string, w: number, h: number): HTMLCanvasElement => {
    let c = layerCanvasesRef.current.get(layerId);
    if (!c || c.width !== w || c.height !== h) {
      c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      layerCanvasesRef.current.set(layerId, c);
    }
    return c;
  }, []);

  // Composite all layers onto display canvas
  const composite = useCallback(() => {
    const display = displayCanvasRef.current;
    if (!display) return;
    const ctx = display.getContext('2d');
    if (!ctx) return;
    const { width: w, height: h } = display;

    drawCheckerboard(ctx, w, h);

    for (const layer of layers) {
      if (!layer.visible || layer.opacity === 0) continue;
      const lc = layerCanvasesRef.current.get(layer.id);
      if (!lc) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(lc, 0, 0);
      ctx.restore();
    }
  }, [layers]);

  // Save undo state
  const saveState = useCallback(() => {
    const entries: { id: string; data: ImageData }[] = [];
    for (const layer of layers) {
      const lc = layerCanvasesRef.current.get(layer.id);
      if (!lc) continue;
      const ctx = lc.getContext('2d');
      if (!ctx) continue;
      entries.push({ id: layer.id, data: ctx.getImageData(0, 0, lc.width, lc.height) });
    }
    const entry: HistoryEntry = { layers: entries, activeLayerId };
    setHistory(prev => [...prev.slice(0, historyIdx + 1), entry].slice(-30));
    setHistoryIdx(prev => Math.min(prev + 1, 29));
  }, [layers, activeLayerId, historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    const entry = history[newIdx];
    for (const le of entry.layers) {
      const lc = layerCanvasesRef.current.get(le.id);
      if (!lc) continue;
      const ctx = lc.getContext('2d');
      if (!ctx) continue;
      ctx.putImageData(le.data, 0, 0);
    }
    setHistoryIdx(newIdx);
    composite();
  }, [history, historyIdx, composite]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    const entry = history[newIdx];
    for (const le of entry.layers) {
      const lc = layerCanvasesRef.current.get(le.id);
      if (!lc) continue;
      const ctx = lc.getContext('2d');
      if (!ctx) continue;
      ctx.putImageData(le.data, 0, 0);
    }
    setHistoryIdx(newIdx);
    composite();
  }, [history, historyIdx, composite]);

  // Resize observer
  useEffect(() => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      canvas.width = width;
      canvas.height = height;
      setCanvasSize({ w: Math.round(width), h: Math.round(height) });
      // Resize all layer canvases
      for (const layer of layers) {
        getLayerCanvas(layer.id, width, height);
      }
      composite();
      saveState();
    });
    obs.observe(parent);
    return () => obs.disconnect();
  }, []);

  // Re-composite when layers change
  useEffect(() => { composite(); }, [layers, composite]);

  const getActiveCtx = useCallback((): CanvasRenderingContext2D | null => {
    const lc = layerCanvasesRef.current.get(activeLayerId);
    return lc?.getContext('2d') || null;
  }, [activeLayerId]);

  const getPos = (e: React.MouseEvent): { x: number; y: number } => {
    const rect = displayCanvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleDown = (e: React.MouseEvent) => {
    const pos = getPos(e);
    setDrawing(true);
    setStartPos(pos);
    const ctx = getActiveCtx();
    if (!ctx) return;

    if (tool === 'eyedropper') {
      const display = displayCanvasRef.current;
      if (!display) return;
      const dCtx = display.getContext('2d');
      if (!dCtx) return;
      const pixel = dCtx.getImageData(Math.floor(pos.x), Math.floor(pos.y), 1, 1).data;
      setColor(`rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`);
      setDrawing(false);
      return;
    }

    if (tool === 'fill') {
      const lc = layerCanvasesRef.current.get(activeLayerId);
      if (!lc) return;
      const lCtx = lc.getContext('2d');
      if (!lCtx) return;
      const imgData = lCtx.getImageData(0, 0, lc.width, lc.height);
      floodFill(imgData, pos.x, pos.y, parseHSLColor(color));
      lCtx.putImageData(imgData, 0, 0);
      composite();
      saveState();
      setDrawing(false);
      return;
    }

    if (tool === 'text') {
      setShowTextPrompt(pos);
      setDrawing(false);
      return;
    }

    if (tool === 'pencil' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const handleMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const ctx = getActiveCtx();
    if (!ctx) return;
    const pos = getPos(e);
    if (tool === 'pencil') {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      composite();
    } else if (tool === 'eraser') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = brushSize * 3;
      ctx.lineCap = 'round';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.restore();
      composite();
    }
  };

  const handleUp = (e: React.MouseEvent) => {
    if (!drawing || !startPos) { setDrawing(false); return; }
    const ctx = getActiveCtx();
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
    composite();
    saveState();
  };

  const placeText = useCallback(() => {
    if (!showTextPrompt || !textInput) { setShowTextPrompt(null); return; }
    const ctx = getActiveCtx();
    if (!ctx) { setShowTextPrompt(null); return; }
    ctx.fillStyle = color;
    ctx.font = `${brushSize * 4}px monospace`;
    ctx.fillText(textInput, showTextPrompt.x, showTextPrompt.y);
    setShowTextPrompt(null);
    setTextInput('');
    composite();
    saveState();
  }, [showTextPrompt, textInput, color, brushSize, getActiveCtx, composite, saveState]);

  const clearLayer = () => {
    const lc = layerCanvasesRef.current.get(activeLayerId);
    if (!lc) return;
    const ctx = lc.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, lc.width, lc.height);
    composite();
    saveState();
  };

  const addLayer = useCallback(() => {
    const id = createLayerId();
    const name = `Layer ${layers.length + 1}`;
    const newLayer: Layer = { id, name, opacity: 1, visible: true, blendMode: 'source-over', data: null };
    if (canvasSize.w && canvasSize.h) getLayerCanvas(id, canvasSize.w, canvasSize.h);
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(id);
  }, [layers.length, canvasSize, getLayerCanvas]);

  const deleteLayer = useCallback(() => {
    if (layers.length <= 1) return;
    const remaining = layers.filter(l => l.id !== activeLayerId);
    layerCanvasesRef.current.delete(activeLayerId);
    setLayers(remaining);
    setActiveLayerId(remaining[remaining.length - 1].id);
  }, [layers, activeLayerId]);

  const duplicateLayer = useCallback(() => {
    const src = layerCanvasesRef.current.get(activeLayerId);
    if (!src) return;
    const id = createLayerId();
    const srcLayer = layers.find(l => l.id === activeLayerId);
    const newLayer: Layer = { id, name: `${srcLayer?.name || 'Layer'} copy`, opacity: srcLayer?.opacity ?? 1, visible: true, blendMode: srcLayer?.blendMode || 'source-over', data: null };
    const dest = getLayerCanvas(id, src.width, src.height);
    dest.getContext('2d')?.drawImage(src, 0, 0);
    const idx = layers.findIndex(l => l.id === activeLayerId);
    const next = [...layers];
    next.splice(idx + 1, 0, newLayer);
    setLayers(next);
    setActiveLayerId(id);
  }, [layers, activeLayerId, getLayerCanvas]);

  const mergeDown = useCallback(() => {
    const idx = layers.findIndex(l => l.id === activeLayerId);
    if (idx <= 0) return;
    const topCanvas = layerCanvasesRef.current.get(activeLayerId);
    const bottomCanvas = layerCanvasesRef.current.get(layers[idx - 1].id);
    if (!topCanvas || !bottomCanvas) return;
    const ctx = bottomCanvas.getContext('2d');
    if (!ctx) return;
    const topLayer = layers[idx];
    ctx.save();
    ctx.globalAlpha = topLayer.opacity;
    ctx.globalCompositeOperation = topLayer.blendMode;
    ctx.drawImage(topCanvas, 0, 0);
    ctx.restore();
    layerCanvasesRef.current.delete(activeLayerId);
    setLayers(prev => prev.filter(l => l.id !== activeLayerId));
    setActiveLayerId(layers[idx - 1].id);
    composite();
    saveState();
  }, [layers, activeLayerId, composite, saveState]);

  const moveLayer = useCallback((dir: 'up' | 'down') => {
    const idx = layers.findIndex(l => l.id === activeLayerId);
    if ((dir === 'up' && idx >= layers.length - 1) || (dir === 'down' && idx <= 0)) return;
    const next = [...layers];
    const swap = dir === 'up' ? idx + 1 : idx - 1;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setLayers(next);
  }, [layers, activeLayerId]);

  const updateLayer = useCallback((id: string, updates: Partial<Layer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }, []);

  const exportPng = () => {
    const display = displayCanvasRef.current;
    if (!display) return;
    // Flatten to white bg or transparent
    const flat = document.createElement('canvas');
    flat.width = display.width;
    flat.height = display.height;
    const ctx = flat.getContext('2d')!;
    for (const layer of layers) {
      if (!layer.visible) continue;
      const lc = layerCanvasesRef.current.get(layer.id);
      if (!lc) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(lc, 0, 0);
      ctx.restore();
    }
    const a = document.createElement('a');
    a.href = flat.toDataURL('image/png');
    a.download = `prime-canvas-${Date.now()}.png`;
    a.click();
  };

  const handleSave = useCallback(async () => {
    const layerData = layers.map(l => {
      const lc = layerCanvasesRef.current.get(l.id);
      return { ...l, dataUrl: lc?.toDataURL('image/png') || null, data: null };
    });
    await save('canvas-layers', { layers: layerData, activeLayerId });
  }, [layers, activeLayerId, save]);

  const handleLoad = useCallback(async () => {
    const saved = await load<any>('canvas-layers');
    if (!saved?.layers) return;
    const newLayers: Layer[] = [];
    for (const sl of saved.layers) {
      const layer: Layer = { id: sl.id, name: sl.name, opacity: sl.opacity, visible: sl.visible, blendMode: sl.blendMode, data: null };
      newLayers.push(layer);
      if (sl.dataUrl && canvasSize.w && canvasSize.h) {
        const c = getLayerCanvas(sl.id, canvasSize.w, canvasSize.h);
        const img = new Image();
        img.onload = () => {
          c.getContext('2d')?.drawImage(img, 0, 0, canvasSize.w, canvasSize.h);
          composite();
        };
        img.src = sl.dataUrl;
      }
    }
    setLayers(newLayers);
    setActiveLayerId(saved.activeLayerId || newLayers[0]?.id);
  }, [load, canvasSize, getLayerCanvas, composite]);

  // EventBus listeners for AI integration
  useEffect(() => {
    const handleDraw = (payload: any) => {
      if (!payload?.commands || !Array.isArray(payload.commands)) return;
      const ctx = getActiveCtx();
      if (!ctx) return;
      for (const cmd of payload.commands) {
        ctx.save();
        ctx.strokeStyle = cmd.color || color;
        ctx.fillStyle = cmd.fillColor || cmd.color || color;
        ctx.lineWidth = cmd.lineWidth || brushSize;
        ctx.lineCap = 'round';
        if (cmd.type === 'line') { ctx.beginPath(); ctx.moveTo(cmd.x1, cmd.y1); ctx.lineTo(cmd.x2, cmd.y2); ctx.stroke(); }
        else if (cmd.type === 'rect') { cmd.fill ? ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h) : ctx.strokeRect(cmd.x, cmd.y, cmd.w, cmd.h); }
        else if (cmd.type === 'circle') { ctx.beginPath(); ctx.arc(cmd.x, cmd.y, cmd.r, 0, Math.PI * 2); cmd.fill ? ctx.fill() : ctx.stroke(); }
        else if (cmd.type === 'text') { ctx.font = cmd.font || `${brushSize * 4}px monospace`; ctx.fillText(cmd.text, cmd.x, cmd.y); }
        ctx.restore();
      }
      composite();
      saveState();
    };
    const handleClear = () => clearLayer();
    const handleAddLayer = () => addLayer();

    eventBus.on('canvas.draw', handleDraw);
    eventBus.on('canvas.clear', handleClear);
    eventBus.on('canvas.add-layer', handleAddLayer);
    return () => {
      eventBus.off('canvas.draw', handleDraw);
      eventBus.off('canvas.clear', handleClear);
      eventBus.off('canvas.add-layer', handleAddLayer);
    };
  }, [getActiveCtx, color, brushSize, composite, saveState, addLayer]);

  const tools_list: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'pencil', icon: <Pencil size={14} />, label: 'Pencil' },
    { id: 'line', icon: <Minus size={14} />, label: 'Line' },
    { id: 'rect', icon: <Square size={14} />, label: 'Rect' },
    { id: 'circle', icon: <Circle size={14} />, label: 'Circle' },
    { id: 'eraser', icon: <Eraser size={14} />, label: 'Eraser' },
    { id: 'fill', icon: <PaintBucket size={14} />, label: 'Fill' },
    { id: 'eyedropper', icon: <Pipette size={14} />, label: 'Eyedropper' },
    { id: 'text', icon: <Type size={14} />, label: 'Text' },
  ];

  return (
    <div className="flex h-full bg-background font-mono text-xs">
      {/* Left toolbar */}
      <div className="w-10 border-r border-border flex flex-col items-center py-2 gap-1">
        {tools_list.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
            className={`p-1.5 rounded transition-colors ${tool === t.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
            {t.icon}
          </button>
        ))}
        <div className="border-t border-border my-1 w-6" />
        <button onClick={undo} title="Undo" className="p-1.5 rounded text-muted-foreground hover:bg-muted"><Undo size={14} /></button>
        <button onClick={redo} title="Redo" className="p-1.5 rounded text-muted-foreground hover:bg-muted"><Redo size={14} /></button>
        <div className="border-t border-border my-1 w-6" />
        <button onClick={clearLayer} title="Clear Layer" className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 size={14} /></button>
        <button onClick={handleSave} title="Save" className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-primary"><Save size={14} /></button>
        <button onClick={handleLoad} title="Load" className="p-1.5 rounded text-muted-foreground hover:bg-muted"><FolderOpen size={14} /></button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex flex-col">
        <div className="h-8 border-b border-border flex items-center px-3 gap-3">
          <div className="flex items-center gap-1">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-4 h-4 rounded-sm border ${color === c ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-[9px] text-muted-foreground">Size:</span>
            <Slider value={[brushSize]} onValueChange={v => setBrushSize(v[0])} min={1} max={20} step={1} className="w-20" />
            <span className="text-[9px] text-muted-foreground w-4">{brushSize}</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={exportPng} className="text-[9px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/30 flex items-center gap-0.5">
              <Download size={9} />PNG
            </button>
            <button onClick={() => setShowLayers(!showLayers)} className={`text-[9px] px-1.5 py-0.5 rounded border ${showLayers ? 'border-primary/30 text-primary' : 'border-border text-muted-foreground'}`}>
              Layers
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <canvas ref={displayCanvasRef} className="absolute inset-0"
            onMouseDown={handleDown} onMouseMove={handleMove} onMouseUp={handleUp}
            onMouseLeave={() => { if (drawing) { setDrawing(false); composite(); saveState(); } }} />
          {/* Text input prompt */}
          {showTextPrompt && (
            <div className="absolute z-10 bg-card border border-border rounded p-1.5 shadow-lg" style={{ left: showTextPrompt.x, top: showTextPrompt.y }}>
              <input autoFocus value={textInput} onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') placeText(); if (e.key === 'Escape') setShowTextPrompt(null); }}
                placeholder="Type text..." className="bg-transparent border-none outline-none text-[11px] text-foreground w-32" />
            </div>
          )}
        </div>

        <div className="h-5 border-t border-border flex items-center px-3 text-[9px] text-muted-foreground/60">
          <span>{canvasSize.w} × {canvasSize.h}</span>
          <span className="ml-2">Layers: {layers.length}</span>
          <span className="ml-auto">Tool: {tool} | Brush: {brushSize}px</span>
        </div>
      </div>

      {/* Layers panel */}
      {showLayers && (
        <div className="w-44 border-l border-border flex flex-col">
          <div className="p-2 border-b border-border flex items-center justify-between">
            <span className="font-display text-[9px] tracking-wider uppercase text-primary">Layers</span>
            <div className="flex gap-0.5">
              <button onClick={addLayer} title="Add Layer" className="p-0.5 rounded hover:bg-muted text-muted-foreground"><Plus size={10} /></button>
              <button onClick={duplicateLayer} title="Duplicate" className="p-0.5 rounded hover:bg-muted text-muted-foreground"><Copy size={10} /></button>
              <button onClick={mergeDown} title="Merge Down" className="p-0.5 rounded hover:bg-muted text-muted-foreground"><Merge size={10} /></button>
              <button onClick={deleteLayer} title="Delete" className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 size={10} /></button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-1 space-y-0.5">
              {[...layers].reverse().map(layer => (
                <div key={layer.id}
                  onClick={() => setActiveLayerId(layer.id)}
                  className={`p-1.5 rounded cursor-pointer transition-colors ${activeLayerId === layer.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/30 border border-transparent'}`}>
                  <div className="flex items-center gap-1.5">
                    <button onClick={e => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                      className="text-muted-foreground hover:text-foreground">
                      {layer.visible ? <Eye size={10} /> : <EyeOff size={10} />}
                    </button>
                    <span className="text-[10px] text-foreground truncate flex-1">{layer.name}</span>
                    <div className="flex gap-0.5">
                      <button onClick={e => { e.stopPropagation(); moveLayer('up'); }} className="text-muted-foreground hover:text-foreground"><ChevronUp size={8} /></button>
                      <button onClick={e => { e.stopPropagation(); moveLayer('down'); }} className="text-muted-foreground hover:text-foreground"><ChevronDown size={8} /></button>
                    </div>
                  </div>
                  {activeLayerId === layer.id && (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-muted-foreground w-8">α</span>
                        <Slider value={[layer.opacity * 100]} onValueChange={v => updateLayer(layer.id, { opacity: v[0] / 100 })}
                          min={0} max={100} step={1} className="flex-1" />
                        <span className="text-[8px] text-muted-foreground w-6">{Math.round(layer.opacity * 100)}%</span>
                      </div>
                      <select value={layer.blendMode}
                        onChange={e => updateLayer(layer.id, { blendMode: e.target.value as GlobalCompositeOperation })}
                        className="w-full text-[8px] bg-card border border-border rounded px-1 py-0.5 text-foreground">
                        {BLEND_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
