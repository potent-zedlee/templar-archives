-- Add transaction support and segment tracking for KAN analysis
-- This migration adds RPC functions for atomic hand insertion and duplicate checking

-- ============================================================================
-- 1. Add created_by field to analysis_jobs for user tracking
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='analysis_jobs' AND column_name='created_by') THEN
    ALTER TABLE analysis_jobs ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_by_created_at
  ON analysis_jobs(created_by, created_at DESC);

COMMENT ON COLUMN analysis_jobs.created_by IS 'User who created this analysis job';

-- ============================================================================
-- 2. Add result field to analysis_jobs for segment-level tracking
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='analysis_jobs' AND column_name='result') THEN
    ALTER TABLE analysis_jobs ADD COLUMN result JSONB;
  END IF;
END $$;

COMMENT ON COLUMN analysis_jobs.result IS 'Detailed segment-level results: {success: bool, segments_processed: int, segments_failed: int, segment_results: [...]}';

-- ============================================================================
-- 3. Function: Check for duplicate analysis jobs
-- ============================================================================
-- Returns existing job IDs that overlap with the requested segments
CREATE OR REPLACE FUNCTION check_duplicate_analysis(
  p_video_id UUID,
  p_segments JSONB
) RETURNS TABLE(
  job_id UUID,
  status TEXT,
  segments JSONB
) AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_duplicate_analysis IS 'Check if video segments are already being analyzed or completed';

-- ============================================================================
-- 4. Function: Save hand with players and actions (transactional)
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
BEGIN
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
    -- Get player_id from JSONB
    v_player_id := (v_player->>'player_id')::UUID;

    -- Insert hand_player
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
      (v_player->>'starting_stack')::BIGINT,
      (v_player->>'ending_stack')::BIGINT,
      (v_player->'hole_cards')::TEXT[],
      v_player->>'cards',
      (v_player->>'final_amount')::BIGINT,
      (v_player->>'is_winner')::BOOLEAN,
      v_player->>'hand_description'
    )
    RETURNING id INTO v_hand_player_id;
  END LOOP;

  -- 3. Insert actions
  FOR v_action IN SELECT * FROM jsonb_array_elements(p_actions)
  LOOP
    v_player_id := (v_action->>'player_id')::UUID;

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
      (v_action->>'action_order')::INTEGER,
      v_action->>'street',
      v_action->>'action_type',
      (v_action->>'amount')::BIGINT
    );
  END LOOP;

  -- Return the new hand ID
  RETURN v_hand_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback is automatic in PostgreSQL functions
    RAISE EXCEPTION 'Failed to save hand: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION save_hand_with_players_actions IS 'Atomically save hand with all players and actions (transactional)';

-- ============================================================================
-- 5. Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION check_duplicate_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION save_hand_with_players_actions TO service_role;

-- Note: save_hand_with_players_actions is service_role only for security
-- It should only be called from backend code with proper validation

-- ============================================================================
-- Migration Complete
-- ============================================================================
