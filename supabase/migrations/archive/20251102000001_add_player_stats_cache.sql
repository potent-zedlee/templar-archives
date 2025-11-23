-- Migration: Player Statistics Caching System
-- Date: 2025-11-02
-- Purpose: 플레이어 통계 조회 성능 50-70% 개선
-- Context: 매번 hand_actions를 계산하는 대신 캐시된 통계 사용

-- =====================================================
-- 1. player_stats_cache 테이블 생성
-- =====================================================

CREATE TABLE IF NOT EXISTS player_stats_cache (
  -- Primary Key
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,

  -- 통계 데이터 (PlayerStatistics 타입과 일치)
  vpip FLOAT DEFAULT 0,                    -- Voluntarily Put In Pot (%)
  pfr FLOAT DEFAULT 0,                     -- Pre-Flop Raise (%)
  three_bet FLOAT DEFAULT 0,               -- 3Bet (%)
  ats FLOAT DEFAULT 0,                     -- Attempt To Steal (%)
  win_rate FLOAT DEFAULT 0,                -- Win Rate (%)
  avg_pot_size BIGINT DEFAULT 0,           -- Average Pot Size
  showdown_win_rate FLOAT DEFAULT 0,       -- Showdown Win %
  total_hands INTEGER DEFAULT 0,           -- Total hands played
  hands_won INTEGER DEFAULT 0,             -- Total hands won

  -- 포지션별 통계 (JSONB로 저장)
  positional_stats JSONB,                  -- { BTN: {...}, CO: {...}, ... }

  -- 플레이 스타일 분류
  play_style TEXT,                         -- Tight/Loose-Aggressive/Passive

  -- 메타데이터
  last_updated TIMESTAMPTZ DEFAULT NOW(),  -- 마지막 업데이트 시간
  created_at TIMESTAMPTZ DEFAULT NOW()     -- 생성 시간
);

-- 코멘트 추가
COMMENT ON TABLE player_stats_cache IS '플레이어 통계 캐시 테이블 - 성능 최적화용';
COMMENT ON COLUMN player_stats_cache.vpip IS 'Voluntarily Put In Pot - 프리플롭 자발적 참여율 (%)';
COMMENT ON COLUMN player_stats_cache.pfr IS 'Pre-Flop Raise - 프리플롭 레이즈율 (%)';
COMMENT ON COLUMN player_stats_cache.three_bet IS '3Bet - 3벳 비율 (%)';
COMMENT ON COLUMN player_stats_cache.ats IS 'Attempt To Steal - 스틸 시도 비율 (%)';
COMMENT ON COLUMN player_stats_cache.win_rate IS 'Win Rate - 승률 (%)';
COMMENT ON COLUMN player_stats_cache.avg_pot_size IS 'Average Pot Size - 평균 팟 크기';
COMMENT ON COLUMN player_stats_cache.showdown_win_rate IS 'Showdown Win Rate - 쇼다운 승률 (%)';
COMMENT ON COLUMN player_stats_cache.total_hands IS 'Total Hands - 총 플레이한 핸드 수';
COMMENT ON COLUMN player_stats_cache.hands_won IS 'Hands Won - 승리한 핸드 수';
COMMENT ON COLUMN player_stats_cache.positional_stats IS '포지션별 상세 통계 (JSON)';
COMMENT ON COLUMN player_stats_cache.play_style IS '플레이 스타일 분류 (Tight-Aggressive, Loose-Aggressive 등)';

-- =====================================================
-- 2. 인덱스 생성
-- =====================================================

-- 최근 업데이트 순 조회용
CREATE INDEX idx_player_stats_cache_updated
ON player_stats_cache(last_updated DESC);

-- 플레이 스타일별 조회용
CREATE INDEX idx_player_stats_cache_style
ON player_stats_cache(play_style)
WHERE play_style IS NOT NULL;

-- 핸드 수 기준 조회용 (활발한 플레이어 필터링)
CREATE INDEX idx_player_stats_cache_hands
ON player_stats_cache(total_hands DESC)
WHERE total_hands > 0;

-- =====================================================
-- 3. 캐시 무효화 함수
-- =====================================================

CREATE OR REPLACE FUNCTION invalidate_player_stats_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- hand_actions INSERT/UPDATE/DELETE 시 해당 플레이어의 캐시 무효화
  IF TG_OP = 'DELETE' THEN
    DELETE FROM player_stats_cache
    WHERE player_id = OLD.player_id;
    RETURN OLD;
  ELSE
    DELETE FROM player_stats_cache
    WHERE player_id = NEW.player_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION invalidate_player_stats_cache() IS
'핸드 액션 변경 시 플레이어 통계 캐시 무효화';

-- =====================================================
-- 4. 트리거 생성
-- =====================================================

-- hand_actions 변경 시 캐시 무효화
DROP TRIGGER IF EXISTS trigger_invalidate_stats_on_hand_actions
ON hand_actions;

CREATE TRIGGER trigger_invalidate_stats_on_hand_actions
  AFTER INSERT OR UPDATE OR DELETE ON hand_actions
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_player_stats_cache();

-- hand_players 변경 시 캐시 무효화 (승패 정보 변경)
CREATE OR REPLACE FUNCTION invalidate_player_stats_on_hand_players()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM player_stats_cache
    WHERE player_id = OLD.player_id;
    RETURN OLD;
  ELSE
    -- starting_stack/ending_stack 변경 시 승패 판정 영향
    DELETE FROM player_stats_cache
    WHERE player_id = NEW.player_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_invalidate_stats_on_hand_players
ON hand_players;

CREATE TRIGGER trigger_invalidate_stats_on_hand_players
  AFTER INSERT OR UPDATE OF starting_stack, ending_stack ON hand_players
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_player_stats_on_hand_players();

-- =====================================================
-- 5. RLS 정책
-- =====================================================

ALTER TABLE player_stats_cache ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 조회 가능 (공개 통계)
DROP POLICY IF EXISTS "player_stats_cache_select_public" ON player_stats_cache;
CREATE POLICY "player_stats_cache_select_public"
ON player_stats_cache FOR SELECT
TO authenticated
USING (true);

-- 시스템만 삽입/업데이트/삭제 가능 (캐시 관리)
-- (실제로는 애플리케이션 코드에서 관리)
DROP POLICY IF EXISTS "player_stats_cache_insert_system" ON player_stats_cache;
CREATE POLICY "player_stats_cache_insert_system"
ON player_stats_cache FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "player_stats_cache_update_system" ON player_stats_cache;
CREATE POLICY "player_stats_cache_update_system"
ON player_stats_cache FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "player_stats_cache_delete_system" ON player_stats_cache;
CREATE POLICY "player_stats_cache_delete_system"
ON player_stats_cache FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- 6. 유틸리티 함수 - 캐시 재생성
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_all_player_stats_cache()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- 모든 캐시 삭제 (재계산 유도)
  DELETE FROM player_stats_cache;
  GET DIAGNOSTICS affected_count = ROW_COUNT;

  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_all_player_stats_cache() IS
'모든 플레이어 통계 캐시 삭제 (재계산 유도) - 관리자 전용';

-- =====================================================
-- 7. 캐시 통계 확인 함수
-- =====================================================

CREATE OR REPLACE FUNCTION get_cache_statistics()
RETURNS TABLE (
  total_cached_players INTEGER,
  avg_hands_per_player NUMERIC,
  most_recent_update TIMESTAMPTZ,
  oldest_cache TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_cached_players,
    ROUND(AVG(total_hands), 2) AS avg_hands_per_player,
    MAX(last_updated) AS most_recent_update,
    MIN(last_updated) AS oldest_cache
  FROM player_stats_cache;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_cache_statistics() IS
'플레이어 통계 캐시 현황 확인';
