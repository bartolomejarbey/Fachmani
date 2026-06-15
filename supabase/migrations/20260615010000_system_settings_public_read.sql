-- system_settings měl SELECT jen pro adminy → klient (useSettings, promo banner,
-- feature_flags v navbaru) nemohl číst konfiguraci a padal na hardcoded defaulty.
-- Tyto klíče jsou NEcitlivá veřejná konfigurace (limity, ceny, flagy, promo) — povolíme
-- veřejné čtení whitelistu klíčů. Admin SELECT/UPDATE politiky zůstávají.
DROP POLICY IF EXISTS "Public can read config settings" ON public.system_settings;
CREATE POLICY "Public can read config settings" ON public.system_settings
  FOR SELECT
  USING (key IN ('platform_settings', 'pricing', 'subscription_prices', 'feature_flags', 'promo_campaign'));
