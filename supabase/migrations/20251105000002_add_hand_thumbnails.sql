-- Add thumbnail_url column to hands table
ALTER TABLE hands ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Create index for thumbnail_url lookups
CREATE INDEX IF NOT EXISTS idx_hands_thumbnail_url ON hands(thumbnail_url) WHERE thumbnail_url IS NOT NULL;

-- Create hand-thumbnails storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('hand-thumbnails', 'hand-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for hand-thumbnails bucket
CREATE POLICY "Public read access for hand thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'hand-thumbnails');

CREATE POLICY "Admin can upload hand thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hand-thumbnails'
  AND (
    auth.jwt() ->> 'user_role' = 'admin'
    OR auth.jwt() ->> 'user_role' = 'high_templar'
  )
);

CREATE POLICY "Admin can update hand thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hand-thumbnails'
  AND (
    auth.jwt() ->> 'user_role' = 'admin'
    OR auth.jwt() ->> 'user_role' = 'high_templar'
  )
);

CREATE POLICY "Admin can delete hand thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'hand-thumbnails'
  AND (
    auth.jwt() ->> 'user_role' = 'admin'
    OR auth.jwt() ->> 'user_role' = 'high_templar'
  )
);

-- Comment
COMMENT ON COLUMN hands.thumbnail_url IS 'URL of the hand thumbnail image in Supabase Storage';
