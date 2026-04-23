-- =============================================================
-- ARES rate-limit — SECURITY DEFINER RPC
-- Fix: předchozí implementace volala INSERT/SELECT na ares_rate_limit
-- z anon klienta, ale tabulka má RLS ON bez policies → INSERTy tiše
-- failovaly, čítač byl 0, limit nikdy netriggeroval.
-- Řešení: jediná SECURITY DEFINER funkce, která atomicky:
--   1) smaže stale řádky (> 1 min)
--   2) zapíše hit
--   3) spočítá aktuální počet v sliding window
--   4) vrátí {allowed, count, limit, reset_at}
-- =============================================================

CREATE OR REPLACE FUNCTION public.check_ares_rate_limit(
  p_key_type text,
  p_key_value text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now      timestamptz := now();
  v_window   interval    := interval '1 minute';
  v_limit    int;
  v_count    int;
  v_oldest   timestamptz;
  v_reset_at timestamptz;
BEGIN
  IF p_key_type NOT IN ('ip', 'user') THEN
    RAISE EXCEPTION 'check_ares_rate_limit: invalid key_type %, expected ip|user', p_key_type;
  END IF;
  IF p_key_value IS NULL OR length(p_key_value) = 0 OR length(p_key_value) > 128 THEN
    RAISE EXCEPTION 'check_ares_rate_limit: invalid key_value length';
  END IF;

  v_limit := CASE p_key_type WHEN 'ip' THEN 10 WHEN 'user' THEN 30 END;

  DELETE FROM public.ares_rate_limit
   WHERE created_at < v_now - v_window;

  INSERT INTO public.ares_rate_limit(key_type, key_value, created_at)
       VALUES (p_key_type, p_key_value, v_now);

  SELECT count(*), min(created_at)
    INTO v_count, v_oldest
    FROM public.ares_rate_limit
   WHERE key_type = p_key_type
     AND key_value = p_key_value
     AND created_at >= v_now - v_window;

  v_reset_at := COALESCE(v_oldest, v_now) + v_window;

  RETURN jsonb_build_object(
    'allowed',  v_count <= v_limit,
    'count',    v_count,
    'limit',    v_limit,
    'reset_at', v_reset_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_ares_rate_limit(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.check_ares_rate_limit(text, text) TO anon, authenticated;
