
-- Bot Registry: stores bot definitions
CREATE TABLE public.bot_registry (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  bot_type text NOT NULL DEFAULT 'autonomous',
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  system_prompt text NOT NULL DEFAULT '',
  trigger_config jsonb NULL DEFAULT NULL,
  schedule text NULL DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  rate_limit integer NOT NULL DEFAULT 60,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bots" ON public.bot_registry FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own bots" ON public.bot_registry FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bots" ON public.bot_registry FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bots" ON public.bot_registry FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_bot_registry_updated_at
  BEFORE UPDATE ON public.bot_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bot API Keys
CREATE TABLE public.bot_api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id uuid NOT NULL REFERENCES public.bot_registry(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  last_used_at timestamp with time zone NULL,
  expires_at timestamp with time zone NULL,
  is_revoked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own keys" ON public.bot_api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own keys" ON public.bot_api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own keys" ON public.bot_api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own keys" ON public.bot_api_keys FOR DELETE USING (auth.uid() = user_id);

-- Bot Audit Log
CREATE TABLE public.bot_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id uuid NOT NULL REFERENCES public.bot_registry(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tool_name text NOT NULL,
  args jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_summary text NULL,
  status text NOT NULL DEFAULT 'success',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs" ON public.bot_audit_log FOR SELECT USING (auth.uid() = user_id);

-- Enable realtime on audit log for live monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_audit_log;
