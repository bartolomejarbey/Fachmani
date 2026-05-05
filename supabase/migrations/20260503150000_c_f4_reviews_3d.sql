-- =============================================================
-- C.F4 — 3-dimenzionální hodnocení (kvalita / komunikace / cena)
-- Spec: zákazník hodnotí 3 dimenze 1-5★, váha:
--   kvalita 0.4, komunikace 0.3, cena 0.3
-- Overall `rating` se odvozuje triggerem z dimenzí (round na INT 1-5).
-- Backwards compat: existující reviews mají jen `rating` → 3 dimenze NULL,
-- nová UI je nutí vyplnit, ale legacy reviews zobrazujeme jako "jen overall".
-- =============================================================

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS rating_quality INT CHECK (rating_quality BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_communication INT CHECK (rating_communication BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_price INT CHECK (rating_price BETWEEN 1 AND 5);

-- Trigger: pokud jsou všechny 3 dimenze vyplněné, overall `rating` se přepočítá
-- jako vážený průměr (zaokrouhlený na INT). Pokud chybí, ponecháme zákaznicky
-- zadané `rating` (legacy/fallback).
CREATE OR REPLACE FUNCTION derive_review_overall_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rating_quality IS NOT NULL
     AND NEW.rating_communication IS NOT NULL
     AND NEW.rating_price IS NOT NULL THEN
    NEW.rating := GREATEST(1, LEAST(5,
      ROUND(
        NEW.rating_quality * 0.4
        + NEW.rating_communication * 0.3
        + NEW.rating_price * 0.3
      )::INT
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_derive_review_overall_rating ON reviews;
CREATE TRIGGER trg_derive_review_overall_rating
  BEFORE INSERT OR UPDATE OF rating_quality, rating_communication, rating_price ON reviews
  FOR EACH ROW EXECUTE FUNCTION derive_review_overall_rating();

-- Agregovaný view per provider (celkový + 3 dimenze)
CREATE OR REPLACE VIEW v_provider_rating_stats AS
SELECT
  provider_id,
  COUNT(*)::INT AS review_count,
  ROUND(AVG(rating)::numeric, 1) AS avg_rating,
  ROUND(AVG(rating_quality)::numeric, 1) AS avg_quality,
  ROUND(AVG(rating_communication)::numeric, 1) AS avg_communication,
  ROUND(AVG(rating_price)::numeric, 1) AS avg_price,
  COUNT(rating_quality)::INT AS dim_count
FROM reviews
WHERE provider_id IS NOT NULL
GROUP BY provider_id;

COMMENT ON VIEW v_provider_rating_stats IS
  'C.F4 — agregát hodnocení per provider včetně 3-D rozpadu. dim_count = kolik reviews má vyplněné dimenze (zbytek je legacy s pouze overall).';

COMMENT ON COLUMN reviews.rating_quality IS 'C.F4 — kvalita práce 1-5★ (váha 0.4 v overall)';
COMMENT ON COLUMN reviews.rating_communication IS 'C.F4 — komunikace 1-5★ (váha 0.3 v overall)';
COMMENT ON COLUMN reviews.rating_price IS 'C.F4 — cena/poměr cena-výkon 1-5★ (váha 0.3 v overall)';
