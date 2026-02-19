import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useWindowManager } from '@/hooks/useWindowManager';
import BootSequence from '@/components/os/BootSequence';
import Taskbar from '@/components/os/Taskbar';
import OSWindow from '@/components/os/OSWindow';
import TerminalApp from '@/components/os/TerminalApp';
import FilesApp from '@/components/os/FilesApp';
import ProcessesApp from '@/components/os/ProcessesApp';
import SysInfoApp from '@/components/os/SysInfoApp';
import { AppType } from '@/types/os';

export default function Desktop() {
  const [booted, setBooted] = useState(false);
  const { windows, openWindow, closeWindow, minimizeWindow, focusWindow, moveWindow } = useWindowManager();

  const handleBootComplete = useCallback(() => {
    setBooted(true);
    // Auto-open terminal
    setTimeout(() => openWindow('terminal', 'Prime Shell (psh)'), 300);
  }, [openWindow]);

  const renderApp = (app: AppType) => {
    switch (app) {
      case 'terminal': return <TerminalApp />;
      case 'files': return <FilesApp />;
      case 'processes': return <ProcessesApp />;
      case 'sysinfo': return <SysInfoApp />;
      default: return <div className="p-4 text-muted-foreground font-mono text-xs">App not found</div>;
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background prime-grid scan-lines relative">
      <BootSequence onComplete={handleBootComplete} />

      {booted && (
        <>
          {/* Desktop content area */}
          <div className="absolute inset-0 pb-10">
            {/* Desktop label */}
            <div className="absolute top-4 left-4 select-none">
              <h1 className="font-display text-sm tracking-[0.3em] text-primary/30">PRIME OS</h1>
              <p className="font-mono text-[9px] text-muted-foreground/40 mt-0.5">
                Geometric Computing • T3-649
              </p>
            </div>

            {/* Decorative coordinates */}
            <div className="absolute top-4 right-4 text-right select-none">
              <p className="font-mono text-[9px] text-muted-foreground/30">
                lattice: P¹¹
              </p>
              <p className="font-mono text-[9px] text-muted-foreground/30">
                fold: 11D → 4D
              </p>
            </div>

            {/* Windows */}
            <AnimatePresence>
              {windows.map(win => (
                <OSWindow
                  key={win.id}
                  window={win}
                  onClose={closeWindow}
                  onMinimize={minimizeWindow}
                  onFocus={focusWindow}
                  onMove={moveWindow}
                >
                  {renderApp(win.app)}
                </OSWindow>
              ))}
            </AnimatePresence>
          </div>

          <Taskbar windows={windows} onOpenApp={openWindow} onFocusWindow={focusWindow} />
        </>
      )}
    </div>
  );
}
