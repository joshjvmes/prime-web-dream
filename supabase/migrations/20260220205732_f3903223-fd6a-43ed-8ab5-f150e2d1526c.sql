
-- vault_holdings table
CREATE TABLE public.vault_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'stock',
  quantity numeric NOT NULL DEFAULT 0,
  avg_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own holdings" ON public.vault_holdings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own holdings" ON public.vault_holdings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own holdings" ON public.vault_holdings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own holdings" ON public.vault_holdings FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_vault_holdings_updated_at BEFORE UPDATE ON public.vault_holdings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- vault_transactions table
CREATE TABLE public.vault_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  tx_type text NOT NULL,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vault transactions" ON public.vault_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vault transactions" ON public.vault_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- bookings table
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  purpose text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view all bookings" ON public.bookings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert own bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookings" ON public.bookings FOR DELETE USING (auth.uid() = user_id);

-- Conflict detection function
CREATE OR REPLACE FUNCTION public.check_booking_conflict(
  p_resource text,
  p_start timestamptz,
  p_end timestamptz,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE resource = p_resource
      AND start_time < p_end
      AND end_time > p_start
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
  )
$$;

-- Enable realtime for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
