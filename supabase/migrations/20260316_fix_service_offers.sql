-- Fix service_offers table to match frontend code expectations
-- The frontend uses: provider_id, is_active, category_id, title, description,
-- location, price_from, price_to, price_type, image_url, created_at

-- Add missing columns if they don't exist
ALTER TABLE service_offers ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES profiles(id);
ALTER TABLE service_offers ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE service_offers ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE service_offers ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id);
ALTER TABLE service_offers ADD COLUMN IF NOT EXISTS price_from integer;
ALTER TABLE service_offers ADD COLUMN IF NOT EXISTS price_to integer;
ALTER TABLE service_offers ADD COLUMN IF NOT EXISTS price_type text DEFAULT 'fixed';
ALTER TABLE service_offers ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE service_offers ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE service_offers ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE service_offers ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- If table was created with user_id instead of provider_id, copy data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_offers' AND column_name='user_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_offers' AND column_name='provider_id') THEN
    UPDATE service_offers SET provider_id = user_id WHERE provider_id IS NULL AND user_id IS NOT NULL;
  END IF;
END $$;

-- If table was created with status instead of is_active, copy data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_offers' AND column_name='status')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_offers' AND column_name='is_active') THEN
    UPDATE service_offers SET is_active = (status = 'active') WHERE is_active IS NULL;
  END IF;
END $$;

-- Ensure RLS
ALTER TABLE service_offers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view active service offers" ON service_offers;
DROP POLICY IF EXISTS "Users can manage own service offers" ON service_offers;
DROP POLICY IF EXISTS "service_offers_select_active" ON service_offers;
DROP POLICY IF EXISTS "service_offers_insert_own" ON service_offers;
DROP POLICY IF EXISTS "service_offers_update_own" ON service_offers;
DROP POLICY IF EXISTS "service_offers_delete_own" ON service_offers;

-- Create policies
CREATE POLICY "service_offers_select_active" ON service_offers
  FOR SELECT USING (is_active = true OR provider_id = auth.uid());

CREATE POLICY "service_offers_insert_own" ON service_offers
  FOR INSERT WITH CHECK (provider_id = auth.uid());

CREATE POLICY "service_offers_update_own" ON service_offers
  FOR UPDATE USING (provider_id = auth.uid());

CREATE POLICY "service_offers_delete_own" ON service_offers
  FOR DELETE USING (provider_id = auth.uid());
