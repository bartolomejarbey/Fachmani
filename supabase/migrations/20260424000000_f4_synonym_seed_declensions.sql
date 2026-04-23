-- =============================================================
-- F4 synonym seed — skloňování + synonyma nejčastějších řemesel
-- =============================================================
-- expand_query_synonyms() dělá lookup per token v search_synonyms.term.
-- Aby "elektrikáře" (normalized → "elektrikare") našlo elektrikáře,
-- musí term="elektrikare" existovat jako samostatný záznam s variants
-- zahrnujícími kanonický tvar ("elektrikar"). Dotaz se pak rozšíří na
-- "elektrikare OR elektrikar" a FTS najde všechny obory.
--
-- Pro každý řemeslný obor:
--   - Existující kanonický term (elektrikar, instalater, ...) necháváme beze změny.
--   - Nové záznamy: declined forms + hovorové varianty, každá mapuje na kanon.
--   - 3 zcela nové kanony: kominik, autolakovna, pneuservis.
--
-- Vše lowercase + bez diakritiky (tak to matchuje normalizovaný query).
-- ON CONFLICT (term) DO NOTHING — re-apply je no-op.

insert into public.search_synonyms (term, variants, note) values
  -- elektrikář
  ('elektrikare',    array['elektrikar','elektro'],                'sklonovani: elektrikář (ak./gen.)'),
  ('elektrikarum',   array['elektrikar','elektro'],                'sklonovani: elektrikář (dat. pl.)'),
  ('elektrikari',    array['elektrikar','elektro'],                'sklonovani: elektrikář (nom. pl.)'),
  -- instalatér
  ('instalatere',    array['instalater'],                          'sklonovani: instalatér (ak./gen.)'),
  ('instalaterum',   array['instalater'],                          'sklonovani: instalatér (dat. pl.)'),
  ('instalatorstvi', array['instalater'],                          'obor: instalatérství'),
  -- zedník
  ('zednika',        array['zednik'],                              'sklonovani: zedník (ak./gen.)'),
  ('zednikovi',      array['zednik'],                              'sklonovani: zedník (dat.)'),
  ('zednictvi',      array['zednik'],                              'obor: zednictví'),
  -- malíř
  ('malire',         array['malir'],                               'sklonovani: malíř (ak./gen.)'),
  ('malirum',        array['malir'],                               'sklonovani: malíř (dat. pl.)'),
  ('malirstvi',      array['malir'],                               'obor: malířství'),
  ('malovani',       array['malir'],                               'činnost: malování'),
  -- truhlář
  ('truhlare',       array['truhlar'],                             'sklonovani: truhlář (ak./gen.)'),
  ('truhlarum',      array['truhlar'],                             'sklonovani: truhlář (dat. pl.)'),
  ('truhlarstvi',    array['truhlar'],                             'obor: truhlářství'),
  -- tesař
  ('tesare',         array['tesar'],                               'sklonovani: tesař (ak./gen.)'),
  ('tesari',         array['tesar'],                               'sklonovani: tesař (nom. pl.)'),
  ('tesarstvi',      array['tesar'],                               'obor: tesařství'),
  -- zámečník
  ('zamecnika',      array['zamecnik'],                            'sklonovani: zámečník (ak./gen.)'),
  ('zamecnictvi',    array['zamecnik'],                            'obor: zámečnictví'),
  -- klempíř
  ('klempire',       array['klempir'],                             'sklonovani: klempíř (ak./gen.)'),
  ('klempirum',      array['klempir'],                             'sklonovani: klempíř (dat. pl.)'),
  -- pokrývač
  ('pokryvace',      array['pokryvac'],                            'sklonovani: pokrývač (ak./gen.)'),
  ('pokryvacum',     array['pokryvac'],                            'sklonovani: pokrývač (dat. pl.)'),
  -- obkladač
  ('obkladace',      array['obkladac'],                            'sklonovani: obkladač (ak./gen.)'),
  ('dlazdic',        array['obkladac'],                            'synonym: dlaždič'),
  -- podlahář (term podlahar i podlahy už existují)
  ('podlahari',      array['podlahar','podlahy'],                  'sklonovani: podlahář (nom. pl.)'),
  -- kominík (NOVÝ kanon)
  ('kominik',        array['kominictvi','kominika'],               'řemeslo: kominík'),
  ('kominika',       array['kominik'],                             'sklonovani: kominík (ak./gen.)'),
  ('kominictvi',     array['kominik'],                             'obor: kominictví'),
  -- zahradník (kanon existuje)
  ('zahrada',        array['zahradnik'],                           'objekt: zahrada'),
  ('zahrady',        array['zahradnik'],                           'sklonovani: zahrada (nom. pl.)'),
  -- účetní (ucetnictvi už v existing variants; ucto nové)
  ('ucto',           array['ucetni','ucetnictvi'],                 'hovorově: účto'),
  -- autoservis (kanon existuje)
  ('autoservisu',    array['autoservis'],                          'sklonovani: autoservis (gen.)'),
  ('servis-aut',     array['autoservis','automechanik'],           'synonym: servis aut'),
  ('opravna-aut',    array['autoservis','automechanik'],           'synonym: opravna aut'),
  -- autolakovna (NOVÝ kanon)
  ('autolakovna',    array['autolakovny','lakovani-aut','autoservis'], 'řemeslo: autolakovna'),
  ('autolakovny',    array['autolakovna'],                         'sklonovani: autolakovna (nom. pl.)'),
  ('lakovani-aut',   array['autolakovna'],                         'synonym: lakování aut'),
  -- pneuservis (NOVÝ kanon)
  ('pneuservis',     array['pneu','gumy','kola','autoservis'],     'řemeslo: pneuservis'),
  ('pneu',           array['pneuservis'],                          'synonym: pneu'),
  ('gumy',           array['pneuservis'],                          'synonym: gumy (pneu)'),
  ('kola',           array['pneuservis'],                          'synonym: kola (pneu)')
on conflict (term) do nothing;
