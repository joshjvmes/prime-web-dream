import { useState, useEffect, useCallback } from 'react';
import { eventBus } from '@/hooks/useEventBus';
import { NotificationEvent } from '@/hooks/useNotifications';
import { type PulseSettings, loadPulseSettings, savePulseSettings } from '@/hooks/useSystemPulse';
import { Trash2, Plus, Bell, BellOff, Monitor, Keyboard, Mouse, Volume2, Info, User, Lock, LayoutGrid, Mic, LogOut, Sparkles, Camera, RotateCcw, Brain, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useCloudStorage } from '@/hooks/useCloudStorage';

interface SettingsState {
  scanLines: boolean;
  gridBackground: boolean;
  accentTheme: 'cyan' | 'violet' | 'amber';
  windowOpacity: number;
  animationSpeed: 'slow' | 'normal' | 'fast';
  fontSize: 'compact' | 'default' | 'large';
  keyRepeatRate: number;
  keyRepeatDelay: number;
  keyboardLayout: string;
  inputMethod: string;
  cursorSpeed: number;
  doubleClickSpeed: number;
  scrollDirection: 'natural' | 'standard';
  pointerPrecision: boolean;
  cursorTheme: string;
  masterVolume: number;
  systemSounds: boolean;
  notificationSound: boolean;
  alertVolume: number;
  soundTheme: string;
}

interface LockSettings {
  pinEnabled: boolean;
  pin: string;
  wallpaper: string;
  autoLock: boolean;
  autoLockTimeout: number;
}

interface WidgetToggles {
  clock: boolean;
  stats: boolean;
  notes: boolean;
  network: boolean;
  forge: boolean;
  agentLog: boolean;
  rokcat: boolean;
}

interface SettingsAppProps {
  notifEvents?: NotificationEvent[];
  onToggleEvent?: (id: string) => void;
  onUpdateMessage?: (id: string, message: string) => void;
  onAddEvent?: (title: string, message: string) => void;
  onRemoveEvent?: (id: string) => void;
  onLock?: () => void;
  user?: SupabaseUser | null;
}

const DEFAULTS: SettingsState = {
  scanLines: true, gridBackground: true, accentTheme: 'cyan',
  windowOpacity: 0.95, animationSpeed: 'normal', fontSize: 'default',
  keyRepeatRate: 50, keyRepeatDelay: 300, keyboardLayout: 'QWERTY', inputMethod: 'Standard',
  cursorSpeed: 50, doubleClickSpeed: 50, scrollDirection: 'standard', pointerPrecision: true, cursorTheme: 'Default',
  masterVolume: 80, systemSounds: true, notificationSound: true, alertVolume: 60, soundTheme: 'Geometric',
};

const THEMES = {
  cyan: { primary: '180 100% 50%', ring: '180 100% 50%', border: '180 40% 15%' },
  violet: { primary: '260 80% 60%', ring: '260 80% 60%', border: '260 30% 20%' },
  amber: { primary: '45 100% 55%', ring: '45 100% 55%', border: '45 30% 20%' },
};

function applyTheme(theme: 'cyan' | 'violet' | 'amber') {
  const root = document.documentElement;
  const t = THEMES[theme];
  root.style.setProperty('--primary', t.primary);
  root.style.setProperty('--ring', t.ring);
  root.style.setProperty('--border', t.border);
}

type Panel = 'profile' | 'display' | 'keyboard' | 'mouse' | 'audio' | 'notifications' | 'lock' | 'widgets' | 'voice' | 'ambience' | 'ai' | 'activity' | 'about';

const PANELS: { id: Panel; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User size={14} /> },
  { id: 'display', label: 'Display', icon: <Monitor size={14} /> },
  { id: 'ambience', label: 'Ambience', icon: <Sparkles size={14} /> },
  { id: 'lock', label: 'Lock & Security', icon: <Lock size={14} /> },
  { id: 'widgets', label: 'Widgets', icon: <LayoutGrid size={14} /> },
  { id: 'voice', label: 'Voice Control', icon: <Mic size={14} /> },
  { id: 'ai', label: 'AI Provider', icon: <Brain size={14} /> },
  { id: 'activity', label: 'Activity Sharing', icon: <Eye size={14} /> },
  { id: 'keyboard', label: 'Keyboard', icon: <Keyboard size={14} /> },
  { id: 'mouse', label: 'Mouse', icon: <Mouse size={14} /> },
  { id: 'audio', label: 'Audio', icon: <Volume2 size={14} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
  { id: 'about', label: 'About', icon: <Info size={14} /> },
];

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <div
    className="flex items-center justify-between py-2 px-1 -mx-1 rounded cursor-pointer hover:bg-muted/30 transition-colors"
    onClick={() => onChange(!value)}
  >
    <span className="font-body text-xs text-card-foreground">{label}</span>
    <div className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${value ? 'bg-primary/60' : 'bg-muted'}`}>
      <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${value ? 'left-4 bg-primary' : 'left-0.5 bg-muted-foreground'}`} />
    </div>
  </div>
);

const SliderRow = ({ label, value, onChange, min, max, suffix }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; suffix?: string }) => (
  <div className="py-1.5">
    <div className="flex items-center justify-between mb-1">
      <span className="font-body text-xs text-card-foreground">{label}</span>
      <span className="text-[10px] text-muted-foreground">{value}{suffix}</span>
    </div>
    <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-primary h-1" />
  </div>
);

const PROVIDER_MODELS: Record<string, { label: string; models: { value: string; label: string }[] }> = {
  default: { label: 'Default (Built-in)', models: [] },
  xai: { label: 'xAI (Grok)', models: [
    { value: 'grok-4-latest', label: 'Grok 4' },
    { value: 'grok-3', label: 'Grok 3' },
    { value: 'grok-3-mini', label: 'Grok 3 Mini' },
    { value: 'grok-3-fast', label: 'Grok 3 Fast' },
  ]},
  openai: { label: 'OpenAI', models: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'o1', label: 'o1' },
    { value: 'o1-mini', label: 'o1 Mini' },
  ]},
  anthropic: { label: 'Anthropic', models: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  ]},
  google: { label: 'Google Gemini', models: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ]},
};

function AIProviderPanel({ user, cloudSave, cloudLoad, isSignedIn, SectionTitle }: {
  user?: SupabaseUser | null;
  cloudSave: (key: string, value: unknown) => Promise<void>;
  cloudLoad: <T = unknown>(key: string, fallback?: T) => Promise<T | undefined>;
  isSignedIn: boolean;
  SectionTitle: React.FC<{ children: string }>;
}) {
  const [provider, setProvider] = useState('default');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isSignedIn || loaded) return;
    cloudLoad<{ provider: string; model: string }>('ai-provider').then(data => {
      if (data) {
        setProvider(data.provider || 'default');
        setModel(data.model || '');
      }
    });
    supabase.functions.invoke('ai-key-manager', { body: { action: 'get-config' } }).then(({ data }) => {
      if (data?.configuredProviders) {
        setConfiguredProviders(data.configuredProviders.map((p: any) => p.provider));
      }
    });
    setLoaded(true);
  }, [isSignedIn, loaded, cloudLoad]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await cloudSave('ai-provider', { provider, model });
      if (apiKey && provider !== 'default') {
        await supabase.functions.invoke('ai-key-manager', {
          body: { action: 'save-key', provider, apiKey, model },
        });
        setConfiguredProviders(prev => prev.includes(provider) ? prev : [...prev, provider]);
        setApiKey('');
      }
    } catch {} finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!apiKey || provider === 'default') return;
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await supabase.functions.invoke('ai-key-manager', {
        body: { action: 'test-key', provider, apiKey },
      });
      setTestResult(data || { success: false, error: 'No response' });
    } catch (e) {
      setTestResult({ success: false, error: 'Connection failed' });
    } finally { setTesting(false); }
  };

  const handleDelete = async (prov: string) => {
    await supabase.functions.invoke('ai-key-manager', {
      body: { action: 'delete-key', provider: prov },
    });
    setConfiguredProviders(prev => prev.filter(p => p !== prov));
    if (provider === prov) {
      setProvider('default');
      setModel('');
      await cloudSave('ai-provider', { provider: 'default', model: '' });
    }
  };

  if (!user) {
    return (
      <div className="space-y-1">
        <SectionTitle>AI Provider</SectionTitle>
        <p className="text-[10px] text-muted-foreground">Sign in to configure your own AI provider and unlock unchained access to your preferred model.</p>
      </div>
    );
  }

  const models = PROVIDER_MODELS[provider]?.models || [];

  return (
    <div className="space-y-1">
      <SectionTitle>AI Provider</SectionTitle>
      <p className="text-[10px] text-muted-foreground mb-3">
        Connect your xAI (Grok) API key to power ROKCAT and all AI features. OpenAI, Anthropic, and Google Gemini are also supported.
      </p>

      <SectionTitle>Provider</SectionTitle>
      <div className="flex flex-wrap gap-1.5 py-1">
        {Object.entries(PROVIDER_MODELS).map(([key, { label }]) => (
          <button key={key} onClick={() => { setProvider(key); setModel(PROVIDER_MODELS[key]?.models[0]?.value || ''); setTestResult(null); }}
            className={`px-3 py-1.5 rounded border text-[10px] font-display tracking-wider transition-all ${
              provider === key
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            }`}>
            {label}
            {configuredProviders.includes(key) && <span className="ml-1 text-primary">●</span>}
          </button>
        ))}
      </div>

      {provider !== 'default' && (
        <>
          <SectionTitle>Model</SectionTitle>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground"
          >
            {models.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <SectionTitle>API Key</SectionTitle>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setTestResult(null); }}
              placeholder={configuredProviders.includes(provider) ? '••••••••  (key saved — enter new to replace)' : 'Paste your API key'}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 pr-8"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={handleTest}
              disabled={!apiKey || testing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-[10px] font-display tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-40"
            >
              {testing ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
              Test Key
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (provider !== 'default' && !apiKey && !configuredProviders.includes(provider))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-primary/30 text-primary text-[10px] font-display tracking-wider hover:bg-primary/10 transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 size={10} className="animate-spin" /> : null}
              Save Configuration
            </button>
          </div>

          {testResult && (
            <div className={`mt-2 p-2 rounded border text-[10px] ${
              testResult.success
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}>
              {testResult.success ? (
                <span className="flex items-center gap-1"><CheckCircle size={10} /> Key validated successfully!</span>
              ) : (
                <span className="flex items-center gap-1"><XCircle size={10} /> {testResult.error || 'Invalid key'}</span>
              )}
            </div>
          )}
        </>
      )}

      {configuredProviders.length > 0 && (
        <>
          <SectionTitle>Configured Keys</SectionTitle>
          <div className="space-y-1">
            {configuredProviders.map(p => (
              <div key={p} className="flex items-center justify-between p-2 rounded border border-border bg-card/50">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${provider === p ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                  <span className="text-[10px] text-foreground">{PROVIDER_MODELS[p]?.label || p}</span>
                  {provider === p && <span className="text-[8px] text-primary font-display tracking-wider">ACTIVE</span>}
                </div>
                <button onClick={() => handleDelete(p)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionTitle>How It Works</SectionTitle>
      <div className="text-[10px] text-muted-foreground space-y-1.5">
        <p>• Keys are stored encrypted server-side and never leave the backend</p>
        <p>• All AI features (Hypersphere, ROKCAT, BotLab, MiniApps) route through your provider</p>
        <p>• If your key fails, the system falls back to the built-in AI</p>
        <p>• Select "Default" to use the built-in AI at any time</p>
      </div>
    </div>
  );
}

export default function SettingsApp({ notifEvents = [], onToggleEvent, onUpdateMessage, onAddEvent, onRemoveEvent, onLock, user }: SettingsAppProps) {
  const [activePanel, setActivePanel] = useState<Panel>('profile');
  const [profileName, setProfileName] = useState(() => {
    try { const p = localStorage.getItem('prime-os-profile'); return p ? JSON.parse(p).name || '' : ''; } catch { return ''; }
  });
  const [profileTitle, setProfileTitle] = useState(() => {
    try { const p = localStorage.getItem('prime-os-profile'); return p ? JSON.parse(p).title || '' : ''; } catch { return ''; }
  });
  const [profileBio, setProfileBio] = useState('');
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(() => {
    try { const saved = localStorage.getItem('prime-os-settings'); return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS; } catch { return DEFAULTS; }
  });
  const [lockSettings, setLockSettings] = useState<LockSettings>(() => {
    try { const s = localStorage.getItem('prime-os-lock-settings'); return s ? { pinEnabled: false, pin: '', wallpaper: 'lattice', autoLock: false, autoLockTimeout: 5, ...JSON.parse(s) } : { pinEnabled: false, pin: '', wallpaper: 'lattice', autoLock: false, autoLockTimeout: 5 }; } catch { return { pinEnabled: false, pin: '', wallpaper: 'lattice', autoLock: false, autoLockTimeout: 5 }; }
  });
  const [widgetToggles, setWidgetToggles] = useState<WidgetToggles>(() => {
    try { const s = localStorage.getItem('prime-os-widgets'); return s ? { clock: true, stats: true, notes: true, network: true, forge: true, agentLog: true, rokcat: true, ...JSON.parse(s) } : { clock: true, stats: true, notes: true, network: true, forge: true, agentLog: true, rokcat: true }; } catch { return { clock: true, stats: true, notes: true, network: true, forge: true, agentLog: true, rokcat: true }; }
  });

  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [pulseSettings, setPulseSettings] = useState<PulseSettings>(loadPulseSettings);
  const [customAvatar, setCustomAvatar] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  const updatePulse = <K extends keyof PulseSettings>(key: K, value: PulseSettings[K]) => {
    setPulseSettings(prev => {
      const next = { ...prev, [key]: value };
      savePulseSettings(next);
      return next;
    });
  };

  // Dispatch custom event so Desktop/OSWindow pick up changes live
  useEffect(() => {
    localStorage.setItem('prime-os-settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('prime-settings-changed'));
    const desktop = document.querySelector('.prime-grid');
    if (desktop) {
      desktop.classList.toggle('scan-lines', settings.scanLines);
      desktop.classList.toggle('prime-grid', settings.gridBackground);
    }
    applyTheme(settings.accentTheme);
  }, [settings]);

  useEffect(() => { localStorage.setItem('prime-os-lock-settings', JSON.stringify(lockSettings)); }, [lockSettings]);

  useEffect(() => {
    const current = JSON.parse(localStorage.getItem('prime-os-widgets') || '{}');
    localStorage.setItem('prime-os-widgets', JSON.stringify({ ...current, ...widgetToggles }));
    eventBus.emit('widgets.updated');
  }, [widgetToggles]);

  // Cloud sync
  const { save: cloudSave, load: cloudLoad, isSignedIn } = useCloudStorage();

  // Save to cloud when settings change (debounced)
  useEffect(() => {
    if (!isSignedIn) return;
    const timeout = setTimeout(() => {
      cloudSave('os-settings', { settings, lockSettings: { ...lockSettings, pin: undefined }, widgetToggles });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [settings, lockSettings, widgetToggles, isSignedIn, cloudSave]);

  // Load from cloud on first profile load
  const [cloudLoaded, setCloudLoaded] = useState(false);
  useEffect(() => {
    if (!isSignedIn || cloudLoaded) return;
    cloudLoad<{ settings?: SettingsState; lockSettings?: Partial<LockSettings>; widgetToggles?: WidgetToggles }>('os-settings').then(data => {
      if (data) {
        if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
        if (data.lockSettings) setLockSettings(prev => ({ ...prev, ...data.lockSettings }));
        if (data.widgetToggles) setWidgetToggles(prev => ({ ...prev, ...data.widgetToggles }));
      }
      setCloudLoaded(true);
    });
  }, [isSignedIn, cloudLoaded, cloudLoad]);

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) =>
    setSettings(s => ({ ...s, [key]: value }));

  
  const SelectRow = ({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="font-body text-xs text-card-foreground">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="bg-background border border-border rounded px-2 py-0.5 text-[10px] text-foreground">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const SectionTitle = ({ children }: { children: string }) => (
    <h3 className="font-display text-[10px] tracking-wider uppercase text-muted-foreground mb-2 mt-3 first:mt-0">{children}</h3>
  );

  const saveProfile = (name: string, title: string, bio?: string) => {
    localStorage.setItem('prime-os-profile', JSON.stringify({ name, title }));
    // Also save to database if signed in
    if (user) {
      supabase.from('profiles').update({
        display_name: name || null,
        title: title || 'Operator',
        bio: bio !== undefined ? bio : profileBio,
      }).eq('user_id', user.id).then(() => {});
    }
  };

  // Load profile from database when user is signed in
  useEffect(() => {
    if (!user || profileLoaded) return;
    supabase.from('profiles').select('display_name, title, bio, avatar_url').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.display_name) setProfileName(data.display_name);
          if (data.title) setProfileTitle(data.title);
          if (data.bio) setProfileBio(data.bio);
          if (data.avatar_url) setCustomAvatar(data.avatar_url);
        }
        setProfileLoaded(true);
      });
    supabase.from('user_roles').select('role').eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setUserRoles(data.map(r => r.role));
      });
  }, [user, profileLoaded]);

  const renderPanel = () => {
    switch (activePanel) {
      case 'profile': {
        const googleName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
        const googleEmail = user?.email || '';
        const googleAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
        return (
          <div className="space-y-1">
            <SectionTitle>User Profile</SectionTitle>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative group">
                {user && (customAvatar || googleAvatar) ? (
                  <Avatar className="w-14 h-14 border border-primary/40">
                    <AvatarImage src={customAvatar || googleAvatar} alt={googleName} />
                    <AvatarFallback className="bg-primary/20 text-primary font-display text-lg">
                      {(googleName || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <span className="font-display text-lg text-primary">{(profileName || 'O').charAt(0).toUpperCase()}</span>
                  </div>
                )}
                {user && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="avatar-upload"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !user) return;
                        setAvatarUploading(true);
                        try {
                          const ext = file.name.split('.').pop() || 'png';
                          const path = `${user.id}/avatar.${ext}`;
                          await supabase.storage.from('user-files').upload(path, file, { upsert: true });
                          const { data: { publicUrl } } = supabase.storage.from('user-files').getPublicUrl(path);
                          // Use signed URL since bucket is private
                          const { data: signedData } = await supabase.storage.from('user-files').createSignedUrl(path, 60 * 60 * 24 * 365);
                          const url = signedData?.signedUrl || publicUrl;
                          setCustomAvatar(url);
                          await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', user.id);
                        } catch {} finally { setAvatarUploading(false); }
                      }}
                    />
                    <label htmlFor="avatar-upload" className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera size={16} className="text-primary" />
                    </label>
                    {avatarUploading && (
                      <div className="absolute inset-0 rounded-full bg-background/80 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <p className="text-foreground text-xs">{googleName || profileName || 'Operator'}</p>
                <p className="text-muted-foreground/60 text-[10px]">{profileTitle || 'PRIME Operator'}</p>
                {googleEmail && <p className="text-muted-foreground/40 text-[9px]">{googleEmail}</p>}
                {user && <p className="text-[8px] text-muted-foreground/30 mt-0.5">Hover avatar to change</p>}
              </div>
            </div>
            {user && (
              <div className="mb-3 p-2 rounded border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-primary font-display tracking-wider">SIGNED IN WITH GOOGLE</p>
                  {userRoles.map(r => (
                    <span key={r} className={`px-1.5 py-0.5 rounded text-[8px] font-display tracking-wider uppercase ${
                      r === 'admin' ? 'bg-primary/20 text-primary' : r === 'moderator' ? 'bg-amber-500/20 text-amber-400' : 'bg-muted text-muted-foreground'
                    }`}>{r}</span>
                  ))}
                </div>
                {user.created_at && (
                  <p className="text-[9px] text-muted-foreground/50 mt-1">Member since {new Date(user.created_at).toLocaleDateString()}</p>
                )}
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded border border-destructive/30 text-destructive text-[10px] font-display tracking-wider hover:bg-destructive/10 transition-colors"
                >
                  <LogOut size={10} />
                  Sign Out
                </button>
              </div>
            )}
            <div className="space-y-2">
              <div>
                <label className="font-body text-xs text-card-foreground block mb-1">Display Name</label>
                <input value={profileName} onChange={e => { setProfileName(e.target.value); saveProfile(e.target.value, profileTitle); }}
                  placeholder="Operator" className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50" />
              </div>
              <div>
                <label className="font-body text-xs text-card-foreground block mb-1">Title / Role</label>
                <input value={profileTitle} onChange={e => { setProfileTitle(e.target.value); saveProfile(profileName, e.target.value); }}
                  placeholder="Geometric Engineer" className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50" />
              </div>
              {user && (
                <div>
                  <label className="font-body text-xs text-card-foreground block mb-1">Bio</label>
                  <textarea value={profileBio} onChange={e => { setProfileBio(e.target.value); saveProfile(profileName, profileTitle, e.target.value); }}
                    placeholder="Tell us about yourself..." rows={3} className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 resize-none" />
                </div>
              )}
            </div>
          </div>
        );
      }
      case 'display':
        return (
          <div className="space-y-1">
            <SectionTitle>Visual Effects</SectionTitle>
            <Toggle label="Scan Lines" value={settings.scanLines} onChange={v => update('scanLines', v)} />
            <Toggle label="Grid Background" value={settings.gridBackground} onChange={v => update('gridBackground', v)} />
            <SectionTitle>Accent Color</SectionTitle>
            <div className="flex gap-2 py-1">
              {(['cyan', 'violet', 'amber'] as const).map(theme => (
                <button key={theme} onClick={() => update('accentTheme', theme)}
                  className={`px-3 py-1.5 rounded border text-[10px] font-display tracking-wider uppercase transition-all ${
                    settings.accentTheme === theme ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}>{theme}</button>
              ))}
            </div>
            <SectionTitle>Window</SectionTitle>
            <SliderRow label="Window Opacity" value={Math.round(settings.windowOpacity * 100)} onChange={v => update('windowOpacity', v / 100)} min={70} max={100} suffix="%" />
            <SectionTitle>Animation Speed</SectionTitle>
            <div className="flex gap-2 py-1">
              {(['slow', 'normal', 'fast'] as const).map(speed => (
                <button key={speed} onClick={() => update('animationSpeed', speed)}
                  className={`px-3 py-1 rounded border text-[10px] font-display tracking-wider uppercase transition-all ${
                    settings.animationSpeed === speed ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                  }`}>{speed}</button>
              ))}
            </div>
            <SectionTitle>Font Size</SectionTitle>
            <div className="flex gap-2 py-1">
              {(['compact', 'default', 'large'] as const).map(size => (
                <button key={size} onClick={() => update('fontSize', size)}
                  className={`px-3 py-1 rounded border text-[10px] font-display tracking-wider uppercase transition-all ${
                    settings.fontSize === size ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                  }`}>{size}</button>
              ))}
            </div>
            <div className="mt-4">
              <button onClick={() => setSettings(s => ({ ...s, ...{ scanLines: true, gridBackground: true, accentTheme: 'cyan' as const, windowOpacity: 0.95, animationSpeed: 'normal' as const, fontSize: 'default' as const } }))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-muted-foreground/30 text-muted-foreground text-[10px] font-display tracking-wider hover:bg-muted/30 transition-colors">
                <RotateCcw size={10} /> Reset Defaults
              </button>
            </div>
          </div>
        );

      case 'lock':
        return (
          <div className="space-y-1">
            <SectionTitle>Lock Screen PIN</SectionTitle>
            <Toggle label="Enable PIN Lock" value={lockSettings.pinEnabled} onChange={v => setLockSettings(s => ({ ...s, pinEnabled: v }))} />
            {lockSettings.pinEnabled && (
              <div className="mt-2">
                <label className="font-body text-xs text-card-foreground block mb-1">Set PIN (4-6 digits)</label>
                <input type="password" maxLength={6} value={lockSettings.pin}
                  onChange={e => setLockSettings(s => ({ ...s, pin: e.target.value.replace(/\D/g, '') }))}
                  placeholder="••••" className="w-32 bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground font-mono tracking-widest" />
              </div>
            )}
            <SectionTitle>Auto-Lock</SectionTitle>
            <Toggle label="Auto-lock after inactivity" value={lockSettings.autoLock} onChange={v => setLockSettings(s => ({ ...s, autoLock: v }))} />
            {lockSettings.autoLock && (
              <div className="flex items-center justify-between py-1.5">
                <span className="font-body text-xs text-card-foreground">Timeout</span>
                <select
                  value={lockSettings.autoLockTimeout}
                  onChange={e => setLockSettings(s => ({ ...s, autoLockTimeout: Number(e.target.value) }))}
                  className="bg-background border border-border rounded px-2 py-0.5 text-[10px] text-foreground"
                >
                  <option value={1}>1 min</option>
                  <option value={2}>2 min</option>
                  <option value={5}>5 min</option>
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                </select>
              </div>
            )}
            <SectionTitle>Wallpaper</SectionTitle>
            <div className="flex gap-2 py-1">
              {['lattice', 'nebula', 'void'].map(wp => (
                <button key={wp} onClick={() => setLockSettings(s => ({ ...s, wallpaper: wp }))}
                  className={`px-3 py-1.5 rounded border text-[10px] font-display tracking-wider uppercase transition-all ${
                    lockSettings.wallpaper === wp ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                  }`}>{wp}</button>
              ))}
            </div>
            <SectionTitle>Quick Actions</SectionTitle>
            <button onClick={onLock} className="px-3 py-1.5 rounded border border-primary/30 text-primary text-[10px] font-display tracking-wider hover:bg-primary/10 transition-colors">
              Lock Now (Ctrl+L)
            </button>
            <SectionTitle>Shortcuts</SectionTitle>
            <div className="border border-border rounded overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-[10px] text-muted-foreground">Lock Screen</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-[9px] text-foreground font-mono">Ctrl+L</kbd>
              </div>
            </div>
          </div>
        );

      case 'voice':
        return (
          <div className="space-y-1">
            <SectionTitle>Voice Control</SectionTitle>
            <p className="text-[10px] text-muted-foreground mb-3">
              Control PRIME OS with your voice using the browser's built-in Speech Recognition. Works in Chrome and Edge.
            </p>
            <Toggle
              label="Enable Voice Control"
              value={localStorage.getItem('prime-os-voice-enabled') === 'true'}
              onChange={v => {
                localStorage.setItem('prime-os-voice-enabled', String(v));
                window.dispatchEvent(new Event('storage'));
              }}
            />
            <SectionTitle>Wake Words</SectionTitle>
            <p className="text-[10px] text-muted-foreground">Say <span className="text-primary">"Prime"</span> or <span className="text-primary">"Computer"</span> before a command.</p>
            <SectionTitle>Supported Commands</SectionTitle>
            <div className="border border-border rounded overflow-hidden">
              {[
                ['"Open [app]"', 'Opens an application'],
                ['"Close [app]"', 'Closes an application'],
                ['"Lock screen"', 'Locks the OS'],
                ['"Search"', 'Opens global search'],
                ['"Switch workspace [1-4]"', 'Switches workspace'],
                ['"Minimize"', 'Minimizes focused window'],
                ['"Maximize"', 'Maximizes focused window'],
              ].map(([cmd, desc]) => (
                <div key={cmd} className="flex items-center justify-between px-2 py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-[10px] text-primary font-mono">{cmd}</span>
                  <span className="text-[9px] text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'ambience':
        return (
          <div className="space-y-1">
            <SectionTitle>System Pulse</SectionTitle>
            <p className="text-[10px] text-muted-foreground mb-3">
              The system generates ambient life signs — subtle notifications that make PRIME OS feel alive and breathing.
            </p>
            <Toggle label="Enable System Pulse" value={pulseSettings.enabled} onChange={v => updatePulse('enabled', v)} />
            <SectionTitle>Pulse Frequency</SectionTitle>
            <div className="flex gap-2 py-1">
              {(['calm', 'normal', 'active'] as const).map(freq => (
                <button key={freq} onClick={() => updatePulse('frequency', freq)}
                  className={`px-3 py-1 rounded border text-[10px] font-display tracking-wider uppercase transition-all ${
                    pulseSettings.frequency === freq ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                  }`}>{freq}</button>
              ))}
            </div>
            <SectionTitle>Hyper AI Tips</SectionTitle>
            <p className="text-[10px] text-muted-foreground mb-2">
              Hyper periodically sends contextual tips and suggestions based on what you're doing.
            </p>
            <Toggle label="Enable AI Tips" value={pulseSettings.aiTips} onChange={v => updatePulse('aiTips', v)} />
          </div>
        );

      case 'widgets':
        return (
          <div className="space-y-1">
            <SectionTitle>Desktop Widgets</SectionTitle>
            <p className="text-[10px] text-muted-foreground mb-3">Toggle widgets visible on the desktop. Drag them to reposition.</p>
            <Toggle label="Clock Widget" value={widgetToggles.clock} onChange={v => setWidgetToggles(s => ({ ...s, clock: v }))} />
            <Toggle label="System Stats Widget" value={widgetToggles.stats} onChange={v => setWidgetToggles(s => ({ ...s, stats: v }))} />
            <Toggle label="Quick Notes Widget" value={widgetToggles.notes} onChange={v => setWidgetToggles(s => ({ ...s, notes: v }))} />
            <Toggle label="Network Status Widget" value={widgetToggles.network} onChange={v => setWidgetToggles(s => ({ ...s, network: v }))} />
            <Toggle label="Forge Market Widget" value={widgetToggles.forge} onChange={v => setWidgetToggles(s => ({ ...s, forge: v }))} />
            <Toggle label="Agent Activity Widget" value={widgetToggles.agentLog} onChange={v => setWidgetToggles(s => ({ ...s, agentLog: v }))} />
            <Toggle label="ROKCAT Assistant" value={widgetToggles.rokcat} onChange={v => setWidgetToggles(s => ({ ...s, rokcat: v }))} />
            <div className="mt-4">
              <button onClick={() => setWidgetToggles({ clock: true, stats: true, notes: true, network: true, forge: true, agentLog: true, rokcat: true })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-muted-foreground/30 text-muted-foreground text-[10px] font-display tracking-wider hover:bg-muted/30 transition-colors">
                <RotateCcw size={10} /> Reset Defaults
              </button>
            </div>
          </div>
        );

      case 'keyboard':
        return (
          <div className="space-y-1">
            <SectionTitle>Keyboard Shortcuts</SectionTitle>
            <div className="border border-border rounded overflow-hidden mb-3">
              {[
                ['Ctrl+K', 'Global Search'],
                ['Ctrl+W', 'Close Window'],
                ['Ctrl+M', 'Minimize Window'],
                ['Ctrl+Shift+M', 'Maximize / Restore'],
                ['Ctrl+L', 'Lock Screen'],
                ['Ctrl+`', 'Open Terminal'],
                ['Ctrl+Shift+A', 'Open PrimeAgent'],
                ['Ctrl+Shift+V', 'Clipboard Manager'],
                ['Ctrl+1-4', 'Switch Workspace'],
                ['Alt+1-4', 'Switch Workspace'],
                ['Alt+Tab', 'Cycle Windows'],
                ['Alt+Shift+Tab', 'Cycle Backwards'],
                ['Alt+F4', 'Close Window'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between px-2 py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-[10px] text-muted-foreground">{desc}</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted text-[9px] text-foreground font-mono">{key}</kbd>
                </div>
              ))}
            </div>
            <SectionTitle>Repeat Settings</SectionTitle>
            <SliderRow label="Key Repeat Rate" value={settings.keyRepeatRate} onChange={v => update('keyRepeatRate', v)} min={10} max={100} />
            <SliderRow label="Key Repeat Delay" value={settings.keyRepeatDelay} onChange={v => update('keyRepeatDelay', v)} min={100} max={1000} suffix="ms" />
            <SectionTitle>Layout</SectionTitle>
            <SelectRow label="Keyboard Layout" value={settings.keyboardLayout} options={['QWERTY', 'Dvorak', 'Colemak']} onChange={v => update('keyboardLayout', v)} />
            <SelectRow label="Input Method" value={settings.inputMethod} options={['Standard', 'Geometric', 'Qutrit']} onChange={v => update('inputMethod', v)} />
          </div>
        );

      case 'mouse':
        return (
          <div className="space-y-1">
            <SectionTitle>Pointer</SectionTitle>
            <SliderRow label="Cursor Speed" value={settings.cursorSpeed} onChange={v => update('cursorSpeed', v)} min={1} max={100} />
            <SliderRow label="Double-click Speed" value={settings.doubleClickSpeed} onChange={v => update('doubleClickSpeed', v)} min={1} max={100} />
            <Toggle label="Pointer Precision" value={settings.pointerPrecision} onChange={v => update('pointerPrecision', v)} />
            <SectionTitle>Scrolling</SectionTitle>
            <div className="flex items-center justify-between py-1.5">
              <span className="font-body text-xs text-card-foreground">Scroll Direction</span>
              <div className="flex gap-1">
                {(['natural', 'standard'] as const).map(dir => (
                  <button key={dir} onClick={() => update('scrollDirection', dir)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                      settings.scrollDirection === dir ? 'bg-primary/10 text-primary border border-primary/30' : 'text-muted-foreground border border-border hover:text-foreground'
                    }`}>{dir}</button>
                ))}
              </div>
            </div>
            <SectionTitle>Cursor Theme</SectionTitle>
            <div className="flex gap-2 py-1">
              {['Default', 'Crosshair', 'Lattice'].map(theme => (
                <button key={theme} onClick={() => update('cursorTheme', theme)}
                  className={`px-3 py-1 rounded border text-[10px] font-display tracking-wider uppercase transition-all ${
                    settings.cursorTheme === theme ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                  }`}>{theme}</button>
              ))}
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-1">
            <SectionTitle>Volume</SectionTitle>
            <SliderRow label="Master Volume" value={settings.masterVolume} onChange={v => update('masterVolume', v)} min={0} max={100} suffix="%" />
            <SliderRow label="Alert Volume" value={settings.alertVolume} onChange={v => update('alertVolume', v)} min={0} max={100} suffix="%" />
            <SectionTitle>Sound</SectionTitle>
            <Toggle label="System Sounds" value={settings.systemSounds} onChange={v => update('systemSounds', v)} />
            <Toggle label="Notification Sound" value={settings.notificationSound} onChange={v => update('notificationSound', v)} />
            <SectionTitle>Theme</SectionTitle>
            <SelectRow label="Sound Theme" value={settings.soundTheme} options={['Geometric', 'Minimal', 'Silent']} onChange={v => update('soundTheme', v)} />
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-1">
            <SectionTitle>Notification Events</SectionTitle>
            <div className="space-y-1.5 max-h-48 overflow-y-auto mb-3">
              {notifEvents.map(evt => (
                <div key={evt.id} className="flex items-start gap-2 p-2 rounded border border-border bg-card/50">
                  <button onClick={() => onToggleEvent?.(evt.id)} className={`shrink-0 mt-0.5 ${evt.enabled ? 'text-primary' : 'text-muted-foreground/40'}`}>
                    {evt.enabled ? <Bell size={12} /> : <BellOff size={12} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[9px] tracking-wider uppercase text-primary/80">{evt.title}</p>
                    {editingId === evt.id ? (
                      <input className="w-full bg-background border border-border rounded px-1 py-0.5 text-[10px] text-foreground mt-0.5"
                        value={editText} onChange={e => setEditText(e.target.value)}
                        onBlur={() => { onUpdateMessage?.(evt.id, editText); setEditingId(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') { onUpdateMessage?.(evt.id, editText); setEditingId(null); } }}
                        autoFocus />
                    ) : (
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight cursor-pointer hover:text-foreground"
                        onClick={() => { setEditingId(evt.id); setEditText(evt.message); }} title="Click to edit">{evt.message}</p>
                    )}
                  </div>
                  <button onClick={() => onRemoveEvent?.(evt.id)} className="shrink-0 text-muted-foreground hover:text-destructive mt-0.5"><Trash2 size={11} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input placeholder="Source" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                className="w-20 bg-background border border-border rounded px-1.5 py-1 text-[10px] text-foreground placeholder:text-muted-foreground/50" />
              <input placeholder="Message text..." value={newMessage} onChange={e => setNewMessage(e.target.value)}
                className="flex-1 bg-background border border-border rounded px-1.5 py-1 text-[10px] text-foreground placeholder:text-muted-foreground/50" />
              <button onClick={() => { if (newTitle.trim() && newMessage.trim()) { onAddEvent?.(newTitle.trim(), newMessage.trim()); setNewTitle(''); setNewMessage(''); } }}
                className="shrink-0 px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors"><Plus size={12} /></button>
            </div>
          </div>
        );

      case 'ai':
        return <AIProviderPanel user={user} cloudSave={cloudSave} cloudLoad={cloudLoad} isSignedIn={isSignedIn} SectionTitle={SectionTitle} />;

      case 'activity':
        return (
          <div className="space-y-3">
            <SectionTitle>Activity Sharing</SectionTitle>
            <p className="text-[10px] text-muted-foreground">
              When enabled, your actions (opening apps, trading, booking, etc.) are logged and shared with AI agents so they can understand your context and provide better assistance.
            </p>
            <Toggle
              label="Share activity with AI agents"
              value={(() => { try { return localStorage.getItem('prime-os-activity-sharing') !== 'false'; } catch { return true; } })()}
              onChange={(v) => { localStorage.setItem('prime-os-activity-sharing', String(v)); }}
            />
            <p className="text-[10px] text-muted-foreground/60">
              Activity data is automatically deleted after 24 hours. Only you and your AI agents can see your activity.
            </p>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-1">
            <SectionTitle>System</SectionTitle>
            <div className="space-y-1.5 text-muted-foreground text-xs">
              <p>PRIME OS v2.0</p>
              <p>Geometric Computing • T3-649</p>
              <p>Qutrit Kernel (QK) • 11D Folded Architecture</p>
              <p className="pt-2 text-muted-foreground/60 text-[10px]">© PRIME Labs — All dimensions reserved</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full bg-background flex font-mono text-xs">
      <div className="w-40 border-r border-border flex flex-col bg-card/30">
        <div className="px-3 py-2 border-b border-border">
          <h2 className="font-display text-[10px] tracking-wider uppercase text-primary">Settings</h2>
        </div>
        <div className="flex flex-col py-1">
          {PANELS.map(p => (
            <button key={p.id} onClick={() => setActivePanel(p.id)}
              className={`flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                activePanel === p.id ? 'bg-primary/10 text-primary border-r-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}>
              {p.icon}
              <span className="text-[10px]">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {renderPanel()}
      </div>
    </div>
  );
}
