-- F4 — Synonyms pro český "stemming" ekvivalent.
-- Postgres nemá nativní český stemmer → kompromis: ručně udržovaný synonym slovník
-- (řemeslné obory). Query se před FTS expanduje na 'term OR variant1 OR variant2'.

create table if not exists public.search_synonyms (
  id         bigserial primary key,
  term       text not null unique,          -- kanonický tvar (normalized, unaccented, lowercase)
  variants   text[] not null,               -- ostatní zaměnitelné tvary (normalized)
  note       text,                          -- volitelná poznámka (obor apod.)
  updated_at timestamptz not null default now()
);

alter table public.search_synonyms enable row level security;

drop policy if exists search_synonyms_public_read on public.search_synonyms;
create policy search_synonyms_public_read on public.search_synonyms
  for select using (true);

drop policy if exists search_synonyms_admin_write on public.search_synonyms;
create policy search_synonyms_admin_write on public.search_synonyms
  for all using (public.is_admin()) with check (public.is_admin());

-- === Seed: 30–50 řemeslných termínů (kanonická forma = lowercase bez diakritiky) ===
-- Idempotentní — ON CONFLICT DO NOTHING zajišťuje bezpečný re-run.
insert into public.search_synonyms (term, variants, note) values
  -- Elektro
  ('elektrikar',       array['elektro','elektrikarske','elektroinstalater','elektroinstalace','revizni technik elektro'],                      'elektro'),
  ('elektroinstalace', array['elektroinstalater','elektrikar','elektro','rozvody elektro'],                                                    'elektro'),
  -- Voda / topení / plyn
  ('instalater',       array['vodoinstalater','topenar','plynar','instalace vody','instalace topeni','instalace plynu'],                       'voda-topeni-plyn'),
  ('vodoinstalater',   array['instalater','voda','vodovod','rozvody vody'],                                                                    'voda'),
  ('topenar',          array['instalater','topeni','radiator','kotel','plynovy kotel'],                                                        'topeni'),
  ('plynar',           array['plyn','plynovod','plynar','plynova instalace','plynovy kotel','plynove spotrebice'],                             'plyn'),
  -- Stavba / zednictvi
  ('zednik',           array['zednicke prace','zdeni','zedni','omitky','murar','stavar'],                                                      'stavebni'),
  ('zednicke prace',   array['zednik','zdeni','omitky','obezdivky','prestavby'],                                                               'stavebni'),
  ('stavebni firma',   array['stavby','stavbar','stavebni prace','realizace staveb','generalni dodavatel'],                                    'stavebni'),
  ('rekonstrukce',     array['rekonstrukce bytu','rekonstrukce domu','prestavba','renovace','modernizace'],                                    'stavebni'),
  ('zateplovani',      array['zateplovac','zateplovaci systemy','etics','fasady','kontaktni zatepleni'],                                       'stavebni'),
  -- Malirstvi / natery / fasady
  ('malir',            array['malirske prace','maloval','nater','natirani','vymalovani','valbovani'],                                          'malir'),
  ('malirske prace',   array['malir','malovani','natery','valbovani','vymalovani bytu'],                                                       'malir'),
  ('natery',           array['natiranii','natery','malir','ochranne natery','fasady','fasadni natery'],                                        'natery'),
  ('fasady',           array['fasadnik','zateplovani','fasadni natery','obkladani fasad'],                                                     'fasady'),
  -- Střechy / klempířství / tesařství
  ('pokryvac',         array['pokryvacske prace','strecha','strechy','krovy','strešní krytina','tasky'],                                       'strecha'),
  ('strechy',          array['pokryvac','klempir','tesar','krovy','drevene konstrukce'],                                                       'strecha'),
  ('klempir',          array['klempirske prace','zlaby','okapy','oplechovani'],                                                                'klempir'),
  ('tesar',            array['tesarske prace','krov','stavba krovu','drevene konstrukce','dreveny pristresek'],                                'tesar'),
  -- Podlahy / obklady / dlazby
  ('podlahar',         array['podlahy','plovouci podlahy','parkety','laminat','pokladka podlah','vinyl'],                                      'podlahy'),
  ('podlahy',          array['podlahar','pokladka','plovouci','parkety','vinyl','brouseni parket'],                                            'podlahy'),
  ('obkladac',         array['obkladacske prace','obklady','dlazby','koupelna obklady','koupelna dlazba'],                                     'obklady'),
  ('obklady a dlazby', array['obkladac','keramicke obklady','dlazby','koupelna','pokladka dlazby'],                                            'obklady'),
  -- Truhlářství / nábytek / kuchyně
  ('truhlar',          array['truhlarske prace','nabytek na miru','kuchyne','kuchynske linky','vestavene skrine'],                             'truhlar'),
  ('kuchyne',          array['kuchynska linka','kuchynske linky','truhlar','nabytek na miru'],                                                 'truhlar'),
  ('nabytek na miru',  array['truhlar','vestavene skrine','zakazkova vyroba nabytku'],                                                         'truhlar'),
  -- Zámečnictví / kovovýroba
  ('zamecnik',         array['zamecnicke prace','kovovyroba','zabradli','brany','plot','plotni dily'],                                         'zamec'),
  ('kovovyroba',       array['zamecnik','sverene prace','zarizovani kovu','konstrukce ocel','branay'],                                         'kovo'),
  -- Zahrady / úklid
  ('zahradnik',        array['zahradnicke prace','seceni travy','udrzba zahrady','vysadba','dlazba zahrada'],                                  'zahrada'),
  ('uklid',            array['uklidove prace','uklidova firma','uklid domacnosti','uklid firem','mytí oken'],                                  'uklid'),
  -- Stěhování / doprava
  ('stehovani',        array['stehovaci sluzba','stehovaci firma','prevoz nabytku','doprava nabytku'],                                         'stehovani'),
  -- Automobily / autoservis
  ('autoservis',       array['automechanik','servis vozidel','oprava auta','stk','priprava na stk'],                                           'auto'),
  ('automechanik',     array['autoservis','opravar aut','mechanik','servis motorovych vozidel'],                                               'auto'),
  -- IT / počítače
  ('it podpora',       array['pocitace','oprava pocitace','it sluzby','sprava pc','it helpdesk'],                                              'it'),
  ('webove stranky',   array['web','webdesign','tvorba webu','e-shop','eshop','webovy vyvoj'],                                                 'it'),
  -- Finance / ucetnictvi
  ('ucetni',           array['ucetnictvi','danove priznani','danovy poradce','mzdy','vedeni ucetnictvi'],                                      'ucetni'),
  -- Fotografie / grafika
  ('fotograf',         array['foto','svatebni fotograf','portretni foto','focení','fotografovani'],                                            'foto'),
  ('grafik',           array['graficke prace','logo','grafika','graficky design','vizualizace'],                                               'grafika'),
  -- Překlady
  ('prekladatel',      array['preklady','tlumoceni','soudni preklad','preklad dokumentu'],                                                     'preklad'),
  -- Doučování
  ('douceni',          array['doucovani','soukroma vyuka','priprava k maturite','priprava na zkousky'],                                        'vzdelavani'),
  -- Krása / kadeřnictví / kosmetika
  ('kadernik',         array['kadernice','ucesy','strihani','kadernictvi','barveni vlasu'],                                                    'krasa'),
  ('kosmeticka',       array['kosmetika','plet','depilace','obliceje','kosmeticke sluzby'],                                                    'krasa'),
  -- Doprava / kurýři
  ('kuryr',            array['kuryrni sluzba','doruceni','doruceni zasilky','expresni doprava'],                                               'doprava')
on conflict (term) do nothing;

-- === Expand funkce ===
-- Vezme normalizovaný query, rozebere na tokeny, pro každý hledá v search_synonyms
-- a přepisuje ho na 'token OR variant1 OR variant2 ...'. Výsledek je předaný
-- websearch_to_tsquery, která podporuje OR jako operátor.
create or replace function public.expand_query_synonyms(p_query_norm text)
returns text
language plpgsql
stable
as $$
declare
  result text := '';
  tok text;
  vars text[];
  piece text;
begin
  if p_query_norm is null or length(trim(p_query_norm)) = 0 then
    return '';
  end if;

  for tok in
    select unnest(string_to_array(regexp_replace(trim(lower(p_query_norm)), '\s+', ' ', 'g'), ' '))
  loop
    if tok is null or length(tok) = 0 then
      continue;
    end if;

    select variants into vars
      from public.search_synonyms
     where term = tok
     limit 1;

    if vars is null or array_length(vars, 1) is null then
      piece := tok;
    else
      piece := tok || ' OR ' || array_to_string(vars, ' OR ');
    end if;

    if length(result) = 0 then
      result := piece;
    else
      result := result || ' ' || piece;
    end if;
  end loop;

  return result;
end $$;

revoke all on function public.expand_query_synonyms(text) from public;
grant execute on function public.expand_query_synonyms(text) to anon, authenticated;

-- === search_entities — použije expanded query ===
-- Nová implementace: p_query se rozšíří uvnitř funkce přes expand_query_synonyms,
-- tzn. volající API se nic neměnit nemusí.
create or replace function public.search_entities(
  p_query text,
  p_query_norm text,
  p_entity_filter text default null,
  p_limit int default 20
)
returns table (
  entity_type   text,
  entity_id     text,
  title         text,
  snippet       text,
  image_url     text,
  location      text,
  boost_verified boolean,
  tier          text,
  rank          real
)
language sql
stable
as $$
  with q as (
    select
      websearch_to_tsquery(
        'public.cs_unaccent',
        coalesce(nullif(public.expand_query_synonyms(p_query_norm), ''), coalesce(p_query, ''))
      ) as tsq,
      coalesce(p_query_norm, '') as norm
  )
  select
    si.entity_type, si.entity_id, si.title, si.snippet, si.image_url,
    si.location, si.boost_verified, si.tier,
    (
      ts_rank_cd(si.search_tsv, q.tsq) * 2.0
      + case when si.boost_verified then 0.3 else 0 end
      + case when si.tier = 'business' then 0.4
             when si.tier = 'premium' then 0.2
             else 0 end
      + similarity(lower(unaccent(si.trgm_source)), q.norm) * 0.5
    )::real as rank
  from public.search_index si, q
  where
    (
      p_entity_filter is null
      or si.entity_type = p_entity_filter
      or (p_entity_filter = 'provider_any' and si.entity_type in ('provider', 'seed_provider'))
    )
    and (
      (q.tsq <> '' and si.search_tsv @@ q.tsq)
      or similarity(lower(unaccent(si.trgm_source)), q.norm) > 0.25
    )
  order by rank desc
  limit least(coalesce(p_limit, 20), 50);
$$;

revoke all on function public.search_entities(text, text, text, int) from public;
grant execute on function public.search_entities(text, text, text, int) to anon, authenticated;
