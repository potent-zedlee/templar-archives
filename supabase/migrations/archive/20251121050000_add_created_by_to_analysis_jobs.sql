-- Add created_by column to analysis_jobs table
-- This column tracks which user created the analysis job, required for rate limiting

ALTER TABLE analysis_jobs
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;

COMMENT ON COLUMN analysis_jobs.created_by IS 'User who created this analysis job (for rate limiting)';

-- Add index for efficient querying by creator
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_by
ON analysis_jobs(created_by)
WHERE status IN ('pending', 'processing');

-- Update RLS policies to include created_by in INSERT
-- Note: Service role already has full access via existing policy
