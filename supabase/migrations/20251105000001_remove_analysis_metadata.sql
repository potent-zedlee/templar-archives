-- Remove Hand Analysis Engine metadata columns from hands table
-- Created: 2025-11-05
-- Reason: Hand Analysis Engine and Sentry monitoring features removed from project

-- Drop indexes
DROP INDEX IF EXISTS idx_hands_analyzed_by;
DROP INDEX IF EXISTS idx_hands_analysis_confidence;

-- Drop constraints
ALTER TABLE hands DROP CONSTRAINT IF EXISTS check_analyzed_by;
ALTER TABLE hands DROP CONSTRAINT IF EXISTS check_analysis_confidence_range;

-- Drop columns
ALTER TABLE hands DROP COLUMN IF EXISTS analyzed_by;
ALTER TABLE hands DROP COLUMN IF EXISTS analysis_confidence;
ALTER TABLE hands DROP COLUMN IF EXISTS analysis_metadata;
