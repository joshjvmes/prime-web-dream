import { useState, useEffect } from 'react';
import { AppType, WindowState } from '@/types/os';
import type { DeviceClass } from '@/hooks/useDeviceClass';
import { OSNotification } from '@/hooks/useNotifications';
import { Terminal, FolderTree, Activity, Cpu, Brain, Network, Code, HardDrive, Database, Zap, Settings, ChevronUp, Bell, X, Monitor, FileText, MessageSquare, Shield, Globe, Server, LayoutList, Image, Search, Link2, Orbit, CalendarDays, Moon, BookOpen, Table, Workflow, Paintbrush, Smartphone, Map, Package, Music, Dices, TrendingUp, Radio, Vault, Video, Mail, Users, Info, Bot, Cog, CalendarCheck, Wifi, Lock, Gamepad2, Clipboard, ShieldCheck, PenLine, Wallet, Blocks, Store } from 'lucide-react';
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import WorkspaceSwitcher from '@/components/os/WorkspaceSwitcher';
import VoiceControlIndicator from '@/components/os/VoiceControlIndicator';
import CopPopover from '@/components/os/CopPopover';
import CoresPopover from '@/components/os/CoresPopover';

interface TaskbarProps {
  windows: WindowState[];
  onOpenApp: (app: AppType, title: string) => void;
  onFocusWindow: (id: string) => void;
  notifications?: OSNotification[];
  onDismissNotification?: (id: string) => void;
  onSearch?: () => void;
  onOpenAbout?: () => void;
  onLock?: () => void;
  onCreateBot?: () => void;
  activeWorkspace: number;
  onSwitchWorkspace: (ws: number) => void;
  windowCountsByWorkspace: number[];
  voiceState?: { isListening: boolean; lastCommand: string; supported: boolean };
  onToggleVoice?: () => void;
  onToggleClipboard?: () => void;
  isAdmin?: boolean;
  deviceClass?: DeviceClass;
  user?: import('@supabase/supabase-js').User | null;
}

const allApps: { app: AppType; title: string; icon: React.ReactNode; label: string }[] = [
  { app: 'terminal', title: 'Prime Shell (psh)', icon: <Terminal size={18} />, label: 'Terminal' },
  { app: 'files', title: 'Prime File System', icon: <FolderTree size={18} />, label: 'Files' },
  { app: 'q3inference', title: 'Q3-Inference Engine', icon: <Brain size={18} />, label: 'Q3 Inference' },
  { app: 'primenet', title: 'PrimeNet Monitor', icon: <Network size={18} />, label: 'PrimeNet' },
  { app: 'geomc', title: 'GeomC Compiler', icon: <Code size={18} />, label: 'GeomC' },
  { app: 'foldmem', title: 'FoldMem Visualizer', icon: <HardDrive size={18} />, label: 'FoldMem' },
  { app: 'storage', title: 'Prime Storage', icon: <Database size={18} />, label: 'Storage' },
  { app: 'energy', title: 'Energy Monitor', icon: <Zap size={18} />, label: 'Energy' },
  { app: 'processes', title: 'Qutrit Processes', icon: <Activity size={18} />, label: 'Processes' },
  { app: 'sysinfo', title: 'System Info', icon: <Cpu size={18} />, label: 'SysInfo' },
  { app: 'monitor', title: 'System Monitor', icon: <Monitor size={18} />, label: 'Monitor' },
  { app: 'editor', title: 'PrimeEdit', icon: <FileText size={18} />, label: 'Editor' },
  { app: 'chat', title: 'PrimeChat', icon: <MessageSquare size={18} />, label: 'Chat' },
  { app: 'security', title: 'Lattice Shield', icon: <Shield size={18} />, label: 'Security' },
  { app: 'browser', title: 'PrimeBrowser', icon: <Globe size={18} />, label: 'Browser' },
  { app: 'datacenter', title: 'LatticeCore', icon: <Server size={18} />, label: 'Data Center' },
  { app: 'board', title: 'PrimeBoard', icon: <LayoutList size={18} />, label: 'Board' },
  { app: 'gallery', title: 'PrimeGallery', icon: <Image size={18} />, label: 'Gallery' },
  { app: 'cloudhooks', title: 'Cloud Hooks', icon: <Link2 size={18} />, label: 'Cloud Hooks' },
  { app: 'hypersphere', title: 'Hyper AI', icon: <Orbit size={18} />, label: 'Hyper AI' },
  { app: 'calendar', title: 'Prime Calendar', icon: <CalendarDays size={18} />, label: 'Calendar' },
  { app: 'docs', title: 'PrimeDocs', icon: <BookOpen size={18} />, label: 'Docs' },
  { app: 'spreadsheet', title: 'PrimeGrid', icon: <Table size={18} />, label: 'Spreadsheet' },
  { app: 'schemaforge', title: 'SchemaForge', icon: <Workflow size={18} />, label: 'SchemaForge' },
  { app: 'canvas', title: 'PrimeCanvas', icon: <Paintbrush size={18} />, label: 'Canvas' },
  { app: 'comm', title: 'PrimeComm', icon: <Smartphone size={18} />, label: 'PrimeComm' },
  { app: 'maps', title: 'PrimeMaps', icon: <Map size={18} />, label: 'Maps' },
  { app: 'pkg', title: 'PrimePkg', icon: <Package size={18} />, label: 'Packages' },
  { app: 'audio', title: 'PrimeAudio', icon: <Music size={18} />, label: 'Audio' },
  { app: 'bets', title: 'PrimeBets', icon: <Dices size={18} />, label: 'Bets' },
  { app: 'signals', title: 'PrimeSignals', icon: <TrendingUp size={18} />, label: 'Signals' },
  { app: 'stream', title: 'PrimeStream', icon: <Radio size={18} />, label: 'Stream' },
  { app: 'vault', title: 'PrimeVault', icon: <Vault size={18} />, label: 'Vault' },
  { app: 'videocall', title: 'PrimeLink', icon: <Video size={18} />, label: 'Video' },
  { app: 'mail', title: 'PrimeMail', icon: <Mail size={18} />, label: 'Mail' },
  { app: 'social', title: 'PrimeSocial', icon: <Users size={18} />, label: 'Social' },
  { app: 'agent', title: 'PrimeAgent', icon: <Bot size={18} />, label: 'Agent' },
  { app: 'robotics', title: 'PrimeRobotics', icon: <Cog size={18} />, label: 'Robotics' },
  { app: 'booking', title: 'PrimeBooking', icon: <CalendarCheck size={18} />, label: 'Booking' },
  { app: 'iot', title: 'PrimeIoT', icon: <Wifi size={18} />, label: 'IoT' },
  { app: 'arcade', title: 'PrimeArcade', icon: <Gamepad2 size={18} />, label: 'Arcade' },
  { app: 'journal', title: 'PrimeJournal', icon: <PenLine size={18} />, label: 'Journal' },
  { app: 'wallet', title: 'PrimeWallet', icon: <Wallet size={18} />, label: 'Wallet' },
  { app: 'miniapps', title: 'Mini Apps', icon: <Blocks size={18} />, label: 'Mini Apps' },
  { app: 'forge', title: 'App Forge', icon: <Store size={18} />, label: 'App Forge' },
  { app: 'admin', title: 'Admin Console', icon: <ShieldCheck size={18} />, label: 'Admin' },
  { app: 'rokcat', title: 'ROKCAT', icon: <Bot size={18} />, label: 'ROKCAT' },
  { app: 'settings', title: 'Settings', icon: <Settings size={18} />, label: 'Settings' },
];

export default function Taskbar({ windows, onOpenApp, onFocusWindow, notifications = [], onDismissNotification, onSearch, onOpenAbout, onLock, onCreateBot, activeWorkspace, onSwitchWorkspace, windowCountsByWorkspace, voiceState, onToggleVoice, onToggleClipboard, isAdmin, deviceClass = 'desktop', user }: TaskbarProps) {
  const isTablet = deviceClass === 'tablet';
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const userName = (() => {
    try {
      const p = localStorage.getItem('prime-os-profile');
      if (p) { const parsed = JSON.parse(p); return parsed.name || ''; }
    } catch {}
    return '';
  })();

  // Filter taskbar window buttons to current workspace
  const wsWindows = windows.filter(w => w.workspace === activeWorkspace);

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[100] flex items-center ${isTablet ? 'h-12' : 'h-10'} px-3 bg-card/90 backdrop-blur-md border-t border-border`}>
      {/* PRIME Menu Button */}
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button aria-label="PRIME menu" className="flex items-center gap-2 mr-4 pr-4 border-r border-border hover:bg-primary/10 rounded px-2 py-1 transition-colors">
            <div className="w-5 h-5 rounded-sm bg-primary/20 border border-primary/40 flex items-center justify-center">
              <span className="font-display text-[8px] font-bold text-primary">P</span>
            </div>
            <span className="font-display text-[9px] tracking-[0.2em] text-primary glow-text">PRIME</span>
            <ChevronUp size={10} className={`text-primary transition-transform ${menuOpen ? '' : 'rotate-180'}`} />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" sideOffset={8} className="w-56 p-2 bg-card/95 backdrop-blur-md border-border z-[200]">
          <div className="mb-2 px-2 pt-1">
            <p className="font-display text-[9px] tracking-[0.2em] uppercase text-primary">Applications</p>
          </div>
          <div className="flex flex-col gap-0.5 max-h-80 overflow-y-auto">
            {allApps.filter(a => a.app !== 'admin' || isAdmin).map(a => (
              <button
                key={a.app}
                onClick={() => {
                  const existing = windows.find(w => w.app === a.app);
                  if (existing) onFocusWindow(existing.id);
                  else onOpenApp(a.app, a.title);
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded text-xs font-body transition-all text-muted-foreground hover:text-foreground hover:bg-primary/10"
              >
                <span className="text-muted-foreground">{a.icon}</span>
                {a.label}
              </button>
            ))}
            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={() => { onOpenAbout?.(); setMenuOpen(false); }}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded text-xs font-body transition-all text-muted-foreground hover:text-foreground hover:bg-primary/10 w-full"
              >
                <Info size={18} className="text-muted-foreground" />
                About PRIME OS
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Search button */}
      {onSearch && (
        <button onClick={onSearch} aria-label="Global search (Ctrl+K)" className="mr-3 p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Search (Ctrl+K)">
          <Search size={14} />
        </button>
      )}

      {/* Workspace Switcher */}
      <WorkspaceSwitcher activeWorkspace={activeWorkspace} windowCounts={windowCountsByWorkspace} onSwitch={onSwitchWorkspace} />

      {/* Open windows (current workspace only) */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {wsWindows.map(w => {
          const appDef = allApps.find(a => a.app === w.app);
          return (
            <button
              key={w.id}
              onClick={() => onFocusWindow(w.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-body transition-all shrink-0 border ${
                w.isMinimized
                  ? 'bg-transparent text-muted-foreground border-border/50 opacity-60'
                  : 'bg-primary/10 text-primary border-primary/20'
              }`}
            >
              {appDef?.icon && <span className="[&>svg]:size-4">{appDef.icon}</span>}
              <span className="hidden sm:inline max-w-20 truncate">{w.title}</span>
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-3 shrink-0">
        {/* Voice Control */}
        {voiceState && onToggleVoice && (
          <VoiceControlIndicator
            isListening={voiceState.isListening}
            lastCommand={voiceState.lastCommand}
            supported={voiceState.supported}
            onToggle={onToggleVoice}
          />
        )}

        {/* Clipboard Manager */}
        {onToggleClipboard && (
          <button onClick={onToggleClipboard} aria-label="Clipboard (Ctrl+Shift+V)" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Clipboard (Ctrl+Shift+V)">
            <Clipboard size={13} />
          </button>
        )}

        {/* Bot Creator shortcut */}
        {onCreateBot && (
          <button onClick={onCreateBot} aria-label="Create Bot" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Create Bot">
            <Bot size={13} />
          </button>
        )}

        {/* Admin Console shortcut */}
        {isAdmin && (
          <button onClick={() => onOpenApp('admin', 'Admin Console')} aria-label="Admin Console" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Admin Console">
            <ShieldCheck size={13} />
          </button>
        )}

        {/* Sign In button (shown when not authenticated) */}
        {!user && onLock && (
          <button onClick={onLock} className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-primary/40 text-primary text-[10px] font-display tracking-wider hover:bg-primary/10 transition-colors animate-pulse" title="Sign in to unlock all features">
            <Lock size={11} />
            Sign In
          </button>
        )}

        {/* Lock button (shown when authenticated) */}
        {user && onLock && (
          <button onClick={onLock} aria-label="Lock (Ctrl+L)" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Lock (Ctrl+L)">
            <Lock size={13} />
          </button>
        )}

        {/* Notification Center */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <button aria-label="Notifications" className="relative p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Bell size={14} />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary text-primary-foreground text-[7px] flex items-center justify-center font-bold">
                  {notifications.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" sideOffset={8} className="w-72 p-0 bg-card/95 backdrop-blur-md border-border z-[200]">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <p className="font-display text-[9px] tracking-[0.2em] uppercase text-primary">Notifications</p>
              <span className="text-[9px] text-muted-foreground">{notifications.length} total</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-[10px] text-muted-foreground">No notifications</div>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} className="px-3 py-2 border-b border-border/50 hover:bg-muted/30 group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display text-[9px] tracking-wider uppercase text-primary">{notif.title}</p>
                        <p className="font-mono text-[10px] text-muted-foreground mt-0.5 leading-tight">{notif.message}</p>
                        <p className="text-[8px] text-muted-foreground/50 mt-0.5">
                          {new Date(notif.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                        </p>
                      </div>
                      <button
                        onClick={() => onDismissNotification?.(notif.id)}
                        className="shrink-0 p-0.5 text-muted-foreground/30 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* System pulse dot */}
        <div className="relative group" title="Lattice pulse: nominal">
          <span className="block w-2 h-2 rounded-full bg-primary/60 animate-pulse-glow" />
          <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '3s' }} />
        </div>

        <CopPopover onOpenApp={onOpenApp} />
        <CoresPopover onOpenApp={onOpenApp} />
        {userName && (
          <span className="text-[9px] font-mono text-muted-foreground/70 hidden md:inline">
            Op: {userName}
          </span>
        )}
        <ClockPopover onOpenApp={onOpenApp} />
      </div>
    </div>
  );
}

// Moon phase helpers
const SYNODIC_PERIOD = 29.53058867;
const KNOWN_NEW_MOON = new Date(2000, 0, 6, 18, 14);
const MOON_NAMES = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
const MOON_ICONS_CHAR = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];

function getMoonPhaseIdx(date: Date): number {
  const diff = date.getTime() - KNOWN_NEW_MOON.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  const phase = ((days % SYNODIC_PERIOD) + SYNODIC_PERIOD) % SYNODIC_PERIOD;
  return Math.floor(phase / (SYNODIC_PERIOD / 8)) % 8;
}

const MINI_WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function ClockPopover({ onOpenApp }: { onOpenApp: (app: AppType, title: string) => void }) {
  const [time, setTime] = useState('');
  const [clockOpen, setClockOpen] = useState(false);

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  const moonIdx = getMoonPhaseIdx(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  return (
    <Popover open={clockOpen} onOpenChange={setClockOpen}>
      <PopoverTrigger asChild>
        <button className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors">{time}</button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={8} className="w-52 p-3 bg-card/95 backdrop-blur-md border-border z-[200]">
        <p className="text-[10px] text-muted-foreground">{format(now, 'EEEE, MMMM d, yyyy')}</p>
        <p className="font-mono text-lg text-foreground mt-0.5">{time}</p>
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
          <span>{MOON_ICONS_CHAR[moonIdx]}</span>
          <span>{MOON_NAMES[moonIdx]}</span>
        </div>
        <div className="mt-2 border-t border-border pt-2">
          <div className="grid grid-cols-7 gap-px mb-0.5">
            {MINI_WEEKDAYS.map((d, i) => (
              <span key={i} className="text-center text-[8px] text-muted-foreground/50">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: startPad }).map((_, i) => <span key={`p${i}`} />)}
            {days.map(day => (
              <span key={day.getDate()} className={`text-center text-[8px] rounded-sm py-px ${isToday(day) ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground'}`}>
                {day.getDate()}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => { onOpenApp('calendar', 'Prime Calendar'); setClockOpen(false); }}
          className="mt-2 w-full text-[9px] py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors font-display tracking-wider uppercase"
        >
          Open Calendar
        </button>
      </PopoverContent>
    </Popover>
  );
}
