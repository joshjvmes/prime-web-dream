import { useState, useCallback } from 'react';
import { WindowState, AppType } from '@/types/os';

let nextZIndex = 10;

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([]);

  const openWindow = useCallback((app: AppType, title: string) => {
    setWindows(prev => {
      const existing = prev.find(w => w.app === app);
      if (existing) {
        return prev.map(w =>
          w.id === existing.id
            ? { ...w, isMinimized: false, isFocused: true, zIndex: ++nextZIndex }
            : { ...w, isFocused: false }
        );
      }
      const offset = prev.length * 30;
      const newWindow: WindowState = {
        id: `${app}-${Date.now()}`,
        title,
        app,
        x: 100 + offset,
        y: 60 + offset,
        width: app === 'terminal' ? 700 : 600,
        height: app === 'terminal' ? 450 : 420,
        isMinimized: false,
        isFocused: true,
        zIndex: ++nextZIndex,
      };
      return [...prev.map(w => ({ ...w, isFocused: false })), newWindow];
    });
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, isMinimized: true, isFocused: false } : w
    ));
  }, []);

  const focusWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w =>
      w.id === id
        ? { ...w, isFocused: true, isMinimized: false, zIndex: ++nextZIndex }
        : { ...w, isFocused: false }
    ));
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, x, y } : w
    ));
  }, []);

  return { windows, openWindow, closeWindow, minimizeWindow, focusWindow, moveWindow };
}
