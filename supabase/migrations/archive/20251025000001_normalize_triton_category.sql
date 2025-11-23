-- Normalize category capitalization for Triton tournaments
-- Issue: Database contains both 'triton' (lowercase) and 'Triton' (capitalized)
-- Solution: Standardize all to 'Triton' (capitalized)

-- Update tournaments table
UPDATE tournaments
SET category = 'Triton'
WHERE category = 'triton';

-- Add comment
COMMENT ON COLUMN tournaments.category IS 'Tournament category (standardized capitalization)';
