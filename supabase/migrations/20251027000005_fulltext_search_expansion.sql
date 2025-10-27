-- =====================================================
-- Phase 1.3: Full-Text Search Expansion
-- =====================================================
-- Purpose: Add full-text search capabilities to hands and players tables
-- Expected Effect: 50-70% improvement in hand/player search queries

-- =====================================================
-- 1. Hands Table - Description Search
-- =====================================================

-- Add tsvector column for hands.description
ALTER TABLE hands ADD COLUMN IF NOT EXISTS description_tsv tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_hands_description_tsv
ON hands USING GIN(description_tsv);

COMMENT ON COLUMN hands.description_tsv IS
'Full-text search vector for hand descriptions.
Automatically updated by trigger on INSERT/UPDATE.
Used for: hand search, natural language queries.';

COMMENT ON INDEX idx_hands_description_tsv IS
'GIN index for full-text search on hand descriptions.
Expected improvement: 50-70% faster text searches.
Used in: /search page, natural search API.';

-- Create trigger to automatically update tsvector
CREATE OR REPLACE FUNCTION hands_description_tsv_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.description_tsv :=
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.number, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hands_description_tsv_update
  BEFORE INSERT OR UPDATE OF description, number ON hands
  FOR EACH ROW
  EXECUTE FUNCTION hands_description_tsv_trigger();

COMMENT ON TRIGGER hands_description_tsv_update ON hands IS
'Automatically updates description_tsv on INSERT/UPDATE.
Weights: description (A - highest), number (B - high).';

-- Populate existing data
UPDATE hands SET description_tsv =
  setweight(to_tsvector('english', COALESCE(description, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(number, '')), 'B')
WHERE description_tsv IS NULL;

-- =====================================================
-- 2. Players Table - Name Search
-- =====================================================

-- Add tsvector column for players.name
ALTER TABLE players ADD COLUMN IF NOT EXISTS name_tsv tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_players_name_tsv
ON players USING GIN(name_tsv);

COMMENT ON COLUMN players.name_tsv IS
'Full-text search vector for player names.
Automatically updated by trigger on INSERT/UPDATE.
Used for: player search, autocomplete.';

COMMENT ON INDEX idx_players_name_tsv IS
'GIN index for full-text search on player names.
Expected improvement: 60-70% faster player searches.
Used in: /players page search, quick player lookup.';

-- Create trigger to automatically update tsvector
CREATE OR REPLACE FUNCTION players_name_tsv_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name_tsv := to_tsvector('english', COALESCE(NEW.name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_name_tsv_update
  BEFORE INSERT OR UPDATE OF name ON players
  FOR EACH ROW
  EXECUTE FUNCTION players_name_tsv_trigger();

COMMENT ON TRIGGER players_name_tsv_update ON players IS
'Automatically updates name_tsv on INSERT/UPDATE.';

-- Populate existing data
UPDATE players SET name_tsv = to_tsvector('english', COALESCE(name, ''))
WHERE name_tsv IS NULL;

-- =====================================================
-- 3. Create Full-Text Search Helper Functions
-- =====================================================

-- Function: Search hands by text
CREATE OR REPLACE FUNCTION search_hands_fulltext(search_query TEXT, max_results INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  number TEXT,
  description TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.number,
    h.description,
    ts_rank(h.description_tsv, plainto_tsquery('english', search_query)) AS relevance
  FROM hands h
  WHERE h.description_tsv @@ plainto_tsquery('english', search_query)
  ORDER BY relevance DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_hands_fulltext IS
'Full-text search for hands by description/number.
Returns relevance-ranked results.
Usage: SELECT * FROM search_hands_fulltext(''pocket aces'', 20);';

-- Function: Search players by name
CREATE OR REPLACE FUNCTION search_players_fulltext(search_query TEXT, max_results INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  name TEXT,
  country TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.country,
    ts_rank(p.name_tsv, plainto_tsquery('english', search_query)) AS relevance
  FROM players p
  WHERE p.name_tsv @@ plainto_tsquery('english', search_query)
  ORDER BY relevance DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_players_fulltext IS
'Full-text search for players by name.
Returns relevance-ranked results.
Usage: SELECT * FROM search_players_fulltext(''phil ivey'', 10);';

-- =====================================================
-- 4. Create Search Statistics View
-- =====================================================

CREATE OR REPLACE VIEW v_fulltext_search_stats AS
SELECT
  'hands' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(description_tsv) AS indexed_rows,
  pg_size_pretty(pg_total_relation_size('idx_hands_description_tsv')) AS index_size
FROM hands
UNION ALL
SELECT
  'players' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(name_tsv) AS indexed_rows,
  pg_size_pretty(pg_total_relation_size('idx_players_name_tsv')) AS index_size
FROM players;

COMMENT ON VIEW v_fulltext_search_stats IS
'Statistics for full-text search indexes.
Shows coverage and size of FTS indexes.
Usage: SELECT * FROM v_fulltext_search_stats;';

-- =====================================================
-- 5. Analyze Updated Tables
-- =====================================================

-- Update statistics for query planner
ANALYZE hands;
ANALYZE players;

-- =====================================================
-- 6. Create Example Search Queries
-- =====================================================

-- Example queries for testing
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Full-Text Search Expansion - Phase 1.3';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Indexes Created:';
  RAISE NOTICE '  1. idx_hands_description_tsv - GIN index on hands';
  RAISE NOTICE '  2. idx_players_name_tsv - GIN index on players';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers Created:';
  RAISE NOTICE '  1. hands_description_tsv_update - Auto-update on hands';
  RAISE NOTICE '  2. players_name_tsv_update - Auto-update on players';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions Created:';
  RAISE NOTICE '  1. search_hands_fulltext(query, limit) - Search hands';
  RAISE NOTICE '  2. search_players_fulltext(query, limit) - Search players';
  RAISE NOTICE '';
  RAISE NOTICE 'Views Created:';
  RAISE NOTICE '  1. v_fulltext_search_stats - Search statistics';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected Performance Improvements:';
  RAISE NOTICE '  - Hand description search: +50-70%%';
  RAISE NOTICE '  - Player name search: +60-70%%';
  RAISE NOTICE '  - Natural language queries: Much better relevance ranking';
  RAISE NOTICE '';
  RAISE NOTICE 'Example Usage:';
  RAISE NOTICE '  -- Search hands:';
  RAISE NOTICE '  SELECT * FROM search_hands_fulltext(''pocket aces'', 20);';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Search players:';
  RAISE NOTICE '  SELECT * FROM search_players_fulltext(''daniel negreanu'', 10);';
  RAISE NOTICE '';
  RAISE NOTICE '  -- View statistics:';
  RAISE NOTICE '  SELECT * FROM v_fulltext_search_stats;';
  RAISE NOTICE '';
  RAISE NOTICE 'All existing data has been indexed.';
  RAISE NOTICE '============================================================';
END $$;
