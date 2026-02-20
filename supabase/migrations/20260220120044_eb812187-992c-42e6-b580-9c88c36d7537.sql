
-- Wallets table
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  os_balance numeric(20,2) NOT NULL DEFAULT 0,
  ix_balance numeric(20,6) NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Users can view their own wallet
CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all wallets
CREATE POLICY "Admins can view all wallets" ON public.wallets
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- System wallet readable by all authenticated (for leaderboard)
CREATE POLICY "Authenticated can view system wallet" ON public.wallets
  FOR SELECT TO authenticated
  USING (is_system = true);

-- Trigger for updated_at
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Escrow deals table
CREATE TABLE public.escrow_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  counterparty_id uuid NOT NULL,
  token_type text NOT NULL CHECK (token_type IN ('OS', 'IX')),
  amount numeric(20,6) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'locked', 'released', 'cancelled')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.escrow_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own escrow deals" ON public.escrow_deals
  FOR SELECT TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = counterparty_id);

CREATE POLICY "Admins can view all escrow deals" ON public.escrow_deals
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Transactions table
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_wallet_id uuid REFERENCES public.wallets(id),
  to_wallet_id uuid REFERENCES public.wallets(id),
  token_type text NOT NULL CHECK (token_type IN ('OS', 'IX')),
  amount numeric(20,6) NOT NULL CHECK (amount > 0),
  tx_type text NOT NULL CHECK (tx_type IN ('transfer', 'interest', 'reward', 'exchange', 'escrow_lock', 'escrow_release', 'mint')),
  description text,
  escrow_id uuid REFERENCES public.escrow_deals(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can view transactions involving their wallet
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (
    from_wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
    OR to_wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
