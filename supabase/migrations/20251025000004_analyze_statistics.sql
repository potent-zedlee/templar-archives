-- Database Maintenance: Update Query Planner Statistics
-- Created: 2025-10-25
-- Purpose: Update PostgreSQL statistics for optimal query planning

-- ============================================================
-- Background
-- ============================================================
-- PostgreSQL's query planner uses statistics to choose optimal execution plans.
-- After schema changes, data imports, or significant data modifications,
-- statistics should be updated using ANALYZE.
--
-- Note: VACUUM cannot be run in a transaction block, so we use ANALYZE only.
-- VACUUM should be run separately via psql or scheduled maintenance.

-- ============================================================
-- 1. Analyze Core Archive Tables
-- ============================================================

ANALYZE tournaments;
ANALYZE sub_events;
ANALYZE days;
ANALYZE hands;
ANALYZE players;
ANALYZE hand_players;
ANALYZE hand_actions;

-- ============================================================
-- 2. Analyze Community Tables
-- ============================================================

ANALYZE users;
ANALYZE posts;
ANALYZE comments;
ANALYZE likes;
ANALYZE hand_bookmarks;

-- ============================================================
-- 3. Analyze Admin Tables
-- ============================================================

ANALYZE hand_edit_requests;
ANALYZE reports;
ANALYZE event_payouts;

-- ============================================================
-- 4. Analyze Notification Tables
-- ============================================================

ANALYZE notifications;

-- ============================================================
-- 5. Analyze Category Tables
-- ============================================================

ANALYZE tournament_categories;

-- ============================================================
-- 6. Create Maintenance View
-- ============================================================

CREATE OR REPLACE VIEW v_table_statistics AS
SELECT
  schemaname,
  relname AS tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname) - pg_relation_size(schemaname||'.'||relname)) AS indexes_size,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  n_tup_ins AS inserts,
  n_tup_upd AS updates,
  n_tup_del AS deletes,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;

COMMENT ON VIEW v_table_statistics IS 'Shows table sizes, row counts, and maintenance statistics';

GRANT SELECT ON v_table_statistics TO authenticated;

-- ============================================================
-- 7. Create Index Statistics View
-- ============================================================

CREATE OR REPLACE VIEW v_index_statistics AS
SELECT
  schemaname,
  relname AS tablename,
  indexrelname AS indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

COMMENT ON VIEW v_index_statistics IS 'Shows index usage and size statistics';

GRANT SELECT ON v_index_statistics TO authenticated;

-- ============================================================
-- 8. Create Database Size View
-- ============================================================

CREATE OR REPLACE VIEW v_database_size AS
SELECT
  pg_database.datname AS database_name,
  pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = current_database();

COMMENT ON VIEW v_database_size IS 'Shows total database size';

GRANT SELECT ON v_database_size TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================

DO $$
DECLARE
  total_tables INTEGER;
  total_indexes INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tables FROM pg_stat_user_tables WHERE schemaname = 'public';
  SELECT COUNT(*) INTO total_indexes FROM pg_stat_user_indexes WHERE schemaname = 'public';

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Database Statistics Update Completed';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Statistics Updated:';
  RAISE NOTICE '  - Tables analyzed: %', total_tables;
  RAISE NOTICE '  - Indexes tracked: %', total_indexes;
  RAISE NOTICE '';
  RAISE NOTICE 'Created Monitoring Views:';
  RAISE NOTICE '  1. v_table_statistics - Table sizes and maintenance stats';
  RAISE NOTICE '  2. v_index_statistics - Index usage statistics';
  RAISE NOTICE '  3. v_database_size - Total database size';
  RAISE NOTICE '';
  RAISE NOTICE 'Recommended Queries:';
  RAISE NOTICE '  SELECT * FROM v_table_statistics LIMIT 10;';
  RAISE NOTICE '  SELECT * FROM v_index_statistics WHERE idx_scan = 0;';
  RAISE NOTICE '  SELECT * FROM v_database_size;';
  RAISE NOTICE '';
  RAISE NOTICE 'Maintenance Note:';
  RAISE NOTICE '  - VACUUM cannot run in migration (must be run separately)';
  RAISE NOTICE '  - Run manually: VACUUM ANALYZE;';
  RAISE NOTICE '  - Or schedule via pg_cron or Supabase dashboard';
  RAISE NOTICE '============================================================';
END $$;
