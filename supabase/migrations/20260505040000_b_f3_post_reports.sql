-- =============================================================
-- B.F3 — Reporting příspěvků (user reports na feed posts)
-- Uživatel může nahlásit post jako spam / nevhodný obsah / podvod.
-- Více reportů na stejný post (od různých userů) → admin vidí v queue.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'fraud', 'fake', 'other')),
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT post_reports_unique_per_user UNIQUE (post_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reports_status_created
  ON public.post_reports (status, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_post_reports_post_id
  ON public.post_reports (post_id);

-- RLS
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

-- Insert: každý přihlášený uživatel může nahlásit (jen sám sebe jako reportera)
DROP POLICY IF EXISTS post_reports_insert_own ON public.post_reports;
CREATE POLICY post_reports_insert_own ON public.post_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Select: reporter vidí svůj report; admin (master_admin/admin) vše
DROP POLICY IF EXISTS post_reports_select_own_or_admin ON public.post_reports;
CREATE POLICY post_reports_select_own_or_admin ON public.post_reports
  FOR SELECT TO authenticated
  USING (
    auth.uid() = reporter_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid()
         AND p.admin_role IN ('master_admin', 'admin')
    )
  );

-- Update: pouze admin
DROP POLICY IF EXISTS post_reports_update_admin ON public.post_reports;
CREATE POLICY post_reports_update_admin ON public.post_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid()
         AND p.admin_role IN ('master_admin', 'admin')
    )
  );

-- View pro admin queue: post + počet reportů + nejnovější důvod
CREATE OR REPLACE VIEW public.v_post_reports_queue AS
  SELECT
    po.id AS post_id,
    po.content,
    po.image_url,
    po.created_at AS post_created_at,
    po.user_id AS post_user_id,
    pp.full_name AS post_user_name,
    pp.email AS post_user_email,
    COUNT(pr.id) AS report_count,
    MAX(pr.created_at) AS last_report_at,
    ARRAY_AGG(DISTINCT pr.reason) AS reasons,
    SUM(CASE WHEN pr.status = 'pending' THEN 1 ELSE 0 END) AS pending_reports
  FROM public.posts po
  JOIN public.post_reports pr ON pr.post_id = po.id
  LEFT JOIN public.profiles pp ON pp.id = po.user_id
  WHERE pr.status = 'pending'
  GROUP BY po.id, po.content, po.image_url, po.created_at, po.user_id, pp.full_name, pp.email
  ORDER BY pending_reports DESC, last_report_at DESC;

GRANT SELECT ON public.v_post_reports_queue TO authenticated;

COMMENT ON TABLE public.post_reports IS
  'B.F3 — user reports na feed posts (spam/inappropriate/fraud/fake/other).';
