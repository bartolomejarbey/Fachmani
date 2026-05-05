-- =============================================================
-- C.F2 — Kategorie per tarif + feed publish gating
-- Spec:
--   Free fachman: 1 kategorie
--   Premium:     3 kategorie
--   Business:    neomezeno
--   Public feed (/fachmani, /kategorie/[slug]): pouze premium+ se zobrazují.
-- =============================================================

-- 1) BEFORE INSERT trigger — kontrola limitu kategorií
-- provider_categories.provider_id → provider_profiles.id → profiles.id (subscription_type)
CREATE OR REPLACE FUNCTION check_provider_categories_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription TEXT;
  v_count INT;
  v_free_limit INT;
  v_premium_limit INT;
  v_limit INT;
BEGIN
  SELECT p.subscription_type INTO v_subscription
    FROM provider_profiles pp
    JOIN profiles p ON p.id = pp.user_id
   WHERE pp.id = NEW.provider_id;

  -- Pokud nemůžeme určit tarif, povol (admin scénáře, seed data, atd.)
  IF v_subscription IS NULL THEN RETURN NEW; END IF;

  -- Business — bez limitu
  IF v_subscription = 'business' THEN RETURN NEW; END IF;

  SELECT
    COALESCE((value ->> 'free_categories_limit')::INT, 1),
    COALESCE((value ->> 'premium_categories_limit')::INT, 3)
  INTO v_free_limit, v_premium_limit
  FROM system_settings
  WHERE key = 'platform_settings';

  v_limit := CASE
    WHEN v_subscription = 'premium' THEN COALESCE(v_premium_limit, 3)
    ELSE COALESCE(v_free_limit, 1)
  END;

  SELECT COUNT(*) INTO v_count
    FROM provider_categories
   WHERE provider_id = NEW.provider_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Překročen limit kategorií (max % pro tarif %)', v_limit, v_subscription
      USING ERRCODE = 'check_violation', HINT = 'category_limit_exceeded';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_provider_categories_limit ON provider_categories;
CREATE TRIGGER trg_check_provider_categories_limit
  BEFORE INSERT ON provider_categories
  FOR EACH ROW EXECUTE FUNCTION check_provider_categories_limit();

-- 2) View pro public feed — pouze fachmani s aktivní viditelností
-- Pravidlo: premium+ vždy, free POUZE pokud trial ještě běží (trial_until v budoucnosti).
-- Free s vypršeným trialem v public feedu nezobrazujeme — musí upgradovat.
CREATE OR REPLACE VIEW v_public_feed_providers AS
SELECT id
  FROM profiles
 WHERE role IN ('provider', 'fachman')
   AND (
     subscription_type IN ('premium', 'business')
     OR (
       COALESCE(subscription_type, 'free') = 'free'
       AND trial_until IS NOT NULL
       AND trial_until > NOW()
     )
   );

GRANT SELECT ON v_public_feed_providers TO anon, authenticated;

COMMENT ON FUNCTION check_provider_categories_limit() IS
  'C.F2 — vynutí limit kategorií podle subscription_type (free=1, premium=3, business=∞).';
COMMENT ON VIEW v_public_feed_providers IS
  'C.F2 — premium+ vždy viditelní v public feedu; free pouze během aktivního trialu.';
