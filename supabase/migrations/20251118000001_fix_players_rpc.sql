-- Fix get_players_with_hand_counts() RPC function
-- Issue: hendon_mob_url column does not exist in players table
-- Created: 2025-11-18

-- Drop existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_players_with_hand_counts();

CREATE OR REPLACE FUNCTION get_players_with_hand_counts()
RETURNS TABLE (
  id UUID,
  name TEXT,
  country TEXT,
  total_winnings BIGINT,
  photo_url TEXT,
  created_at TIMESTAMPTZ,
  hand_count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER  -- Respects RLS
STABLE  -- Function doesn't modify data
AS $$
BEGIN
  -- This query respects RLS policies on players and hand_players tables
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.country,
    p.total_winnings,
    p.photo_url,
    p.created_at,
    COUNT(DISTINCT hp.hand_id) AS hand_count
  FROM players p
  LEFT JOIN hand_players hp ON p.id = hp.player_id
  GROUP BY p.id, p.name, p.country, p.total_winnings, p.photo_url, p.created_at
  ORDER BY p.total_winnings DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION get_players_with_hand_counts() IS
'Optimized function to fetch all players with their hand counts.
SECURITY: SECURITY INVOKER to respect RLS policies.
Read-only function that returns public player data.';
