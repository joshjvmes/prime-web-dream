import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Zap, RefreshCw, Pause, BookTemplate, ChevronDown, ChevronRight, Bot, Send, Shield, TrendingUp, Briefcase, Palette, Rocket } from 'lucide-react';
import { eventBus, EVENT_TYPES } from '@/hooks/useEventBus';
import { supabase } from '@/integrations/supabase/client';
import { parseAndExecuteActions } from '@/components/os/rokcat/actionParser';

interface WorkflowAction {
  type: 'open_app' | 'close_app' | 'notification' | 'copy_text' | 'lock_screen' | 'webhook' | 'ai_command' | 'emit_event';
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

const MAX_EXECUTIONS = 50;

const ACTION_TYPES = [
  { value: 'open_app', label: 'Open App' },
  { value: 'notification', label: 'Show Notification' },
  { value: 'copy_text', label: 'Copy Text' },
  { value: 'lock_screen', label: 'Lock Screen' },
  { value: 'webhook', label: 'Send Webhook' },
  { value: 'ai_command', label: '🤖 AI Command (ROKCAT)' },
  { value: 'emit_event', label: '⚡ Emit Event' },
];

interface TemplateCategory {
  name: string;
  icon: React.ReactNode;
  templates: (Omit<WorkflowHook, 'id'> & { description: string })[];
}

const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    name: 'System & Security',
    icon: <Shield size={10} />,
    templates: [
      {
        name: 'Morning System Check',
        description: 'ROKCAT checks system health and opens the monitor on sign-in',
        trigger: 'user.signed-in', condition: '',
        actions: [{ type: 'ai_command', config: { command: 'Check system health, open the monitor, and give me a status report' } }],
        enabled: true,
      },
      {
        name: 'Security Alert Handler',
        description: 'Notifies and opens Security Console on threat detection',
        trigger: 'security.threat', condition: '',
        actions: [
          { type: 'notification', config: { title: '🛡️ Security Alert', message: 'Threat detected — opening Security Console' } },
          { type: 'open_app', config: { app: 'security' } },
        ],
        enabled: true,
      },
      {
        name: 'Lock on Idle',
        description: 'Automatically locks the screen when system goes idle',
        trigger: 'system.idle', condition: '',
        actions: [{ type: 'lock_screen', config: {} }],
        enabled: true,
      },
    ],
  },
  {
    name: 'Financial & Trading',
    icon: <TrendingUp size={10} />,
    templates: [
      {
        name: 'Market Open Brief',
        description: 'ROKCAT checks your portfolio and fetches market data when a "market" calendar event starts',
        trigger: 'calendar.event.starting', condition: 'market',
        actions: [{ type: 'ai_command', config: { command: 'Check my portfolio and get market data for my top holdings. Give me a brief summary.' } }],
        enabled: true,
      },
      {
        name: 'Balance Low Alert',
        description: 'ROKCAT checks your balance after every transaction and warns if low',
        trigger: 'wallet.transaction', condition: '',
        actions: [{ type: 'ai_command', config: { command: 'Check my balance and warn me if it\'s below 100 tokens' } }],
        enabled: true,
      },
    ],
  },
  {
    name: 'Productivity',
    icon: <Briefcase size={10} />,
    templates: [
      {
        name: 'Daily Standup Prep',
        description: 'ROKCAT opens your board, checks bookings, and summarizes your day on sign-in',
        trigger: 'user.signed-in', condition: '',
        actions: [{ type: 'ai_command', config: { command: 'Open my board, check today\'s bookings, and summarize what\'s on my plate today' } }],
        enabled: true,
      },
      {
        name: 'New Email Reactor',
        description: 'Notifies you and opens PrimeMail when a new email arrives',
        trigger: 'mail.received', condition: '',
        actions: [
          { type: 'notification', config: { title: '📧 New Email', message: 'You have new mail' } },
          { type: 'open_app', config: { app: 'mail' } },
        ],
        enabled: true,
      },
      {
        name: 'Meeting Conflict Check',
        description: 'ROKCAT checks for booking conflicts when a new calendar event is created',
        trigger: 'calendar.event.created', condition: '',
        actions: [{ type: 'ai_command', config: { command: 'List my bookings and check for any scheduling conflicts today' } }],
        enabled: true,
      },
      {
        name: 'File Upload Notifier',
        description: 'Shows a notification when a file is uploaded',
        trigger: 'file.uploaded', condition: '',
        actions: [{ type: 'notification', config: { title: 'Files', message: 'New file uploaded successfully' } }],
        enabled: true,
      },
      {
        name: 'Calendar Reminder Action',
        description: 'Fires a notification when a calendar event is about to start',
        trigger: 'calendar.event.starting', condition: '',
        actions: [{ type: 'notification', config: { title: 'Calendar', message: 'An event is starting soon!' } }],
        enabled: true,
      },
    ],
  },
  {
    name: 'Creative & Social',
    icon: <Palette size={10} />,
    templates: [
      {
        name: 'Auto Social Post',
        description: 'ROKCAT posts to PrimeSocial about newly uploaded files',
        trigger: 'file.uploaded', condition: '',
        actions: [{ type: 'ai_command', config: { command: 'Post to PrimeSocial announcing a new file was just uploaded. Be creative and enthusiastic.' } }],
        enabled: true,
      },
      {
        name: 'Canvas Art Generator',
        description: 'ROKCAT generates random art on PrimeCanvas during idle time',
        trigger: 'system.idle', condition: '',
        actions: [{ type: 'ai_command', config: { command: 'Open PrimeCanvas and draw a random piece of generative art using geometric shapes and vibrant colors' } }],
        enabled: true,
      },
    ],
  },
  {
    name: 'Autonomous & Advanced',
    icon: <Rocket size={10} />,
    templates: [
      {
        name: 'Full System Tour',
        description: 'ROKCAT opens multiple apps and gives you a guided walkthrough on sign-in',
        trigger: 'user.signed-in', condition: '',
        actions: [{ type: 'ai_command', config: { command: 'Open terminal, then monitor, then mail, then social — give me a full tour of the OS and what\'s happening right now' } }],
        enabled: true,
      },
      {
        name: 'Data Report Builder',
        description: 'ROKCAT creates a spreadsheet with metrics when a "report" event fires',
        trigger: 'calendar.event.starting', condition: 'report',
        actions: [{ type: 'ai_command', config: { command: 'Create a spreadsheet with today\'s system metrics and add a chart summarizing the data' } }],
        enabled: true,
      },
      {
        name: 'Welcome Workflow',
        description: 'Greets you on sign-in with a welcome notification',
        trigger: 'user.signed-in', condition: '',
        actions: [{ type: 'notification', config: { title: 'System', message: 'Welcome back, Operator.' } }],
        enabled: true,
      },
      {
        name: 'Trade → Social Announce',
        description: 'Chains events: emits a social event after a trade executes, then posts',
        trigger: 'trade.executed', condition: '',
        actions: [
          { type: 'notification', config: { title: '📈 Trade', message: 'Trade executed successfully' } },
          { type: 'ai_command', config: { command: 'Post to PrimeSocial about my latest trade. Be brief and confident.' } },
        ],
        enabled: true,
      },
    ],
  },
];

// Flatten for backward compat
const TEMPLATES: (Omit<WorkflowHook, 'id'> & { description?: string })[] =
  TEMPLATE_CATEGORIES.flatMap(c => c.templates);

export default function CloudHooksApp() {
  const [hooks, setHooks] = useState<WorkflowHook[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const selected = hooks.find(h => h.id === selectedId) ?? null;

  // Get user and load hooks from DB
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        (supabase.from('cloud_hooks') as any).select('*').eq('user_id', uid).order('created_at').then(({ data: rows }: any) => {
          if (rows) {
            const mapped: WorkflowHook[] = rows.map((r: any) => ({
              id: r.id,
              name: r.name,
              trigger: r.trigger_event,
              condition: (r.action_config as any)?.condition || '',
              actions: (r.action_config as any)?.actions || [],
              enabled: r.enabled,
            }));
            setHooks(mapped);
            if (mapped.length > 0) setSelectedId(mapped[0].id);
          }
          setLoaded(true);
        });
      } else {
        setLoaded(true);
      }
    });
  }, []);

  // Persist a hook to DB
  const persistHook = useCallback(async (hook: WorkflowHook) => {
    if (!userId) return;
    await (supabase.from('cloud_hooks') as any).upsert({
      id: hook.id,
      user_id: userId,
      name: hook.name,
      trigger_event: hook.trigger,
      action_type: hook.actions[0]?.type || 'notification',
      action_config: { actions: hook.actions, condition: hook.condition },
      enabled: hook.enabled,
    }, { onConflict: 'id' });
  }, [userId]);

  // Execute an ai_command action
  const executeAiCommand = useCallback(async (command: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('[CloudHooks] No session for ai_command');
        return;
      }
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/hyper-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: command }],
          stream: false,
        }),
      });
      const text = await res.text();
      // Parse for action tags and execute them
      if (text) {
        parseAndExecuteActions(text);
      }
    } catch (e) {
      console.error('[CloudHooks] ai_command error:', e);
    }
  }, []);

  // Subscribe to events and execute hooks
  useEffect(() => {
    if (!loaded) return;
    const handlers = new Map<string, (payload: any) => void>();

    for (const hook of hooks) {
      if (!hook.enabled) continue;
      const handler = (payload: any) => {
        if (hook.condition) {
          try {
            const payloadStr = JSON.stringify(payload || {});
            if (!payloadStr.toLowerCase().includes(hook.condition.toLowerCase())) return;
          } catch {}
        }

        for (const action of hook.actions) {
          try {
            switch (action.type) {
              case 'notification':
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
                    method: 'POST', mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event: hook.trigger, payload, hook: hook.name }),
                  }).catch(() => {});
                }
                break;
              case 'ai_command':
                if (action.config.command) {
                  executeAiCommand(action.config.command);
                }
                break;
              case 'emit_event':
                if (action.config.event) {
                  try {
                    const evPayload = action.config.payload ? JSON.parse(action.config.payload) : {};
                    eventBus.emit(action.config.event, evPayload);
                  } catch {
                    eventBus.emit(action.config.event, {});
                  }
                }
                break;
            }
          } catch {}
        }

        setExecutions(prev => [{
          id: `exec-${Date.now()}`, hookName: hook.name, trigger: hook.trigger,
          timestamp: Date.now(), status: 'success' as const, message: `Triggered by ${hook.trigger}`,
        }, ...prev].slice(0, MAX_EXECUTIONS));
      };

      const existing = handlers.get(hook.trigger);
      if (existing) {
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

    return () => { handlers.forEach((handler, event) => eventBus.off(event, handler)); };
  }, [hooks, loaded, executeAiCommand]);

  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const updateHook = (id: string, updates: Partial<WorkflowHook>) => {
    setHooks(prev => {
      const next = prev.map(h => h.id === id ? { ...h, ...updates } : h);
      const updated = next.find(h => h.id === id);
      if (updated) persistHook(updated);
      return next;
    });
  };

  const addHook = async (template?: Omit<WorkflowHook, 'id'>) => {
    if (!userId) return;
    const base = template || {
      name: 'New Hook', trigger: EVENT_TYPES[0], condition: '',
      actions: [{ type: 'notification' as const, config: { title: 'Hook', message: 'Triggered!' } }], enabled: true,
    };
    const { data } = await (supabase.from('cloud_hooks') as any).insert({
      user_id: userId, name: base.name, trigger_event: base.trigger,
      action_type: base.actions[0]?.type || 'notification',
      action_config: { actions: base.actions, condition: base.condition },
      enabled: base.enabled,
    }).select().single();

    if (data) {
      const newHook: WorkflowHook = {
        id: data.id, name: data.name, trigger: data.trigger_event,
        condition: (data.action_config as any)?.condition || '',
        actions: (data.action_config as any)?.actions || [],
        enabled: data.enabled,
      };
      setHooks(prev => [...prev, newHook]);
      setSelectedId(newHook.id);
    }
    setShowTemplates(false);
  };

  const deleteHook = async (id: string) => {
    await (supabase.from('cloud_hooks') as any).delete().eq('id', id);
    setHooks(prev => prev.filter(h => h.id !== id));
    if (selectedId === id) setSelectedId(hooks.find(h => h.id !== id)?.id ?? null);
  };

  const updateAction = (hookId: string, actionIdx: number, updates: Partial<WorkflowAction>) => {
    setHooks(prev => {
      const next = prev.map(h => {
        if (h.id !== hookId) return h;
        const newActions = [...h.actions];
        newActions[actionIdx] = { ...newActions[actionIdx], ...updates };
        return { ...h, actions: newActions };
      });
      const updated = next.find(h => h.id === hookId);
      if (updated) persistHook(updated);
      return next;
    });
  };

  const addAction = (hookId: string) => {
    setHooks(prev => {
      const next = prev.map(h => {
        if (h.id !== hookId) return h;
        return { ...h, actions: [...h.actions, { type: 'notification' as const, config: { title: 'Hook', message: 'Action' } }] };
      });
      const updated = next.find(h => h.id === hookId);
      if (updated) persistHook(updated);
      return next;
    });
  };

  const removeAction = (hookId: string, idx: number) => {
    setHooks(prev => {
      const next = prev.map(h => {
        if (h.id !== hookId) return h;
        return { ...h, actions: h.actions.filter((_, i) => i !== idx) };
      });
      const updated = next.find(h => h.id === hookId);
      if (updated) persistHook(updated);
      return next;
    });
  };

  const activeCount = hooks.filter(h => h.enabled).length;
  const successRate = executions.length > 0
    ? Math.round((executions.filter(e => e.status === 'success').length / executions.length) * 100) : 100;

  if (!loaded) return <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">Loading…</div>;

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
        <div className="w-52 border-r border-border flex flex-col">
          <div className="p-2 border-b border-border flex items-center justify-between">
            <span className="font-display text-[9px] tracking-wider uppercase text-primary">Workflows</span>
            <div className="flex gap-1">
              <button onClick={() => setShowTemplates(!showTemplates)} className="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Browse Presets">
                <BookTemplate size={11} />
              </button>
              <button onClick={() => addHook()} className="p-0.5 rounded hover:bg-primary/10 text-primary"><Plus size={12} /></button>
            </div>
          </div>

          {showTemplates && (
            <div className="border-b border-primary/20 bg-primary/5 max-h-64 overflow-y-auto">
              <p className="text-[8px] text-primary font-display tracking-wider uppercase px-2 pt-2 pb-1">Preset Workflows</p>
              {TEMPLATE_CATEGORIES.map(cat => (
                <div key={cat.name}>
                  <button
                    onClick={() => toggleCategory(cat.name)}
                    className="w-full flex items-center gap-1.5 px-2 py-1 text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted/20 font-semibold"
                  >
                    {expandedCategories.has(cat.name) ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
                    {cat.icon}
                    <span>{cat.name}</span>
                    <span className="ml-auto text-[8px] text-muted-foreground/50">{cat.templates.length}</span>
                  </button>
                  {expandedCategories.has(cat.name) && cat.templates.map((tpl, i) => (
                    <button key={i} onClick={() => addHook(tpl)}
                      className="w-full text-left px-4 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/30 group">
                      <div className="flex items-center gap-1">
                        {tpl.actions.some(a => a.type === 'ai_command') && <Bot size={8} className="text-primary shrink-0" />}
                        <span className="truncate">{tpl.name}</span>
                      </div>
                      <span className="text-[8px] text-muted-foreground/50 block truncate group-hover:text-muted-foreground/70">{tpl.description}</span>
                    </button>
                  ))}
                </div>
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
                  {h.actions.some(a => a.type === 'ai_command') && <Bot size={8} className="text-primary" />}
                  <span className="truncate text-[10px]">{h.name}</span>
                </div>
                <span className="text-[8px] text-muted-foreground/60 truncate block">{h.trigger}</span>
              </button>
            ))}
            {hooks.length === 0 && (
              <div className="p-3 text-center text-muted-foreground text-[10px]">No hooks yet. Click <BookTemplate size={9} className="inline" /> to browse presets.</div>
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
                  <button onClick={() => eventBus.emit(selected.trigger, { test: true })}
                    className="flex items-center gap-1 px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 text-[9px]">
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
                      {action.type === 'ai_command' && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[8px] text-primary/70">
                            <Bot size={8} /> ROKCAT will execute this command with your full tool suite
                          </div>
                          <textarea
                            value={action.config.command || ''}
                            onChange={e => updateAction(selected.id, idx, { config: { ...action.config, command: e.target.value } })}
                            placeholder="e.g. Check my balance and post a status update to PrimeSocial"
                            rows={2}
                            className="w-full bg-background border border-border rounded px-1.5 py-1 text-[10px] text-foreground resize-none"
                          />
                        </div>
                      )}
                      {action.type === 'emit_event' && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <select
                              value={action.config.event || ''}
                              onChange={e => updateAction(selected.id, idx, { config: { ...action.config, event: e.target.value } })}
                              className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground"
                            >
                              <option value="">Select event…</option>
                              {EVENT_TYPES.map(ev => <option key={ev} value={ev}>{ev}</option>)}
                            </select>
                          </div>
                          <input
                            value={action.config.payload || ''}
                            onChange={e => updateAction(selected.id, idx, { config: { ...action.config, payload: e.target.value } })}
                            placeholder='{"key":"value"}'
                            className="bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground"
                          />
                        </div>
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
                  <span className={`w-1.5 h-1.5 rounded-full ${ex.status === 'success' ? 'bg-prime-green' : 'bg-destructive'}`} />
                  <span className="text-foreground font-semibold truncate">{ex.hookName}</span>
                  <span className="text-muted-foreground/50 truncate">{ex.trigger}</span>
                  <span className="text-[8px] text-muted-foreground/40 ml-auto shrink-0">
                    {new Date(ex.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
