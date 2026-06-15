-- =============================================================
-- Launch promo kampaň — odstupňované TÝDENNÍ kvóty zdarma (poptávky + nabídky).
-- Platí pro VŠECHNY free účty (staré i nové), počítá se živě z requests/offers
-- (žádné per-účet čítače → žádná nespravedlnost). Premium/business = neomezeně.
-- Ramp: teď→15.7 = 10/10, 15.7→15.8 = 5/3, 15.8→31.8 = 3/1, pak konec → klasika.
-- Zapínání přes system_settings.promo_campaign.enabled (admin toggle).
-- =============================================================

INSERT INTO system_settings (key, value)
VALUES (
  'promo_campaign',
  jsonb_build_object(
    'enabled', true,
    'label', 'Spouštěcí promo — víc poptávek i nabídek zdarma!',
    'windows', jsonb_build_array(
      jsonb_build_object('until', '2026-07-15', 'requests_per_week', 10, 'offers_per_week', 10),
      jsonb_build_object('until', '2026-08-15', 'requests_per_week', 5,  'offers_per_week', 3),
      jsonb_build_object('until', '2026-08-31', 'requests_per_week', 3,  'offers_per_week', 1)
    )
  )
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Helper: vrátí aktivní týdenní limity (req/off) podle dnešního data, nebo žádný řádek
-- (kampaň vypnutá / po skončení). Okna musí být vzestupně dle `until`.
CREATE OR REPLACE FUNCTION public.promo_weekly_limits()
RETURNS TABLE(req_per_week INT, off_per_week INT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg JSONB;
  w JSONB;
BEGIN
  SELECT value INTO cfg FROM system_settings WHERE key = 'promo_campaign';
  IF cfg IS NULL OR COALESCE((cfg->>'enabled')::boolean, false) = false THEN
    RETURN;
  END IF;
  FOR w IN SELECT * FROM jsonb_array_elements(cfg->'windows') LOOP
    -- aktivní okno = první, jehož konec (včetně celého dne) je v budoucnu
    IF NOW() < ((w->>'until')::date + INTERVAL '1 day') THEN
      req_per_week := (w->>'requests_per_week')::INT;
      off_per_week := (w->>'offers_per_week')::INT;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;
  RETURN; -- po všech oknech → žádné promo
END;
$$;

-- ---- POPTÁVKY: check_customer_request_limit + promo větev ----
CREATE OR REPLACE FUNCTION public.check_customer_request_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription TEXT;
  v_count INT;
  v_extras INT;
  v_reset TIMESTAMPTZ;
  v_limit INT;
  v_promo INT;
  v_week INT;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  SELECT subscription_type, daily_request_count, daily_request_extras, daily_request_reset_at
    INTO v_subscription, v_count, v_extras, v_reset
    FROM profiles WHERE id = NEW.user_id;

  IF v_subscription IS NULL THEN RETURN NEW; END IF;
  IF v_subscription IN ('premium', 'business') THEN RETURN NEW; END IF;

  -- PROMO: během kampaně TÝDENNÍ limit místo denního (počítáno živě z requests).
  SELECT req_per_week INTO v_promo FROM public.promo_weekly_limits();
  IF v_promo IS NOT NULL THEN
    SELECT count(*) INTO v_week FROM requests
     WHERE user_id = NEW.user_id AND created_at >= date_trunc('week', NOW());
    IF v_week >= v_promo THEN
      RAISE EXCEPTION 'Promo akce: vyčerpali jste % bezplatných poptávek tento týden. Limit se obnoví v pondělí.', v_promo
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  -- Standardní denní limit
  IF date_trunc('day', v_reset) < date_trunc('day', NOW()) THEN
    UPDATE profiles SET daily_request_count = 0, daily_request_extras = 0, daily_request_reset_at = NOW()
     WHERE id = NEW.user_id;
    v_count := 0;
    v_extras := 0;
  END IF;

  SELECT COALESCE((value->>'free_requests_per_day')::INT, 1) INTO v_limit
    FROM system_settings WHERE key = 'platform_settings';
  IF v_limit IS NULL THEN v_limit := 1; END IF;

  IF v_count >= v_limit THEN
    IF v_extras > 0 THEN
      UPDATE profiles SET daily_request_extras = daily_request_extras - 1, daily_request_count = daily_request_count + 1
       WHERE id = NEW.user_id;
    ELSE
      RAISE EXCEPTION 'Vyčerpali jste denní limit % bezplatné poptávky. Pro další si zaplaťte extra slot (50 Kč) nebo aktivujte Premium.', v_limit
        USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    UPDATE profiles SET daily_request_count = daily_request_count + 1 WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---- NABÍDKY: check_fachman_trial_limit + promo větev (zachován grace) ----
CREATE OR REPLACE FUNCTION public.check_fachman_trial_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_provider RECORD;
  v_trial_offers_limit INT;
  v_grace_days INT;
  v_grace_end TIMESTAMPTZ;
  v_promo INT;
  v_week INT;
BEGIN
  IF NEW.provider_id IS NULL THEN RETURN NEW; END IF;

  SELECT subscription_type, trial_until, trial_offers_used
    INTO v_provider FROM profiles WHERE id = NEW.provider_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF v_provider.subscription_type IN ('premium', 'business') THEN RETURN NEW; END IF;

  -- PROMO: během kampaně TÝDENNÍ limit nabídek místo trialu (počítáno živě z offers).
  SELECT off_per_week INTO v_promo FROM public.promo_weekly_limits();
  IF v_promo IS NOT NULL THEN
    SELECT count(*) INTO v_week FROM offers
     WHERE provider_id = NEW.provider_id AND created_at >= date_trunc('week', NOW());
    IF v_week >= v_promo THEN
      RAISE EXCEPTION 'Promo akce: vyčerpali jste % bezplatných nabídek tento týden. Limit se obnoví v pondělí.', v_promo
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  SELECT
    COALESCE((value ->> 'trial_offers_limit')::INT, 10),
    COALESCE((value ->> 'trial_grace_days')::INT, 7)
    INTO v_trial_offers_limit, v_grace_days
    FROM system_settings WHERE key = 'platform_settings';
  IF v_trial_offers_limit IS NULL THEN v_trial_offers_limit := 10; END IF;
  IF v_grace_days IS NULL THEN v_grace_days := 7; END IF;

  IF v_provider.trial_until IS NOT NULL THEN
    v_grace_end := v_provider.trial_until + (v_grace_days || ' days')::INTERVAL;
    IF v_grace_end < NOW() THEN
      RAISE EXCEPTION 'Vaše trial období i % denní grace období vypršely. Pro pokračování přejděte na Premium.', v_grace_days
        USING ERRCODE = 'check_violation', HINT = 'trial_blocked_after_grace';
    END IF;
  END IF;

  IF COALESCE(v_provider.trial_offers_used, 0) >= v_trial_offers_limit THEN
    RAISE EXCEPTION 'Vyčerpali jste % reakcí v trial období. Pro pokračování přejděte na Premium.', v_trial_offers_limit
      USING ERRCODE = 'check_violation', HINT = 'trial_offers_exhausted';
  END IF;

  UPDATE profiles SET trial_offers_used = COALESCE(trial_offers_used, 0) + 1 WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
