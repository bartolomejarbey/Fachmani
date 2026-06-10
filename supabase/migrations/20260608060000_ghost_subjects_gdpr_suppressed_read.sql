-- GDPR: ghost_subjects_public_read nevylučovalo gdpr_suppressed → subjekty s uplatněnou
-- námitkou (čl. 21) byly stále veřejně čitelné. Doplněn filtr. Aplikováno na prod.
DROP POLICY IF EXISTS ghost_subjects_public_read ON public.ghost_subjects;
CREATE POLICY ghost_subjects_public_read ON public.ghost_subjects
  FOR SELECT
  USING (is_active = true AND claimed_at IS NULL AND gdpr_suppressed IS NOT TRUE);
