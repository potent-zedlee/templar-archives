-- Make sub_event_id nullable to allow unsorted videos
ALTER TABLE days ALTER COLUMN sub_event_id DROP NOT NULL;

-- Add columns to track organization status
ALTER TABLE days ADD COLUMN IF NOT EXISTS is_organized BOOLEAN DEFAULT FALSE;
ALTER TABLE days ADD COLUMN IF NOT EXISTS organized_at TIMESTAMPTZ;
ALTER TABLE days ADD COLUMN IF NOT EXISTS video_source TEXT CHECK (video_source IN ('youtube', 'local', 'nas'));

-- Update existing days to be organized
UPDATE days SET is_organized = TRUE WHERE sub_event_id IS NOT NULL;

-- Create index for unsorted videos query
CREATE INDEX IF NOT EXISTS idx_days_is_organized ON days(is_organized) WHERE is_organized = FALSE;

-- Function to get unsorted videos
CREATE OR REPLACE FUNCTION get_unsorted_videos()
RETURNS TABLE (
  id UUID,
  name TEXT,
  video_url TEXT,
  video_file TEXT,
  video_source TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.name,
    d.video_url,
    d.video_file,
    d.video_source,
    d.created_at
  FROM days d
  WHERE d.sub_event_id IS NULL
    AND d.is_organized = FALSE
  ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to move video to sub_event
CREATE OR REPLACE FUNCTION organize_video(
  p_day_id UUID,
  p_sub_event_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE days
  SET
    sub_event_id = p_sub_event_id,
    is_organized = TRUE,
    organized_at = NOW()
  WHERE id = p_day_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to create unsorted video
CREATE OR REPLACE FUNCTION create_unsorted_video(
  p_name TEXT,
  p_video_url TEXT DEFAULT NULL,
  p_video_file TEXT DEFAULT NULL,
  p_video_source TEXT DEFAULT 'youtube'
)
RETURNS UUID AS $$
DECLARE
  v_day_id UUID;
BEGIN
  INSERT INTO days (name, video_url, video_file, video_source, sub_event_id, is_organized)
  VALUES (p_name, p_video_url, p_video_file, p_video_source, NULL, FALSE)
  RETURNING id INTO v_day_id;

  RETURN v_day_id;
END;
$$ LANGUAGE plpgsql;

-- RLS Policy: Allow anyone to read unsorted videos (where sub_event_id is NULL)
CREATE POLICY "Anyone can read unsorted videos" ON days
  FOR SELECT
  USING (sub_event_id IS NULL AND is_organized = FALSE);

-- RLS Policy: Allow anyone to create unsorted videos
CREATE POLICY "Anyone can create unsorted videos" ON days
  FOR INSERT
  WITH CHECK (sub_event_id IS NULL AND is_organized = FALSE);

-- RLS Policy: Allow anyone to update unsorted videos (for organizing)
CREATE POLICY "Anyone can organize unsorted videos" ON days
  FOR UPDATE
  USING (sub_event_id IS NULL OR is_organized = FALSE);

-- RLS Policy: Allow anyone to delete unsorted videos
CREATE POLICY "Anyone can delete unsorted videos" ON days
  FOR DELETE
  USING (sub_event_id IS NULL AND is_organized = FALSE);
