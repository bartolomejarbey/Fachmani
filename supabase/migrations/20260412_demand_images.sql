-- Add images column to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Create storage bucket for demand images
INSERT INTO storage.buckets (id, name, public)
VALUES ('demand-images', 'demand-images', true)
ON CONFLICT DO NOTHING;

-- Policy: authenticated users can upload to their own folder
CREATE POLICY "Users can upload demand images to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'demand-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: anyone can read demand images (public bucket)
CREATE POLICY "Anyone can read demand images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'demand-images');

-- Policy: users can delete their own demand images
CREATE POLICY "Users can delete own demand images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'demand-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
