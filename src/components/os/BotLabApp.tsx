import { useState, useEffect, useCallback } from 'react';
import { Bot, Plus, Key, Activity, Trash2, Copy, Power, PowerOff, RefreshCw, Eye, EyeOff, Loader2, ChevronRight, Rocket, BookOpen, ChevronDown, ListTodo, Brain, XCircle, Clock, Zap, Play } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BotRecord {
  id: string;
  name: string;
  description: string;
  bot_type: string;
  permissions: string[];
  system_prompt: string;
  trigger_config: Record<string, unknown> | null;
  schedule: string | null;
  is_active: boolean;
  rate_limit: number;
  created_at: string;
  updated_at: string;
}

interface ApiKeyRecord {
  id: string;
  key_prefix: string;
  is_revoked: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface AuditRecord {
  id: string;
  bot_id: string;
  tool_name: string;
  args: Record<string, unknown>;
  result_summary: string | null;
  status: string;
  created_at: string;
}

interface AgentTask {
  id: string;
  bot_id: string;
  lane: string;
  status: string;
  instruction: string;
  steps: any[];
  max_steps: number;
  parent_task_id: string | null;
  result: any;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface AgentRun {
  id: string;
  task_id: string;
  bot_id: string;
  status: string;
  steps: any[];
  token_usage: any;
  started_at: string;
  completed_at: string | null;
}

interface AgentMemoryEntry {
  id: string;
  bot_id: string;
  namespace: string;
  key: string;
  value: any;
  updated_at: string;
}

const TOOL_CATEGORIES: Record<string, string[]> = {
  "Market Data": ["get_market_data", "get_stock_chart"],
  "Portfolio": ["check_portfolio", "trade_stock"],
  "Booking": ["create_booking", "list_bookings", "cancel_booking"],
  "Messaging": ["send_message", "list_conversations"],
  "Financial": ["check_balance", "transfer_tokens", "buy_shares", "sell_shares", "place_bet"],
  "Audio": ["control_audio"],
  "Canvas": ["draw_on_canvas", "generate_canvas_art"],
  "Spreadsheet": ["create_spreadsheet", "update_cells", "add_chart", "read_spreadsheet"],
  "Social": ["post_to_social", "send_email"],
  "Memory": ["save_memory", "recall_memories"],
};

interface BotPreset {
  name: string;
  description: string;
  icon: string;
  permissions: string[];
  bot_type: 'autonomous' | 'scheduled';
  system_prompt: string;
  trigger_config?: { events: string[] };
  schedule?: string;
}

const BOT_PRESETS: BotPreset[] = [
  { name: 'Market Watcher', description: 'Monitors stock prices and alerts on big moves', icon: '📈', permissions: ['get_market_data', 'get_stock_chart', 'send_message'], bot_type: 'autonomous', system_prompt: 'You are a market monitoring bot. Watch for significant price movements and alert the user.', trigger_config: { events: ['market.checked'] } },
  { name: 'Portfolio Guardian', description: 'Tracks vault holdings and sends daily summaries', icon: '🛡️', permissions: ['check_portfolio', 'get_market_data', 'save_memory'], bot_type: 'scheduled', system_prompt: 'You are a portfolio tracking bot. Summarize holdings and performance daily.', schedule: '0 9 * * *' },
  { name: 'Booking Assistant', description: 'Auto-manages resource bookings and conflicts', icon: '📅', permissions: ['create_booking', 'list_bookings', 'cancel_booking'], bot_type: 'autonomous', system_prompt: 'You manage resource bookings. Resolve conflicts and optimize schedules.', trigger_config: { events: ['booking.created', 'booking.conflict'] } },
  { name: 'Social Publisher', description: 'Posts scheduled updates to PrimeSocial', icon: '📢', permissions: ['post_to_social', 'save_memory', 'recall_memories'], bot_type: 'scheduled', system_prompt: 'You are a social media bot. Create and schedule engaging posts.', schedule: '0 12 * * *' },
  { name: 'Canvas Artist', description: 'Creates procedural art on demand', icon: '🎨', permissions: ['draw_on_canvas', 'generate_canvas_art'], bot_type: 'autonomous', system_prompt: 'You are a generative art bot. Create beautiful procedural art on the canvas.', trigger_config: { events: ['canvas.request'] } },
  { name: 'Data Reporter', description: 'Builds spreadsheet reports from system data', icon: '📊', permissions: ['create_spreadsheet', 'update_cells', 'add_chart', 'read_spreadsheet'], bot_type: 'scheduled', system_prompt: 'You build data reports. Gather system data and compile into spreadsheets with charts.', schedule: '0 8 * * 1' },
  { name: 'Chat Relay', description: 'Forwards messages between channels', icon: '💬', permissions: ['send_message', 'list_conversations'], bot_type: 'autonomous', system_prompt: 'You relay messages between channels. Forward relevant messages to keep teams in sync.', trigger_config: { events: ['message.received'] } },
  { name: 'DJ Bot', description: 'Controls PrimeAudio based on time of day', icon: '🎵', permissions: ['control_audio'], bot_type: 'scheduled', system_prompt: 'You control the audio system. Play appropriate music based on time of day and mood.', schedule: '0 */3 * * *' },
];

interface DocSection {
  id: string;
  title: string;
  content: string;
  subsections?: { title: string; content: string }[];
}

const DOCS: DocSection[] = [
  {
    id: 'getting-started', title: '🚀 Getting Started',
    content: 'Bots in PRIME OS are automated agents that perform tasks on your behalf. They can monitor markets, manage bookings, post to social media, and much more.',
    subsections: [
      { title: 'Creating Your First Bot', content: 'You can create bots in two ways:\n\n**Natural Language**: Describe what your bot should do in plain English. The AI will generate the configuration.\n\n**One-Click Presets**: Choose from ready-made templates in the "Quick Deploy" section and deploy instantly.' },
      { title: 'Bot Types', content: '**Autonomous**: Event-driven bots that react to system events (e.g., price changes, new messages).\n\n**Scheduled**: Cron-based bots that run at specific intervals (e.g., daily reports, hourly checks).\n\n**External**: API-connected bots for third-party tools like Claude, Cursor, or custom scripts.' },
    ],
  },
  {
    id: 'agent-runtime', title: '⚡ Agent Runtime',
    content: 'The Agent Runtime provides a full orchestration layer for your bots.',
    subsections: [
      { title: 'Task Queue', content: 'Tasks are organized into priority lanes:\n\n🔴 **Critical** — Safety/security actions\n🟠 **High** — User-initiated tasks\n🔵 **Normal** — Default lane\n⚪ **Low** — Background automation\n🌑 **Background** — Maintenance/cleanup\n\nThe executor processes tasks in lane-priority order, then FIFO within each lane.' },
      { title: 'Sub-Agents', content: 'Agents can spawn child tasks using `spawn_subtask`. The parent can check results with `check_subtask`. Cancelling a parent cascades to children.' },
      { title: 'Persistent Memory', content: 'Each bot has isolated persistent memory organized by namespace (`facts`, `context`, `conversation`, `state`). Use `save_to_memory` and `recall_from_memory` tools.' },
      { title: 'Streaming', content: 'Execution steps stream to the UI in real-time via database realtime subscriptions. Each step shows the action taken and its result.' },
    ],
  },
  {
    id: 'tool-reference', title: '🔧 Tool Reference',
    content: 'Every bot has access to a set of tools based on its permissions.',
    subsections: [
      { title: 'Market Data', content: '`get_market_data` — Fetch live stock/crypto prices\n`get_stock_chart` — Get price chart data' },
      { title: 'Portfolio', content: '`check_portfolio` — View vault holdings and P&L\n`trade_stock` — Execute buy/sell orders' },
      { title: 'Agent Tools', content: '`spawn_subtask` — Delegate tasks to child agents\n`save_to_memory` — Persist data to bot memory\n`recall_from_memory` — Retrieve from memory\n`check_subtask` — Check subtask status\n`emit_status` — Emit status update' },
    ],
  },
  {
    id: 'api-reference', title: '🔌 API Reference',
    content: 'External agents connect via REST API using API keys.',
    subsections: [
      { title: 'Endpoint', content: '```\nPOST /functions/v1/bot-api?action=<action>\nHeaders:\n  X-Bot-Key: clw_<your_key>\n  Content-Type: application/json\n```' },
      { title: 'Actions', content: '`tools` (GET) — List available tools\n`execute` (POST) — Execute a tool\n`chat` (POST) — Chat with bot AI\n`status` (GET) — Bot status & rate limit info' },
    ],
  },
];

const LANE_COLORS: Record<string, string> = {
  critical: 'bg-destructive/20 text-destructive border-destructive/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  normal: 'bg-primary/20 text-primary border-primary/30',
  low: 'bg-muted text-muted-foreground border-border',
  background: 'bg-muted/50 text-muted-foreground/60 border-border/50',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  queued: <Clock size={10} className="text-muted-foreground" />,
  running: <Loader2 size={10} className="animate-spin text-primary" />,
  completed: <Zap size={10} className="text-green-400" />,
  failed: <XCircle size={10} className="text-destructive" />,
  cancelled: <XCircle size={10} className="text-muted-foreground" />,
};

async function callBotApi(action: string, body?: Record<string, unknown>, botId?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
  if (botId) headers["x-bot-id"] = botId;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/bot-api?action=${action}`;
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function callAgentRuntime(action: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/agent-runtime?action=${action}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Streaming Execution Log ──
function ExecutionLog({ run, task }: { run?: AgentRun | null; task?: AgentTask | null }) {
  const steps = run?.steps || task?.steps || [];
  const startTime = run?.started_at || task?.started_at || task?.created_at;

  if (!steps.length) return <p className="text-[10px] text-muted-foreground p-2">No steps yet.</p>;

  return (
    <div className="space-y-1 p-2">
      <div className="flex items-center gap-2 text-[10px] mb-2">
        <Badge variant="outline" className={`text-[8px] ${LANE_COLORS[task?.lane || 'normal']}`}>
          {task?.lane || 'normal'}
        </Badge>
        <span className="text-muted-foreground">
          Steps: {steps.length}/{task?.max_steps || 10}
        </span>
        {run?.token_usage && (
          <span className="text-muted-foreground ml-auto">
            {run.token_usage.total} tokens
          </span>
        )}
      </div>
      {steps.map((step: any, i: number) => {
        const elapsed = startTime
          ? Math.round((new Date(step.timestamp).getTime() - new Date(startTime).getTime()) / 1000)
          : 0;
        const isToolCall = step.action?.startsWith('tool:');
        const toolName = isToolCall ? step.action.replace('tool:', '') : null;

        return (
          <div key={i} className="flex items-start gap-2 text-[10px] py-0.5">
            <span className="text-muted-foreground/60 shrink-0 w-10 text-right font-mono">
              [{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}]
            </span>
            {step.action === 'complete' ? (
              <span className="text-green-400">✓ {typeof step.result === 'string' ? step.result.slice(0, 200) : 'Complete'}</span>
            ) : step.action === 'error' ? (
              <span className="text-destructive">✗ {step.result}</span>
            ) : isToolCall ? (
              <span>
                <span className="text-primary">{toolName}</span>
                <span className="text-muted-foreground"> → {typeof step.result === 'object' ? JSON.stringify(step.result).slice(0, 120) : String(step.result).slice(0, 120)}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{step.action}: {JSON.stringify(step.result).slice(0, 120)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BotLabApp() {
  const [bots, setBots] = useState<BotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("bots");
  const [selectedBot, setSelectedBot] = useState<BotRecord | null>(null);
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [deployingPreset, setDeployingPreset] = useState<string | null>(null);
  const [docSection, setDocSection] = useState<string | null>(null);

  // Create bot state
  const [createDesc, setCreateDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<Record<string, unknown> | null>(null);

  // Tasks state
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [activeRun, setActiveRun] = useState<AgentRun | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [enqueueInstruction, setEnqueueInstruction] = useState("");
  const [enqueueLane, setEnqueueLane] = useState("normal");
  const [enqueuing, setEnqueuing] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Memory state
  const [memories, setMemories] = useState<AgentMemoryEntry[]>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [newMemKey, setNewMemKey] = useState("");
  const [newMemValue, setNewMemValue] = useState("");
  const [newMemNs, setNewMemNs] = useState("facts");

  const loadBots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callBotApi("status");
      setBots(data.bots || []);
    } catch (e) { toast.error("Failed to load bots"); }
    setLoading(false);
  }, []);

  useEffect(() => { loadBots(); }, [loadBots]);

  const loadKeys = useCallback(async (botId: string) => {
    const data = await callBotApi("list-keys", undefined, botId);
    setKeys(data.keys || []);
  }, []);

  const loadAuditLogs = useCallback(async () => {
    const data = await callBotApi("audit-log");
    setAuditLogs(data.logs || []);
  }, []);

  // Load tasks for selected bot
  const loadTasks = useCallback(async (botId?: string) => {
    setTasksLoading(true);
    try {
      const data = await callAgentRuntime("status", { bot_id: botId || selectedBot?.id });
      setTasks(data.tasks || []);
    } catch { toast.error("Failed to load tasks"); }
    setTasksLoading(false);
  }, [selectedBot]);

  // Load memory for selected bot
  const loadMemory = useCallback(async (botId?: string) => {
    setMemoryLoading(true);
    try {
      const data = await callAgentRuntime("memory", { bot_id: botId || selectedBot?.id, sub_action: "get" });
      setMemories(data.memories || []);
    } catch { toast.error("Failed to load memory"); }
    setMemoryLoading(false);
  }, [selectedBot]);

  useEffect(() => {
    if (tab === "activity") loadAuditLogs();
  }, [tab, loadAuditLogs]);

  useEffect(() => {
    if (selectedBot && tab === "keys") loadKeys(selectedBot.id);
    if (selectedBot && tab === "tasks") loadTasks(selectedBot.id);
    if (selectedBot && tab === "memory") loadMemory(selectedBot.id);
  }, [selectedBot, tab, loadKeys, loadTasks, loadMemory]);

  // Realtime subscription for agent_runs
  useEffect(() => {
    const channel = supabase
      .channel('agent-runs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_runs' }, (payload) => {
        const run = payload.new as AgentRun;
        if (selectedTask && run.task_id === selectedTask.id) {
          setActiveRun(run);
        }
      })
      .subscribe();

    const auditChannel = supabase
      .channel('bot-audit-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bot_audit_log' }, (payload) => {
        setAuditLogs(prev => [payload.new as AuditRecord, ...prev].slice(0, 100));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(auditChannel);
    };
  }, [selectedTask]);

  const toggleBot = async (bot: BotRecord) => {
    await callBotApi("update-bot", { is_active: !bot.is_active }, bot.id);
    loadBots();
  };

  const deleteBot = async (bot: BotRecord) => {
    if (!confirm(`Delete "${bot.name}"?`)) return;
    await callBotApi("delete-bot", {}, bot.id);
    if (selectedBot?.id === bot.id) setSelectedBot(null);
    loadBots();
  };

  const generateKey = async () => {
    if (!selectedBot) return;
    const data = await callBotApi("generate-key", {}, selectedBot.id);
    if (data.key) {
      setNewKey(data.key);
      loadKeys(selectedBot.id);
      toast.success("API key generated");
    } else toast.error(data.error || "Failed to generate key");
  };

  const revokeKey = async (keyId: string) => {
    await callBotApi("revoke-key", { key_id: keyId });
    if (selectedBot) loadKeys(selectedBot.id);
    toast.success("Key revoked");
  };

  const deployPreset = async (preset: BotPreset) => {
    setDeployingPreset(preset.name);
    try {
      const data = await callBotApi("create-bot", {
        name: preset.name, description: preset.description,
        permissions: preset.permissions, bot_type: preset.bot_type,
        system_prompt: preset.system_prompt,
        trigger_config: preset.trigger_config || null,
        schedule: preset.schedule || null,
      });
      if (data.bot) { toast.success(`"${preset.name}" deployed!`); loadBots(); setTab("bots"); }
      else toast.error(data.error || "Failed to deploy");
    } catch { toast.error("Deploy failed"); }
    setDeployingPreset(null);
  };

  const handleCreateBot = async () => {
    if (!createDesc.trim()) return;
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); setCreating(false); return; }
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/hyper-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Generate a bot configuration for this description. Return ONLY valid JSON with keys: name (string), description (string), permissions (array of tool names from: ${Object.values(TOOL_CATEGORIES).flat().join(", ")}), system_prompt (string for the bot personality), bot_type ("autonomous" or "scheduled"), trigger_config (object with "events" array or null), schedule (cron string or null). Description: "${createDesc}"` }],
        }),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || data.reply || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) setGeneratedConfig(JSON.parse(jsonMatch[0]));
      else toast.error("AI couldn't generate config. Try a more specific description.");
    } catch { toast.error("Failed to generate bot config"); }
    setCreating(false);
  };

  const confirmCreateBot = async () => {
    if (!generatedConfig) return;
    try {
      const data = await callBotApi("create-bot", generatedConfig as Record<string, unknown>);
      if (data.bot) {
        toast.success(`Bot "${data.bot.name}" created!`);
        setGeneratedConfig(null); setCreateDesc(""); loadBots(); setTab("bots");
      } else toast.error(data.error || "Failed");
    } catch { toast.error("Failed to create bot"); }
  };

  // ── Task actions ──
  const enqueueTask = async () => {
    if (!selectedBot || !enqueueInstruction.trim()) return;
    setEnqueuing(true);
    try {
      const data = await callAgentRuntime("enqueue", {
        bot_id: selectedBot.id,
        instruction: enqueueInstruction.trim(),
        lane: enqueueLane,
      });
      if (data.task) {
        toast.success("Task enqueued");
        setEnqueueInstruction("");
        loadTasks(selectedBot.id);
      } else toast.error(data.error || "Failed to enqueue");
    } catch { toast.error("Enqueue failed"); }
    setEnqueuing(false);
  };

  const executeTask = async (taskId?: string) => {
    if (!selectedBot) return;
    setExecuting(true);
    try {
      const data = await callAgentRuntime("execute", {
        bot_id: selectedBot.id,
        task_id: taskId,
      });
      if (data.status === "completed" || data.status === "failed") {
        loadTasks(selectedBot.id);
        toast.success(`Task ${data.status}`);
      } else if (data.message) {
        toast.info(data.message);
      }
    } catch (e) { toast.error("Execution failed"); }
    setExecuting(false);
  };

  const cancelTask = async (taskId: string) => {
    try {
      await callAgentRuntime("cancel", { task_id: taskId });
      toast.success("Task cancelled");
      loadTasks(selectedBot?.id);
    } catch { toast.error("Cancel failed"); }
  };

  // ── Memory actions ──
  const saveMemory = async () => {
    if (!selectedBot || !newMemKey.trim()) return;
    try {
      let parsedValue: any;
      try { parsedValue = JSON.parse(newMemValue); } catch { parsedValue = newMemValue; }
      await callAgentRuntime("memory", {
        bot_id: selectedBot.id, sub_action: "set",
        namespace: newMemNs, key: newMemKey.trim(), value: parsedValue,
      });
      toast.success("Memory saved");
      setNewMemKey(""); setNewMemValue("");
      loadMemory(selectedBot.id);
    } catch { toast.error("Save failed"); }
  };

  const deleteMemory = async (ns: string, key: string) => {
    if (!selectedBot) return;
    await callAgentRuntime("memory", {
      bot_id: selectedBot.id, sub_action: "delete", namespace: ns, key,
    });
    toast.success("Deleted");
    loadMemory(selectedBot.id);
  };

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const apiEndpoint = `https://${projectId}.supabase.co/functions/v1/bot-api`;

  const renderMd = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('```')) return null;
      if (line.match(/^`[^`]+`$/)) return <code key={i} className="block bg-muted/50 px-2 py-1 rounded text-[10px] my-0.5 text-primary">{line.replace(/`/g, '')}</code>;
      const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className="leading-relaxed">
          {parts.map((part, j) => {
            if (part.startsWith('`') && part.endsWith('`')) return <code key={j} className="bg-muted/50 px-1 rounded text-[10px] text-primary">{part.slice(1, -1)}</code>;
            if (part.startsWith('**') && part.endsWith('**')) return <strong key={j} className="text-foreground">{part.slice(2, -2)}</strong>;
            return <span key={j}>{part}</span>;
          })}
        </p>
      );
    });
  };

  // Group tasks by lane
  const tasksByLane = tasks.reduce<Record<string, AgentTask[]>>((acc, t) => {
    const lane = t.lane || 'normal';
    if (!acc[lane]) acc[lane] = [];
    acc[lane].push(t);
    return acc;
  }, {});

  // Group memories by namespace
  const memsByNs = memories.reduce<Record<string, AgentMemoryEntry[]>>((acc, m) => {
    if (!acc[m.namespace]) acc[m.namespace] = [];
    acc[m.namespace].push(m);
    return acc;
  }, {});

  return (
    <div className="flex h-full bg-background text-foreground font-mono text-xs">
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <div className="border-b border-border px-2">
          <TabsList className="h-8 bg-transparent gap-1">
            <TabsTrigger value="bots" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary/10"><Bot size={10} className="mr-1" />Bots</TabsTrigger>
            <TabsTrigger value="tasks" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary/10"><ListTodo size={10} className="mr-1" />Tasks</TabsTrigger>
            <TabsTrigger value="memory" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary/10"><Brain size={10} className="mr-1" />Memory</TabsTrigger>
            <TabsTrigger value="create" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary/10"><Plus size={10} className="mr-1" />Create</TabsTrigger>
            <TabsTrigger value="keys" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary/10"><Key size={10} className="mr-1" />Keys</TabsTrigger>
            <TabsTrigger value="activity" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary/10"><Activity size={10} className="mr-1" />Log</TabsTrigger>
            <TabsTrigger value="docs" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary/10"><BookOpen size={10} className="mr-1" />Docs</TabsTrigger>
          </TabsList>
        </div>

        {/* My Bots */}
        <TabsContent value="bots" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground p-4"><Loader2 size={14} className="animate-spin" /> Loading bots...</div>
              ) : bots.length === 0 ? (
                <div className="text-muted-foreground p-4 text-center">
                  <Bot size={24} className="mx-auto mb-2 opacity-40" />
                  <p>No bots yet. Create one or deploy a preset!</p>
                </div>
              ) : bots.map(bot => (
                <div key={bot.id} className={`border border-border rounded p-3 space-y-2 ${selectedBot?.id === bot.id ? 'border-primary/40 bg-primary/5' : ''}`}>
                  <div className="flex items-center justify-between">
                    <button onClick={() => setSelectedBot(bot)} className="flex items-center gap-2 hover:text-primary transition-colors">
                      <Bot size={14} className={bot.is_active ? "text-primary" : "text-muted-foreground"} />
                      <span className="font-bold text-[11px]">{bot.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{bot.bot_type}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <Switch checked={bot.is_active} onCheckedChange={() => toggleBot(bot)} />
                      <button onClick={() => deleteBot(bot)} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{bot.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {(bot.permissions || []).slice(0, 5).map(p => (
                      <span key={p} className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{p}</span>
                    ))}
                    {(bot.permissions || []).length > 5 && <span className="text-[8px] text-muted-foreground">+{bot.permissions.length - 5} more</span>}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {!selectedBot ? (
                <p className="text-muted-foreground text-[10px] p-4">Select a bot from the "Bots" tab first.</p>
              ) : (
                <>
                  {/* Enqueue form */}
                  <div className="border border-border rounded p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Enqueue Task for</span>
                      <span className="text-[10px] font-bold text-primary">{selectedBot.name}</span>
                    </div>
                    <textarea
                      value={enqueueInstruction}
                      onChange={e => setEnqueueInstruction(e.target.value)}
                      placeholder="Instruction for the agent..."
                      className="w-full h-14 bg-muted/30 border border-border rounded p-2 text-[11px] resize-none focus:outline-none focus:border-primary/40"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={enqueueLane}
                        onChange={e => setEnqueueLane(e.target.value)}
                        className="bg-muted/30 border border-border rounded px-2 py-1 text-[10px]"
                      >
                        <option value="critical">🔴 Critical</option>
                        <option value="high">🟠 High</option>
                        <option value="normal">🔵 Normal</option>
                        <option value="low">⚪ Low</option>
                        <option value="background">🌑 Background</option>
                      </select>
                      <Button onClick={enqueueTask} disabled={enqueuing || !enqueueInstruction.trim()} size="sm" className="text-[10px] h-7">
                        {enqueuing ? <Loader2 size={10} className="animate-spin mr-1" /> : <Plus size={10} className="mr-1" />}
                        Enqueue
                      </Button>
                      <Button onClick={() => executeTask()} disabled={executing} size="sm" variant="outline" className="text-[10px] h-7 ml-auto">
                        {executing ? <Loader2 size={10} className="animate-spin mr-1" /> : <Play size={10} className="mr-1" />}
                        Execute Next
                      </Button>
                    </div>
                  </div>

                  {/* Task Queue */}
                  {tasksLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground p-2"><Loader2 size={12} className="animate-spin" /> Loading...</div>
                  ) : tasks.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center p-4">No tasks in queue.</p>
                  ) : (
                    Object.entries(LANE_COLORS).map(([lane]) => {
                      const laneTasks = tasksByLane[lane];
                      if (!laneTasks?.length) return null;
                      return (
                        <div key={lane}>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={`text-[8px] ${LANE_COLORS[lane]}`}>{lane}</Badge>
                            <span className="text-[9px] text-muted-foreground">{laneTasks.length} task{laneTasks.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="space-y-1">
                            {laneTasks.map(t => (
                              <div
                                key={t.id}
                                onClick={() => { setSelectedTask(t); setActiveRun(null); }}
                                className={`border border-border rounded p-2 cursor-pointer hover:border-primary/30 transition-colors ${selectedTask?.id === t.id ? 'border-primary/40 bg-primary/5' : ''} ${t.parent_task_id ? 'ml-4' : ''}`}
                              >
                                <div className="flex items-center gap-2">
                                  {STATUS_ICONS[t.status] || null}
                                  <span className="text-[10px] truncate flex-1">{t.instruction}</span>
                                  <span className="text-[8px] text-muted-foreground">{(t.steps || []).length}/{t.max_steps}</span>
                                  {(t.status === 'queued' || t.status === 'running') && (
                                    <button onClick={(e) => { e.stopPropagation(); cancelTask(t.id); }} className="text-muted-foreground hover:text-destructive">
                                      <XCircle size={10} />
                                    </button>
                                  )}
                                  {t.status === 'queued' && (
                                    <button onClick={(e) => { e.stopPropagation(); executeTask(t.id); }} className="text-muted-foreground hover:text-primary">
                                      <Play size={10} />
                                    </button>
                                  )}
                                </div>
                                {t.parent_task_id && (
                                  <span className="text-[8px] text-muted-foreground/60">↳ subtask</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Selected task execution log */}
                  {selectedTask && (
                    <div className="border border-primary/20 rounded mt-2">
                      <div className="p-2 border-b border-border flex items-center gap-2">
                        <span className="text-[10px] font-bold text-primary truncate flex-1">{selectedTask.instruction}</span>
                        <Badge variant="outline" className="text-[8px]">{selectedTask.status}</Badge>
                      </div>
                      <ExecutionLog run={activeRun} task={selectedTask} />
                      {selectedTask.result && (
                        <div className="p-2 border-t border-border text-[10px] text-green-400">
                          Result: {typeof selectedTask.result === 'object' ? JSON.stringify(selectedTask.result) : selectedTask.result}
                        </div>
                      )}
                      {selectedTask.error && (
                        <div className="p-2 border-t border-border text-[10px] text-destructive">
                          Error: {selectedTask.error}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Memory Tab */}
        <TabsContent value="memory" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {!selectedBot ? (
                <p className="text-muted-foreground text-[10px] p-4">Select a bot from the "Bots" tab first.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold">{selectedBot.name} — Memory</span>
                    <Button onClick={() => loadMemory(selectedBot.id)} variant="ghost" size="sm" className="h-6">
                      <RefreshCw size={10} />
                    </Button>
                  </div>

                  {/* Add memory */}
                  <div className="border border-border rounded p-2.5 space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={newMemNs}
                        onChange={e => setNewMemNs(e.target.value)}
                        className="bg-muted/30 border border-border rounded px-2 py-1 text-[10px]"
                      >
                        <option value="facts">facts</option>
                        <option value="context">context</option>
                        <option value="conversation">conversation</option>
                        <option value="state">state</option>
                      </select>
                      <input
                        value={newMemKey}
                        onChange={e => setNewMemKey(e.target.value)}
                        placeholder="key"
                        className="flex-1 bg-muted/30 border border-border rounded px-2 py-1 text-[10px] focus:outline-none focus:border-primary/40"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={newMemValue}
                        onChange={e => setNewMemValue(e.target.value)}
                        placeholder="value (string or JSON)"
                        className="flex-1 bg-muted/30 border border-border rounded px-2 py-1 text-[10px] focus:outline-none focus:border-primary/40"
                      />
                      <Button onClick={saveMemory} disabled={!newMemKey.trim()} size="sm" className="text-[10px] h-7">Save</Button>
                    </div>
                  </div>

                  {memoryLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground p-2"><Loader2 size={12} className="animate-spin" /> Loading...</div>
                  ) : memories.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center p-4">No persistent memory stored yet.</p>
                  ) : (
                    Object.entries(memsByNs).map(([ns, entries]) => (
                      <div key={ns}>
                        <span className="text-[9px] font-bold text-primary uppercase tracking-wider">{ns}</span>
                        <div className="space-y-1 mt-1">
                          {entries.map(m => (
                            <div key={m.id} className="flex items-center gap-2 border border-border rounded p-2 text-[10px]">
                              <span className="font-bold text-foreground shrink-0">{m.key}</span>
                              <span className="text-muted-foreground truncate flex-1">{typeof m.value === 'object' ? JSON.stringify(m.value) : String(m.value)}</span>
                              <button onClick={() => deleteMemory(m.namespace, m.key)} className="text-muted-foreground hover:text-destructive shrink-0">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}

                  <div className="text-[9px] text-muted-foreground border-t border-border pt-2">
                    {memories.length} entries across {Object.keys(memsByNs).length} namespace{Object.keys(memsByNs).length !== 1 ? 's' : ''}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Create Bot */}
        <TabsContent value="create" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Rocket size={10} /> Quick Deploy
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {BOT_PRESETS.map(preset => (
                    <div key={preset.name} className="border border-border rounded p-2.5 hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{preset.icon}</span>
                        <span className="text-[10px] font-bold truncate">{preset.name}</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground mb-2 line-clamp-2">{preset.description}</p>
                      <Button onClick={() => deployPreset(preset)} disabled={deployingPreset === preset.name} size="sm" variant="outline" className="w-full h-6 text-[9px]">
                        {deployingPreset === preset.name ? <Loader2 size={10} className="animate-spin mr-1" /> : <Rocket size={10} className="mr-1" />}
                        Deploy
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Or describe your bot</h3>
                <textarea
                  value={createDesc}
                  onChange={e => setCreateDesc(e.target.value)}
                  placeholder="Monitor AAPL stock and message me when it drops below $150..."
                  className="w-full h-24 bg-muted/30 border border-border rounded p-2 text-[11px] resize-none focus:outline-none focus:border-primary/40"
                />
              </div>
              <Button onClick={handleCreateBot} disabled={creating || !createDesc.trim()} size="sm" className="text-[10px]">
                {creating ? <><Loader2 size={10} className="animate-spin mr-1" /> Generating...</> : <><Bot size={10} className="mr-1" /> Generate Bot Config</>}
              </Button>

              {generatedConfig && (
                <div className="border border-primary/30 rounded p-3 space-y-3 bg-primary/5">
                  <h3 className="text-[11px] font-bold text-primary">Generated Configuration</h3>
                  <div className="space-y-1.5 text-[10px]">
                    <div><span className="text-muted-foreground">Name:</span> <span className="font-bold">{generatedConfig.name as string}</span></div>
                    <div><span className="text-muted-foreground">Type:</span> {generatedConfig.bot_type as string}</div>
                    <div><span className="text-muted-foreground">Permissions:</span></div>
                    <div className="flex flex-wrap gap-1 ml-2">
                      {((generatedConfig.permissions as string[]) || []).map(p => (
                        <span key={p} className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{p}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={confirmCreateBot} size="sm" className="text-[10px]">✓ Create Bot</Button>
                    <Button onClick={() => setGeneratedConfig(null)} variant="outline" size="sm" className="text-[10px]">Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="keys" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {!selectedBot ? (
                <p className="text-muted-foreground text-[10px] p-4">Select a bot from the "Bots" tab first.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold">{selectedBot.name} — API Keys</span>
                    <Button onClick={generateKey} size="sm" className="text-[10px]"><Plus size={10} className="mr-1" /> Generate Key</Button>
                  </div>
                  {newKey && (
                    <div className="border border-primary/30 rounded p-3 bg-primary/5 space-y-2">
                      <p className="text-[10px] text-primary font-bold">⚠ Copy this key now — it won't be shown again:</p>
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] bg-muted px-2 py-1 rounded flex-1 break-all">{newKey}</code>
                        <button onClick={() => { navigator.clipboard.writeText(newKey); toast.success("Copied!"); }} className="text-primary hover:text-primary/80"><Copy size={12} /></button>
                      </div>
                      <Button onClick={() => setNewKey(null)} variant="outline" size="sm" className="text-[10px]">Dismiss</Button>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {keys.map(k => (
                      <div key={k.id} className={`flex items-center justify-between border border-border rounded p-2 ${k.is_revoked ? 'opacity-50' : ''}`}>
                        <div>
                          <code className="text-[10px]">{k.key_prefix}••••••••</code>
                          <div className="text-[9px] text-muted-foreground mt-0.5">
                            Created: {new Date(k.created_at).toLocaleDateString()}
                            {k.last_used_at && ` · Last used: ${new Date(k.last_used_at).toLocaleDateString()}`}
                          </div>
                        </div>
                        {!k.is_revoked ? (
                          <button onClick={() => revokeKey(k.id)} className="text-[9px] text-destructive hover:underline">Revoke</button>
                        ) : (
                          <span className="text-[9px] text-destructive">Revoked</span>
                        )}
                      </div>
                    ))}
                    {keys.length === 0 && <p className="text-[10px] text-muted-foreground">No keys generated yet.</p>}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Live Audit Log</span>
                <button onClick={loadAuditLogs} className="text-muted-foreground hover:text-primary"><RefreshCw size={10} /></button>
              </div>
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-1 px-1">Time</th><th className="py-1 px-1">Tool</th><th className="py-1 px-1">Status</th><th className="py-1 px-1">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="py-1 px-1 text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString()}</td>
                      <td className="py-1 px-1 text-primary">{log.tool_name}</td>
                      <td className="py-1 px-1">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] ${log.status === 'success' ? 'bg-green-500/10 text-green-400' : log.status === 'denied' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-destructive/10 text-destructive'}`}>{log.status}</span>
                      </td>
                      <td className="py-1 px-1 text-muted-foreground truncate max-w-[200px]">{log.result_summary}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No activity yet</td></tr>}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Docs */}
        <TabsContent value="docs" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              <h2 className="text-[11px] font-display tracking-wider uppercase text-primary mb-3">BotLab Documentation</h2>
              {DOCS.map(section => (
                <div key={section.id} className="border border-border rounded">
                  <button
                    onClick={() => setDocSection(docSection === section.id ? null : section.id)}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-muted/20 transition-colors text-left"
                  >
                    <span className="text-[11px] font-bold">{section.title}</span>
                    <ChevronDown size={12} className={`text-muted-foreground transition-transform ${docSection === section.id ? 'rotate-180' : ''}`} />
                  </button>
                  {docSection === section.id && (
                    <div className="px-3 pb-3 space-y-3 text-[10px] text-muted-foreground">
                      {section.content && <div>{renderMd(section.content)}</div>}
                      {section.subsections?.map((sub, i) => (
                        <div key={i} className="border-t border-border/50 pt-2">
                          <h4 className="text-[10px] font-bold text-foreground mb-1">{sub.title}</h4>
                          <div className="space-y-0.5">{renderMd(sub.content)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
