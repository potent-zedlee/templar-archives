-- Fix RPC security vulnerabilities
-- Critical Issue C2: Change SECURITY DEFINER to SECURITY INVOKER with explicit permission checks

-- ============================================================================
-- 1. Drop existing functions
-- ============================================================================
DROP FUNCTION IF EXISTS save_hand_with_players_actions(
  UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT[], TEXT, TEXT, BIGINT, JSONB, JSONB, JSONB
);

DROP FUNCTION IF EXISTS check_duplicate_analysis(UUID, JSONB);

-- ============================================================================
-- 2. Recreate check_duplicate_analysis with SECURITY INVOKER
-- ============================================================================
CREATE OR REPLACE FUNCTION check_duplicate_analysis(
  p_video_id UUID,
  p_segments JSONB
) RETURNS TABLE(
  job_id UUID,
  status TEXT,
  segments JSONB
) AS $$
BEGIN
  -- Validate that p_segments is a valid JSONB array
  IF jsonb_typeof(p_segments) != 'array' THEN
    RAISE EXCEPTION 'p_segments must be a JSONB array';
  END IF;

  -- Check if array is empty
  IF jsonb_array_length(p_segments) = 0 THEN
    RAISE EXCEPTION 'p_segments array cannot be empty';
  END IF;

  -- Validate each segment has required fields
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_segments) AS seg
    WHERE NOT (seg ? 'start' AND seg ? 'end')
  ) THEN
    RAISE EXCEPTION 'Each segment must have start and end fields';
  END IF;

  RETURN QUERY
  SELECT
    aj.id,
    aj.status,
    aj.segments
  FROM analysis_jobs aj
  WHERE
    aj.video_id = p_video_id
    AND aj.status IN ('pending', 'processing', 'completed')
    AND aj.segments IS NOT NULL
    -- Check if any segment overlaps (same start/end time)
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(aj.segments) AS existing_seg,
           jsonb_array_elements(p_segments) AS new_seg
      WHERE
        (existing_seg->>'start')::int = (new_seg->>'start')::int
        AND (existing_seg->>'end')::int = (new_seg->>'end')::int
    );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

COMMENT ON FUNCTION check_duplicate_analysis IS 'Check if video segments are already being analyzed or completed. SECURITY INVOKER - runs with caller privileges.';

-- ============================================================================
-- 3. Recreate save_hand_with_players_actions with SECURITY INVOKER
-- ============================================================================
CREATE OR REPLACE FUNCTION save_hand_with_players_actions(
  -- Hand data
  p_day_id UUID,
  p_job_id UUID,
  p_number TEXT,
  p_description TEXT,
  p_timestamp TEXT,
  p_video_timestamp_start INTEGER,
  p_video_timestamp_end INTEGER,
  p_stakes TEXT,
  p_board_flop TEXT[],
  p_board_turn TEXT,
  p_board_river TEXT,
  p_pot_size BIGINT,
  p_raw_data JSONB,

  -- Players data (array of JSONB objects)
  p_players JSONB,

  -- Actions data (array of JSONB objects)
  p_actions JSONB
) RETURNS UUID AS $$
DECLARE
  v_hand_id UUID;
  v_player JSONB;
  v_action JSONB;
  v_player_id UUID;
  v_hand_player_id UUID;
  v_current_role TEXT;
BEGIN
  -- Security check: Only service_role can execute this function
  SELECT current_setting('role', true) INTO v_current_role;
  IF v_current_role != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: only service_role can execute this function (current role: %)', v_current_role;
  END IF;

  -- Validate JSONB inputs
  IF jsonb_typeof(p_players) != 'array' THEN
    RAISE EXCEPTION 'p_players must be a JSONB array';
  END IF;

  IF jsonb_typeof(p_actions) != 'array' THEN
    RAISE EXCEPTION 'p_actions must be a JSONB array';
  END IF;

  -- 1. Insert hand
  INSERT INTO hands (
    day_id,
    job_id,
    number,
    description,
    timestamp,
    video_timestamp_start,
    video_timestamp_end,
    stakes,
    board_flop,
    board_turn,
    board_river,
    pot_size,
    raw_data
  ) VALUES (
    p_day_id,
    p_job_id,
    p_number,
    p_description,
    p_timestamp,
    p_video_timestamp_start,
    p_video_timestamp_end,
    p_stakes,
    p_board_flop,
    p_board_turn,
    p_board_river,
    p_pot_size,
    p_raw_data
  )
  RETURNING id INTO v_hand_id;

  -- 2. Insert players
  FOR v_player IN SELECT * FROM jsonb_array_elements(p_players)
  LOOP
    -- Validate player_id exists
    IF NOT (v_player ? 'player_id') THEN
      RAISE EXCEPTION 'Each player must have a player_id field';
    END IF;

    -- Get player_id from JSONB with safe casting
    BEGIN
      v_player_id := (v_player->>'player_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid player_id format: %', v_player->>'player_id';
    END;

    -- Insert hand_player with safe JSONB casting
    INSERT INTO hand_players (
      hand_id,
      player_id,
      poker_position,
      starting_stack,
      ending_stack,
      hole_cards,
      cards,
      final_amount,
      is_winner,
      hand_description
    ) VALUES (
      v_hand_id,
      v_player_id,
      v_player->>'poker_position',
      COALESCE((v_player->>'starting_stack')::BIGINT, 0),
      COALESCE((v_player->>'ending_stack')::BIGINT, 0),
      CASE
        WHEN jsonb_typeof(v_player->'hole_cards') = 'array' THEN
          ARRAY(SELECT jsonb_array_elements_text(v_player->'hole_cards'))
        ELSE NULL
      END,
      v_player->>'cards',
      COALESCE((v_player->>'final_amount')::BIGINT, 0),
      COALESCE((v_player->>'is_winner')::BOOLEAN, false),
      v_player->>'hand_description'
    )
    RETURNING id INTO v_hand_player_id;
  END LOOP;

  -- 3. Insert actions
  FOR v_action IN SELECT * FROM jsonb_array_elements(p_actions)
  LOOP
    -- Validate player_id exists
    IF NOT (v_action ? 'player_id') THEN
      RAISE EXCEPTION 'Each action must have a player_id field';
    END IF;

    -- Get player_id from JSONB with safe casting
    BEGIN
      v_player_id := (v_action->>'player_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid player_id in action: %', v_action->>'player_id';
    END;

    INSERT INTO hand_actions (
      hand_id,
      player_id,
      action_order,
      street,
      action_type,
      amount
    ) VALUES (
      v_hand_id,
      v_player_id,
      COALESCE((v_action->>'action_order')::INTEGER, 0),
      v_action->>'street',
      v_action->>'action_type',
      COALESCE((v_action->>'amount')::BIGINT, 0)
    );
  END LOOP;

  -- Return the new hand ID
  RETURN v_hand_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback is automatic in PostgreSQL functions
    RAISE EXCEPTION 'Failed to save hand: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

COMMENT ON FUNCTION save_hand_with_players_actions IS 'Atomically save hand with all players and actions. SECURITY INVOKER - runs with caller privileges (service_role only).';

-- ============================================================================
-- 4. Grant permissions
-- ============================================================================
REVOKE ALL ON FUNCTION check_duplicate_analysis FROM PUBLIC;
REVOKE ALL ON FUNCTION save_hand_with_players_actions FROM PUBLIC;

GRANT EXECUTE ON FUNCTION check_duplicate_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION save_hand_with_players_actions TO service_role;

-- ============================================================================
-- Migration Complete
-- Security improvements:
-- 1. Changed SECURITY DEFINER to SECURITY INVOKER for both functions
-- 2. Added explicit role checks (service_role only for save_hand)
-- 3. Added JSONB validation to prevent injection
-- 4. Added safe type casting with error handling
-- 5. Added COALESCE for nullable numeric fields
-- 6. Improved error messages with SQLSTATE
-- ============================================================================
