-- =============================================================
-- B.F2 — Prioritní (urgent) poptávky
-- Spec: zákazník si může za poplatek označit poptávku jako prioritní;
-- v listingu je řazena před běžnými.
-- =============================================================

-- 1) Sloupce
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS urgent_paid_at TIMESTAMPTZ;

-- 2) Index pro rychlé řazení (urgent first, pak created_at desc)
CREATE INDEX IF NOT EXISTS requests_urgent_created_idx
  ON requests (is_urgent DESC, created_at DESC)
  WHERE status = 'active';

-- 3) Cena urgent flagu do system_settings.pricing JSONB
INSERT INTO system_settings (key, value)
VALUES (
  'pricing',
  jsonb_build_object(
    'top_profile_7d', 99,
    'boost_feed_1d', 49,
    'premium_badge_30d', 199,
    'extra_offer', 29,
    'urgent_request', 99
  )
)
ON CONFLICT (key) DO UPDATE
SET value = system_settings.value || jsonb_build_object('urgent_request', 99)
WHERE NOT (system_settings.value ? 'urgent_request');
