-- =============================================================
-- C.F3 — AI moderace feed příspěvků (posts)
-- Stejný pattern jako A.F1 (requests), jiná tabulka.
-- =============================================================

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (moderation_status IN ('pending', 'approved', 'flagged'));

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS moderation_flags JSONB;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS moderation_checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS posts_moderation_idx
  ON posts (moderation_status, created_at DESC)
  WHERE moderation_status IN ('pending', 'flagged');

CREATE OR REPLACE VIEW v_post_moderation_queue AS
  SELECT po.id, po.user_id, po.content, po.image_url,
         po.moderation_status, po.moderation_flags, po.moderation_checked_at,
         po.created_at, p.full_name AS user_name, p.email AS user_email
    FROM posts po
    LEFT JOIN profiles p ON p.id = po.user_id
   WHERE po.moderation_status IN ('pending', 'flagged')
   ORDER BY po.created_at DESC;
