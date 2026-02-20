import { useEffect, useCallback, useRef } from 'react';

interface UseIdleTimeoutOptions {
  timeout: number; // ms
  onIdle: () => void;
  enabled?: boolean;
}

export function useIdleTimeout({ timeout, onIdle, enabled = true }: UseIdleTimeoutOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (enabled && timeout > 0) {
      timerRef.current = setTimeout(() => onIdleRef.current(), timeout);
    }
  }, [timeout, enabled]);

  useEffect(() => {
    if (!enabled || timeout <= 0) return;

    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart', 'click'];
    const handler = () => resetTimer();

    events.forEach(evt => window.addEventListener(evt, handler, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer, enabled, timeout]);

  return { resetTimer };
}
