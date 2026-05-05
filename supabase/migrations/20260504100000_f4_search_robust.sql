-- F4 — Robustnější search engine.
-- Cíl: dotazu "web" vrátit kategorii "Webové stránky" (a vůbec full prefix-aware
-- matching). Přidává:
--   1) bidirekční synonym lookup (variants → canonical i naopak)
--   2) prefix matching (`tok:*`) v ts_query — token "web" matchuje lexém "webove"
--   3) doplnění web/digital/IT synonym
--   4) trgm fallback se sníženým prahem 0.18 + ILIKE prefix fallback
-- Idempotentní: CREATE OR REPLACE / ON CONFLICT DO UPDATE.

-- === 1. Doplnění web/digital synonym ===
insert into public.search_synonyms (term, variants, note) values
  ('web',             array['webove stranky','webdesign','webovy vyvoj','tvorba webu','e-shop','eshop','programovani','wordpress','php','it','digital'],   'it'),
  ('webove stranky',  array['web','webdesign','tvorba webu','e-shop','eshop','wordpress','programovani','digital','online'],                                'it'),
  ('webdesign',       array['web','webove stranky','tvorba webu','grafika','ui','ux','design'],                                                              'it'),
  ('eshop',           array['e-shop','e-commerce','online obchod','internetovy obchod','webshop','webove stranky','web'],                                    'it'),
  ('marketing',       array['online marketing','seo','reklama','ppc','google ads','facebook ads','digital marketing','digital'],                              'marketing'),
  ('seo',             array['optimalizace','marketing','google','vyhledavac','keywords','content marketing'],                                                 'marketing'),
  ('it',              array['it podpora','pocitace','programovani','informacni technologie','web','spravce site','it sluzby','helpdesk','sit'],               'it'),
  ('digital',         array['online','marketing','web','it','seo','reklama'],                                                                                 'digital'),
  ('grafika',         array['graficky design','graficky','logo','vizualizace','design','grafik','ui','ux'],                                                   'grafika'),
  ('logo',            array['grafika','graficky design','grafik','design','vizualni identita','branding'],                                                    'grafika'),
  ('foto',            array['fotograf','fotografovani','focení','svatebni fotograf','portretni foto'],                                                        'foto'),
  ('video',           array['videograf','svatebni video','video produkce','video editor','strih','postprodukce'],                                             'video')
on conflict (term) do update set
  variants = excluded.variants,
  note = excluded.note,
  updated_at = now();

-- === 2. build_search_tsquery — postaví prefix-aware ts_query s bidirektní synonyma ===
create or replace function public.build_search_tsquery(p_query_norm text)
returns tsquery
language plpgsql
stable
as $$
declare
  result_text text := '';
  tok text;
  expanded text[];
  s_row record;
  or_pieces text;
  whole text;
  word text;
  seen_words text[];
begin
  if p_query_norm is null or length(trim(p_query_norm)) = 0 then
    return null::tsquery;
  end if;

  for tok in
    select unnest(string_to_array(regexp_replace(trim(lower(p_query_norm)), '\s+', ' ', 'g'), ' '))
  loop
    if tok is null or length(tok) = 0 then
      continue;
    end if;

    -- Sběr alternativ: token + canonical + variants každého shodného synonymu (oba směry)
    expanded := array[tok];
    for s_row in
      select term, variants
        from public.search_synonyms
       where term = tok or tok = any(variants)
    loop
      expanded := expanded || s_row.term;
      expanded := expanded || s_row.variants;
    end loop;

    -- Postav OR list prefix-aware tokenů (deduplikuj v rámci tokenu)
    or_pieces := '';
    seen_words := array[]::text[];
    foreach whole in array expanded loop
      if whole is null then continue; end if;
      foreach word in array string_to_array(whole, ' ') loop
        word := regexp_replace(coalesce(word, ''), '[^a-z0-9]', '', 'g');
        if length(word) >= 2 and not (word = any(seen_words)) then
          seen_words := seen_words || word;
          if length(or_pieces) > 0 then
            or_pieces := or_pieces || ' | ' || word || ':*';
          else
            or_pieces := word || ':*';
          end if;
        end if;
      end loop;
    end loop;

    if length(or_pieces) > 0 then
      if length(result_text) > 0 then
        result_text := result_text || ' & (' || or_pieces || ')';
      else
        result_text := '(' || or_pieces || ')';
      end if;
    end if;
  end loop;

  if length(result_text) = 0 then
    return null::tsquery;
  end if;

  return to_tsquery('public.cs_unaccent', result_text);
exception when others then
  -- Pokud kdokoliv zachvíli vyrobí špatnou syntax, fallback na websearch_to_tsquery.
  return websearch_to_tsquery('public.cs_unaccent', coalesce(p_query_norm, ''));
end $$;

revoke all on function public.build_search_tsquery(text) from public;
grant execute on function public.build_search_tsquery(text) to anon, authenticated;

-- === 3. search_entities — používá build_search_tsquery, snižuje trgm práh, přidává ILIKE prefix ===
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
      coalesce(
        public.build_search_tsquery(coalesce(p_query_norm, '')),
        websearch_to_tsquery('public.cs_unaccent', coalesce(p_query, ''))
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
      + case when lower(unaccent(si.trgm_source)) like q.norm || '%' then 0.6 else 0 end
    )::real as rank
  from public.search_index si, q
  where
    (
      p_entity_filter is null
      or si.entity_type = p_entity_filter
      or (p_entity_filter = 'provider_any' and si.entity_type in ('provider', 'seed_provider'))
    )
    and (
      (q.tsq is not null and si.search_tsv @@ q.tsq)
      or similarity(lower(unaccent(si.trgm_source)), q.norm) > 0.18
      or lower(unaccent(si.trgm_source)) like q.norm || '%'
    )
  order by rank desc
  limit least(coalesce(p_limit, 20), 50);
$$;

revoke all on function public.search_entities(text, text, text, int) from public;
grant execute on function public.search_entities(text, text, text, int) to anon, authenticated;

-- === 4. search_suggest — používá build_search_tsquery pro vyšší relevance při krátkých dotazech ===
create or replace function public.search_suggest(
  p_query_norm text,
  p_limit int default 8
)
returns table (
  entity_type text,
  entity_id   text,
  title       text,
  similarity  real
)
language sql
stable
as $$
  with q as (
    select
      public.build_search_tsquery(coalesce(p_query_norm, '')) as tsq,
      coalesce(p_query_norm, '') as norm
  )
  select
    si.entity_type,
    si.entity_id,
    si.title,
    (
      similarity(lower(unaccent(si.trgm_source)), q.norm)
      + case when lower(unaccent(si.trgm_source)) like q.norm || '%' then 0.5 else 0 end
      + case when q.tsq is not null and si.search_tsv @@ q.tsq then 0.3 else 0 end
    )::real as similarity
  from public.search_index si, q
  where
    (
      lower(unaccent(si.trgm_source)) % q.norm
      or lower(unaccent(si.trgm_source)) like q.norm || '%'
      or (q.tsq is not null and si.search_tsv @@ q.tsq)
    )
  order by similarity desc
  limit least(coalesce(p_limit, 8), 20);
$$;

revoke all on function public.search_suggest(text, int) from public;
grant execute on function public.search_suggest(text, int) to anon, authenticated;
