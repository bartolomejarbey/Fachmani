-- BEZPEČNOST: report queue views obcházely RLS (běžely s právy ownera) → kterýkoli
-- přihlášený uživatel mohl přes PostgREST číst e-maily nahlášených uživatelů a agregáty
-- všech reportů. Oprava: security_invoker=true → view ctí RLS volajícího (own-or-admin).
-- Aplikováno na produkci 2026-06-08.

CREATE OR REPLACE VIEW public.v_content_reports_queue
WITH (security_invoker = true) AS
  SELECT cr.target_type, cr.target_id, cr.target_owner_id,
    op.full_name AS owner_name, op.email AS owner_email,
    COUNT(cr.id) AS report_count, MAX(cr.created_at) AS last_report_at,
    ARRAY_AGG(DISTINCT cr.reason) AS reasons,
    SUM(CASE WHEN cr.status = 'pending' THEN 1 ELSE 0 END) AS pending_reports
  FROM public.content_reports cr
  LEFT JOIN public.profiles op ON op.id = cr.target_owner_id
  WHERE cr.status = 'pending'
  GROUP BY cr.target_type, cr.target_id, cr.target_owner_id, op.full_name, op.email
  ORDER BY pending_reports DESC, last_report_at DESC;

CREATE OR REPLACE VIEW public.v_post_reports_queue
WITH (security_invoker = true) AS
  SELECT po.id AS post_id, po.content, po.image_url, po.created_at AS post_created_at,
    po.user_id AS post_user_id, pp.full_name AS post_user_name, pp.email AS post_user_email,
    COUNT(pr.id) AS report_count, MAX(pr.created_at) AS last_report_at,
    ARRAY_AGG(DISTINCT pr.reason) AS reasons,
    SUM(CASE WHEN pr.status = 'pending' THEN 1 ELSE 0 END) AS pending_reports
  FROM public.posts po
  JOIN public.post_reports pr ON pr.post_id = po.id
  LEFT JOIN public.profiles pp ON pp.id = po.user_id
  WHERE pr.status = 'pending'
  GROUP BY po.id, po.content, po.image_url, po.created_at, po.user_id, pp.full_name, pp.email
  ORDER BY pending_reports DESC, last_report_at DESC;
