import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useWindowManager } from '@/hooks/useWindowManager';
import { useNotifications } from '@/hooks/useNotifications';
import BootSequence from '@/components/os/BootSequence';
import Taskbar from '@/components/os/Taskbar';
import OSWindow from '@/components/os/OSWindow';
import GlobalSearch from '@/components/os/GlobalSearch';
import QuickTour from '@/components/os/QuickTour';
import AboutModal from '@/components/os/AboutModal';
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
import SettingsApp from '@/components/os/SettingsApp';
import SystemMonitorApp from '@/components/os/SystemMonitorApp';
import TextEditorApp from '@/components/os/TextEditorApp';
import PrimeChatApp from '@/components/os/PrimeChatApp';
import SecurityConsoleApp from '@/components/os/SecurityConsoleApp';
import PrimeBrowserApp from '@/components/os/PrimeBrowserApp';
import DataCenterApp from '@/components/os/DataCenterApp';
import PrimeBoardApp from '@/components/os/PrimeBoardApp';
import PrimeGalleryApp from '@/components/os/PrimeGalleryApp';
import CloudHooksApp from '@/components/os/CloudHooksApp';
import HypersphereApp from '@/components/os/HypersphereApp';
import PrimeCalendarApp from '@/components/os/PrimeCalendarApp';
import PrimeDocsApp from '@/components/os/PrimeDocsApp';
import PrimeGridApp from '@/components/os/PrimeGridApp';
import SchemaForgeApp from '@/components/os/SchemaForgeApp';
import PrimeCanvasApp from '@/components/os/PrimeCanvasApp';
import PrimeCommApp from '@/components/os/PrimeCommApp';
import PrimeMapsApp from '@/components/os/PrimeMapsApp';
import PrimePkgApp from '@/components/os/PrimePkgApp';
import PrimeAudioApp from '@/components/os/PrimeAudioApp';
import PrimeBetsApp from '@/components/os/PrimeBetsApp';
import PrimeSignalsApp from '@/components/os/PrimeSignalsApp';
import PrimeStreamApp from '@/components/os/PrimeStreamApp';
import PrimeVaultApp from '@/components/os/PrimeVaultApp';
import PrimeLinkApp from '@/components/os/PrimeLinkApp';
import PrimeMailApp from '@/components/os/PrimeMailApp';
import PrimeSocialApp from '@/components/os/PrimeSocialApp';
import PrimeAgentApp from '@/components/os/PrimeAgentApp';
import PrimeRoboticsApp from '@/components/os/PrimeRoboticsApp';
import PrimeBookingApp from '@/components/os/PrimeBookingApp';
import PrimeIoTApp from '@/components/os/PrimeIoTApp';
import DesktopContextMenu from '@/components/os/DesktopContextMenu';
import NotificationSystem from '@/components/os/NotificationSystem';
import { AppType } from '@/types/os';
import { useMemo } from 'react';

export default function Desktop() {
  const [booted, setBooted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const { windows, openWindow, closeWindow, minimizeWindow, focusWindow, moveWindow, resizeWindow, maximizeWindow, snapWindow, tileAllWindows, cascadeWindows } = useWindowManager();
  const activeApps = useMemo(() => windows.filter(w => !w.isMinimized).map(w => w.app), [windows]);
  const { notifications, dismissNotification, events, toggleEvent, updateEventMessage, addEvent, removeEvent } = useNotifications(activeApps);

  const handleBootComplete = useCallback(() => {
    setBooted(true);
    const tourDone = localStorage.getItem('prime-os-tour-completed');
    if (!tourDone) {
      setShowTour(true);
    } else {
      setTimeout(() => openWindow('terminal', 'Prime Shell (psh)'), 300);
    }
  }, [openWindow]);

  const handleTourComplete = useCallback(() => {
    setShowTour(false);
  }, []);

  const handleTourOpenTerminal = useCallback(() => {
    setTimeout(() => openWindow('terminal', 'Prime Shell (psh)'), 200);
  }, [openWindow]);

  // Global keyboard shortcuts
  useEffect(() => {
    if (!booted) return;
    const handler = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K — global search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
        return;
      }
      // Ctrl+C / Ctrl+V / Ctrl+A — allow native clipboard & select
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'a', 'x'].includes(e.key)) {
        return; // let browser handle natively
      }
      // Ctrl+W — close focused window
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'w') {
        e.preventDefault();
        const focused = windows.find(w => w.isFocused);
        if (focused) closeWindow(focused.id);
        return;
      }
      // Ctrl+M — minimize focused window
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'm') {
        e.preventDefault();
        const focused = windows.find(w => w.isFocused);
        if (focused) minimizeWindow(focused.id);
        return;
      }
      // Ctrl+Shift+M — maximize/restore focused window
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        const focused = windows.find(w => w.isFocused);
        if (focused) maximizeWindow(focused.id);
        return;
      }
      // Alt+Tab — cycle windows
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        const nonMin = windows.filter(w => !w.isMinimized);
        if (nonMin.length < 2) return;
        const focusedIdx = nonMin.findIndex(w => w.isFocused);
        const next = nonMin[(focusedIdx + 1) % nonMin.length];
        focusWindow(next.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [booted, windows, closeWindow, focusWindow, minimizeWindow, maximizeWindow]);

  const closeWindowByApp = useCallback((app: string) => {
    const win = windows.find(w => w.app === app);
    if (win) closeWindow(win.id);
  }, [windows, closeWindow]);

  const renderApp = (app: AppType) => {
    switch (app) {
      case 'terminal': return <TerminalApp onOpenApp={openWindow} onCloseApp={closeWindowByApp} />;
      case 'files': return <FilesApp />;
      case 'processes': return <ProcessesApp />;
      case 'sysinfo': return <SysInfoApp />;
      case 'q3inference': return <Q3InferenceApp />;
      case 'primenet': return <PrimeNetApp />;
      case 'geomc': return <GeomCApp />;
      case 'foldmem': return <FoldMemApp />;
      case 'storage': return <PrimeStorageApp />;
      case 'energy': return <EnergyMonitorApp />;
      case 'settings': return <SettingsApp notifEvents={events} onToggleEvent={toggleEvent} onUpdateMessage={updateEventMessage} onAddEvent={addEvent} onRemoveEvent={removeEvent} />;
      case 'monitor': return <SystemMonitorApp />;
      case 'editor': return <TextEditorApp />;
      case 'chat': return <PrimeChatApp />;
      case 'security': return <SecurityConsoleApp />;
      case 'browser': return <PrimeBrowserApp />;
      case 'datacenter': return <DataCenterApp />;
      case 'board': return <PrimeBoardApp />;
      case 'gallery': return <PrimeGalleryApp />;
      case 'cloudhooks': return <CloudHooksApp />;
      case 'hypersphere': return <HypersphereApp />;
      case 'calendar': return <PrimeCalendarApp />;
      case 'docs': return <PrimeDocsApp />;
      case 'spreadsheet': return <PrimeGridApp />;
      case 'schemaforge': return <SchemaForgeApp />;
      case 'canvas': return <PrimeCanvasApp />;
      case 'comm': return <PrimeCommApp />;
      case 'maps': return <PrimeMapsApp />;
      case 'pkg': return <PrimePkgApp />;
      case 'audio': return <PrimeAudioApp />;
      case 'bets': return <PrimeBetsApp />;
      case 'signals': return <PrimeSignalsApp />;
      case 'stream': return <PrimeStreamApp />;
      case 'vault': return <PrimeVaultApp />;
      case 'videocall': return <PrimeLinkApp />;
      case 'mail': return <PrimeMailApp />;
      case 'social': return <PrimeSocialApp />;
      case 'agent': return <PrimeAgentApp onOpenApp={openWindow} onCloseApp={closeWindowByApp} />;
      case 'robotics': return <PrimeRoboticsApp />;
      case 'booking': return <PrimeBookingApp />;
      case 'iot': return <PrimeIoTApp />;
      default: return <div className="p-4 text-muted-foreground font-mono text-xs">App not found</div>;
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background prime-grid scan-lines relative">
      <BootSequence onComplete={handleBootComplete} />

      {booted && (
        <>
          <DesktopContextMenu onOpenApp={openWindow} onTileAll={tileAllWindows} onCascade={cascadeWindows} onSearch={() => setSearchOpen(true)}>
            <div className="absolute inset-0 pb-10">
              <div className="absolute top-4 left-[90px] select-none">
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
                    onMaximize={maximizeWindow}
                    onFocus={focusWindow}
                    onMove={moveWindow}
                    onResize={resizeWindow}
                    onSnap={snapWindow}
                  >
                    {renderApp(win.app)}
                  </OSWindow>
                ))}
              </AnimatePresence>
            </div>
          </DesktopContextMenu>

          <NotificationSystem notifications={notifications} onDismiss={dismissNotification} />
          <Taskbar
            windows={windows}
            onOpenApp={openWindow}
            onFocusWindow={focusWindow}
            notifications={notifications}
            onDismissNotification={dismissNotification}
            onSearch={() => setSearchOpen(true)}
            onOpenAbout={() => setAboutOpen(true)}
          />

          <GlobalSearch
            open={searchOpen}
            onOpenChange={setSearchOpen}
            windows={windows}
            onOpenApp={openWindow}
            onFocusWindow={focusWindow}
            onTileAll={tileAllWindows}
            onCascade={cascadeWindows}
          />

          {showTour && (
            <QuickTour onComplete={handleTourComplete} onOpenTerminal={handleTourOpenTerminal} />
          )}

          <AboutModal open={aboutOpen} onOpenChange={setAboutOpen} />
        </>
      )}
    </div>
  );
}
