-- Security Fix: SECURITY DEFINER to SECURITY INVOKER
-- Created: 2025-10-25
-- Purpose: Fix RLS bypass vulnerability in RPC functions
-- Reference: docs/SECURITY_AUDIT_2025-10-25.md

-- ============================================================
-- IMPORTANT: This migration addresses HIGH severity issues:
-- 1. RLS bypass via SECURITY DEFINER
-- 2. DoS vulnerability (no array size limit)
-- 3. Missing authorization checks
-- ============================================================

-- ============================================================
-- 1. Fix get_players_with_hand_counts() - SECURITY INVOKER
-- ============================================================

CREATE OR REPLACE FUNCTION get_players_with_hand_counts()
RETURNS TABLE (
  id UUID,
  name TEXT,
  country TEXT,
  total_winnings BIGINT,
  photo_url TEXT,
  hendon_mob_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  hand_count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from DEFINER to respect RLS
STABLE  -- Function doesn't modify data
AS $$
BEGIN
  -- This query now respects RLS policies on players and hand_players tables
  -- Anonymous users can still execute (GRANT remains), but RLS determines what they see
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.country,
    p.total_winnings,
    p.photo_url,
    p.hendon_mob_url,
    p.created_at,
    p.updated_at,
    COUNT(DISTINCT hp.hand_id) AS hand_count
  FROM players p
  LEFT JOIN hand_players hp ON p.id = hp.player_id
  GROUP BY p.id, p.name, p.country, p.total_winnings, p.photo_url, p.hendon_mob_url, p.created_at, p.updated_at
  ORDER BY p.total_winnings DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION get_players_with_hand_counts() IS
'Optimized function to fetch all players with their hand counts.
SECURITY FIX: Changed to SECURITY INVOKER to respect RLS policies.
Read-only function that returns public player data.';

-- ============================================================
-- 2. Fix get_player_hands_grouped() - Add Authorization
-- ============================================================

CREATE OR REPLACE FUNCTION get_player_hands_grouped(player_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from DEFINER to respect RLS
STABLE  -- Function doesn't modify data
AS $$
DECLARE
  result JSONB;
  requesting_user_id UUID;
  is_admin BOOLEAN;
  has_player_claim BOOLEAN;
BEGIN
  -- Get current authenticated user
  requesting_user_id := auth.uid();

  -- Check if user is admin/high_templar
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = requesting_user_id
    AND role IN ('admin', 'high_templar')
    AND banned_at IS NULL
  ) INTO is_admin;

  -- Check if user has approved claim on this player
  SELECT EXISTS (
    SELECT 1 FROM player_claims
    WHERE player_id = player_uuid
    AND user_id = requesting_user_id
    AND status = 'approved'
  ) INTO has_player_claim;

  -- Authorization check: Allow if admin OR has player claim
  IF NOT (is_admin OR has_player_claim) THEN
    -- Return empty result for unauthorized access instead of error
    -- This prevents information disclosure about player existence
    RETURN '[]'::jsonb;
  END IF;

  -- Original query (now with authorization)
  SELECT COALESCE(jsonb_agg(tournament_data), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'category', t.category,
      'location', t.location,
      'sub_events', (
        SELECT COALESCE(jsonb_agg(subevent_data), '[]'::jsonb)
        FROM (
          SELECT jsonb_build_object(
            'id', se.id,
            'name', se.name,
            'date', se.date,
            'days', (
              SELECT COALESCE(jsonb_agg(day_data), '[]'::jsonb)
              FROM (
                SELECT jsonb_build_object(
                  'id', d.id,
                  'name', d.name,
                  'video_url', d.video_url,
                  'video_file', d.video_file,
                  'video_source', d.video_source,
                  'video_nas_path', d.video_nas_path,
                  'hands', (
                    SELECT COALESCE(jsonb_agg(hand_data), '[]'::jsonb)
                    FROM (
                      SELECT jsonb_build_object(
                        'id', h.id,
                        'number', h.number,
                        'description', h.description,
                        'timestamp', h.timestamp,
                        'pot_size', h.pot_size,
                        'board_cards', h.board_cards,
                        'confidence', h.confidence,
                        'created_at', h.created_at,
                        'hand_players', (
                          SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                              'position', hp_inner.position,
                              'cards', hp_inner.cards,
                              'player', jsonb_build_object(
                                'name', p_inner.name
                              )
                            )
                          ), '[]'::jsonb)
                          FROM hand_players hp_inner
                          LEFT JOIN players p_inner ON hp_inner.player_id = p_inner.id
                          WHERE hp_inner.hand_id = h.id
                        )
                      ) AS hand_data
                      FROM hands h
                      INNER JOIN hand_players hp ON h.id = hp.hand_id
                      WHERE h.day_id = d.id
                        AND hp.player_id = player_uuid
                      ORDER BY h.created_at DESC
                    ) hands_subquery
                  )
                ) AS day_data
                FROM days d
                WHERE d.sub_event_id = se.id
                  AND EXISTS (
                    SELECT 1 FROM hands h2
                    INNER JOIN hand_players hp2 ON h2.id = hp2.hand_id
                    WHERE h2.day_id = d.id AND hp2.player_id = player_uuid
                  )
                ORDER BY d.published_at DESC NULLS LAST
              ) days_subquery
            )
          ) AS subevent_data
          FROM sub_events se
          WHERE se.tournament_id = t.id
            AND EXISTS (
              SELECT 1 FROM days d2
              INNER JOIN hands h3 ON d2.id = h3.day_id
              INNER JOIN hand_players hp3 ON h3.id = hp3.hand_id
              WHERE d2.sub_event_id = se.id AND hp3.player_id = player_uuid
            )
          ORDER BY se.date DESC
        ) subevents_subquery
      )
    ) AS tournament_data
    FROM tournaments t
    WHERE EXISTS (
      SELECT 1 FROM sub_events se2
      INNER JOIN days d3 ON se2.id = d3.sub_event_id
      INNER JOIN hands h4 ON d3.id = h4.day_id
      INNER JOIN hand_players hp4 ON h4.id = hp4.hand_id
      WHERE se2.tournament_id = t.id AND hp4.player_id = player_uuid
    )
    ORDER BY t.start_date DESC
  ) tournaments_subquery;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_player_hands_grouped(UUID) IS
'Optimized function to fetch all hands for a player grouped by tournament hierarchy.
SECURITY FIX: Changed to SECURITY INVOKER + added authorization check.
Only admins and approved player claimants can access hand history.
Returns empty array for unauthorized access (prevents player enumeration).';

-- ============================================================
-- 3. Fix get_hand_details_batch() - Add Array Size Limit
-- ============================================================

CREATE OR REPLACE FUNCTION get_hand_details_batch(hand_ids UUID[])
RETURNS TABLE (
  id UUID,
  number TEXT,
  description TEXT,
  "timestamp" TEXT,
  pot_size INTEGER,
  board_cards TEXT[],
  confidence INTEGER,
  favorite BOOLEAN,
  day_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  hand_players JSONB,
  day_info JSONB
)
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from DEFINER to respect RLS
STABLE  -- Function doesn't modify data
AS $$
DECLARE
  array_size INTEGER;
BEGIN
  -- DoS Protection: Limit array size to prevent resource exhaustion
  array_size := array_length(hand_ids, 1);

  IF array_size IS NULL THEN
    -- Empty array, return no results
    RETURN;
  END IF;

  IF array_size > 100 THEN
    RAISE EXCEPTION 'Array size (%) exceeds maximum allowed (100). Please request hands in batches.', array_size
      USING HINT = 'Split your request into multiple smaller batches';
  END IF;

  -- Original query (now with DoS protection)
  RETURN QUERY
  SELECT
    h.id,
    h.number,
    h.description,
    h.timestamp,
    h.pot_size,
    h.board_cards,
    h.confidence,
    h.favorite,
    h.day_id,
    h.created_at,
    h.updated_at,
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'position', hp.position,
          'cards', hp.cards,
          'player', jsonb_build_object(
            'id', p.id,
            'name', p.name
          )
        )
      ), '[]'::jsonb)
      FROM hand_players hp
      LEFT JOIN players p ON hp.player_id = p.id
      WHERE hp.hand_id = h.id
    ) AS hand_players,
    jsonb_build_object(
      'id', d.id,
      'name', d.name,
      'video_url', d.video_url,
      'video_file', d.video_file,
      'video_source', d.video_source,
      'video_nas_path', d.video_nas_path,
      'sub_event', jsonb_build_object(
        'id', se.id,
        'name', se.name,
        'date', se.date,
        'tournament', jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'category', t.category,
          'location', t.location
        )
      )
    ) AS day_info
  FROM hands h
  INNER JOIN days d ON h.day_id = d.id
  INNER JOIN sub_events se ON d.sub_event_id = se.id
  INNER JOIN tournaments t ON se.tournament_id = t.id
  WHERE h.id = ANY(hand_ids)
  ORDER BY h.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_hand_details_batch(UUID[]) IS
'Optimized function to fetch multiple hands with full details in a single query.
SECURITY FIX: Changed to SECURITY INVOKER + added array size limit (max 100).
DoS Protection: Prevents resource exhaustion from large arrays.
Returns hands with nested player and tournament hierarchy information.';

-- ============================================================
-- 4. Permissions Remain Unchanged (Already Granted)
-- ============================================================

-- No changes to GRANT statements - permissions remain the same:
-- - authenticated can execute all 3 functions
-- - anon can execute get_players_with_hand_counts() only
--
-- The difference is that now RLS policies apply, so even though
-- anon can EXECUTE the function, RLS determines what data is returned.

-- ============================================================
-- 5. Verify Changes
-- ============================================================

DO $$
DECLARE
  security_definer_count INTEGER;
BEGIN
  -- Count remaining SECURITY DEFINER functions (should be 0)
  SELECT COUNT(*) INTO security_definer_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'get_players_with_hand_counts',
      'get_player_hands_grouped',
      'get_hand_details_batch'
    )
    AND p.prosecdef = true;

  IF security_definer_count > 0 THEN
    RAISE WARNING 'Still % SECURITY DEFINER functions remaining', security_definer_count;
  ELSE
    RAISE NOTICE '✅ All functions successfully changed to SECURITY INVOKER';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Security Fix Applied Successfully';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes Made:';
  RAISE NOTICE '  1. ✅ get_players_with_hand_counts() - SECURITY INVOKER';
  RAISE NOTICE '  2. ✅ get_player_hands_grouped() - SECURITY INVOKER + Authorization';
  RAISE NOTICE '  3. ✅ get_hand_details_batch() - SECURITY INVOKER + Array Limit';
  RAISE NOTICE '';
  RAISE NOTICE 'Security Improvements:';
  RAISE NOTICE '  - RLS policies now apply to all RPC functions';
  RAISE NOTICE '  - Authorization check for player hand history';
  RAISE NOTICE '  - DoS protection via array size limit (max 100)';
  RAISE NOTICE '';
  RAISE NOTICE 'Testing Required:';
  RAISE NOTICE '  1. Test with authenticated users';
  RAISE NOTICE '  2. Test with anonymous users';
  RAISE NOTICE '  3. Test player hand history access control';
  RAISE NOTICE '  4. Test array size limit (>100 items)';
  RAISE NOTICE '';
  RAISE NOTICE 'Reference: docs/SECURITY_AUDIT_2025-10-25.md';
  RAISE NOTICE '============================================================';
END $$;
