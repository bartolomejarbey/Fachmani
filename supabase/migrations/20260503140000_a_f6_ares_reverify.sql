-- =============================================================
-- A.F6 — ARES re-verifikace cron + opt-out
-- Spec: pravidelně ověřit IČO/údaje fachmanů z ARES.
-- Opt-out: fachman může vypnout (privacy).
-- =============================================================

-- Opt-out flag (default false = chceme refreshovat)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ares_reverify_opt_out BOOLEAN NOT NULL DEFAULT false;

-- Index pro cron lookup (kdo potřebuje refresh)
CREATE INDEX IF NOT EXISTS profiles_ares_reverify_idx
  ON profiles (ares_verified_at NULLS FIRST)
  WHERE ico IS NOT NULL AND ares_reverify_opt_out = false;

-- Helper: kandidáti na refresh (pro cron endpoint)
CREATE OR REPLACE FUNCTION get_ares_reverify_candidates(
  p_max_age_days INT DEFAULT 30,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (id UUID, ico TEXT, ares_verified_at TIMESTAMPTZ) AS $$
  SELECT id, ico, ares_verified_at
    FROM profiles
   WHERE ico IS NOT NULL
     AND ico ~ '^[0-9]{8}$'
     AND ares_reverify_opt_out = false
     AND (ares_verified_at IS NULL OR ares_verified_at < NOW() - (p_max_age_days || ' days')::INTERVAL)
   ORDER BY ares_verified_at NULLS FIRST
   LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION get_ares_reverify_candidates IS
  'A.F6 — vrací max p_limit profilů jejichž ARES data jsou starší než p_max_age_days. Cron endpoint je iteruje a pro každý zavolá ARES lookup.';
