-- Add video source fields to days table
ALTER TABLE days
ADD COLUMN video_source TEXT CHECK (video_source IN ('youtube', 'upload', 'nas')) DEFAULT 'youtube',
ADD COLUMN video_nas_path TEXT;

-- Update existing records to have youtube source
UPDATE days SET video_source = 'youtube' WHERE video_url IS NOT NULL;

-- Add index for video source queries
CREATE INDEX idx_days_video_source ON days(video_source);

-- Add comment for documentation
COMMENT ON COLUMN days.video_source IS 'Source type: youtube (YouTube URL), upload (Supabase Storage), nas (Company NAS)';
COMMENT ON COLUMN days.video_nas_path IS 'NAS file path for company internal videos (e.g., /videos/2024/wsop_main.mp4)';
