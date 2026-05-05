-- A.F4 — email_sent_at na notifications: cron tahá nezmailované notifikace,
-- pošle Resend mail a nastaví email_sent_at, aby každá notifikace šla mailem jen jednou.

alter table public.notifications
  add column if not exists email_sent_at timestamptz;

create index if not exists notifications_email_pending_idx
  on public.notifications (created_at asc)
  where email_sent_at is null
    and type in ('new_candidate_request', 'auto_match');
