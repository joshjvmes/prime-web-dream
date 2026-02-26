
-- Add last_run_at to bot_registry for cron tracking
ALTER TABLE public.bot_registry ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;

-- Create user_activity table
CREATE TABLE public.user_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own activity"
  ON public.user_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON public.user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity"
  ON public.user_activity FOR DELETE
  USING (auth.uid() = user_id);

-- Service role needs access for edge functions
CREATE POLICY "Service role full access"
  ON public.user_activity FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity;

-- Cleanup function for old activity (24h)
CREATE OR REPLACE FUNCTION public.cleanup_old_activity()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  DELETE FROM public.user_activity WHERE created_at < now() - interval '24 hours';
$$;

-- Index for fast user queries
CREATE INDEX idx_user_activity_user_created ON public.user_activity (user_id, created_at DESC);
