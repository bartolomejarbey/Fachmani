-- =============================================================
-- S4.F4 — Mobile/desktop push notifications (Web Push)
-- Tabulka push_subscriptions ukládá subscription objekty (endpoint + p256dh + auth)
-- pro každého přihlášeného uživatele. Stejný uživatel může mít víc zařízení.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT push_subscriptions_unique_endpoint UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_select_own ON public.push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_fachmani_owner());

DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_insert_own ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_delete_own ON public.push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id OR public.is_fachmani_owner());

-- profile flag: chce uživatel push?
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.push_opt_in IS
  'S4.F4 — uživatel souhlasí s push notifikacemi (vyžaduje aspoň jeden záznam v push_subscriptions).';

-- notifications.push_sent_at — idempotence pro push fanout cron
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ;

COMMENT ON TABLE public.push_subscriptions IS
  'S4.F4 — Web Push subscription per zařízení. Uživatel může mít víc zařízení (mobil + desktop).';
