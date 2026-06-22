-- =============================================================
-- Audit fixy (medium): admin RLS hardening
--   A) PII tabulky pouštěly KAŽDÝ admin_role (i 'sales') přes `admin_role IS NOT NULL`
--      → Obchodník měl přístup k e-mailům/telefonům/AI promptům. Zúžit na admin/master_admin.
--   B) Profily uměl měnit jen master_admin (profiles_update_master_admin) → běžný admin
--      v /admin/verifikace tiše no-opoval. Přidat profiles_update_admin + privilege-aware
--      trigger (běžný admin smí is_verified/bank_verification, NE admin_role/billing/role).
--   C) Dvě accepted nabídky na jednu poptávku (double-accept) → partial UNIQUE.
-- =============================================================

-- ---------- A) PII tabulky: vyloučit 'sales' ----------
DROP POLICY IF EXISTS "Admins see all usage" ON public.ai_usage;
CREATE POLICY "Admins see all usage" ON public.ai_usage FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.admin_role IN ('master_admin','admin')));

DROP POLICY IF EXISTS "Admin manage campaigns" ON public.newsletter_campaigns;
CREATE POLICY "Admin manage campaigns" ON public.newsletter_campaigns FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.admin_role IN ('master_admin','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.admin_role IN ('master_admin','admin')));

DROP POLICY IF EXISTS newsletter_digest_log_admin_read ON public.newsletter_digest_log;
CREATE POLICY newsletter_digest_log_admin_read ON public.newsletter_digest_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.admin_role IN ('master_admin','admin')));

DROP POLICY IF EXISTS "Admin can read subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Only admins can read subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admin can read subscribers" ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.admin_role IN ('master_admin','admin')));

DROP POLICY IF EXISTS "Admin can update subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admin can update subscribers" ON public.newsletter_subscribers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.admin_role IN ('master_admin','admin')));

DROP POLICY IF EXISTS sms_log_admin_read ON public.sms_log;
CREATE POLICY sms_log_admin_read ON public.sms_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.admin_role IN ('master_admin','admin')));

-- newsletter subscribe: zrušit přímý anon INSERT (WITH CHECK true → kdokoli přihlásí cizí
-- e-mail / spam). Přihlašování pojede přes /api/newsletter/subscribe (service-role + rate-limit).
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;

-- ---------- B) profiles_update_admin + privilege-aware trigger ----------
DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.lock_profile_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_my_admin_role text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;  -- service-role / RPC
  SELECT admin_role INTO v_my_admin_role FROM public.profiles WHERE id = auth.uid();
  IF v_my_admin_role = 'master_admin' THEN RETURN NEW; END IF;

  -- admin_role + billing + role nezměnitelné (ani běžným adminem → no self-escalation,
  -- no free premium, změnu role řeší jen master_admin/server)
  NEW.admin_role := OLD.admin_role;
  NEW.subscription_type := OLD.subscription_type;
  NEW.subscription_expires_at := OLD.subscription_expires_at;
  NEW.cancel_at_period_end := OLD.cancel_at_period_end;
  NEW.role := OLD.role;

  -- běžný admin (admin_role admin) smí ověřovat (is_verified/bank). Ne-admin nesmí ani to.
  IF v_my_admin_role IS DISTINCT FROM 'admin' THEN
    NEW.is_verified := OLD.is_verified;
    NEW.bank_verification_status := OLD.bank_verification_status;
    NEW.bank_verification_verified_at := OLD.bank_verification_verified_at;
    NEW.bank_verification_amount := OLD.bank_verification_amount;
    NEW.bank_verification_reference := OLD.bank_verification_reference;
    NEW.bank_verification_initiated_at := OLD.bank_verification_initiated_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_profile_privileged ON public.profiles;
CREATE TRIGGER trg_lock_profile_privileged
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.lock_profile_privileged_columns();

-- ---------- C) double-accept guard ----------
CREATE UNIQUE INDEX IF NOT EXISTS one_accepted_offer_per_request
  ON public.offers (request_id) WHERE status = 'accepted';
