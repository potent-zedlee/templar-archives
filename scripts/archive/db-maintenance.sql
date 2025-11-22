-- Database Maintenance Script
-- Purpose: Regular database cleanup, statistics update, and performance monitoring
-- Run Schedule: Weekly or Monthly (recommended)
-- Execution Time: 1-5 minutes depending on database size

-- ============================================================
-- SECTION 1: VACUUM ANALYZE (Critical for Performance)
-- ============================================================

-- Full VACUUM ANALYZE on all tables
-- This reclaims space and updates query planner statistics
VACUUM ANALYZE;

-- For faster execution, target only large tables:
-- VACUUM ANALYZE hands;
-- VACUUM ANALYZE hand_players;
-- VACUUM ANALYZE posts;
-- VACUUM ANALYZE comments;
-- VACUUM ANALYZE tournaments;
-- VACUUM ANALYZE players;

-- ============================================================
-- SECTION 2: Update Statistics (Query Planner Optimization)
-- ============================================================

-- Update statistics for better query planning
ANALYZE hands;
ANALYZE hand_players;
ANALYZE hand_actions;
ANALYZE posts;
ANALYZE comments;
ANALYZE tournaments;
ANALYZE sub_events;
ANALYZE days;
ANALYZE players;
ANALYZE users;
ANALYZE notifications;
ANALYZE hand_bookmarks;

-- ============================================================
-- SECTION 3: Check for Unused Indexes
-- ============================================================

-- Find indexes that are never used (can be dropped to save space)
-- NOTE: Review carefully before dropping - some indexes may be used infrequently but are still important
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as "Times Used",
  pg_size_pretty(pg_relation_size(indexrelid)) as "Index Size"
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- ============================================================
-- SECTION 4: Check for Missing Indexes (Query Recommendations)
-- ============================================================

-- Find tables with sequential scans (potential missing indexes)
SELECT
  schemaname,
  tablename,
  seq_scan as "Sequential Scans",
  seq_tup_read as "Rows Read",
  idx_scan as "Index Scans",
  n_tup_ins + n_tup_upd + n_tup_del as "Write Operations",
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as "Table Size"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND seq_scan > 0
ORDER BY seq_scan DESC, seq_tup_read DESC
LIMIT 20;

-- ============================================================
-- SECTION 5: Check Table Bloat (Disk Space Waste)
-- ============================================================

-- Identify tables with significant bloat (wasted space)
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as "Total Size",
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as "Table Size",
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as "Indexes Size",
  n_dead_tup as "Dead Rows",
  n_live_tup as "Live Rows",
  CASE
    WHEN n_live_tup > 0 THEN ROUND(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2)
    ELSE 0
  END as "Dead Row %"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_dead_tup > 100
ORDER BY n_dead_tup DESC
LIMIT 20;

-- ============================================================
-- SECTION 6: Check Index Usage Statistics
-- ============================================================

-- Most frequently used indexes (good investment)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as "Times Used",
  idx_tup_read as "Rows Read",
  idx_tup_fetch as "Rows Fetched",
  pg_size_pretty(pg_relation_size(indexrelid)) as "Index Size"
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan > 0
ORDER BY idx_scan DESC
LIMIT 20;

-- ============================================================
-- SECTION 7: Check Cache Hit Ratio (Performance Indicator)
-- ============================================================

-- Table cache hit ratio (should be > 95%)
SELECT
  schemaname,
  tablename,
  heap_blks_read + heap_blks_hit as total_reads,
  CASE
    WHEN heap_blks_read + heap_blks_hit > 0 THEN
      ROUND(100.0 * heap_blks_hit / (heap_blks_read + heap_blks_hit), 2)
    ELSE 0
  END as cache_hit_ratio
FROM pg_statio_user_tables
WHERE schemaname = 'public'
  AND heap_blks_read + heap_blks_hit > 0
ORDER BY cache_hit_ratio ASC
LIMIT 20;

-- Index cache hit ratio (should be > 95%)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_blks_read + idx_blks_hit as total_reads,
  CASE
    WHEN idx_blks_read + idx_blks_hit > 0 THEN
      ROUND(100.0 * idx_blks_hit / (idx_blks_read + idx_blks_hit), 2)
    ELSE 0
  END as cache_hit_ratio
FROM pg_statio_user_indexes
WHERE schemaname = 'public'
  AND idx_blks_read + idx_blks_hit > 0
ORDER BY cache_hit_ratio ASC
LIMIT 20;

-- ============================================================
-- SECTION 8: Check Database Size
-- ============================================================

-- Total database size
SELECT
  pg_database.datname,
  pg_size_pretty(pg_database_size(pg_database.datname)) as size
FROM pg_database
WHERE pg_database.datname = current_database();

-- Largest tables
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as "Total Size",
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as "Table Size",
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as "Indexes Size"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- ============================================================
-- SECTION 9: Check Long Running Queries (Optional)
-- ============================================================

-- Find currently running queries taking > 1 second
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  state,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - pg_stat_activity.query_start > interval '1 second'
ORDER BY duration DESC;

-- ============================================================
-- SECTION 10: Reindex (Only if needed - Run carefully!)
-- ============================================================

-- REINDEX can improve performance if indexes are bloated
-- WARNING: This locks the table during reindexing
-- Only run during low-traffic periods

-- Example (uncomment to use):
-- REINDEX TABLE CONCURRENTLY hands;
-- REINDEX TABLE CONCURRENTLY hand_players;
-- REINDEX TABLE CONCURRENTLY posts;

-- ============================================================
-- Maintenance Complete
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Database Maintenance Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Date: %', NOW();
  RAISE NOTICE '';
  RAISE NOTICE 'Actions Performed:';
  RAISE NOTICE '  1. ✓ VACUUM ANALYZE executed';
  RAISE NOTICE '  2. ✓ Statistics updated for major tables';
  RAISE NOTICE '  3. ✓ Performance checks completed';
  RAISE NOTICE '';
  RAISE NOTICE 'Review the query results above for:';
  RAISE NOTICE '  - Unused indexes (consider dropping)';
  RAISE NOTICE '  - Missing indexes (consider adding)';
  RAISE NOTICE '  - Table bloat (consider VACUUM FULL if >20%%)';
  RAISE NOTICE '  - Cache hit ratio (should be >95%%)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Recommended Maintenance: %', NOW() + INTERVAL '1 week';
  RAISE NOTICE '========================================';
END $$;
