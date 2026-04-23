-- F2 — Veřejný SSR seznam fachmanů
-- Struktura: slug sloupec na profiles + seed_providers, funkce pro generování,
-- trigger pro automatické přidělení při insert/update.

create extension if not exists unaccent;

-- Transliterace + sanitizace na URL-bezpečný slug.
-- Nezaručuje unikátnost — to řeší trigger níže.
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '-' from
      regexp_replace(
        regexp_replace(
          lower(unaccent(coalesce(input, ''))),
          '[^a-z0-9]+', '-', 'g'
        ),
        '-{2,}', '-', 'g'
      )
    ),
    ''
  );
$$;

-- Profiles.slug
alter table public.profiles
  add column if not exists slug text;

create unique index if not exists profiles_slug_unique_idx
  on public.profiles(slug)
  where slug is not null;

-- Seed_providers.slug
alter table public.seed_providers
  add column if not exists slug text;

create unique index if not exists seed_providers_slug_unique_idx
  on public.seed_providers(slug)
  where slug is not null;

-- Generátor unikátního slugu s fallbackem na krátký uuid suffix.
create or replace function public.generate_unique_slug(
  base_name text,
  table_name text,
  current_id uuid
) returns text
language plpgsql
as $$
declare
  base_slug text;
  candidate text;
  counter int := 0;
  exists_count int;
begin
  base_slug := public.slugify(base_name);
  if base_slug is null or length(base_slug) < 2 then
    base_slug := 'fachman';
  end if;
  candidate := base_slug;

  loop
    execute format(
      'select count(*) from public.%I where slug = $1 and id <> $2',
      table_name
    )
    into exists_count
    using candidate, current_id;

    exit when exists_count = 0;

    counter := counter + 1;
    if counter > 5 then
      candidate := base_slug || '-' || substr(replace(current_id::text, '-', ''), 1, 6);
      exit;
    end if;
    candidate := base_slug || '-' || counter;
  end loop;

  return candidate;
end;
$$;

-- Trigger: auto-generuje slug pokud chybí nebo se změnilo jméno.
create or replace function public.trg_profiles_slug()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'provider' then
    if new.slug is null
       or (tg_op = 'UPDATE' and new.full_name is distinct from old.full_name and new.slug = old.slug) then
      new.slug := public.generate_unique_slug(new.full_name, 'profiles', new.id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_slug_trigger on public.profiles;
create trigger profiles_slug_trigger
  before insert or update on public.profiles
  for each row execute function public.trg_profiles_slug();

create or replace function public.trg_seed_providers_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null
     or (tg_op = 'UPDATE' and new.full_name is distinct from old.full_name and new.slug = old.slug) then
    new.slug := public.generate_unique_slug(new.full_name, 'seed_providers', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists seed_providers_slug_trigger on public.seed_providers;
create trigger seed_providers_slug_trigger
  before insert or update on public.seed_providers
  for each row execute function public.trg_seed_providers_slug();
