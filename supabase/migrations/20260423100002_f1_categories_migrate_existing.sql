-- =============================================================
-- F1 — Datová migrace: namapuj existující ploché kategorie
-- pod nové hlavní kategorie dle name/slug patternů.
-- Reference v profiles/demands/offers/provider_categories
-- (přes category_id) zůstávají beze změny — měníme jen parent_id
-- u samotných categories.
-- Nenamapované zůstávají s parent_id = NULL (stanou se hlavními
-- kategoriemi) — admin je může v UI přesunout ručně.
-- =============================================================

DO $$
DECLARE
  stavebnictvi_id uuid;
  elektro_id uuid;
  truhlarstvi_id uuid;
  zamecnictvi_id uuid;
  zahrada_id uuid;
  uklid_id uuid;
  doprava_id uuid;
  auto_id uuid;
  it_id uuid;
  design_id uuid;
  krasa_id uuid;
  poradenstvi_id uuid;
  ostatni_id uuid;
BEGIN
  SELECT id INTO stavebnictvi_id FROM public.categories WHERE slug = 'stavebnictvi';
  SELECT id INTO elektro_id      FROM public.categories WHERE slug = 'elektro-voda-topeni';
  SELECT id INTO truhlarstvi_id  FROM public.categories WHERE slug = 'truhlarstvi';
  SELECT id INTO zamecnictvi_id  FROM public.categories WHERE slug = 'zamecnictvi';
  SELECT id INTO zahrada_id      FROM public.categories WHERE slug = 'zahrada';
  SELECT id INTO uklid_id        FROM public.categories WHERE slug = 'uklid';
  SELECT id INTO doprava_id      FROM public.categories WHERE slug = 'doprava';
  SELECT id INTO auto_id         FROM public.categories WHERE slug = 'auto-moto';
  SELECT id INTO it_id           FROM public.categories WHERE slug = 'it-technika';
  SELECT id INTO design_id       FROM public.categories WHERE slug = 'design-kreativa';
  SELECT id INTO krasa_id        FROM public.categories WHERE slug = 'krasa-pece';
  SELECT id INTO poradenstvi_id  FROM public.categories WHERE slug = 'poradenstvi';
  SELECT id INTO ostatni_id      FROM public.categories WHERE slug = 'ostatni';

  -- Jediné bezpečné: mapujeme jen existující kategorie, které
  -- NEJSOU hlavními (parent_id IS NULL) a nepatří k 13 novým slugům.

  -- Stavebnictví
  UPDATE public.categories SET parent_id = stavebnictvi_id
  WHERE parent_id IS NULL AND id <> stavebnictvi_id
    AND id NOT IN (elektro_id, truhlarstvi_id, zamecnictvi_id, zahrada_id, uklid_id,
                   doprava_id, auto_id, it_id, design_id, krasa_id, poradenstvi_id, ostatni_id)
    AND (
      name ILIKE '%zedn%' OR name ILIKE '%tesar%' OR name ILIKE '%pokryv%'
      OR name ILIKE '%klempí%' OR name ILIKE '%obkladač%' OR name ILIKE '%obklad%'
      OR name ILIKE '%dlažb%' OR name ILIKE '%sádrokarton%' OR name ILIKE '%podlahá%'
      OR name ILIKE '%malíř%' OR name ILIKE '%natěrač%' OR name ILIKE '%omítk%'
      OR name ILIKE '%izolace%' OR name ILIKE '%fasád%' OR name ILIKE '%bourací%'
      OR name ILIKE '%zemní%' OR name ILIKE '%stavb%' OR name ILIKE '%rekonstrukce%'
      OR name ILIKE '%stavitel%' OR name ILIKE '%štukatér%' OR name ILIKE '%beton%'
      OR slug ILIKE '%stavb%' OR slug ILIKE '%zedn%' OR slug ILIKE '%tesar%'
    );

  -- Elektro, voda, topení
  UPDATE public.categories SET parent_id = elektro_id
  WHERE parent_id IS NULL AND id <> elektro_id
    AND id NOT IN (stavebnictvi_id, truhlarstvi_id, zamecnictvi_id, zahrada_id, uklid_id,
                   doprava_id, auto_id, it_id, design_id, krasa_id, poradenstvi_id, ostatni_id)
    AND (
      name ILIKE '%elektri%' OR name ILIKE '%elektro%' OR name ILIKE '%instalatér%'
      OR name ILIKE '%voda%' OR name ILIKE '%topen%' OR name ILIKE '%plyn%'
      OR name ILIKE '%vzduchotech%' OR name ILIKE '%klimatiz%' OR name ILIKE '%fotovolta%'
      OR name ILIKE '%solár%' OR name ILIKE '%tepelné čerpadlo%' OR name ILIKE '%kotel%'
      OR slug ILIKE '%elektr%' OR slug ILIKE '%instal%' OR slug ILIKE '%topen%'
    );

  -- Truhlářství a nábytek
  UPDATE public.categories SET parent_id = truhlarstvi_id
  WHERE parent_id IS NULL AND id <> truhlarstvi_id
    AND id NOT IN (stavebnictvi_id, elektro_id, zamecnictvi_id, zahrada_id, uklid_id,
                   doprava_id, auto_id, it_id, design_id, krasa_id, poradenstvi_id, ostatni_id)
    AND (
      name ILIKE '%truhlář%' OR name ILIKE '%nábytek%' OR name ILIKE '%kuchyň%'
      OR name ILIKE '%vestav%' OR name ILIKE '%skříň%' OR name ILIKE '%dveř%'
      OR name ILIKE '%okn%' OR name ILIKE '%čalou%'
      OR slug ILIKE '%truhl%' OR slug ILIKE '%nabytek%'
    );

  -- Zámečnictví a kovovýroba
  UPDATE public.categories SET parent_id = zamecnictvi_id
  WHERE parent_id IS NULL AND id <> zamecnictvi_id
    AND id NOT IN (stavebnictvi_id, elektro_id, truhlarstvi_id, zahrada_id, uklid_id,
                   doprava_id, auto_id, it_id, design_id, krasa_id, poradenstvi_id, ostatni_id)
    AND (
      name ILIKE '%zámeč%' OR name ILIKE '%svář%' OR name ILIKE '%svařov%'
      OR name ILIKE '%kovovýrob%' OR name ILIKE '%plot%' OR name ILIKE '%brán%'
      OR name ILIKE '%mříž%' OR name ILIKE '%kovář%'
      OR slug ILIKE '%zamec%' OR slug ILIKE '%kovo%'
    );

  -- Zahrada a exteriér
  UPDATE public.categories SET parent_id = zahrada_id
  WHERE parent_id IS NULL AND id <> zahrada_id
    AND id NOT IN (stavebnictvi_id, elektro_id, truhlarstvi_id, zamecnictvi_id, uklid_id,
                   doprava_id, auto_id, it_id, design_id, krasa_id, poradenstvi_id, ostatni_id)
    AND (
      name ILIKE '%zahrad%' OR name ILIKE '%sekání%' OR name ILIKE '%trávník%'
      OR name ILIKE '%kácení%' OR name ILIKE '%arboristik%' OR name ILIKE '%stromořez%'
      OR name ILIKE '%zámková%' OR name ILIKE '%bazén%' OR name ILIKE '%závlah%'
      OR name ILIKE '%jezírk%'
      OR slug ILIKE '%zahrad%' OR slug ILIKE '%trav%'
    );

  -- Úklid a údržba
  UPDATE public.categories SET parent_id = uklid_id
  WHERE parent_id IS NULL AND id <> uklid_id
    AND id NOT IN (stavebnictvi_id, elektro_id, truhlarstvi_id, zamecnictvi_id, zahrada_id,
                   doprava_id, auto_id, it_id, design_id, krasa_id, poradenstvi_id, ostatni_id)
    AND (
      name ILIKE '%úklid%' OR name ILIKE '%uklid%' OR name ILIKE '%mytí%'
      OR name ILIKE '%čištění%' OR name ILIKE '%deratiz%' OR name ILIKE '%dezinsek%'
      OR name ILIKE '%kominí%' OR name ILIKE '%výškov%'
      OR slug ILIKE '%uklid%'
    );

  -- Doprava a stěhování
  UPDATE public.categories SET parent_id = doprava_id
  WHERE parent_id IS NULL AND id <> doprava_id
    AND id NOT IN (stavebnictvi_id, elektro_id, truhlarstvi_id, zamecnictvi_id, zahrada_id,
                   uklid_id, auto_id, it_id, design_id, krasa_id, poradenstvi_id, ostatni_id)
    AND (
      name ILIKE '%stěhov%' OR name ILIKE '%doprav%' OR name ILIKE '%autodop%'
      OR name ILIKE '%kontejner%' OR name ILIKE '%odvoz%' OR name ILIKE '%suti%'
      OR name ILIKE '%kurýr%'
      OR slug ILIKE '%stehov%' OR slug ILIKE '%doprav%'
    );

  -- Auto-moto
  UPDATE public.categories SET parent_id = auto_id
  WHERE parent_id IS NULL AND id <> auto_id
    AND id NOT IN (stavebnictvi_id, elektro_id, truhlarstvi_id, zamecnictvi_id, zahrada_id,
                   uklid_id, doprava_id, it_id, design_id, krasa_id, poradenstvi_id, ostatni_id)
    AND (
      name ILIKE '%autoservis%' OR name ILIKE '%pneuservis%' OR name ILIKE '%autoelektr%'
      OR name ILIKE '%autoklempíř%' OR name ILIKE '%lakování%' OR name ILIKE '%diagnostik%'
      OR name ILIKE '%moto servis%' OR (name ILIKE '%auto%' AND name NOT ILIKE '%autodop%')
      OR slug ILIKE '%auto%'
    );

  -- IT a technika
  UPDATE public.categories SET parent_id = it_id
  WHERE parent_id IS NULL AND id <> it_id
    AND id NOT IN (stavebnictvi_id, elektro_id, truhlarstvi_id, zamecnictvi_id, zahrada_id,
                   uklid_id, doprava_id, auto_id, design_id, krasa_id, poradenstvi_id, ostatni_id)
    AND (
      name ILIKE '%IT%' OR name ILIKE '%počítač%' OR name ILIKE '%pc %' OR name ILIKE '%mobil%'
      OR name ILIKE '%notebook%' OR name ILIKE '%tablet%' OR name ILIKE '%chytrá domácnost%'
      OR name ILIKE '%zabezpeč%' OR name ILIKE '%kamer%' OR name ILIKE '%alarm%'
      OR name ILIKE '%spotřebič%' OR name ILIKE '%software%' OR name ILIKE '%web%'
      OR slug ILIKE 'it-%' OR slug ILIKE '%pocita%' OR slug ILIKE '%mobil%'
    );

  -- Design a kreativa
  UPDATE public.categories SET parent_id = design_id
  WHERE parent_id IS NULL AND id <> design_id
    AND id NOT IN (stavebnictvi_id, elektro_id, truhlarstvi_id, zamecnictvi_id, zahrada_id,
                   uklid_id, doprava_id, auto_id, it_id, krasa_id, poradenstvi_id, ostatni_id)
    AND (
      name ILIKE '%design%' OR name ILIKE '%grafik%' OR name ILIKE '%fotograf%'
      OR name ILIKE '%video%' OR name ILIKE '%architekt%' OR name ILIKE '%interiér%'
      OR slug ILIKE '%design%' OR slug ILIKE '%foto%'
    );

  -- Krása a péče
  UPDATE public.categories SET parent_id = krasa_id
  WHERE parent_id IS NULL AND id <> krasa_id
    AND id NOT IN (stavebnictvi_id, elektro_id, truhlarstvi_id, zamecnictvi_id, zahrada_id,
                   uklid_id, doprava_id, auto_id, it_id, design_id, poradenstvi_id, ostatni_id)
    AND (
      name ILIKE '%kadeř%' OR name ILIKE '%kosmet%' OR name ILIKE '%manikú%'
      OR name ILIKE '%pedikú%' OR name ILIKE '%masáž%' OR name ILIKE '%fitness%'
      OR name ILIKE '%trenér%' OR name ILIKE '%lymfodren%'
      OR slug ILIKE '%kadern%' OR slug ILIKE '%kosmet%' OR slug ILIKE '%masaz%'
    );

  -- Poradenství a vzdělávání
  UPDATE public.categories SET parent_id = poradenstvi_id
  WHERE parent_id IS NULL AND id <> poradenstvi_id
    AND id NOT IN (stavebnictvi_id, elektro_id, truhlarstvi_id, zamecnictvi_id, zahrada_id,
                   uklid_id, doprava_id, auto_id, it_id, design_id, krasa_id, ostatni_id)
    AND (
      name ILIKE '%doučov%' OR name ILIKE '%jazyk%' OR name ILIKE '%lekce%'
      OR name ILIKE '%učitel%' OR name ILIKE '%účetn%' OR name ILIKE '%daňov%'
      OR name ILIKE '%právn%' OR name ILIKE '%poradce%' OR name ILIKE '%poradenství%'
      OR name ILIKE '%kouč%' OR name ILIKE '%mentor%'
      OR slug ILIKE '%poradenstvi%' OR slug ILIKE '%ucetn%'
    );

  -- Vše ostatní nenamapované necháme s parent_id = NULL.
  -- Volitelně bychom mohli automaticky přesunout pod Ostatní, ale raději
  -- necháme admina explicitně přeřadit (lepší viditelnost orphanů).

  -- Report
  RAISE NOTICE 'F1 mapování existujících kategorií dokončeno. Zkontrolujte kategorie s parent_id IS NULL mimo 13 hlavních slugů — to jsou orphani k ručnímu přeřazení.';
END $$;

-- Pomocné views pro snadnou kontrolu (idempotentní CREATE OR REPLACE)
CREATE OR REPLACE VIEW public.categories_orphans AS
SELECT c.id, c.slug, c.name, c.icon
FROM public.categories c
WHERE c.parent_id IS NULL
  AND c.slug NOT IN (
    'stavebnictvi','elektro-voda-topeni','truhlarstvi','zamecnictvi',
    'zahrada','uklid','doprava','auto-moto','it-technika',
    'design-kreativa','krasa-pece','poradenstvi','ostatni'
  );

COMMENT ON VIEW public.categories_orphans IS
  'F1: kategorie, které po automatickém mapování zůstaly bez rodiče a nejsou jednou z 13 oficiálních hlavních kategorií. Admin je má ručně přeřadit.';
