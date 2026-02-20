import { useEffect, useCallback } from 'react';
import { AppType, WindowState } from '@/types/os';

export interface ShortcutCallbacks {
  openSearch: () => void;
  lockScreen: () => void;
  openApp: (app: AppType, title: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  switchWorkspace: (ws: number) => void;
  toggleClipboard: () => void;
  getVisibleWindows: () => WindowState[];
}

export function useGlobalShortcuts(callbacks: ShortcutCallbacks, enabled: boolean) {
  const handler = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    const ctrl = e.ctrlKey || e.metaKey;

    // Ctrl+K — Search
    if (ctrl && e.key === 'k') { e.preventDefault(); callbacks.openSearch(); return; }
    // Ctrl+L — Lock
    if (ctrl && !e.shiftKey && e.key === 'l') { e.preventDefault(); callbacks.lockScreen(); return; }
    // Ctrl+` — Terminal
    if (ctrl && e.key === '`') { e.preventDefault(); callbacks.openApp('terminal', 'Prime Shell (psh)'); return; }
    // Ctrl+Shift+A — Agent
    if (ctrl && e.shiftKey && e.key === 'A') { e.preventDefault(); callbacks.openApp('agent', 'PrimeAgent'); return; }
    // Ctrl+Shift+V — Clipboard Manager
    if (ctrl && e.shiftKey && e.key === 'V') { e.preventDefault(); callbacks.toggleClipboard(); return; }
    // Allow native Ctrl+C/V/X/A
    if (ctrl && !e.shiftKey && ['c', 'v', 'a', 'x'].includes(e.key)) return;
    // Ctrl+W — Close focused
    if (ctrl && !e.shiftKey && e.key === 'w') {
      e.preventDefault();
      const f = callbacks.getVisibleWindows().find(w => w.isFocused);
      if (f) callbacks.closeWindow(f.id);
      return;
    }
    // Ctrl+M — Minimize
    if (ctrl && !e.shiftKey && e.key === 'm') {
      e.preventDefault();
      const f = callbacks.getVisibleWindows().find(w => w.isFocused);
      if (f) callbacks.minimizeWindow(f.id);
      return;
    }
    // Ctrl+Shift+M — Maximize
    if (ctrl && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      const f = callbacks.getVisibleWindows().find(w => w.isFocused);
      if (f) callbacks.maximizeWindow(f.id);
      return;
    }
    // Alt+1-9 — Switch workspace
    if (e.altKey && !ctrl && e.key >= '1' && e.key <= '4') {
      e.preventDefault();
      callbacks.switchWorkspace(parseInt(e.key));
      return;
    }
    // Alt+Tab — Cycle windows
    if (e.altKey && e.key === 'Tab') {
      e.preventDefault();
      const wins = callbacks.getVisibleWindows().filter(w => !w.isMinimized);
      if (wins.length < 2) return;
      const focusedIdx = wins.findIndex(w => w.isFocused);
      const nextIdx = e.shiftKey
        ? (focusedIdx - 1 + wins.length) % wins.length
        : (focusedIdx + 1) % wins.length;
      callbacks.focusWindow(wins[nextIdx].id);
      return;
    }
    // Alt+F4 — Close focused
    if (e.altKey && e.key === 'F4') {
      e.preventDefault();
      const f = callbacks.getVisibleWindows().find(w => w.isFocused);
      if (f) callbacks.closeWindow(f.id);
      return;
    }
    // Ctrl+1-4 — Switch workspace
    if (ctrl && ['1', '2', '3', '4'].includes(e.key)) {
      e.preventDefault();
      callbacks.switchWorkspace(parseInt(e.key));
      return;
    }
  }, [enabled, callbacks]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, handler]);
}
