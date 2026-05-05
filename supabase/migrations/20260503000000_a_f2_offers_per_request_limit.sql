-- =============================================================
-- A.F2 — Limit počtu nabídek (reakcí) na jednu poptávku
-- Smluvní spec: max 5 reakcí / poptávku, hodnota měnitelná adminem.
-- Doplňuje existující per-měsíc / per-provider limit (check_offer_limit).
-- =============================================================

-- 1) Index pro rychlé COUNT(*) v triggeru
CREATE INDEX IF NOT EXISTS offers_request_id_idx ON offers (request_id);

-- 2) Trigger: počet nabídek na poptávku <= limit ze system_settings
CREATE OR REPLACE FUNCTION check_offers_per_request_limit()
RETURNS TRIGGER AS $$
DECLARE
  per_request_limit INT;
  current_count INT;
BEGIN
  -- Limit ze system_settings.platform_settings.max_offers_per_request, default 5
  SELECT COALESCE(
    (value ->> 'max_offers_per_request')::INT,
    5
  ) INTO per_request_limit
  FROM system_settings
  WHERE key = 'platform_settings';

  IF per_request_limit IS NULL THEN
    per_request_limit := 5;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM offers
  WHERE request_id = NEW.request_id;

  IF current_count >= per_request_limit THEN
    RAISE EXCEPTION 'Tato poptávka už má maximální počet nabídek (%). Zkuste jinou poptávku.', per_request_limit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_offers_per_request_limit ON offers;
CREATE TRIGGER enforce_offers_per_request_limit
  BEFORE INSERT ON offers
  FOR EACH ROW
  EXECUTE FUNCTION check_offers_per_request_limit();

-- 3) Seed default hodnoty do system_settings (merge do existujícího platform_settings)
-- Tabulka system_settings se historicky vytvořila přes Dashboard, takže fallback na INSERT.
INSERT INTO system_settings (key, value)
VALUES (
  'platform_settings',
  jsonb_build_object(
    'free_offers_per_month', 3,
    'request_expiry_days', 30,
    'max_images_per_request', 5,
    'max_offers_per_request', 5
  )
)
ON CONFLICT (key) DO UPDATE
SET value = system_settings.value || jsonb_build_object('max_offers_per_request', 5)
WHERE NOT (system_settings.value ? 'max_offers_per_request');
