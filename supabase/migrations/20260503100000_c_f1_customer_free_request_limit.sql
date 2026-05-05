-- =============================================================
-- C.F1 — Free customer request limit (trial gating)
-- Spec: free zákazník může vytvořit jen X poptávek/měsíc.
-- Premium/business = unlimited. Po překročení -> CTA na /predplatne.
-- Konfigurovatelné adminem (default 1).
-- =============================================================

-- 1) Counters na profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS monthly_request_count INT NOT NULL DEFAULT 0;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS monthly_request_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2) Default setting (1 poptávka / měsíc zdarma)
INSERT INTO system_settings (key, value)
VALUES ('platform_settings', jsonb_build_object('free_requests_per_month', 1))
ON CONFLICT (key) DO UPDATE
   SET value = system_settings.value || jsonb_build_object('free_requests_per_month', 1)
 WHERE NOT (system_settings.value ? 'free_requests_per_month');

-- 3) BEFORE INSERT trigger na requests
CREATE OR REPLACE FUNCTION check_customer_request_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription TEXT;
  v_count INT;
  v_reset TIMESTAMPTZ;
  v_limit INT;
BEGIN
  -- requesty bez user_id (admin imports, ghost) povolíme
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT subscription_type, monthly_request_count, monthly_request_reset_at
    INTO v_subscription, v_count, v_reset
    FROM profiles WHERE id = NEW.user_id;

  -- Neexistující profil — ignoruj (necháme jiné triggery selhat smysluplně)
  IF v_subscription IS NULL THEN
    RETURN NEW;
  END IF;

  -- Premium/business = bez limitu
  IF v_subscription IN ('premium', 'business') THEN
    RETURN NEW;
  END IF;

  -- Reset měsíčního počítadla (>30 dní)
  IF v_reset < NOW() - INTERVAL '30 days' THEN
    UPDATE profiles
       SET monthly_request_count = 0,
           monthly_request_reset_at = NOW()
     WHERE id = NEW.user_id;
    v_count := 0;
  END IF;

  -- Načti limit ze settings
  SELECT COALESCE((value->>'free_requests_per_month')::INT, 1)
    INTO v_limit
    FROM system_settings WHERE key = 'platform_settings';

  IF v_limit IS NULL THEN v_limit := 1; END IF;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Vyčerpali jste % bezplatných poptávek za měsíc. Pro více aktivujte Premium.', v_limit
      USING ERRCODE = 'check_violation';
  END IF;

  -- Inkrement
  UPDATE profiles
     SET monthly_request_count = monthly_request_count + 1
   WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_customer_request_limit ON requests;
CREATE TRIGGER trg_check_customer_request_limit
  BEFORE INSERT ON requests
  FOR EACH ROW EXECUTE FUNCTION check_customer_request_limit();

COMMENT ON FUNCTION check_customer_request_limit IS
  'C.F1 — limit počtu poptávek/měsíc pro free zákazníky. Premium/business unlimited.';
