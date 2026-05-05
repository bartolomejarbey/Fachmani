-- Adds notified_at column to bot_flagged_replies for email notification cron deduplication.
-- Owned by admin UI integration (fachmani repo), not the fachmani-bot project.

alter table public.bot_flagged_replies
  add column if not exists notified_at timestamptz;

create index if not exists bot_flagged_replies_pending_idx
  on public.bot_flagged_replies (created_at asc)
  where status = 'pending';

create index if not exists bot_flagged_replies_unnotified_idx
  on public.bot_flagged_replies (created_at asc)
  where status = 'pending' and notified_at is null;

-- Enable realtime on the table so the admin badge + list page can subscribe.
-- Idempotent: ALTER PUBLICATION ... ADD TABLE errors if already in publication,
-- so wrap in DO block to swallow duplicate_object.
do $$
begin
  alter publication supabase_realtime add table public.bot_flagged_replies;
exception
  when duplicate_object then null;
  when others then null;
end$$;
