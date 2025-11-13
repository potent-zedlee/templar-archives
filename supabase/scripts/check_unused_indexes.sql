-- ============================================================
-- Unused Indexes Analysis Script
-- ============================================================
-- Purpose: Find indexes that are never used (idx_scan = 0)
-- Run this in Supabase SQL Editor (Production)
-- ============================================================

-- 1. Unused Indexes Report
-- ============================================================
SELECT
  schemaname,
  relname as table_name,
  indexrelname as index_name,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as size,
  pg_relation_size(indexrelid) as size_bytes
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'  -- Exclude primary keys
  AND indexrelname NOT LIKE '%_unique%'  -- Exclude unique constraints
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================
-- 2. Index Usage Statistics (Top 20)
-- ============================================================
SELECT
  schemaname,
  relname as table_name,
  indexrelname as index_name,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY idx_scan DESC
LIMIT 20;

-- ============================================================
-- 3. Table Size vs Index Size
-- ============================================================
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size,
  ROUND(
    100.0 * (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename))
    / NULLIF(pg_total_relation_size(schemaname||'.'||tablename), 0),
    2
  ) as index_ratio_percent
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================
-- 4. Duplicate Indexes Detection
-- ============================================================
-- Find indexes with the same column definitions
SELECT
  indrelid::regclass as table_name,
  array_agg(indexrelid::regclass) as duplicate_indexes,
  indkey,
  count(*)
FROM pg_index
WHERE indrelid IN (
  SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace
)
GROUP BY indrelid, indkey
HAVING count(*) > 1
ORDER BY indrelid;

-- ============================================================
-- 5. Summary Statistics
-- ============================================================
WITH index_stats AS (
  SELECT
    COUNT(*) as total_indexes,
    COUNT(*) FILTER (WHERE idx_scan = 0) as unused_indexes,
    COUNT(*) FILTER (WHERE idx_scan > 0) as used_indexes,
    SUM(pg_relation_size(indexrelid)) FILTER (WHERE idx_scan = 0) as unused_size_bytes,
    SUM(pg_relation_size(indexrelid)) as total_size_bytes
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND indexrelname NOT LIKE '%_pkey'
)
SELECT
  total_indexes,
  unused_indexes,
  used_indexes,
  pg_size_pretty(unused_size_bytes) as unused_size,
  pg_size_pretty(total_size_bytes) as total_size,
  ROUND(100.0 * unused_indexes / total_indexes, 2) as unused_percent
FROM index_stats;

-- ============================================================
-- Notes
-- ============================================================
-- 1. idx_scan = 0 does NOT always mean the index is useless
--    - Recently created indexes may not have been used yet
--    - Indexes for rare queries (admin operations)
--    - Indexes for unique constraints (used internally)
--
-- 2. Before removing any index:
--    - Check if it's used in the application code
--    - Verify it's not needed for unique constraints
--    - Test performance without it in a dev environment
--
-- 3. Safe to remove if:
--    - idx_scan = 0 AND created > 1 month ago
--    - No code references to the indexed columns
--    - Covered by a composite index
--
-- 4. DO NOT remove:
--    - Primary key indexes (*_pkey)
--    - Unique constraint indexes
--    - Foreign key indexes (may not show high scans but crucial for JOINs)
-- ============================================================
