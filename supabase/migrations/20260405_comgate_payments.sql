-- Tabulka pro kreditní peněženku
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  balance_kc INTEGER NOT NULL DEFAULT 0,
  total_topped_up_kc INTEGER NOT NULL DEFAULT 0,
  total_spent_kc INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallets_user ON wallets(user_id);

-- Tabulka pro všechny platby (topup i premium)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type VARCHAR(30) NOT NULL, -- 'topup', 'premium_initial', 'premium_recurring'
  amount_kc INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'cancelled'
  comgate_trans_id VARCHAR(100) UNIQUE,
  comgate_ref_id VARCHAR(100),
  is_test BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_comgate_trans ON payments(comgate_trans_id);

-- Tabulka pro transakce peněženky (historie strhávání)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type VARCHAR(30) NOT NULL, -- 'topup', 'offer_publish', 'profile_boost', 'feed_boost'
  amount_kc INTEGER NOT NULL, -- kladné pro nabití, záporné pro odečtení
  balance_after_kc INTEGER NOT NULL,
  description TEXT,
  related_entity_id UUID, -- ID nabídky/topování/boostu
  payment_id UUID REFERENCES payments(id), -- u topup transakcí
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_user ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_created ON wallet_transactions(created_at DESC);

-- Tabulka pro Premium předplatné
CREATE TABLE IF NOT EXISTS premium_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired'
  initial_payment_id UUID REFERENCES payments(id),
  comgate_init_trans_id VARCHAR(100), -- pro navazující recurring platby
  started_at TIMESTAMPTZ DEFAULT NOW(),
  next_billing_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_premium_user ON premium_subscriptions(user_id);
CREATE INDEX idx_premium_status ON premium_subscriptions(status);

-- RLS policies
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see own transactions" ON wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see own subscription" ON premium_subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages wallets" ON wallets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manages payments" ON payments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manages transactions" ON wallet_transactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manages subscriptions" ON premium_subscriptions FOR ALL USING (auth.role() = 'service_role');

-- Automatické vytvoření peněženky při registraci fachmana
CREATE OR REPLACE FUNCTION create_wallet_for_provider()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'provider' THEN
    INSERT INTO wallets (user_id, balance_kc)
    VALUES (NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_create_wallet
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_provider();
