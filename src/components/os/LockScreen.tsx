import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, ChevronUp, LogIn, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { User } from '@supabase/supabase-js';

const SYNODIC_PERIOD = 29.53058867;
const KNOWN_NEW_MOON = new Date(2000, 0, 6, 18, 14);
const MOON_ICONS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
const MOON_NAMES = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];

function getMoonPhase(date: Date) {
  const diff = date.getTime() - KNOWN_NEW_MOON.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  const phase = ((days % SYNODIC_PERIOD) + SYNODIC_PERIOD) % SYNODIC_PERIOD;
  const idx = Math.floor(phase / (SYNODIC_PERIOD / 8)) % 8;
  return { icon: MOON_ICONS[idx], name: MOON_NAMES[idx] };
}

const WALLPAPERS: Record<string, string> = {
  lattice: 'radial-gradient(ellipse at 30% 50%, hsl(var(--primary) / 0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, hsl(var(--primary) / 0.05) 0%, transparent 50%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(220 20% 4%) 100%)',
  nebula: 'radial-gradient(ellipse at 20% 80%, hsl(260 60% 20% / 0.3) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, hsl(200 80% 20% / 0.2) 0%, transparent 60%), linear-gradient(180deg, hsl(240 15% 5%) 0%, hsl(260 20% 3%) 100%)',
  void: 'linear-gradient(180deg, hsl(0 0% 2%) 0%, hsl(0 0% 5%) 50%, hsl(0 0% 2%) 100%)',
};

interface LockScreenProps {
  onUnlock: () => void;
  user?: User | null;
}

export default function LockScreen({ onUnlock, user }: LockScreenProps) {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [wallpaper, setWallpaper] = useState('lattice');
  const [signingIn, setSigningIn] = useState(false);

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';

  useEffect(() => {
    try {
      const s = localStorage.getItem('prime-os-lock-settings');
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed.pinEnabled && parsed.pin) setPinEnabled(true);
        if (parsed.wallpaper) setWallpaper(parsed.wallpaper);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
      setDate(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const handleUnlock = useCallback(() => {
    if (pinEnabled && !showPinInput) {
      setShowPinInput(true);
      return;
    }
    if (pinEnabled) {
      try {
        const s = localStorage.getItem('prime-os-lock-settings');
        if (s) {
          const parsed = JSON.parse(s);
          if (parsed.pin && pinInput !== parsed.pin) {
            setPinError(true);
            setPinInput('');
            setTimeout(() => setPinError(false), 1500);
            return;
          }
        }
      } catch {}
    }
    setUnlocking(true);
    setTimeout(onUnlock, 600);
  }, [pinEnabled, showPinInput, pinInput, onUnlock]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
    } catch {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const moon = getMoonPhase(new Date());

  return (
    <AnimatePresence>
      {!unlocking && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center select-none cursor-pointer"
          style={{ background: WALLPAPERS[wallpaper] || WALLPAPERS.lattice }}
          onClick={() => !showPinInput && handleUnlock()}
        >
          {/* Geometric decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.04]" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.3">
                <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="60s" repeatCount="indefinite" />
              </circle>
              <circle cx="100" cy="100" r="70" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.3">
                <animateTransform attributeName="transform" type="rotate" from="360 100 100" to="0 100 100" dur="45s" repeatCount="indefinite" />
              </circle>
              <circle cx="100" cy="100" r="50" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.3">
                <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="30s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          {/* Signed-in user avatar */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-4 flex flex-col items-center gap-2"
              onClick={e => e.stopPropagation()}
            >
              <Avatar className="w-16 h-16 border-2 border-primary/30">
                <AvatarImage src={avatarUrl} alt={userName} />
                <AvatarFallback className="bg-primary/20 text-primary font-display text-xl">
                  {(userName || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs text-foreground/70 font-body">{userName}</p>
            </motion.div>
          )}

          {/* Time & Date */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center mb-8"
          >
            <h1 className="text-7xl font-display font-light tracking-wider text-foreground/90">{time}</h1>
            <p className="text-sm text-muted-foreground mt-2 font-body tracking-wide">{date}</p>
            <p className="text-xs text-muted-foreground/50 mt-1">{moon.icon} {moon.name}</p>
          </motion.div>

          {/* PRIME OS branding */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mb-12"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-sm bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="font-display text-[10px] font-bold text-primary">P</span>
              </div>
              <span className="font-display text-xs tracking-[0.3em] text-primary/50">PRIME OS</span>
            </div>
          </motion.div>

          {/* PIN Input or Unlock prompt */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            {showPinInput ? (
              <div className="flex flex-col items-center gap-3">
                <Lock size={20} className="text-primary/50" />
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                  placeholder="PIN"
                  autoFocus
                  className={`w-32 text-center bg-transparent border-b-2 ${pinError ? 'border-destructive' : 'border-primary/30'} text-foreground text-lg font-mono tracking-[0.5em] focus:outline-none focus:border-primary placeholder:text-muted-foreground/30 transition-colors`}
                />
                {pinError && <p className="text-destructive text-[10px] font-mono">Invalid PIN</p>}
                <button onClick={handleUnlock} className="mt-2 px-4 py-1.5 rounded border border-primary/30 text-primary text-xs font-display tracking-wider hover:bg-primary/10 transition-colors">
                  UNLOCK
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 animate-pulse">
                <ChevronUp size={18} className="text-muted-foreground/40" />
                <p className="text-[10px] text-muted-foreground/40 font-mono tracking-wider">
                  {pinEnabled ? 'CLICK TO ENTER PIN' : 'CLICK TO UNLOCK'}
                </p>
                <Unlock size={16} className="text-muted-foreground/30" />
              </div>
            )}
          </motion.div>

          {/* Google Sign-In / Sign-Out */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.4 }}
            className="mt-8 flex flex-col items-center gap-2"
            onClick={e => e.stopPropagation()}
          >
            {user ? (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 rounded border border-border/50 text-muted-foreground/60 text-[10px] font-mono tracking-wider hover:text-foreground hover:border-border transition-colors"
              >
                <LogOut size={12} />
                Sign Out
              </button>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="flex items-center gap-2 px-4 py-2 rounded border border-primary/30 text-primary/70 text-[10px] font-display tracking-wider hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
              >
                <LogIn size={12} />
                {signingIn ? 'Redirecting...' : 'Sign in with Google'}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
