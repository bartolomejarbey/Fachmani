-- =============================================================
-- F3 — Lokalita v profilu: struktura tabulek regions a districts
-- Zdroj číselníku: ČSÚ / data.mpsv.cz, CZ-NUTS3 + LAU
-- Idempotentní migrace (IF NOT EXISTS)
-- =============================================================

-- Tabulka krajů (CZ-NUTS3) — 14 řádků
CREATE TABLE IF NOT EXISTS public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_cs text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.regions IS 'Kraje ČR dle CZ-NUTS3';
COMMENT ON COLUMN public.regions.code IS 'CZ-NUTS3 kód (např. CZ010)';

-- Tabulka okresů (LAU) — 76 řádků
CREATE TABLE IF NOT EXISTS public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE,
  name_cs text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.districts IS 'Okresy ČR dle CZ-NUTS LAU';
COMMENT ON COLUMN public.districts.code IS 'LAU kód (např. CZ0201 pro Benešov)';

CREATE INDEX IF NOT EXISTS districts_region_id_idx ON public.districts(region_id);
CREATE INDEX IF NOT EXISTS districts_name_cs_idx ON public.districts(name_cs);

-- Rozšíření profiles o FK na region/district
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_region_id_idx ON public.profiles(region_id);
CREATE INDEX IF NOT EXISTS profiles_district_id_idx ON public.profiles(district_id);

-- RLS — číselníky jsou public read, zápis jen service role (admin přes SQL/Supabase studio)
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "regions_select_all" ON public.regions;
CREATE POLICY "regions_select_all" ON public.regions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "districts_select_all" ON public.districts;
CREATE POLICY "districts_select_all" ON public.districts
  FOR SELECT USING (true);

-- Constraint: district musí patřit zvolenému region_id na profilu.
-- Řešíme triggerem (ne CHECK constraintem, protože check by potřeboval subquery).
CREATE OR REPLACE FUNCTION public.validate_profile_district_belongs_to_region()
RETURNS TRIGGER AS $$
DECLARE
  district_region_id uuid;
BEGIN
  IF NEW.district_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT region_id INTO district_region_id
  FROM public.districts
  WHERE id = NEW.district_id;

  IF NEW.region_id IS NULL THEN
    -- Bez kraje nelze mít okres
    RAISE EXCEPTION 'Okres nelze nastavit bez kraje (region_id je NULL).';
  END IF;

  IF district_region_id IS DISTINCT FROM NEW.region_id THEN
    RAISE EXCEPTION 'Okres (district_id=%) nepatří do zvoleného kraje (region_id=%).',
      NEW.district_id, NEW.region_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_validate_district_region ON public.profiles;
CREATE TRIGGER profiles_validate_district_region
  BEFORE INSERT OR UPDATE OF region_id, district_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_district_belongs_to_region();
