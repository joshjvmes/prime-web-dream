import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { eventBus } from './useEventBus';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  reminder_minutes: number | null;
}

export function useCalendarReminders(
  pushNotification: (title: string, message: string) => void,
  openCalendar: () => void,
  enabled: boolean
) {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 60 * 1000);

      const { data: events } = await (supabase.from('calendar_events') as any)
        .select('id, title, start_time, reminder_minutes')
        .gte('start_time', now.toISOString())
        .lte('start_time', in30.toISOString())
        .not('reminder_minutes', 'is', null);

      if (!events) return;

      for (const evt of events as CalendarEvent[]) {
        if (!evt.reminder_minutes || firedRef.current.has(evt.id)) continue;

        const startTime = new Date(evt.start_time);
        const reminderTime = new Date(startTime.getTime() - evt.reminder_minutes * 60 * 1000);

        if (now >= reminderTime && now < startTime) {
          firedRef.current.add(evt.id);
          const minsLeft = Math.round((startTime.getTime() - now.getTime()) / 60000);
          pushNotification('Calendar', `"${evt.title}" starts in ${minsLeft} minute${minsLeft !== 1 ? 's' : ''}`);
          eventBus.emit('calendar.event.starting', { title: evt.title, id: evt.id });
        }
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [enabled, pushNotification, openCalendar]);
}
