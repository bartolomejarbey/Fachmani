-- =============================================================
-- Audit fix (high): offers RLS měl jen WITH CHECK(auth.uid()=provider_id) na INSERT
-- a USING bez WITH CHECK na UPDATE.
--   INSERT: kdokoli (i zákazník, i autor poptávky, i na closed/expired poptávku) mohl
--           přímým insertem vytvořit nabídku → spam, bypass ověření, spuštění notifikací.
--   UPDATE: vlastník poptávky mohl měnit LIBOVOLNÝ sloupec cizí nabídky (price, description,
--           dokonce provider_id → falšování job_completions/recenzí).
-- =============================================================

-- 1) Žádné dvě nabídky téhož fachmana na jednu poptávku.
ALTER TABLE public.offers
  ADD CONSTRAINT offers_unique_request_provider UNIQUE (request_id, provider_id);

-- 2) Validace insertu nabídky (ne-admin/ne-service-role).
CREATE OR REPLACE FUNCTION public.validate_offer_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req_owner uuid;
  v_req_status text;
  v_role text;
BEGIN
  IF v_uid IS NULL OR public.is_admin() THEN RETURN NEW; END IF;  -- service-role / admin

  IF NEW.provider_id <> v_uid THEN
    RAISE EXCEPTION 'offer: provider_id musí být přihlášený uživatel';
  END IF;

  SELECT user_id, status INTO v_req_owner, v_req_status
    FROM public.requests WHERE id = NEW.request_id;
  IF v_req_owner IS NULL THEN
    RAISE EXCEPTION 'offer: poptávka neexistuje';
  END IF;
  IF v_req_status <> 'active' THEN
    RAISE EXCEPTION 'offer: poptávka není aktivní';
  END IF;
  IF v_req_owner = v_uid THEN
    RAISE EXCEPTION 'offer: nelze reagovat na vlastní poptávku';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role <> 'provider' THEN
    RAISE EXCEPTION 'offer: pouze fachman může vytvořit nabídku';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_offer_insert ON public.offers;
CREATE TRIGGER trg_validate_offer_insert
  BEFORE INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.validate_offer_insert();

-- 3) Sloupcová ochrana UPDATE: provider edituje jen vlastní pending nabídku (price/description);
--    vlastník poptávky smí jen status pending→accepted/rejected; nikdo nemění provider_id/request_id.
CREATE OR REPLACE FUNCTION public.lock_offer_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req_owner uuid;
BEGIN
  IF v_uid IS NULL OR public.is_admin() THEN RETURN NEW; END IF;  -- service-role / admin

  -- provider_id a request_id jsou neměnné pro všechny ne-adminy
  NEW.provider_id := OLD.provider_id;
  NEW.request_id  := OLD.request_id;

  SELECT user_id INTO v_req_owner FROM public.requests WHERE id = OLD.request_id;

  IF v_uid = OLD.provider_id THEN
    -- vlastník nabídky: nemění status; obsah jen dokud je pending
    NEW.status := OLD.status;
    IF OLD.status <> 'pending' THEN
      NEW.price := OLD.price;
      NEW.description := OLD.description;
    END IF;
  ELSIF v_uid = v_req_owner THEN
    -- vlastník poptávky: smí JEN status pending→accepted/rejected, nic jiného
    NEW.price := OLD.price;
    NEW.description := OLD.description;
    IF NOT (OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected')) THEN
      NEW.status := OLD.status;
    END IF;
  ELSE
    -- nikdo jiný (RLS by měla zachytit; pro jistotu no-op)
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_offer_columns ON public.offers;
CREATE TRIGGER trg_lock_offer_columns
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.lock_offer_columns();
