-- =============================================================
-- B.F1 — "Fachmaniq" detection: poptávky bez reakce
-- Spec: identifikuj poptávky, které sedí v systému > 24h a nikdo
-- z fachmanů na ně nereagoval (žádné offers nebo všechny cancelled).
-- Admin pak může ručně rozeslat extra notifikace nebo zákazníkovi pomoct.
-- =============================================================

CREATE OR REPLACE VIEW v_admin_stalled_requests AS
SELECT
  r.id,
  r.title,
  r.description,
  r.budget_min,
  r.budget_max,
  r.location,
  r.created_at,
  r.expires_at,
  r.user_id,
  p.full_name AS customer_name,
  p.email AS customer_email,
  c.name AS category_name,
  EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600 AS hours_since_created,
  (
    SELECT COUNT(*) FROM offers o
     WHERE o.request_id = r.id
       AND COALESCE(o.status, 'pending') <> 'cancelled'
  )::INT AS offers_count,
  (
    SELECT COUNT(*) FROM notifications n
     WHERE n.type = 'new_candidate_request'
       AND n.link = '/poptavka/' || r.id
  )::INT AS matched_fachmani_count
FROM requests r
LEFT JOIN profiles p ON p.id = r.user_id
LEFT JOIN categories c ON c.id = r.category_id
WHERE r.status = 'active'
  AND COALESCE(r.moderation_status, 'approved') = 'approved'
  AND r.created_at < NOW() - INTERVAL '24 hours'
  AND (r.expires_at IS NULL OR r.expires_at > NOW())
  AND NOT EXISTS (
    SELECT 1 FROM offers o
     WHERE o.request_id = r.id
       AND COALESCE(o.status, 'pending') <> 'cancelled'
  );

COMMENT ON VIEW v_admin_stalled_requests IS
  'B.F1 — aktivní + schválené poptávky starší než 24h bez aktivní offer. Admin akce: rozeslat extra notifikace, kontaktovat zákazníka.';

-- Helper pro admin akci: rematch poptávky (= znovu rozeslat notifikace všem matchujícím fachmanům).
-- Idempotent — A.F4 helper už umí preventovat duplicitní notifikace, takže toto jen rozšíří
-- na kohokoliv, kdo se mezitím přidal do kategorie/regionu.
CREATE OR REPLACE FUNCTION admin_rematch_request(p_request_id UUID)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  v_count := auto_match_request_to_fachmani_for(p_request_id);
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_rematch_request IS
  'B.F1 — admin tlačítko pro re-match stalled poptávky. Vrací kolik nových notifikací bylo vytvořeno.';
