-- F4 — Rozšíření vyhledávání o poptávky (requests) a nabídky (service_offers).
-- Navazuje na 20260423220000_f4_search_structure.sql.
-- Idempotentní (IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS).

-- === search_tsv sloupce + indexy ===
alter table public.requests        add column if not exists search_tsv tsvector;
alter table public.service_offers  add column if not exists search_tsv tsvector;

-- service_offers.image_url nemusí existovat ve všech prostředích (některá prod DB
-- neprošla 20260316_fix_service_offers.sql, který tento sloupec přidával).
-- Přidáme jej proaktivně, aby search_index VIEW níže mohl referencovat coalesce(o.image_url, '').
alter table public.service_offers  add column if not exists image_url text;

create index if not exists requests_search_tsv_idx       on public.requests       using gin(search_tsv);
create index if not exists service_offers_search_tsv_idx on public.service_offers using gin(search_tsv);

-- Trgm indexy nad title (pro fuzzy / did-you-mean).
create index if not exists requests_title_trgm_idx       on public.requests       using gin(title gin_trgm_ops);
create index if not exists service_offers_title_trgm_idx on public.service_offers using gin(title gin_trgm_ops);

-- === Triggery ===
create or replace function public.trg_requests_search_tsv()
returns trigger language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('public.cs_unaccent', coalesce(new.title, '')), 'A')
    || setweight(to_tsvector('public.cs_unaccent', coalesce(new.description, '')), 'B')
    || setweight(to_tsvector('public.cs_unaccent', coalesce(new.location, '')), 'C');
  return new;
end $$;

drop trigger if exists requests_search_tsv_trigger on public.requests;
create trigger requests_search_tsv_trigger
  before insert or update of title, description, location on public.requests
  for each row execute function public.trg_requests_search_tsv();

create or replace function public.trg_service_offers_search_tsv()
returns trigger language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('public.cs_unaccent', coalesce(new.title, '')), 'A')
    || setweight(to_tsvector('public.cs_unaccent', coalesce(new.description, '')), 'B')
    || setweight(to_tsvector('public.cs_unaccent', coalesce(new.location, '')), 'C');
  return new;
end $$;

drop trigger if exists service_offers_search_tsv_trigger on public.service_offers;
create trigger service_offers_search_tsv_trigger
  before insert or update of title, description, location on public.service_offers
  for each row execute function public.trg_service_offers_search_tsv();

-- === Rozšířený search_index VIEW ===
-- UNION ALL přidává 'demand' (requests, status='active' + nevypršelé) a
-- 'offer' (service_offers, is_active=true).
create or replace view public.search_index as
select
  'provider'::text as entity_type,
  p.id::text      as entity_id,
  p.full_name     as title,
  coalesce(p.description, '')     as snippet,
  coalesce(p.avatar_url, '')      as image_url,
  p.location                      as location,
  p.is_verified                   as boost_verified,
  coalesce(p.subscription_type, 'free') as tier,
  p.search_tsv                    as search_tsv,
  p.full_name                     as trgm_source
from public.profiles p
where p.role = 'provider'

union all

select
  'seed_provider'::text,
  s.id::text,
  s.full_name,
  coalesce(s.bio, ''),
  coalesce(s.avatar_url, ''),
  array_to_string(coalesce(s.locations, array[]::text[]), ', '),
  s.is_verified,
  'premium'::text,
  s.search_tsv,
  s.full_name
from public.seed_providers s
where s.is_active = true

union all

select
  'category'::text,
  c.id::text,
  c.name,
  coalesce(c.description, ''),
  ''::text,
  null::text,
  false,
  'free'::text,
  c.search_tsv,
  c.name
from public.categories c

union all

select
  'demand'::text,
  r.id::text,
  r.title,
  coalesce(r.description, ''),
  ''::text,
  coalesce(r.location, ''),
  false,
  'free'::text,
  r.search_tsv,
  r.title
from public.requests r
where r.status = 'active'
  and (r.expires_at is null or r.expires_at > now())

union all

select
  'offer'::text,
  o.id::text,
  o.title,
  coalesce(o.description, ''),
  coalesce(o.image_url, ''),
  coalesce(o.location, ''),
  false,
  'free'::text,
  o.search_tsv,
  o.title
from public.service_offers o
where o.is_active = true;

-- === RPC: log_search_click — rozšířený whitelist entity_type ===
create or replace function public.log_search_click(
  p_query text,
  p_query_norm text,
  p_entity_type text,
  p_entity_id text,
  p_position int
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_id uuid;
begin
  if p_entity_type not in ('provider', 'seed_provider', 'category', 'demand', 'offer') then
    raise exception 'invalid entity_type';
  end if;
  insert into public.search_clicks (query, query_norm, entity_type, entity_id, position, user_id)
    values (p_query, p_query_norm, p_entity_type, p_entity_id, p_position, auth.uid())
    returning id into new_id;
  return new_id;
end $$;

revoke all on function public.log_search_click(text, text, text, text, int) from public;
grant execute on function public.log_search_click(text, text, text, text, int) to anon, authenticated;

-- === RPC: search_entities — rozšířený p_entity_filter ===
-- Přidané filtry: 'demand', 'offer'. Zachováno 'provider_any' (union providers).
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
      websearch_to_tsquery('public.cs_unaccent', coalesce(p_query, '')) as tsq,
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

-- === Backfill search_tsv (force update všech řádků, aby se trigger rozjel) ===
update public.requests       set title = title       where search_tsv is null;
update public.service_offers set title = title       where search_tsv is null;
