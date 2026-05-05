-- =============================================================
-- Admin DELETE policies — pokrytí všech tabulek používaných admin UI
-- Důvod: RLS bez DELETE policy = deny. handleDelete v adminu tiše selhával.
-- Pattern: public.is_admin() bere admin_role z profiles.
-- =============================================================

-- requests
DROP POLICY IF EXISTS "requests_delete_admin" ON public.requests;
CREATE POLICY "requests_delete_admin" ON public.requests
  FOR DELETE USING (public.is_admin());

-- offers
DROP POLICY IF EXISTS "offers_delete_admin" ON public.offers;
CREATE POLICY "offers_delete_admin" ON public.offers
  FOR DELETE USING (public.is_admin());

-- posts (admin moderation)
DROP POLICY IF EXISTS "posts_delete_admin" ON public.posts;
CREATE POLICY "posts_delete_admin" ON public.posts
  FOR DELETE USING (public.is_admin());

-- reviews (provider rating)
DROP POLICY IF EXISTS "reviews_delete_admin" ON public.reviews;
CREATE POLICY "reviews_delete_admin" ON public.reviews
  FOR DELETE USING (public.is_admin());

-- post_reports
DROP POLICY IF EXISTS "post_reports_delete_admin" ON public.post_reports;
CREATE POLICY "post_reports_delete_admin" ON public.post_reports
  FOR DELETE USING (public.is_admin());

-- notifications (admin cleanup)
DROP POLICY IF EXISTS "notifications_delete_admin" ON public.notifications;
CREATE POLICY "notifications_delete_admin" ON public.notifications
  FOR DELETE USING (public.is_admin());

-- ghost_leads
DROP POLICY IF EXISTS "ghost_leads_delete_admin" ON public.ghost_leads;
CREATE POLICY "ghost_leads_delete_admin" ON public.ghost_leads
  FOR DELETE USING (public.is_admin());

-- newsletter_subscribers
DROP POLICY IF EXISTS "newsletter_subscribers_delete_admin" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_delete_admin" ON public.newsletter_subscribers
  FOR DELETE USING (public.is_admin());

-- newsletter_campaigns
DROP POLICY IF EXISTS "newsletter_campaigns_delete_admin" ON public.newsletter_campaigns;
CREATE POLICY "newsletter_campaigns_delete_admin" ON public.newsletter_campaigns
  FOR DELETE USING (public.is_admin());

-- =============================================================
-- ON DELETE CASCADE pro děti requests (offers + notifications),
-- aby admin smazání poptávky neselhalo na FK constraintech.
-- =============================================================

-- offers FK na requests
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'offers'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'offers_request_id_fkey'
  ) THEN
    ALTER TABLE public.offers DROP CONSTRAINT offers_request_id_fkey;
  END IF;
  ALTER TABLE public.offers
    ADD CONSTRAINT offers_request_id_fkey
    FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;
