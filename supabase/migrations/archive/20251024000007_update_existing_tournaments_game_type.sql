-- Update existing tournaments with NULL game_type
-- Migration: 20251024000007_update_existing_tournaments_game_type
-- Purpose: Fix existing tournaments that have NULL game_type after adding the column
--
-- Background:
-- - 20251022000001 added game_type column with DEFAULT 'tournament'
-- - DEFAULT only applies to new INSERT statements, not existing rows
-- - Existing tournaments remained with game_type = NULL
-- - This caused them to be filtered out in /archive/tournament page

-- Update all existing NULL game_type to 'tournament'
UPDATE tournaments
SET game_type = 'tournament'
WHERE game_type IS NULL;

-- Verification query (optional, for documentation)
-- SELECT COUNT(*) FROM tournaments WHERE game_type IS NULL;
-- Expected result: 0

DO $$
BEGIN
  RAISE NOTICE 'Updated existing tournaments with NULL game_type to "tournament"';
  RAISE NOTICE 'All tournaments should now be visible in /archive/tournament page';
END $$;
