-- Create function to calculate player counts for days
-- This function counts distinct players in each day's hands

CREATE OR REPLACE FUNCTION get_player_counts_by_day(day_ids uuid[])
RETURNS TABLE (
  day_id uuid,
  player_count bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    h.day_id,
    COUNT(DISTINCT hp.player_id) as player_count
  FROM hands h
  INNER JOIN hand_players hp ON hp.hand_id = h.id
  WHERE h.day_id = ANY(day_ids)
  GROUP BY h.day_id
$$;

-- Add comment
COMMENT ON FUNCTION get_player_counts_by_day(uuid[]) IS 'Calculates the number of distinct players in hands for each day';
