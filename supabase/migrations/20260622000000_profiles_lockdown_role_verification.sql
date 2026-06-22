-- =============================================================
-- Audit fix (high): profiles_update_own neuzamykal role / is_verified /
-- bank_verification_*. Přihlášený přes anon JWT si tak mohl přímým PostgREST
-- UPDATEem nastavit role:'provider', is_verified:true, bank_verification_status:'verified'
-- a padělat ověřeného fachmana bez ARES/bankovní kontroly.
--
-- Legitimní zápis těchto sloupců jde JEN přes:
--   - service-role (admin akce, ARES verify)
--   - SECURITY DEFINER RPC initiate_bank_verification (bypassuje RLS)
--   - master_admin (samostatná policy profiles_update_master_admin)
-- → uzamčení v profiles_update_own žádný legitimní klientský tok nerozbije.
-- =============================================================

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- admin_role: nezměnitelné (kromě master_admina, viz původní lockdown)
    AND (
      NOT (admin_role IS DISTINCT FROM (SELECT p.admin_role FROM public.profiles p WHERE p.id = auth.uid()))
      OR (SELECT p.admin_role FROM public.profiles p WHERE p.id = auth.uid()) = 'master_admin'
    )
    -- billing: nezměnitelné svépomocí
    AND NOT (subscription_type IS DISTINCT FROM (SELECT p.subscription_type FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (subscription_expires_at IS DISTINCT FROM (SELECT p.subscription_expires_at FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (cancel_at_period_end IS DISTINCT FROM (SELECT p.cancel_at_period_end FROM public.profiles p WHERE p.id = auth.uid()))
    -- NOVĚ: role a ověření identity — nezměnitelné svépomocí
    AND NOT (role IS DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (is_verified IS DISTINCT FROM (SELECT p.is_verified FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (bank_verification_status IS DISTINCT FROM (SELECT p.bank_verification_status FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (bank_verification_verified_at IS DISTINCT FROM (SELECT p.bank_verification_verified_at FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (bank_verification_amount IS DISTINCT FROM (SELECT p.bank_verification_amount FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (bank_verification_reference IS DISTINCT FROM (SELECT p.bank_verification_reference FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (bank_verification_initiated_at IS DISTINCT FROM (SELECT p.bank_verification_initiated_at FROM public.profiles p WHERE p.id = auth.uid()))
  );

COMMENT ON POLICY profiles_update_own ON public.profiles IS
  'Self-update profilu; admin_role/billing/role/is_verified/bank_verification_* nezměnitelné svépomocí (jen service-role/RPC/master_admin).';
