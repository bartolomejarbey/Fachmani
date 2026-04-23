-- =============================================================
-- F3 — Seed krajů a okresů dle oficiálního číselníku ČSÚ / MPSV
-- Zdroj: https://data.mpsv.cz/od/soubory/ciselniky/okresy.json
-- CZ-NUTS3 kraje (14), LAU okresy (76)
-- Idempotentní přes ON CONFLICT (code) DO NOTHING
-- =============================================================

-- 14 krajů (pořadí dle oficiálního číselníku)
INSERT INTO public.regions (code, name_cs, sort_order) VALUES
  ('CZ010', 'Hlavní město Praha',    10),
  ('CZ020', 'Středočeský kraj',      20),
  ('CZ031', 'Jihočeský kraj',        31),
  ('CZ032', 'Plzeňský kraj',         32),
  ('CZ041', 'Karlovarský kraj',      41),
  ('CZ042', 'Ústecký kraj',          42),
  ('CZ051', 'Liberecký kraj',        51),
  ('CZ052', 'Královéhradecký kraj',  52),
  ('CZ053', 'Pardubický kraj',       53),
  ('CZ063', 'Kraj Vysočina',         63),
  ('CZ064', 'Jihomoravský kraj',     64),
  ('CZ071', 'Olomoucký kraj',        71),
  ('CZ072', 'Zlínský kraj',          72),
  ('CZ080', 'Moravskoslezský kraj',  80)
ON CONFLICT (code) DO NOTHING;

-- 76 okresů (LAU kódy, parent region přes subselect dle kódu)
INSERT INTO public.districts (region_id, code, name_cs, sort_order)
SELECT r.id, v.code, v.name_cs, v.sort_order
FROM (VALUES
  ('CZ010','CZ0100','Hlavní město Praha',    100),
  ('CZ020','CZ0201','Benešov',               201),
  ('CZ020','CZ0202','Beroun',                202),
  ('CZ020','CZ0203','Kladno',                203),
  ('CZ020','CZ0204','Kolín',                 204),
  ('CZ020','CZ0205','Kutná Hora',            205),
  ('CZ020','CZ0206','Mělník',                206),
  ('CZ020','CZ0207','Mladá Boleslav',        207),
  ('CZ020','CZ0208','Nymburk',               208),
  ('CZ020','CZ0209','Praha-východ',          209),
  ('CZ020','CZ020A','Praha-západ',           210),
  ('CZ020','CZ020B','Příbram',               211),
  ('CZ020','CZ020C','Rakovník',              212),
  ('CZ031','CZ0311','České Budějovice',      311),
  ('CZ031','CZ0312','Český Krumlov',         312),
  ('CZ031','CZ0313','Jindřichův Hradec',     313),
  ('CZ031','CZ0314','Písek',                 314),
  ('CZ031','CZ0315','Prachatice',            315),
  ('CZ031','CZ0316','Strakonice',            316),
  ('CZ031','CZ0317','Tábor',                 317),
  ('CZ032','CZ0321','Domažlice',             321),
  ('CZ032','CZ0322','Klatovy',               322),
  ('CZ032','CZ0323','Plzeň-město',           323),
  ('CZ032','CZ0324','Plzeň-jih',             324),
  ('CZ032','CZ0325','Plzeň-sever',           325),
  ('CZ032','CZ0326','Rokycany',              326),
  ('CZ032','CZ0327','Tachov',                327),
  ('CZ041','CZ0411','Cheb',                  411),
  ('CZ041','CZ0412','Karlovy Vary',          412),
  ('CZ041','CZ0413','Sokolov',               413),
  ('CZ042','CZ0421','Děčín',                 421),
  ('CZ042','CZ0422','Chomutov',              422),
  ('CZ042','CZ0423','Litoměřice',            423),
  ('CZ042','CZ0424','Louny',                 424),
  ('CZ042','CZ0425','Most',                  425),
  ('CZ042','CZ0426','Teplice',               426),
  ('CZ042','CZ0427','Ústí nad Labem',        427),
  ('CZ051','CZ0511','Česká Lípa',            511),
  ('CZ051','CZ0512','Jablonec nad Nisou',    512),
  ('CZ051','CZ0513','Liberec',               513),
  ('CZ051','CZ0514','Semily',                514),
  ('CZ052','CZ0521','Hradec Králové',        521),
  ('CZ052','CZ0522','Jičín',                 522),
  ('CZ052','CZ0523','Náchod',                523),
  ('CZ052','CZ0524','Rychnov nad Kněžnou',   524),
  ('CZ052','CZ0525','Trutnov',               525),
  ('CZ053','CZ0531','Chrudim',               531),
  ('CZ053','CZ0532','Pardubice',             532),
  ('CZ053','CZ0533','Svitavy',               533),
  ('CZ053','CZ0534','Ústí nad Orlicí',       534),
  ('CZ063','CZ0631','Havlíčkův Brod',        631),
  ('CZ063','CZ0632','Jihlava',               632),
  ('CZ063','CZ0633','Pelhřimov',             633),
  ('CZ063','CZ0634','Třebíč',                634),
  ('CZ063','CZ0635','Žďár nad Sázavou',      635),
  ('CZ064','CZ0641','Blansko',               641),
  ('CZ064','CZ0642','Brno-město',            642),
  ('CZ064','CZ0643','Brno-venkov',           643),
  ('CZ064','CZ0644','Břeclav',               644),
  ('CZ064','CZ0645','Hodonín',               645),
  ('CZ064','CZ0646','Vyškov',                646),
  ('CZ064','CZ0647','Znojmo',                647),
  ('CZ071','CZ0711','Jeseník',               711),
  ('CZ071','CZ0712','Olomouc',               712),
  ('CZ071','CZ0713','Prostějov',             713),
  ('CZ071','CZ0714','Přerov',                714),
  ('CZ071','CZ0715','Šumperk',               715),
  ('CZ072','CZ0721','Kroměříž',              721),
  ('CZ072','CZ0722','Uherské Hradiště',      722),
  ('CZ072','CZ0723','Vsetín',                723),
  ('CZ072','CZ0724','Zlín',                  724),
  ('CZ080','CZ0801','Bruntál',               801),
  ('CZ080','CZ0802','Frýdek-Místek',         802),
  ('CZ080','CZ0803','Karviná',               803),
  ('CZ080','CZ0804','Nový Jičín',            804),
  ('CZ080','CZ0805','Opava',                 805),
  ('CZ080','CZ0806','Ostrava-město',         806)
) AS v(region_code, code, name_cs, sort_order)
JOIN public.regions r ON r.code = v.region_code
ON CONFLICT (code) DO NOTHING;

-- Sanity check (výsledný log):
DO $$
DECLARE
  r_count int;
  d_count int;
BEGIN
  SELECT count(*) INTO r_count FROM public.regions;
  SELECT count(*) INTO d_count FROM public.districts;
  RAISE NOTICE 'Seed F3: regions=%, districts=%', r_count, d_count;
  IF r_count < 14 OR d_count < 76 THEN
    RAISE WARNING 'Očekáváno 14 krajů a 76 okresů, ale v DB je %, % — zkontrolujte seed.', r_count, d_count;
  END IF;
END $$;
