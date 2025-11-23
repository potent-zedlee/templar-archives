-- Add analysis metadata columns to hands table
-- These columns store information about how the hand was analyzed (manually or automatically)

-- Add analyzed_by column (manual | auto)
ALTER TABLE hands ADD COLUMN IF NOT EXISTS analyzed_by TEXT;

-- Add analysis_confidence column (0-1, only for auto-analyzed hands)
ALTER TABLE hands ADD COLUMN IF NOT EXISTS analysis_confidence FLOAT;

-- Add analysis_metadata column (JSON metadata about the analysis)
ALTER TABLE hands ADD COLUMN IF NOT EXISTS analysis_metadata JSONB;

-- Add check constraint for analyzed_by
ALTER TABLE hands DROP CONSTRAINT IF EXISTS check_analyzed_by;
ALTER TABLE hands ADD CONSTRAINT check_analyzed_by
  CHECK (analyzed_by IS NULL OR analyzed_by IN ('manual', 'auto'));

-- Add check constraint for analysis_confidence (must be between 0 and 1)
ALTER TABLE hands DROP CONSTRAINT IF EXISTS check_analysis_confidence_range;
ALTER TABLE hands ADD CONSTRAINT check_analysis_confidence_range
  CHECK (analysis_confidence IS NULL OR (analysis_confidence >= 0 AND analysis_confidence <= 1));

-- Add index for analyzing queries by analysis method
CREATE INDEX IF NOT EXISTS idx_hands_analyzed_by ON hands(analyzed_by);

-- Add index for filtering by confidence
CREATE INDEX IF NOT EXISTS idx_hands_analysis_confidence ON hands(analysis_confidence)
  WHERE analysis_confidence IS NOT NULL;

-- Add comment
COMMENT ON COLUMN hands.analyzed_by IS 'How the hand was analyzed: manual (user input) or auto (AI extraction)';
COMMENT ON COLUMN hands.analysis_confidence IS 'AI confidence score (0-1) for auto-analyzed hands';
COMMENT ON COLUMN hands.analysis_metadata IS 'Metadata about the analysis (iterations, layout, engine version, etc.)';
