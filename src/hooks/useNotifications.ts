import { useState, useEffect, useCallback, useRef } from 'react';
import { AppType } from '@/types/os';

export interface NotificationEvent {
  id: string;
  title: string;
  message: string;
  enabled: boolean;
  triggerApps: AppType[];
}

export interface OSNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
}

const DEFAULT_EVENTS: NotificationEvent[] = [
  { id: 'evt-1', title: 'PrimeNet', message: 'New node joined lattice at ⟨71,73,79⟩', enabled: false, triggerApps: ['primenet', 'browser'] },
  { id: 'evt-2', title: 'Q3 Engine', message: 'Inference batch complete — 512 samples, 507μs avg', enabled: false, triggerApps: ['q3inference'] },
  { id: 'evt-3', title: 'Energy', message: 'COP spike detected at 3.8 — harvesting surplus', enabled: false, triggerApps: ['energy', 'monitor'] },
  { id: 'evt-4', title: 'FoldMem', message: 'Auto-compact triggered — 0% fragmentation restored', enabled: false, triggerApps: ['foldmem'] },
  { id: 'evt-5', title: 'GeomC', message: 'Background compilation: 23 folds optimized', enabled: false, triggerApps: ['geomc'] },
  { id: 'evt-6', title: 'PFS', message: 'Semantic index updated — 1,247 regions mapped', enabled: false, triggerApps: ['files'] },
  { id: 'evt-7', title: 'Storage', message: 'Adinkra encoding complete — 75% compression achieved', enabled: false, triggerApps: ['storage'] },
  { id: 'evt-8', title: 'QK Scheduler', message: 'Fibonacci Waltz cycle #4,096 — all qutrit states balanced', enabled: false, triggerApps: ['processes', 'terminal'] },
  { id: 'evt-9', title: 'PrimeNet', message: 'Geodesic route optimized — latency ↓ 12%', enabled: false, triggerApps: ['primenet', 'browser'] },
  { id: 'evt-10', title: 'Energy', message: 'Satellite mode: 320W output from 100W input', enabled: false, triggerApps: ['energy', 'monitor'] },
];

function loadEvents(): NotificationEvent[] {
  try {
    const saved = localStorage.getItem('prime-os-notif-events');
    if (!saved) return DEFAULT_EVENTS;
    const parsed = JSON.parse(saved);
    // Migrate old events without triggerApps
    return parsed.map((e: any) => ({
      ...e,
      triggerApps: e.triggerApps || DEFAULT_EVENTS.find(d => d.id === e.id)?.triggerApps || [],
    }));
  } catch {
    return DEFAULT_EVENTS;
  }
}

export function useNotifications(activeApps: AppType[] = []) {
  const [events, setEvents] = useState<NotificationEvent[]>(loadEvents);
  const [notifications, setNotifications] = useState<OSNotification[]>([]);
  const openedAppsRef = useRef<Set<AppType>>(new Set());
  const sustainedAppsRef = useRef<Set<AppType>>(new Set());
  const lastIdleNotifRef = useRef<number>(0);

  useEffect(() => {
    localStorage.setItem('prime-os-notif-events', JSON.stringify(events));
  }, [events]);

  const pushNotification = useCallback((title: string, message: string) => {
    const notif: OSNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      message,
      timestamp: Date.now(),
    };
    setNotifications(prev => [notif, ...prev].slice(0, 10));
  }, []);

  // Context-aware: on app open (first time in session)
  useEffect(() => {
    const enabledEvents = events.filter(e => e.enabled);
    if (enabledEvents.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const app of activeApps) {
      if (!openedAppsRef.current.has(app)) {
        openedAppsRef.current.add(app);
        // 40% chance of notification on first open
        if (Math.random() < 0.4) {
          const matching = enabledEvents.filter(e => e.triggerApps.includes(app));
          if (matching.length > 0) {
            const evt = matching[Math.floor(Math.random() * matching.length)];
            const delay = 3000 + Math.random() * 2000;
            timers.push(setTimeout(() => pushNotification(evt.title, evt.message), delay));
          }
        }
      }
    }

    return () => timers.forEach(clearTimeout);
  }, [activeApps, events, pushNotification]);

  // Context-aware: sustained use (30s+)
  useEffect(() => {
    const enabledEvents = events.filter(e => e.enabled);
    if (enabledEvents.length === 0 || activeApps.length === 0) return;

    const timer = setTimeout(() => {
      for (const app of activeApps) {
        if (!sustainedAppsRef.current.has(app)) {
          sustainedAppsRef.current.add(app);
          if (Math.random() < 0.5) {
            const matching = enabledEvents.filter(e => e.triggerApps.includes(app));
            if (matching.length > 0) {
              const evt = matching[Math.floor(Math.random() * matching.length)];
              pushNotification(evt.title, evt.message);
              break; // only one sustained notification at a time
            }
          }
        }
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [activeApps, events, pushNotification]);

  // Context-aware: idle notifications
  useEffect(() => {
    const enabledEvents = events.filter(e => e.enabled);
    if (enabledEvents.length === 0) return;
    if (activeApps.length > 0) return; // not idle

    const timer = setTimeout(() => {
      const now = Date.now();
      if (now - lastIdleNotifRef.current < 60000) return;
      lastIdleNotifRef.current = now;
      const evt = enabledEvents[Math.floor(Math.random() * enabledEvents.length)];
      pushNotification(evt.title, evt.message);
    }, 20000);

    return () => clearTimeout(timer);
  }, [activeApps, events, pushNotification]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const toggleEvent = useCallback((id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, enabled: !e.enabled } : e));
  }, []);

  const updateEventMessage = useCallback((id: string, message: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, message } : e));
  }, []);

  const addEvent = useCallback((title: string, message: string) => {
    setEvents(prev => [...prev, { id: `evt-${Date.now()}`, title, message, enabled: true, triggerApps: [] }]);
  }, []);

  const removeEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  return { notifications, dismissNotification, events, toggleEvent, updateEventMessage, addEvent, removeEvent };
}
