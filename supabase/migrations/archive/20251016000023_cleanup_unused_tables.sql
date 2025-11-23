-- Cleanup unused tables and columns
-- This migration removes tables and columns that were created but never used

-- 1. Drop player_notes table (from migration 010)
-- This table was created but no code uses it
DROP TABLE IF EXISTS public.player_notes CASCADE;

-- 2. Drop player_tags table (from migration 010)
-- This table was created but no code uses it
DROP TABLE IF EXISTS public.player_tags CASCADE;

-- 3. Remove unused stats columns from players table (from migration 010)
-- These stats are calculated on-the-fly in lib/player-stats.ts, not stored in database
ALTER TABLE public.players DROP COLUMN IF EXISTS play_style;
ALTER TABLE public.players DROP COLUMN IF EXISTS vpip;
ALTER TABLE public.players DROP COLUMN IF EXISTS pfr;
ALTER TABLE public.players DROP COLUMN IF EXISTS three_bet;
ALTER TABLE public.players DROP COLUMN IF EXISTS ats;
ALTER TABLE public.players DROP COLUMN IF EXISTS wtsd;
ALTER TABLE public.players DROP COLUMN IF EXISTS stats_updated_at;

-- 4. Drop related indexes
DROP INDEX IF EXISTS idx_player_notes_player_id;
DROP INDEX IF EXISTS idx_player_tags_player_id;
DROP INDEX IF EXISTS idx_players_play_style;
