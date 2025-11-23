-- ============================================================
-- Migration: Add status columns to tournaments, sub_events, streams
-- Purpose: Enable draft/published/archived workflow for all content
-- Author: Claude Code
-- Date: 2025-11-13
-- ============================================================

-- ============================================================
-- 1. Create status ENUM type
-- ============================================================

CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');

COMMENT ON TYPE content_status IS 'Content publication status:
  - draft: Being edited, not visible to public
  - published: Completed and visible to public
  - archived: Hidden from public but preserved for historical purposes';

-- ============================================================
-- 2. Add status columns to tournaments
-- ============================================================

ALTER TABLE tournaments
  ADD COLUMN status content_status NOT NULL DEFAULT 'published',
  ADD COLUMN published_by UUID REFERENCES users(id),
  ADD COLUMN published_at TIMESTAMPTZ;

COMMENT ON COLUMN tournaments.status IS 'Tournament publication status';
COMMENT ON COLUMN tournaments.published_by IS 'User who published the tournament';
COMMENT ON COLUMN tournaments.published_at IS 'When the tournament was published';

-- ============================================================
-- 3. Add status columns to sub_events
-- ============================================================

ALTER TABLE sub_events
  ADD COLUMN status content_status NOT NULL DEFAULT 'published',
  ADD COLUMN published_by UUID REFERENCES users(id),
  ADD COLUMN published_at TIMESTAMPTZ;

COMMENT ON COLUMN sub_events.status IS 'Sub-event publication status';
COMMENT ON COLUMN sub_events.published_by IS 'User who published the sub-event';
COMMENT ON COLUMN sub_events.published_at IS 'When the sub-event was published';

-- ============================================================
-- 4. Add status columns to streams
-- ============================================================

ALTER TABLE streams
  ADD COLUMN status content_status NOT NULL DEFAULT 'draft',
  ADD COLUMN published_by UUID REFERENCES users(id),
  ADD COLUMN published_at TIMESTAMPTZ;

COMMENT ON COLUMN streams.status IS 'Stream publication status';
COMMENT ON COLUMN streams.published_by IS 'User who published the stream';
COMMENT ON COLUMN streams.published_at IS 'When the stream was published';

-- ============================================================
-- 5. Migrate existing data
-- ============================================================

-- All existing tournaments and sub_events are already public
UPDATE tournaments SET
  status = 'published',
  published_at = created_at;

UPDATE sub_events SET
  status = 'published',
  published_at = created_at;

-- Streams: is_organized=true → published, is_organized=false → draft
UPDATE streams SET
  status = CASE
    WHEN is_organized = true THEN 'published'::content_status
    ELSE 'draft'::content_status
  END,
  published_at = CASE
    WHEN is_organized = true THEN organized_at
    ELSE NULL
  END;

-- ============================================================
-- 6. Create indexes for efficient queries
-- ============================================================

CREATE INDEX idx_tournaments_status ON tournaments(status) WHERE status = 'published';
CREATE INDEX idx_tournaments_published_at ON tournaments(published_at DESC) WHERE status = 'published';

CREATE INDEX idx_sub_events_status ON sub_events(status) WHERE status = 'published';
CREATE INDEX idx_sub_events_published_at ON sub_events(published_at DESC) WHERE status = 'published';

CREATE INDEX idx_streams_status ON streams(status) WHERE status = 'published';
CREATE INDEX idx_streams_published_at ON streams(published_at DESC) WHERE status = 'published';

-- ============================================================
-- 7. Update RLS policies for public access
-- ============================================================

-- Tournaments: Public can only see published
DROP POLICY IF EXISTS "Anyone can read tournaments" ON tournaments;

CREATE POLICY "Public can read published tournaments" ON tournaments
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admin can read all tournaments" ON tournaments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'reporter')
      AND users.banned_at IS NULL
    )
  );

-- Sub Events: Public can only see published
DROP POLICY IF EXISTS "Anyone can read sub_events" ON sub_events;

CREATE POLICY "Public can read published sub_events" ON sub_events
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admin can read all sub_events" ON sub_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'reporter')
      AND users.banned_at IS NULL
    )
  );

-- Streams: Public can only see published
DROP POLICY IF EXISTS "Anyone can read unsorted streams" ON streams;
DROP POLICY IF EXISTS "Public can read published streams" ON streams;

CREATE POLICY "Public can read published streams" ON streams
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admin can read all streams" ON streams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'reporter')
      AND users.banned_at IS NULL
    )
  );

-- ============================================================
-- 8. Update write policies (Admin only for status changes)
-- ============================================================

-- Tournaments
DROP POLICY IF EXISTS "Admin can manage tournaments" ON tournaments;

CREATE POLICY "Admin can manage tournaments" ON tournaments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

-- Sub Events
DROP POLICY IF EXISTS "Admin can manage sub_events" ON sub_events;

CREATE POLICY "Admin can manage sub_events" ON sub_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

-- Streams
DROP POLICY IF EXISTS "Admin can manage all streams" ON streams;
DROP POLICY IF EXISTS "Admin can manage streams" ON streams;

CREATE POLICY "Admin can manage streams" ON streams
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

-- ============================================================
-- 9. Create helper functions for status management
-- ============================================================

-- Function to publish a tournament
CREATE OR REPLACE FUNCTION publish_tournament(tournament_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE tournaments
  SET
    status = 'published',
    published_by = auth.uid(),
    published_at = NOW()
  WHERE id = tournament_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to publish a sub_event
CREATE OR REPLACE FUNCTION publish_sub_event(sub_event_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE sub_events
  SET
    status = 'published',
    published_by = auth.uid(),
    published_at = NOW()
  WHERE id = sub_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to publish a stream
CREATE OR REPLACE FUNCTION publish_stream(stream_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE streams
  SET
    status = 'published',
    published_by = auth.uid(),
    published_at = NOW()
  WHERE id = stream_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION publish_tournament(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION publish_sub_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION publish_stream(UUID) TO authenticated;

-- ============================================================
-- 10. Add audit trigger for status changes
-- ============================================================

-- Create audit log table if not exists
CREATE TABLE IF NOT EXISTS content_status_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_status content_status,
  new_status content_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO content_status_audit (table_name, record_id, old_status, new_status, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers to tables
DROP TRIGGER IF EXISTS audit_tournament_status ON tournaments;
CREATE TRIGGER audit_tournament_status
  AFTER UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION audit_status_change();

DROP TRIGGER IF EXISTS audit_sub_event_status ON sub_events;
CREATE TRIGGER audit_sub_event_status
  AFTER UPDATE ON sub_events
  FOR EACH ROW
  EXECUTE FUNCTION audit_status_change();

DROP TRIGGER IF EXISTS audit_stream_status ON streams;
CREATE TRIGGER audit_stream_status
  AFTER UPDATE ON streams
  FOR EACH ROW
  EXECUTE FUNCTION audit_status_change();

-- ============================================================
-- Migration complete
-- ============================================================
