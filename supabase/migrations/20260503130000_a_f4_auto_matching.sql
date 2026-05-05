-- =============================================================
-- A.F4 — Auto-matching poptávek na fachmany
-- Při INSERT poptávky najdi všechny fachmany kteří:
--   - mají kategorii v provider_categories
--   - mají region_id stejný jako customer (z profiles), nebo region_id = NULL = celá ČR
--   - nemají vypnuté notifikace (notify_on_requests)
-- a vlož jim notifikaci typu 'new_candidate_request'.
-- Trigger se spouští AFTER INSERT, jen pokud je moderation_status='approved'.
-- =============================================================

-- 1) Opt-out flag pro fachmany (default ON = chtějí notifikace)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notify_on_requests BOOLEAN NOT NULL DEFAULT true;

-- 2) Trigger funkce — deleguje na helper pro DRY
CREATE OR REPLACE FUNCTION auto_match_request_to_fachmani()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.moderation_status IS NOT NULL AND NEW.moderation_status <> 'approved' THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS NOT NULL AND NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;
  PERFORM auto_match_request_to_fachmani_for(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_match_request ON requests;
CREATE TRIGGER trg_auto_match_request
  AFTER INSERT ON requests
  FOR EACH ROW EXECUTE FUNCTION auto_match_request_to_fachmani();

-- 3) Re-match po schválení (když admin schválí pending poptávku)
CREATE OR REPLACE FUNCTION auto_match_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.moderation_status IS DISTINCT FROM NEW.moderation_status
     AND NEW.moderation_status = 'approved'
     AND OLD.moderation_status <> 'approved' THEN
    -- Volej main matchovací funkci
    PERFORM auto_match_request_to_fachmani_for(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: rematch konkrétní poptávky (refaktor logiky)
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
    SELECT DISTINCT pc.provider_id,
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
      JOIN profiles p ON p.id = pc.provider_id
     WHERE pc.category_id = v_request.category_id
       AND p.role IN ('provider', 'fachman')
       AND p.notify_on_requests = true
       AND (p.region_id IS NULL OR v_customer_region IS NULL OR p.region_id = v_customer_region)
       AND p.id <> v_request.user_id
       -- Nepublikovat duplikát, pokud notifikace pro tuhle poptávku už existuje
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
          WHERE n.user_id = pc.provider_id
            AND n.type = 'new_candidate_request'
            AND n.link = '/poptavka/' || v_request.id
       )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM ins;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_match_on_approval ON requests;
CREATE TRIGGER trg_auto_match_on_approval
  AFTER UPDATE OF moderation_status ON requests
  FOR EACH ROW EXECUTE FUNCTION auto_match_on_approval();

COMMENT ON FUNCTION auto_match_request_to_fachmani IS
  'A.F4 — AFTER INSERT na requests, vloží notifikace všem matchujícím fachmanům.';
COMMENT ON FUNCTION auto_match_request_to_fachmani_for IS
  'A.F4 — Idempotent rematch konkrétní poptávky (volaný po schválení moderace nebo manuálně).';
