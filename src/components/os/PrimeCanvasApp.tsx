import { useState, useRef, useCallback, useEffect } from 'react';
import { Pencil, Minus, Square, Circle, Eraser, Undo, Redo, Grid3x3, Download, Trash2, Save, FolderOpen } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

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

interface CanvasSave {
  name: string;
  path: string;
  created_at: string;
  url?: string;
}

function downloadFile(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function PrimeCanvasApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(3);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [userId, setUserId] = useState<string | null>(null);
  const [saves, setSaves] = useState<CanvasSave[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [dirty, setDirty] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Load saved canvases list
  const loadSaves = useCallback(async () => {
    if (!userId) {
      // Load from localStorage
      try {
        const local = localStorage.getItem('prime-canvas-saves');
        if (local) setSaves(JSON.parse(local));
      } catch {}
      return;
    }
    try {
      const { data } = await (supabase as any).from('user_data').select('value').eq('user_id', userId).eq('key', 'canvas-saves').maybeSingle();
      if (data?.value) {
        const list = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setSaves(Array.isArray(list) ? list : []);
      }
    } catch {}
  }, [userId]);

  useEffect(() => { loadSaves(); }, [loadSaves]);

  const saveState = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    const data = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory(prev => [...prev.slice(0, historyIdx + 1), data]);
    setHistoryIdx(prev => prev + 1);
    setDirty(true);
    setSaveStatus('unsaved');
  }, [historyIdx]);

  // Auto-save every 2 minutes
  useEffect(() => {
    if (!dirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSave('Auto-save');
    }, 120000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [dirty]);

  const handleSave = useCallback(async (name?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const saveName = name || `Canvas ${new Date().toLocaleString()}`;
    setSaveStatus('saving');

    if (!userId) {
      // Guest: save to localStorage
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const newSave: CanvasSave = { name: saveName, path: '', created_at: new Date().toISOString(), url: dataUrl };
        const updated = [...saves, newSave].slice(-10);
        localStorage.setItem('prime-canvas-saves', JSON.stringify(updated));
        setSaves(updated);
      } catch {}
      setSaveStatus('saved');
      setDirty(false);
      return;
    }

    try {
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
      if (!blob) return;
      const ts = Date.now();
      const path = `canvas/${userId}/${ts}.png`;

      await supabase.storage.from('user-files').upload(path, blob, { contentType: 'image/png', upsert: false });

      const newSave: CanvasSave = { name: saveName, path, created_at: new Date().toISOString() };
      const updated = [...saves, newSave];
      await (supabase as any).from('user_data').upsert(
        { user_id: userId, key: 'canvas-saves', value: JSON.stringify(updated), updated_at: new Date().toISOString() },
        { onConflict: 'user_id,key' }
      );
      setSaves(updated);
    } catch (e) { console.error('Save failed:', e); }
    setSaveStatus('saved');
    setDirty(false);
  }, [userId, saves]);

  const handleLoad = useCallback(async (save: CanvasSave) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let url = save.url;
    if (!url && save.path && userId) {
      const { data } = supabase.storage.from('user-files').getPublicUrl(save.path);
      url = data?.publicUrl;
      // For private buckets, use createSignedUrl
      if (!url) {
        const { data: signed } = await supabase.storage.from('user-files').createSignedUrl(save.path, 600);
        url = signed?.signedUrl;
      }
    }
    if (!url) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      saveState();
      setShowGallery(false);
    };
    img.src = url;
  }, [userId, saveState]);

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

  const clearCanvas = () => {
    if (!confirm('Clear entire canvas?')) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.fillStyle = 'hsl(0, 0%, 8%)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadFile(canvas.toDataURL('image/png'), `prime-canvas-${Date.now()}.png`);
  };

  const tools_list: { id: Tool; icon: React.ReactNode; label: string }[] = [
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
        <button onClick={clearCanvas} title="Clear" className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 size={14} /></button>
        <button onClick={() => handleSave()} title="Save to Cloud" className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-primary"><Save size={14} /></button>
        <button onClick={() => { setShowGallery(!showGallery); loadSaves(); }} title="Gallery" className="p-1.5 rounded text-muted-foreground hover:bg-muted"><FolderOpen size={14} /></button>
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
            <span className={`text-[8px] px-1.5 py-0.5 rounded ${saveStatus === 'saved' ? 'text-primary' : saveStatus === 'saving' ? 'text-muted-foreground animate-pulse' : 'text-accent-foreground'}`}>
              {saveStatus === 'saved' ? '● Saved' : saveStatus === 'saving' ? '● Saving...' : '○ Unsaved'}
            </span>
            <button onClick={exportPng} className="text-[9px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/30 flex items-center gap-0.5">
              <Download size={9} />PNG
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <canvas ref={canvasRef} className="absolute inset-0"
            onMouseDown={handleDown} onMouseMove={handleMove} onMouseUp={handleUp}
            onMouseLeave={() => { if (drawing) { setDrawing(false); saveState(); } }} />
        </div>

        <div className="h-5 border-t border-border flex items-center px-3 text-[9px] text-muted-foreground/60">
          <span>{canvasSize.w} × {canvasSize.h}</span>
          <span className="ml-auto">Tool: {tool} | Brush: {brushSize}px</span>
        </div>
      </div>

      {/* Gallery panel */}
      {showGallery && (
        <div className="w-40 border-l border-border flex flex-col">
          <div className="p-2 border-b border-border">
            <span className="font-display text-[9px] tracking-wider uppercase text-primary">Gallery</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-1 space-y-1">
              {saves.length === 0 ? (
                <p className="text-[9px] text-muted-foreground p-2">No saves yet</p>
              ) : saves.map((s, i) => (
                <button key={i} onClick={() => handleLoad(s)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-muted/50 transition-colors">
                  <div className="text-[10px] text-foreground truncate">{s.name}</div>
                  <div className="text-[8px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
