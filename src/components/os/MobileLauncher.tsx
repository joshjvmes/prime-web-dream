import { useState, useEffect, useMemo } from 'react';
import { Terminal, FolderTree, Activity, Cpu, Brain, Network, Code, HardDrive, Database, Zap, Settings, Globe, Server, LayoutList, Image, Link2, Orbit, CalendarDays, BookOpen, Table, Workflow, Paintbrush, Smartphone, Map, Package, Music, Dices, TrendingUp, Radio, Vault, Video, Bot, Cog, CalendarCheck, Wifi, Monitor, FileText, MessageSquare, Shield, Mail, Users, Gamepad2, ShieldCheck, PenLine, Wallet, Blocks, Store, Bell, Search, ChevronDown } from 'lucide-react';
import { AppType, WindowState } from '@/types/os';
import { AnimatePresence, motion } from 'framer-motion';
import MobileAppView from './MobileAppView';

interface MobileLauncherProps {
  windows: WindowState[];
  onOpenApp: (app: AppType, title: string) => void;
  onCloseApp: (id: string) => void;
  onFocusWindow: (id: string) => void;
  renderApp: (app: AppType) => React.ReactNode;
  onSearch?: () => void;
  notificationCount: number;
  onNotifications?: () => void;
}

interface AppEntry { app: AppType; title: string; icon: React.ReactNode; label: string; }

const categories: { name: string; apps: AppEntry[] }[] = [
  {
    name: 'Core',
    apps: [
      { app: 'terminal', title: 'Prime Shell (psh)', icon: <Terminal size={24} />, label: 'Terminal' },
      { app: 'files', title: 'Prime File System', icon: <FolderTree size={24} />, label: 'Files' },
      { app: 'monitor', title: 'System Monitor', icon: <Monitor size={24} />, label: 'Monitor' },
      { app: 'settings', title: 'Settings', icon: <Settings size={24} />, label: 'Settings' },
    ],
  },
  {
    name: 'AI & Compute',
    apps: [
      { app: 'hypersphere', title: 'Hyper AI', icon: <Orbit size={24} />, label: 'Hyper AI' },
      { app: 'q3inference', title: 'Q3-Inference Engine', icon: <Brain size={24} />, label: 'Q3 Inference' },
      { app: 'agent', title: 'PrimeAgent', icon: <Bot size={24} />, label: 'Agent' },
      { app: 'geomc', title: 'GeomC Compiler', icon: <Code size={24} />, label: 'GeomC' },
      { app: 'miniapps', title: 'Mini Apps', icon: <Blocks size={24} />, label: 'Mini Apps' },
      { app: 'forge', title: 'App Forge', icon: <Store size={24} />, label: 'App Forge' },
    ],
  },
  {
    name: 'Productivity',
    apps: [
      { app: 'editor', title: 'PrimeEdit', icon: <FileText size={24} />, label: 'Editor' },
      { app: 'docs', title: 'PrimeDocs', icon: <BookOpen size={24} />, label: 'Docs' },
      { app: 'spreadsheet', title: 'PrimeGrid', icon: <Table size={24} />, label: 'Grid' },
      { app: 'board', title: 'PrimeBoard', icon: <LayoutList size={24} />, label: 'Board' },
      { app: 'canvas', title: 'PrimeCanvas', icon: <Paintbrush size={24} />, label: 'Canvas' },
      { app: 'calendar', title: 'Prime Calendar', icon: <CalendarDays size={24} />, label: 'Calendar' },
      { app: 'journal', title: 'PrimeJournal', icon: <PenLine size={24} />, label: 'Journal' },
      { app: 'wallet', title: 'PrimeWallet', icon: <Wallet size={24} />, label: 'Wallet' },
    ],
  },
  {
    name: 'Communication',
    apps: [
      { app: 'chat', title: 'PrimeChat', icon: <MessageSquare size={24} />, label: 'Chat' },
      { app: 'mail', title: 'PrimeMail', icon: <Mail size={24} />, label: 'Mail' },
      { app: 'social', title: 'PrimeSocial', icon: <Users size={24} />, label: 'Social' },
      { app: 'videocall', title: 'PrimeLink', icon: <Video size={24} />, label: 'Video' },
      { app: 'comm', title: 'PrimeComm', icon: <Smartphone size={24} />, label: 'Comm' },
    ],
  },
  {
    name: 'Network & Security',
    apps: [
      { app: 'browser', title: 'PrimeBrowser', icon: <Globe size={24} />, label: 'Browser' },
      { app: 'security', title: 'Lattice Shield', icon: <Shield size={24} />, label: 'Security' },
      { app: 'vault', title: 'PrimeVault', icon: <Vault size={24} />, label: 'Vault' },
      { app: 'signals', title: 'PrimeSignals', icon: <TrendingUp size={24} />, label: 'Signals' },
    ],
  },
  {
    name: 'Media & Fun',
    apps: [
      { app: 'gallery', title: 'PrimeGallery', icon: <Image size={24} />, label: 'Gallery' },
      { app: 'audio', title: 'PrimeAudio', icon: <Music size={24} />, label: 'Audio' },
      { app: 'stream', title: 'PrimeStream', icon: <Radio size={24} />, label: 'Stream' },
      { app: 'maps', title: 'PrimeMaps', icon: <Map size={24} />, label: 'Maps' },
      { app: 'bets', title: 'PrimeBets', icon: <Dices size={24} />, label: 'Bets' },
      { app: 'arcade', title: 'PrimeArcade', icon: <Gamepad2 size={24} />, label: 'Arcade' },
      { app: 'booking', title: 'PrimeBooking', icon: <CalendarCheck size={24} />, label: 'Booking' },
    ],
  },
];

// Dock pinned apps
const dockApps: AppEntry[] = [
  { app: 'terminal', title: 'Prime Shell (psh)', icon: <Terminal size={22} />, label: 'Terminal' },
  { app: 'hypersphere', title: 'Hyper AI', icon: <Orbit size={22} />, label: 'AI' },
  { app: 'chat', title: 'PrimeChat', icon: <MessageSquare size={22} />, label: 'Chat' },
  { app: 'browser', title: 'PrimeBrowser', icon: <Globe size={22} />, label: 'Browser' },
];

export default function MobileLauncher({ windows, onOpenApp, onCloseApp, onFocusWindow, renderApp, onSearch, notificationCount, onNotifications }: MobileLauncherProps) {
  const [time, setTime] = useState('');
  const [activeApp, setActiveApp] = useState<WindowState | null>(null);

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  // Track the most recently focused window as the active app
  useEffect(() => {
    const focused = windows.find(w => w.isFocused && !w.isMinimized);
    if (focused) {
      setActiveApp(focused);
    }
  }, [windows]);

  const handleOpenApp = (app: AppType, title: string) => {
    onOpenApp(app, title);
    // The window will be created, useEffect above will pick it up
    const existing = windows.find(w => w.app === app);
    if (existing) {
      setActiveApp(existing);
      onFocusWindow(existing.id);
    }
  };

  const handleBack = () => {
    if (activeApp) {
      onCloseApp(activeApp.id);
      setActiveApp(null);
    }
  };

  const allApps = useMemo(() => categories.flatMap(c => c.apps), []);

  return (
    <div className="fixed inset-0 z-[40] flex flex-col bg-background" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Active app view */}
      <AnimatePresence>
        {activeApp && (
          <motion.div
            key={activeApp.id}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="fixed inset-0 z-[60]"
          >
            <MobileAppView title={activeApp.title} onBack={handleBack}>
              {renderApp(activeApp.app)}
            </MobileAppView>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 h-10 shrink-0">
        <span className="font-mono text-[11px] text-muted-foreground">{time}</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
            <span className="font-display text-[8px] tracking-wider text-primary/40">PRIME</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onSearch && (
            <button onClick={onSearch} className="p-1.5 active:bg-muted rounded" aria-label="Search">
              <Search size={16} className="text-muted-foreground" />
            </button>
          )}
          <button onClick={onNotifications} className="p-1.5 active:bg-muted rounded relative" aria-label="Notifications">
            <Bell size={16} className="text-muted-foreground" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] flex items-center justify-center font-bold">
                {notificationCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* App grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {categories.map(cat => (
          <div key={cat.name} className="mb-4">
            <p className="font-display text-[8px] tracking-[0.2em] uppercase text-muted-foreground/50 mb-2 px-1">{cat.name}</p>
            <div className="grid grid-cols-4 gap-1">
              {cat.apps.map(({ app, title, icon, label }) => (
                <button
                  key={app}
                  onClick={() => handleOpenApp(app, title)}
                  className="flex flex-col items-center justify-center py-3 rounded-lg active:bg-primary/10 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground mb-1.5">
                    {icon}
                  </div>
                  <span className="font-body text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom dock */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[55] flex items-center justify-around px-6 h-16 bg-card/95 backdrop-blur-md border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {dockApps.map(({ app, title, icon, label }) => {
          const isOpen = windows.some(w => w.app === app);
          return (
            <button
              key={app}
              onClick={() => handleOpenApp(app, title)}
              className="flex flex-col items-center gap-0.5 p-2 rounded-lg active:bg-primary/10 transition-colors"
            >
              <div className={`${isOpen ? 'text-primary' : 'text-muted-foreground'}`}>{icon}</div>
              <span className={`text-[9px] font-body ${isOpen ? 'text-primary' : 'text-muted-foreground/70'}`}>{label}</span>
              {isOpen && <div className="w-1 h-1 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
