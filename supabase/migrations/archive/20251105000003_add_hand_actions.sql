-- Hand Actions table
-- 각 핸드에서 발생한 플레이어 액션을 기록하는 테이블
CREATE TABLE IF NOT EXISTS hand_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  street TEXT,
  amount BIGINT DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add action_order column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='hand_actions' AND column_name='action_order') THEN
    ALTER TABLE hand_actions ADD COLUMN action_order INTEGER;
  END IF;
END $$;

-- Add constraints if not exists (PostgreSQL doesn't support IF NOT EXISTS for constraints)
DO $$
BEGIN
  -- Add action_type constraint
  IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage
                 WHERE table_name='hand_actions' AND constraint_name='hand_actions_action_type_check') THEN
    ALTER TABLE hand_actions ADD CONSTRAINT hand_actions_action_type_check
      CHECK (action_type IN ('fold', 'check', 'call', 'bet', 'raise', 'all-in', 'show', 'muck', 'win'));
  END IF;

  -- Add street constraint
  IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage
                 WHERE table_name='hand_actions' AND constraint_name='hand_actions_street_check') THEN
    ALTER TABLE hand_actions ADD CONSTRAINT hand_actions_street_check
      CHECK (street IN ('preflop', 'flop', 'turn', 'river', 'showdown'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hand_actions_hand_id ON hand_actions(hand_id);
CREATE INDEX IF NOT EXISTS idx_hand_actions_player_id ON hand_actions(player_id);
CREATE INDEX IF NOT EXISTS idx_hand_actions_hand_order ON hand_actions(hand_id, action_order);
CREATE INDEX IF NOT EXISTS idx_hand_actions_street ON hand_actions(hand_id, street);

-- Comment
COMMENT ON TABLE hand_actions IS '각 핸드에서 발생한 플레이어 액션 기록';
COMMENT ON COLUMN hand_actions.action_type IS '액션 타입: fold, check, call, bet, raise, all-in, show, muck, win';
COMMENT ON COLUMN hand_actions.street IS '스트릿: preflop, flop, turn, river, showdown';
COMMENT ON COLUMN hand_actions.amount IS '액션 금액 (fold/check는 0)';
COMMENT ON COLUMN hand_actions.action_order IS '핸드 내에서의 액션 순서 (1부터 시작)';
