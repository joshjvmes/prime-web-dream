import { useState, useEffect } from 'react';
import { NotificationEvent } from '@/hooks/useNotifications';
import { Trash2, Plus, Bell, BellOff } from 'lucide-react';

interface SettingsState {
  scanLines: boolean;
  gridBackground: boolean;
  accentTheme: 'cyan' | 'violet' | 'amber';
}

interface SettingsAppProps {
  notifEvents?: NotificationEvent[];
  onToggleEvent?: (id: string) => void;
  onUpdateMessage?: (id: string, message: string) => void;
  onAddEvent?: (title: string, message: string) => void;
  onRemoveEvent?: (id: string) => void;
}

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

export default function SettingsApp({ notifEvents = [], onToggleEvent, onUpdateMessage, onAddEvent, onRemoveEvent }: SettingsAppProps) {
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const saved = localStorage.getItem('prime-os-settings');
      return saved ? JSON.parse(saved) : { scanLines: true, gridBackground: true, accentTheme: 'cyan' };
    } catch {
      return { scanLines: true, gridBackground: true, accentTheme: 'cyan' };
    }
  });

  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    localStorage.setItem('prime-os-settings', JSON.stringify(settings));
    const desktop = document.querySelector('.prime-grid');
    if (desktop) {
      desktop.classList.toggle('scan-lines', settings.scanLines);
      desktop.classList.toggle('prime-grid', settings.gridBackground);
    }
    applyTheme(settings.accentTheme);
  }, [settings]);

  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-2">
      <span className="font-body text-xs text-card-foreground">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-8 h-4 rounded-full transition-colors relative ${value ? 'bg-primary/60' : 'bg-muted'}`}
      >
        <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${value ? 'left-4 bg-primary' : 'left-0.5 bg-muted-foreground'}`} />
      </button>
    </div>
  );

  return (
    <div className="h-full bg-background p-4 font-mono text-xs overflow-y-auto">
      <h2 className="font-display text-sm tracking-wider uppercase text-primary mb-4">System Settings</h2>

      {/* Visual Effects */}
      <div className="space-y-1 mb-6">
        <h3 className="font-display text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Visual Effects</h3>
        <Toggle label="Scan Lines" value={settings.scanLines} onChange={v => setSettings(s => ({ ...s, scanLines: v }))} />
        <Toggle label="Grid Background" value={settings.gridBackground} onChange={v => setSettings(s => ({ ...s, gridBackground: v }))} />
      </div>

      {/* Accent Color */}
      <div className="mb-6">
        <h3 className="font-display text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Accent Color</h3>
        <div className="flex gap-2">
          {(['cyan', 'violet', 'amber'] as const).map(theme => (
            <button
              key={theme}
              onClick={() => setSettings(s => ({ ...s, accentTheme: theme }))}
              className={`px-3 py-1.5 rounded border text-[10px] font-display tracking-wider uppercase transition-all ${
                settings.accentTheme === theme
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      {/* Notification Events */}
      <div className="mb-6">
        <h3 className="font-display text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Notification Events</h3>
        <div className="space-y-1.5 max-h-48 overflow-y-auto mb-3">
          {notifEvents.map(evt => (
            <div key={evt.id} className="flex items-start gap-2 p-2 rounded border border-border bg-card/50">
              <button
                onClick={() => onToggleEvent?.(evt.id)}
                className={`shrink-0 mt-0.5 ${evt.enabled ? 'text-primary' : 'text-muted-foreground/40'}`}
                title={evt.enabled ? 'Disable' : 'Enable'}
              >
                {evt.enabled ? <Bell size={12} /> : <BellOff size={12} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[9px] tracking-wider uppercase text-primary/80">{evt.title}</p>
                {editingId === evt.id ? (
                  <input
                    className="w-full bg-background border border-border rounded px-1 py-0.5 text-[10px] text-foreground mt-0.5"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onBlur={() => { onUpdateMessage?.(evt.id, editText); setEditingId(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { onUpdateMessage?.(evt.id, editText); setEditingId(null); } }}
                    autoFocus
                  />
                ) : (
                  <p
                    className="text-[10px] text-muted-foreground mt-0.5 leading-tight cursor-pointer hover:text-foreground"
                    onClick={() => { setEditingId(evt.id); setEditText(evt.message); }}
                    title="Click to edit"
                  >
                    {evt.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => onRemoveEvent?.(evt.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive mt-0.5"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>

        {/* Add new event */}
        <div className="flex gap-1.5">
          <input
            placeholder="Source"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="w-20 bg-background border border-border rounded px-1.5 py-1 text-[10px] text-foreground placeholder:text-muted-foreground/50"
          />
          <input
            placeholder="Message text..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            className="flex-1 bg-background border border-border rounded px-1.5 py-1 text-[10px] text-foreground placeholder:text-muted-foreground/50"
          />
          <button
            onClick={() => {
              if (newTitle.trim() && newMessage.trim()) {
                onAddEvent?.(newTitle.trim(), newMessage.trim());
                setNewTitle('');
                setNewMessage('');
              }
            }}
            className="shrink-0 px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* About */}
      <div className="pt-4 border-t border-border">
        <h3 className="font-display text-[10px] tracking-wider uppercase text-muted-foreground mb-2">About</h3>
        <div className="space-y-1 text-muted-foreground">
          <p>PRIME OS v2.0</p>
          <p>Geometric Computing • T3-649</p>
          <p>Qutrit Kernel (QK) • 11D Folded Architecture</p>
        </div>
      </div>
    </div>
  );
}
