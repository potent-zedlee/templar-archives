-- ============================================================
-- Detailed Index Analysis for Optimization
-- ============================================================
-- Purpose: Identify unused, duplicate, and problematic indexes
-- ============================================================

-- ============================================================
-- 1. Check if 'days' table still exists (should be 'streams')
-- ============================================================
SELECT
  'Table Existence Check' as check_type,
  COUNT(*) FILTER (WHERE table_name = 'days') as days_table_count,
  COUNT(*) FILTER (WHERE table_name = 'streams') as streams_table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('days', 'streams');

-- ============================================================
-- 2. List all indexes referencing 'days' table (should not exist)
-- ============================================================
SELECT
  'Orphaned Days Indexes' as check_type,
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename = 'days'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================
-- 3. Unused Indexes (idx_scan = 0)
-- ============================================================
SELECT
  'Unused Indexes' as check_type,
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  pg_size_pretty(pg_relation_size(indexrelid)) as size,
  pg_relation_size(indexrelid) as size_bytes
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
  AND indexname NOT LIKE '%_unique%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================
-- 4. Very Low Usage Indexes (idx_scan < 10)
-- ============================================================
SELECT
  'Low Usage Indexes' as check_type,
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan > 0
  AND idx_scan < 10
  AND indexname NOT LIKE '%_pkey'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC
LIMIT 20;

-- ============================================================
-- 5. Duplicate Indexes (same column definitions)
-- ============================================================
WITH index_columns AS (
  SELECT
    schemaname,
    tablename,
    indexname,
    array_to_string(array_agg(attname ORDER BY attnum), ', ') as columns,
    pg_relation_size(indexrelid) as size
  FROM pg_stat_user_indexes
  JOIN pg_index ON pg_index.indexrelid = pg_stat_user_indexes.indexrelid
  JOIN pg_attribute ON pg_attribute.attrelid = pg_index.indrelid
    AND pg_attribute.attnum = ANY(pg_index.indkey)
  WHERE schemaname = 'public'
  GROUP BY schemaname, tablename, indexname, pg_stat_user_indexes.indexrelid
)
SELECT
  'Duplicate Indexes' as check_type,
  tablename,
  columns,
  array_agg(indexname ORDER BY size DESC) as duplicate_indexes,
  pg_size_pretty(SUM(size)) as total_size,
  COUNT(*) as duplicate_count
FROM index_columns
GROUP BY tablename, columns
HAVING COUNT(*) > 1
ORDER BY SUM(size) DESC;

-- ============================================================
-- 6. Indexes on deleted features (timecode_submissions, analysis_metadata)
-- ============================================================
SELECT
  'Deleted Feature Indexes' as check_type,
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%timecode%'
    OR indexname LIKE '%analysis_metadata%'
    OR indexname LIKE '%player_notes%'
    OR indexname LIKE '%player_tags%'
  )
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================
-- 7. Summary Statistics
-- ============================================================
WITH index_stats AS (
  SELECT
    COUNT(*) as total_indexes,
    COUNT(*) FILTER (WHERE idx_scan = 0 AND indexname NOT LIKE '%_pkey') as unused_indexes,
    COUNT(*) FILTER (WHERE idx_scan > 0) as used_indexes,
    COUNT(*) FILTER (WHERE idx_scan > 0 AND idx_scan < 10 AND indexname NOT LIKE '%_pkey') as low_usage_indexes,
    SUM(pg_relation_size(indexrelid)) FILTER (WHERE idx_scan = 0 AND indexname NOT LIKE '%_pkey') as unused_size_bytes,
    SUM(pg_relation_size(indexrelid)) as total_size_bytes
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
)
SELECT
  'Summary' as check_type,
  total_indexes,
  unused_indexes,
  used_indexes,
  low_usage_indexes,
  pg_size_pretty(unused_size_bytes) as unused_size,
  pg_size_pretty(total_size_bytes) as total_size,
  ROUND(100.0 * unused_indexes / NULLIF(total_indexes, 0), 2) as unused_percent
FROM index_stats;

-- ============================================================
-- 8. Table Size vs Index Size
-- ============================================================
SELECT
  'Table vs Index Size' as check_type,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size,
  ROUND(
    100.0 * (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename))
    / NULLIF(pg_total_relation_size(schemaname||'.'||tablename), 0),
    2
  ) as index_ratio_percent,
  (
    SELECT COUNT(*)
    FROM pg_stat_user_indexes
    WHERE pg_stat_user_indexes.schemaname = 'public'
      AND pg_stat_user_indexes.tablename = pt.tablename
  ) as index_count
FROM pg_tables pt
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- ============================================================
-- Notes
-- ============================================================
-- After running this analysis:
-- 1. Review "Orphaned Days Indexes" - these should all be removed
-- 2. Review "Unused Indexes" - consider removing if idx_scan = 0
-- 3. Review "Duplicate Indexes" - keep only the most efficient one
-- 4. Review "Deleted Feature Indexes" - safe to remove
-- 5. Review "Low Usage Indexes" - assess cost vs benefit
-- ============================================================
