import { AnimatePresence, motion } from 'framer-motion';
import { OSNotification } from '@/hooks/useNotifications';
import { X } from 'lucide-react';

interface NotificationSystemProps {
  notifications: OSNotification[];
  onDismiss: (id: string) => void;
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
            className="pointer-events-auto bg-card/95 backdrop-blur-md border border-border rounded px-3 py-2 glow-border"
          >
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
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
