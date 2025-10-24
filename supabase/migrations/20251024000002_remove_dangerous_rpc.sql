-- Remove Dangerous RPC Function: execute_search_query
-- Security Enhancement: Prevent SQL Injection via Natural Search

-- Drop the execute_search_query RPC function (if exists)
DROP FUNCTION IF EXISTS execute_search_query(text);
DROP FUNCTION IF EXISTS execute_search_query(query_text text);

-- Add comment
COMMENT ON SCHEMA public IS 'Security: execute_search_query RPC function removed. Natural search now uses safe JSON-based filtering.';
