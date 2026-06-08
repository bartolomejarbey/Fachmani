-- BEZPEČNOST: grant_extra_request (SECURITY DEFINER, připisuje free extra poptávku)
-- byl volatelný klientem (EXECUTE pro authenticated) → obejití platby z peněženky.
-- Legitimně ho volá jen server (service-role) v app/api/wallet/spend po platbě.
-- Aplikováno na produkci 2026-06-08.
REVOKE EXECUTE ON FUNCTION public.grant_extra_request(uuid) FROM authenticated, anon, public;
