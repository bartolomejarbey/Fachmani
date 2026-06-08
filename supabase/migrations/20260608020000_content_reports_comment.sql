-- App Store 1.2 — rozšíření hlášení obsahu o komentáře ve feedu.
-- Komentáře jsou plnohodnotný UGC; přidáváme 'comment' do povolených cílů reportu.

ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_target_type_check;
ALTER TABLE public.content_reports
  ADD CONSTRAINT content_reports_target_type_check
  CHECK (target_type IN ('review', 'message', 'profile', 'post', 'comment'));
