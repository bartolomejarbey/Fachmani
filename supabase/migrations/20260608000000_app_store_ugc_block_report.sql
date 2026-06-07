-- =============================================================
-- App Store 1.2 (UGC) — blokování uživatelů + univerzální hlášení obsahu
-- Apple Guideline 1.2 vyžaduje u aplikací s uživatelským obsahem:
--   • mechanismus pro nahlášení závadného obsahu,
--   • možnost zablokovat zneužívajícího uživatele,
--   • EULA se zákazem závadného obsahu (řešeno ve VOP + souhlas při registraci).
-- Tato migrace přidává `blocked_users` + `content_reports` a trigger, který
-- zabrání zaslání zprávy mezi zablokovanou dvojicí.
-- =============================================================

-- -------------------------------------------------------------
-- 1) BLOKOVÁNÍ UŽIVATELŮ
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blocked_users_unique UNIQUE (blocker_id, blocked_id),
  CONSTRAINT blocked_users_no_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON public.blocked_users (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON public.blocked_users (blocked_id);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Select: uživatel vidí jen koho sám zablokoval (pro UI stav tlačítka).
DROP POLICY IF EXISTS blocked_users_select_own ON public.blocked_users;
CREATE POLICY blocked_users_select_own ON public.blocked_users
  FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id);

-- Insert: uživatel může blokovat jen sám za sebe.
DROP POLICY IF EXISTS blocked_users_insert_own ON public.blocked_users;
CREATE POLICY blocked_users_insert_own ON public.blocked_users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

-- Delete: uživatel může odblokovat jen vlastní blokace.
DROP POLICY IF EXISTS blocked_users_delete_own ON public.blocked_users;
CREATE POLICY blocked_users_delete_own ON public.blocked_users
  FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);

COMMENT ON TABLE public.blocked_users IS
  'App Store 1.2 — uživatel A zablokoval uživatele B (skryje obsah, zakáže zprávy).';

-- -------------------------------------------------------------
-- 2) UNIVERZÁLNÍ HLÁŠENÍ OBSAHU (recenze / zprávy / profily / posty)
--    Feed posty mají vlastní `post_reports`; tato tabulka pokrývá ostatní.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('review', 'message', 'profile', 'post')),
  target_id TEXT NOT NULL,
  target_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'harassment', 'fraud', 'fake', 'other')),
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_reports_unique_per_user UNIQUE (target_type, target_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status_created
  ON public.content_reports (status, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_content_reports_target
  ON public.content_reports (target_type, target_id);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Insert: každý přihlášený může nahlásit (jen sám sebe jako reportera).
DROP POLICY IF EXISTS content_reports_insert_own ON public.content_reports;
CREATE POLICY content_reports_insert_own ON public.content_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Select: reporter vidí svůj report; admin vše.
DROP POLICY IF EXISTS content_reports_select_own_or_admin ON public.content_reports;
CREATE POLICY content_reports_select_own_or_admin ON public.content_reports
  FOR SELECT TO authenticated
  USING (
    auth.uid() = reporter_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid()
         AND p.admin_role IN ('master_admin', 'admin')
    )
  );

-- Update: pouze admin (řešení reportu).
DROP POLICY IF EXISTS content_reports_update_admin ON public.content_reports;
CREATE POLICY content_reports_update_admin ON public.content_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid()
         AND p.admin_role IN ('master_admin', 'admin')
    )
  );

-- Admin queue: agregace pending reportů podle cílového obsahu.
CREATE OR REPLACE VIEW public.v_content_reports_queue AS
  SELECT
    cr.target_type,
    cr.target_id,
    cr.target_owner_id,
    op.full_name AS owner_name,
    op.email AS owner_email,
    COUNT(cr.id) AS report_count,
    MAX(cr.created_at) AS last_report_at,
    ARRAY_AGG(DISTINCT cr.reason) AS reasons,
    SUM(CASE WHEN cr.status = 'pending' THEN 1 ELSE 0 END) AS pending_reports
  FROM public.content_reports cr
  LEFT JOIN public.profiles op ON op.id = cr.target_owner_id
  WHERE cr.status = 'pending'
  GROUP BY cr.target_type, cr.target_id, cr.target_owner_id, op.full_name, op.email
  ORDER BY pending_reports DESC, last_report_at DESC;

GRANT SELECT ON public.v_content_reports_queue TO authenticated;

COMMENT ON TABLE public.content_reports IS
  'App Store 1.2 — hlášení závadného obsahu (recenze/zprávy/profily/posty).';

-- -------------------------------------------------------------
-- 3) ENFORCEMENT — zákaz zpráv mezi zablokovanou dvojicí
--    Additivní BEFORE INSERT trigger (nemění stávající RLS na messages).
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_blocked_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.blocked_users b
     WHERE (b.blocker_id = NEW.receiver_id AND b.blocked_id = NEW.sender_id)
        OR (b.blocker_id = NEW.sender_id AND b.blocked_id = NEW.receiver_id)
  ) THEN
    RAISE EXCEPTION 'BLOCKED: zpráva nelze odeslat — uživatel je zablokován.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_blocked_messages ON public.messages;
CREATE TRIGGER trg_prevent_blocked_messages
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_blocked_messages();
