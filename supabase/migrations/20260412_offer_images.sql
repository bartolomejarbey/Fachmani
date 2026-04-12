-- Add images column to offers for portfolio photos
ALTER TABLE offers ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
