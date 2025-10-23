-- =============================================
-- Tournament Logos Storage Bucket
-- Created: 2025-10-23
-- Description: Supabase Storage 버킷 설정 (tournament-logos)
-- =============================================

-- 1. Create tournament-logos bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tournament-logos',
  'tournament-logos',
  true, -- Public access for reading
  5242880, -- 5MB in bytes
  ARRAY['image/svg+xml', 'image/png', 'image/jpeg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Public read access for tournament logos" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload access for tournament logos" ON storage.objects;
DROP POLICY IF EXISTS "Admin update access for tournament logos" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete access for tournament logos" ON storage.objects;

-- 3. Policy: Anyone can view tournament logos (SELECT)
CREATE POLICY "Public read access for tournament logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tournament-logos');

-- 4. Policy: Admins can upload logos (INSERT)
CREATE POLICY "Admin upload access for tournament logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tournament-logos' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 5. Policy: Admins can update logos (UPDATE)
CREATE POLICY "Admin update access for tournament logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'tournament-logos' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 6. Policy: Admins can delete logos (DELETE)
CREATE POLICY "Admin delete access for tournament logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tournament-logos' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- =============================================
-- Notes:
-- - Public bucket allows anyone to READ logos via public URL
-- - Only admins can INSERT/UPDATE/DELETE logos
-- - File size limit: 5MB
-- - Allowed formats: SVG, PNG, JPEG
-- =============================================
