import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, subMonths,
  getDay, isSameDay, isToday, getMonth, addDays, addWeeks, isSameMonth
} from 'date-fns';
import { ChevronLeft, ChevronRight, Diamond, Sun, Moon, Plus } from 'lucide-react';
import { eventBus } from '@/hooks/useEventBus';
import { supabase } from '@/integrations/supabase/client';
import EventModal from './calendar/EventModal';
import {
  getMoonPhaseIndex, getMoonIllumination, getMoonPhase,
  MOON_PHASE_NAMES, MOON_PHASE_ICONS, SYNODIC_PERIOD,
  isPrime, primeFactorization, latticeCoord,
  getSeasonTint, getSolarCategory, getSolarProgress,
  CalendarEvent, EVENT_COLORS,
} from './calendar/calendarUtils';

const SYSTEM_EVENTS = [
  { title: 'Q3 batch scheduled', offset: 3 },
  { title: 'Energy harvest peak', offset: 7 },
  { title: 'Lattice maintenance window', offset: 12 },
  { title: 'PrimeNet sync cycle', offset: 18 },
  { title: 'FoldMem defrag window', offset: 24 },
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const GUEST_STORAGE_KEY = 'prime-os-calendar-events';

function loadGuestEvents(): CalendarEvent[] {
  try { return JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || '[]'); } catch { return []; }
}

export default function PrimeCalendarApp() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // ROKCAT navigate listener
  useEffect(() => {
    const handler = (payload: any) => {
      if (payload?.app !== 'calendar' || !payload?.context) return;
      const ctx = payload.context.toLowerCase();
      if (ctx === 'month' || ctx === 'week') setViewMode(ctx);
      if (ctx === 'today') { setCurrentMonth(new Date()); setSelectedDay(new Date()); }
    };
    eventBus.on('app.navigate', handler);
    return () => eventBus.off('app.navigate', handler);
  }, []);

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load events
  useEffect(() => {
    if (userId) {
      (supabase.from('calendar_events') as any).select('*').eq('user_id', userId).then(({ data }: any) => {
        if (data) setEvents(data as CalendarEvent[]);
      });
      // Realtime
      const channel = supabase.channel('calendar-events')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events', filter: `user_id=eq.${userId}` }, () => {
          (supabase.from('calendar_events') as any).select('*').eq('user_id', userId).then(({ data }: any) => {
            if (data) setEvents(data as CalendarEvent[]);
          });
        }).subscribe();
      return () => { supabase.removeChannel(channel); };
    } else {
      setEvents(loadGuestEvents());
    }
  }, [userId]);

  // Generate recurring instances for the visible month
  const visibleEvents = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const result: CalendarEvent[] = [];

    for (const evt of events) {
      const evtDate = new Date(evt.start_time);
      
      if (!evt.recurring) {
        if (evtDate >= monthStart && evtDate <= monthEnd) result.push(evt);
        continue;
      }

      // Generate recurring instances
      let cursor = new Date(evtDate);
      const maxIterations = 400;
      let iter = 0;
      while (cursor <= monthEnd && iter < maxIterations) {
        iter++;
        if (cursor >= monthStart) {
          result.push({ ...evt, id: `${evt.id}-${format(cursor, 'yyyy-MM-dd')}`, start_time: cursor.toISOString() });
        }
        if (evt.recurring === 'daily') cursor = addDays(cursor, 1);
        else if (evt.recurring === 'weekly') cursor = addWeeks(cursor, 1);
        else if (evt.recurring === 'monthly') {
          cursor = new Date(cursor);
          cursor.setMonth(cursor.getMonth() + 1);
        }
        else break;
      }
    }
    return result;
  }, [events, currentMonth]);

  const getEventsForDay = useCallback((day: Date) => {
    return visibleEvents.filter(e => isSameDay(new Date(e.start_time), day));
  }, [visibleEvents]);

  const handleSaveEvent = useCallback(async (data: Partial<CalendarEvent>) => {
    if (editingEvent) {
      // Update
      const realId = editingEvent.id.split('-')[0] === 'local' ? editingEvent.id : editingEvent.id.replace(/-\d{4}-\d{2}-\d{2}$/, '');
      if (userId) {
        await (supabase.from('calendar_events') as any).update(data).eq('id', realId).eq('user_id', userId);
      } else {
        setEvents(prev => {
          const updated = prev.map(e => e.id === realId ? { ...e, ...data } : e);
          localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      }
    } else {
      // Create
      if (userId) {
        await (supabase.from('calendar_events') as any).insert({ ...data, user_id: userId });
      } else {
        const newEvt: CalendarEvent = {
          id: `local-${Date.now()}`,
          user_id: 'guest',
          title: data.title || 'Untitled',
          description: data.description ?? null,
          start_time: data.start_time || new Date().toISOString(),
          end_time: null,
          color: data.color || '#8b5cf6',
          reminder_minutes: data.reminder_minutes ?? null,
          recurring: data.recurring ?? null,
          created_at: new Date().toISOString(),
        };
        setEvents(prev => {
          const next = [...prev, newEvt];
          localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      }
    }
    setModalOpen(false);
    setEditingEvent(null);
  }, [editingEvent, userId]);

  const handleDeleteEvent = useCallback(async () => {
    if (!editingEvent) return;
    const realId = editingEvent.id.split('-')[0] === 'local' ? editingEvent.id : editingEvent.id.replace(/-\d{4}-\d{2}-\d{2}$/, '');
    if (userId) {
      await (supabase.from('calendar_events') as any).delete().eq('id', realId).eq('user_id', userId);
    } else {
      setEvents(prev => {
        const next = prev.filter(e => e.id !== realId);
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
    setModalOpen(false);
    setEditingEvent(null);
  }, [editingEvent, userId]);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  }, [currentMonth]);

  const startDayOfWeek = getDay(startOfMonth(currentMonth));
  const today = new Date();
  const monthNum = getMonth(currentMonth);
  const seasonTint = getSeasonTint(monthNum);

  const lunarRibbon = useMemo(() => {
    const phases: { idx: number; icon: string }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - 15 + i);
      phases.push({ idx: getMoonPhaseIndex(d), icon: MOON_PHASE_ICONS[getMoonPhaseIndex(d)] });
    }
    return phases;
  }, []);

  const solar = getSolarProgress(today);
  const solarPct = Math.round((solar.daysSinceSolstice / (solar.daysSinceSolstice + solar.daysToNext)) * 100);

  const upcomingEvents = useMemo(() => {
    return SYSTEM_EVENTS.map(evt => {
      const d = new Date(today);
      d.setDate(d.getDate() + evt.offset);
      return { ...evt, date: d };
    });
  }, []);

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="h-full bg-background flex flex-col font-mono text-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary">
          <ChevronLeft size={14} />
        </button>
        <div className="text-center">
          <p className="font-display text-[11px] tracking-wider uppercase text-primary">{format(currentMonth, 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentMonth(new Date())} className="px-2 py-0.5 text-[9px] border border-border rounded hover:bg-primary/10 text-muted-foreground hover:text-primary">Today</button>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Lunar Ribbon */}
      <div className="px-3 py-1.5 border-b border-border/50">
        <div className="flex items-center gap-0.5">
          <Moon size={10} className="text-muted-foreground shrink-0 mr-1" />
          <div className="flex gap-px flex-1 overflow-hidden">
            {lunarRibbon.map((p, i) => (
              <div key={i} className={`text-[8px] flex-1 text-center rounded-sm ${i === 15 ? 'bg-primary/20 ring-1 ring-primary/40' : ''}`} title={MOON_PHASE_NAMES[p.idx]}>
                {p.icon}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Solar Tracker */}
      <div className="px-3 py-1.5 border-b border-border/50 flex items-center gap-2">
        <Sun size={10} className="text-muted-foreground shrink-0" />
        <div className="flex-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden relative">
            <div className="h-full bg-primary/40 rounded-full" style={{ width: `${solarPct}%` }} />
            <div className="absolute top-0 left-1/4 w-px h-full bg-muted-foreground/30" />
            <div className="absolute top-0 left-1/2 w-px h-full bg-muted-foreground/30" />
            <div className="absolute top-0 left-3/4 w-px h-full bg-muted-foreground/30" />
          </div>
          <p className="text-[8px] text-muted-foreground mt-0.5">{solar.label}</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 p-2 overflow-y-auto">
          <div className="grid grid-cols-7 gap-px mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[9px] text-muted-foreground/60 font-display tracking-wider">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const dayNum = day.getDate();
              const phaseIdx = getMoonPhaseIndex(day);
              const prime = isPrime(dayNum);
              const selected = selectedDay && isSameDay(day, selectedDay);
              const todayMatch = isToday(day);
              const dayEvents = getEventsForDay(day);

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDay(day)}
                  onDoubleClick={() => { setSelectedDay(day); setEditingEvent(null); setModalOpen(true); }}
                  className={`relative p-1 rounded text-center transition-all min-h-[40px] flex flex-col items-center justify-center gap-0.5
                    ${seasonTint}
                    ${selected ? 'ring-1 ring-primary bg-primary/10' : 'hover:bg-muted/40'}
                    ${todayMatch ? 'border border-primary/40' : ''}
                    ${prime ? 'glow-border' : ''}
                  `}
                >
                  <div className="flex items-center gap-0.5">
                    {prime && <Diamond size={6} className="text-primary" />}
                    <span className={`text-[10px] ${todayMatch ? 'text-primary font-bold' : 'text-foreground'}`}>{dayNum}</span>
                  </div>
                  <span className="text-[7px] leading-none">{MOON_PHASE_ICONS[phaseIdx]}</span>
                  {/* Event dots */}
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <span key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: e.color }} />
                      ))}
                      {dayEvents.length > 3 && <span className="text-[6px] text-muted-foreground">+{dayEvents.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-48 border-l border-border p-2 overflow-y-auto flex flex-col gap-3">
          {selectedDay ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-[9px] tracking-wider uppercase text-primary">Day Detail</h3>
                <button onClick={() => { setEditingEvent(null); setModalOpen(true); }} className="p-0.5 rounded hover:bg-primary/10 text-primary" title="Add event">
                  <Plus size={11} />
                </button>
              </div>
              <p className="text-[10px] text-foreground">{format(selectedDay, 'EEEE, MMMM d, yyyy')}</p>

              {/* Events for this day */}
              {selectedDayEvents.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Events</p>
                  {selectedDayEvents.map(evt => (
                    <button
                      key={evt.id}
                      onClick={() => { setEditingEvent(evt); setModalOpen(true); }}
                      className="w-full text-left p-1.5 rounded border border-border/30 hover:border-border bg-card/50 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: evt.color }} />
                        <span className="text-[10px] text-foreground truncate">{evt.title}</span>
                      </div>
                      <span className="text-[8px] text-muted-foreground">{format(new Date(evt.start_time), 'HH:mm')}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Moon Phase</p>
                  <p className="text-[10px] text-foreground">
                    {MOON_PHASE_ICONS[getMoonPhaseIndex(selectedDay)]} {MOON_PHASE_NAMES[getMoonPhaseIndex(selectedDay)]}
                  </p>
                  <p className="text-[9px] text-muted-foreground">{getMoonIllumination(selectedDay)}% illumination</p>
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Solar</p>
                  <p className="text-[10px] text-foreground">{getSolarCategory(selectedDay)}</p>
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Factorization</p>
                  <p className="text-[10px] text-foreground font-mono">{primeFactorization(selectedDay.getDate())}</p>
                  {isPrime(selectedDay.getDate()) && (
                    <p className="text-[9px] text-primary flex items-center gap-1"><Diamond size={8} /> Prime day</p>
                  )}
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Lattice Coord</p>
                  <p className="text-[10px] text-primary font-mono">{latticeCoord(selectedDay.getDate())}</p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-display text-[9px] tracking-wider uppercase text-muted-foreground">Select a day</h3>
              <p className="text-[9px] text-muted-foreground/60 mt-1">Click to view, double-click to add event</p>
            </div>
          )}

          <div className="border-t border-border/50 pt-2">
            <h3 className="font-display text-[9px] tracking-wider uppercase text-primary mb-1.5">Upcoming Events</h3>
            <div className="space-y-1.5">
              {upcomingEvents.map((evt, i) => (
                <div key={i} className="p-1.5 rounded bg-card/50 border border-border/30">
                  <p className="text-[9px] text-foreground">{evt.title}</p>
                  <p className="text-[8px] text-muted-foreground">{format(evt.date, 'MMM d')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {modalOpen && selectedDay && (
        <EventModal
          date={selectedDay}
          event={editingEvent}
          onSave={handleSaveEvent}
          onDelete={editingEvent ? handleDeleteEvent : undefined}
          onClose={() => { setModalOpen(false); setEditingEvent(null); }}
        />
      )}
    </div>
  );
}
