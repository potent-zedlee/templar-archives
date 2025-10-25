-- Clean up incorrectly organized Triton data
-- Created: 2025-10-25
-- Purpose: Remove tournaments and sub-events created by the first (incorrect) parsing logic

-- ============================================================
-- Background
-- ============================================================
-- The initial organize-triton-streams.ts script (commit 5045df7) used incorrect parsing logic:
-- - Parsed "$150K NLH 8-Handed – Event #7" as Tournament="$150K NLH 8" (WRONG)
-- - Should be Tournament="Triton Poker Series Jeju II 2025" (CORRECT)
--
-- This migration cleans up the incorrectly created data so we can re-run with proper logic.
-- All data created on 2025-10-25 after 09:04 UTC will be removed.

-- ============================================================
-- 1. Safety Check - Count Records to be Deleted
-- ============================================================

DO $$
DECLARE
  tournaments_to_delete INTEGER;
  sub_events_to_delete INTEGER;
  streams_to_reset INTEGER;
BEGIN
  -- Count tournaments created by script
  SELECT COUNT(*) INTO tournaments_to_delete
  FROM tournaments
  WHERE created_at >= '2025-10-25 09:04:00+00'
    AND category = 'Triton';

  -- Count sub-events under those tournaments
  SELECT COUNT(*) INTO sub_events_to_delete
  FROM sub_events
  WHERE tournament_id IN (
    SELECT id FROM tournaments
    WHERE created_at >= '2025-10-25 09:04:00+00'
      AND category = 'Triton'
  );

  -- Count streams that will be reset
  SELECT COUNT(*) INTO streams_to_reset
  FROM streams
  WHERE sub_event_id IN (
    SELECT id FROM sub_events
    WHERE tournament_id IN (
      SELECT id FROM tournaments
      WHERE created_at >= '2025-10-25 09:04:00+00'
        AND category = 'Triton'
    )
  );

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Cleanup Preview';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Records to be deleted:';
  RAISE NOTICE '  - Tournaments: %', tournaments_to_delete;
  RAISE NOTICE '  - Sub-events: %', sub_events_to_delete;
  RAISE NOTICE '  - Streams to reset: % (will become unsorted)', streams_to_reset;
  RAISE NOTICE '============================================================';
END $$;

-- ============================================================
-- 2. Reset Streams to Unsorted
-- ============================================================

-- Reset streams that are under the incorrect sub-events
UPDATE streams
SET
  sub_event_id = NULL,
  is_organized = FALSE,
  organized_at = NULL
WHERE sub_event_id IN (
  SELECT id FROM sub_events
  WHERE tournament_id IN (
    SELECT id FROM tournaments
    WHERE created_at >= '2025-10-25 09:04:00+00'
      AND category = 'Triton'
  )
);

-- ============================================================
-- 3. Delete Sub-Events
-- ============================================================

-- Delete sub-events created under incorrect tournaments
DELETE FROM sub_events
WHERE tournament_id IN (
  SELECT id FROM tournaments
  WHERE created_at >= '2025-10-25 09:04:00+00'
    AND category = 'Triton'
);

-- ============================================================
-- 4. Delete Tournaments
-- ============================================================

-- Delete incorrectly parsed tournaments
DELETE FROM tournaments
WHERE created_at >= '2025-10-25 09:04:00+00'
  AND category = 'Triton';

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
  RAISE NOTICE '  - Incorrect Triton data removed';
  RAISE NOTICE '  - Streams reset to unsorted';
  RAISE NOTICE '';
  RAISE NOTICE 'Current State:';
  RAISE NOTICE '  - Total streams: %', total_streams;
  RAISE NOTICE '  - Unsorted streams: %', unsorted_streams;
  RAISE NOTICE '  - Remaining Triton tournaments: %', triton_tournaments;
  RAISE NOTICE '  - Remaining Triton sub-events: %', triton_sub_events;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Update organize-triton-streams.ts with correct parsing logic';
  RAISE NOTICE '  2. Re-run script with --execute flag';
  RAISE NOTICE '  3. Verify proper Tournament → Event → Stream structure';
  RAISE NOTICE '============================================================';
END $$;
