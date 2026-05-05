-- =============================================================
-- A.F1 — AI moderace poptávek
-- Spec: nově vytvořená poptávka projde OpenAI moderation API.
-- Pokud flagged (hate, sexual, violence, ...), zůstane 'pending'
-- a zařadí se do admin fronty k ručnímu rozhodnutí.
-- =============================================================

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (moderation_status IN ('pending', 'approved', 'flagged'));

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS moderation_flags JSONB;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS moderation_checked_at TIMESTAMPTZ;

-- Index pro admin frontu pending/flagged
CREATE INDEX IF NOT EXISTS requests_moderation_idx
  ON requests (moderation_status, created_at DESC)
  WHERE moderation_status IN ('pending', 'flagged');

-- Helper view pro admin frontu
CREATE OR REPLACE VIEW v_moderation_queue AS
  SELECT r.id, r.user_id, r.title, r.description, r.location,
         r.moderation_status, r.moderation_flags, r.moderation_checked_at,
         r.created_at, p.full_name AS user_name, p.email AS user_email
    FROM requests r
    LEFT JOIN profiles p ON p.id = r.user_id
   WHERE r.moderation_status IN ('pending', 'flagged')
   ORDER BY r.created_at DESC;
