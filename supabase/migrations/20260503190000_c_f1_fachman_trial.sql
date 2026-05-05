-- =============================================================
-- C.F1 (oprava výkladu) — Fachman trial
-- Spec: nový free fachman dostane 2 měsíce trial s 10 reakcemi a 1 kategorií.
-- Po vyčerpání trial / reakcí: musí přejít na premium.
-- (Předchozí migrace 20260503100000 řeší 1 free poptávka/měsíc pro ZÁKAZNÍKA —
--  to je separátní funkce, kterou ponecháváme.)
-- =============================================================

-- 1) Trial sloupce
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_offers_used INT NOT NULL DEFAULT 0;

-- 2) Backfill existujících free providerů — trial_until = created_at + 2 měsíce
--    (pokud už jsou starší 2 měsíce, trial je past — UI to zobrazí jako "vyčerpáno")
UPDATE profiles
   SET trial_until = created_at + INTERVAL '2 months'
 WHERE role IN ('provider', 'fachman')
   AND COALESCE(subscription_type, 'free') = 'free'
   AND trial_until IS NULL;

-- 3) Default trial limit do system_settings (admin přepíše v UI nastavení)
INSERT INTO system_settings (key, value)
VALUES (
  'platform_settings',
  jsonb_build_object(
    'trial_months', 2,
    'trial_offers_limit', 10,
    'free_categories_limit', 1,
    'premium_categories_limit', 3
  )
)
ON CONFLICT (key) DO UPDATE
SET value = system_settings.value
  || jsonb_build_object('trial_months', 2)
  || jsonb_build_object('trial_offers_limit', 10)
  || jsonb_build_object('free_categories_limit', 1)
  || jsonb_build_object('premium_categories_limit', 3);

-- 4) Trigger: BEFORE INSERT na offers — kontrola trial limitu
CREATE OR REPLACE FUNCTION check_fachman_trial_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_provider RECORD;
  v_trial_offers_limit INT;
  v_offers_count INT;
BEGIN
  IF NEW.provider_id IS NULL THEN RETURN NEW; END IF;

  SELECT subscription_type, trial_until, trial_offers_used
    INTO v_provider
    FROM profiles
   WHERE id = NEW.provider_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Premium / business / vyšší tier — žádný trial limit
  IF v_provider.subscription_type IN ('premium', 'business') THEN
    RETURN NEW;
  END IF;

  -- Free fachman — kontrola trial okna
  SELECT COALESCE((value ->> 'trial_offers_limit')::INT, 10)
    INTO v_trial_offers_limit
    FROM system_settings
   WHERE key = 'platform_settings';

  IF v_trial_offers_limit IS NULL THEN v_trial_offers_limit := 10; END IF;

  -- Trial vypršel? (trial_until v minulosti)
  IF v_provider.trial_until IS NOT NULL AND v_provider.trial_until < NOW() THEN
    RAISE EXCEPTION 'Vaše trial období vypršelo. Pro pokračování přejděte na Premium.'
      USING ERRCODE = 'check_violation', HINT = 'trial_expired';
  END IF;

  -- Vyčerpáno 10 reakcí?
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

DROP TRIGGER IF EXISTS trg_check_fachman_trial_limit ON offers;
CREATE TRIGGER trg_check_fachman_trial_limit
  BEFORE INSERT ON offers
  FOR EACH ROW EXECUTE FUNCTION check_fachman_trial_limit();

-- 5) Helper trigger pro nového fachmana — set trial_until automaticky
CREATE OR REPLACE FUNCTION set_trial_on_new_fachman()
RETURNS TRIGGER AS $$
DECLARE
  v_trial_months INT;
BEGIN
  IF NEW.role IN ('provider', 'fachman')
     AND COALESCE(NEW.subscription_type, 'free') = 'free'
     AND NEW.trial_until IS NULL THEN
    SELECT COALESCE((value ->> 'trial_months')::INT, 2) INTO v_trial_months
      FROM system_settings WHERE key = 'platform_settings';
    IF v_trial_months IS NULL THEN v_trial_months := 2; END IF;
    NEW.trial_until := COALESCE(NEW.created_at, NOW()) + (v_trial_months || ' months')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_trial_on_new_fachman ON profiles;
CREATE TRIGGER trg_set_trial_on_new_fachman
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_trial_on_new_fachman();

COMMENT ON COLUMN profiles.trial_until IS
  'C.F1 — konec trial období pro free fachmana. Po vypršení musí upgradovat.';
COMMENT ON COLUMN profiles.trial_offers_used IS
  'C.F1 — počet reakcí spotřebovaných v trial období (cap z system_settings.trial_offers_limit).';
