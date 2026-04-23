-- =============================================================
-- F3 — Datová migrace: namapování volného textu profiles.location
--      a provider_profiles.locations[] na districts/regions.
-- Fuzzy matching: similarity() přes pg_trgm proti unaccent(name_cs).
-- Reversible: původní hodnota zůstává v profiles.location_legacy.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Zachovej původní hodnotu (reversibilita migrace)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_legacy text;

-- Zkopíruj aktuální location → location_legacy (jen pokud legacy je NULL, abychom to neminuli při re-runu)
UPDATE public.profiles
SET location_legacy = location
WHERE location IS NOT NULL
  AND location_legacy IS NULL;

-- Pomocná funkce: normalizace (lower + unaccent + trim)
CREATE OR REPLACE FUNCTION public.normalize_cz_text(t text)
RETURNS text AS $$
  SELECT lower(unaccent(trim(coalesce(t, ''))))
$$ LANGUAGE sql IMMUTABLE;

-- Fuzzy matching proti okresům.
-- Threshold 0.55 — dostatečně přísné, aby "Praha" zmatchovalo "Hlavní město Praha",
-- ale ne "Praha" → "Prachatice" (similarity 0.2~).
-- Při shodě beze sporů nastavíme region_id+district_id; jinak zkusíme jen kraj.
WITH
  -- Normalizované vstupy: první neprázdná část z location (do první čárky/středníku)
  candidates AS (
    SELECT
      p.id AS profile_id,
      p.location_legacy AS raw,
      public.normalize_cz_text(
        split_part(
          regexp_replace(p.location_legacy, '[,;/]', ',', 'g'),
          ',', 1
        )
      ) AS norm
    FROM public.profiles p
    WHERE p.location_legacy IS NOT NULL
      AND p.location_legacy <> ''
      AND p.district_id IS NULL  -- nepřepisuj již namapované
  ),
  -- Best district match (similarity ≥ 0.55)
  district_match AS (
    SELECT DISTINCT ON (c.profile_id)
      c.profile_id,
      d.id AS district_id,
      d.region_id,
      similarity(public.normalize_cz_text(d.name_cs), c.norm) AS sim
    FROM candidates c
    JOIN public.districts d
      ON similarity(public.normalize_cz_text(d.name_cs), c.norm) > 0.55
    ORDER BY c.profile_id, similarity(public.normalize_cz_text(d.name_cs), c.norm) DESC
  ),
  -- Fallback: match jen proti krajům (když žádný okres neprošel threshold)
  region_fallback AS (
    SELECT DISTINCT ON (c.profile_id)
      c.profile_id,
      r.id AS region_id,
      similarity(public.normalize_cz_text(r.name_cs), c.norm) AS sim
    FROM candidates c
    LEFT JOIN district_match dm ON dm.profile_id = c.profile_id
    JOIN public.regions r
      ON similarity(public.normalize_cz_text(r.name_cs), c.norm) > 0.45
    WHERE dm.profile_id IS NULL
    ORDER BY c.profile_id, similarity(public.normalize_cz_text(r.name_cs), c.norm) DESC
  )
UPDATE public.profiles p
SET
  region_id = COALESCE(dm.region_id, rf.region_id, p.region_id),
  district_id = COALESCE(dm.district_id, p.district_id)
FROM candidates c
LEFT JOIN district_match dm ON dm.profile_id = c.profile_id
LEFT JOIN region_fallback rf ON rf.profile_id = c.profile_id
WHERE p.id = c.profile_id
  AND (dm.region_id IS NOT NULL OR rf.region_id IS NOT NULL);

-- Report: kolik profilů namapováno, kolik nenamapováno, TOP 20 nenamapovaných raw hodnot
DO $$
DECLARE
  total_with_legacy int;
  mapped_region int;
  mapped_district int;
  unmapped int;
  top_unmapped text;
BEGIN
  SELECT count(*) INTO total_with_legacy
  FROM public.profiles
  WHERE location_legacy IS NOT NULL AND location_legacy <> '';

  SELECT count(*) INTO mapped_region
  FROM public.profiles
  WHERE location_legacy IS NOT NULL AND region_id IS NOT NULL;

  SELECT count(*) INTO mapped_district
  FROM public.profiles
  WHERE location_legacy IS NOT NULL AND district_id IS NOT NULL;

  SELECT count(*) INTO unmapped
  FROM public.profiles
  WHERE location_legacy IS NOT NULL AND location_legacy <> '' AND region_id IS NULL;

  SELECT string_agg(l, ' | ' ORDER BY c DESC)
  INTO top_unmapped
  FROM (
    SELECT location_legacy AS l, count(*) AS c
    FROM public.profiles
    WHERE location_legacy IS NOT NULL AND location_legacy <> '' AND region_id IS NULL
    GROUP BY location_legacy
    ORDER BY count(*) DESC
    LIMIT 20
  ) s;

  RAISE NOTICE 'F3 data migrace — total_with_legacy=%, mapped_region=%, mapped_district=%, unmapped=%',
    total_with_legacy, mapped_region, mapped_district, unmapped;
  IF unmapped > 0 THEN
    RAISE NOTICE 'TOP 20 nenamapovaných hodnot: %', coalesce(top_unmapped, '(žádné)');
  END IF;
END $$;
