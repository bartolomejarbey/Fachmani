-- =============================================================
-- F1 — Seed hlavních kategorií (parent_id = NULL)
-- 13 hlavních skupin pokrývajících běžné CZ řemesla a služby.
-- Idempotentní přes ON CONFLICT (slug).
-- Stávající ploché kategorie budou v následující migraci
-- 20260423100002 namapovány pod tyto hlavní kategorie.
-- =============================================================

INSERT INTO public.categories (name, slug, icon, description, sort_order, parent_id) VALUES
  ('Stavebnictví a rekonstrukce',     'stavebnictvi',         '🏗️', 'Zednické, tesařské, pokrývačské a další stavební práce',   10, NULL),
  ('Elektro, voda, topení',           'elektro-voda-topeni',  '⚡',  'Elektrikáři, instalatéři, topenáři, plynaři, vzduchotechnika', 20, NULL),
  ('Truhlářství a nábytek',           'truhlarstvi',          '🪵',  'Nábytek na míru, kuchyně, vestavby, dřevěná okna a dveře',  30, NULL),
  ('Zámečnictví a kovovýroba',        'zamecnictvi',          '🔩',  'Zámečníci, svářeči, ploty, brány, mříže, kovovýroba',       40, NULL),
  ('Zahrada a exteriér',              'zahrada',              '🌿',  'Zahradníci, sekání, kácení, dlažba, bazény, závlahy',       50, NULL),
  ('Úklid a údržba',                  'uklid',                '🧹',  'Úklid domácností, po rekonstrukci, mytí oken, kominíci',    60, NULL),
  ('Doprava a stěhování',             'doprava',              '🚚',  'Stěhování, autodoprava, odvoz odpadu, kontejnery',          70, NULL),
  ('Auto-moto služby',                'auto-moto',            '🚗',  'Autoservis, pneuservis, lakování, diagnostika',             80, NULL),
  ('IT a technika',                   'it-technika',          '💻',  'IT podpora, servis PC, mobilů, spotřebičů, zabezpečení',    90, NULL),
  ('Design a kreativa',               'design-kreativa',      '🎨',  'Grafický design, web, foto, video, architektura, interiér',100, NULL),
  ('Krása a péče o tělo',             'krasa-pece',           '💆',  'Kadeřnictví, kosmetika, manikúra, masáže, fitness',        110, NULL),
  ('Poradenství a vzdělávání',        'poradenstvi',          '📚',  'Doučování, jazyky, účetnictví, daňové a právní poradenství',120, NULL),
  ('Ostatní služby',                  'ostatni',              '🔧',  'Další odborníci a služby nezařazené do hlavních skupin',   999, NULL)
ON CONFLICT (slug) DO UPDATE
  SET icon = EXCLUDED.icon,
      description = COALESCE(public.categories.description, EXCLUDED.description),
      sort_order = EXCLUDED.sort_order,
      parent_id = NULL;  -- zajistíme, že hlavní kategorie nemají parent

-- Sanity check
DO $$
DECLARE
  main_count int;
BEGIN
  SELECT count(*) INTO main_count
  FROM public.categories
  WHERE parent_id IS NULL
    AND slug IN (
      'stavebnictvi','elektro-voda-topeni','truhlarstvi','zamecnictvi',
      'zahrada','uklid','doprava','auto-moto','it-technika',
      'design-kreativa','krasa-pece','poradenstvi','ostatni'
    );
  RAISE NOTICE 'F1 seed hlavních kategorií: % / 13 zapsáno', main_count;
END $$;
