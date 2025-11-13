-- ============================================================
-- Index Optimization Verification Script
-- ============================================================
-- Purpose: Verify that index optimization was successful
-- Run this AFTER applying 20251113000001_optimize_indexes.sql
-- ============================================================

-- ============================================================
-- 1. Verify Removed Indexes (Should be 0)
-- ============================================================
SELECT
  'Removed Indexes Check' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN '✓ PASS: All targeted indexes removed'
    ELSE '✗ FAIL: Some indexes still exist'
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    -- Duplicate indexes
    'idx_hands_day_id',
    'idx_hands_day_number',
    'idx_hand_players_player_id',
    'idx_sub_events_tournament_id',
    -- Timecode indexes
    'idx_timecode_submissions_stream_id',
    'idx_timecode_submissions_submitter_id',
    'idx_timecode_submissions_status',
    'idx_timecode_submissions_created_at',
    'idx_timecode_submissions_status_created_at',
    'idx_timecode_submissions_ocr_regions',
    'idx_timecode_submissions_no_ocr_regions',
    -- Analysis metadata indexes
    'idx_hands_analyzed_by',
    'idx_hands_analysis_confidence',
    -- Player notes/tags indexes
    'idx_player_notes_player_id',
    'idx_player_tags_player_id',
    'idx_players_play_style',
    -- Low-value indexes
    'idx_days_video_source',
    'idx_streams_video_source',
    'idx_hands_board_cards',
    'idx_days_published_at',
    'idx_streams_published_at',
    'idx_tournaments_dates',
    -- Category indexes
    'idx_categories_priority',
    'idx_categories_region'
  );

-- ============================================================
-- 2. Verify New Indexes (Should be 4)
-- ============================================================
SELECT
  'New Indexes Check' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 4 THEN '✓ PASS: All new indexes created'
    ELSE '✗ FAIL: Some indexes missing'
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_tournaments_start_date',
    'idx_tournaments_end_date',
    'idx_streams_unorganized',
    'idx_hands_favorite'
  );

-- List new indexes details
SELECT
  'New Indexes Details' as check_type,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_tournaments_start_date',
    'idx_tournaments_end_date',
    'idx_streams_unorganized',
    'idx_hands_favorite'
  )
ORDER BY indexname;

-- ============================================================
-- 3. Verify Critical Indexes Still Exist
-- ============================================================
SELECT
  'Critical Indexes Check' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 10 THEN '✓ PASS: All critical indexes present'
    ELSE '✗ FAIL: Some critical indexes missing'
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    -- Composite indexes that replace single-column ones
    'idx_hands_day_created',
    'idx_hands_number_day',
    'idx_hand_players_player_hand',
    'idx_hand_players_hand_player',
    'idx_sub_events_tournament_date',
    'idx_hand_actions_hand_street_seq',
    'idx_event_payouts_player_subevent',
    -- Important single-column indexes
    'idx_streams_sub_event_id',
    'idx_streams_is_organized',
    'idx_tournaments_category'
  );

-- ============================================================
-- 4. Total Index Count Before/After Comparison
-- ============================================================
WITH summary AS (
  SELECT
    COUNT(*) as total_indexes,
    COUNT(*) FILTER (WHERE indexname NOT LIKE '%_pkey') as non_pk_indexes,
    SUM(pg_relation_size(schemaname||'.'||tablename||'.'||indexname)) as total_size
  FROM pg_indexes
  WHERE schemaname = 'public'
)
SELECT
  'Total Indexes Summary' as check_type,
  total_indexes,
  non_pk_indexes,
  pg_size_pretty(total_size) as total_size,
  CASE
    WHEN non_pk_indexes BETWEEN 150 AND 180 THEN '✓ PASS: Indexes in expected range (150-180)'
    WHEN non_pk_indexes > 180 THEN '⚠ WARNING: More indexes than expected (>180)'
    ELSE '⚠ WARNING: Fewer indexes than expected (<150)'
  END as status
FROM summary;

-- ============================================================
-- 5. Table-by-Table Index Counts
-- ============================================================
SELECT
  'Table Index Counts' as check_type,
  tablename,
  COUNT(*) as index_count,
  pg_size_pretty(SUM(pg_relation_size(schemaname||'.'||tablename||'.'||indexname))) as total_index_size
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'
GROUP BY tablename
ORDER BY COUNT(*) DESC
LIMIT 10;

-- ============================================================
-- 6. Verify No Orphaned Indexes (indexes on non-existent tables)
-- ============================================================
SELECT
  'Orphaned Indexes Check' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN '✓ PASS: No orphaned indexes'
    ELSE '✗ FAIL: Found orphaned indexes'
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  );

-- ============================================================
-- 7. Partial Index Verification
-- ============================================================
SELECT
  'Partial Indexes Check' as check_type,
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename||'.'||indexname)) as size,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname = 'idx_streams_unorganized'
    OR indexname = 'idx_hands_favorite'
    OR indexname = 'idx_streams_is_organized'
  )
ORDER BY indexname;

-- ============================================================
-- 8. Performance Impact Analysis
-- ============================================================
-- Note: This requires pg_stat_user_indexes to be populated
-- Run this a few hours after migration to see actual usage

SELECT
  'Index Usage Stats' as check_type,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_hands_day_created',
    'idx_hands_number_day',
    'idx_hand_players_player_hand',
    'idx_sub_events_tournament_date',
    'idx_tournaments_start_date',
    'idx_streams_unorganized',
    'idx_hands_favorite'
  )
ORDER BY idx_scan DESC;

-- ============================================================
-- Final Report
-- ============================================================
DO $$
DECLARE
  total_indexes INTEGER;
  non_pk_indexes INTEGER;
  total_size BIGINT;
  removed_count INTEGER := 21; -- Expected removals
  added_count INTEGER := 4;    -- Expected additions
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE indexname NOT LIKE '%_pkey'),
    COALESCE(SUM(pg_relation_size(schemaname||'.'||tablename||'.'||indexname)), 0)
  INTO total_indexes, non_pk_indexes, total_size
  FROM pg_indexes
  WHERE schemaname = 'public';

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Index Optimization Verification Report';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Migration: 20251113000001_optimize_indexes.sql';
  RAISE NOTICE 'Date: %', NOW();
  RAISE NOTICE '';
  RAISE NOTICE 'Current State:';
  RAISE NOTICE '  - Total indexes: %', total_indexes;
  RAISE NOTICE '  - Non-PK indexes: %', non_pk_indexes;
  RAISE NOTICE '  - Total size: %', pg_size_pretty(total_size);
  RAISE NOTICE '';
  RAISE NOTICE 'Expected Changes:';
  RAISE NOTICE '  - Indexes removed: % (duplicate, unused, low-value)', removed_count;
  RAISE NOTICE '  - Indexes added: % (optimized, partial)', added_count;
  RAISE NOTICE '  - Net reduction: %', removed_count - added_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Run the queries above for detailed verification.';
  RAISE NOTICE '';
  RAISE NOTICE 'Performance Monitoring:';
  RAISE NOTICE '  - Monitor query performance for 24-48 hours';
  RAISE NOTICE '  - Check pg_stat_user_indexes for index usage';
  RAISE NOTICE '  - If any queries slow down, refer to rollback script';
  RAISE NOTICE '============================================================';
END $$;
