import { useState, useEffect } from 'react';

interface SettingsState {
  scanLines: boolean;
  gridBackground: boolean;
  accentTheme: 'cyan' | 'violet' | 'amber';
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

export default function SettingsApp() {
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const saved = localStorage.getItem('prime-os-settings');
      return saved ? JSON.parse(saved) : { scanLines: true, gridBackground: true, accentTheme: 'cyan' };
    } catch {
      return { scanLines: true, gridBackground: true, accentTheme: 'cyan' };
    }
  });

  useEffect(() => {
    localStorage.setItem('prime-os-settings', JSON.stringify(settings));
    // Apply effects
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

      <div className="space-y-1 mb-6">
        <h3 className="font-display text-[10px] tracking-wider uppercase text-muted-foreground mb-2">Visual Effects</h3>
        <Toggle label="Scan Lines" value={settings.scanLines} onChange={v => setSettings(s => ({ ...s, scanLines: v }))} />
        <Toggle label="Grid Background" value={settings.gridBackground} onChange={v => setSettings(s => ({ ...s, gridBackground: v }))} />
      </div>

      <div>
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

      <div className="mt-6 pt-4 border-t border-border">
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
