-- Phase 1: Remove unused tables from Python backend era
-- These tables are not used in the TypeScript + Trigger.dev v3 architecture

-- Remove player_notes table (not used in current codebase)
DROP TABLE IF EXISTS player_notes CASCADE;

-- Remove player_tags table (not used in current codebase)
DROP TABLE IF EXISTS player_tags CASCADE;

-- Note: players table columns (play_style, vpip, pfr, three_bet, ats, wtsd) are kept
-- as they are actively used in player statistics features
