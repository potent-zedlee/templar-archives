-- Migration: Add Hand Tags System
-- Description: Allows users to tag hands with categories like Bluff, Hero Call, Bad Beat, etc.

-- ==================== CREATE TABLE ====================

CREATE TABLE IF NOT EXISTS hand_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate tags on the same hand
  CONSTRAINT unique_hand_tag UNIQUE(hand_id, tag_name, created_by)
);

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_hand_tags_hand_id ON hand_tags(hand_id);
CREATE INDEX IF NOT EXISTS idx_hand_tags_tag_name ON hand_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_hand_tags_created_by ON hand_tags(created_by);

-- ==================== RLS POLICIES ====================

-- Enable RLS
ALTER TABLE hand_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view tags
CREATE POLICY "Anyone can view hand tags"
  ON hand_tags
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can add tags
CREATE POLICY "Authenticated users can add tags"
  ON hand_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their own tags
CREATE POLICY "Users can delete their own tags"
  ON hand_tags
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- ==================== FUNCTIONS ====================

-- Function: Get tag statistics
CREATE OR REPLACE FUNCTION get_hand_tag_stats()
RETURNS TABLE (
  tag_name TEXT,
  count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH tag_counts AS (
    SELECT
      ht.tag_name,
      COUNT(DISTINCT ht.hand_id) AS tag_count
    FROM hand_tags ht
    GROUP BY ht.tag_name
  ),
  total AS (
    SELECT COUNT(DISTINCT hand_id) AS total_count
    FROM hand_tags
  )
  SELECT
    tc.tag_name,
    tc.tag_count,
    CASE
      WHEN t.total_count > 0
      THEN ROUND((tc.tag_count::NUMERIC / t.total_count::NUMERIC) * 100, 2)
      ELSE 0
    END AS percentage
  FROM tag_counts tc
  CROSS JOIN total t
  ORDER BY tc.tag_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Search hands by tags (intersection)
CREATE OR REPLACE FUNCTION search_hands_by_tags(tag_names TEXT[])
RETURNS TABLE (
  hand_id UUID,
  tag_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ht.hand_id,
    COUNT(DISTINCT ht.tag_name) AS tag_count
  FROM hand_tags ht
  WHERE ht.tag_name = ANY(tag_names)
  GROUP BY ht.hand_id
  HAVING COUNT(DISTINCT ht.tag_name) = array_length(tag_names, 1)
  ORDER BY ht.hand_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user's tag history
CREATE OR REPLACE FUNCTION get_user_tag_history(user_id UUID)
RETURNS TABLE (
  hand_id UUID,
  tag_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  hand_number TEXT,
  tournament_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ht.hand_id,
    ht.tag_name,
    ht.created_at,
    h.number AS hand_number,
    t.name AS tournament_name
  FROM hand_tags ht
  INNER JOIN hands h ON ht.hand_id = h.id
  INNER JOIN days d ON h.day_id = d.id
  INNER JOIN sub_events se ON d.sub_event_id = se.id
  INNER JOIN tournaments t ON se.tournament_id = t.id
  WHERE ht.created_by = user_id
  ORDER BY ht.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
