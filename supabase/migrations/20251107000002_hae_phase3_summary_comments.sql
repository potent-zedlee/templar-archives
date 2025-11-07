-- Migration: HAE Phase 3 - Add AI Summary for Hands
-- Date: 2025-11-07
-- Description:
--   1. Add ai_summary column to hands table for AI-generated hand summaries
--
-- Note: comments table already supports hand_id (see 20241001000004_add_community.sql)

-- 1. Add ai_summary to hands table
ALTER TABLE hands ADD COLUMN IF NOT EXISTS ai_summary TEXT;

COMMENT ON COLUMN hands.ai_summary IS 'AI-generated summary of the hand (2-3 sentences)';
