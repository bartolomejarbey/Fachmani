-- F4 — Interní vyhledávání (Postgres FTS + pg_trgm)
-- Struktura: tsvector sloupce na fachmanech/kategoriích/poptávkách,
-- view sjednocující všechny searchable entity, query/click log tabulky.

create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- Czech FTS konfigurace postavená na unaccent nad 'simple' (přesné matching bez stemming;
-- Postgres nemá nativní czech stemmer, unaccent dostatečně pokryje diakritiku).
do $$
begin
  if not exists (select 1 from pg_ts_config where cfgname = 'cs_unaccent') then
    create text search configuration public.cs_unaccent (copy = simple);
    alter text search configuration public.cs_unaccent
      alter mapping for hword, hword_part, word with unaccent, simple;
  end if;
end $$;

-- === Sloupce search_tsv na source tabulkách ===
alter table public.profiles       add column if not exists search_tsv tsvector;
alter table public.seed_providers add column if not exists search_tsv tsvector;
alter table public.categories     add column if not exists search_tsv tsvector;

create index if not exists profiles_search_tsv_idx       on public.profiles       using gin(search_tsv);
create index if not exists seed_providers_search_tsv_idx on public.seed_providers using gin(search_tsv);
create index if not exists categories_search_tsv_idx     on public.categories     using gin(search_tsv);

-- Trgm indexy pro fuzzy suggestions (prefix + "did you mean").
create index if not exists profiles_fullname_trgm_idx       on public.profiles       using gin(full_name gin_trgm_ops);
create index if not exists seed_providers_fullname_trgm_idx on public.seed_providers using gin(full_name gin_trgm_ops);
create index if not exists categories_name_trgm_idx         on public.categories     using gin(name gin_trgm_ops);

-- === Triggery pro udržování search_tsv ===
create or replace function public.trg_profiles_search_tsv()
returns trigger language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('public.cs_unaccent', coalesce(new.full_name, '')), 'A')
    || setweight(to_tsvector('public.cs_unaccent', coalesce(new.description, '')), 'B')
    || setweight(to_tsvector('public.cs_unaccent', coalesce(new.location, '')), 'C');
  return new;
end $$;

drop trigger if exists profiles_search_tsv_trigger on public.profiles;
create trigger profiles_search_tsv_trigger
  before insert or update of full_name, description, location on public.profiles
  for each row execute function public.trg_profiles_search_tsv();

create or replace function public.trg_seed_providers_search_tsv()
returns trigger language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('public.cs_unaccent', coalesce(new.full_name, '')), 'A')
    || setweight(to_tsvector('public.cs_unaccent', coalesce(new.bio, '')), 'B')
    || setweight(to_tsvector('public.cs_unaccent', array_to_string(coalesce(new.locations, array[]::text[]), ' ')), 'C');
  return new;
end $$;

drop trigger if exists seed_providers_search_tsv_trigger on public.seed_providers;
create trigger seed_providers_search_tsv_trigger
  before insert or update of full_name, bio, locations on public.seed_providers
  for each row execute function public.trg_seed_providers_search_tsv();

create or replace function public.trg_categories_search_tsv()
returns trigger language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('public.cs_unaccent', coalesce(new.name, '')), 'A')
    || setweight(to_tsvector('public.cs_unaccent', coalesce(new.description, '')), 'B');
  return new;
end $$;

drop trigger if exists categories_search_tsv_trigger on public.categories;
create trigger categories_search_tsv_trigger
  before insert or update of name, description on public.categories
  for each row execute function public.trg_categories_search_tsv();

-- === search_index VIEW ===
-- Sjednocuje entity do společného formátu pro unified search.
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
from public.categories c;

-- === Query + click log ===
-- Query log pro admin analytics a popular searches.
create table if not exists public.search_queries (
  id           uuid primary key default gen_random_uuid(),
  query        text not null,
  query_norm   text not null,           -- lowercase + unaccent, trim
  user_id      uuid references auth.users(id) on delete set null,
  ip_hash      text,                    -- sha256 hash IP (privacy)
  result_count int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists search_queries_created_at_idx on public.search_queries(created_at desc);
create index if not exists search_queries_query_norm_idx on public.search_queries(query_norm);
create index if not exists search_queries_zero_idx on public.search_queries(query_norm) where result_count = 0;

create table if not exists public.search_clicks (
  id            uuid primary key default gen_random_uuid(),
  query         text not null,
  query_norm    text not null,
  entity_type   text not null,
  entity_id     text not null,
  position      int,
  user_id       uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists search_clicks_query_idx on public.search_clicks(query_norm, created_at desc);
create index if not exists search_clicks_entity_idx on public.search_clicks(entity_type, entity_id);

alter table public.search_queries enable row level security;
alter table public.search_clicks  enable row level security;

-- Jen admin dostává SELECT přes is_admin() (definovaná v původním hardening)
-- Pokud is_admin() neexistuje, fallback: check profiles.role.
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'is_admin') then
    create function public.is_admin()
      returns boolean
      language sql stable
      as $fn$
        select exists (
          select 1 from public.profiles
          where id = auth.uid() and role in ('admin', 'master_admin')
        );
      $fn$;
  end if;
end $$;

drop policy if exists search_queries_admin_read on public.search_queries;
create policy search_queries_admin_read on public.search_queries
  for select using (public.is_admin());

drop policy if exists search_clicks_admin_read on public.search_clicks;
create policy search_clicks_admin_read on public.search_clicks
  for select using (public.is_admin());

-- Inserts jdou přes SECURITY DEFINER RPC (log_search_query/log_search_click).
-- Žádná INSERT policy = direct PostgREST INSERT je zamítnut.

-- RPC: log_search_query — anonymous i authenticated mohou volat.
create or replace function public.log_search_query(
  p_query text,
  p_query_norm text,
  p_ip_hash text,
  p_result_count int
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_id uuid;
begin
  if p_query is null or length(p_query) < 2 or length(p_query) > 200 then
    raise exception 'invalid query length';
  end if;
  insert into public.search_queries (query, query_norm, user_id, ip_hash, result_count)
    values (p_query, p_query_norm, auth.uid(), p_ip_hash, coalesce(p_result_count, 0))
    returning id into new_id;
  return new_id;
end $$;

revoke all on function public.log_search_query(text, text, text, int) from public;
grant execute on function public.log_search_query(text, text, text, int) to anon, authenticated;

-- RPC: log_search_click
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
  if p_entity_type not in ('provider', 'seed_provider', 'category') then
    raise exception 'invalid entity_type';
  end if;
  insert into public.search_clicks (query, query_norm, entity_type, entity_id, position, user_id)
    values (p_query, p_query_norm, p_entity_type, p_entity_id, p_position, auth.uid())
    returning id into new_id;
  return new_id;
end $$;

revoke all on function public.log_search_click(text, text, text, text, int) from public;
grant execute on function public.log_search_click(text, text, text, text, int) to anon, authenticated;

-- === Rate-limit tabulka pro search (sdílíme pattern z ARES) ===
create table if not exists public.search_rate_limit (
  id         bigserial primary key,
  key_type   text not null check (key_type in ('ip', 'user')),
  key_value  text not null,
  created_at timestamptz not null default now()
);
create index if not exists search_rate_limit_lookup_idx
  on public.search_rate_limit(key_type, key_value, created_at desc);

alter table public.search_rate_limit enable row level security;
-- Žádné policies → pouze service-role.

-- Cleanup helper — může zavolat cron.
create or replace function public.cleanup_search_rate_limit()
returns void
language sql
as $$
  delete from public.search_rate_limit
   where created_at < now() - interval '1 hour';
$$;

-- === Search RPC ===
-- Bundluje tsquery + trigram fallback do jedné transakce.
-- Parametry:
--   p_query       — raw vstup (nesanitizováno, Postgres to zvládne přes websearch_to_tsquery)
--   p_query_norm  — normalizovaný dotaz (pro trigram %)
--   p_entity_filter — null pro vše, jinak jeden z 'provider','seed_provider','category'
--   p_limit       — max výsledků (clamp 50)
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

-- Lightweight suggest RPC (jen title + type, trigram-only).
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
  select
    entity_type,
    entity_id,
    title,
    similarity(lower(unaccent(trgm_source)), coalesce(p_query_norm, ''))::real as similarity
  from public.search_index
  where lower(unaccent(trgm_source)) % coalesce(p_query_norm, '')
     or lower(unaccent(trgm_source)) like coalesce(p_query_norm, '') || '%'
  order by similarity desc
  limit least(coalesce(p_limit, 8), 20);
$$;

revoke all on function public.search_suggest(text, int) from public;
grant execute on function public.search_suggest(text, int) to anon, authenticated;
