-- =============================================================
-- S2.F4 — Hodnocení zákazníků fachmany (3-D)
-- Spec: fachman, kterému byla přijata nabídka, hodnotí zákazníka:
--   spolehlivost (reliability)  — váha 0.4
--   komunikace  (communication) — váha 0.3
--   platební morálka (payment)  — váha 0.3
-- Anti-abuse:
--   1) jen provider, který má offers.status='accepted' na request
--   2) max jeden review per (request_id, provider_id) — UNIQUE
--   3) provider != customer
-- Visibility:
--   - viditelné fachmanům na /poptavka/[id] (rozhodnutí zda nabídnout)
--   - viditelné customerovi v jeho dashboardu
-- =============================================================

CREATE TABLE IF NOT EXISTS public.customer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  rating_reliability INT CHECK (rating_reliability BETWEEN 1 AND 5),
  rating_communication INT CHECK (rating_communication BETWEEN 1 AND 5),
  rating_payment INT CHECK (rating_payment BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_reviews_provider_not_customer CHECK (provider_id <> customer_id),
  CONSTRAINT customer_reviews_unique_per_request UNIQUE (request_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_reviews_customer ON public.customer_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_provider ON public.customer_reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_request ON public.customer_reviews(request_id);

-- Trigger: derive overall `rating` from 3 dimenzí (váha 0.4 / 0.3 / 0.3)
CREATE OR REPLACE FUNCTION public.derive_customer_review_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rating_reliability IS NOT NULL
     AND NEW.rating_communication IS NOT NULL
     AND NEW.rating_payment IS NOT NULL THEN
    NEW.rating := GREATEST(1, LEAST(5,
      ROUND(
        NEW.rating_reliability * 0.4
        + NEW.rating_communication * 0.3
        + NEW.rating_payment * 0.3
      )::INT
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_derive_customer_review_rating ON public.customer_reviews;
CREATE TRIGGER trg_derive_customer_review_rating
  BEFORE INSERT OR UPDATE OF rating_reliability, rating_communication, rating_payment
  ON public.customer_reviews
  FOR EACH ROW EXECUTE FUNCTION public.derive_customer_review_rating();

-- Anti-abuse trigger: kontroluje, že provider má accepted offer na ten request
CREATE OR REPLACE FUNCTION public.validate_customer_review_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  v_offer_id UUID;
  v_request_owner UUID;
BEGIN
  -- Provider musí mít accepted offer na ten request
  SELECT id INTO v_offer_id
  FROM public.offers
  WHERE request_id = NEW.request_id
    AND provider_id = NEW.provider_id
    AND status = 'accepted'
  LIMIT 1;

  IF v_offer_id IS NULL THEN
    RAISE EXCEPTION 'Cannot review customer: provider has no accepted offer on this request';
  END IF;

  -- Customer_id se musí shodovat s vlastníkem requestu
  SELECT user_id INTO v_request_owner
  FROM public.requests
  WHERE id = NEW.request_id;

  IF v_request_owner IS NULL OR v_request_owner <> NEW.customer_id THEN
    RAISE EXCEPTION 'customer_id does not match request owner';
  END IF;

  -- Auto-fill offer_id pokud není zadán
  IF NEW.offer_id IS NULL THEN
    NEW.offer_id := v_offer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_customer_review_eligibility ON public.customer_reviews;
CREATE TRIGGER trg_validate_customer_review_eligibility
  BEFORE INSERT ON public.customer_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_customer_review_eligibility();

-- Aggregated view per customer
CREATE OR REPLACE VIEW public.v_customer_rating_stats AS
SELECT
  customer_id,
  COUNT(*)::INT AS review_count,
  ROUND(AVG(rating)::numeric, 1) AS avg_rating,
  ROUND(AVG(rating_reliability)::numeric, 1) AS avg_reliability,
  ROUND(AVG(rating_communication)::numeric, 1) AS avg_communication,
  ROUND(AVG(rating_payment)::numeric, 1) AS avg_payment
FROM public.customer_reviews
WHERE customer_id IS NOT NULL
GROUP BY customer_id;

COMMENT ON VIEW public.v_customer_rating_stats IS
  'S2.F4 — agregát hodnocení zákazníků fachmany (3-D rozpad).';

-- RLS
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_reviews_select_public ON public.customer_reviews;
CREATE POLICY customer_reviews_select_public ON public.customer_reviews
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS customer_reviews_insert_provider ON public.customer_reviews;
CREATE POLICY customer_reviews_insert_provider ON public.customer_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS customer_reviews_update_provider ON public.customer_reviews;
CREATE POLICY customer_reviews_update_provider ON public.customer_reviews
  FOR UPDATE
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS customer_reviews_delete_admin ON public.customer_reviews;
CREATE POLICY customer_reviews_delete_admin ON public.customer_reviews
  FOR DELETE
  USING (public.is_fachmani_owner());

COMMENT ON TABLE public.customer_reviews IS
  'S2.F4 — hodnocení zákazníků fachmany. Anti-abuse: jen provider s accepted offer na ten request, jeden review per (request, provider).';
