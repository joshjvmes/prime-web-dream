import { useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WindowState } from '@/types/os';
import { X, Minus, Maximize2 } from 'lucide-react';

interface OSWindowProps {
  window: WindowState;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onFocus: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  children: React.ReactNode;
}

export default function OSWindow({ window: win, onClose, onMinimize, onFocus, onMove, children }: OSWindowProps) {
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    onFocus(win.id);
    dragRef.current = { startX: e.clientX, startY: e.clientY, winX: win.x, winY: win.y };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      onMove(win.id, dragRef.current.winX + dx, dragRef.current.winY + dy);
    };
    
    const handleMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [win.id, win.x, win.y, onFocus, onMove]);

  if (win.isMinimized) return null;

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
        className={`h-full flex flex-col rounded border overflow-hidden ${
          win.isFocused
            ? 'border-primary/40 glow-border'
            : 'border-border'
        } bg-card`}
      >
        {/* Title bar */}
        <div
          className="flex items-center justify-between px-3 py-1.5 bg-muted/50 cursor-move select-none shrink-0"
          onMouseDown={handleMouseDown}
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
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Minus size={12} />
            </button>
            <button className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Maximize2 size={12} />
            </button>
            <button
              onClick={() => onClose(win.id)}
              className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </motion.div>
  );
}
