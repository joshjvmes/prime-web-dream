import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Clock, Cpu, Loader2 } from 'lucide-react';
import { eventBus } from '@/hooks/useEventBus';
import { supabase } from '@/integrations/supabase/client';

type Priority = 'P0' | 'P1' | 'P2';
type Column = 'queued' | 'computing' | 'complete';

interface Task {
  id: string;
  name: string;
  priority: Priority;
  node: string;
  column: Column;
  eta: number;
  progress: number;
  createdAt: number;
}

const TASK_NAMES = [
  'Fold sector 7 manifold', 'Recalibrate Q3 core 41', 'Compress Adinkra region 3',
  'Sync lattice node-gamma', 'Defragment FoldMem block 12', 'Rotate encryption keys',
  'Rebalance geodesic routes', 'Verify prime coordinates', 'Compact storage region 5',
  'Train Q3 model on sector 9', 'Audit energy COP readings', 'Rebuild routing table',
  'Scan lattice perimeter', 'Migrate workload to rack 2', 'Update qutrit firmware',
  'Resolve coordinate conflict', 'Archive fold snapshots', 'Optimize net-flow paths',
];
const NODES = ['node-alpha','node-beta','node-gamma','node-delta','node-epsilon','node-zeta','node-eta','node-theta'];

function randomTask(): Task {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    name: TASK_NAMES[Math.floor(Math.random() * TASK_NAMES.length)],
    priority: (['P0','P1','P2'] as Priority[])[Math.floor(Math.random() * 3)],
    node: NODES[Math.floor(Math.random() * NODES.length)],
    column: 'queued',
    eta: Math.floor(Math.random() * 20 + 5),
    progress: 0,
    createdAt: Date.now(),
  };
}

function priorityColor(p: Priority) {
  switch (p) {
    case 'P0': return 'bg-destructive/20 text-destructive border-destructive/30';
    case 'P1': return 'bg-prime-amber/20 text-prime-amber border-prime-amber/30';
    case 'P2': return 'bg-primary/20 text-primary border-primary/30';
  }
}

export default function PrimeBoardApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const dragItem = useRef<string | null>(null);
  const [highlightCol, setHighlightCol] = useState<Column | null>(null);

  // ROKCAT navigate listener
  useEffect(() => {
    const handler = (payload: any) => {
      if (payload?.app !== 'board' || !payload?.context) return;
      const ctx = payload.context.toLowerCase();
      const colMap: Record<string, Column> = { backlog: 'queued', queued: 'queued', 'in-progress': 'computing', computing: 'computing', done: 'complete', complete: 'complete' };
      const col = colMap[ctx];
      if (col) {
        setHighlightCol(col);
        setTimeout(() => setHighlightCol(null), 3000);
      }
    };
    eventBus.on('app.navigate', handler);
    return () => eventBus.off('app.navigate', handler);
  }, []);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load from DB
  useEffect(() => {
    if (!userId) {
      // Not signed in — use demo tasks
      const initial: Task[] = [];
      for (let i = 0; i < 4; i++) initial.push(randomTask());
      if (initial[0]) initial[0].column = 'computing';
      if (initial[1]) initial[1].column = 'computing';
      setTasks(initial);
      setLoading(false);
      return;
    }
    setLoading(true);
    (supabase as any).from('board_tasks').select('*').eq('user_id', userId).order('created_at', { ascending: true })
      .then(({ data }: any) => {
        if (data && data.length > 0) {
          setTasks(data.map((r: any) => ({
            id: r.id,
            name: r.name,
            priority: r.priority as Priority,
            node: r.node,
            column: r.column_name as Column,
            eta: r.eta,
            progress: Number(r.progress),
            createdAt: new Date(r.created_at).getTime(),
          })));
        } else {
          // Seed initial tasks
          const initial: Task[] = [];
          for (let i = 0; i < 4; i++) initial.push(randomTask());
          if (initial[0]) initial[0].column = 'computing';
          if (initial[1]) initial[1].column = 'computing';
          setTasks(initial);
          // Persist seeds
          for (const t of initial) {
            (supabase as any).from('board_tasks').insert({
              id: t.id.startsWith('task-') ? undefined : t.id,
              user_id: userId, name: t.name, priority: t.priority, node: t.node,
              column_name: t.column, eta: t.eta, progress: t.progress,
            });
          }
        }
        setLoading(false);
      });
  }, [userId]);

  const persistTask = useCallback(async (task: Task) => {
    if (!userId) return;
    await (supabase as any).from('board_tasks').upsert({
      id: task.id.length === 36 ? task.id : undefined,
      user_id: userId, name: task.name, priority: task.priority, node: task.node,
      column_name: task.column, eta: task.eta, progress: task.progress,
    });
  }, [userId]);

  const deleteTaskDb = useCallback(async (taskId: string) => {
    if (!userId) return;
    await (supabase as any).from('board_tasks').delete().eq('id', taskId).eq('user_id', userId);
  }, [userId]);

  // Auto-generate tasks
  useEffect(() => {
    const id = setInterval(() => {
      setTasks(prev => {
        if (prev.filter(t => t.column === 'queued').length >= 8) return prev;
        const t = randomTask();
        persistTask(t);
        return [...prev, t];
      });
    }, 12000);
    return () => clearInterval(id);
  }, [persistTask]);

  // Progress computing tasks
  useEffect(() => {
    const id = setInterval(() => {
      setTasks(prev => prev.map(t => {
        if (t.column !== 'computing') return t;
        const next = t.progress + (100 / t.eta) * 2;
        if (next >= 100) {
          const updated = { ...t, column: 'complete' as Column, progress: 100 };
          persistTask(updated);
          return updated;
        }
        return { ...t, progress: next };
      }));
    }, 2000);
    return () => clearInterval(id);
  }, [persistTask]);

  const addTask = useCallback(() => {
    if (!newTaskName.trim()) return;
    const t = { ...randomTask(), name: newTaskName.trim() };
    setTasks(prev => [...prev, t]);
    persistTask(t);
    setNewTaskName('');
    setShowInput(false);
  }, [newTaskName, persistTask]);

  const moveTask = useCallback((taskId: string, to: Column) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const updated = { ...t, column: to, progress: to === 'complete' ? 100 : to === 'queued' ? 0 : t.progress };
      persistTask(updated);
      return updated;
    }));
  }, [persistTask]);

  const onDragStart = (id: string) => { dragItem.current = id; };
  const onDrop = (col: Column) => {
    if (dragItem.current) {
      moveTask(dragItem.current, col);
      dragItem.current = null;
    }
  };

  const columns: { key: Column; label: string; icon: React.ReactNode }[] = [
    { key: 'queued', label: 'Queued', icon: <Clock size={12} /> },
    { key: 'computing', label: 'Computing', icon: <Cpu size={12} /> },
    { key: 'complete', label: 'Complete', icon: <span className="text-prime-green text-xs">✓</span> },
  ];

  if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono gap-2"><Loader2 size={14} className="animate-spin" /> Loading board…</div>;

  return (
    <div className="flex flex-col h-full bg-background font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/30">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-[9px] tracking-wider text-primary">PRIME BOARD</span>
          <span className="text-[8px] text-muted-foreground">— Lattice Operations</span>
          {userId && <span className="text-[7px] text-prime-green ml-1">● synced</span>}
        </div>
        <button onClick={() => setShowInput(!showInput)} className="flex items-center gap-1 px-2 py-0.5 border border-border rounded hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground">
          <Plus size={10} /> Add Task
        </button>
      </div>

      {showInput && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card/20">
          <input
            value={newTaskName}
            onChange={e => setNewTaskName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="Task name..."
            className="flex-1 bg-muted/30 border border-border rounded px-2 py-0.5 text-[10px] font-mono text-foreground focus:outline-none focus:border-primary/40"
            autoFocus
          />
          <button onClick={addTask} className="px-2 py-0.5 bg-primary/20 text-primary rounded text-[9px] hover:bg-primary/30">Add</button>
        </div>
      )}

      {/* Columns */}
      <div className="flex flex-1 overflow-hidden">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.column === col.key);
          return (
            <div
              key={col.key}
              className="flex-1 flex flex-col border-r border-border last:border-r-0 min-w-0"
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDrop(col.key)}
            >
              <div className="px-3 py-1.5 border-b border-border/50 bg-card/20 flex items-center gap-1.5">
                {col.icon}
                <span className="text-[9px] text-muted-foreground">{col.label}</span>
                <span className="ml-auto text-[8px] text-muted-foreground/50 bg-muted/30 px-1 rounded">{colTasks.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => onDragStart(task.id)}
                    className="p-2 border border-border rounded bg-card/40 hover:border-primary/30 cursor-grab active:cursor-grabbing transition-colors"
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-[10px] text-foreground leading-tight">{task.name}</p>
                      <span className={`text-[7px] px-1 py-0.5 rounded border shrink-0 ${priorityColor(task.priority)}`}>{task.priority}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[8px] text-muted-foreground">
                      <span>{task.node.replace('node-', '')}</span>
                      {task.column === 'computing' && (
                        <>
                          <span>•</span>
                          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${task.progress}%` }} />
                          </div>
                          <span>{Math.round(task.progress)}%</span>
                        </>
                      )}
                      {task.column === 'queued' && <span>ETA: {task.eta}s</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
