-- Add gender column to players table for Women's Elite Board feature
ALTER TABLE players
ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other'));

-- Add index for performance optimization
CREATE INDEX idx_players_gender ON players(gender) WHERE gender IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN players.gender IS 'Player gender for leaderboard filtering (male/female/other)';
