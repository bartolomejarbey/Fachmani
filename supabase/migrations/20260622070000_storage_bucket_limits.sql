-- Audit fix (medium): public buckety bez serverových limitů (file_size_limit/allowed_mime_types
-- = null) → klientský 5 MB/MIME limit obejitelný (50 MB, libovolný MIME, SVG XSS). Nastaveny
-- bucket-level limity (5 MB, jen obrázkové MIME).
UPDATE storage.buckets
   SET file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
 WHERE id IN ('posts','avatars','demand-images');
