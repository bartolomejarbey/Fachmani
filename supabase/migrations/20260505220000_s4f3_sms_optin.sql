-- =============================================================
-- S4.F3 — SMS notifikace (opt-in + log)
-- Sloupce v profiles pro opt-in + logovací tabulka odeslaných SMS.
-- Provider abstrakce v lib/sms/provider.ts — env: SMS_PROVIDER (smsbrana|twilio).
-- =============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sms_phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.sms_opt_in IS
  'S4.F3 — uživatel souhlasí s odběrem SMS notifikací (urgent poptávky, kritické eventy).';
COMMENT ON COLUMN public.profiles.sms_phone_verified IS
  'S4.F3 — telefon byl ověřen (ručně adminem nebo přes verifikační SMS s kódem).';

CREATE TABLE IF NOT EXISTS public.sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  provider TEXT,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','stub')),
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_log_user ON public.sms_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_log_status_sent ON public.sms_log(status, sent_at DESC);

ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sms_log_admin_read ON public.sms_log;
CREATE POLICY sms_log_admin_read ON public.sms_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
       WHERE id = auth.uid() AND admin_role IS NOT NULL
    )
  );

COMMENT ON TABLE public.sms_log IS
  'S4.F3 — log odeslaných SMS. status=stub znamená že chyběl provider key a SMS reálně neodešla.';

-- notifications.sms_sent_at — idempotence pro urgent-sms cron (analogie email_sent_at)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.notifications.sms_sent_at IS
  'S4.F3 — kdy se k této notifikaci odeslala SMS (NULL = SMS ještě neodeslána / nepokoušelo se).';
