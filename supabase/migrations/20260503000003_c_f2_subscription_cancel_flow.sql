-- =============================================================
-- C.F2 — Cancel Premium na konci fakturačního období
-- Spec: uživatel klikne "Zrušit předplatné", služba zůstane aktivní
-- do konce zaplaceného období, pak se automaticky degraduje na free.
-- Volitelně: důvod zrušení (feedback pro produktový tým).
-- =============================================================

-- 1) Sloupce na profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 2) Funkce pro automatické downgrade po vypršení (volá se z aplikace nebo cronu)
CREATE OR REPLACE FUNCTION auto_downgrade_cancelled_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  affected INT;
BEGIN
  WITH expired AS (
    UPDATE profiles
       SET subscription_type = 'free',
           subscription_expires_at = NULL,
           cancel_at_period_end = false,
           cancelled_at = NULL,
           cancellation_reason = NULL
     WHERE cancel_at_period_end = true
       AND subscription_type IN ('premium', 'business')
       AND subscription_expires_at IS NOT NULL
       AND subscription_expires_at <= NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO affected FROM expired;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_downgrade_cancelled_subscriptions IS
  'Volat denně cronem (Supabase Scheduled Function nebo Vercel cron) — degraduje cancelled subscriptions po expiraci.';
