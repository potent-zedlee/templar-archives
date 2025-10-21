-- Add game_type field to tournaments table
-- Migration: 20251022000001_add_game_type_to_tournaments

-- Add game_type column with default value 'tournament'
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS game_type TEXT NOT NULL DEFAULT 'tournament'
CHECK (game_type IN ('tournament', 'cash-game'));

-- Add index for game_type filtering
CREATE INDEX IF NOT EXISTS idx_tournaments_game_type ON tournaments(game_type);

-- Add comment to explain the column
COMMENT ON COLUMN tournaments.game_type IS 'Type of poker game: tournament or cash-game';
