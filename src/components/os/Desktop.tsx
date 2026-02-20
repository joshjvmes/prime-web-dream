import { useState, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useWindowManager } from '@/hooks/useWindowManager';
import { useNotifications } from '@/hooks/useNotifications';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { useVoiceControl } from '@/hooks/useVoiceControl';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import LockScreen from '@/components/os/LockScreen';
import BootSequence from '@/components/os/BootSequence';
import Taskbar from '@/components/os/Taskbar';
import OSWindow from '@/components/os/OSWindow';
import GlobalSearch from '@/components/os/GlobalSearch';
import QuickTour from '@/components/os/QuickTour';
import AboutModal from '@/components/os/AboutModal';
import DesktopWidgets from '@/components/os/DesktopWidgets';
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

// App name map for voice control
const APP_NAME_MAP: Record<string, { app: AppType; title: string }> = {
  'terminal': { app: 'terminal', title: 'Prime Shell (psh)' },
  'shell': { app: 'terminal', title: 'Prime Shell (psh)' },
  'files': { app: 'files', title: 'Prime File System' },
  'settings': { app: 'settings', title: 'Settings' },
  'browser': { app: 'browser', title: 'PrimeBrowser' },
  'chat': { app: 'chat', title: 'PrimeChat' },
  'calendar': { app: 'calendar', title: 'Prime Calendar' },
  'mail': { app: 'mail', title: 'PrimeMail' },
  'docs': { app: 'docs', title: 'PrimeDocs' },
  'editor': { app: 'editor', title: 'PrimeEdit' },
  'music': { app: 'audio', title: 'PrimeAudio' },
  'audio': { app: 'audio', title: 'PrimeAudio' },
  'gallery': { app: 'gallery', title: 'PrimeGallery' },
  'maps': { app: 'maps', title: 'PrimeMaps' },
  'hyper': { app: 'hypersphere', title: 'Hyper AI' },
  'ai': { app: 'hypersphere', title: 'Hyper AI' },
  'security': { app: 'security', title: 'Lattice Shield' },
  'monitor': { app: 'monitor', title: 'System Monitor' },
  'video': { app: 'videocall', title: 'PrimeLink' },
  'social': { app: 'social', title: 'PrimeSocial' },
  'board': { app: 'board', title: 'PrimeBoard' },
  'canvas': { app: 'canvas', title: 'PrimeCanvas' },
  'vault': { app: 'vault', title: 'PrimeVault' },
};

export default function Desktop() {
  const [locked, setLocked] = useState(true);
  const [booted, setBooted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try { return localStorage.getItem('prime-os-voice-enabled') === 'true'; } catch { return false; }
  });

  const {
    windows, openWindow, closeWindow, minimizeWindow, focusWindow, moveWindow, resizeWindow,
    maximizeWindow, snapWindow, tileAllWindows, cascadeWindows,
    activeWorkspace, switchWorkspace, moveWindowToWorkspace, getWindowCountsByWorkspace,
  } = useWindowManager();

  const visibleWindows = useMemo(() => windows.filter(w => w.workspace === activeWorkspace), [windows, activeWorkspace]);
  const activeApps = useMemo(() => visibleWindows.filter(w => !w.isMinimized).map(w => w.app), [visibleWindows]);
  const { notifications, dismissNotification, events, toggleEvent, updateEventMessage, addEvent, removeEvent } = useNotifications(activeApps);

  const handleUnlock = useCallback(() => setLocked(false), []);
  const handleLock = useCallback(() => setLocked(true), []);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const meta = session.user.user_metadata;
        const name = meta?.full_name || meta?.name || '';
        const avatar = meta?.avatar_url || meta?.picture || '';
        if (name) {
          try {
            const existing = JSON.parse(localStorage.getItem('prime-os-profile') || '{}');
            localStorage.setItem('prime-os-profile', JSON.stringify({ ...existing, name, avatar }));
          } catch {}
        }
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-lock idle timeout
  const autoLockSettings = useMemo(() => {
    try {
      const s = localStorage.getItem('prime-os-lock-settings');
      if (s) {
        const parsed = JSON.parse(s);
        return { enabled: !!parsed.autoLock, timeout: (parsed.autoLockTimeout || 5) * 60 * 1000 };
      }
    } catch {}
    return { enabled: false, timeout: 5 * 60 * 1000 };
  }, [locked]); // re-read when lock state changes

  useIdleTimeout({
    timeout: autoLockSettings.timeout,
    onIdle: handleLock,
    enabled: autoLockSettings.enabled && booted && !locked,
  });

  // Voice control
  const handleVoiceCommand = useCallback((cmd: { action: string; argument?: string }) => {
    switch (cmd.action) {
      case 'open': {
        const match = APP_NAME_MAP[cmd.argument?.toLowerCase() || ''];
        if (match) openWindow(match.app, match.title);
        break;
      }
      case 'close': {
        const match = APP_NAME_MAP[cmd.argument?.toLowerCase() || ''];
        if (match) {
          const win = windows.find(w => w.app === match.app);
          if (win) closeWindow(win.id);
        }
        break;
      }
      case 'lock': handleLock(); break;
      case 'search': setSearchOpen(true); break;
      case 'switchWorkspace': {
        const n = parseInt(cmd.argument || '1');
        if (n >= 1 && n <= 4) switchWorkspace(n);
        break;
      }
      case 'minimize': {
        const focused = visibleWindows.find(w => w.isFocused);
        if (focused) minimizeWindow(focused.id);
        break;
      }
      case 'maximize': {
        const focused = visibleWindows.find(w => w.isFocused);
        if (focused) maximizeWindow(focused.id);
        break;
      }
    }
  }, [windows, visibleWindows, openWindow, closeWindow, handleLock, switchWorkspace, minimizeWindow, maximizeWindow]);

  const voice = useVoiceControl({
    enabled: voiceEnabled && booted && !locked,
    onCommand: handleVoiceCommand,
  });

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => {
      const next = !prev;
      localStorage.setItem('prime-os-voice-enabled', String(next));
      return next;
    });
  }, []);

  const handleBootComplete = useCallback(() => {
    setBooted(true);
    const tourDone = localStorage.getItem('prime-os-tour-completed');
    if (!tourDone) {
      setShowTour(true);
    } else {
      setTimeout(() => openWindow('terminal', 'Prime Shell (psh)'), 300);
    }
  }, [openWindow]);

  const handleTourComplete = useCallback(() => setShowTour(false), []);
  const handleTourOpenTerminal = useCallback(() => {
    setTimeout(() => openWindow('terminal', 'Prime Shell (psh)'), 200);
  }, [openWindow]);

  // Global keyboard shortcuts
  useEffect(() => {
    if (!booted) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(prev => !prev); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') { e.preventDefault(); handleLock(); return; }
      if ((e.ctrlKey || e.metaKey) && ['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); switchWorkspace(parseInt(e.key)); return; }
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'a', 'x'].includes(e.key)) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'w') { e.preventDefault(); const f = visibleWindows.find(w => w.isFocused); if (f) closeWindow(f.id); return; }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'm') { e.preventDefault(); const f = visibleWindows.find(w => w.isFocused); if (f) minimizeWindow(f.id); return; }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') { e.preventDefault(); const f = visibleWindows.find(w => w.isFocused); if (f) maximizeWindow(f.id); return; }
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        const nonMin = visibleWindows.filter(w => !w.isMinimized);
        if (nonMin.length < 2) return;
        const focusedIdx = nonMin.findIndex(w => w.isFocused);
        const next = nonMin[(focusedIdx + 1) % nonMin.length];
        focusWindow(next.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [booted, visibleWindows, closeWindow, focusWindow, minimizeWindow, maximizeWindow, handleLock, switchWorkspace]);

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
      case 'settings': return <SettingsApp notifEvents={events} onToggleEvent={toggleEvent} onUpdateMessage={updateEventMessage} onAddEvent={addEvent} onRemoveEvent={removeEvent} onLock={handleLock} user={user} />;
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
      {locked && <LockScreen onUnlock={handleUnlock} user={user} />}
      {!locked && <BootSequence onComplete={handleBootComplete} />}

      {booted && !locked && (
        <>
          <DesktopContextMenu onOpenApp={openWindow} onTileAll={tileAllWindows} onCascade={cascadeWindows} onSearch={() => setSearchOpen(true)}>
            <div className="absolute inset-0 pb-10">
              <div className="absolute top-4 left-[90px] select-none">
                <h1 className="font-display text-sm tracking-[0.3em] text-primary/30">PRIME OS</h1>
                <p className="font-mono text-[9px] text-muted-foreground/40 mt-0.5">
                  Geometric Computing • T3-649 • WS {activeWorkspace}
                </p>
              </div>

              <div className="absolute top-4 right-4 text-right select-none">
                <p className="font-mono text-[9px] text-muted-foreground/30">lattice: P¹¹</p>
                <p className="font-mono text-[9px] text-muted-foreground/30">fold: 11D → 4D</p>
              </div>

              <DesktopWidgets />

              <AnimatePresence>
                {visibleWindows.map(win => (
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
            onLock={handleLock}
            activeWorkspace={activeWorkspace}
            onSwitchWorkspace={switchWorkspace}
            windowCountsByWorkspace={getWindowCountsByWorkspace()}
            voiceState={{ isListening: voice.isListening, lastCommand: voice.lastCommand, supported: voice.supported }}
            onToggleVoice={toggleVoice}
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
