import { useEffect, useRef, useCallback } from 'react';
import { eventBus } from '@/hooks/useEventBus';
import { supabase } from '@/integrations/supabase/client';

interface ActivityEntry {
  action: string;
  target: string;
  metadata?: Record<string, unknown>;
}

const TRACKED_EVENTS: Record<string, (payload: any) => ActivityEntry> = {
  'app.opened': (p) => ({ action: 'app.opened', target: p?.app || 'unknown' }),
  'app.closed': (p) => ({ action: 'app.closed', target: p?.app || 'unknown' }),
  'file.uploaded': (p) => ({ action: 'file.uploaded', target: p?.name || 'file' }),
  'file.deleted': (p) => ({ action: 'file.deleted', target: p?.name || 'file' }),
  'trade.executed': (p) => ({ action: 'trade.executed', target: p?.symbol || '', metadata: { action: p?.action, qty: p?.quantity } }),
  'wallet.transfer': (p) => ({ action: 'wallet.transfer', target: `${p?.amount} ${p?.token_type}` }),
  'bet.placed': (p) => ({ action: 'bet.placed', target: p?.market || '', metadata: { side: p?.side, amount: p?.amount } }),
  'booking.created': (p) => ({ action: 'booking.created', target: p?.resource || '' }),
  'booking.cancelled': (p) => ({ action: 'booking.cancelled', target: p?.resource || '' }),
  'clipboard.copied': (p) => ({ action: 'clipboard.copied', target: 'clipboard' }),
  'social.post.created': (p) => ({ action: 'social.post.created', target: 'PrimeSocial' }),
  'mail.received': (p) => ({ action: 'mail.received', target: p?.from || 'unknown' }),
  'agent.action.logged': (p) => ({ action: 'agent.action.logged', target: p?.tool || '' }),
  'canvas.draw': () => ({ action: 'canvas.draw', target: 'PrimeCanvas' }),
  'spreadsheet.create': (p) => ({ action: 'spreadsheet.create', target: p?.name || 'sheet' }),
  'audio.control': (p) => ({ action: 'audio.control', target: p?.action || 'unknown' }),
  'market.checked': () => ({ action: 'market.checked', target: 'PrimeSignals' }),
};

export function useActivityTracker(enabled: boolean = true) {
  const bufferRef = useRef<ActivityEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Check privacy setting
  const isSharing = useCallback(() => {
    try {
      const s = localStorage.getItem('prime-os-activity-sharing');
      return s !== 'false'; // default on
    } catch { return true; }
  }, []);

  // Flush buffer to database
  const flush = useCallback(async () => {
    if (!bufferRef.current.length || !userIdRef.current || !isSharing()) {
      bufferRef.current = [];
      return;
    }

    const entries = bufferRef.current.splice(0, bufferRef.current.length);
    const userId = userIdRef.current;

    try {
      const rows = entries.map(e => ({
        user_id: userId,
        action: e.action,
        target: e.target,
        metadata: (e.metadata || {}) as Record<string, string | number | boolean>,
      }));
      await supabase.from('user_activity').insert(rows);
    } catch (err) {
      console.error('[ActivityTracker] flush error:', err);
    }
  }, [isSharing]);

  // Schedule flush
  const scheduleFlush = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flush();
    }, 3000);
  }, [flush]);

  // Track auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      userIdRef.current = session?.user?.id || null;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      userIdRef.current = session?.user?.id || null;
    });
    return () => subscription.unsubscribe();
  }, []);

  // Listen to EventBus
  useEffect(() => {
    if (!enabled) return;

    const handlers: [string, (payload: any) => void][] = [];

    for (const [event, mapper] of Object.entries(TRACKED_EVENTS)) {
      const handler = (payload: any) => {
        const entry = mapper(payload);
        bufferRef.current.push(entry);
        scheduleFlush();
      };
      eventBus.on(event, handler);
      handlers.push([event, handler]);
    }

    return () => {
      handlers.forEach(([event, handler]) => eventBus.off(event, handler));
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      flush(); // Final flush on unmount
    };
  }, [enabled, scheduleFlush, flush]);
}
