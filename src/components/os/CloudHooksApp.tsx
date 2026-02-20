import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Zap, CheckCircle, XCircle, RefreshCw, Play, Pause, ChevronDown, BookTemplate } from 'lucide-react';
import { eventBus, EVENT_TYPES, type EventType } from '@/hooks/useEventBus';

interface WorkflowAction {
  type: 'open_app' | 'close_app' | 'notification' | 'copy_text' | 'lock_screen' | 'webhook';
  config: Record<string, string>;
}

interface WorkflowHook {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  actions: WorkflowAction[];
  enabled: boolean;
}

interface Execution {
  id: string;
  hookName: string;
  trigger: string;
  timestamp: number;
  status: 'success' | 'fail';
  message: string;
}

const STORAGE_KEY = 'prime-os-cloudhooks';
const MAX_EXECUTIONS = 50;

const ACTION_TYPES = [
  { value: 'open_app', label: 'Open App' },
  { value: 'notification', label: 'Show Notification' },
  { value: 'copy_text', label: 'Copy Text' },
  { value: 'lock_screen', label: 'Lock Screen' },
  { value: 'webhook', label: 'Send Webhook' },
];

const TEMPLATES: WorkflowHook[] = [
  {
    id: 'tpl-1', name: 'File Upload Notifier', trigger: 'file.uploaded',
    condition: '', actions: [{ type: 'notification', config: { title: 'Files', message: 'New file uploaded successfully' } }], enabled: true,
  },
  {
    id: 'tpl-2', name: 'Calendar Reminder Action', trigger: 'calendar.event.starting',
    condition: '', actions: [{ type: 'notification', config: { title: 'Calendar', message: 'An event is starting soon!' } }], enabled: true,
  },
  {
    id: 'tpl-3', name: 'Welcome Workflow', trigger: 'user.signed-in',
    condition: '', actions: [{ type: 'notification', config: { title: 'System', message: 'Welcome back, Operator.' } }], enabled: true,
  },
];

function loadHooks(): WorkflowHook[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

export default function CloudHooksApp() {
  const [hooks, setHooks] = useState<WorkflowHook[]>(() => {
    const saved = loadHooks();
    return saved.length > 0 ? saved : [];
  });
  const [selectedId, setSelectedId] = useState<string | null>(hooks[0]?.id ?? null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const selected = hooks.find(h => h.id === selectedId) ?? null;

  // Persist hooks
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hooks));
  }, [hooks]);

  // Subscribe to events and execute hooks
  useEffect(() => {
    const handlers = new Map<string, (payload: any) => void>();

    for (const hook of hooks) {
      if (!hook.enabled) continue;
      const handler = (payload: any) => {
        // Check condition
        if (hook.condition) {
          try {
            const payloadStr = JSON.stringify(payload || {});
            if (!payloadStr.toLowerCase().includes(hook.condition.toLowerCase())) return;
          } catch {}
        }

        // Execute actions
        for (const action of hook.actions) {
          try {
            switch (action.type) {
              case 'notification':
                // Dispatch a custom event that Desktop can listen to
                window.dispatchEvent(new CustomEvent('cloudhook-notification', {
                  detail: { title: action.config.title || 'CloudHook', message: action.config.message || 'Hook triggered' }
                }));
                break;
              case 'open_app':
                window.dispatchEvent(new CustomEvent('cloudhook-open-app', {
                  detail: { app: action.config.app || 'terminal', title: action.config.title || 'App' }
                }));
                break;
              case 'copy_text':
                navigator.clipboard.writeText(action.config.text || '').catch(() => {});
                break;
              case 'lock_screen':
                window.dispatchEvent(new CustomEvent('cloudhook-lock'));
                break;
              case 'webhook':
                if (action.config.url) {
                  fetch(action.config.url, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event: hook.trigger, payload, hook: hook.name }),
                  }).catch(() => {});
                }
                break;
            }
          } catch {}
        }

        setExecutions(prev => [{
          id: `exec-${Date.now()}`,
          hookName: hook.name,
          trigger: hook.trigger,
          timestamp: Date.now(),
          status: 'success' as const,
          message: `Triggered by ${hook.trigger}`,
        }, ...prev].slice(0, MAX_EXECUTIONS));
      };

      const existing = handlers.get(hook.trigger);
      if (existing) {
        // Wrap existing handler
        const prev = existing;
        const combined = (payload: any) => { prev(payload); handler(payload); };
        handlers.set(hook.trigger, combined);
        eventBus.off(hook.trigger, prev);
        eventBus.on(hook.trigger, combined);
      } else {
        handlers.set(hook.trigger, handler);
        eventBus.on(hook.trigger, handler);
      }
    }

    return () => {
      handlers.forEach((handler, event) => eventBus.off(event, handler));
    };
  }, [hooks]);

  const updateHook = (id: string, updates: Partial<WorkflowHook>) => {
    setHooks(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const addHook = (template?: WorkflowHook) => {
    const newHook: WorkflowHook = template
      ? { ...template, id: `hook-${Date.now()}` }
      : {
          id: `hook-${Date.now()}`,
          name: 'New Hook',
          trigger: EVENT_TYPES[0],
          condition: '',
          actions: [{ type: 'notification', config: { title: 'Hook', message: 'Triggered!' } }],
          enabled: true,
        };
    setHooks(prev => [...prev, newHook]);
    setSelectedId(newHook.id);
    setShowTemplates(false);
  };

  const deleteHook = (id: string) => {
    setHooks(prev => prev.filter(h => h.id !== id));
    if (selectedId === id) setSelectedId(hooks.find(h => h.id !== id)?.id ?? null);
  };

  const updateAction = (hookId: string, actionIdx: number, updates: Partial<WorkflowAction>) => {
    setHooks(prev => prev.map(h => {
      if (h.id !== hookId) return h;
      const newActions = [...h.actions];
      newActions[actionIdx] = { ...newActions[actionIdx], ...updates };
      return { ...h, actions: newActions };
    }));
  };

  const addAction = (hookId: string) => {
    setHooks(prev => prev.map(h => {
      if (h.id !== hookId) return h;
      return { ...h, actions: [...h.actions, { type: 'notification', config: { title: 'Hook', message: 'Action' } }] };
    }));
  };

  const removeAction = (hookId: string, idx: number) => {
    setHooks(prev => prev.map(h => {
      if (h.id !== hookId) return h;
      return { ...h, actions: h.actions.filter((_, i) => i !== idx) };
    }));
  };

  const activeCount = hooks.filter(h => h.enabled).length;
  const successRate = executions.length > 0
    ? Math.round((executions.filter(e => e.status === 'success').length / executions.length) * 100) : 100;

  return (
    <div className="h-full bg-background flex flex-col font-mono text-xs">
      {/* Stats */}
      <div className="flex items-center gap-4 px-3 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Hooks:</span>
          <span className="text-primary font-bold">{hooks.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Active:</span>
          <span className="text-prime-green font-bold">{activeCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Executions:</span>
          <span className="text-foreground font-bold">{executions.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Success:</span>
          <span className={`font-bold ${successRate > 90 ? 'text-prime-green' : 'text-prime-amber'}`}>{successRate}%</span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Hook List */}
        <div className="w-48 border-r border-border flex flex-col">
          <div className="p-2 border-b border-border flex items-center justify-between">
            <span className="font-display text-[9px] tracking-wider uppercase text-primary">Workflows</span>
            <div className="flex gap-1">
              <button onClick={() => setShowTemplates(!showTemplates)} className="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Templates">
                <BookTemplate size={11} />
              </button>
              <button onClick={() => addHook()} className="p-0.5 rounded hover:bg-primary/10 text-primary"><Plus size={12} /></button>
            </div>
          </div>

          {showTemplates && (
            <div className="border-b border-primary/20 bg-primary/5 p-2 space-y-1">
              <p className="text-[8px] text-primary font-display tracking-wider uppercase">Templates</p>
              {TEMPLATES.map(tpl => (
                <button key={tpl.id} onClick={() => addHook(tpl)}
                  className="w-full text-left px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/30">
                  {tpl.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {hooks.map(h => (
              <button key={h.id} onClick={() => setSelectedId(h.id)}
                className={`w-full text-left px-2 py-1.5 border-b border-border/30 transition-colors ${
                  selectedId === h.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                }`}>
                <div className="flex items-center gap-1.5">
                  {h.enabled ? <span className="w-1.5 h-1.5 rounded-full bg-prime-green" /> : <Pause size={8} className="text-prime-amber" />}
                  <span className="truncate text-[10px]">{h.name}</span>
                </div>
                <span className="text-[8px] text-muted-foreground/60 truncate block">{h.trigger}</span>
              </button>
            ))}
            {hooks.length === 0 && (
              <div className="p-3 text-center text-muted-foreground text-[10px]">No hooks yet. Create one or use a template.</div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {selected ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="flex items-center justify-between">
                <input value={selected.name} onChange={e => updateHook(selected.id, { name: e.target.value })}
                  className="bg-transparent border-b border-border text-foreground font-display text-sm tracking-wider focus:outline-none focus:border-primary w-48" />
                <div className="flex items-center gap-1.5">
                  <button onClick={() => {
                    eventBus.emit(selected.trigger, { test: true });
                  }} className="flex items-center gap-1 px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 text-[9px]">
                    <Zap size={10} /> Test
                  </button>
                  <button onClick={() => deleteHook(selected.id)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-wider block mb-1">Trigger Event</label>
                  <select value={selected.trigger} onChange={e => updateHook(selected.id, { trigger: e.target.value })}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-[10px] text-foreground">
                    {EVENT_TYPES.map(ev => <option key={ev} value={ev}>{ev}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-wider block mb-1">Condition (optional)</label>
                  <input value={selected.condition} onChange={e => updateHook(selected.id, { condition: e.target.value })}
                    placeholder="filter text..." className="w-full bg-background border border-border rounded px-2 py-1 text-[10px] text-foreground" />
                </div>
              </div>

              {/* Actions */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[9px] text-muted-foreground uppercase tracking-wider">Actions</label>
                  <button onClick={() => addAction(selected.id)} className="p-0.5 rounded hover:bg-primary/10 text-primary"><Plus size={10} /></button>
                </div>
                <div className="space-y-2">
                  {selected.actions.map((action, idx) => (
                    <div key={idx} className="p-2 rounded border border-border/50 bg-card/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <select value={action.type} onChange={e => updateAction(selected.id, idx, { type: e.target.value as any, config: {} })}
                          className="bg-background border border-border rounded px-2 py-0.5 text-[10px] text-foreground">
                          {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                        <button onClick={() => removeAction(selected.id, idx)} className="p-0.5 text-muted-foreground hover:text-destructive"><Trash2 size={10} /></button>
                      </div>
                      {action.type === 'notification' && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <input value={action.config.title || ''} onChange={e => updateAction(selected.id, idx, { config: { ...action.config, title: e.target.value } })}
                            placeholder="Title" className="bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground" />
                          <input value={action.config.message || ''} onChange={e => updateAction(selected.id, idx, { config: { ...action.config, message: e.target.value } })}
                            placeholder="Message" className="bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground" />
                        </div>
                      )}
                      {action.type === 'open_app' && (
                        <input value={action.config.app || ''} onChange={e => updateAction(selected.id, idx, { config: { ...action.config, app: e.target.value } })}
                          placeholder="App name (e.g. terminal)" className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground" />
                      )}
                      {action.type === 'copy_text' && (
                        <input value={action.config.text || ''} onChange={e => updateAction(selected.id, idx, { config: { ...action.config, text: e.target.value } })}
                          placeholder="Text to copy" className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground" />
                      )}
                      {action.type === 'webhook' && (
                        <input value={action.config.url || ''} onChange={e => updateAction(selected.id, idx, { config: { ...action.config, url: e.target.value } })}
                          placeholder="https://hooks.zapier.com/..." className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <span className="text-[9px] text-muted-foreground">Enabled</span>
                <button onClick={() => updateHook(selected.id, { enabled: !selected.enabled })}
                  className={`w-8 h-4 rounded-full transition-colors relative ${selected.enabled ? 'bg-primary/60' : 'bg-muted'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${selected.enabled ? 'left-4 bg-primary' : 'left-0.5 bg-muted-foreground'}`} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">Select or create a workflow</div>
          )}

          {/* Execution Log */}
          <div className="border-t border-border">
            <div className="px-3 py-1.5 bg-card/30 flex items-center gap-2">
              <RefreshCw size={10} className="text-primary" />
              <span className="font-display text-[9px] tracking-wider uppercase text-primary">Execution Log</span>
              <span className="text-[8px] text-muted-foreground ml-auto">{executions.length} events</span>
            </div>
            <div className="h-28 overflow-y-auto">
              {executions.length === 0 ? (
                <div className="p-3 text-center text-muted-foreground text-[10px]">No executions yet — hooks fire on real events</div>
              ) : executions.map(ex => (
                <div key={ex.id} className="flex items-center gap-2 px-3 py-1 border-b border-border/20 text-[10px]">
                  <CheckCircle size={10} className="text-prime-green shrink-0" />
                  <span className="text-muted-foreground w-16 shrink-0">{new Date(ex.timestamp).toLocaleTimeString('en-US', { hour12: false })}</span>
                  <span className="text-foreground truncate flex-1">{ex.hookName}</span>
                  <span className="text-muted-foreground/50 truncate max-w-24">{ex.trigger}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
