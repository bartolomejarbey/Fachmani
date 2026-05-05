-- =============================================================
-- Fix: auto_match_request_to_fachmani_for spojoval pc.provider_id = profiles.id,
-- ale provider_categories.provider_id odkazuje na provider_profiles.id, NE
-- na auth user id v profiles. Proto JOIN nikdy nematchnul a notifikace pro
-- nové poptávky se nikdy nevytvořily.
--
-- Správný řetězec: provider_categories.provider_id → provider_profiles.id
--                  provider_profiles.user_id → profiles.id (auth user)
-- notifications.user_id musí být auth user (profiles.id), ne provider_profiles.id,
-- jinak NotificationBell ani auto-match-emails cron nikoho nenajde.
-- =============================================================

CREATE OR REPLACE FUNCTION auto_match_request_to_fachmani_for(p_request_id UUID)
RETURNS INT AS $$
DECLARE
  v_count INT;
  v_request RECORD;
  v_customer_region UUID;
BEGIN
  SELECT * INTO v_request FROM requests WHERE id = p_request_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF v_request.category_id IS NULL THEN RETURN 0; END IF;

  SELECT region_id INTO v_customer_region FROM profiles WHERE id = v_request.user_id;

  WITH ins AS (
    INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
    SELECT DISTINCT pp.user_id,
           'new_candidate_request',
           'Nová poptávka pro vás',
           CASE
             WHEN length(v_request.title) > 80 THEN substring(v_request.title, 1, 77) || '...'
             ELSE v_request.title
           END,
           '/poptavka/' || v_request.id,
           false,
           NOW()
      FROM provider_categories pc
      JOIN provider_profiles pp ON pp.id = pc.provider_id
      JOIN profiles p ON p.id = pp.user_id
     WHERE pc.category_id = v_request.category_id
       AND p.role IN ('provider', 'fachman')
       AND p.notify_on_requests = true
       AND (p.region_id IS NULL OR v_customer_region IS NULL OR p.region_id = v_customer_region)
       AND p.id <> v_request.user_id
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
          WHERE n.user_id = pp.user_id
            AND n.type = 'new_candidate_request'
            AND n.link = '/poptavka/' || v_request.id
       )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM ins;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_match_request_to_fachmani_for IS
  'Idempotent rematch konkrétní poptávky. provider_id pivot opraven přes provider_profiles.';
