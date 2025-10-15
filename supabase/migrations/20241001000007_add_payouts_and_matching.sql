-- Event payouts table (tournament prize distribution)
CREATE TABLE event_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_event_id UUID NOT NULL REFERENCES sub_events(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  prize_amount BIGINT NOT NULL, -- Stored in cents (e.g., $10M = 1,000,000,000)
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  matched_status TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (matched_status IN ('auto', 'manual', 'unmatched')),
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sub_event_id, rank)
);

-- Add aliases column to players table for name matching
ALTER TABLE players ADD COLUMN IF NOT EXISTS aliases TEXT[];

-- Indexes for better query performance
CREATE INDEX idx_event_payouts_sub_event_id ON event_payouts(sub_event_id);
CREATE INDEX idx_event_payouts_player_id ON event_payouts(player_id);
CREATE INDEX idx_event_payouts_matched_status ON event_payouts(matched_status);

-- GIN index for array search on aliases
CREATE INDEX idx_players_aliases ON players USING GIN(aliases);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_event_payouts_updated_at
  BEFORE UPDATE ON event_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE event_payouts IS 'Stores tournament prize payouts with player matching status';
COMMENT ON COLUMN event_payouts.prize_amount IS 'Prize amount in cents (e.g., $10,000,000 = 1000000000)';
COMMENT ON COLUMN event_payouts.matched_status IS 'Player matching status: auto (auto-matched), manual (manually matched), unmatched (not yet matched)';
COMMENT ON COLUMN players.aliases IS 'Alternative names for player matching (e.g., nicknames, variations)';
