-- Fix RLS Policies: Admin-Only Access for Core Tables
-- Security Enhancement: Prevent privilege escalation
-- Only admins and high_templar can modify core archive data

-- ========================================
-- DROP INSECURE POLICIES (6 core tables)
-- ========================================

-- Tournaments
DROP POLICY IF EXISTS "Authenticated users can insert tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can update tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can delete tournaments" ON tournaments;

-- Sub Events
DROP POLICY IF EXISTS "Authenticated users can insert sub_events" ON sub_events;
DROP POLICY IF EXISTS "Authenticated users can update sub_events" ON sub_events;
DROP POLICY IF EXISTS "Authenticated users can delete sub_events" ON sub_events;

-- Days
DROP POLICY IF EXISTS "Authenticated users can insert days" ON days;
DROP POLICY IF EXISTS "Authenticated users can update days" ON days;
DROP POLICY IF EXISTS "Authenticated users can delete days" ON days;

-- Hands
DROP POLICY IF EXISTS "Authenticated users can insert hands" ON hands;
DROP POLICY IF EXISTS "Authenticated users can update hands" ON hands;
DROP POLICY IF EXISTS "Authenticated users can delete hands" ON hands;

-- Players
DROP POLICY IF EXISTS "Authenticated users can insert players" ON players;
DROP POLICY IF EXISTS "Authenticated users can update players" ON players;
DROP POLICY IF EXISTS "Authenticated users can delete players" ON players;

-- Hand Players
DROP POLICY IF EXISTS "Authenticated users can insert hand_players" ON hand_players;
DROP POLICY IF EXISTS "Authenticated users can update hand_players" ON hand_players;
DROP POLICY IF EXISTS "Authenticated users can delete hand_players" ON hand_players;

-- ========================================
-- CREATE SECURE POLICIES (Admin-Only)
-- ========================================

-- ========================================
-- TOURNAMENTS TABLE
-- ========================================

CREATE POLICY "Admins can insert tournaments"
  ON tournaments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Admins can update tournaments"
  ON tournaments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Admins can delete tournaments"
  ON tournaments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

-- ========================================
-- SUB_EVENTS TABLE
-- ========================================

CREATE POLICY "Admins can insert sub_events"
  ON sub_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Admins can update sub_events"
  ON sub_events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Admins can delete sub_events"
  ON sub_events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

-- ========================================
-- DAYS TABLE
-- ========================================

CREATE POLICY "Admins can insert days"
  ON days
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Admins can update days"
  ON days
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Admins can delete days"
  ON days
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

-- ========================================
-- HANDS TABLE
-- ========================================

CREATE POLICY "Admins can insert hands"
  ON hands
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Admins can update hands"
  ON hands
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Admins can delete hands"
  ON hands
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

-- ========================================
-- PLAYERS TABLE
-- ========================================

CREATE POLICY "Admins can insert players"
  ON players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Admins can update players"
  ON players
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Admins can delete players"
  ON players
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

-- ========================================
-- HAND_PLAYERS TABLE
-- ========================================

CREATE POLICY "Admins can insert hand_players"
  ON hand_players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Admins can update hand_players"
  ON hand_players
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Admins can delete hand_players"
  ON hand_players
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON POLICY "Admins can insert tournaments" ON tournaments
  IS 'Security: Only admins and high_templar can create tournaments';

COMMENT ON POLICY "Admins can update tournaments" ON tournaments
  IS 'Security: Only admins and high_templar can modify tournaments';

COMMENT ON POLICY "Admins can delete tournaments" ON tournaments
  IS 'Security: Only admins and high_templar can delete tournaments';

COMMENT ON POLICY "Admins can insert sub_events" ON sub_events
  IS 'Security: Only admins and high_templar can create sub events';

COMMENT ON POLICY "Admins can update sub_events" ON sub_events
  IS 'Security: Only admins and high_templar can modify sub events';

COMMENT ON POLICY "Admins can delete sub_events" ON sub_events
  IS 'Security: Only admins and high_templar can delete sub events';

COMMENT ON POLICY "Admins can insert days" ON days
  IS 'Security: Only admins and high_templar can create days';

COMMENT ON POLICY "Admins can update days" ON days
  IS 'Security: Only admins and high_templar can modify days';

COMMENT ON POLICY "Admins can delete days" ON days
  IS 'Security: Only admins and high_templar can delete days';

COMMENT ON POLICY "Admins can insert hands" ON hands
  IS 'Security: Only admins and high_templar can create hands';

COMMENT ON POLICY "Admins can update hands" ON hands
  IS 'Security: Only admins and high_templar can modify hands';

COMMENT ON POLICY "Admins can delete hands" ON hands
  IS 'Security: Only admins and high_templar can delete hands';

COMMENT ON POLICY "Admins can insert players" ON players
  IS 'Security: Only admins and high_templar can create players';

COMMENT ON POLICY "Admins can update players" ON players
  IS 'Security: Only admins and high_templar can modify players';

COMMENT ON POLICY "Admins can delete players" ON players
  IS 'Security: Only admins and high_templar can delete players';

COMMENT ON POLICY "Admins can insert hand_players" ON hand_players
  IS 'Security: Only admins and high_templar can create hand_players';

COMMENT ON POLICY "Admins can update hand_players" ON hand_players
  IS 'Security: Only admins and high_templar can modify hand_players';

COMMENT ON POLICY "Admins can delete hand_players" ON hand_players
  IS 'Security: Only admins and high_templar can delete hand_players';
