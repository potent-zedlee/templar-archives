-- Enable Realtime for analysis_jobs table
-- This allows clients to subscribe to real-time updates on job progress

-- Enable Realtime publication for analysis_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE analysis_jobs;

-- Add result column if not exists (for storing segment results)
ALTER TABLE analysis_jobs ADD COLUMN IF NOT EXISTS result JSONB;

-- Update comment
COMMENT ON COLUMN analysis_jobs.result IS 'Analysis results including segment_results array with status and hands_found per segment';
