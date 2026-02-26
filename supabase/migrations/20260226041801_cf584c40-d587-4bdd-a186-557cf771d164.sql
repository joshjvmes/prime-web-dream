
CREATE TABLE public.user_ai_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
  encrypted_key TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.user_ai_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own AI keys"
  ON public.user_ai_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI keys"
  ON public.user_ai_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI keys"
  ON public.user_ai_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI keys"
  ON public.user_ai_keys FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_ai_keys_updated_at
  BEFORE UPDATE ON public.user_ai_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
