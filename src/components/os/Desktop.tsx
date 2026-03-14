import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWindowManager } from '@/hooks/useWindowManager';
import { useNotifications } from '@/hooks/useNotifications';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { useVoiceControl } from '@/hooks/useVoiceControl';
import { useSystemPulse } from '@/hooks/useSystemPulse';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { useCalendarReminders } from '@/hooks/useCalendarReminders';
import { useDeviceClass } from '@/hooks/useDeviceClass';
import { eventBus } from '@/hooks/useEventBus';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import LockScreen from '@/components/os/LockScreen';
import BootSequence from '@/components/os/BootSequence';
import Taskbar from '@/components/os/Taskbar';
import OSWindow from '@/components/os/OSWindow';
import GlobalSearch from '@/components/os/GlobalSearch';
import SetupWizard from '@/components/os/SetupWizard';
import AboutModal from '@/components/os/AboutModal';
import DesktopWidgets from '@/components/os/DesktopWidgets';
import ClipboardManager from '@/components/os/ClipboardManager';
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
import PrimeArcadeApp from '@/components/os/PrimeArcadeApp';
import AdminConsoleApp from '@/components/os/AdminConsoleApp';
import PrimeJournalApp from '@/components/os/PrimeJournalApp';
import PrimeWalletApp from '@/components/os/PrimeWalletApp';
import MiniAppsApp from '@/components/os/MiniAppsApp';
import AppForgeApp from '@/components/os/AppForgeApp';
import BotLabApp from '@/components/os/BotLabApp';
import RokCatApp from '@/components/os/RokCatApp';
import PrimeGitApp from '@/components/os/PrimeGitApp';
import DesktopContextMenu from '@/components/os/DesktopContextMenu';
import BotCreatorPrompt from '@/components/os/BotCreatorPrompt';
import NotificationSystem from '@/components/os/NotificationSystem';
import MobileLauncher from '@/components/os/MobileLauncher';
import DesktopIcons from '@/components/os/DesktopIcons';
import { AppType } from '@/types/os';

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
  'arcade': { app: 'arcade', title: 'PrimeArcade' },
  'games': { app: 'arcade', title: 'PrimeArcade' },
  'admin': { app: 'admin', title: 'Admin Console' },
  'journal': { app: 'journal', title: 'PrimeJournal' },
  'wallet': { app: 'wallet', title: 'PrimeWallet' },
  'miniapps': { app: 'miniapps', title: 'Mini Apps' },
  'forge': { app: 'forge', title: 'App Forge' },
  'botlab': { app: 'botlab', title: 'BotLab' },
  'bots': { app: 'botlab', title: 'BotLab' },
  'rokcat': { app: 'rokcat', title: 'ROKCAT' },
  'github': { app: 'github', title: 'PrimeGit' },
  'git': { app: 'github', title: 'PrimeGit' },
  'spreadsheet': { app: 'spreadsheet', title: 'PrimeGrid' },
  'grid': { app: 'spreadsheet', title: 'PrimeGrid' },
  'comm': { app: 'comm', title: 'PrimeComm' },
  'phone': { app: 'comm', title: 'PrimeComm' },
  'link': { app: 'videocall', title: 'PrimeLink' },
  'videocall': { app: 'videocall', title: 'PrimeLink' },
  'net': { app: 'primenet', title: 'PrimeNet' },
  'primenet': { app: 'primenet', title: 'PrimeNet' },
  'pkg': { app: 'pkg', title: 'PrimePkg' },
  'storage': { app: 'storage', title: 'Prime Storage' },
  'signals': { app: 'signals', title: 'PrimeSignals' },
  'stream': { app: 'stream', title: 'PrimeStream' },
  'booking': { app: 'booking', title: 'PrimeBooking' },
  'book': { app: 'booking', title: 'PrimeBooking' },
  'iot': { app: 'iot', title: 'PrimeIoT' },
  'devices': { app: 'iot', title: 'PrimeIoT' },
  'robotics': { app: 'robotics', title: 'PrimeRobotics' },
  'robots': { app: 'robotics', title: 'PrimeRobotics' },
  'bets': { app: 'bets', title: 'PrimeBets' },
  'schemaforge': { app: 'schemaforge', title: 'SchemaForge' },
  'schema': { app: 'schemaforge', title: 'SchemaForge' },
  'processes': { app: 'processes', title: 'Processes' },
  'sysinfo': { app: 'sysinfo', title: 'System Info' },
  'q3inference': { app: 'q3inference', title: 'Q3 Inference' },
  'q3': { app: 'q3inference', title: 'Q3 Inference' },
  'energy': { app: 'energy', title: 'Energy Monitor' },
  'foldmem': { app: 'foldmem', title: 'FoldMem' },
  'datacenter': { app: 'datacenter', title: 'LatticeCore' },
  'cloudhooks': { app: 'cloudhooks', title: 'Cloud Hooks' },
  'hooks': { app: 'cloudhooks', title: 'Cloud Hooks' },
  'hypersphere': { app: 'hypersphere', title: 'Hyper AI' },
  'agent': { app: 'agent', title: 'PrimeAgent' },
};

export default function Desktop() {
  const deviceClass = useDeviceClass();
  const isMobile = deviceClass === 'mobile';
  const isTablet = deviceClass === 'tablet';
  const [locked, setLocked] = useState(true);
  const [booted, setBooted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [clipboardOpen, setClipboardOpen] = useState(false);
  const [botCreatorOpen, setBotCreatorOpen] = useState(false);
  const [botCreatorDesc, setBotCreatorDesc] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try { return localStorage.getItem('prime-os-voice-enabled') === 'true'; } catch { return false; }
  });
  const firstTerminalRef = useRef(true);
  const latticeOpsRef = useRef(0);
  const [latticeOps, setLatticeOps] = useState(0);

  // Read display settings for font size, animation speed, cursor theme
  const [displaySettings, setDisplaySettings] = useState(() => {
    try {
      const s = localStorage.getItem('prime-os-settings');
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    const handler = () => {
      try {
        const s = localStorage.getItem('prime-os-settings');
        setDisplaySettings(s ? JSON.parse(s) : {});
      } catch {}
    };
    window.addEventListener('storage', handler);
    window.addEventListener('prime-settings-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('prime-settings-changed', handler);
    };
  }, []);

  const {
    windows, openWindow, closeWindow, minimizeWindow, focusWindow, moveWindow, resizeWindow,
    maximizeWindow, snapWindow, tileAllWindows, cascadeWindows,
    activeWorkspace, switchWorkspace, moveWindowToWorkspace, getWindowCountsByWorkspace,
  } = useWindowManager();

  const visibleWindows = useMemo(() => windows.filter(w => w.workspace === activeWorkspace), [windows, activeWorkspace]);
  const activeApps = useMemo(() => visibleWindows.filter(w => !w.isMinimized).map(w => w.app), [visibleWindows]);
  const { notifications, dismissNotification, pushNotification, events, toggleEvent, updateEventMessage, addEvent, removeEvent } = useNotifications(activeApps);

  // System pulse
  useSystemPulse(pushNotification, activeApps, booted && !locked);

  // Activity tracker — writes user actions to database for AI context
  useActivityTracker(booted && !locked && !!user);

  // Calendar reminders
  const openCalendar = useCallback(() => openWindow('calendar', 'Prime Calendar'), [openWindow]);
  useCalendarReminders(pushNotification, openCalendar, booted && !locked && !!user);

  // Global shortcuts
  const shortcutCallbacks = useMemo(() => ({
    openSearch: () => setSearchOpen(prev => !prev),
    lockScreen: () => setLocked(true),
    openApp: openWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    switchWorkspace,
    toggleClipboard: () => setClipboardOpen(prev => !prev),
    getVisibleWindows: () => visibleWindows,
  }), [openWindow, closeWindow, minimizeWindow, maximizeWindow, focusWindow, switchWorkspace, visibleWindows]);

  useGlobalShortcuts(shortcutCallbacks, booted && !locked);

  // Lattice ops counter
  useEffect(() => {
    if (!booted || locked) return;
    const id = setInterval(() => {
      latticeOpsRef.current += Math.floor(3 + Math.random() * 12);
      setLatticeOps(latticeOpsRef.current);
    }, 2000);
    return () => clearInterval(id);
  }, [booted, locked]);

  const handleUnlock = useCallback(() => setLocked(false), []);
  const handleLock = useCallback(() => setLocked(true), []);

  // Event bus: emit app.opened / app.closed
  const prevWindowsRef = useRef<Set<AppType>>(new Set());
  useEffect(() => {
    const currentApps = new Set(windows.map(w => w.app));
    const prevApps = prevWindowsRef.current;
    
    currentApps.forEach(app => {
      if (!prevApps.has(app)) eventBus.emit('app.opened', { app });
    });
    prevApps.forEach(app => {
      if (!currentApps.has(app)) eventBus.emit('app.closed', { app });
    });
    prevWindowsRef.current = currentApps;
  }, [windows]);

  // CloudHooks action listeners + Bot Creator event
  useEffect(() => {
    const handleNotif = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      pushNotification(detail.title, detail.message);
    };
    const handleOpenApp = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const match = APP_NAME_MAP[detail.app];
      if (match) openWindow(match.app, match.title);
    };
    const handleLockEvt = () => setLocked(true);
    const handleCreateBot = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setBotCreatorDesc(detail?.description || '');
      setBotCreatorOpen(true);
    };

    // EventBus listener for ROKCAT / programmatic app opening
    const handleEventBusOpen = (payload: { app: string; title?: string }) => {
      const match = APP_NAME_MAP[payload.app?.toLowerCase()];
      if (match) openWindow(match.app, payload.title || match.title);
    };
    // EventBus listener for closing apps
    const handleEventBusClose = (payload: { app: string }) => {
      const match = APP_NAME_MAP[payload.app?.toLowerCase()];
      if (match) {
        const win = windows.find(w => w.app === match.app);
        if (win) closeWindow(win.id);
      }
    };
    eventBus.on('app.request-open', handleEventBusOpen);
    eventBus.on('app.request-close', handleEventBusClose);

    window.addEventListener('cloudhook-notification', handleNotif);
    window.addEventListener('cloudhook-open-app', handleOpenApp);
    window.addEventListener('cloudhook-lock', handleLockEvt);
    window.addEventListener('prime-create-bot', handleCreateBot);
    return () => {
      eventBus.off('app.request-open', handleEventBusOpen);
      eventBus.off('app.request-close', handleEventBusClose);
      window.removeEventListener('cloudhook-notification', handleNotif);
      window.removeEventListener('cloudhook-open-app', handleOpenApp);
      window.removeEventListener('cloudhook-lock', handleLockEvt);
      window.removeEventListener('prime-create-bot', handleCreateBot);
    };
  }, [pushNotification, openWindow, closeWindow, windows]);

  // Handle GitHub OAuth redirect — claim installation and open PrimeGit
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const installationId = params.get('installation_id');
    if (!params.has('github_connected') || !installationId) return;

    // Clean URL immediately
    params.delete('github_connected');
    params.delete('installation_id');
    params.delete('github_login');
    const clean = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', clean);

    // Claim the installation once we have a session
    const claimInstallation = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const qp = new URLSearchParams({ action: 'link-installation', installation_id: installationId });
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-app?${qp.toString()}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );
      } catch (e) {
        console.error('Failed to link GitHub installation:', e);
      }
      // Open PrimeGit after claiming
      openWindow('github', 'PrimeGit');
    };
    claimInstallation();
  }, [openWindow]);

  // Auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        eventBus.emit('user.signed-in', { userId: session.user.id });
        const meta = session.user.user_metadata;
        const name = meta?.full_name || meta?.name || '';
        const avatar = meta?.avatar_url || meta?.picture || '';
        if (name) {
          try {
            const existing = JSON.parse(localStorage.getItem('prime-os-profile') || '{}');
            localStorage.setItem('prime-os-profile', JSON.stringify({ ...existing, name, avatar }));
          } catch {}
        }
        // Check admin role
        supabase.from('user_roles').select('role').eq('user_id', session.user.id).eq('role', 'admin').maybeSingle()
          .then(({ data }) => setIsAdmin(!!data));
        // Ensure profile exists (for users who signed up before trigger)
        supabase.from('profiles').select('id').eq('user_id', session.user.id).maybeSingle()
          .then(({ data: profile }) => {
            if (!profile) {
              supabase.from('profiles').insert({
                user_id: session.user.id,
                display_name: name || null,
                avatar_url: avatar || null,
              }).then(() => {});
            }
          });
      } else {
        eventBus.emit('user.signed-out', {});
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Auto-lock
  const autoLockSettings = useMemo(() => {
    try {
      const s = localStorage.getItem('prime-os-lock-settings');
      if (s) {
        const parsed = JSON.parse(s);
        return { enabled: !!parsed.autoLock, timeout: (parsed.autoLockTimeout || 5) * 60 * 1000 };
      }
    } catch {}
    return { enabled: false, timeout: 5 * 60 * 1000 };
  }, [locked]);

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
    const setupDone = localStorage.getItem('prime-os-setup-completed') || localStorage.getItem('prime-os-tour-completed');
    if (!setupDone) {
      setShowTour(true);
    } else {
      setTimeout(() => openWindow('rokcat', 'ROKCAT'), 300);
      setTimeout(() => openWindow('terminal', 'Prime Shell (psh)'), 600);
    }
  }, [openWindow]);

  const handleTourComplete = useCallback(() => setShowTour(false), []);
  const handleTourOpenRokcat = useCallback(() => {
    setTimeout(() => openWindow('rokcat', 'ROKCAT'), 200);
  }, [openWindow]);

  const closeWindowByApp = useCallback((app: string) => {
    const win = windows.find(w => w.app === app);
    if (win) closeWindow(win.id);
  }, [windows, closeWindow]);

  const renderApp = (app: AppType) => {
    switch (app) {
      case 'terminal': {
        const isFirst = firstTerminalRef.current;
        if (isFirst) firstTerminalRef.current = false;
        return <TerminalApp onOpenApp={openWindow} onCloseApp={closeWindowByApp} isFirstOpen={isFirst} />;
      }
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
      case 'hypersphere': return <HypersphereApp openWindows={windows} activeWorkspace={activeWorkspace} />;
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
      case 'arcade': return <PrimeArcadeApp />;
      case 'admin': return <AdminConsoleApp />;
      case 'journal': return <PrimeJournalApp />;
      case 'wallet': return <PrimeWalletApp />;
      case 'miniapps': return <MiniAppsApp />;
      case 'forge': return <AppForgeApp />;
      case 'botlab': return <BotLabApp />;
      case 'rokcat': return <RokCatApp />;
      case 'github': return <PrimeGitApp />;
      default: return <div className="p-4 text-muted-foreground font-mono text-xs">App not found</div>;
    }
  };

    const fontSizeClass = displaySettings.fontSize === 'compact' ? 'text-xs' : displaySettings.fontSize === 'large' ? 'text-base' : 'text-sm';
    const cursorStyle = displaySettings.cursorTheme === 'Crosshair' ? 'crosshair' : displaySettings.cursorTheme === 'Lattice' ? 'cell' : 'default';
    const animSpeed = displaySettings.animationSpeed === 'slow' ? '0.5' : displaySettings.animationSpeed === 'fast' ? '2' : '1';

    return (
    <div className={`h-screen w-screen overflow-hidden bg-background ${isMobile ? '' : 'prime-grid scan-lines'} relative ${fontSizeClass}`} style={{ cursor: cursorStyle, '--animation-speed': animSpeed } as React.CSSProperties}>
      {locked && <LockScreen onUnlock={handleUnlock} user={user} />}
      {!locked && <BootSequence onComplete={handleBootComplete} />}

      {booted && !locked && isMobile && (
        <>
          <MobileLauncher
            windows={windows}
            onOpenApp={openWindow}
            onCloseApp={closeWindow}
            onFocusWindow={focusWindow}
            renderApp={renderApp}
            onSearch={() => setSearchOpen(true)}
            notificationCount={notifications.length}
          />
          <NotificationSystem notifications={notifications} onDismiss={dismissNotification} />
          <GlobalSearch
            open={searchOpen}
            onOpenChange={setSearchOpen}
            windows={windows}
            onOpenApp={openWindow}
            onFocusWindow={focusWindow}
            onTileAll={tileAllWindows}
            onCascade={cascadeWindows}
          />
        </>
      )}

      {booted && !locked && !isMobile && (
        <>
          <DesktopContextMenu onOpenApp={openWindow} onTileAll={tileAllWindows} onCascade={cascadeWindows} onSearch={() => setSearchOpen(true)} onCreateBot={() => { setBotCreatorDesc(''); setBotCreatorOpen(true); }}>
            <div className="absolute inset-0 pb-10">
              <div className="absolute top-4 left-[90px] select-none flex items-center gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <h1 className="font-display text-sm tracking-[0.3em] text-primary/30">PRIME OS</h1>
                  </div>
                  <p className="font-mono text-[9px] text-muted-foreground/40 mt-0.5">
                    Geometric Computing • T3-649 • WS {activeWorkspace}
                  </p>
                </div>
              </div>

              <div className="absolute top-4 right-4 text-right select-none">
                <motion.p className="font-mono text-[9px] text-muted-foreground/30"
                  animate={{ opacity: [0.25, 0.4, 0.25] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
                  lattice: P¹¹
                </motion.p>
                <motion.p className="font-mono text-[9px] text-muted-foreground/30"
                  animate={{ opacity: [0.25, 0.4, 0.25] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>
                  fold: 11D → 4D
                </motion.p>
                <p className="font-mono text-[8px] text-muted-foreground/20 mt-0.5">
                  ops: {latticeOps.toLocaleString()}
                </p>
              </div>

              {!isTablet && <DesktopWidgets />}
              <DesktopIcons onOpenApp={openWindow} deviceClass={deviceClass} />

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
                    deviceClass={deviceClass}
                  >
                    {renderApp(win.app)}
                  </OSWindow>
                ))}
              </AnimatePresence>
            </div>
          </DesktopContextMenu>

          <ClipboardManager open={clipboardOpen} onClose={() => setClipboardOpen(false)} />

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
            onCreateBot={() => { setBotCreatorDesc(''); setBotCreatorOpen(true); }}
            activeWorkspace={activeWorkspace}
            onSwitchWorkspace={switchWorkspace}
            windowCountsByWorkspace={getWindowCountsByWorkspace()}
            voiceState={{ isListening: voice.isListening, lastCommand: voice.lastCommand, supported: voice.supported }}
            onToggleVoice={toggleVoice}
            onToggleClipboard={() => setClipboardOpen(prev => !prev)}
            isAdmin={isAdmin}
            deviceClass={deviceClass}
            user={user}
          />

          <GlobalSearch
            open={searchOpen}
            onOpenChange={setSearchOpen}
            windows={windows}
            onOpenApp={openWindow}
            onFocusWindow={focusWindow}
            onTileAll={tileAllWindows}
            onCascade={cascadeWindows}
            onCreateBot={() => { setBotCreatorDesc(''); setBotCreatorOpen(true); }}
          />

          <BotCreatorPrompt
            open={botCreatorOpen}
            onOpenChange={setBotCreatorOpen}
            initialDescription={botCreatorDesc}
            onOpenBotLab={() => openWindow('botlab', 'BotLab')}
          />

          {showTour && (
            <SetupWizard user={user} onComplete={handleTourComplete} onOpenRokcat={handleTourOpenRokcat} />
          )}

          <AboutModal open={aboutOpen} onOpenChange={setAboutOpen} />
        </>
      )}
    </div>
  );
}
