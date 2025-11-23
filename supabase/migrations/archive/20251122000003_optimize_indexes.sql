-- Phase 3: Add performance optimization indexes
-- These indexes improve query performance for common access patterns
-- Note: CONCURRENTLY option removed due to Supabase migration pipeline limitations

-- 1. Hands: Stream별 최신 핸드 조회 최적화
-- Used in: HandsListPanel, Archive pages
CREATE INDEX IF NOT EXISTS idx_hands_day_id_created_at
ON hands(day_id, created_at DESC);

-- 2. Hand Actions: 핸드별 액션 시퀀스 조회 최적화
-- Used in: HandDetailPanel, Hand replay features
CREATE INDEX IF NOT EXISTS idx_hand_actions_hand_id_street_sequence
ON hand_actions(hand_id, street, sequence);

-- 3. Hand Players: 플레이어별 최근 핸드 조회 최적화
-- Used in: Player profile pages, Player statistics
CREATE INDEX IF NOT EXISTS idx_hand_players_player_id_created_at
ON hand_players(player_id, created_at DESC);

-- 4. Notifications: 읽지 않은 알림 조회 최적화
-- Used in: Notification dropdown, Notification page
-- Note: Skipped - idx_notifications_unread already exists from 20251018000026_add_notifications_system.sql

-- 5. Community Posts: 공개된 포스트 리스트 조회 최적화
-- Used in: Community page, Post feeds
CREATE INDEX IF NOT EXISTS idx_posts_created_at_is_hidden
ON posts(created_at DESC, is_hidden)
WHERE is_hidden = false;

-- 6. Player Stats Cache: 통계 캐시 조회 최적화
-- Used in: Player statistics, Leaderboards
CREATE INDEX IF NOT EXISTS idx_player_stats_cache_player_id_last_updated
ON player_stats_cache(player_id, last_updated);

-- Comments for documentation
COMMENT ON INDEX idx_hands_day_id_created_at IS 'Optimize stream-specific hand queries';
COMMENT ON INDEX idx_hand_actions_hand_id_street_sequence IS 'Optimize hand action sequence queries';
COMMENT ON INDEX idx_hand_players_player_id_created_at IS 'Optimize player hand history queries';
COMMENT ON INDEX idx_notifications_user_id_read_at_created_at IS 'Optimize unread notification queries';
COMMENT ON INDEX idx_community_posts_published_at_status IS 'Optimize published post feed queries';
COMMENT ON INDEX idx_player_stats_cache_player_id_updated_at IS 'Optimize player stats cache lookups';
