import { useState } from 'react';
import { X } from 'lucide-react';
import { CalendarEvent, EVENT_COLORS, REMINDER_OPTIONS, RECURRING_OPTIONS } from './calendarUtils';
import { format } from 'date-fns';

interface EventModalProps {
  date: Date;
  event?: CalendarEvent | null;
  onSave: (data: Partial<CalendarEvent>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function EventModal({ date, event, onSave, onDelete, onClose }: EventModalProps) {
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [time, setTime] = useState(() => {
    if (event?.start_time) return format(new Date(event.start_time), 'HH:mm');
    return format(new Date(), 'HH:mm');
  });
  const [color, setColor] = useState(event?.color || '#8b5cf6');
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(event?.reminder_minutes ?? null);
  const [recurring, setRecurring] = useState<string | null>(event?.recurring ?? null);

  const handleSave = () => {
    if (!title.trim()) return;
    const [h, m] = time.split(':').map(Number);
    const startTime = new Date(date);
    startTime.setHours(h, m, 0, 0);

    onSave({
      title: title.trim(),
      description: description.trim() || null,
      start_time: startTime.toISOString(),
      color,
      reminder_minutes: reminderMinutes,
      recurring,
    });
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-80 p-4 font-mono text-xs" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-[11px] tracking-wider uppercase text-primary">
            {event ? 'Edit Event' : 'New Event'}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={12} /></button>
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="text-[9px] text-muted-foreground uppercase tracking-wider block mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-foreground text-[11px]"
              placeholder="Event title..." onKeyDown={e => { if (e.key === 'Enter') handleSave(); }} />
          </div>

          <div>
            <label className="text-[9px] text-muted-foreground uppercase tracking-wider block mb-1">Date & Time</label>
            <div className="flex gap-2">
              <span className="text-[10px] text-foreground bg-muted/30 border border-border rounded px-2 py-1.5 flex-1">
                {format(date, 'MMM d, yyyy')}
              </span>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="bg-background border border-border rounded px-2 py-1.5 text-foreground text-[10px] w-24" />
            </div>
          </div>

          <div>
            <label className="text-[9px] text-muted-foreground uppercase tracking-wider block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-foreground text-[10px] h-14 resize-none"
              placeholder="Optional..." />
          </div>

          <div>
            <label className="text-[9px] text-muted-foreground uppercase tracking-wider block mb-1">Color</label>
            <div className="flex gap-1.5">
              {EVENT_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-muted-foreground uppercase tracking-wider block mb-1">Reminder</label>
              <select value={reminderMinutes ?? ''} onChange={e => setReminderMinutes(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-background border border-border rounded px-2 py-1 text-foreground text-[10px]">
                {REMINDER_OPTIONS.map(o => <option key={String(o.value)} value={o.value ?? ''}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground uppercase tracking-wider block mb-1">Recurring</label>
              <select value={recurring ?? ''} onChange={e => setRecurring(e.target.value || null)}
                className="w-full bg-background border border-border rounded px-2 py-1 text-foreground text-[10px]">
                {RECURRING_OPTIONS.map(o => <option key={String(o.value)} value={o.value ?? ''}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          {event && onDelete ? (
            <button onClick={onDelete} className="px-2 py-1 rounded border border-destructive/30 text-destructive text-[10px] hover:bg-destructive/10">Delete</button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1 rounded border border-border text-muted-foreground text-[10px] hover:text-foreground">Cancel</button>
            <button onClick={handleSave} disabled={!title.trim()} className="px-3 py-1 rounded border border-primary/30 text-primary text-[10px] hover:bg-primary/10 disabled:opacity-40">
              {event ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
