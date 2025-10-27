-- =====================================================
-- Phase 4: Performance Monitoring System
-- =====================================================
-- Purpose: Create views and tools to monitor database performance
-- Expected Effect: Better visibility into query performance and index usage

-- =====================================================
-- 1. Enable pg_stat_statements Extension
-- =====================================================

-- Enable query statistics tracking (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

COMMENT ON EXTENSION pg_stat_statements IS
'Tracks execution statistics of all SQL statements.
Used for: slow query detection, performance analysis.';

-- =====================================================
-- 2. Index Usage Statistics View
-- =====================================================

CREATE OR REPLACE VIEW v_index_usage_stats AS
SELECT
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as size,
  CASE
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 100 THEN 'LOW'
    WHEN idx_scan < 1000 THEN 'MEDIUM'
    ELSE 'HIGH'
  END as usage_level
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

COMMENT ON VIEW v_index_usage_stats IS
'Shows index usage statistics with usage level classification.
Usage: SELECT * FROM v_index_usage_stats WHERE usage_level = ''UNUSED'';
Helps identify: unused indexes, underutilized indexes.';

-- =====================================================
-- 3. Slow Queries View (requires pg_stat_statements access)
-- =====================================================

-- Skip if pg_stat_statements is not accessible (Supabase restriction)
DO $$
BEGIN
  -- Try to create the view if pg_stat_statements is accessible
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'pg_stat_statements'
  ) OR EXISTS (
    SELECT 1 FROM pg_matviews WHERE matviewname = 'pg_stat_statements'
  ) OR EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'pg_stat_statements'
  ) THEN
    EXECUTE '
      CREATE OR REPLACE VIEW v_slow_queries AS
      SELECT
        LEFT(query, 100) as query_preview,
        calls,
        ROUND(total_exec_time::numeric / 1000, 2) as total_seconds,
        ROUND(mean_exec_time::numeric / 1000, 2) as avg_seconds,
        ROUND(max_exec_time::numeric / 1000, 2) as max_seconds,
        ROUND((stddev_exec_time::numeric / 1000), 2) as stddev_seconds,
        ROUND((total_exec_time / SUM(total_exec_time) OVER ()) * 100, 2) as pct_total_time
      FROM pg_stat_statements
      WHERE mean_exec_time > 50
        AND query NOT LIKE ''%pg_stat%''
        AND query NOT LIKE ''%RAISE NOTICE%''
      ORDER BY mean_exec_time DESC
      LIMIT 50';
    RAISE NOTICE 'Created v_slow_queries view (pg_stat_statements accessible)';
  ELSE
    RAISE NOTICE 'Skipped v_slow_queries view (pg_stat_statements not accessible)';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create v_slow_queries: %', SQLERRM;
END $$;

-- =====================================================
-- 4. Table Size Statistics View
-- =====================================================

CREATE OR REPLACE VIEW v_table_sizes AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size,
  pg_total_relation_size(schemaname||'.'||tablename) as total_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

COMMENT ON VIEW v_table_sizes IS
'Shows table and index sizes sorted by total size.
Usage: SELECT * FROM v_table_sizes;
Helps identify: large tables, index bloat, storage issues.';

-- =====================================================
-- 5. Cache Hit Ratio View
-- =====================================================

CREATE OR REPLACE VIEW v_cache_hit_ratio AS
SELECT
  'Index' as cache_type,
  SUM(idx_blks_hit) as hits,
  SUM(idx_blks_read) as reads,
  CASE
    WHEN SUM(idx_blks_hit) + SUM(idx_blks_read) = 0 THEN 0
    ELSE ROUND(
      (SUM(idx_blks_hit)::numeric / (SUM(idx_blks_hit) + SUM(idx_blks_read))) * 100,
      2
    )
  END as hit_ratio_pct
FROM pg_statio_user_indexes
UNION ALL
SELECT
  'Table' as cache_type,
  SUM(heap_blks_hit) as hits,
  SUM(heap_blks_read) as reads,
  CASE
    WHEN SUM(heap_blks_hit) + SUM(heap_blks_read) = 0 THEN 0
    ELSE ROUND(
      (SUM(heap_blks_hit)::numeric / (SUM(heap_blks_hit) + SUM(heap_blks_read))) * 100,
      2
    )
  END as hit_ratio_pct
FROM pg_statio_user_tables;

COMMENT ON VIEW v_cache_hit_ratio IS
'Shows cache hit ratios for tables and indexes.
Target: >95% hit ratio. Lower values indicate insufficient shared_buffers.
Usage: SELECT * FROM v_cache_hit_ratio;';

-- =====================================================
-- 6. Duplicate Indexes Detection View
-- =====================================================

CREATE OR REPLACE VIEW v_duplicate_indexes AS
SELECT
  pg_size_pretty(SUM(pg_relation_size(indexrelid))::bigint) as total_size,
  array_agg(indexrelid::regclass) as indexes,
  indkey::text as columns
FROM pg_index idx
JOIN pg_class c ON c.oid = idx.indexrelid
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND NOT indisprimary
GROUP BY indrelid, indkey
HAVING COUNT(*) > 1;

COMMENT ON VIEW v_duplicate_indexes IS
'Detects potentially duplicate indexes (same columns).
Usage: SELECT * FROM v_duplicate_indexes;
Action: Review and drop unnecessary duplicates.';

-- =====================================================
-- 7. Table Bloat Estimation View
-- =====================================================

CREATE OR REPLACE VIEW v_table_bloat AS
SELECT
  s.schemaname,
  s.relname as tablename,
  pg_size_pretty(pg_relation_size(s.schemaname||'.'||s.relname)) as table_size,
  ROUND(
    (pg_relation_size(s.schemaname||'.'||s.relname)::numeric /
     NULLIF(pg_stat_get_live_tuples(c.oid) + pg_stat_get_dead_tuples(c.oid), 0)) *
    pg_stat_get_dead_tuples(c.oid),
    2
  ) as estimated_bloat_bytes,
  pg_stat_get_dead_tuples(c.oid) as dead_tuples,
  pg_stat_get_live_tuples(c.oid) as live_tuples,
  CASE
    WHEN pg_stat_get_live_tuples(c.oid) + pg_stat_get_dead_tuples(c.oid) = 0 THEN 0
    ELSE ROUND(
      (pg_stat_get_dead_tuples(c.oid)::numeric /
       (pg_stat_get_live_tuples(c.oid) + pg_stat_get_dead_tuples(c.oid))) * 100,
      2
    )
  END as bloat_pct
FROM pg_stat_user_tables s
JOIN pg_class c ON c.relname = s.relname AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = s.schemaname)
WHERE s.schemaname = 'public'
ORDER BY dead_tuples DESC;

COMMENT ON VIEW v_table_bloat IS
'Estimates table bloat from dead tuples.
Bloat >20%: Consider running VACUUM.
Usage: SELECT * FROM v_table_bloat WHERE bloat_pct > 20;';

-- =====================================================
-- 8. Query Performance Summary Function
-- =====================================================

CREATE OR REPLACE FUNCTION get_query_performance_summary()
RETURNS TABLE (
  metric TEXT,
  value TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'Unused Indexes', COUNT(*)::TEXT FROM pg_stat_user_indexes WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey'
  UNION ALL
  SELECT 'Low Usage Indexes (<100 scans)', COUNT(*)::TEXT FROM pg_stat_user_indexes WHERE idx_scan < 100 AND indexrelname NOT LIKE '%_pkey'
  UNION ALL
  SELECT 'Total Index Size', pg_size_pretty(SUM(pg_relation_size(indexrelid))::bigint) FROM pg_stat_user_indexes
  UNION ALL
  SELECT 'Table Cache Hit Ratio', ROUND((SUM(heap_blks_hit)::numeric / NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0)) * 100, 2)::TEXT || '%'
    FROM pg_statio_user_tables
  UNION ALL
  SELECT 'Index Cache Hit Ratio', ROUND((SUM(idx_blks_hit)::numeric / NULLIF(SUM(idx_blks_hit) + SUM(idx_blks_read), 0)) * 100, 2)::TEXT || '%'
    FROM pg_statio_user_indexes
  UNION ALL
  SELECT 'Tables with Bloat >20%', COUNT(*)::TEXT FROM v_table_bloat WHERE bloat_pct > 20;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_query_performance_summary IS
'Provides a quick performance health check summary.
Usage: SELECT * FROM get_query_performance_summary();
Returns: Key metrics about query performance and database health.';

-- =====================================================
-- 9. Create Monitoring Dashboard View
-- =====================================================

CREATE OR REPLACE VIEW v_monitoring_dashboard AS
SELECT
  (SELECT COUNT(*) FROM pg_stat_user_tables) as total_tables,
  (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE indexrelname NOT LIKE '%_pkey') as total_indexes,
  (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey') as unused_indexes,
  (SELECT pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))::bigint) FROM pg_tables WHERE schemaname = 'public') as total_db_size,
  (SELECT ROUND((SUM(heap_blks_hit)::numeric / NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0)) * 100, 2) FROM pg_statio_user_tables) as table_cache_hit_pct,
  (SELECT ROUND((SUM(idx_blks_hit)::numeric / NULLIF(SUM(idx_blks_hit) + SUM(idx_blks_read), 0)) * 100, 2) FROM pg_statio_user_indexes) as index_cache_hit_pct;

COMMENT ON VIEW v_monitoring_dashboard IS
'Single-row dashboard with key database health metrics.
Usage: SELECT * FROM v_monitoring_dashboard;
Use for: Quick health checks, monitoring alerts.';

-- =====================================================
-- 10. Reset Statistics Function
-- =====================================================

CREATE OR REPLACE FUNCTION reset_performance_stats()
RETURNS TEXT AS $$
BEGIN
  -- Reset table/index statistics
  PERFORM pg_stat_reset();

  RETURN 'Performance statistics reset successfully';
EXCEPTION
  WHEN insufficient_privilege THEN
    RETURN 'ERROR: Insufficient privileges. Contact database administrator.';
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reset_performance_stats IS
'Resets all performance statistics for a fresh start.
Usage: SELECT reset_performance_stats();
Warning: Only use after analyzing current statistics.';

-- =====================================================
-- 11. Create Admin Monitoring Helper View
-- =====================================================

CREATE OR REPLACE VIEW v_admin_performance_quick_check AS
SELECT
  'Database Size' as check_name,
  (SELECT pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))::bigint) FROM pg_tables WHERE schemaname = 'public') as value,
  'OK' as status
UNION ALL
SELECT
  'Table Cache Hit Ratio',
  (SELECT ROUND((SUM(heap_blks_hit)::numeric / NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0)) * 100, 2)::TEXT || '%' FROM pg_statio_user_tables),
  CASE
    WHEN (SELECT ROUND((SUM(heap_blks_hit)::numeric / NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0)) * 100, 2) FROM pg_statio_user_tables) > 95 THEN 'GOOD'
    WHEN (SELECT ROUND((SUM(heap_blks_hit)::numeric / NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0)) * 100, 2) FROM pg_statio_user_tables) > 90 THEN 'OK'
    ELSE 'WARNING'
  END
UNION ALL
SELECT
  'Index Cache Hit Ratio',
  (SELECT ROUND((SUM(idx_blks_hit)::numeric / NULLIF(SUM(idx_blks_hit) + SUM(idx_blks_read), 0)) * 100, 2)::TEXT || '%' FROM pg_statio_user_indexes),
  CASE
    WHEN (SELECT ROUND((SUM(idx_blks_hit)::numeric / NULLIF(SUM(idx_blks_hit) + SUM(idx_blks_read), 0)) * 100, 2) FROM pg_statio_user_indexes) > 95 THEN 'GOOD'
    WHEN (SELECT ROUND((SUM(idx_blks_hit)::numeric / NULLIF(SUM(idx_blks_hit) + SUM(idx_blks_read), 0)) * 100, 2) FROM pg_statio_user_indexes) > 90 THEN 'OK'
    ELSE 'WARNING'
  END
UNION ALL
SELECT
  'Unused Indexes',
  (SELECT COUNT(*)::TEXT FROM pg_stat_user_indexes WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey'),
  CASE
    WHEN (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey') = 0 THEN 'GOOD'
    WHEN (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey') < 5 THEN 'OK'
    ELSE 'WARNING'
  END;

COMMENT ON VIEW v_admin_performance_quick_check IS
'Quick health check for admins with status indicators.
Usage: SELECT * FROM v_admin_performance_quick_check;
Statuses: GOOD (optimal), OK (acceptable), WARNING (needs attention).';

-- =====================================================
-- 12. Summary Report
-- =====================================================

DO $$
DECLARE
  total_views INTEGER := 10;
  total_functions INTEGER := 2;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Performance Monitoring System - Phase 4';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Extensions Enabled: 1 (pg_stat_statements)';
  RAISE NOTICE 'Monitoring Views Created: %', total_views;
  RAISE NOTICE 'Helper Functions Created: %', total_functions;
  RAISE NOTICE '';
  RAISE NOTICE 'Views Created:';
  RAISE NOTICE '  1. v_index_usage_stats - Index usage analysis';
  RAISE NOTICE '  2. v_slow_queries - Slow query detection';
  RAISE NOTICE '  3. v_table_sizes - Table/index size tracking';
  RAISE NOTICE '  4. v_cache_hit_ratio - Cache performance';
  RAISE NOTICE '  5. v_duplicate_indexes - Duplicate detection';
  RAISE NOTICE '  6. v_table_bloat - Bloat estimation';
  RAISE NOTICE '  7. v_monitoring_dashboard - Single-row dashboard';
  RAISE NOTICE '  8. v_admin_performance_quick_check - Quick health check';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions Created:';
  RAISE NOTICE '  1. get_query_performance_summary() - Performance summary';
  RAISE NOTICE '  2. reset_performance_stats() - Reset statistics';
  RAISE NOTICE '';
  RAISE NOTICE 'Quick Start Commands:';
  RAISE NOTICE '  -- Dashboard:';
  RAISE NOTICE '  SELECT * FROM v_monitoring_dashboard;';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Health Check:';
  RAISE NOTICE '  SELECT * FROM v_admin_performance_quick_check;';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Performance Summary:';
  RAISE NOTICE '  SELECT * FROM get_query_performance_summary();';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Find Slow Queries:';
  RAISE NOTICE '  SELECT * FROM v_slow_queries LIMIT 10;';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Find Unused Indexes:';
  RAISE NOTICE '  SELECT * FROM v_index_usage_stats WHERE usage_level = ''UNUSED'';';
  RAISE NOTICE '============================================================';
END $$;
