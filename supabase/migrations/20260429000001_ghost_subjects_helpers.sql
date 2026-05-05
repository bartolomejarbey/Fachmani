-- =============================================================
-- Ghost subjects — helpers (PSČ→okres mapping + ISIR flag RPC)
-- Doplnění k 20260429000000_ghost_subjects_structure.sql
-- =============================================================

-- -------------------------------------------------------------
-- 1. PSČ prefixy v public.districts
-- Pole text[] — bootstrap skript hledá lookup od plného PSČ přes
-- 4-ciferný po 3-ciferný prefix. Prázdné pole znamená, že okres
-- nemá namapované PSČ (skript pak district_id pro daný subjekt nechá null).
-- Populace tabulky se dělá zvlášť — buď CSV import z ČSÚ
-- (https://www.czso.cz/csu/rso/uir-zsj_klasifikace), nebo ručně.
-- -------------------------------------------------------------
alter table public.districts
  add column if not exists psc_prefixes text[] default '{}'::text[] not null;

create index if not exists districts_psc_prefixes_gin
  on public.districts using gin(psc_prefixes);

comment on column public.districts.psc_prefixes is
  'Pole PSČ prefixů (3 nebo 4 cifry) pro mapping ARES sídla → okres. Bootstrap skript zkusí v pořadí: full PSČ, 4-cifry, 3-cifry.';

-- -------------------------------------------------------------
-- 2. flag_ghost_subjects_from_isir()
-- Po denním sync ISIR feed se zavolá tato RPC, která označí všechny
-- ghost_subjects, jejichž IČO je v isir_debtors, jako isir_flagged=true.
-- is_active GENERATED column se přepočítá → odpadnou z public RLS read.
-- -------------------------------------------------------------
create or replace function public.flag_ghost_subjects_from_isir()
returns table(flagged_count bigint, unflagged_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flagged   bigint := 0;
  v_unflagged bigint := 0;
begin
  -- 1. Označíme nové insolventní (ICO v isir_debtors a ještě neflaglé)
  with upd as (
    update public.ghost_subjects gs
    set isir_flagged = true,
        isir_flagged_at = now()
    from public.isir_debtors d
    where gs.ico = d.ico
      and gs.isir_flagged = false
    returning 1
  )
  select count(*) into v_flagged from upd;

  -- 2. Pokud subjekt z ISIR vypadl (insolvence skončila), unflag
  with upd2 as (
    update public.ghost_subjects gs
    set isir_flagged = false,
        isir_flagged_at = null
    where gs.isir_flagged = true
      and not exists (
        select 1 from public.isir_debtors d where d.ico = gs.ico
      )
    returning 1
  )
  select count(*) into v_unflagged from upd2;

  return query select v_flagged, v_unflagged;
end;
$$;

revoke all on function public.flag_ghost_subjects_from_isir() from public;
grant execute on function public.flag_ghost_subjects_from_isir()
  to service_role;

comment on function public.flag_ghost_subjects_from_isir() is
  'Synchronizuje ghost_subjects.isir_flagged podle aktuálního stavu isir_debtors. Volá se z scripts/sync-isir-debtors.ts (denně).';
