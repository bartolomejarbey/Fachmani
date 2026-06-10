-- KRITICKÉ (privilege escalation + únik tržeb): legacy policy "Uživatel může upravit
-- svůj profil" (USING auth.uid()=id, bez WITH CHECK) umožňovala přepsat libovolný sloupec
-- vlastního profilu — vč. admin_role (eskalace na master_admin) a subscription_type (Premium
-- zdarma). OR-semantika RLS ji nadřazovala restrikcím v profiles_update_own. Aplikováno na prod.
DROP POLICY IF EXISTS "Uživatel může upravit svůj profil" ON public.profiles;

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      (admin_role IS NOT DISTINCT FROM (SELECT admin_role FROM public.profiles WHERE id = auth.uid()))
      OR ((SELECT admin_role FROM public.profiles WHERE id = auth.uid()) = 'master_admin')
    )
    AND (subscription_type IS NOT DISTINCT FROM (SELECT subscription_type FROM public.profiles WHERE id = auth.uid()))
    AND (subscription_expires_at IS NOT DISTINCT FROM (SELECT subscription_expires_at FROM public.profiles WHERE id = auth.uid()))
    AND (cancel_at_period_end IS NOT DISTINCT FROM (SELECT cancel_at_period_end FROM public.profiles WHERE id = auth.uid()))
  );
