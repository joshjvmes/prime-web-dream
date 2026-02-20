import { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { OSNotification } from '@/hooks/useNotifications';
import { X } from 'lucide-react';

interface NotificationSystemProps {
  notifications: OSNotification[];
  onDismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 8000;

function useAutoDismiss(id: string, onDismiss: (id: string) => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(id), AUTO_DISMISS_MS);
    return () => clearTimeout(timerRef.current);
  }, [id, onDismiss]);
}

function ToastContent({ notif, onDismiss }: { notif: OSNotification; onDismiss: (id: string) => void }) {
  useAutoDismiss(notif.id, onDismiss);

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-[9px] tracking-wider uppercase text-primary">{notif.title}</p>
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5 leading-tight">{notif.message}</p>
        </div>
        <button
          onClick={() => onDismiss(notif.id)}
          className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X size={10} />
        </button>
      </div>
      <div className="mt-1.5 h-[2px] bg-muted/30 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary/40 rounded-full"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
        />
      </div>
    </div>
  );
}

export default function NotificationSystem({ notifications, onDismiss }: NotificationSystemProps) {
  const visible = notifications.slice(0, 3);

  return (
    <div className="fixed top-3 right-3 z-[200] flex flex-col gap-2 w-72 pointer-events-none">
      <AnimatePresence>
        {visible.map(notif => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-auto bg-card/95 backdrop-blur-md border border-border rounded px-3 py-2 glow-border overflow-hidden"
          >
            <ToastContent notif={notif} onDismiss={onDismiss} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
