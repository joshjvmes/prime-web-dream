
-- Create github_installations table
CREATE TABLE public.github_installations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  installation_id integer NOT NULL UNIQUE,
  account_login text NOT NULL DEFAULT 'unknown',
  account_type text NOT NULL DEFAULT 'User',
  access_token text,
  token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.github_installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own installations"
  ON public.github_installations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own installations"
  ON public.github_installations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create github_events table
CREATE TABLE public.github_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  installation_id integer NOT NULL DEFAULT 0,
  event_type text NOT NULL,
  action text,
  repository text,
  sender text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.github_events ENABLE ROW LEVEL SECURITY;

-- Users can view events for their installations
CREATE POLICY "Users can view own installation events"
  ON public.github_events FOR SELECT
  TO authenticated
  USING (
    installation_id IN (
      SELECT gi.installation_id FROM public.github_installations gi WHERE gi.user_id = auth.uid()
    )
  );
