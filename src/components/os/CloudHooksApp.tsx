import { useState, useEffect, useCallback } from 'react';
import { Plus, Play, Pause, AlertTriangle, CheckCircle, XCircle, Zap, RefreshCw, Trash2 } from 'lucide-react';

interface Hook {
  id: string;
  name: string;
  description: string;
  triggerEvent: string;
  target: string;
  payloadTemplate: string;
  retryCount: number;
  retryDelay: number;
  enabled: boolean;
  status: 'active' | 'paused' | 'error';
}

interface Execution {
  id: string;
  hookName: string;
  timestamp: number;
  status: 'success' | 'fail';
  responseTime: number;
  payload: string;
}

const TRIGGER_EVENTS = [
  'node.online', 'node.offline', 'energy.cop.threshold',
  'q3.inference.complete', 'foldmem.compact', 'primenet.route.change',
  'security.alert', 'storage.region.full',
];

const DEFAULT_HOOKS: Hook[] = [
  { id: '1', name: 'Node Health Alert', description: 'Alert when node goes offline', triggerEvent: 'node.offline', target: 'prime://alerts/node-health', payloadTemplate: '{"node": "$NODE_ID", "status": "offline"}', retryCount: 3, retryDelay: 5, enabled: true, status: 'active' },
  { id: '2', name: 'COP Threshold', description: 'Notify on COP exceeding threshold', triggerEvent: 'energy.cop.threshold', target: 'prime://energy/cop-alert', payloadTemplate: '{"cop": "$COP_VALUE", "threshold": 3.5}', retryCount: 2, retryDelay: 10, enabled: true, status: 'active' },
  { id: '3', name: 'Security Scanner', description: 'Trigger scan on security alert', triggerEvent: 'security.alert', target: 'prime://security/auto-scan', payloadTemplate: '{"type": "$ALERT_TYPE", "severity": "$SEVERITY"}', retryCount: 5, retryDelay: 3, enabled: false, status: 'paused' },
];

export default function CloudHooksApp() {
  const [hooks, setHooks] = useState<Hook[]>(DEFAULT_HOOKS);
  const [selectedId, setSelectedId] = useState<string | null>(hooks[0]?.id ?? null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [execToday, setExecToday] = useState(47);

  const selected = hooks.find(h => h.id === selectedId) ?? null;

  const addExecution = useCallback((hookName: string, manual = false) => {
    const status: 'success' | 'fail' = Math.random() > 0.15 ? 'success' : 'fail';
    setExecutions(prev => [{
      id: `exec-${Date.now()}`,
      hookName,
      timestamp: Date.now(),
      status,
      responseTime: Math.floor(20 + Math.random() * 180),
      payload: manual ? '{"test": true}' : `{"event": "${TRIGGER_EVENTS[Math.floor(Math.random() * TRIGGER_EVENTS.length)]}"}`,
    }, ...prev].slice(0, 50));
    setExecToday(p => p + 1);
  }, []);

  // Auto-generate executions
  useEffect(() => {
    const interval = setInterval(() => {
      const activeHooks = hooks.filter(h => h.enabled);
      if (activeHooks.length > 0) {
        const h = activeHooks[Math.floor(Math.random() * activeHooks.length)];
        addExecution(h.name);
      }
    }, 8000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, [hooks, addExecution]);

  const updateHook = (id: string, updates: Partial<Hook>) => {
    setHooks(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const addHook = () => {
    const newHook: Hook = {
      id: `hook-${Date.now()}`,
      name: 'New Hook',
      description: '',
      triggerEvent: TRIGGER_EVENTS[0],
      target: 'prime://',
      payloadTemplate: '{}',
      retryCount: 3,
      retryDelay: 5,
      enabled: true,
      status: 'active',
    };
    setHooks(prev => [...prev, newHook]);
    setSelectedId(newHook.id);
  };

  const deleteHook = (id: string) => {
    setHooks(prev => prev.filter(h => h.id !== id));
    if (selectedId === id) setSelectedId(hooks[0]?.id ?? null);
  };

  const activeCount = hooks.filter(h => h.enabled).length;
  const successRate = executions.length > 0
    ? Math.round((executions.filter(e => e.status === 'success').length / executions.length) * 100)
    : 100;

  return (
    <div className="h-full bg-background flex flex-col font-mono text-xs">
      {/* Stats Header */}
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
          <span className="text-muted-foreground">Today:</span>
          <span className="text-foreground font-bold">{execToday}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Success:</span>
          <span className={`font-bold ${successRate > 90 ? 'text-prime-green' : successRate > 70 ? 'text-prime-amber' : 'text-destructive'}`}>{successRate}%</span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Hook List */}
        <div className="w-48 border-r border-border flex flex-col">
          <div className="p-2 border-b border-border flex items-center justify-between">
            <span className="font-display text-[9px] tracking-wider uppercase text-primary">Hooks</span>
            <button onClick={addHook} className="p-0.5 rounded hover:bg-primary/10 text-primary"><Plus size={12} /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {hooks.map(h => (
              <button
                key={h.id}
                onClick={() => setSelectedId(h.id)}
                className={`w-full text-left px-2 py-1.5 border-b border-border/30 transition-colors ${
                  selectedId === h.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {h.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-prime-green" />}
                  {h.status === 'paused' && <Pause size={8} className="text-prime-amber" />}
                  {h.status === 'error' && <AlertTriangle size={8} className="text-destructive" />}
                  <span className="truncate text-[10px]">{h.name}</span>
                </div>
                <span className="text-[8px] text-muted-foreground/60 truncate block">{h.triggerEvent}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hook Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {selected ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="flex items-center justify-between">
                <input
                  value={selected.name}
                  onChange={e => updateHook(selected.id, { name: e.target.value })}
                  className="bg-transparent border-b border-border text-foreground font-display text-sm tracking-wider focus:outline-none focus:border-primary w-48"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => addExecution(selected.name, true)}
                    className="flex items-center gap-1 px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 text-[9px]"
                  >
                    <Zap size={10} /> Test
                  </button>
                  <button
                    onClick={() => deleteHook(selected.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <input
                value={selected.description}
                onChange={e => updateHook(selected.id, { description: e.target.value })}
                placeholder="Description..."
                className="w-full bg-background border border-border rounded px-2 py-1 text-[10px] text-foreground placeholder:text-muted-foreground/50"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-wider block mb-1">Trigger Event</label>
                  <select
                    value={selected.triggerEvent}
                    onChange={e => updateHook(selected.id, { triggerEvent: e.target.value })}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-[10px] text-foreground"
                  >
                    {TRIGGER_EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-wider block mb-1">Target Endpoint</label>
                  <input
                    value={selected.target}
                    onChange={e => updateHook(selected.id, { target: e.target.value })}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-[10px] text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] text-muted-foreground uppercase tracking-wider block mb-1">Payload Template</label>
                <textarea
                  value={selected.payloadTemplate}
                  onChange={e => updateHook(selected.id, { payloadTemplate: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-[10px] text-foreground font-mono h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-wider block mb-1">Retries: {selected.retryCount}</label>
                  <input type="range" min={0} max={10} value={selected.retryCount} onChange={e => updateHook(selected.id, { retryCount: Number(e.target.value) })} className="w-full accent-primary h-1" />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-wider block mb-1">Delay: {selected.retryDelay}s</label>
                  <input type="range" min={1} max={30} value={selected.retryDelay} onChange={e => updateHook(selected.id, { retryDelay: Number(e.target.value) })} className="w-full accent-primary h-1" />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[9px] text-muted-foreground">Enabled</span>
                  <button
                    onClick={() => updateHook(selected.id, { enabled: !selected.enabled, status: !selected.enabled ? 'active' : 'paused' })}
                    className={`w-8 h-4 rounded-full transition-colors relative ${selected.enabled ? 'bg-primary/60' : 'bg-muted'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${selected.enabled ? 'left-4 bg-primary' : 'left-0.5 bg-muted-foreground'}`} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">Select or create a hook</div>
          )}

          {/* Execution Log */}
          <div className="border-t border-border">
            <div className="px-3 py-1.5 bg-card/30 flex items-center gap-2">
              <RefreshCw size={10} className="text-primary animate-spin" style={{ animationDuration: '3s' }} />
              <span className="font-display text-[9px] tracking-wider uppercase text-primary">Execution Log</span>
            </div>
            <div className="h-28 overflow-y-auto">
              {executions.length === 0 ? (
                <div className="p-3 text-center text-muted-foreground text-[10px]">No executions yet</div>
              ) : executions.map(ex => (
                <div key={ex.id} className="flex items-center gap-2 px-3 py-1 border-b border-border/20 text-[10px]">
                  {ex.status === 'success' ? <CheckCircle size={10} className="text-prime-green shrink-0" /> : <XCircle size={10} className="text-destructive shrink-0" />}
                  <span className="text-muted-foreground w-16 shrink-0">{new Date(ex.timestamp).toLocaleTimeString('en-US', { hour12: false })}</span>
                  <span className="text-foreground truncate flex-1">{ex.hookName}</span>
                  <span className="text-muted-foreground shrink-0">{ex.responseTime}ms</span>
                  <span className="text-muted-foreground/50 truncate max-w-24">{ex.payload}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
