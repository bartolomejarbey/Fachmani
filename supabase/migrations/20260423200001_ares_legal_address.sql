-- ARES — profiles.legal_address (strukturovaná adresa z ARES verify).
-- Navazuje na 20260423200000_ares_structure.sql.

alter table public.profiles
  add column if not exists legal_address jsonb;

-- GIN index pro filtrování podle klíčů v adrese (město, PSČ apod.).
create index if not exists profiles_legal_address_gin_idx
  on public.profiles using gin(legal_address);

comment on column public.profiles.legal_address is
  'Strukturovaná adresa z ARES verifikace: {street, house_number, orientation_number, city, postal_code, country, source, verified_at}';
