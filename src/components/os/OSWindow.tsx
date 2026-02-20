import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { WindowState } from '@/types/os';
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react';

interface OSWindowProps {
  window: WindowState;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onFocus: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number, x?: number, y?: number) => void;
  onSnap: (id: string, side: 'left' | 'right') => void;
  children: React.ReactNode;
}

const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;
const SNAP_THRESHOLD = 12;

export default function OSWindow({ window: win, onClose, onMinimize, onMaximize, onFocus, onMove, onResize, onSnap, children }: OSWindowProps) {
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null);

  const handleTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if (win.isMaximized) return;
    onFocus(win.id);
    dragRef.current = { startX: e.clientX, startY: e.clientY, winX: win.x, winY: win.y };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      onMove(win.id, dragRef.current.winX + dx, dragRef.current.winY + dy);
    };

    const handleMouseUp = (e: MouseEvent) => {
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Snap detection
      if (e.clientX <= SNAP_THRESHOLD) onSnap(win.id, 'left');
      else if (e.clientX >= window.innerWidth - SNAP_THRESHOLD) onSnap(win.id, 'right');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [win.id, win.x, win.y, win.isMaximized, onFocus, onMove, onSnap]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, edges: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean }) => {
    e.stopPropagation();
    e.preventDefault();
    onFocus(win.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = win.width;
    const startH = win.height;
    const startWX = win.x;
    const startWY = win.y;

    const handleMouseMove = (e: MouseEvent) => {
      let newW = startW;
      let newH = startH;
      let newX = startWX;
      let newY = startWY;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (edges.right) newW = Math.max(MIN_WIDTH, startW + dx);
      if (edges.bottom) newH = Math.max(MIN_HEIGHT, startH + dy);
      if (edges.left) {
        const dw = Math.min(dx, startW - MIN_WIDTH);
        newW = startW - dw;
        newX = startWX + dw;
      }
      if (edges.top) {
        const dh = Math.min(dy, startH - MIN_HEIGHT);
        newH = startH - dh;
        newY = startWY + dh;
      }
      onResize(win.id, newW, newH, newX, newY);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [win.id, win.width, win.height, win.x, win.y, onFocus, onResize]);

  if (win.isMinimized) return null;

  const resizeHandles = !win.isMaximized ? (
    <>
      {/* Edges */}
      <div className="absolute top-0 left-2 right-2 h-1 cursor-n-resize" onMouseDown={e => handleResizeMouseDown(e, { top: true })} />
      <div className="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize" onMouseDown={e => handleResizeMouseDown(e, { bottom: true })} />
      <div className="absolute left-0 top-2 bottom-2 w-1 cursor-w-resize" onMouseDown={e => handleResizeMouseDown(e, { left: true })} />
      <div className="absolute right-0 top-2 bottom-2 w-1 cursor-e-resize" onMouseDown={e => handleResizeMouseDown(e, { right: true })} />
      {/* Corners */}
      <div className="absolute top-0 left-0 w-2 h-2 cursor-nw-resize" onMouseDown={e => handleResizeMouseDown(e, { top: true, left: true })} />
      <div className="absolute top-0 right-0 w-2 h-2 cursor-ne-resize" onMouseDown={e => handleResizeMouseDown(e, { top: true, right: true })} />
      <div className="absolute bottom-0 left-0 w-2 h-2 cursor-sw-resize" onMouseDown={e => handleResizeMouseDown(e, { bottom: true, left: true })} />
      <div className="absolute bottom-0 right-0 w-2 h-2 cursor-se-resize" onMouseDown={e => handleResizeMouseDown(e, { bottom: true, right: true })} />
    </>
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="absolute"
      style={{
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      }}
      onMouseDown={() => onFocus(win.id)}
    >
      <div
        role="dialog"
        aria-label={win.title}
        className={`h-full flex flex-col rounded border overflow-hidden relative ${
          win.isFocused
            ? 'border-primary/40 glow-border'
            : 'border-border'
        } bg-card`}
      >
        {resizeHandles}
        {/* Title bar */}
        <div
          className="flex items-center justify-between px-3 py-1.5 bg-muted/50 cursor-move select-none shrink-0"
          onMouseDown={handleTitleMouseDown}
          onDoubleClick={() => onMaximize(win.id)}
        >
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${win.isFocused ? 'bg-primary animate-pulse-glow' : 'bg-muted-foreground/30'}`} />
            <span className="font-display text-[10px] tracking-wider uppercase text-card-foreground">
              {win.title}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onMinimize(win.id)}
              aria-label="Minimize window"
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Minus size={12} />
            </button>
            <button
              onClick={() => onMaximize(win.id)}
              aria-label={win.isMaximized ? "Restore window" : "Maximize window"}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {win.isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
            <button
              onClick={() => onClose(win.id)}
              aria-label="Close window"
              className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-hidden select-text">
          {children}
        </div>
      </div>
    </motion.div>
  );
}
