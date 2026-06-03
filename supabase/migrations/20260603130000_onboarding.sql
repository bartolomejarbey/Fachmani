-- =============================================================
-- Onboarding gate — sloupec profiles.onboarded_at (2026-06-03)
-- Po nové registraci se uživateli při prvním vstupu zobrazí /onboarding.
-- Stávající uživatelé se backfillnou (now()), aby je to neotravovalo.
-- Noví uživatelé (callback upsert nenastavuje onboarded_at) → NULL → onboarding.
-- =============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- Backfill existujících účtů — ty onboarding viděly/nepotřebují.
UPDATE public.profiles SET onboarded_at = now() WHERE onboarded_at IS NULL;
