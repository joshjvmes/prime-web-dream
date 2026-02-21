import { useState, useEffect } from 'react';
import { Bot, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BotCreatorPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDescription?: string;
  onOpenBotLab?: () => void;
}

const TOOL_LIST = [
  'get_market_data','get_stock_chart','check_portfolio','trade_stock',
  'create_booking','list_bookings','cancel_booking','send_message','list_conversations',
  'check_balance','transfer_tokens','buy_shares','sell_shares','place_bet',
  'control_audio','draw_on_canvas','generate_canvas_art',
  'create_spreadsheet','update_cells','add_chart','read_spreadsheet',
  'post_to_social','send_email','save_memory','recall_memories',
].join(', ');

async function callBotApi(action: string, body?: Record<string, unknown>, botId?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
  if (botId) headers['x-bot-id'] = botId;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/bot-api?action=${action}`;
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

type Step = 'input' | 'generating' | 'preview' | 'creating' | 'success';

export default function BotCreatorPrompt({ open, onOpenChange, initialDescription = '', onOpenBotLab }: BotCreatorPromptProps) {
  const [desc, setDesc] = useState(initialDescription);
  const [step, setStep] = useState<Step>('input');
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [botName, setBotName] = useState('');

  useEffect(() => {
    if (open) {
      setDesc(initialDescription);
      setStep('input');
      setConfig(null);
      setBotName('');
    }
  }, [open, initialDescription]);

  const generate = async () => {
    if (!desc.trim()) return;
    setStep('generating');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Not authenticated'); setStep('input'); return; }
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/hyper-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Generate a bot configuration for this description. Return ONLY valid JSON with keys: name (string), description (string), permissions (array of tool names from: ${TOOL_LIST}), system_prompt (string for the bot personality), bot_type ("autonomous" or "scheduled"), trigger_config (object with "events" array or null), schedule (cron string or null). Description: "${desc}"` }],
        }),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || data.reply || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setConfig(parsed);
        setStep('preview');
      } else {
        toast.error('Could not generate config. Try a more specific description.');
        setStep('input');
      }
    } catch {
      toast.error('Failed to generate bot config');
      setStep('input');
    }
  };

  const create = async () => {
    if (!config) return;
    setStep('creating');
    try {
      const data = await callBotApi('create-bot', config);
      if (data.bot) {
        setBotName(data.bot.name);
        setStep('success');
        toast.success(`Bot "${data.bot.name}" created!`);
      } else {
        toast.error(data.error || 'Failed to create bot');
        setStep('preview');
      }
    } catch {
      toast.error('Failed to create bot');
      setStep('preview');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border font-mono text-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-display tracking-wider">
            <Sparkles size={16} className="text-primary" /> Create Bot
          </DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground">
            Describe what your bot should do and we'll generate the config.
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-3">
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Monitor AAPL stock and alert me when it drops below $150..."
              className="w-full h-24 bg-muted/30 border border-border rounded p-2 text-[11px] resize-none focus:outline-none focus:border-primary/40"
              autoFocus
            />
            <Button onClick={generate} disabled={!desc.trim()} size="sm" className="w-full text-[10px]">
              <Bot size={12} className="mr-1" /> Generate Bot Config
            </Button>
          </div>
        )}

        {step === 'generating' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 size={24} className="animate-spin text-primary" />
            <p className="text-[11px] text-muted-foreground">Generating bot configuration...</p>
          </div>
        )}

        {step === 'preview' && config && (
          <div className="space-y-3">
            <div className="border border-primary/30 rounded p-3 bg-primary/5 space-y-2">
              <div className="text-[11px]"><span className="text-muted-foreground">Name:</span> <span className="font-bold">{config.name as string}</span></div>
              <div className="text-[10px]"><span className="text-muted-foreground">Type:</span> {config.bot_type as string}</div>
              <div className="text-[10px]"><span className="text-muted-foreground">Desc:</span> {config.description as string}</div>
              <div className="flex flex-wrap gap-1">
                {((config.permissions as string[]) || []).map(p => (
                  <span key={p} className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{p}</span>
                ))}
              </div>
              {config.schedule && <div className="text-[10px]"><span className="text-muted-foreground">Schedule:</span> {config.schedule as string}</div>}
            </div>
            <div className="flex gap-2">
              <Button onClick={create} size="sm" className="flex-1 text-[10px]">✓ Create Bot</Button>
              <Button onClick={() => setStep('input')} variant="outline" size="sm" className="text-[10px]">Back</Button>
            </div>
          </div>
        )}

        {step === 'creating' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 size={24} className="animate-spin text-primary" />
            <p className="text-[11px] text-muted-foreground">Creating bot...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 size={28} className="text-primary" />
            <p className="text-[11px] font-bold">Bot "{botName}" created!</p>
            <div className="flex gap-2">
              {onOpenBotLab && (
                <Button onClick={() => { onOpenBotLab(); onOpenChange(false); }} size="sm" variant="outline" className="text-[10px]">
                  <Bot size={10} className="mr-1" /> Open BotLab
                </Button>
              )}
              <Button onClick={() => onOpenChange(false)} size="sm" className="text-[10px]">Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
