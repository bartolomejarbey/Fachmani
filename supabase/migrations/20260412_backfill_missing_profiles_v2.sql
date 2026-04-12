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
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL AND u.email_confirmed_at IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Create provider_profiles for providers who don't have one yet
INSERT INTO public.provider_profiles (user_id)
SELECT p.id
FROM public.profiles p
LEFT JOIN public.provider_profiles pp ON pp.user_id = p.id
WHERE p.role = 'provider' AND pp.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
