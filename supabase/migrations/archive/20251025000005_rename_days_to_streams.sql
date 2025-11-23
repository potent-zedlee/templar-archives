-- Rename 'days' table to 'streams' for better semantic clarity
-- Created: 2025-10-25
-- Purpose: Reflect that each record is a feature table stream/video, not necessarily a "day"

-- ============================================================
-- 1. Rename Table
-- ============================================================

ALTER TABLE days RENAME TO streams;

COMMENT ON TABLE streams IS 'Feature table streams/videos for poker events. Each stream is a broadcast of a specific event.';

-- ============================================================
-- 2. Rename Indexes
-- ============================================================

ALTER INDEX idx_days_sub_event_id RENAME TO idx_streams_sub_event_id;
ALTER INDEX idx_days_is_organized RENAME TO idx_streams_is_organized;

-- ============================================================
-- 3. Rename Sequences (if any)
-- ============================================================

-- No sequences to rename (using UUID primary keys)

-- ============================================================
-- 4. Update Foreign Key Constraint Names in hands table
-- ============================================================

-- The constraint name includes the table name, but we don't need to rename it
-- PostgreSQL will still enforce the constraint correctly
-- However, for clarity, we can rename it

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'hands_day_id_fkey'
    AND table_name = 'hands'
  ) THEN
    ALTER TABLE hands RENAME CONSTRAINT hands_day_id_fkey TO hands_stream_id_fkey;
  END IF;
END $$;

-- ============================================================
-- 5. Rename RLS Policies
-- ============================================================

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can read unsorted videos" ON streams;
DROP POLICY IF EXISTS "Anyone can create unsorted videos" ON streams;
DROP POLICY IF EXISTS "Anyone can organize unsorted videos" ON streams;
DROP POLICY IF EXISTS "Anyone can delete unsorted videos" ON streams;
DROP POLICY IF EXISTS "Admin can manage all days" ON streams;

-- Recreate with new names
CREATE POLICY "Anyone can read unsorted streams" ON streams
  FOR SELECT
  USING (sub_event_id IS NULL AND is_organized = FALSE);

CREATE POLICY "Anyone can create unsorted streams" ON streams
  FOR INSERT
  WITH CHECK (sub_event_id IS NULL AND is_organized = FALSE);

CREATE POLICY "Anyone can organize unsorted streams" ON streams
  FOR UPDATE
  USING (sub_event_id IS NULL OR is_organized = FALSE);

CREATE POLICY "Anyone can delete unsorted streams" ON streams
  FOR DELETE
  USING (sub_event_id IS NULL AND is_organized = FALSE);

CREATE POLICY "Admin can manage all streams" ON streams
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

-- ============================================================
-- 6. Update Functions
-- ============================================================

-- Update get_unsorted_videos function to use streams table
DROP FUNCTION IF EXISTS get_unsorted_videos();

CREATE OR REPLACE FUNCTION get_unsorted_streams()
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
    s.id,
    s.name,
    s.video_url,
    s.video_file,
    s.video_source,
    s.created_at
  FROM streams s
  WHERE s.sub_event_id IS NULL
    AND s.is_organized = FALSE
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_unsorted_streams IS 'Returns all unsorted streams/videos that need to be organized into events';

-- Update organize_video function
DROP FUNCTION IF EXISTS organize_video(UUID, UUID);

CREATE OR REPLACE FUNCTION organize_stream(
  p_stream_id UUID,
  p_sub_event_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE streams
  SET
    sub_event_id = p_sub_event_id,
    is_organized = TRUE,
    organized_at = NOW()
  WHERE id = p_stream_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION organize_stream IS 'Moves a stream from unsorted to a specific sub-event';

-- Update create_unsorted_video function
DROP FUNCTION IF EXISTS create_unsorted_video(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_unsorted_stream(
  p_name TEXT,
  p_video_url TEXT DEFAULT NULL,
  p_video_file TEXT DEFAULT NULL,
  p_video_source TEXT DEFAULT 'youtube'
)
RETURNS UUID AS $$
DECLARE
  v_stream_id UUID;
BEGIN
  INSERT INTO streams (name, video_url, video_file, video_source, sub_event_id, is_organized)
  VALUES (p_name, p_video_url, p_video_file, p_video_source, NULL, FALSE)
  RETURNING id INTO v_stream_id;

  RETURN v_stream_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_unsorted_stream IS 'Creates a new unsorted stream/video that can be organized later';

-- ============================================================
-- 7. Add Column Comments for Clarity
-- ============================================================

COMMENT ON COLUMN streams.id IS 'Unique identifier for the stream';
COMMENT ON COLUMN streams.sub_event_id IS 'Reference to the sub-event (NULL if unsorted)';
COMMENT ON COLUMN streams.name IS 'Name of the stream (e.g., "Day 1", "Final Table")';
COMMENT ON COLUMN streams.video_url IS 'URL to the video (YouTube, etc.)';
COMMENT ON COLUMN streams.video_file IS 'Path to local/NAS video file';
COMMENT ON COLUMN streams.video_source IS 'Source of the video: youtube, local, or nas';
COMMENT ON COLUMN streams.is_organized IS 'Whether the stream has been organized into an event';
COMMENT ON COLUMN streams.organized_at IS 'Timestamp when the stream was organized';
COMMENT ON COLUMN streams.published_at IS 'Original publication date of the video';
COMMENT ON COLUMN streams.created_at IS 'Timestamp when this record was created';

-- ============================================================
-- Migration Complete
-- ============================================================

DO $$
DECLARE
  total_streams INTEGER;
  organized_streams INTEGER;
  unsorted_streams INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_streams FROM streams;
  SELECT COUNT(*) INTO organized_streams FROM streams WHERE is_organized = TRUE;
  SELECT COUNT(*) INTO unsorted_streams FROM streams WHERE is_organized = FALSE;

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Table Rename Migration Completed';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes Applied:';
  RAISE NOTICE '  - Renamed table: days → streams';
  RAISE NOTICE '  - Renamed indexes: idx_days_* → idx_streams_*';
  RAISE NOTICE '  - Updated RLS policies';
  RAISE NOTICE '  - Updated functions: get_unsorted_streams(), organize_stream(), create_unsorted_stream()';
  RAISE NOTICE '';
  RAISE NOTICE 'Current Data:';
  RAISE NOTICE '  - Total streams: %', total_streams;
  RAISE NOTICE '  - Organized: %', organized_streams;
  RAISE NOTICE '  - Unsorted: %', unsorted_streams;
  RAISE NOTICE '============================================================';
END $$;
