-- Add published_at column to days table for storing YouTube video upload date
ALTER TABLE days ADD COLUMN published_at TIMESTAMPTZ;

-- Create index for sorting by published date
CREATE INDEX idx_days_published_at ON days(published_at);

-- Add comment
COMMENT ON COLUMN days.published_at IS 'Original upload date from YouTube (or other source)';
