-- Fix missing profiles for auth.users who don't have one
-- This caused foreign key errors when customers tried to create demands
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
WHERE p.id IS NULL;
