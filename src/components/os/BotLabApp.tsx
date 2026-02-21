import { useState, useEffect, useCallback } from 'react';
import { Bot, Plus, Key, Activity, Trash2, Copy, Power, PowerOff, RefreshCw, Eye, EyeOff, Loader2, ChevronRight } from 'lucide-react';
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

  const handleCreateBot = async () => {
    if (!createDesc.trim()) return;
    setCreating(true);
    try {
      // Use AI to generate bot config from description
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
      // Extract JSON from response
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

  return (
    <div className="flex h-full bg-background text-foreground font-mono text-xs">
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <div className="border-b border-border px-2">
          <TabsList className="h-8 bg-transparent gap-1">
            <TabsTrigger value="bots" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary/10"><Bot size={10} className="mr-1" />My Bots</TabsTrigger>
            <TabsTrigger value="create" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary/10"><Plus size={10} className="mr-1" />Create</TabsTrigger>
            <TabsTrigger value="keys" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary/10"><Key size={10} className="mr-1" />API Keys</TabsTrigger>
            <TabsTrigger value="activity" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary/10"><Activity size={10} className="mr-1" />Activity</TabsTrigger>
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
                  <p>No bots yet. Create one using natural language!</p>
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
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Describe your bot</label>
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
      </Tabs>
    </div>
  );
}
