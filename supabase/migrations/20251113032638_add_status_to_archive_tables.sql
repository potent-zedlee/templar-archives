-- Add status columns to tournaments, sub_events, and streams tables
-- Phase 37: Archive Status Management

-- Add status to tournaments
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS status text DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Add status to sub_events
ALTER TABLE sub_events
ADD COLUMN IF NOT EXISTS status text DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Add status to streams
ALTER TABLE streams
ADD COLUMN IF NOT EXISTS status text DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS tournaments_status_idx ON tournaments(status);
CREATE INDEX IF NOT EXISTS sub_events_status_idx ON sub_events(status);
CREATE INDEX IF NOT EXISTS streams_status_idx ON streams(status);

-- Update existing records to 'published' for backward compatibility
UPDATE tournaments SET status = 'published' WHERE status IS NULL;
UPDATE sub_events SET status = 'published' WHERE status IS NULL;
UPDATE streams SET status = 'published' WHERE status IS NULL;

-- Comment on columns
COMMENT ON COLUMN tournaments.status IS 'Publication status: draft, published, or archived';
COMMENT ON COLUMN tournaments.published_by IS 'User who published this tournament';
COMMENT ON COLUMN tournaments.published_at IS 'Timestamp when this tournament was published';

COMMENT ON COLUMN sub_events.status IS 'Publication status: draft, published, or archived';
COMMENT ON COLUMN sub_events.published_by IS 'User who published this sub_event';
COMMENT ON COLUMN sub_events.published_at IS 'Timestamp when this sub_event was published';

COMMENT ON COLUMN streams.status IS 'Publication status: draft, published, or archived';
COMMENT ON COLUMN streams.published_by IS 'User who published this stream';
COMMENT ON COLUMN streams.published_at IS 'Timestamp when this stream was published';
