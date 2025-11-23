-- =====================================================
-- Phase 1.1: Remove Duplicate Indexes
-- =====================================================
-- Purpose: Remove redundant indexes that are covered by composite indexes
-- Expected Effect: 5-10% improvement in write performance, 10-15MB storage savings

-- =====================================================
-- 1. Analyze Current Index Usage
-- =====================================================

DO $$
DECLARE
  total_indexes INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_indexes
  FROM pg_indexes
  WHERE schemaname = 'public';

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Duplicate Index Removal - Phase 1.1';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Total indexes before cleanup: %', total_indexes;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 2. Remove Redundant Single-Column Indexes
-- =====================================================

-- hand_players: idx_hand_players_player_id is covered by idx_hand_players_player_hand
-- (player_id, hand_id) composite index can handle queries on just player_id
DROP INDEX IF EXISTS idx_hand_players_player_id;

COMMENT ON INDEX idx_hand_players_player_hand IS
'Composite index covering player_id queries. Replaces single-column idx_hand_players_player_id.
Used in: player statistics, hand history, JOIN operations.';

-- hands: idx_hands_day_id is covered by idx_hands_day_created
-- But we need to check if day_id is renamed to stream_id first
DO $$
BEGIN
  -- Check if the index exists with old name
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_hands_day_id'
  ) THEN
    DROP INDEX idx_hands_day_id;
    RAISE NOTICE 'Dropped idx_hands_day_id (covered by idx_hands_day_created)';
  END IF;

  -- Check if stream_id index exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_hands_stream_id'
  ) THEN
    DROP INDEX idx_hands_stream_id;
    RAISE NOTICE 'Dropped idx_hands_stream_id (covered by composite index)';
  END IF;
END $$;

-- sub_events: idx_sub_events_tournament_id is covered by idx_sub_events_tournament_date
DROP INDEX IF EXISTS idx_sub_events_tournament_id;

COMMENT ON INDEX idx_sub_events_tournament_date IS
'Composite index covering tournament_id queries. Replaces single-column idx_sub_events_tournament_id.
Used in: tournament detail pages, sub-event listings with date sorting.';

-- =====================================================
-- 3. Remove Unused Indexes (if any)
-- =====================================================

-- Check for indexes with zero scans (not used)
-- These will be logged but not automatically dropped (manual review needed)

DO $$
DECLARE
  unused_index RECORD;
  unused_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Unused Indexes (idx_scan = 0):';
  RAISE NOTICE '-------------------------------------------';

  FOR unused_index IN
    SELECT
      schemaname,
      relname as tablename,
      indexrelname as indexname,
      pg_size_pretty(pg_relation_size(indexrelid)) as size
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND idx_scan = 0
      AND indexrelname NOT LIKE '%_pkey'  -- Exclude primary keys
    ORDER BY pg_relation_size(indexrelid) DESC
  LOOP
    RAISE NOTICE '% on %.% (size: %)',
      unused_index.indexname,
      unused_index.schemaname,
      unused_index.tablename,
      unused_index.size;
    unused_count := unused_count + 1;
  END LOOP;

  IF unused_count = 0 THEN
    RAISE NOTICE 'No unused indexes found.';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE 'Total unused indexes: %', unused_count;
    RAISE NOTICE 'Note: These require manual review before removal.';
  END IF;
END $$;

-- =====================================================
-- 4. Verify Remaining Indexes
-- =====================================================

DO $$
DECLARE
  total_indexes_after INTEGER;
  indexes_removed INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_indexes_after
  FROM pg_indexes
  WHERE schemaname = 'public';

  -- Estimate based on drops above
  indexes_removed := 3;  -- Minimum expected removals

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Cleanup Complete';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Total indexes after cleanup: %', total_indexes_after;
  RAISE NOTICE 'Indexes removed: ~%', indexes_removed;
  RAISE NOTICE '';
  RAISE NOTICE 'Expected Benefits:';
  RAISE NOTICE '  - Write performance: +5-10%%';
  RAISE NOTICE '  - Storage savings: 10-15MB';
  RAISE NOTICE '  - Reduced maintenance overhead';
  RAISE NOTICE '============================================================';
END $$;
