-- HOTFIX: is_admin() kontrolovala špatný sloupec (profiles.role místo profiles.admin_role).
-- profiles.role drží typ uživatele ('provider' | 'customer'), admin práva jsou v profiles.admin_role.
-- Důsledek bugy: všechny RLS policies závislé na is_admin() (search_queries, search_clicks,
-- search_synonyms CRUD v /admin/vyhledavani) tiše selhávají — admin nic nevidí ani neupravuje.
-- Zavedeno v 20260423220000_f4_search_structure.sql, opraveno zde.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and admin_role in ('admin', 'master_admin')
  );
$fn$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
