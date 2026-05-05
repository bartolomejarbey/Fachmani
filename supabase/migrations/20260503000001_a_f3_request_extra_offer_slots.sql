-- =============================================================
-- A.F3 — Refresh poptávky: admin může přidat +N slotů nad rámec stropu
-- Smluvní spec: admin tlačítkem "Refresh" navýší počet povolených reakcí
-- (default +10 ke stropu z A.F2). Účtuje se do admin_activity_log.
-- =============================================================

-- 1) Sloupec na requests: kolik slotů admin přidal navíc nad cap z A.F2
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS extra_offer_slots INT NOT NULL DEFAULT 0;

-- 2) Trigger z A.F2 přepsán: respektuje (cap + extra_offer_slots)
CREATE OR REPLACE FUNCTION check_offers_per_request_limit()
RETURNS TRIGGER AS $$
DECLARE
  per_request_limit INT;
  extra_slots INT;
  effective_limit INT;
  current_count INT;
BEGIN
  -- Globální cap z system_settings.platform_settings.max_offers_per_request, default 5
  SELECT COALESCE(
    (value ->> 'max_offers_per_request')::INT,
    5
  ) INTO per_request_limit
  FROM system_settings
  WHERE key = 'platform_settings';

  IF per_request_limit IS NULL THEN
    per_request_limit := 5;
  END IF;

  -- Extra sloty z requestu (admin refresh)
  SELECT COALESCE(extra_offer_slots, 0) INTO extra_slots
  FROM requests
  WHERE id = NEW.request_id;

  effective_limit := per_request_limit + extra_slots;

  SELECT COUNT(*) INTO current_count
  FROM offers
  WHERE request_id = NEW.request_id;

  IF current_count >= effective_limit THEN
    RAISE EXCEPTION 'Tato poptávka už má maximální počet nabídek (%). Zkuste jinou poptávku.', effective_limit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Default refresh velikost do system_settings (admin si může přepsat)
INSERT INTO system_settings (key, value)
VALUES (
  'platform_settings',
  jsonb_build_object(
    'free_offers_per_month', 3,
    'request_expiry_days', 30,
    'max_images_per_request', 5,
    'max_offers_per_request', 5,
    'refresh_offer_slots', 10
  )
)
ON CONFLICT (key) DO UPDATE
SET value = system_settings.value || jsonb_build_object('refresh_offer_slots', 10)
WHERE NOT (system_settings.value ? 'refresh_offer_slots');
