-- Add Row Level Security (RLS) for public read access to core tables
-- This allows anonymous users to read data but not modify it
-- Required for Vercel production deployment with Next.js Server Components

-- ========================================
-- TOURNAMENTS TABLE
-- ========================================

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Anyone can view tournaments (public read)
CREATE POLICY "Anyone can view tournaments"
  ON tournaments
  FOR SELECT
  USING (true);

-- Only authenticated users can insert tournaments
CREATE POLICY "Authenticated users can insert tournaments"
  ON tournaments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can update tournaments
CREATE POLICY "Authenticated users can update tournaments"
  ON tournaments
  FOR UPDATE
  TO authenticated
  USING (true);

-- Only authenticated users can delete tournaments
CREATE POLICY "Authenticated users can delete tournaments"
  ON tournaments
  FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- SUB_EVENTS TABLE
-- ========================================

ALTER TABLE sub_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sub_events"
  ON sub_events
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert sub_events"
  ON sub_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sub_events"
  ON sub_events
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete sub_events"
  ON sub_events
  FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- DAYS TABLE
-- ========================================

ALTER TABLE days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view days"
  ON days
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert days"
  ON days
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update days"
  ON days
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete days"
  ON days
  FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- HANDS TABLE
-- ========================================

ALTER TABLE hands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hands"
  ON hands
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert hands"
  ON hands
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update hands"
  ON hands
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete hands"
  ON hands
  FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- PLAYERS TABLE
-- ========================================

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view players"
  ON players
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert players"
  ON players
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update players"
  ON players
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete players"
  ON players
  FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- HAND_PLAYERS TABLE
-- ========================================

ALTER TABLE hand_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hand_players"
  ON hand_players
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert hand_players"
  ON hand_players
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update hand_players"
  ON hand_players
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete hand_players"
  ON hand_players
  FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON POLICY "Anyone can view tournaments" ON tournaments
  IS 'Public read access for tournaments - required for homepage and archive';

COMMENT ON POLICY "Anyone can view sub_events" ON sub_events
  IS 'Public read access for sub events - required for archive navigation';

COMMENT ON POLICY "Anyone can view days" ON days
  IS 'Public read access for days - required for video player';

COMMENT ON POLICY "Anyone can view hands" ON hands
  IS 'Public read access for hands - required for hand history viewer';

COMMENT ON POLICY "Anyone can view players" ON players
  IS 'Public read access for players - required for player profiles';

COMMENT ON POLICY "Anyone can view hand_players" ON hand_players
  IS 'Public read access for hand players - required for hand analysis';
