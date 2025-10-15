-- Add player notes and tags table
CREATE TABLE IF NOT EXISTS player_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  user_id UUID,  -- Future: for multi-user support
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add player tags table
CREATE TABLE IF NOT EXISTS player_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  color TEXT DEFAULT 'gray',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, tag)
);

-- Add play style to players table
ALTER TABLE players
ADD COLUMN IF NOT EXISTS play_style TEXT CHECK (play_style IN ('TAG', 'LAG', 'Tight', 'Loose', 'Unknown')),
ADD COLUMN IF NOT EXISTS vpip DECIMAL(5,2),  -- Voluntarily Put money In Pot
ADD COLUMN IF NOT EXISTS pfr DECIMAL(5,2),   -- Pre-Flop Raise
ADD COLUMN IF NOT EXISTS three_bet DECIMAL(5,2),  -- 3-Bet percentage
ADD COLUMN IF NOT EXISTS ats DECIMAL(5,2),   -- Attempt To Steal
ADD COLUMN IF NOT EXISTS wtsd DECIMAL(5,2),  -- Went To ShowDown
ADD COLUMN IF NOT EXISTS stats_updated_at TIMESTAMPTZ;

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_player_notes_player_id ON player_notes(player_id);
CREATE INDEX IF NOT EXISTS idx_player_tags_player_id ON player_tags(player_id);
CREATE INDEX IF NOT EXISTS idx_players_play_style ON players(play_style);

-- Comments for documentation
COMMENT ON COLUMN players.play_style IS 'Playing style classification: TAG (Tight Aggressive), LAG (Loose Aggressive), Tight, Loose';
COMMENT ON COLUMN players.vpip IS 'Voluntarily Put money In Pot (%)';
COMMENT ON COLUMN players.pfr IS 'Pre-Flop Raise (%)';
COMMENT ON COLUMN players.three_bet IS '3-Bet percentage (%)';
COMMENT ON COLUMN players.ats IS 'Attempt To Steal blinds (%)';
COMMENT ON COLUMN players.wtsd IS 'Went To ShowDown (%)';
COMMENT ON TABLE player_notes IS 'User notes about players';
COMMENT ON TABLE player_tags IS 'Tags for categorizing players';
