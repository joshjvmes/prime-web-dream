import { useState, useCallback } from 'react';
import { WindowState, AppType } from '@/types/os';

let nextZIndex = 10;

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState(1);

  const openWindow = useCallback((app: AppType, title: string) => {
    setWindows(prev => {
      const existing = prev.find(w => w.app === app);
      if (existing) {
        // If in different workspace, move it to current
        return prev.map(w =>
          w.id === existing.id
            ? { ...w, isMinimized: false, isFocused: true, zIndex: ++nextZIndex, workspace: activeWorkspace }
            : { ...w, isFocused: false }
        );
      }
      const offset = prev.filter(w => w.workspace === activeWorkspace).length * 30;
      const getSize = (a: AppType): [number, number] => {
        switch (a) {
          case 'terminal': return [700, 450];
          case 'monitor': return [750, 500];
          case 'editor': return [780, 500];
          case 'chat': return [650, 480];
          case 'security': return [720, 520];
          case 'browser': return [850, 550];
          case 'datacenter': return [800, 550];
          case 'board': return [750, 500];
          case 'gallery': return [700, 480];
          case 'cloudhooks': return [800, 520];
          case 'hypersphere': return [500, 550];
          case 'calendar': return [700, 520];
          case 'docs': return [750, 500];
          case 'spreadsheet': return [850, 520];
          case 'schemaforge': return [800, 550];
          case 'canvas': return [780, 520];
          case 'comm': return [380, 600];
          case 'maps': return [800, 550];
          case 'pkg': return [700, 480];
          case 'audio': return [650, 400];
          case 'bets': return [850, 550];
          case 'signals': return [800, 520];
          case 'stream': return [820, 500];
          case 'vault': return [780, 520];
          case 'videocall': return [750, 550];
          case 'mail': return [780, 520];
          case 'social': return [700, 550];
          case 'agent': return [820, 520];
          case 'robotics': return [780, 520];
          case 'booking': return [850, 550];
          case 'iot': return [800, 520];
          case 'arcade': return [700, 520];
          case 'admin': return [900, 600];
          default: return [600, 420];
        }
      };
      const [w, h] = getSize(app);
      const newWindow: WindowState = {
        id: `${app}-${Date.now()}`,
        title,
        app,
        x: 100 + offset,
        y: 60 + offset,
        width: w,
        height: h,
        isMinimized: false,
        isMaximized: false,
        isFocused: true,
        zIndex: ++nextZIndex,
        workspace: activeWorkspace,
      };
      return [...prev.map(w => ({ ...w, isFocused: false })), newWindow];
    });
  }, [activeWorkspace]);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, isMinimized: true, isFocused: false } : w
    ));
  }, []);

  const focusWindow = useCallback((id: string) => {
    setWindows(prev => {
      const win = prev.find(w => w.id === id);
      if (win && win.workspace !== activeWorkspace) {
        // Switch to that workspace
        setActiveWorkspace(win.workspace);
      }
      return prev.map(w =>
        w.id === id
          ? { ...w, isFocused: true, isMinimized: false, zIndex: ++nextZIndex }
          : { ...w, isFocused: false }
      );
    });
  }, [activeWorkspace]);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, x, y } : w
    ));
  }, []);

  const resizeWindow = useCallback((id: string, width: number, height: number, x?: number, y?: number) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, width, height, ...(x !== undefined && { x }), ...(y !== undefined && { y }) } : w
    ));
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => {
      if (w.id !== id) return { ...w, isFocused: false };
      if (w.isMaximized) {
        return {
          ...w,
          x: w.prevBounds?.x ?? 100,
          y: w.prevBounds?.y ?? 60,
          width: w.prevBounds?.width ?? 600,
          height: w.prevBounds?.height ?? 420,
          isMaximized: false,
          isFocused: true,
          zIndex: ++nextZIndex,
          prevBounds: undefined,
        };
      }
      return {
        ...w,
        prevBounds: { x: w.x, y: w.y, width: w.width, height: w.height },
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight - 40,
        isMaximized: true,
        isFocused: true,
        zIndex: ++nextZIndex,
      };
    }));
  }, []);

  const snapWindow = useCallback((id: string, side: 'left' | 'right') => {
    const w = window.innerWidth;
    const h = window.innerHeight - 40;
    setWindows(prev => prev.map(win => {
      if (win.id !== id) return win;
      return {
        ...win,
        prevBounds: win.isMaximized ? win.prevBounds : { x: win.x, y: win.y, width: win.width, height: win.height },
        x: side === 'left' ? 0 : w / 2,
        y: 0,
        width: w / 2,
        height: h,
        isMaximized: false,
        isFocused: true,
        zIndex: ++nextZIndex,
      };
    }));
  }, []);

  const tileAllWindows = useCallback(() => {
    setWindows(prev => {
      const visible = prev.filter(w => !w.isMinimized && w.workspace === activeWorkspace);
      if (visible.length === 0) return prev;
      const cols = Math.ceil(Math.sqrt(visible.length));
      const rows = Math.ceil(visible.length / cols);
      const w = window.innerWidth / cols;
      const h = (window.innerHeight - 40) / rows;
      let idx = 0;
      return prev.map(win => {
        if (win.isMinimized || win.workspace !== activeWorkspace) return win;
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        idx++;
        return { ...win, x: col * w, y: row * h, width: w, height: h, isMaximized: false, isFocused: false, zIndex: ++nextZIndex };
      });
    });
  }, [activeWorkspace]);

  const cascadeWindows = useCallback(() => {
    setWindows(prev => {
      let idx = 0;
      return prev.map(win => {
        if (win.isMinimized || win.workspace !== activeWorkspace) return win;
        const offset = idx * 30;
        idx++;
        return { ...win, x: 80 + offset, y: 40 + offset, width: 600, height: 420, isMaximized: false, isFocused: false, zIndex: ++nextZIndex };
      });
    });
  }, [activeWorkspace]);

  const switchWorkspace = useCallback((ws: number) => {
    setActiveWorkspace(ws);
    // Unfocus all when switching
    setWindows(prev => prev.map(w => ({ ...w, isFocused: false })));
  }, []);

  const moveWindowToWorkspace = useCallback((id: string, ws: number) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, workspace: ws } : w
    ));
  }, []);

  const getWindowCountsByWorkspace = useCallback(() => {
    return [1, 2, 3, 4].map(ws => windows.filter(w => w.workspace === ws && !w.isMinimized).length);
  }, [windows]);

  return {
    windows, openWindow, closeWindow, minimizeWindow, focusWindow, moveWindow, resizeWindow, maximizeWindow, snapWindow,
    tileAllWindows, cascadeWindows,
    activeWorkspace, switchWorkspace, moveWindowToWorkspace, getWindowCountsByWorkspace,
  };
}
