-- Clean up all Triton data for re-organization with improved matching logic
-- Created: 2025-10-25
-- Purpose: Remove all Triton tournaments and sub-events to re-organize with ±1 day tolerance

-- ============================================================
-- Background
-- ============================================================
-- The previous organize-triton-streams-v2.ts used ±3 day tolerance which caused
-- incorrect matching between videos and tournaments.
-- This migration cleans up ALL Triton data so we can re-run with improved logic:
-- - ±1 day tolerance instead of ±3 days
-- - 20 hard-coded tournament definitions from official Triton schedule
-- - Better location keyword matching

-- ============================================================
-- 1. Safety Check - Count Records to be Deleted
-- ============================================================

DO $$
DECLARE
  tournaments_to_delete INTEGER;
  sub_events_to_delete INTEGER;
  streams_to_reset INTEGER;
  hands_affected INTEGER;
BEGIN
  -- Count all Triton tournaments
  SELECT COUNT(*) INTO tournaments_to_delete
  FROM tournaments
  WHERE category = 'Triton';

  -- Count sub-events under Triton tournaments
  SELECT COUNT(*) INTO sub_events_to_delete
  FROM sub_events
  WHERE tournament_id IN (
    SELECT id FROM tournaments WHERE category = 'Triton'
  );

  -- Count streams that will be reset
  SELECT COUNT(*) INTO streams_to_reset
  FROM streams
  WHERE sub_event_id IN (
    SELECT id FROM sub_events
    WHERE tournament_id IN (
      SELECT id FROM tournaments WHERE category = 'Triton'
    )
  );

  -- Count hands that will be affected (day_id will be preserved)
  SELECT COUNT(*) INTO hands_affected
  FROM hands
  WHERE day_id IN (
    SELECT id FROM streams
    WHERE sub_event_id IN (
      SELECT id FROM sub_events
      WHERE tournament_id IN (
        SELECT id FROM tournaments WHERE category = 'Triton'
      )
    )
  );

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Cleanup Preview - ALL TRITON DATA';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Records to be deleted:';
  RAISE NOTICE '  - Tournaments: %', tournaments_to_delete;
  RAISE NOTICE '  - Sub-events: %', sub_events_to_delete;
  RAISE NOTICE '  - Streams to reset: % (will become unsorted)', streams_to_reset;
  RAISE NOTICE '  - Hands affected: % (stream_id will be preserved)', hands_affected;
  RAISE NOTICE '============================================================';
END $$;

-- ============================================================
-- 2. Reset Streams to Unsorted
-- ============================================================

-- Reset all streams under Triton tournaments
UPDATE streams
SET
  sub_event_id = NULL,
  is_organized = FALSE,
  organized_at = NULL
WHERE sub_event_id IN (
  SELECT id FROM sub_events
  WHERE tournament_id IN (
    SELECT id FROM tournaments WHERE category = 'Triton'
  )
);

-- ============================================================
-- 3. Delete Sub-Events
-- ============================================================

-- Delete all sub-events under Triton tournaments
DELETE FROM sub_events
WHERE tournament_id IN (
  SELECT id FROM tournaments WHERE category = 'Triton'
);

-- ============================================================
-- 4. Delete Tournaments
-- ============================================================

-- Delete all Triton tournaments
DELETE FROM tournaments
WHERE category = 'Triton';

-- ============================================================
-- Migration Complete
-- ============================================================

DO $$
DECLARE
  total_streams INTEGER;
  unsorted_streams INTEGER;
  triton_tournaments INTEGER;
  triton_sub_events INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_streams FROM streams;
  SELECT COUNT(*) INTO unsorted_streams FROM streams WHERE is_organized = FALSE;
  SELECT COUNT(*) INTO triton_tournaments FROM tournaments WHERE category = 'Triton';
  SELECT COUNT(*) INTO triton_sub_events FROM sub_events
    WHERE tournament_id IN (SELECT id FROM tournaments WHERE category = 'Triton');

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Cleanup Migration Completed';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Cleanup Results:';
  RAISE NOTICE '  - All Triton data removed';
  RAISE NOTICE '  - All Triton streams reset to unsorted';
  RAISE NOTICE '';
  RAISE NOTICE 'Current State:';
  RAISE NOTICE '  - Total streams: %', total_streams;
  RAISE NOTICE '  - Unsorted streams: %', unsorted_streams;
  RAISE NOTICE '  - Remaining Triton tournaments: %', triton_tournaments;
  RAISE NOTICE '  - Remaining Triton sub-events: %', triton_sub_events;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Run organize-triton-streams-v3.ts with improved matching';
  RAISE NOTICE '  2. Uses ±1 day tolerance instead of ±3 days';
  RAISE NOTICE '  3. 20 hard-coded tournaments from official schedule';
  RAISE NOTICE '  4. Verify Tournament → Event → Stream structure';
  RAISE NOTICE '============================================================';
END $$;
