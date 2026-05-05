-- =============================================================
-- Job completion confirmation (workflow odemykající customer_review)
--
-- Spec:
--   1. Fachman pošle nabídku na poptávku.
--   2. Zákazník KDYKOLIV (cap 3 měsíce od vytvoření nabídky) může poslat
--      fachmanovi žádost o potvrzení, že zakázka byla dokončená.
--   3. Fachman potvrdí (nebo zamítne) — pokud potvrdí, otevře se mu
--      možnost ohodnotit zákazníka 3-D ratingem (customer_reviews).
--
-- Anti-abuse:
--   * 1 žádost per offer (UNIQUE)
--   * Zákazník musí vlastnit request a provider musí být providerem nabídky
--   * Cap 3 měsíce od offer.created_at (jinak insert blocked)
--   * Customer ≠ Provider (CHECK)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.job_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'denied')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL,
  denied_reason TEXT NULL,
  CONSTRAINT job_completions_unique_per_offer UNIQUE (offer_id),
  CONSTRAINT job_completions_customer_provider_distinct CHECK (customer_id <> provider_id)
);

CREATE INDEX IF NOT EXISTS idx_job_completions_provider ON public.job_completions(provider_id);
CREATE INDEX IF NOT EXISTS idx_job_completions_customer ON public.job_completions(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_completions_request ON public.job_completions(request_id);
CREATE INDEX IF NOT EXISTS idx_job_completions_status ON public.job_completions(status) WHERE status = 'pending';

-- Validation: zákazník vlastní request, provider má offer, offer < 3 měsíce.
CREATE OR REPLACE FUNCTION public.validate_job_completion_request()
RETURNS TRIGGER AS $$
DECLARE
  v_offer_provider UUID;
  v_offer_request UUID;
  v_offer_created TIMESTAMPTZ;
  v_request_owner UUID;
BEGIN
  SELECT provider_id, request_id, created_at
    INTO v_offer_provider, v_offer_request, v_offer_created
    FROM public.offers WHERE id = NEW.offer_id;

  IF v_offer_provider IS NULL THEN
    RAISE EXCEPTION 'Nabídka neexistuje.' USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF v_offer_provider <> NEW.provider_id THEN
    RAISE EXCEPTION 'provider_id se neshoduje s nabídkou.';
  END IF;
  IF v_offer_request <> NEW.request_id THEN
    RAISE EXCEPTION 'request_id se neshoduje s nabídkou.';
  END IF;

  SELECT user_id INTO v_request_owner FROM public.requests WHERE id = NEW.request_id;
  IF v_request_owner IS NULL THEN
    RAISE EXCEPTION 'Poptávka neexistuje.';
  END IF;
  IF v_request_owner <> NEW.customer_id THEN
    RAISE EXCEPTION 'customer_id se neshoduje s majitelem poptávky.';
  END IF;

  IF v_offer_created < NOW() - INTERVAL '3 months' THEN
    RAISE EXCEPTION 'Žádost o potvrzení lze poslat max 3 měsíce po vytvoření nabídky.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_job_completion_request ON public.job_completions;
CREATE TRIGGER trg_validate_job_completion_request
  BEFORE INSERT ON public.job_completions
  FOR EACH ROW EXECUTE FUNCTION public.validate_job_completion_request();

-- AFTER INSERT: notifikuj providera
CREATE OR REPLACE FUNCTION public.notify_provider_of_completion_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link, is_read, created_at)
  VALUES (
    NEW.provider_id,
    'job_completion_requested',
    'Zákazník žádá o potvrzení dokončení',
    'Klikněte pro potvrzení nebo zamítnutí.',
    '/poptavka/' || NEW.request_id,
    false,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_provider_of_completion_request ON public.job_completions;
CREATE TRIGGER trg_notify_provider_of_completion_request
  AFTER INSERT ON public.job_completions
  FOR EACH ROW EXECUTE FUNCTION public.notify_provider_of_completion_request();

-- BEFORE UPDATE on status: nastav resolved_at + notifikuj zákazníka
CREATE OR REPLACE FUNCTION public.notify_customer_of_completion_resolution()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('confirmed', 'denied') THEN
    NEW.resolved_at := NOW();
    INSERT INTO public.notifications (user_id, type, title, message, link, is_read, created_at)
    VALUES (
      NEW.customer_id,
      CASE WHEN NEW.status = 'confirmed' THEN 'job_completion_confirmed' ELSE 'job_completion_denied' END,
      CASE WHEN NEW.status = 'confirmed' THEN 'Fachman potvrdil dokončení zakázky' ELSE 'Fachman zamítl potvrzení dokončení' END,
      CASE WHEN NEW.status = 'confirmed' THEN 'Zakázka je teď v systému označená jako dokončená.' ELSE COALESCE('Důvod: ' || NEW.denied_reason, 'Bez uvedení důvodu.') END,
      '/poptavka/' || NEW.request_id,
      false,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_customer_of_completion_resolution ON public.job_completions;
CREATE TRIGGER trg_notify_customer_of_completion_resolution
  BEFORE UPDATE OF status ON public.job_completions
  FOR EACH ROW EXECUTE FUNCTION public.notify_customer_of_completion_resolution();

-- Update customer_review eligibility: nyní vyžaduje confirmed job_completion
CREATE OR REPLACE FUNCTION public.validate_customer_review_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  v_offer_id UUID;
  v_request_owner UUID;
  v_completion_status TEXT;
BEGIN
  -- Provider musí mít confirmed job_completion na ten request
  SELECT status, offer_id INTO v_completion_status, v_offer_id
    FROM public.job_completions
   WHERE request_id = NEW.request_id
     AND provider_id = NEW.provider_id
   LIMIT 1;

  IF v_completion_status IS NULL THEN
    RAISE EXCEPTION 'Hodnotit zákazníka můžete až po tom, co zákazník požádá o potvrzení dokončení a vy ho potvrdíte.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF v_completion_status <> 'confirmed' THEN
    RAISE EXCEPTION 'Dokončení zakázky není potvrzené (status: %).', v_completion_status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Customer_id musí odpovídat majiteli requestu
  SELECT user_id INTO v_request_owner FROM public.requests WHERE id = NEW.request_id;
  IF v_request_owner IS NULL OR v_request_owner <> NEW.customer_id THEN
    RAISE EXCEPTION 'customer_id does not match request owner';
  END IF;

  -- Auto-fill offer_id pokud nezadán
  IF NEW.offer_id IS NULL THEN
    NEW.offer_id := v_offer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE public.job_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_completions_select_parties ON public.job_completions;
CREATE POLICY job_completions_select_parties ON public.job_completions
  FOR SELECT
  USING (
    auth.uid() = customer_id
    OR auth.uid() = provider_id
    OR public.is_fachmani_owner()
  );

DROP POLICY IF EXISTS job_completions_insert_customer ON public.job_completions;
CREATE POLICY job_completions_insert_customer ON public.job_completions
  FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS job_completions_update_provider ON public.job_completions;
CREATE POLICY job_completions_update_provider ON public.job_completions
  FOR UPDATE
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS job_completions_delete_admin ON public.job_completions;
CREATE POLICY job_completions_delete_admin ON public.job_completions
  FOR DELETE
  USING (public.is_fachmani_owner());

COMMENT ON TABLE public.job_completions IS
  'Workflow potvrzení dokončené zakázky. Customer iniciuje (cap 3 měsíce od offer.created_at), provider potvrdí/zamítne. Confirmed → odemyká customer_reviews.';
