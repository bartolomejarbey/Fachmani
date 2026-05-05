-- =============================================================
-- B.F1 — Trial expiry soft-block + 7-denní grace period + email
-- Po vypršení trial_until pokračuje fachman ještě 7 dní v "grace" módu —
-- může reagovat (soft-block, jen varovná hláška), ale po 14 dnech je hard-block.
-- Email warning posílá cron /api/cron/trial-expiry-emails (jednou za den).
-- =============================================================

-- 1) Přidat default grace days do system_settings
INSERT INTO system_settings (key, value)
VALUES ('platform_settings', jsonb_build_object('trial_grace_days', 7))
ON CONFLICT (key) DO UPDATE
   SET value = system_settings.value || jsonb_build_object('trial_grace_days', 7)
 WHERE NOT (system_settings.value ? 'trial_grace_days');

-- 2) Sloupce na profiles pro tracking warning emailů
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_warning_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_grace_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_blocked_email_sent_at TIMESTAMPTZ;

-- 3) Update triggeru — povolit grace period
CREATE OR REPLACE FUNCTION check_fachman_trial_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_provider RECORD;
  v_trial_offers_limit INT;
  v_grace_days INT;
  v_grace_end TIMESTAMPTZ;
BEGIN
  IF NEW.provider_id IS NULL THEN RETURN NEW; END IF;

  SELECT subscription_type, trial_until, trial_offers_used
    INTO v_provider
    FROM profiles
   WHERE id = NEW.provider_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Premium / business — žádný trial limit
  IF v_provider.subscription_type IN ('premium', 'business') THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE((value ->> 'trial_offers_limit')::INT, 10),
    COALESCE((value ->> 'trial_grace_days')::INT, 7)
    INTO v_trial_offers_limit, v_grace_days
    FROM system_settings
   WHERE key = 'platform_settings';

  IF v_trial_offers_limit IS NULL THEN v_trial_offers_limit := 10; END IF;
  IF v_grace_days IS NULL THEN v_grace_days := 7; END IF;

  -- Hard block: trial vypršel + grace období uplynulo
  IF v_provider.trial_until IS NOT NULL THEN
    v_grace_end := v_provider.trial_until + (v_grace_days || ' days')::INTERVAL;
    IF v_grace_end < NOW() THEN
      RAISE EXCEPTION 'Vaše trial období i % denní grace období vypršely. Pro pokračování přejděte na Premium.', v_grace_days
        USING ERRCODE = 'check_violation', HINT = 'trial_blocked_after_grace';
    END IF;
  END IF;

  -- Hard block: vyčerpány reakce
  IF COALESCE(v_provider.trial_offers_used, 0) >= v_trial_offers_limit THEN
    RAISE EXCEPTION 'Vyčerpali jste % reakcí v trial období. Pro pokračování přejděte na Premium.', v_trial_offers_limit
      USING ERRCODE = 'check_violation', HINT = 'trial_offers_exhausted';
  END IF;

  -- Inkrement counter
  UPDATE profiles
     SET trial_offers_used = COALESCE(trial_offers_used, 0) + 1
   WHERE id = NEW.provider_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) View pro frontend — kompletní trial status
CREATE OR REPLACE VIEW v_my_trial_status AS
  SELECT
    p.id AS user_id,
    p.subscription_type,
    p.trial_until,
    p.trial_offers_used,
    COALESCE(
      (SELECT (value ->> 'trial_offers_limit')::INT FROM system_settings WHERE key = 'platform_settings'),
      10
    ) AS trial_offers_limit,
    COALESCE(
      (SELECT (value ->> 'trial_grace_days')::INT FROM system_settings WHERE key = 'platform_settings'),
      7
    ) AS trial_grace_days,
    CASE
      WHEN p.subscription_type IN ('premium', 'business') THEN 'premium'
      WHEN p.trial_until IS NULL THEN 'no_trial'
      WHEN p.trial_until > NOW() THEN 'active'
      WHEN p.trial_until + (COALESCE(
        (SELECT (value ->> 'trial_grace_days')::INT FROM system_settings WHERE key = 'platform_settings'),
        7
      ) || ' days')::INTERVAL > NOW() THEN 'grace'
      ELSE 'blocked'
    END AS trial_state
  FROM profiles p;

GRANT SELECT ON v_my_trial_status TO authenticated;

COMMENT ON VIEW v_my_trial_status IS
  'B.F1 — kompletní trial status: active / grace (po vypršení, +7 dní) / blocked / premium / no_trial.';
