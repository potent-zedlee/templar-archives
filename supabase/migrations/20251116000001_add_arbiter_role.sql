-- ===========================
-- 001: Arbiter 역할 추가
-- ===========================
-- Purpose: Add 'arbiter' role for manual hand input specialists
-- Arbiters can create/edit/delete hands but not tournaments/sub_events/streams

-- Step 1: role enum에 'arbiter' 추가
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'templar', 'arbiter', 'high_templar', 'admin'));

-- Step 2: 주석 업데이트
COMMENT ON COLUMN public.users.role IS 'User role: user, templar (community moderator), arbiter (hand curator), high_templar (archive manager), admin (full access)';

-- Step 3: role 인덱스 재생성 (성능 최적화 - 부분 인덱스)
DROP INDEX IF EXISTS users_role_idx;
CREATE INDEX users_role_idx ON public.users(role)
  WHERE role IN ('arbiter', 'high_templar', 'admin');

COMMENT ON INDEX users_role_idx IS 'Partial index for privileged roles (arbiter, high_templar, admin)';

-- ===========================
-- 002: hands 테이블 RLS 정책 업데이트
-- ===========================

-- 기존 정책 삭제 (20251024000001_fix_rls_admin_only.sql에서 생성됨)
DROP POLICY IF EXISTS "Admins can insert hands" ON hands;
DROP POLICY IF EXISTS "Admins can update hands" ON hands;
DROP POLICY IF EXISTS "Admins can delete hands" ON hands;

-- 새 정책: Arbiter 포함
CREATE POLICY "Arbiters can insert hands"
  ON hands
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Arbiters can update hands"
  ON hands
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Arbiters can delete hands"
  ON hands
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

-- 주석
COMMENT ON POLICY "Arbiters can insert hands" ON hands
  IS 'Security: Admins, high_templars, and arbiters can create hands';

COMMENT ON POLICY "Arbiters can update hands" ON hands
  IS 'Security: Admins, high_templars, and arbiters can modify hands';

COMMENT ON POLICY "Arbiters can delete hands" ON hands
  IS 'Security: Admins, high_templars, and arbiters can delete hands';

-- ===========================
-- 003: hand_players 테이블 RLS 정책 업데이트
-- ===========================

DROP POLICY IF EXISTS "Admins can insert hand_players" ON hand_players;
DROP POLICY IF EXISTS "Admins can update hand_players" ON hand_players;
DROP POLICY IF EXISTS "Admins can delete hand_players" ON hand_players;

CREATE POLICY "Arbiters can insert hand_players"
  ON hand_players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Arbiters can update hand_players"
  ON hand_players
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Arbiters can delete hand_players"
  ON hand_players
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

COMMENT ON POLICY "Arbiters can insert hand_players" ON hand_players
  IS 'Security: Admins, high_templars, and arbiters can create hand_players';

COMMENT ON POLICY "Arbiters can update hand_players" ON hand_players
  IS 'Security: Admins, high_templars, and arbiters can modify hand_players';

COMMENT ON POLICY "Arbiters can delete hand_players" ON hand_players
  IS 'Security: Admins, high_templars, and arbiters can delete hand_players';

-- ===========================
-- 004: hand_actions 테이블 RLS 정책 생성
-- ===========================

-- RLS 활성화 (아직 활성화 안 되어 있을 경우)
ALTER TABLE hand_actions ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Anyone can view hand_actions" ON hand_actions;
DROP POLICY IF EXISTS "Arbiters can insert hand_actions" ON hand_actions;
DROP POLICY IF EXISTS "Arbiters can update hand_actions" ON hand_actions;
DROP POLICY IF EXISTS "Arbiters can delete hand_actions" ON hand_actions;

-- 읽기 권한: 모든 사용자
CREATE POLICY "Anyone can view hand_actions"
  ON hand_actions
  FOR SELECT
  USING (true);

-- 쓰기 권한: Arbiter 이상
CREATE POLICY "Arbiters can insert hand_actions"
  ON hand_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Arbiters can update hand_actions"
  ON hand_actions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Arbiters can delete hand_actions"
  ON hand_actions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

COMMENT ON POLICY "Anyone can view hand_actions" ON hand_actions
  IS 'Public read access to all hand actions';

COMMENT ON POLICY "Arbiters can insert hand_actions" ON hand_actions
  IS 'Security: Admins, high_templars, and arbiters can create hand actions';

COMMENT ON POLICY "Arbiters can update hand_actions" ON hand_actions
  IS 'Security: Admins, high_templars, and arbiters can modify hand actions';

COMMENT ON POLICY "Arbiters can delete hand_actions" ON hand_actions
  IS 'Security: Admins, high_templars, and arbiters can delete hand actions';

-- ===========================
-- 005: tournaments, sub_events, streams 확인
-- ===========================
-- 변경 없음: admin, high_templar만 허용
-- 20251024000001_fix_rls_admin_only.sql 정책 유지

COMMENT ON TABLE users IS 'User accounts with role-based access control. Roles: user < templar < arbiter < high_templar < admin';
