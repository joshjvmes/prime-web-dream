import { useState, useEffect, useCallback } from 'react';

export interface OSNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
}

const EVENTS = [
  { title: 'PrimeNet', message: 'New node joined lattice at ⟨71,73,79⟩' },
  { title: 'Q3 Engine', message: 'Inference batch complete — 512 samples, 507μs avg' },
  { title: 'Energy', message: 'COP spike detected at 3.8 — harvesting surplus' },
  { title: 'FoldMem', message: 'Auto-compact triggered — 0% fragmentation restored' },
  { title: 'GeomC', message: 'Background compilation: 23 folds optimized' },
  { title: 'PFS', message: 'Semantic index updated — 1,247 regions mapped' },
  { title: 'Storage', message: 'Adinkra encoding complete — 75% compression achieved' },
  { title: 'QK Scheduler', message: 'Fibonacci Waltz cycle #4,096 — all qutrit states balanced' },
  { title: 'PrimeNet', message: 'Geodesic route optimized — latency ↓ 12%' },
  { title: 'Energy', message: 'Satellite mode: 320W output from 100W input' },
];

export function useNotifications() {
  const [notifications, setNotifications] = useState<OSNotification[]>([]);

  useEffect(() => {
    const scheduleNext = () => {
      const delay = 8000 + Math.random() * 15000; // 8-23 seconds
      return setTimeout(() => {
        const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
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
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return { notifications, dismissNotification };
}
