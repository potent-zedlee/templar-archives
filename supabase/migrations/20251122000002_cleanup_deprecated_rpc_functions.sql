-- Phase 2: Remove deprecated RPC functions
-- These functions are not used in the TypeScript + Trigger.dev v3 architecture

-- Remove get_unsorted_videos function (not used in current codebase)
DROP FUNCTION IF EXISTS get_unsorted_videos();
DROP FUNCTION IF EXISTS get_unsorted_videos(UUID);

-- Remove organize_video function (not used in current codebase)
DROP FUNCTION IF EXISTS organize_video(UUID, UUID, UUID);

-- Remove create_unsorted_video function (not used in current codebase)
DROP FUNCTION IF EXISTS create_unsorted_video(TEXT, TEXT, TEXT, TEXT, TEXT);

-- Note: normalize_tournament_category function is kept
-- because it's used by idx_tournaments_category_normalized index
-- and tournament_category_stats view
