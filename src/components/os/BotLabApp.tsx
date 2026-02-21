import { useState, useEffect, useCallback } from 'react';
import { Bot, Plus, Key, Activity, Trash2, Copy, Power, PowerOff, RefreshCw, Eye, EyeOff, Loader2, ChevronRight, Rocket, BookOpen, ChevronDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
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

// ── Bot Presets ──
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

// ── Documentation ──
interface DocSection {
  id: string;
  title: string;
  content: string;
  subsections?: { title: string; content: string }[];
}

const DOCS: DocSection[] = [
  {
    id: 'getting-started',
    title: '🚀 Getting Started',
    content: 'Bots in PRIME OS are automated agents that perform tasks on your behalf. They can monitor markets, manage bookings, post to social media, and much more.',
    subsections: [
      { title: 'Creating Your First Bot', content: 'You can create bots in two ways:\n\n**Natural Language**: Describe what your bot should do in plain English. The AI will generate the configuration.\n\n**One-Click Presets**: Choose from ready-made templates in the "Quick Deploy" section and deploy instantly.' },
      { title: 'Bot Types', content: '**Autonomous**: Event-driven bots that react to system events (e.g., price changes, new messages).\n\n**Scheduled**: Cron-based bots that run at specific intervals (e.g., daily reports, hourly checks).\n\n**External**: API-connected bots for third-party tools like Claude, Cursor, or custom scripts.' },
    ],
  },
  {
    id: 'tool-reference',
    title: '🔧 Tool Reference',
    content: 'Every bot has access to a set of tools based on its permissions. Here are all available tools organized by category.',
    subsections: [
      { title: 'Market Data', content: '`get_market_data` — Fetch live stock/crypto prices\n  params: `{ symbols: "AAPL,MSFT" }`\n\n`get_stock_chart` — Get price chart data\n  params: `{ symbol: "AAPL", range: "1d" }`' },
      { title: 'Portfolio', content: '`check_portfolio` — View vault holdings and P&L\n  params: none\n\n`trade_stock` — Execute buy/sell orders\n  params: `{ symbol: "AAPL", action: "buy", quantity: 10 }`' },
      { title: 'Booking', content: '`create_booking` — Reserve a resource\n  params: `{ resource: "quantum-lab-1", start: "ISO", end: "ISO", purpose: "..." }`\n\n`list_bookings` — View all bookings\n\n`cancel_booking` — Cancel by ID\n  params: `{ booking_id: "uuid" }`' },
      { title: 'Messaging', content: '`send_message` — Send a message to a channel\n  params: `{ channel: "general", content: "Hello!" }`\n\n`list_conversations` — List available channels' },
      { title: 'Financial', content: '`check_balance` — View wallet balances\n\n`transfer_tokens` — Send tokens\n  params: `{ to: "user_id", amount: 100, token: "OS" }`\n\n`buy_shares` / `sell_shares` — Trade app shares\n\n`place_bet` — Place prediction market bets' },
      { title: 'Audio / Canvas / Spreadsheet', content: '`control_audio` — Play, pause, skip tracks\n\n`draw_on_canvas` / `generate_canvas_art` — Create visual art\n\n`create_spreadsheet` / `update_cells` / `add_chart` / `read_spreadsheet` — Full spreadsheet control' },
      { title: 'Social & Memory', content: '`post_to_social` — Post to PrimeSocial\n\n`send_email` — Send via PrimeMail\n\n`save_memory` / `recall_memories` — Persistent bot memory' },
    ],
  },
  {
    id: 'api-reference',
    title: '🔌 API Reference',
    content: 'External agents connect via REST API using API keys.',
    subsections: [
      { title: 'Endpoint', content: '```\nPOST /functions/v1/bot-api?action=<action>\nHeaders:\n  X-Bot-Key: clw_<your_key>\n  Content-Type: application/json\n```' },
      { title: 'Actions', content: '`tools` (GET) — List available tools\n`execute` (POST) — Execute a tool: `{ "tool": "name", "args": {...} }`\n`chat` (POST) — Chat with bot AI: `{ "message": "..." }`\n`status` (GET) — Bot status & rate limit info\n`create-bot` (POST) — Create a new bot\n`delete-bot` (POST) — Delete a bot\n`generate-key` (POST) — Generate API key\n`revoke-key` (POST) — Revoke a key\n`list-keys` (GET) — List bot keys\n`audit-log` (GET) — View activity log' },
      { title: 'Authentication', content: '**API Key**: For external agents. Pass `X-Bot-Key: clw_...` header.\n\n**JWT**: For in-OS bots. Pass standard `Authorization: Bearer <token>` + `X-Bot-Id: <uuid>` headers.' },
      { title: 'Rate Limits', content: 'Default: 60 calls/hour per bot. Configurable per bot. Returns HTTP 429 when exceeded.' },
      { title: 'MCP Connection', content: 'Connect MCP-compatible tools (Claude Desktop, Cursor) using:\n```\nEndpoint: https://<project>.supabase.co/functions/v1/bot-api?mode=mcp\nHeader: X-Bot-Key: clw_...\n```' },
    ],
  },
  {
    id: 'bot-types-guide',
    title: '🤖 Bot Types Guide',
    content: '',
    subsections: [
      { title: 'Autonomous Bots', content: 'React to system events defined in `trigger_config`.\n\nExample:\n```json\n{\n  "events": ["market.checked", "message.received"]\n}\n```\n\nThe bot-runner edge function fires when a matching EventBus event occurs.' },
      { title: 'Scheduled Bots', content: 'Run on cron schedules. Examples:\n\n`0 9 * * *` — Daily at 9 AM\n`*/30 * * * *` — Every 30 minutes\n`0 8 * * 1` — Every Monday at 8 AM\n`0 */3 * * *` — Every 3 hours' },
      { title: 'External Bots', content: 'Connect from any external tool:\n1. Create a bot in BotLab\n2. Generate an API key\n3. Use the REST API or MCP endpoint\n4. The bot executes with its configured permissions' },
    ],
  },
  {
    id: 'permissions',
    title: '🔐 Permissions Guide',
    content: '',
    subsections: [
      { title: 'Principle of Least Privilege', content: 'Grant only the permissions your bot needs. A market watcher doesn\'t need `transfer_tokens`.' },
      { title: 'Server vs Client Tools', content: '**Server-side** (execute immediately): `get_market_data`, `check_balance`, `save_memory`, etc.\n\n**Client-side** (require frontend): `draw_on_canvas`, `control_audio` — these dispatch events to the UI via EventBus.' },
    ],
  },
  {
    id: 'eventbus',
    title: '📡 EventBus Reference',
    content: 'Bots can trigger on these system events:',
    subsections: [
      { title: 'Available Events', content: '`app.opened` / `app.closed` — App lifecycle\n`user.signed-in` / `user.signed-out` — Auth events\n`market.checked` — Market data fetched\n`booking.created` / `booking.conflict` — Booking events\n`message.received` — New chat message\n`canvas.request` — Art generation request\n`wallet.transfer` — Token transfer\n`file.uploaded` — File uploaded' },
      { title: 'Trigger Matching', content: 'A bot\'s `trigger_config.events` array is checked against every emitted event. If any event matches, the `bot-runner` function executes the bot with the event payload as context.' },
    ],
  },
  {
    id: 'troubleshooting',
    title: '❓ Troubleshooting',
    content: '',
    subsections: [
      { title: 'Common Errors', content: '**"Not authenticated"** — Sign in first. Bots require an authenticated session.\n\n**"Permission denied"** — The bot lacks the required tool permission. Edit the bot to add it.\n\n**"Rate limited"** — The bot hit its hourly call limit. Wait or increase the rate_limit setting.' },
      { title: 'Key Rotation', content: 'Rotate API keys regularly:\n1. Generate a new key\n2. Update your external tools\n3. Revoke the old key\n\nKeys are shown only once at creation. Store them securely.' },
    ],
  },
];

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

  useEffect(() => {
    if (tab === "activity") loadAuditLogs();
  }, [tab, loadAuditLogs]);

  useEffect(() => {
    if (selectedBot && tab === "keys") loadKeys(selectedBot.id);
  }, [selectedBot, tab, loadKeys]);

  // Realtime audit log
  useEffect(() => {
    const channel = supabase
      .channel('bot-audit-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bot_audit_log' }, (payload) => {
        setAuditLogs(prev => [payload.new as AuditRecord, ...prev].slice(0, 100));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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
    } else {
      toast.error(data.error || "Failed to generate key");
    }
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
        name: preset.name,
        description: preset.description,
        permissions: preset.permissions,
        bot_type: preset.bot_type,
        system_prompt: preset.system_prompt,
        trigger_config: preset.trigger_config || null,
        schedule: preset.schedule || null,
      });
      if (data.bot) {
        toast.success(`"${preset.name}" deployed!`);
        loadBots();
        setTab("bots");
      } else {
        toast.error(data.error || "Failed to deploy");
      }
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
      if (jsonMatch) {
        const config = JSON.parse(jsonMatch[0]);
        setGeneratedConfig(config);
      } else {
        toast.error("AI couldn't generate config. Try a more specific description.");
      }
    } catch (e) {
      toast.error("Failed to generate bot config");
    }
    setCreating(false);
  };

  const confirmCreateBot = async () => {
    if (!generatedConfig) return;
    try {
      const data = await callBotApi("create-bot", generatedConfig as Record<string, unknown>);
      if (data.bot) {
        toast.success(`Bot "${data.bot.name}" created!`);
        setGeneratedConfig(null);
        setCreateDesc("");
        loadBots();
        setTab("bots");
      } else {
        toast.error(data.error || "Failed");
      }
    } catch { toast.error("Failed to create bot"); }
  };

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const apiEndpoint = `https://${projectId}.supabase.co/functions/v1/bot-api`;

  // Simple markdown-ish renderer
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

  return (
    <div className="flex h-full bg-background text-foreground font-mono text-xs">
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <div className="border-b border-border px-2">
          <TabsList className="h-8 bg-transparent gap-1">
            <TabsTrigger value="bots" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary/10"><Bot size={10} className="mr-1" />My Bots</TabsTrigger>
            <TabsTrigger value="create" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary/10"><Plus size={10} className="mr-1" />Create</TabsTrigger>
            <TabsTrigger value="keys" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary/10"><Key size={10} className="mr-1" />API Keys</TabsTrigger>
            <TabsTrigger value="activity" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary/10"><Activity size={10} className="mr-1" />Activity</TabsTrigger>
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
                  <p>No bots yet. Create one using natural language or deploy a preset!</p>
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

        {/* Create Bot */}
        <TabsContent value="create" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Quick Deploy Presets */}
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
                        <span className="ml-auto text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{preset.permissions.length} tools</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground mb-2 line-clamp-2">{preset.description}</p>
                      <Button
                        onClick={() => deployPreset(preset)}
                        disabled={deployingPreset === preset.name}
                        size="sm"
                        variant="outline"
                        className="w-full h-6 text-[9px]"
                      >
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
                    <div><span className="text-muted-foreground">Description:</span> {generatedConfig.description as string}</div>
                    <div><span className="text-muted-foreground">Permissions:</span></div>
                    <div className="flex flex-wrap gap-1 ml-2">
                      {((generatedConfig.permissions as string[]) || []).map(p => (
                        <span key={p} className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{p}</span>
                      ))}
                    </div>
                    {generatedConfig.schedule && <div><span className="text-muted-foreground">Schedule:</span> {generatedConfig.schedule as string}</div>}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={confirmCreateBot} size="sm" className="text-[10px]">✓ Create Bot</Button>
                    <Button onClick={() => setGeneratedConfig(null)} variant="outline" size="sm" className="text-[10px]">Cancel</Button>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-3">
                <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Available Tools</h4>
                <div className="space-y-2">
                  {Object.entries(TOOL_CATEGORIES).map(([cat, tools]) => (
                    <div key={cat}>
                      <span className="text-[9px] font-bold text-primary">{cat}</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {tools.map(t => <span key={t} className="text-[8px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="keys" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {!selectedBot ? (
                <p className="text-muted-foreground text-[10px] p-4">Select a bot from the "My Bots" tab first.</p>
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
                      <div className="text-[9px] text-muted-foreground">
                        <p>Endpoint: <code className="bg-muted px-1 rounded">{apiEndpoint}</code></p>
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
                        {!k.is_revoked && (
                          <button onClick={() => revokeKey(k.id)} className="text-[9px] text-destructive hover:underline">Revoke</button>
                        )}
                        {k.is_revoked && <span className="text-[9px] text-destructive">Revoked</span>}
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
                    <th className="py-1 px-1">Time</th>
                    <th className="py-1 px-1">Tool</th>
                    <th className="py-1 px-1">Status</th>
                    <th className="py-1 px-1">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="py-1 px-1 text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString()}</td>
                      <td className="py-1 px-1 text-primary">{log.tool_name}</td>
                      <td className="py-1 px-1">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] ${
                          log.status === 'success' ? 'bg-green-500/10 text-green-400' :
                          log.status === 'denied' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-destructive/10 text-destructive'
                        }`}>{log.status}</span>
                      </td>
                      <td className="py-1 px-1 text-muted-foreground truncate max-w-[200px]">{log.result_summary}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No activity yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Docs */}
        <TabsContent value="docs" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              <h2 className="text-[11px] font-display tracking-wider uppercase text-primary mb-3">ClawBot Documentation</h2>
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
