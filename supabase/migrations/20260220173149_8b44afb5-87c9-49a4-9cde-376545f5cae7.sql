
-- Add sports metadata columns to bet_markets
ALTER TABLE public.bet_markets
  ADD COLUMN source text NOT NULL DEFAULT 'user',
  ADD COLUMN external_id text UNIQUE,
  ADD COLUMN sport_key text,
  ADD COLUMN sport_title text,
  ADD COLUMN home_team text,
  ADD COLUMN away_team text,
  ADD COLUMN commence_time timestamptz,
  ADD COLUMN odds_data jsonb;

-- Create index on external_id for fast upsert lookups
CREATE INDEX idx_bet_markets_external_id ON public.bet_markets (external_id) WHERE external_id IS NOT NULL;

-- Create index on source for filtering sports markets
CREATE INDEX idx_bet_markets_source ON public.bet_markets (source);
