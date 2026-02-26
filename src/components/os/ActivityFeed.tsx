import { useState, useEffect, useRef } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface ActivityRecord {
  id: string;
  action: string;
  target: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ACTION_ICONS: Record<string, string> = {
  'app.opened': '📂',
  'app.closed': '✖',
  'file.uploaded': '📤',
  'file.deleted': '🗑',
  'trade.executed': '📈',
  'wallet.transfer': '💸',
  'bet.placed': '🎲',
  'booking.created': '📅',
  'booking.cancelled': '❌',
  'clipboard.copied': '📋',
  'social.post.created': '📢',
  'mail.received': '✉️',
  'agent.action.logged': '🤖',
  'canvas.draw': '🎨',
  'spreadsheet.create': '📊',
  'audio.control': '🎵',
  'market.checked': '📉',
};

function formatAction(action: string): string {
  const map: Record<string, string> = {
    'app.opened': 'Opened',
    'app.closed': 'Closed',
    'file.uploaded': 'Uploaded',
    'file.deleted': 'Deleted',
    'trade.executed': 'Traded',
    'wallet.transfer': 'Transferred',
    'bet.placed': 'Placed bet',
    'booking.created': 'Booked',
    'booking.cancelled': 'Cancelled booking',
    'clipboard.copied': 'Copied to clipboard',
    'social.post.created': 'Posted to social',
    'mail.received': 'Mail from',
    'agent.action.logged': 'Agent action',
    'canvas.draw': 'Drew on',
    'spreadsheet.create': 'Created sheet',
    'audio.control': 'Audio',
    'market.checked': 'Checked market',
  };
  return map[action] || action;
}

export default function ActivityFeed({ compact = false }: { compact?: boolean }) {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase
        .from('user_activity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (mounted) {
        setActivities((data as ActivityRecord[]) || []);
        setLoading(false);
      }
    }

    load();

    // Realtime subscription
    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_activity' }, (payload) => {
        setActivities(prev => [payload.new as ActivityRecord, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground">
        <Loader2 size={14} className="animate-spin mr-2" />
        <span className="text-[10px]">Loading activity...</span>
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-muted-foreground">
        <Activity size={16} className="mb-1 opacity-40" />
        <span className="text-[10px]">No recent activity</span>
      </div>
    );
  }

  return (
    <ScrollArea className={compact ? "h-48" : "h-64"}>
      <div className="space-y-0.5 p-1" ref={scrollRef}>
        {activities.map((a) => {
          const time = new Date(a.created_at);
          const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const icon = ACTION_ICONS[a.action] || '•';

          return (
            <div key={a.id} className="flex items-start gap-1.5 py-0.5 text-[10px] hover:bg-muted/20 rounded px-1 transition-colors">
              <span className="text-muted-foreground/50 shrink-0 font-mono w-16 text-right">[{timeStr}]</span>
              <span className="shrink-0">{icon}</span>
              <span className="text-foreground/80">
                {formatAction(a.action)} <span className="text-primary">{a.target}</span>
              </span>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
