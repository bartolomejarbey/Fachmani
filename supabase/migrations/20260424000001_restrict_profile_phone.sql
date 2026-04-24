-- PRIVACY: profiles.phone není veřejné.
-- Telefon je čitelný pouze:
--   1) pro vlastní profil (auth.uid() = provider.id),
--   2) pokud fachman je premium/business (subscription_type in ('premium','business')),
--   3) pokud přihlášený viewer vlastní poptávku (requests), na kterou fachman poslal nabídku (offers).
-- Jinak vrací NULL.
--
-- Implementace: column-level REVOKE SELECT(phone) + SECURITY DEFINER RPC get_provider_phone().

-- === RPC: get_provider_phone ===
create or replace function public.get_provider_phone(p_provider_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    -- vlastní profil
    when auth.uid() = p_provider_id then p.phone
    -- admin (podle fixnuté is_admin() z 20260424000000)
    when public.is_admin() then p.phone
    -- premium/business fachman má veřejný telefon
    when p.subscription_type in ('premium', 'business') then p.phone
    -- viewer je vlastníkem poptávky, na kterou fachman poslal nabídku
    when auth.uid() is not null and exists (
      select 1
      from public.offers o
      join public.requests r on r.id = o.request_id
      where o.provider_id = p_provider_id
        and r.user_id = auth.uid()
    ) then p.phone
    else null
  end
  from public.profiles p
  where p.id = p_provider_id;
$$;

revoke all on function public.get_provider_phone(uuid) from public;
grant execute on function public.get_provider_phone(uuid) to anon, authenticated;

-- === Column-level REVOKE pro phone ===
-- Direct .select('phone') z PostgREST/supabase-js přestane fungovat pro anon i authenticated.
-- Vlastní telefon (edit formulář) se čte přes get_provider_phone(auth.uid()).
revoke select (phone) on public.profiles from anon, authenticated;
