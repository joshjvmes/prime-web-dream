-- =============================================
-- GITHUB APP INSTALLATIONS
-- =============================================
-- Tracks GitHub App installations linked to PrimeOS users
CREATE TABLE public.github_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  installation_id BIGINT NOT NULL UNIQUE,
  account_login TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'User',
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  repository_selection TEXT NOT NULL DEFAULT 'all',
  suspended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.github_installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own installations"
  ON public.github_installations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own installations"
  ON public.github_installations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own installations"
  ON public.github_installations FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_github_installations_updated_at
  BEFORE UPDATE ON public.github_installations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- GITHUB WEBHOOK EVENTS LOG
-- =============================================
-- Stores incoming GitHub webhook events for audit + hook dispatching
CREATE TABLE public.github_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id BIGINT NOT NULL,
  event_type TEXT NOT NULL,
  action TEXT,
  repository TEXT,
  sender TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  dispatched BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.github_events ENABLE ROW LEVEL SECURITY;

-- Users can view events for their installations
CREATE POLICY "Users can view own installation events"
  ON public.github_events FOR SELECT
  USING (
    installation_id IN (
      SELECT installation_id FROM public.github_installations
      WHERE user_id = auth.uid()
    )
  );

-- Index for efficient webhook event lookup
CREATE INDEX idx_github_events_installation ON public.github_events(installation_id, created_at DESC);
CREATE INDEX idx_github_events_type ON public.github_events(event_type, created_at DESC);

-- Enable realtime for github events
ALTER PUBLICATION supabase_realtime ADD TABLE public.github_events;
