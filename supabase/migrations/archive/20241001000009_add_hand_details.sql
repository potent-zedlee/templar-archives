-- Add pot_size and board_cards to hands table
ALTER TABLE hands
ADD COLUMN pot_size BIGINT DEFAULT 0,
ADD COLUMN board_cards TEXT;

-- Add starting_stack and ending_stack to hand_players table
ALTER TABLE hand_players
ADD COLUMN starting_stack BIGINT DEFAULT 0,
ADD COLUMN ending_stack BIGINT DEFAULT 0;

-- Create hand_actions table for detailed action tracking
CREATE TABLE hand_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  street TEXT NOT NULL CHECK (street IN ('preflop', 'flop', 'turn', 'river')),
  action_type TEXT NOT NULL CHECK (action_type IN ('fold', 'check', 'call', 'bet', 'raise', 'all-in')),
  amount BIGINT DEFAULT 0,
  sequence INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_hand_actions_hand_id ON hand_actions(hand_id);
CREATE INDEX idx_hand_actions_player_id ON hand_actions(player_id);
CREATE INDEX idx_hand_actions_street ON hand_actions(street);
CREATE INDEX idx_hand_actions_sequence ON hand_actions(hand_id, sequence);

-- Add comments for documentation
COMMENT ON COLUMN hands.pot_size IS 'Final pot size in chips';
COMMENT ON COLUMN hands.board_cards IS 'Community cards (e.g., "As Kh Qd 7c 3s")';
COMMENT ON COLUMN hand_players.starting_stack IS 'Player stack at hand start';
COMMENT ON COLUMN hand_players.ending_stack IS 'Player stack at hand end';
COMMENT ON TABLE hand_actions IS 'Detailed action history for each hand';
