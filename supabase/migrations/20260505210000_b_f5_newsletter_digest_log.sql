-- =============================================================
-- B.F5 — Newsletter digest log (idempotence pro 2× týdně cron)
-- Záznam o odeslání digestu konkrétnímu subscriberovi v daný den.
-- Cron běží Wed+Sun 08:00 — log brání duplicitnímu odeslání,
-- pokud cron timeoutne a Vercel ho retryne.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.newsletter_digest_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  digest_date DATE NOT NULL,
  recipient_count INT NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT newsletter_digest_log_unique_per_day UNIQUE (subscriber_id, digest_date)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_digest_log_date
  ON public.newsletter_digest_log(digest_date);

ALTER TABLE public.newsletter_digest_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS newsletter_digest_log_admin_read ON public.newsletter_digest_log;
CREATE POLICY newsletter_digest_log_admin_read ON public.newsletter_digest_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
       WHERE id = auth.uid() AND admin_role IS NOT NULL
    )
  );

COMMENT ON TABLE public.newsletter_digest_log IS
  'B.F5 — log digest odeslaných per subscriber per den. Brání duplicitě při retry cronu.';
