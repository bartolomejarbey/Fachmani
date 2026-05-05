-- =============================================================
-- Customer quota redesign: monthly → daily + paid extras + urgent free/month
--
-- Spec:
--   • Free zákazník: 1 poptávka / DEN (anti-zneužití).
--   • Extra poptávka navíc: 50 Kč z peněženky.
--   • Urgent: 1× zdarma za měsíc, dál 100 Kč z peněženky.
--   • Premium/business: bez limitů.
-- =============================================================

-- 1) Nové sloupce
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS daily_request_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_request_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS daily_request_extras INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_urgent_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_urgent_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2) platform_settings: free_requests_per_month → free_requests_per_day=1, +urgent_free_per_month=1
UPDATE system_settings
   SET value = (value - 'free_requests_per_month')
                || jsonb_build_object(
                     'free_requests_per_day', 1,
                     'urgent_free_per_month', 1
                   )
 WHERE key = 'platform_settings';

-- 3) pricing: extra_request=50, urgent_request=100
UPDATE system_settings
   SET value = value || jsonb_build_object(
                 'extra_request', 50,
                 'urgent_request', 100
               )
 WHERE key = 'pricing';

-- 4) Trigger: zaplnit denní + extras logiku
CREATE OR REPLACE FUNCTION check_customer_request_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription TEXT;
  v_count INT;
  v_extras INT;
  v_reset TIMESTAMPTZ;
  v_limit INT;
BEGIN
  -- requesty bez user_id (admin imports, ghost) povolíme
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT subscription_type, daily_request_count, daily_request_extras, daily_request_reset_at
    INTO v_subscription, v_count, v_extras, v_reset
    FROM profiles WHERE id = NEW.user_id;

  IF v_subscription IS NULL THEN
    RETURN NEW;
  END IF;

  -- Premium/business = bez limitu
  IF v_subscription IN ('premium', 'business') THEN
    RETURN NEW;
  END IF;

  -- Reset denního čítače pokud poslední reset byl jiný kalendářní den (UTC)
  IF date_trunc('day', v_reset) < date_trunc('day', NOW()) THEN
    UPDATE profiles
       SET daily_request_count = 0,
           daily_request_extras = 0,
           daily_request_reset_at = NOW()
     WHERE id = NEW.user_id;
    v_count := 0;
    v_extras := 0;
  END IF;

  -- Načti denní limit ze settings
  SELECT COALESCE((value->>'free_requests_per_day')::INT, 1)
    INTO v_limit
    FROM system_settings WHERE key = 'platform_settings';
  IF v_limit IS NULL THEN v_limit := 1; END IF;

  IF v_count >= v_limit THEN
    -- volná kvóta vyčerpaná — pokud má zaplacené extras, spotřebuj 1
    IF v_extras > 0 THEN
      UPDATE profiles
         SET daily_request_extras = daily_request_extras - 1,
             daily_request_count = daily_request_count + 1
       WHERE id = NEW.user_id;
    ELSE
      RAISE EXCEPTION 'Vyčerpali jste denní limit % bezplatné poptávky. Pro další si zaplaťte extra slot (50 Kč) nebo aktivujte Premium.', v_limit
        USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    UPDATE profiles
       SET daily_request_count = daily_request_count + 1
     WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_customer_request_limit IS
  'Customer quota: 1 poptávka/den free, dál 50 Kč extra (přes daily_request_extras). Premium/business unlimited.';

-- 5) RPC pro server-side přidání extra slotu po zaplacení
CREATE OR REPLACE FUNCTION grant_extra_request(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
     SET daily_request_extras = daily_request_extras + 1
   WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION grant_extra_request(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION grant_extra_request IS
  'Volá se ze serveru po úspěšné platbě extra_request — povolí 1 další poptávku navíc dnes.';

-- 6) RPC pro zaznamenání spotřebovaného urgentu (free nebo placený) — atomicky
CREATE OR REPLACE FUNCTION record_urgent_request(p_user_id UUID)
RETURNS BOOLEAN  -- vrací TRUE pokud byl urgent zdarma (v rámci měsíční kvóty)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
  v_reset TIMESTAMPTZ;
  v_free_limit INT;
  v_was_free BOOLEAN := FALSE;
BEGIN
  SELECT monthly_urgent_count, monthly_urgent_reset_at
    INTO v_count, v_reset
    FROM profiles WHERE id = p_user_id;

  -- Reset měsíčního čítače urgentu (>30 dní)
  IF v_reset < NOW() - INTERVAL '30 days' THEN
    UPDATE profiles
       SET monthly_urgent_count = 0,
           monthly_urgent_reset_at = NOW()
     WHERE id = p_user_id;
    v_count := 0;
  END IF;

  SELECT COALESCE((value->>'urgent_free_per_month')::INT, 1)
    INTO v_free_limit
    FROM system_settings WHERE key = 'platform_settings';
  IF v_free_limit IS NULL THEN v_free_limit := 1; END IF;

  IF v_count < v_free_limit THEN
    v_was_free := TRUE;
  END IF;

  UPDATE profiles
     SET monthly_urgent_count = monthly_urgent_count + 1
   WHERE id = p_user_id;

  RETURN v_was_free;
END;
$$;

GRANT EXECUTE ON FUNCTION record_urgent_request(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION record_urgent_request IS
  'Zaznamenej použití urgent slotu. Vrací TRUE pokud byl free (v rámci urgent_free_per_month), jinak FALSE.';
