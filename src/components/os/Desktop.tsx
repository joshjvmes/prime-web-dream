import { useState, useCallback, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useWindowManager } from '@/hooks/useWindowManager';
import BootSequence from '@/components/os/BootSequence';
import Taskbar from '@/components/os/Taskbar';
import OSWindow from '@/components/os/OSWindow';
import TerminalApp from '@/components/os/TerminalApp';
import FilesApp from '@/components/os/FilesApp';
import ProcessesApp from '@/components/os/ProcessesApp';
import SysInfoApp from '@/components/os/SysInfoApp';
import Q3InferenceApp from '@/components/os/Q3InferenceApp';
import PrimeNetApp from '@/components/os/PrimeNetApp';
import GeomCApp from '@/components/os/GeomCApp';
import FoldMemApp from '@/components/os/FoldMemApp';
import PrimeStorageApp from '@/components/os/PrimeStorageApp';
import EnergyMonitorApp from '@/components/os/EnergyMonitorApp';
import { AppType } from '@/types/os';

export default function Desktop() {
  const [booted, setBooted] = useState(false);
  const { windows, openWindow, closeWindow, minimizeWindow, focusWindow, moveWindow } = useWindowManager();

  const handleBootComplete = useCallback(() => {
    setBooted(true);
    setTimeout(() => openWindow('terminal', 'Prime Shell (psh)'), 300);
  }, [openWindow]);

  const renderApp = (app: AppType) => {
    switch (app) {
      case 'terminal': return <TerminalApp />;
      case 'files': return <FilesApp />;
      case 'processes': return <ProcessesApp />;
      case 'sysinfo': return <SysInfoApp />;
      case 'q3inference': return <Q3InferenceApp />;
      case 'primenet': return <PrimeNetApp />;
      case 'geomc': return <GeomCApp />;
      case 'foldmem': return <FoldMemApp />;
      case 'storage': return <PrimeStorageApp />;
      case 'energy': return <EnergyMonitorApp />;
      default: return <div className="p-4 text-muted-foreground font-mono text-xs">App not found</div>;
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background prime-grid scan-lines relative">
      <BootSequence onComplete={handleBootComplete} />

      {booted && (
        <>
          <div className="absolute inset-0 pb-10">
            <div className="absolute top-4 left-4 select-none">
              <h1 className="font-display text-sm tracking-[0.3em] text-primary/30">PRIME OS</h1>
              <p className="font-mono text-[9px] text-muted-foreground/40 mt-0.5">
                Geometric Computing • T3-649
              </p>
            </div>

            <div className="absolute top-4 right-4 text-right select-none">
              <p className="font-mono text-[9px] text-muted-foreground/30">
                lattice: P¹¹
              </p>
              <p className="font-mono text-[9px] text-muted-foreground/30">
                fold: 11D → 4D
              </p>
            </div>

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
