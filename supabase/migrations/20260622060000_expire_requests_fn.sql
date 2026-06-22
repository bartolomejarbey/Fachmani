-- =============================================================
-- Audit fix (medium, funkční): poptávky se NIKDY neexpirovaly — expire_old_requests
-- RPC v migracích chyběl (jen falešný „cron" komentář). Aktivní poptávky po expires_at
-- zůstávaly 'active' → fachmani reagovali na mrtvé poptávky, nesprávné výpisy.
-- =============================================================

-- Funkce existovala (void return), jen se nikdy nevolala (chyběl cron). Sjednotíme na
-- integer return (počet expirovaných) pro cron reporting.
DROP FUNCTION IF EXISTS public.expire_old_requests();
CREATE OR REPLACE FUNCTION public.expire_old_requests()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected INT;
BEGIN
  WITH expired AS (
    UPDATE public.requests
       SET status = 'closed_expired'
     WHERE status = 'active'
       AND expires_at IS NOT NULL
       AND expires_at <= NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO affected FROM expired;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_old_requests() FROM public, anon, authenticated;
