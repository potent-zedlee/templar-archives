-- =====================================================
-- Fix RLS SELECT Policies for tournaments and sub_events
-- =====================================================
-- Purpose: Ensure public read access works in production
-- Issue: 400 error when reading tournaments table from frontend
-- Solution: Drop and recreate SELECT policies with explicit permissions

-- =====================================================
-- 1. TOURNAMENTS TABLE
-- =====================================================

-- Drop existing SELECT policies (if any)
DROP POLICY IF EXISTS "Anyone can view tournaments" ON tournaments;
DROP POLICY IF EXISTS "Tournaments are viewable" ON tournaments;
DROP POLICY IF EXISTS "Public can read tournaments" ON tournaments;

-- Create new public SELECT policy
CREATE POLICY "Public can read tournaments"
  ON tournaments
  FOR SELECT
  TO public
  USING (true);

COMMENT ON POLICY "Public can read tournaments" ON tournaments IS
'Allow anonymous and authenticated users to read all tournaments.
Required for Archive page and homepage.';

-- =====================================================
-- 2. SUB_EVENTS TABLE
-- =====================================================

-- Drop existing SELECT policies (if any)
DROP POLICY IF EXISTS "Anyone can view sub_events" ON sub_events;
DROP POLICY IF EXISTS "Sub events are viewable" ON sub_events;
DROP POLICY IF EXISTS "Public can read sub_events" ON sub_events;

-- Create new public SELECT policy
CREATE POLICY "Public can read sub_events"
  ON sub_events
  FOR SELECT
  TO public
  USING (true);

COMMENT ON POLICY "Public can read sub_events" ON sub_events IS
'Allow anonymous and authenticated users to read all sub_events.
Required for Archive navigation.';

-- =====================================================
-- 3. STREAMS TABLE
-- =====================================================

-- Drop existing SELECT policies (if any)
DROP POLICY IF EXISTS "Anyone can view streams" ON streams;
DROP POLICY IF EXISTS "Streams are viewable" ON streams;
DROP POLICY IF EXISTS "Public can read streams" ON streams;

-- Create new public SELECT policy
CREATE POLICY "Public can read streams"
  ON streams
  FOR SELECT
  TO public
  USING (true);

COMMENT ON POLICY "Public can read streams" ON streams IS
'Allow anonymous and authenticated users to read all streams.
Required for Archive day navigation.';

-- =====================================================
-- 4. HANDS TABLE
-- =====================================================

-- Drop existing SELECT policies (if any)
DROP POLICY IF EXISTS "Anyone can view hands" ON hands;
DROP POLICY IF EXISTS "Hands are viewable" ON hands;
DROP POLICY IF EXISTS "Public can read hands" ON hands;

-- Create new public SELECT policy
CREATE POLICY "Public can read hands"
  ON hands
  FOR SELECT
  TO public
  USING (true);

COMMENT ON POLICY "Public can read hands" ON hands IS
'Allow anonymous and authenticated users to read all hands.
Required for Hand viewer.';

-- =====================================================
-- 5. PLAYERS TABLE
-- =====================================================

-- Drop existing SELECT policies (if any)
DROP POLICY IF EXISTS "Anyone can view players" ON players;
DROP POLICY IF EXISTS "Players are viewable" ON players;
DROP POLICY IF EXISTS "Public can read players" ON players;

-- Create new public SELECT policy
CREATE POLICY "Public can read players"
  ON players
  FOR SELECT
  TO public
  USING (true);

COMMENT ON POLICY "Public can read players" ON players IS
'Allow anonymous and authenticated users to read all players.
Required for Player profiles.';

-- =====================================================
-- 6. HAND_PLAYERS TABLE
-- =====================================================

-- Drop existing SELECT policies (if any)
DROP POLICY IF EXISTS "Anyone can view hand_players" ON hand_players;
DROP POLICY IF EXISTS "Hand players are viewable" ON hand_players;
DROP POLICY IF EXISTS "Public can read hand_players" ON hand_players;

-- Create new public SELECT policy
CREATE POLICY "Public can read hand_players"
  ON hand_players
  FOR SELECT
  TO public
  USING (true);

COMMENT ON POLICY "Public can read hand_players" ON hand_players IS
'Allow anonymous and authenticated users to read all hand_players.
Required for Hand analysis.';

-- =====================================================
-- 7. HAND_ACTIONS TABLE
-- =====================================================

-- Drop existing SELECT policies (if any)
DROP POLICY IF EXISTS "Anyone can view hand_actions" ON hand_actions;
DROP POLICY IF EXISTS "Hand actions are viewable" ON hand_actions;
DROP POLICY IF EXISTS "Public can read hand_actions" ON hand_actions;

-- Create new public SELECT policy
CREATE POLICY "Public can read hand_actions"
  ON hand_actions
  FOR SELECT
  TO public
  USING (true);

COMMENT ON POLICY "Public can read hand_actions" ON hand_actions IS
'Allow anonymous and authenticated users to read all hand_actions.
Required for Hand history playback.';

-- =====================================================
-- 8. Verify RLS is enabled on all tables
-- =====================================================

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE hands ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand_actions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'RLS SELECT Policy Fix Applied';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Fixed Tables:';
  RAISE NOTICE '  - tournaments: Public SELECT enabled';
  RAISE NOTICE '  - sub_events: Public SELECT enabled';
  RAISE NOTICE '  - streams: Public SELECT enabled';
  RAISE NOTICE '  - hands: Public SELECT enabled';
  RAISE NOTICE '  - players: Public SELECT enabled';
  RAISE NOTICE '  - hand_players: Public SELECT enabled';
  RAISE NOTICE '  - hand_actions: Public SELECT enabled';
  RAISE NOTICE '';
  RAISE NOTICE 'All policies use "TO public" and "USING (true)"';
  RAISE NOTICE 'This allows both anonymous and authenticated users to read.';
  RAISE NOTICE '============================================================';
END $$;
