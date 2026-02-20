
-- ===========================================
-- FORGE LISTINGS
-- ===========================================
CREATE TABLE public.forge_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '🔧',
  code text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  version integer NOT NULL DEFAULT 1,
  installs integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  is_listed boolean NOT NULL DEFAULT true,
  ipo_active boolean NOT NULL DEFAULT false,
  ipo_target numeric NOT NULL DEFAULT 0,
  ipo_raised numeric NOT NULL DEFAULT 0,
  total_shares integer NOT NULL DEFAULT 1000,
  share_price numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forge_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view listed forge apps" ON public.forge_listings
  FOR SELECT USING (true);

CREATE POLICY "Users can publish their own apps" ON public.forge_listings
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE TRIGGER update_forge_listings_updated_at
  BEFORE UPDATE ON public.forge_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- APP SHARES
-- ===========================================
CREATE TABLE public.app_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.forge_listings(id) ON DELETE CASCADE,
  shares integer NOT NULL DEFAULT 0,
  avg_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

ALTER TABLE public.app_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shares" ON public.app_shares
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all shares" ON public.app_shares
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ===========================================
-- SHARE ORDERS
-- ===========================================
CREATE TABLE public.share_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.forge_listings(id) ON DELETE CASCADE,
  order_type text NOT NULL,
  shares integer NOT NULL,
  price numeric NOT NULL,
  filled integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.share_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON public.share_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view open orders" ON public.share_orders
  FOR SELECT USING (status = 'open');

CREATE POLICY "Users can place orders" ON public.share_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own orders" ON public.share_orders
  FOR UPDATE USING (auth.uid() = user_id);

-- ===========================================
-- BET MARKETS
-- ===========================================
CREATE TABLE public.bet_markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  question text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  listing_id uuid REFERENCES public.forge_listings(id) ON DELETE SET NULL,
  yes_pool numeric NOT NULL DEFAULT 0,
  no_pool numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  expiry timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  creation_cost numeric NOT NULL DEFAULT 1000
);

ALTER TABLE public.bet_markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bet markets" ON public.bet_markets
  FOR SELECT USING (true);

CREATE POLICY "Users can create markets" ON public.bet_markets
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- ===========================================
-- BETS
-- ===========================================
CREATE TABLE public.bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  market_id uuid NOT NULL REFERENCES public.bet_markets(id) ON DELETE CASCADE,
  side text NOT NULL,
  amount numeric NOT NULL,
  claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bets" ON public.bets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can place bets" ON public.bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- REALTIME
-- ===========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.forge_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.share_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bet_markets;
