-- Database Optimization Migration
-- Created: 2025-10-25
-- Purpose: Add missing indexes and prepare for unused index analysis

-- ============================================================
-- 1. Add Missing Indexes
-- ============================================================

-- tournaments.end_date index (CRITICAL: used in Admin Archive sorting)
-- Admin Archive page sorts by end_date DESC (commit 2dd0b18)
-- Currently only start_date index exists
CREATE INDEX IF NOT EXISTS idx_tournaments_end_date
ON tournaments(end_date DESC);

COMMENT ON INDEX idx_tournaments_end_date IS 'Used in Admin Archive page for sorting tournaments by completion date';

-- ============================================================
-- 2. Composite Index for Date Range Queries
-- ============================================================

-- tournaments compound index for date range filtering
-- Improves queries with: WHERE start_date >= ? AND end_date <= ?
CREATE INDEX IF NOT EXISTS idx_tournaments_date_range
ON tournaments(start_date, end_date);

-- ============================================================
-- 3. Create View for Unused Index Analysis
-- ============================================================

-- Create a view to monitor index usage
-- This helps identify indexes that can be safely removed
CREATE OR REPLACE VIEW v_unused_indexes AS
SELECT
  schemaname,
  relname AS tablename,
  indexrelname AS indexname,
  idx_scan AS index_scans,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  pg_relation_size(indexrelid) AS index_size_bytes
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelid IS NOT NULL
ORDER BY pg_relation_size(indexrelid) DESC;

COMMENT ON VIEW v_unused_indexes IS 'Identifies potentially unused indexes for removal consideration. Run after 7+ days of production usage.';

-- ============================================================
-- 4. Create View for Index Size Analysis
-- ============================================================

CREATE OR REPLACE VIEW v_index_sizes AS
SELECT
  schemaname,
  relname AS tablename,
  indexrelname AS indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

COMMENT ON VIEW v_index_sizes IS 'Shows all indexes with their sizes and usage statistics';

-- ============================================================
-- 5. Grant Permissions
-- ============================================================

-- Grant SELECT on analysis views to authenticated users (read-only)
GRANT SELECT ON v_unused_indexes TO authenticated;
GRANT SELECT ON v_index_sizes TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Database Optimization Migration Completed';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes Applied:';
  RAISE NOTICE '  1. Added idx_tournaments_end_date for Admin Archive sorting';
  RAISE NOTICE '  2. Added idx_tournaments_date_range for date range queries';
  RAISE NOTICE '  3. Created v_unused_indexes view for index monitoring';
  RAISE NOTICE '  4. Created v_index_sizes view for size analysis';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  - Monitor v_unused_indexes after 7 days';
  RAISE NOTICE '  - Run VACUUM ANALYZE for statistics update';
  RAISE NOTICE '  - Review users.is_banned field for removal';
  RAISE NOTICE '';
  RAISE NOTICE 'Query Examples:';
  RAISE NOTICE '  SELECT * FROM v_unused_indexes;';
  RAISE NOTICE '  SELECT * FROM v_index_sizes LIMIT 20;';
  RAISE NOTICE '============================================================';
END $$;
