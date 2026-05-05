-- =============================================================
-- F1 — Hierarchie kategorií: restrukturalizace na 12 hlavních
-- Merge 5 duplicit (deaktivace + FK přesun) + přiřazení parent_id.
-- ATOMICKÁ: pokud se cokoli rozbije uprostřed, transakce rollbackuje.
-- =============================================================

-- ---------------------------------------------------------------
-- 0) is_active flag (audit trail — deaktivované kategorie zůstávají v DB)
-- ---------------------------------------------------------------
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS categories_is_active_idx ON public.categories(is_active);

-- ---------------------------------------------------------------
-- 1) Nový hlavní: udalosti (Svatby, eventy, catering)
-- ---------------------------------------------------------------
INSERT INTO public.categories (slug, name, icon, sort_order, parent_id, description, is_active)
VALUES ('udalosti', 'Svatby, eventy, catering', '💒', 80, NULL, 'Svatby, firemní eventy, catering, DJ a další události.', true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------
-- 2) Aktualizace name/icon/sort_order 11 existujících hlavních (slug nezměněn)
-- ---------------------------------------------------------------
UPDATE public.categories SET name='Stavebnictví a rekonstrukce', icon='🏗️', sort_order=10 WHERE slug='stavebnictvi';
UPDATE public.categories SET name='Elektro, voda, topení', icon='⚡', sort_order=20 WHERE slug='elektro-voda-topeni';
UPDATE public.categories SET name='Řemesla a kovovýroba', icon='🔧', sort_order=30 WHERE slug='remeslnici';
UPDATE public.categories SET name='Auto a doprava', icon='🚗', sort_order=40 WHERE slug='auto-moto';
UPDATE public.categories SET name='Zahrada a exteriér', icon='🌿', sort_order=50 WHERE slug='zahrada';
UPDATE public.categories SET name='Úklid a údržba', icon='🧹', sort_order=60 WHERE slug='uklid';
UPDATE public.categories SET name='IT, digital a marketing', icon='💻', sort_order=70 WHERE slug='it-technika';
UPDATE public.categories SET name='Foto, video, design a kreativa', icon='🎨', sort_order=90 WHERE slug='design-kreativa';
UPDATE public.categories SET name='Krása, zdraví, péče a hlídání', icon='💆', sort_order=100 WHERE slug='krasa-pece';
UPDATE public.categories SET name='Poradenství a vzdělávání', icon='📚', sort_order=110 WHERE slug='poradenstvi';
UPDATE public.categories SET name='Ostatní', icon='🏢', sort_order=120 WHERE slug='ostatni';

-- ---------------------------------------------------------------
-- 3) Přesun FK vazeb PŘED deaktivací `it` (1 request na `it` → `it-podpora`)
-- ---------------------------------------------------------------
UPDATE public.requests
SET category_id = (SELECT id FROM public.categories WHERE slug='it-podpora')
WHERE category_id = (SELECT id FROM public.categories WHERE slug='it');

-- ---------------------------------------------------------------
-- 4) Přesun DĚTÍ kategorií, které se deaktivují/demotují
--    (NUTNÉ před demote/deaktivací — trigger `categories_enforce_two_levels`
--    kontroluje jen nově vkládaný parent_id, ne děti; jinak vznikne 3-level)
-- ---------------------------------------------------------------
-- truhlar: parent truhlarstvi (bude deaktivován) → remeslnici
UPDATE public.categories
SET parent_id = (SELECT id FROM public.categories WHERE slug='remeslnici')
WHERE parent_id = (SELECT id FROM public.categories WHERE slug='truhlarstvi');

-- stehovani: parent doprava (bude deaktivován) → auto-moto
UPDATE public.categories
SET parent_id = (SELECT id FROM public.categories WHERE slug='auto-moto')
WHERE parent_id = (SELECT id FROM public.categories WHERE slug='doprava');

-- ploty-brany + zamecnik: parent zamecnictvi (demoutne se na sub) → remeslnici
UPDATE public.categories
SET parent_id = (SELECT id FROM public.categories WHERE slug='remeslnici')
WHERE parent_id = (SELECT id FROM public.categories WHERE slug='zamecnictvi');

-- ---------------------------------------------------------------
-- 5) Deaktivace 5 duplikátů (audit trail — zůstávají v DB, jen is_active=false)
-- ---------------------------------------------------------------
UPDATE public.categories
SET is_active = false
WHERE slug IN ('truhlarstvi','doprava','it','ucetnictvi','design');

-- ---------------------------------------------------------------
-- 6) Demotování bývalých childless mainů (+ deaktivovaných s dříve přesunutými dětmi)
-- ---------------------------------------------------------------
-- Pod stavebnictvi
UPDATE public.categories SET parent_id = (SELECT id FROM public.categories WHERE slug='stavebnictvi')
WHERE slug IN ('demolice','zatepleni','strechy','sklenar');

-- Pod elektro-voda-topeni
UPDATE public.categories SET parent_id = (SELECT id FROM public.categories WHERE slug='elektro-voda-topeni')
WHERE slug IN ('smart-home','tepelna-cerpadla');

-- Pod remeslnici (vč. zamecnictvi a deaktivovaný truhlarstvi)
UPDATE public.categories SET parent_id = (SELECT id FROM public.categories WHERE slug='remeslnici')
WHERE slug IN ('zamecnictvi','krejci','hodinar','oprava-obuvi','truhlarstvi');

-- Pod auto-moto (vč. deaktivovaný doprava)
UPDATE public.categories SET parent_id = (SELECT id FROM public.categories WHERE slug='auto-moto')
WHERE slug IN ('odtahova-sluzba','doprava');

-- Pod zahrada
UPDATE public.categories SET parent_id = (SELECT id FROM public.categories WHERE slug='zahrada')
WHERE slug IN ('udrzba-zelene');

-- Pod it-technika (marketing + seo)
UPDATE public.categories SET parent_id = (SELECT id FROM public.categories WHERE slug='it-technika')
WHERE slug IN ('marketing','seo');

-- Pod udalosti (nový main)
UPDATE public.categories SET parent_id = (SELECT id FROM public.categories WHERE slug='udalosti')
WHERE slug IN ('catering','dj-hudba','moderator','svatby');

-- Pod krasa-pece
UPDATE public.categories SET parent_id = (SELECT id FROM public.categories WHERE slug='krasa-pece')
WHERE slug IN ('grooming','hlidani','hlidani-zvirat','veterinar');

-- Pod ostatni (firmy)
UPDATE public.categories SET parent_id = (SELECT id FROM public.categories WHERE slug='ostatni')
WHERE slug IN ('firmy');

-- ---------------------------------------------------------------
-- 7) Verifikace uvnitř transakce — RAISE EXCEPTION = rollback celé migrace
-- ---------------------------------------------------------------
DO $$
DECLARE
  orphan_count        int;
  invalid_level_count int;
  active_mains        int;
  active_subs         int;
  deactivated         int;
BEGIN
  -- Žádné sirotky: aktivní sub s deaktivovaným parentem
  SELECT COUNT(*) INTO orphan_count
  FROM public.categories c
  JOIN public.categories p ON c.parent_id = p.id
  WHERE p.is_active = false AND c.is_active = true;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'F1 hierarchy seed FAILED: % sirotků (aktivní sub s deaktivovaným parentem)', orphan_count;
  END IF;

  -- Žádná 3. úroveň (parent má sám parenta)
  SELECT COUNT(*) INTO invalid_level_count
  FROM public.categories c
  JOIN public.categories p ON c.parent_id = p.id
  WHERE p.parent_id IS NOT NULL;
  IF invalid_level_count > 0 THEN
    RAISE EXCEPTION 'F1 hierarchy seed FAILED: % 3-level hierarchií (sub má parenta, který je sám sub)', invalid_level_count;
  END IF;

  -- Počet aktivních hlavních = 12
  SELECT COUNT(*) INTO active_mains
  FROM public.categories
  WHERE parent_id IS NULL AND is_active = true;
  IF active_mains <> 12 THEN
    RAISE EXCEPTION 'F1 hierarchy seed FAILED: očekáváno 12 aktivních hlavních, nalezeno %', active_mains;
  END IF;

  SELECT COUNT(*) INTO active_subs
  FROM public.categories
  WHERE parent_id IS NOT NULL AND is_active = true;

  SELECT COUNT(*) INTO deactivated
  FROM public.categories
  WHERE is_active = false;

  RAISE NOTICE 'F1 hierarchy seed OK: % hlavní aktivní, % subs aktivní, % deaktivované', active_mains, active_subs, deactivated;
END $$;
