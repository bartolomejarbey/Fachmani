-- =============================================================
-- Ghost subjects (Fáze 1 ARES strategy)
-- Subjekty importované z ARES bulk dumpu — nemají auth.user.
-- Zobrazují se na /fachmani s badge "Neověřeno" vedle reálných
-- providerů a seed_providers. Po claim flow se data převedou do
-- profiles + provider_profiles a ghost.claimed_at se vyplní.
--
-- Tabulky:
--   ghost_subjects   — main, ~150–200 k řádků po NACE filtru
--   isir_debtors     — denní snapshot z ISIR (anti-join filter)
--   ghost_leads      — poptávka cílená na ghost = lead pro admin tým
-- =============================================================

-- -------------------------------------------------------------
-- 1. ghost_subjects
-- -------------------------------------------------------------
create table if not exists public.ghost_subjects (
  ico                  text primary key check (ico ~ '^[0-9]{8}$'),
  name                 text not null,
  legal_form           text,
  cz_nace              text[] default '{}'::text[] not null,
  category_ids         uuid[] default '{}'::uuid[] not null,
  region_id            uuid references public.regions(id),
  district_id          uuid references public.districts(id),
  legal_address        jsonb,
  datum_vzniku         date,
  datum_zaniku         date,
  registration_states  jsonb default '{}'::jsonb not null,
  isir_flagged         boolean default false not null,
  isir_flagged_at      timestamptz,
  is_active            boolean generated always as (
    datum_zaniku is null
    and isir_flagged = false
    and (
      registration_states->>'stavZdrojeVr'  = 'AKTIVNI' or
      registration_states->>'stavZdrojeRzp' = 'AKTIVNI' or
      registration_states->>'stavZdrojeRos' = 'AKTIVNI' or
      registration_states->>'stavZdrojeCeu' = 'AKTIVNI' or
      registration_states->>'stavZdrojeRs'  = 'AKTIVNI'
    )
  ) stored,
  claimed_at           timestamptz,
  claimed_by           uuid references public.profiles(id) on delete set null,
  fetched_at           timestamptz default now() not null,
  last_synced_at       timestamptz default now() not null
);

-- District musí patřit do zvoleného kraje (stejný trigger jako u profiles)
create or replace function public.validate_ghost_district_belongs_to_region()
returns trigger as $$
declare
  district_region_id uuid;
begin
  if new.district_id is null or new.region_id is null then
    return new;
  end if;
  select region_id into district_region_id
  from public.districts where id = new.district_id;
  if district_region_id is not null and district_region_id <> new.region_id then
    raise exception 'Okres % nepatří do kraje %.', new.district_id, new.region_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists ghost_subjects_validate_district on public.ghost_subjects;
create trigger ghost_subjects_validate_district
  before insert or update of region_id, district_id on public.ghost_subjects
  for each row execute function public.validate_ghost_district_belongs_to_region();

-- Indexy pro /fachmani filtry
create index if not exists ghost_subjects_active_visible_idx
  on public.ghost_subjects(is_active, claimed_at)
  where is_active = true and claimed_at is null;
create index if not exists ghost_subjects_region_idx
  on public.ghost_subjects(region_id) where claimed_at is null;
create index if not exists ghost_subjects_district_idx
  on public.ghost_subjects(district_id) where claimed_at is null;
create index if not exists ghost_subjects_category_gin
  on public.ghost_subjects using gin(category_ids);
create index if not exists ghost_subjects_nace_gin
  on public.ghost_subjects using gin(cz_nace);
create index if not exists ghost_subjects_isir_flagged_idx
  on public.ghost_subjects(isir_flagged) where isir_flagged = true;

-- RLS
alter table public.ghost_subjects enable row level security;

-- Public čte jen aktivní + neclaimnuté (pro /fachmani veřejně)
drop policy if exists ghost_subjects_public_read on public.ghost_subjects;
create policy ghost_subjects_public_read on public.ghost_subjects
  for select using (is_active = true and claimed_at is null);

-- Admini čtou všechno
drop policy if exists ghost_subjects_admin_read_all on public.ghost_subjects;
create policy ghost_subjects_admin_read_all on public.ghost_subjects
  for select using (
    (select admin_role from public.profiles where id = auth.uid()) is not null
  );

-- Admini píšou cokoli
drop policy if exists ghost_subjects_admin_write on public.ghost_subjects;
create policy ghost_subjects_admin_write on public.ghost_subjects
  for all using (
    (select admin_role from public.profiles where id = auth.uid()) is not null
  ) with check (
    (select admin_role from public.profiles where id = auth.uid()) is not null
  );

-- -------------------------------------------------------------
-- 2. isir_debtors (Insolvenční rejstřík — anti-join na IČO)
-- -------------------------------------------------------------
create table if not exists public.isir_debtors (
  ico               text primary key check (ico ~ '^[0-9]{8}$'),
  case_number       text,
  case_state        text,
  last_event_type   text,
  last_event_date   date,
  fetched_at        timestamptz default now() not null,
  last_synced_at    timestamptz default now() not null
);

create index if not exists isir_debtors_synced_idx
  on public.isir_debtors(last_synced_at);

alter table public.isir_debtors enable row level security;
drop policy if exists isir_debtors_admin_only on public.isir_debtors;
create policy isir_debtors_admin_only on public.isir_debtors
  for all using (
    (select admin_role from public.profiles where id = auth.uid()) is not null
  ) with check (
    (select admin_role from public.profiles where id = auth.uid()) is not null
  );

-- -------------------------------------------------------------
-- 3. ghost_leads — poptávka cílená na ghost subjekt
-- -------------------------------------------------------------
create table if not exists public.ghost_leads (
  id              uuid primary key default gen_random_uuid(),
  ghost_ico       text not null references public.ghost_subjects(ico) on delete cascade,
  request_id      uuid references public.requests(id) on delete set null,
  customer_id     uuid references public.profiles(id) on delete set null,
  customer_name   text,
  customer_phone  text,
  customer_email  text,
  message         text,
  status          text not null default 'new'
                  check (status in ('new','contacted','claimed','rejected','closed')),
  contacted_at    timestamptz,
  contacted_by    uuid references public.profiles(id) on delete set null,
  notes           text,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create index if not exists ghost_leads_ico_idx       on public.ghost_leads(ghost_ico);
create index if not exists ghost_leads_status_idx    on public.ghost_leads(status);
create index if not exists ghost_leads_created_idx   on public.ghost_leads(created_at desc);

alter table public.ghost_leads enable row level security;

-- Customer vidí své vlastní leady
drop policy if exists ghost_leads_customer_read on public.ghost_leads;
create policy ghost_leads_customer_read on public.ghost_leads
  for select using (auth.uid() = customer_id);

-- Customer si může vložit svůj lead (přes API server-side; client side blokované RLS check)
drop policy if exists ghost_leads_customer_insert on public.ghost_leads;
create policy ghost_leads_customer_insert on public.ghost_leads
  for insert with check (auth.uid() = customer_id);

-- Admini vidí + spravují vše
drop policy if exists ghost_leads_admin_all on public.ghost_leads;
create policy ghost_leads_admin_all on public.ghost_leads
  for all using (
    (select admin_role from public.profiles where id = auth.uid()) is not null
  ) with check (
    (select admin_role from public.profiles where id = auth.uid()) is not null
  );

-- updated_at trigger
create or replace function public.touch_ghost_leads_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists ghost_leads_touch_updated_at on public.ghost_leads;
create trigger ghost_leads_touch_updated_at
  before update on public.ghost_leads
  for each row execute function public.touch_ghost_leads_updated_at();
