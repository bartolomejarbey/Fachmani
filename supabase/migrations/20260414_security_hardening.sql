-- =============================================================
-- SECURITY HARDENING — 2026-04-14
-- =============================================================

-- =============================================================
-- 1. Restrict profiles public read — hide sensitive fields
--    Drop the overly permissive policy and replace with scoped ones
-- =============================================================

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;

-- Authenticated users can read all profiles (needed for provider cards, offers, etc.)
CREATE POLICY "profiles_select_authenticated" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Anonymous users can only read provider profiles (public catalog)
CREATE POLICY "profiles_select_anon_providers" ON profiles
  FOR SELECT USING (
    auth.uid() IS NULL AND role = 'provider'
  );

-- Profiles INSERT: auth callback needs to create profiles
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================================
-- 2. Enable RLS on financial tables
-- =============================================================

ALTER TABLE IF EXISTS wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS premium_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Wallets: users can only see/update their own
CREATE POLICY "wallets_select_own" ON wallets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallets_update_own" ON wallets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "wallets_insert_own" ON wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wallet transactions: users see their own
CREATE POLICY "wallet_tx_select_own" ON wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallet_tx_insert_own" ON wallet_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payments: users see their own
CREATE POLICY "payments_select_own" ON payments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payments_insert_own" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payments_update_own" ON payments
  FOR UPDATE USING (auth.uid() = user_id);

-- Premium subscriptions: users see their own
CREATE POLICY "premium_sub_select_own" ON premium_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "premium_sub_insert_own" ON premium_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AI usage: users see their own
CREATE POLICY "ai_usage_select_own" ON ai_usage
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_usage_insert_own" ON ai_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin activity log: only admins can read
CREATE POLICY "admin_log_select_admin" ON admin_activity_log
  FOR SELECT USING (
    (SELECT admin_role FROM profiles WHERE id = auth.uid()) IS NOT NULL
  );
CREATE POLICY "admin_log_insert_admin" ON admin_activity_log
  FOR INSERT WITH CHECK (
    (SELECT admin_role FROM profiles WHERE id = auth.uid()) IS NOT NULL
  );

-- =============================================================
-- 3. Provider profiles RLS
-- =============================================================

ALTER TABLE IF EXISTS provider_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_profiles_select_all" ON provider_profiles
  FOR SELECT USING (true);
CREATE POLICY "provider_profiles_insert_own" ON provider_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "provider_profiles_update_own" ON provider_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================
-- 4. Contact messages — anyone can insert (contact form),
--    only admins can read
-- =============================================================

ALTER TABLE IF EXISTS contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_messages_insert_any" ON contact_messages
  FOR INSERT WITH CHECK (true);
CREATE POLICY "contact_messages_select_admin" ON contact_messages
  FOR SELECT USING (
    (SELECT admin_role FROM profiles WHERE id = auth.uid()) IS NOT NULL
  );

-- =============================================================
-- 5. Newsletter subscribers — anyone can insert
-- =============================================================

ALTER TABLE IF EXISTS newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "newsletter_insert_any" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);
CREATE POLICY "newsletter_select_admin" ON newsletter_subscribers
  FOR SELECT USING (
    (SELECT admin_role FROM profiles WHERE id = auth.uid()) IS NOT NULL
  );

-- =============================================================
-- 6. Categories & provider_categories — public read
-- =============================================================

ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS provider_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_all" ON categories
  FOR SELECT USING (true);
CREATE POLICY "provider_categories_select_all" ON provider_categories
  FOR SELECT USING (true);
CREATE POLICY "provider_categories_insert_own" ON provider_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "provider_categories_delete_own" ON provider_categories
  FOR DELETE USING (auth.uid() = user_id);
