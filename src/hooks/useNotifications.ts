import { useState, useEffect, useCallback } from 'react';

export interface NotificationEvent {
  id: string;
  title: string;
  message: string;
  enabled: boolean;
}

export interface OSNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
}

const DEFAULT_EVENTS: NotificationEvent[] = [
  { id: 'evt-1', title: 'PrimeNet', message: 'New node joined lattice at ⟨71,73,79⟩', enabled: false },
  { id: 'evt-2', title: 'Q3 Engine', message: 'Inference batch complete — 512 samples, 507μs avg', enabled: false },
  { id: 'evt-3', title: 'Energy', message: 'COP spike detected at 3.8 — harvesting surplus', enabled: false },
  { id: 'evt-4', title: 'FoldMem', message: 'Auto-compact triggered — 0% fragmentation restored', enabled: false },
  { id: 'evt-5', title: 'GeomC', message: 'Background compilation: 23 folds optimized', enabled: false },
  { id: 'evt-6', title: 'PFS', message: 'Semantic index updated — 1,247 regions mapped', enabled: false },
  { id: 'evt-7', title: 'Storage', message: 'Adinkra encoding complete — 75% compression achieved', enabled: false },
  { id: 'evt-8', title: 'QK Scheduler', message: 'Fibonacci Waltz cycle #4,096 — all qutrit states balanced', enabled: false },
  { id: 'evt-9', title: 'PrimeNet', message: 'Geodesic route optimized — latency ↓ 12%', enabled: false },
  { id: 'evt-10', title: 'Energy', message: 'Satellite mode: 320W output from 100W input', enabled: false },
];

function loadEvents(): NotificationEvent[] {
  try {
    const saved = localStorage.getItem('prime-os-notif-events');
    return saved ? JSON.parse(saved) : DEFAULT_EVENTS;
  } catch {
    return DEFAULT_EVENTS;
  }
}

export function useNotifications() {
  const [events, setEvents] = useState<NotificationEvent[]>(loadEvents);
  const [notifications, setNotifications] = useState<OSNotification[]>([]);

  useEffect(() => {
    localStorage.setItem('prime-os-notif-events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    const enabledEvents = events.filter(e => e.enabled);
    if (enabledEvents.length === 0) return;

    const scheduleNext = () => {
      const delay = 8000 + Math.random() * 15000;
      return setTimeout(() => {
        const current = events.filter(e => e.enabled);
        if (current.length === 0) return;
        const event = current[Math.floor(Math.random() * current.length)];
        const notif: OSNotification = {
          id: `notif-${Date.now()}`,
          title: event.title,
          message: event.message,
          timestamp: Date.now(),
        };
        setNotifications(prev => [notif, ...prev].slice(0, 10));
        timerId = scheduleNext();
      }, delay);
    };
    let timerId = scheduleNext();
    return () => clearTimeout(timerId);
  }, [events]);

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
    setEvents(prev => [...prev, { id: `evt-${Date.now()}`, title, message, enabled: true }]);
  }, []);

  const removeEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  return { notifications, dismissNotification, events, toggleEvent, updateEventMessage, addEvent, removeEvent };
}
