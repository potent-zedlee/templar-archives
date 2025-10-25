-- ============================================================
-- Database Integrity Check Script
-- Created: 2025-10-25
-- Purpose: Verify RPC functions, indexes, and RLS policies
-- ============================================================

\echo '============================================================'
\echo 'Templar Archives - Database Integrity Check'
\echo '============================================================'
\echo ''

-- ============================================================
-- 1. RPC Functions Check
-- ============================================================

\echo '1. Checking RPC Functions...'
\echo ''

SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  CASE p.prosecdef
    WHEN true THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END AS security_type,
  CASE p.provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END AS volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_players_with_hand_counts',
    'get_player_hands_grouped',
    'get_hand_details_batch'
  )
ORDER BY p.proname;

\echo ''

-- ============================================================
-- 2. Function Permissions Check
-- ============================================================

\echo '2. Checking Function Permissions...'
\echo ''

SELECT
  p.proname AS function_name,
  r.rolname AS granted_to,
  CASE
    WHEN has_function_privilege(r.oid, p.oid, 'EXECUTE')
    THEN 'EXECUTE'
    ELSE 'NO ACCESS'
  END AS privilege
FROM pg_proc p
CROSS JOIN pg_roles r
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_players_with_hand_counts',
    'get_player_hands_grouped',
    'get_hand_details_batch'
  )
  AND r.rolname IN ('anon', 'authenticated', 'service_role')
ORDER BY p.proname, r.rolname;

\echo ''

-- ============================================================
-- 3. Indexes Check
-- ============================================================

\echo '3. Checking Composite Indexes...'
\echo ''

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_hand_players_player_hand',
    'idx_hand_players_hand_player',
    'idx_hands_day_created',
    'idx_hands_number_day',
    'idx_hands_board_cards',
    'idx_event_payouts_player_subevent',
    'idx_hand_actions_hand_street_seq',
    'idx_sub_events_tournament_date'
  )
ORDER BY tablename, indexname;

\echo ''

-- ============================================================
-- 4. Index Usage Statistics
-- ============================================================

\echo '4. Checking Index Usage...'
\echo ''

SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_hand_players_player_hand',
    'idx_hand_players_hand_player',
    'idx_hands_day_created',
    'idx_hands_number_day',
    'idx_hands_board_cards',
    'idx_event_payouts_player_subevent',
    'idx_hand_actions_hand_street_seq',
    'idx_sub_events_tournament_date'
  )
ORDER BY idx_scan DESC;

\echo ''

-- ============================================================
-- 5. RLS Policies Check (Core Tables)
-- ============================================================

\echo '5. Checking RLS Policies...'
\echo ''

SELECT
  schemaname,
  tablename,
  policyname,
  CASE cmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END AS command,
  roles,
  CASE qual
    WHEN NULL THEN 'No USING clause'
    ELSE substring(qual::text, 1, 100) || '...'
  END AS using_clause,
  CASE with_check
    WHEN NULL THEN 'No WITH CHECK clause'
    ELSE substring(with_check::text, 1, 100) || '...'
  END AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'tournaments',
    'sub_events',
    'days',
    'hands',
    'players',
    'hand_players'
  )
ORDER BY tablename, command, policyname;

\echo ''

-- ============================================================
-- 6. Table Statistics
-- ============================================================

\echo '6. Checking Table Statistics (Last ANALYZE)...'
\echo ''

SELECT
  schemaname,
  tablename,
  n_live_tup AS row_count,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'tournaments',
    'sub_events',
    'days',
    'hands',
    'players',
    'hand_players',
    'event_payouts',
    'hand_actions'
  )
ORDER BY tablename;

\echo ''

-- ============================================================
-- 7. Foreign Key Constraints Check
-- ============================================================

\echo '7. Checking Foreign Key Constraints...'
\echo ''

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'tournaments',
    'sub_events',
    'days',
    'hands',
    'players',
    'hand_players'
  )
ORDER BY tc.table_name, kcu.column_name;

\echo ''

-- ============================================================
-- 8. Security Check: SECURITY DEFINER Functions
-- ============================================================

\echo '8. Security Alert: SECURITY DEFINER Functions'
\echo ''

SELECT
  p.proname AS function_name,
  CASE p.prosecdef
    WHEN true THEN '⚠️  SECURITY DEFINER (RLS BYPASS POSSIBLE)'
    ELSE '✅ SECURITY INVOKER'
  END AS security_warning,
  pg_get_functiondef(p.oid) AS function_body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_players_with_hand_counts',
    'get_player_hands_grouped',
    'get_hand_details_batch'
  )
  AND p.prosecdef = true
ORDER BY p.proname;

\echo ''

-- ============================================================
-- 9. Anonymous Access Check
-- ============================================================

\echo '9. Checking Anonymous Access to Functions...'
\echo ''

SELECT
  p.proname AS function_name,
  CASE
    WHEN has_function_privilege('anon', p.oid, 'EXECUTE')
    THEN '⚠️  ANONYMOUS ACCESS ALLOWED'
    ELSE '✅ AUTHENTICATED ONLY'
  END AS access_level
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_players_with_hand_counts',
    'get_player_hands_grouped',
    'get_hand_details_batch'
  )
ORDER BY p.proname;

\echo ''

-- ============================================================
-- 10. Summary
-- ============================================================

\echo '============================================================'
\echo 'Integrity Check Complete'
\echo '============================================================'
\echo ''
\echo 'Review the results above for:'
\echo '  1. All 3 RPC functions exist and have correct signatures'
\echo '  2. All 8 composite indexes are created'
\echo '  3. RLS policies are properly configured'
\echo '  4. Table statistics are up to date'
\echo '  5. Security warnings (SECURITY DEFINER, anonymous access)'
\echo ''
\echo 'For detailed security analysis, see docs/SECURITY_AUDIT_2025-10-25.md'
\echo '============================================================'
