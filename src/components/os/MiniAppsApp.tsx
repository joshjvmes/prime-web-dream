import { useState, useEffect, useCallback } from 'react';
import { Blocks, Plus, Trash2, Play, Code, ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCloudStorage } from '@/hooks/useCloudStorage';
import MiniAppRenderer from './MiniAppRenderer';

interface MiniApp {
  id: string;
  name: string;
  description: string;
  code: string;
  icon: string;
  createdAt: string;
}

export default function MiniAppsApp() {
  const { save, load } = useCloudStorage();
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadApps = useCallback(async () => {
    setLoading(true);
    const stored = await load<MiniApp[]>('user-mini-apps', []);
    setApps(stored || []);
    setLoading(false);
  }, [load]);

  useEffect(() => { loadApps(); }, [loadApps]);

  const deleteApp = async (id: string) => {
    const updated = apps.filter(a => a.id !== id);
    setApps(updated);
    await save('user-mini-apps', updated);
    if (running === id) setRunning(null);
    if (viewing === id) setViewing(null);
  };

  const runningApp = apps.find(a => a.id === running);
  const viewingApp = apps.find(a => a.id === viewing);

  // Running a mini-app
  if (runningApp) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button onClick={() => setRunning(null)} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <ArrowLeft size={12} />
          </button>
          <span className="text-sm">{runningApp.icon}</span>
          <span className="font-display text-[9px] tracking-wider uppercase text-primary">{runningApp.name}</span>
        </div>
        <div className="flex-1">
          <MiniAppRenderer code={runningApp.code} name={runningApp.name} />
        </div>
      </div>
    );
  }

  // Viewing source code
  if (viewingApp) {
    return (
      <div className="h-full flex flex-col bg-background font-mono text-xs">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button onClick={() => setViewing(null)} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <ArrowLeft size={12} />
          </button>
          <Code size={12} className="text-primary" />
          <span className="font-display text-[9px] tracking-wider uppercase text-primary">{viewingApp.name} — Source</span>
        </div>
        <ScrollArea className="flex-1">
          <pre className="p-3 text-[11px] text-muted-foreground whitespace-pre-wrap">{viewingApp.code}</pre>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background font-mono text-xs">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Blocks size={14} className="text-primary" />
        <span className="font-display text-[9px] tracking-[0.2em] uppercase text-primary">Mini Apps</span>
        <span className="ml-auto text-[9px] text-muted-foreground">{apps.length} apps</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : apps.length === 0 ? (
            <div className="text-center py-8">
              <Blocks size={32} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground mb-1">No mini-apps yet</p>
              <p className="text-[10px] text-muted-foreground/60">Use Hyper AI to create one: "Create a mini-app that..."</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {apps.map(app => (
                <div key={app.id} className="p-3 rounded border border-border bg-card/30 hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg">{app.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-display text-[10px] tracking-wider uppercase truncate">{app.name}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{app.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setRunning(app.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-primary/10 text-primary text-[9px] hover:bg-primary/20">
                      <Play size={8} /> Run
                    </button>
                    <button onClick={() => setViewing(app.id)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground">
                      <Code size={10} />
                    </button>
                    <button onClick={() => deleteApp(app.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
