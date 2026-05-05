-- =============================================================
-- B.F2 — Direct messaging fachman→fachman (chat bez poptávky)
-- Spec: dva fachmani si můžou psát i bez kontextu poptávky.
-- Stávající messages.request_id přepneme na nullable; pro existující
-- listingy v /zpravy seskupujeme po (request_id, other_user_id).
-- Pro direct chat je klíč (NULL, other_user_id).
-- =============================================================

-- 1) Pokud je request_id NOT NULL, povolíme NULL
ALTER TABLE public.messages
  ALTER COLUMN request_id DROP NOT NULL;

-- 2) Index pro rychlé loadnutí direct konverzace mezi 2 usery
CREATE INDEX IF NOT EXISTS idx_messages_direct_pair
  ON public.messages (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at DESC)
  WHERE request_id IS NULL;

-- 3) Index pro rychlou kontrolu unread direct messages
CREATE INDEX IF NOT EXISTS idx_messages_direct_unread
  ON public.messages (receiver_id)
  WHERE request_id IS NULL AND is_read = FALSE;

-- 4) View pro UI: seznam direct konverzací aktuálního usera
--    Necháváme to jako lookup z app — view potřebuje CURRENT auth.uid(),
--    což je v Postgres views OK, ale aplikace už dělá manuální group-by
--    z messages selectu, takže jen indexy.

COMMENT ON COLUMN public.messages.request_id IS
  'Volitelné — pokud NULL, jde o direct chat fachman→fachman bez kontextu poptávky (B.F2).';
