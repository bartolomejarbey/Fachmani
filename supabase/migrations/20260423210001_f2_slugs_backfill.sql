-- F2 — Backfill existujících providerů a seed_providers.
-- Idempotentní: zpracuje pouze řádky, kde slug je zatím NULL.

do $$
declare
  r record;
begin
  for r in
    select id, full_name from public.profiles
    where role = 'provider' and slug is null
    order by created_at asc
  loop
    update public.profiles
       set slug = public.generate_unique_slug(r.full_name, 'profiles', r.id)
     where id = r.id and slug is null;
  end loop;
end $$;

do $$
declare
  r record;
begin
  for r in
    select id, full_name from public.seed_providers
    where slug is null
    order by created_at asc
  loop
    update public.seed_providers
       set slug = public.generate_unique_slug(r.full_name, 'seed_providers', r.id)
     where id = r.id and slug is null;
  end loop;
end $$;
