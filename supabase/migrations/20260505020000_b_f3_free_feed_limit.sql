-- =============================================================
-- B.F3 — Free feed limit
-- Free zákazníci/fachmani mohou publikovat omezený počet příspěvků
-- ve feedu (default 3 / 30 dní). Premium/business = unlimited.
-- Konfigurovatelné přes system_settings.platform_settings.free_feed_posts_per_month.
-- =============================================================

-- 1) Měsíční počítadla feed příspěvků
alter table public.profiles
  add column if not exists monthly_post_count int not null default 0;

alter table public.profiles
  add column if not exists monthly_post_reset_at timestamptz not null default now();

-- 2) Default setting (3 posty / měsíc zdarma)
insert into public.system_settings (key, value)
values ('platform_settings', jsonb_build_object('free_feed_posts_per_month', 3))
on conflict (key) do update
   set value = public.system_settings.value || jsonb_build_object('free_feed_posts_per_month', 3)
 where not (public.system_settings.value ? 'free_feed_posts_per_month');

-- 3) BEFORE INSERT trigger na posts
create or replace function public.check_free_feed_limit()
returns trigger as $$
declare
  v_subscription text;
  v_count int;
  v_reset timestamptz;
  v_limit int;
begin
  if NEW.user_id is null then
    return NEW;
  end if;

  select subscription_type, monthly_post_count, monthly_post_reset_at
    into v_subscription, v_count, v_reset
    from public.profiles where id = NEW.user_id;

  if v_subscription is null then
    return NEW;
  end if;

  if v_subscription in ('premium', 'business') then
    return NEW;
  end if;

  if v_reset < now() - interval '30 days' then
    update public.profiles
       set monthly_post_count = 0,
           monthly_post_reset_at = now()
     where id = NEW.user_id;
    v_count := 0;
  end if;

  select coalesce((value->>'free_feed_posts_per_month')::int, 3)
    into v_limit
    from public.system_settings where key = 'platform_settings';
  if v_limit is null then v_limit := 3; end if;

  if v_count >= v_limit then
    raise exception 'Vyčerpali jste % bezplatných příspěvků za měsíc. Pro více aktivujte Premium.', v_limit
      using errcode = 'check_violation';
  end if;

  update public.profiles
     set monthly_post_count = monthly_post_count + 1
   where id = NEW.user_id;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_check_free_feed_limit on public.posts;
create trigger trg_check_free_feed_limit
  before insert on public.posts
  for each row execute function public.check_free_feed_limit();

comment on function public.check_free_feed_limit is
  'B.F3 — limit počtu feed příspěvků/měsíc pro free uživatele. Premium/business unlimited.';

-- 4) View pro frontend: kolik mi ještě zbývá free postů
create or replace view public.v_my_feed_quota as
  select
    p.id as user_id,
    p.subscription_type,
    p.monthly_post_count,
    p.monthly_post_reset_at,
    coalesce(
      (select (value->>'free_feed_posts_per_month')::int
         from public.system_settings where key = 'platform_settings'),
      3
    ) as monthly_post_limit,
    case
      when p.subscription_type in ('premium', 'business') then null
      else greatest(
        0,
        coalesce(
          (select (value->>'free_feed_posts_per_month')::int
             from public.system_settings where key = 'platform_settings'),
          3
        ) - (
          case when p.monthly_post_reset_at < now() - interval '30 days'
            then 0 else p.monthly_post_count
          end
        )
      )
    end as posts_remaining
  from public.profiles p;

grant select on public.v_my_feed_quota to authenticated;
