-- Add retry_count column to analysis_jobs table
-- This column tracks retry attempts for failed jobs, matching Worker expectations

ALTER TABLE analysis_jobs
ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0
CHECK (retry_count >= 0 AND retry_count <= 10);

COMMENT ON COLUMN analysis_jobs.retry_count IS 'Number of retry attempts for failed jobs (max 3 per Worker config)';

-- Add index for efficient querying of retry status
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_retry_count
ON analysis_jobs(retry_count)
WHERE status IN ('pending', 'failed');
