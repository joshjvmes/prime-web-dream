type EventCallback = (payload: any) => void;

export const EVENT_TYPES = [
  'app.opened',
  'app.closed',
  'calendar.event.starting',
  'notification.received',
  'user.signed-in',
  'user.signed-out',
  'file.uploaded',
  'file.deleted',
  'timer.fired',
  'clipboard.copied',
  'social.post.created',
  'mail.received',
  'agent.action.logged',
  'wallet.transfer',
  'trade.executed',
  'bet.placed',
  'booking.created',
  'booking.cancelled',
  'audio.control',
  'market.checked',
] as const;

export type EventType = typeof EVENT_TYPES[number];

class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, payload?: any) {
    this.listeners.get(event)?.forEach(cb => {
      try { cb(payload); } catch (e) { console.error('[EventBus]', event, e); }
    });
  }
}

// Singleton
export const eventBus = new EventBus();
