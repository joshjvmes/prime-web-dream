
-- Dedicated board_tasks table for PrimeBoard kanban persistence
CREATE TABLE public.board_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'P1',
  node TEXT NOT NULL DEFAULT 'node-alpha',
  column_name TEXT NOT NULL DEFAULT 'queued',
  eta INTEGER NOT NULL DEFAULT 10,
  progress NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.board_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own board tasks" ON public.board_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own board tasks" ON public.board_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own board tasks" ON public.board_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own board tasks" ON public.board_tasks FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for board_tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_tasks;
