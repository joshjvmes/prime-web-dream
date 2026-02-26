
-- Agent Tasks: Lane-based priority queue
CREATE TABLE public.agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.bot_registry(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_task_id UUID REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
  spawned_by_bot_id UUID REFERENCES public.bot_registry(id) ON DELETE SET NULL,
  lane TEXT NOT NULL DEFAULT 'normal' CHECK (lane IN ('critical','high','normal','low','background')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  instruction TEXT NOT NULL,
  input_payload JSONB DEFAULT '{}'::jsonb,
  result JSONB,
  error TEXT,
  steps JSONB DEFAULT '[]'::jsonb,
  max_steps INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.agent_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.agent_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.agent_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.agent_tasks FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_agent_tasks_bot_status ON public.agent_tasks(bot_id, status);
CREATE INDEX idx_agent_tasks_lane ON public.agent_tasks(lane, created_at);
CREATE INDEX idx_agent_tasks_parent ON public.agent_tasks(parent_task_id);

-- Agent Memory: Per-bot isolated KV store
CREATE TABLE public.agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.bot_registry(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  namespace TEXT NOT NULL DEFAULT 'facts',
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bot_id, namespace, key)
);

ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bot memory" ON public.agent_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bot memory" ON public.agent_memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bot memory" ON public.agent_memory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bot memory" ON public.agent_memory FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_agent_memory_updated_at
  BEFORE UPDATE ON public.agent_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Agent Runs: Execution history with streaming
CREATE TABLE public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES public.bot_registry(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  steps JSONB DEFAULT '[]'::jsonb,
  token_usage JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own runs" ON public.agent_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own runs" ON public.agent_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own runs" ON public.agent_runs FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_agent_runs_task ON public.agent_runs(task_id);
CREATE INDEX idx_agent_runs_bot ON public.agent_runs(bot_id, started_at DESC);

-- Enable realtime on agent_runs for streaming
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_runs;
