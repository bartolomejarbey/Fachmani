-- Backfill: create profiles for all verified auth.users who are missing one
INSERT INTO public.profiles (id, email, full_name, role, is_verified, subscription_type, monthly_offers_count)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  COALESCE(u.raw_user_meta_data->>'role', 'customer'),
  false,
  'free',
  0
FROM auth.users u
WHERE u.email_confirmed_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- Create provider_profiles for providers who don't have one yet
INSERT INTO public.provider_profiles (user_id)
SELECT p.id
FROM public.profiles p
WHERE p.role = 'provider'
  AND NOT EXISTS (SELECT 1 FROM public.provider_profiles pp WHERE pp.user_id = p.id);
