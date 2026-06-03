-- =============================================================
-- Admin UPDATE/DELETE policies — doplnění mezer odhalených při
-- předlaunch auditu (2026-06-03).
--
-- Problém: admin UI mutuje přes client-side supabase (anon key) → RLS.
-- Migrace 20260505300000 přidala jen DELETE policies. Chyběly UPDATE
-- policies, takže tyto admin akce TIŠE selhávaly (handlery nekontrolují
-- error z .update()):
--   • Poptávky: změna stavu / moderace / +10 slotů   (requests.UPDATE)
--   • Moderace feedu: skrýt / schválit příspěvek      (posts.UPDATE)
--   • Recenze zákazníků: smazání                       (customer_reviews.DELETE)
--
-- Pattern: public.is_admin() = role in ('admin','master_admin').
-- =============================================================

-- requests — admin moderace a změna stavu poptávek
DROP POLICY IF EXISTS "requests_update_admin" ON public.requests;
CREATE POLICY "requests_update_admin" ON public.requests
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- posts — admin moderace feedu (skrytí / schválení)
DROP POLICY IF EXISTS "posts_update_admin" ON public.posts;
CREATE POLICY "posts_update_admin" ON public.posts
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- customer_reviews — admin správa recenzí zákazníků
DROP POLICY IF EXISTS "customer_reviews_delete_admin" ON public.customer_reviews;
CREATE POLICY "customer_reviews_delete_admin" ON public.customer_reviews
  FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "customer_reviews_update_admin" ON public.customer_reviews;
CREATE POLICY "customer_reviews_update_admin" ON public.customer_reviews
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =============================================================
-- KRITICKÉ: profiles INSERT policy.
-- auth.users trigger handle_new_user byl odstraněn → profil se zakládá
-- v app/auth/callback/route.ts upsertem pod session uživatele. Bez INSERT
-- policy RLS odmítne (42501) → každý NOVÝ registrovaný uživatel po potvrzení
-- e-mailu zůstane BEZ profilu = rozbitý účet. Stávající uživatelé pochází
-- z doby, kdy trigger existoval.
-- =============================================================
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
