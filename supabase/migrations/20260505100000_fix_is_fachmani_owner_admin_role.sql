-- Fix is_fachmani_owner() so RLS policies on bot_* tables accept admin_role
-- master_admin users. Original definition only checked profiles.role IN
-- ('fachmani_owner','admin','owner') — but admin users in this project use
-- profiles.admin_role ('master_admin','admin','sales') and may have
-- profiles.role = 'provider'/'customer'/null.

CREATE OR REPLACE FUNCTION public.is_fachmani_owner()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND (
            role IN ('fachmani_owner', 'admin', 'owner')
            OR admin_role IN ('master_admin', 'admin', 'owner', 'fachmani_owner')
          )
    );
$$;
