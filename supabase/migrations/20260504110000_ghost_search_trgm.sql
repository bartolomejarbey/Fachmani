-- Re-enable ghost search by adding GIN pg_trgm indexes na name a legal_address->>city.
-- Důvod: bez indexu ILIKE timeoutuje na 290k řádcích → /fachmani search disable celého
-- ghost segmentu (`ghostsDisabled = !!searchText`). S trgm indexem ILIKE běží v ~ms.

-- pg_trgm by mělo být enable z předchozí search migrace, ale jistota:
create extension if not exists pg_trgm;

-- Index na BUSINESS NAME (ghost.name) — primární vstup pro vyhledávání podle firmy.
-- Filtrujeme na claimed_at IS NULL aby index zůstal malý (claimed jdou pryč z public feedu).
create index if not exists ghost_subjects_name_trgm_idx
  on public.ghost_subjects using gin (name gin_trgm_ops)
  where claimed_at is null;

-- Index na CITY z JSONB legal_address — typicky uživatel hledá lokalitu volně textem.
-- `gin_trgm_ops` na výrazu `(legal_address->>'city')` umožní rychlý ILIKE.
create index if not exists ghost_subjects_city_trgm_idx
  on public.ghost_subjects using gin ((legal_address->>'city') gin_trgm_ops)
  where claimed_at is null and is_active = true;

comment on index public.ghost_subjects_name_trgm_idx is
  'pg_trgm GIN — server-side ILIKE %term% na ghost.name pro /fachmani search.';
comment on index public.ghost_subjects_city_trgm_idx is
  'pg_trgm GIN — server-side ILIKE %term% na město z legal_address (locality search).';
