import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, X, ExternalLink, Key, User as UserIcon,
  Keyboard, MessageSquare, Rocket, Check, Loader2, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface SetupWizardProps {
  user: User | null;
  onComplete: () => void;
  onOpenRokcat: () => void;
}

/* ─── Step Components ─── */

function WelcomeStep({ user }: { user: User | null }) {
  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'Operator';
  const avatar = user?.user_metadata?.avatar_url;
  return (
    <div className="flex flex-col items-center gap-4">
      {avatar ? (
        <img src={avatar} alt="" className="w-16 h-16 rounded-full border-2 border-primary/40" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center">
          <span className="font-display text-2xl font-bold text-primary">{name[0]}</span>
        </div>
      )}
      <h3 className="font-display text-sm tracking-wider text-foreground">
        Welcome, <span className="text-primary">{name}</span>
      </h3>
      <p className="text-[11px] text-muted-foreground text-center leading-relaxed max-w-xs">
        PRIME OS is a geometric computing environment powered by AI.
        This quick setup will configure your workspace in under a minute.
      </p>
    </div>
  );
}

function BYOKStep({ user }: { user: User | null }) {
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleTestAndSave = useCallback(async () => {
    if (!apiKey.trim()) return;
    setTesting(true);
    setError('');
    try {
      // Test the key
      const { data: testResult, error: testErr } = await supabase.functions.invoke('ai-key-manager', {
        body: { action: 'test-key', provider: 'xai', apiKey: apiKey.trim() },
      });
      if (testErr) throw new Error(testErr.message);
      if (!testResult?.valid) {
        setError(testResult?.error || 'Invalid API key. Please check and try again.');
        setTesting(false);
        return;
      }
      // Save the key
      const { error: saveErr } = await supabase.functions.invoke('ai-key-manager', {
        body: { action: 'save-key', provider: 'xai', apiKey: apiKey.trim() },
      });
      if (saveErr) throw new Error(saveErr.message);
      setSaved(true);
    } catch (e: any) {
      setError(e.message || 'Failed to validate key');
    } finally {
      setTesting(false);
    }
  }, [apiKey]);

  if (saved) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
          <Check size={20} className="text-primary" />
        </div>
        <p className="text-xs text-primary font-display tracking-wider">API Key Connected</p>
        <p className="text-[10px] text-muted-foreground text-center">
          Your xAI key is securely stored. ROKCAT is now powered by Grok.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="text-center">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          For the best experience, connect your own <span className="text-primary font-medium">xAI (Grok)</span> API key.
          ROKCAT is built for Grok's personality and reasoning.
        </p>
      </div>

      <a
        href="https://console.x.ai"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-primary/30 bg-primary/5 text-primary text-xs font-display tracking-wider hover:bg-primary/10 transition-colors"
      >
        <Key size={14} />
        Get your key at console.x.ai
        <ExternalLink size={12} />
      </a>

      <div className="flex gap-2">
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="Paste xAI API key here..."
          className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          onClick={handleTestAndSave}
          disabled={!apiKey.trim() || testing}
          className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 flex items-center gap-1.5"
        >
          {testing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {testing ? 'Testing...' : 'Connect'}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-destructive text-[10px]">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-[9px] text-muted-foreground/60 text-center">
        You can also add OpenAI, Anthropic, or Gemini keys later in Settings → AI Provider.
      </p>
    </div>
  );
}

function ProfileStep({ user }: { user: User | null }) {
  const meta = user?.user_metadata || {};
  const [displayName, setDisplayName] = useState(meta.full_name || '');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').upsert({
        user_id: user.id,
        display_name: displayName.trim() || meta.full_name || 'Operator',
        title: title.trim() || null,
        avatar_url: meta.avatar_url || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      setSaved(true);
    } catch {} finally {
      setSaving(false);
    }
  }, [user, displayName, title, meta]);

  return (
    <div className="flex flex-col gap-3 w-full">
      <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
        Personalize how you appear across PRIME OS.
      </p>
      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground font-mono">DISPLAY NAME</label>
        <input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Your name..."
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground font-mono">TITLE (optional)</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Lattice Engineer, Founder..."
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 flex items-center gap-1.5 mx-auto"
      >
        {saved ? <><Check size={12} /> Saved</> : saving ? <><Loader2 size={12} className="animate-spin" /> Saving...</> : 'Save Profile'}
      </button>
    </div>
  );
}

function NavigationStep() {
  const tips = [
    { icon: <Keyboard size={13} />, label: 'Ctrl+K', desc: 'Global search & app launcher' },
    { icon: <span className="text-[10px]">↔</span>, label: 'Drag', desc: 'Move & resize windows' },
    { icon: <span className="text-[10px]">⬅➡</span>, label: 'Snap', desc: 'Snap windows to edges' },
    { icon: <span className="text-[10px]">2×</span>, label: 'Double-click', desc: 'Maximize title bar' },
  ];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-muted-foreground text-center">Key shortcuts and gestures:</p>
      <div className="grid grid-cols-2 gap-2">
        {tips.map((t, i) => (
          <div key={i} className="flex items-center gap-2 bg-muted/30 rounded px-2 py-1.5 border border-border/50">
            <span className="text-primary">{t.icon}</span>
            <div>
              <span className="text-[10px] text-primary font-mono">{t.label}</span>
              <p className="text-[9px] text-muted-foreground">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground/60 text-center">
        Right-click the desktop for quick actions. Use the taskbar to switch windows.
      </p>
    </div>
  );
}

function MeetRokcatStep() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-14 h-14 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
        <MessageSquare size={22} className="text-primary" />
      </div>
      <div className="text-center space-y-2">
        <h4 className="font-display text-xs tracking-wider text-foreground">Meet ROKCAT</h4>
        <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs">
          ROKCAT is your geometric AI companion — powered by Grok.
          Ask questions, run commands, manage your workspace, or just chat.
          ROKCAT learns your preferences and remembers context across sessions.
        </p>
      </div>
    </div>
  );
}

/* ─── Steps Config ─── */

const STEPS = [
  { title: 'Welcome', subtitle: 'Geometric Computing Environment', icon: Rocket },
  { title: 'Power Your AI', subtitle: 'Bring Your Own Key', icon: Key },
  { title: 'Your Profile', subtitle: 'Personalize Your Identity', icon: UserIcon },
  { title: 'Navigation', subtitle: 'Desktop & Shortcuts', icon: Keyboard },
  { title: 'ROKCAT', subtitle: 'Your AI Companion', icon: MessageSquare },
];

/* ─── Main Component ─── */

export default function SetupWizard({ user, onComplete, onOpenRokcat }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const handleSkip = useCallback(() => {
    localStorage.setItem('prime-os-setup-completed', 'true');
    onComplete();
  }, [onComplete]);

  const handleFinish = useCallback(() => {
    if (dontShow) localStorage.setItem('prime-os-setup-completed', 'true');
    onComplete();
    onOpenRokcat();
  }, [dontShow, onComplete, onOpenRokcat]);

  const stepContent = [
    <WelcomeStep user={user} />,
    <BYOKStep user={user} />,
    <ProfileStep user={user} />,
    <NavigationStep />,
    <MeetRokcatStep />,
  ];

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-[400px] max-w-[92vw] rounded-lg border border-primary/30 bg-card shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <current.icon size={14} className="text-primary" />
            <div>
              <h2 className="font-display text-xs tracking-[0.15em] uppercase text-primary">
                {current.title}
              </h2>
              <p className="font-mono text-[9px] text-muted-foreground mt-0.5">{current.subtitle}</p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close setup"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5 min-h-[200px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {isLast ? (
                <div className="flex flex-col items-center gap-4">
                  {stepContent[step]}
                  <button
                    onClick={handleFinish}
                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-display text-xs tracking-wider hover:bg-primary/90 transition-colors"
                  >
                    <Rocket size={14} />
                    Launch ROKCAT
                  </button>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dontShow}
                      onChange={e => setDontShow(e.target.checked)}
                      className="w-3 h-3 rounded border-border accent-primary"
                    />
                    <span className="text-[9px] text-muted-foreground">Don't show again</span>
                  </label>
                </div>
              ) : (
                stepContent[step]
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
          <button
            onClick={handleSkip}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors font-mono"
          >
            Skip Setup
          </button>

          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === step ? 'bg-primary' : i < step ? 'bg-primary/50' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Previous step"
              >
                <ChevronLeft size={14} />
              </button>
            )}
            {!isLast && (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-mono hover:bg-primary/20 transition-colors"
              >
                {step === 1 && !document.querySelector('[data-byok-saved]') ? 'Skip' : 'Next'} <ChevronRight size={12} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
