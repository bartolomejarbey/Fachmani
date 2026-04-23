-- =============================================================
-- ARES — struktura: verifikace IČO + cache ARES odpovědí + rate limit log
-- ARES (Administrativní registr ekonomických subjektů) MF ČR
-- Veřejné REST API v3: https://ares.gov.cz/ekonomicke-subjekty-v-be/rest
-- =============================================================

-- -------------------------------------------------------------
-- 1) CACHE ARES ODPOVĚDÍ
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ares_cache (
  ico         text PRIMARY KEY CHECK (ico ~ '^[0-9]{8}$'),
  payload     jsonb NOT NULL,               -- surová ARES data (name, address, legal_form, ...)
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  status      text NOT NULL DEFAULT 'ok'    -- 'ok' | 'not_found' | 'error'
    CHECK (status IN ('ok','not_found','error'))
);

CREATE INDEX IF NOT EXISTS ares_cache_expires_idx ON public.ares_cache(expires_at);

ALTER TABLE public.ares_cache ENABLE ROW LEVEL SECURITY;

-- Cache je čteno serverovou route (service role) — běžní uživatelé nemusí mít přístup.
-- Pro úplnost přidáme read-only policy pro autentizované uživatele, aby admin page fungovala i bez service role.
DROP POLICY IF EXISTS "ares_cache_select_auth" ON public.ares_cache;
CREATE POLICY "ares_cache_select_auth" ON public.ares_cache
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insert/update/delete pouze přes service role (omezeno implicitně — neadminujeme přes klienta).

-- -------------------------------------------------------------
-- 2) RATE-LIMIT LOG (per IP / per user)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ares_rate_limit (
  id          bigserial PRIMARY KEY,
  key_type    text NOT NULL CHECK (key_type IN ('ip','user')),
  key_value   text NOT NULL,              -- IP nebo user UUID jako text
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ares_rate_limit_lookup_idx
  ON public.ares_rate_limit(key_type, key_value, created_at DESC);

ALTER TABLE public.ares_rate_limit ENABLE ROW LEVEL SECURITY;

-- Žádné veřejné policies — zapisuje pouze server.

-- -------------------------------------------------------------
-- 3) ROZŠÍŘENÍ PROFILU O ARES VERIFIKACI
-- -------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ares_verified_at   timestamptz,
  ADD COLUMN IF NOT EXISTS ares_verified_name text,
  ADD COLUMN IF NOT EXISTS ares_payload       jsonb;

-- -------------------------------------------------------------
-- 4) ČIŠTĚNÍ STARÉHO CACHE (volitelná funkce pro cron)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_ares_cache()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_cache int;
  deleted_rate  int;
BEGIN
  DELETE FROM public.ares_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_cache = ROW_COUNT;

  -- Rate-limit log starší 1 hodiny je irelevantní
  DELETE FROM public.ares_rate_limit WHERE created_at < now() - interval '1 hour';
  GET DIAGNOSTICS deleted_rate = ROW_COUNT;

  RETURN deleted_cache + deleted_rate;
END;
$$;
