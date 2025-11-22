-- =====================================================
-- RLS SELECT 정책 수정 (수동 적용용)
-- =====================================================
-- 프로덕션 Supabase Dashboard SQL Editor에서 실행하세요
-- https://supabase.com/dashboard/project/diopilmkehygiqpizvga/sql/new

-- 1. TOURNAMENTS
DROP POLICY IF EXISTS "Anyone can view tournaments" ON tournaments;
DROP POLICY IF EXISTS "Tournaments are viewable" ON tournaments;
DROP POLICY IF EXISTS "Public can read tournaments" ON tournaments;

CREATE POLICY "Public can read tournaments"
  ON tournaments FOR SELECT TO public USING (true);

-- 2. SUB_EVENTS
DROP POLICY IF EXISTS "Anyone can view sub_events" ON sub_events;
DROP POLICY IF EXISTS "Sub events are viewable" ON sub_events;
DROP POLICY IF EXISTS "Public can read sub_events" ON sub_events;

CREATE POLICY "Public can read sub_events"
  ON sub_events FOR SELECT TO public USING (true);

-- 3. STREAMS
DROP POLICY IF EXISTS "Anyone can view streams" ON streams;
DROP POLICY IF EXISTS "Streams are viewable" ON streams;
DROP POLICY IF EXISTS "Public can read streams" ON streams;

CREATE POLICY "Public can read streams"
  ON streams FOR SELECT TO public USING (true);

-- 4. HANDS
DROP POLICY IF EXISTS "Anyone can view hands" ON hands;
DROP POLICY IF EXISTS "Hands are viewable" ON hands;
DROP POLICY IF EXISTS "Public can read hands" ON hands;

CREATE POLICY "Public can read hands"
  ON hands FOR SELECT TO public USING (true);

-- 5. PLAYERS
DROP POLICY IF EXISTS "Anyone can view players" ON players;
DROP POLICY IF EXISTS "Players are viewable" ON players;
DROP POLICY IF EXISTS "Public can read players" ON players;

CREATE POLICY "Public can read players"
  ON players FOR SELECT TO public USING (true);

-- 6. HAND_PLAYERS
DROP POLICY IF EXISTS "Anyone can view hand_players" ON hand_players;
DROP POLICY IF EXISTS "Hand players are viewable" ON hand_players;
DROP POLICY IF EXISTS "Public can read hand_players" ON hand_players;

CREATE POLICY "Public can read hand_players"
  ON hand_players FOR SELECT TO public USING (true);

-- 7. HAND_ACTIONS
DROP POLICY IF EXISTS "Anyone can view hand_actions" ON hand_actions;
DROP POLICY IF EXISTS "Hand actions are viewable" ON hand_actions;
DROP POLICY IF EXISTS "Public can read hand_actions" ON hand_actions;

CREATE POLICY "Public can read hand_actions"
  ON hand_actions FOR SELECT TO public USING (true);

-- 완료!
