-- =============================================================
-- A.F6 — Ghost ARES subjekty: GDPR suppress flag
-- Spec: subjekt si může vyžádat vyřazení (právo na námitku, GDPR čl. 21).
-- Po označení gdpr_suppressed=true:
--   - veřejná stránka /fachman/ghost/[ico] vrací prázdnou disclaimer stránku + noindex
--   - feed/seznamy ho ignorují
-- =============================================================

ALTER TABLE ghost_subjects
  ADD COLUMN IF NOT EXISTS gdpr_suppressed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gdpr_suppressed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gdpr_suppressed_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_ghost_subjects_gdpr_suppressed
  ON ghost_subjects (gdpr_suppressed)
  WHERE gdpr_suppressed = TRUE;

COMMENT ON COLUMN ghost_subjects.gdpr_suppressed IS
  'A.F6 — TRUE pokud subjekt vyžádal vyřazení dle GDPR čl. 21. Veřejná stránka pak skryje data.';
