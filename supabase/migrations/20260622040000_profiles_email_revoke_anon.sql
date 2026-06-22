-- =============================================================
-- Audit fix (high, GDPR): profiles_select_all USING(true) + anon TABLE-level SELECT
-- → NEpřihlášený útočník přes public anon klíč hromadně vytáhne PII celé báze:
--   GET /rest/v1/profiles?select=email,phone,full_name,location,ico,bank_account
-- Column-level REVOKE(email/phone) NEFUNGOVALO, protože anon má i TABLE-level SELECT,
-- který pokrývá všechny sloupce (proto i dřívější „REVOKE phone" byl bez efektu).
--
-- Správně: odebrat anonu table-level SELECT a vrátit GRANT jen na veřejně bezpečné
-- sloupce (potřebné pro katalog /fachmani, profil /fachman/[id], homepage, vyhledávání).
-- Citlivé sloupce (email, phone, bank_*, sms_*, admin_role, legal_address, ares_payload,
-- cancellation, subscription_expires_at) zůstanou anonu nedostupné.
--
-- AUTHENTICATED necháváme beze změny — self profil + admin čtou e-mail/telefon přes
-- přihlášený JWT; granulární per-řádek skrytí pro ostatní authenticated řeší RPC
-- (get_provider_phone) a je sledováno samostatně.
-- =============================================================

REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  id, full_name, role, is_verified, verified_at, avatar_url, created_at, updated_at,
  subscription_type, description, location, location_legacy, ico, region_id, district_id,
  ares_verified_at, ares_verified_name, search_tsv, bank_verification_status,
  trial_until, trial_offers_used, avg_rating, review_count, onboarded_at,
  monthly_offers_count, monthly_offers_reset_at, monthly_request_count, monthly_request_reset_at,
  monthly_post_count, monthly_post_reset_at, monthly_urgent_count, monthly_urgent_reset_at,
  daily_request_count, daily_request_reset_at, daily_request_extras, push_opt_in,
  trial_warning_sent_at, trial_grace_email_sent_at, trial_blocked_email_sent_at
) ON public.profiles TO anon;

COMMENT ON COLUMN public.profiles.email IS
  'PII — anon nemá SELECT (table grant odebrán, email mimo column grant). Čtou self/admin (authenticated) + service-role.';
