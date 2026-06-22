-- =============================================================
-- Audit fix (high): requests_update_owner měl jen USING (auth.uid()=user_id) bez
-- WITH CHECK ani sloupcové ochrany → vlastník poptávky mohl přímým UPDATEem:
--   - is_urgent/urgent_paid_at → priorita ZDARMA (obejití 100 Kč / měsíční kvóty)
--   - moderation_status='approved' na flagged poptávce → bypass moderace + spuštění
--     trg_auto_match_on_approval = hromadné notifikace fachmanům (spam amplifikace)
--   - user_id / expires_at libovolně.
--
-- Řešení: BEFORE UPDATE trigger, který pro ne-admina (a ne-service-role) vrací
-- privilegované sloupce na OLD. Priorita (is_urgent) jde nově JEN přes:
--   - service-role (placená cesta /api/wallet/spend) — auth.uid() IS NULL → povoleno
--   - SECURITY DEFINER RPC mark_request_urgent (free kvóta) — nastaví flag app.urgent_grant
-- =============================================================

CREATE OR REPLACE FUNCTION public.lock_request_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- service-role (auth.uid() IS NULL) a admin smí měnit cokoli
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- moderace + identita + expirace: klient nikdy nemění → zamknout
  NEW.moderation_status     := OLD.moderation_status;
  NEW.moderation_flags      := OLD.moderation_flags;
  NEW.moderation_checked_at := OLD.moderation_checked_at;
  NEW.user_id               := OLD.user_id;
  NEW.expires_at            := OLD.expires_at;

  -- priorita: povolit změnu jen když ji uvolnila RPC mark_request_urgent
  IF COALESCE(current_setting('app.urgent_grant', true), '') <> '1' THEN
    NEW.is_urgent      := OLD.is_urgent;
    NEW.urgent_paid_at := OLD.urgent_paid_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_request_privileged ON public.requests;
CREATE TRIGGER trg_lock_request_privileged
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.lock_request_privileged_columns();

-- Server-side priorita s ověřením vlastnictví + měsíční free kvóty (žádné nastavování
-- is_urgent z klienta). Vrací {urgent, charged} nebo {urgent:false, needsPayment:true, price}.
CREATE OR REPLACE FUNCTION public.mark_request_urgent(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_already boolean;
  v_sub text;
  v_count int;
  v_reset timestamptz;
  v_free_limit int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT user_id, COALESCE(is_urgent, false) INTO v_owner, v_already
    FROM public.requests WHERE id = p_request_id;
  IF v_owner IS NULL OR v_owner <> v_uid THEN RAISE EXCEPTION 'not_owner'; END IF;
  IF v_already THEN RETURN jsonb_build_object('urgent', true, 'charged', false); END IF;

  SELECT subscription_type, monthly_urgent_count, monthly_urgent_reset_at
    INTO v_sub, v_count, v_reset FROM public.profiles WHERE id = v_uid;

  -- premium/business → priorita zdarma
  IF v_sub IN ('premium', 'business') THEN
    PERFORM set_config('app.urgent_grant', '1', true);
    UPDATE public.requests SET is_urgent = true, urgent_paid_at = now() WHERE id = p_request_id;
    RETURN jsonb_build_object('urgent', true, 'charged', false);
  END IF;

  -- reset měsíčního čítače
  IF v_reset IS NULL OR v_reset < now() - interval '30 days' THEN
    UPDATE public.profiles SET monthly_urgent_count = 0, monthly_urgent_reset_at = now() WHERE id = v_uid;
    v_count := 0;
  END IF;
  SELECT COALESCE((value->>'urgent_free_per_month')::int, 1) INTO v_free_limit
    FROM public.system_settings WHERE key = 'platform_settings';
  v_free_limit := COALESCE(v_free_limit, 1);

  IF v_count < v_free_limit THEN
    UPDATE public.profiles SET monthly_urgent_count = monthly_urgent_count + 1 WHERE id = v_uid;
    PERFORM set_config('app.urgent_grant', '1', true);
    UPDATE public.requests SET is_urgent = true, urgent_paid_at = now() WHERE id = p_request_id;
    RETURN jsonb_build_object('urgent', true, 'charged', false);
  END IF;

  RETURN jsonb_build_object('urgent', false, 'needsPayment', true, 'price', 100);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_request_urgent(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.mark_request_urgent(uuid) TO authenticated;
