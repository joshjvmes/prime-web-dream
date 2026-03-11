import { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, Plus, X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { eventBus } from '@/hooks/useEventBus';

interface Booking {
  id: string;
  resource: string;
  date: Date;
  startHour: number;
  endHour: number;
  purpose: string;
  priority: 'low' | 'medium' | 'high';
  color: string;
  userId?: string;
  userName?: string;
}

const RESOURCES = [
  { name: 'Lattice Lab A', icon: '🔬' },
  { name: 'Compute Cluster 7', icon: '🖥️' },
  { name: 'Energy Lab', icon: '⚡' },
  { name: 'Conference Nexus', icon: '📡' },
  { name: 'Qutrit Chamber', icon: '🔮' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'border-muted-foreground/30',
  medium: 'border-prime-amber/50',
  high: 'border-destructive/50',
};

const BOOKING_COLORS = ['bg-primary/20', 'bg-prime-green/20', 'bg-prime-amber/20', 'bg-accent/30', 'bg-destructive/20'];

const today = new Date();
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7);

const INITIAL_BOOKINGS: Booking[] = [
  { id: '1', resource: 'Lattice Lab A', date: today, startHour: 9, endHour: 11, purpose: 'Lattice calibration', priority: 'high', color: BOOKING_COLORS[0] },
  { id: '2', resource: 'Compute Cluster 7', date: today, startHour: 13, endHour: 16, purpose: 'Q3 training batch', priority: 'medium', color: BOOKING_COLORS[1] },
  { id: '3', resource: 'Energy Lab', date: addDays(today, 1), startHour: 10, endHour: 12, purpose: 'COP measurement', priority: 'high', color: BOOKING_COLORS[2] },
];

export default function PrimeBookingApp() {
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [weekStart, setWeekStart] = useState(startOfWeek(today, { weekStartsOn: 1 }));
  const [showForm, setShowForm] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ resource: RESOURCES[0].name, date: format(today, 'yyyy-MM-dd'), startHour: '9', endHour: '10', purpose: '', priority: 'medium' as 'low' | 'medium' | 'high' });

  // ROKCAT navigation listener
  useEffect(() => {
    const handler = (payload: any) => {
      if (payload?.app === 'booking' && payload?.context) {
        const ctx = payload.context.toLowerCase();
        if (ctx === 'new') setShowForm(true);
        else if (ctx === 'today') setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
      }
    };
    eventBus.on('app.navigate', handler);
    return () => eventBus.off('app.navigate', handler);
  }, []);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Load bookings from DB
  const loadBookings = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await (supabase as any).from('bookings').select('*');
      if (data) {
        setBookings(data.map((b: any) => ({
          id: b.id,
          resource: b.resource,
          date: new Date(b.start_time),
          startHour: new Date(b.start_time).getHours(),
          endHour: new Date(b.end_time).getHours(),
          purpose: b.purpose,
          priority: b.priority,
          color: BOOKING_COLORS[Math.floor(Math.random() * BOOKING_COLORS.length)],
          userId: b.user_id,
        })));
      }
    } catch {}
  }, [userId]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        loadBookings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, loadBookings]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToday = () => setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));

  // Check conflict when form changes
  useEffect(() => {
    const startH = parseInt(form.startHour);
    const endH = parseInt(form.endHour);
    const date = new Date(form.date);
    const hasConflict = bookings.some(b =>
      b.resource === form.resource &&
      isSameDay(b.date, date) &&
      b.startHour < endH &&
      b.endHour > startH
    );
    setConflict(hasConflict);
  }, [form, bookings]);

  const addBooking = async () => {
    if (!form.purpose.trim()) return;
    const startH = parseInt(form.startHour);
    const endH = parseInt(form.endHour);
    const date = new Date(form.date);

    if (userId) {
      try {
        const startTime = new Date(date);
        startTime.setHours(startH, 0, 0, 0);
        const endTime = new Date(date);
        endTime.setHours(endH, 0, 0, 0);

        await (supabase as any).from('bookings').insert({
          user_id: userId,
          resource: form.resource,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          purpose: form.purpose,
          priority: form.priority,
        });
        loadBookings();
      } catch (e) { console.error('Booking failed:', e); }
    } else {
      setBookings(prev => [...prev, {
        id: Date.now().toString(),
        resource: form.resource,
        date,
        startHour: startH,
        endHour: endH,
        purpose: form.purpose,
        priority: form.priority,
        color: BOOKING_COLORS[Math.floor(Math.random() * BOOKING_COLORS.length)],
      }]);
    }
    setForm({ ...form, purpose: '' });
    setShowForm(false);
  };

  const cancelBooking = async (id: string) => {
    if (userId) {
      try {
        await (supabase as any).from('bookings').delete().eq('id', id);
        loadBookings();
      } catch {}
    } else {
      setBookings(prev => prev.filter(b => b.id !== id));
    }
  };

  return (
    <div className="flex h-full bg-background text-foreground font-mono text-xs">
      {/* Resources sidebar */}
      <div className="w-48 border-r border-border flex flex-col shrink-0">
        <div className="p-2 border-b border-border flex items-center gap-1.5">
          <CalendarCheck size={12} className="text-primary" />
          <span className="font-display text-[9px] tracking-widest uppercase text-primary">Resources</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {RESOURCES.map(r => {
              const todayBookings = bookings.filter(b => b.resource === r.name && isSameDay(b.date, today));
              return (
                <div key={r.name} className="p-2 rounded border border-border">
                  <div className="flex items-center gap-1.5">
                    <span>{r.icon}</span>
                    <span className="text-[10px] font-medium">{r.name}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {todayBookings.length === 0 ? 'Available today' : `${todayBookings.length} booking(s) today`}
                  </p>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="p-2 border-t border-border">
          <button onClick={() => setShowForm(!showForm)} className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors text-[10px]">
            <Plus size={10} /> New Booking
          </button>
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-2 border-b border-border flex items-center gap-2">
          <button onClick={prevWeek} className="p-1 hover:bg-muted rounded"><ChevronLeft size={12} /></button>
          <button onClick={goToday} className="text-[10px] text-primary hover:underline">Today</button>
          <button onClick={nextWeek} className="p-1 hover:bg-muted rounded"><ChevronRight size={12} /></button>
          <span className="text-[10px] text-muted-foreground ml-2">{format(weekDays[0], 'MMM d')} — {format(weekDays[6], 'MMM d, yyyy')}</span>
          {!userId && <span className="ml-auto text-[8px] text-muted-foreground">(Guest - local only)</span>}
        </div>

        {showForm && (
          <div className="p-3 border-b border-border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-display uppercase tracking-wider text-primary">New Booking</span>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>
            </div>
            {conflict && (
              <div className="flex items-center gap-1 text-[9px] text-destructive bg-destructive/10 rounded p-1.5">
                <AlertTriangle size={10} /> Conflict detected with existing booking
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <select value={form.resource} onChange={e => setForm({ ...form, resource: e.target.value })} className="bg-background border border-border rounded px-2 py-1 text-[10px]">
                {RESOURCES.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
              </select>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="bg-background border border-border rounded px-2 py-1 text-[10px]" />
              <select value={form.startHour} onChange={e => setForm({ ...form, startHour: e.target.value })} className="bg-background border border-border rounded px-2 py-1 text-[10px]">
                {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
              </select>
              <select value={form.endHour} onChange={e => setForm({ ...form, endHour: e.target.value })} className="bg-background border border-border rounded px-2 py-1 text-[10px]">
                {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
              </select>
            </div>
            <input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} placeholder="Purpose..." className="w-full bg-background border border-border rounded px-2 py-1 text-[10px]" />
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map(p => (
                <button key={p} onClick={() => setForm({ ...form, priority: p })} className={`px-2 py-0.5 rounded border text-[9px] ${form.priority === p ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>{p}</button>
              ))}
              <button onClick={addBooking} className={`ml-auto px-3 py-0.5 rounded bg-primary/10 text-primary border border-primary/30 text-[10px] ${conflict ? 'opacity-50' : ''}`}>Book</button>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-border sticky top-0 bg-background z-10">
              <div className="p-1" />
              {weekDays.map(d => (
                <div key={d.toISOString()} className={`p-1.5 text-center border-l border-border ${isSameDay(d, today) ? 'bg-primary/5' : ''}`}>
                  <p className="text-[9px] text-muted-foreground">{format(d, 'EEE')}</p>
                  <p className={`text-[11px] font-bold ${isSameDay(d, today) ? 'text-primary' : 'text-foreground'}`}>{format(d, 'd')}</p>
                </div>
              ))}
            </div>

            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-border/30 h-10">
                <div className="p-1 text-[9px] text-muted-foreground text-right pr-2 leading-10">{hour}:00</div>
                {weekDays.map(day => {
                  const cellBookings = bookings.filter(b => isSameDay(b.date, day) && b.startHour <= hour && b.endHour > hour);
                  return (
                    <div key={day.toISOString()} className={`border-l border-border/30 relative ${isSameDay(day, today) ? 'bg-primary/[0.02]' : ''}`}>
                      {cellBookings.map(b => (
                        b.startHour === hour && (
                          <div key={b.id}
                            className={`absolute inset-x-0.5 top-0 ${b.color} border-l-2 ${PRIORITY_COLORS[b.priority]} rounded-sm px-1 py-0.5 z-10 group cursor-pointer`}
                            style={{ height: `${(b.endHour - b.startHour) * 40}px` }}>
                            <p className="text-[8px] font-bold truncate">{b.purpose}</p>
                            <p className="text-[7px] text-muted-foreground truncate">{b.resource}</p>
                            <button onClick={() => cancelBooking(b.id)} className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X size={8} /></button>
                          </div>
                        )
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
