-- ============================================================
-- Migration: Add thumbnail_url to save_hand_with_players_actions RPC
-- Purpose: Enable automatic thumbnail URL storage when saving hands
-- Phase: 3 - KAN Analysis Enhancement
-- Author: Claude Code
-- Date: 2025-11-14
-- ============================================================

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS save_hand_with_players_actions CASCADE;

-- Recreate function with thumbnail_url parameter
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
  p_actions JSONB,

  -- NEW: Optional parameters (Phase 1 & 3)
  p_small_blind INTEGER DEFAULT NULL,
  p_big_blind INTEGER DEFAULT NULL,
  p_ante INTEGER DEFAULT 0,
  p_pot_preflop INTEGER DEFAULT NULL,
  p_pot_flop INTEGER DEFAULT NULL,
  p_pot_turn INTEGER DEFAULT NULL,
  p_pot_river INTEGER DEFAULT NULL,
  p_thumbnail_url TEXT DEFAULT NULL
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
    raw_data,
    small_blind,
    big_blind,
    ante,
    pot_preflop,
    pot_flop,
    pot_turn,
    pot_river,
    thumbnail_url
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
    p_raw_data,
    p_small_blind,
    p_big_blind,
    p_ante,
    p_pot_preflop,
    p_pot_flop,
    p_pot_turn,
    p_pot_river,
    p_thumbnail_url
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

COMMENT ON FUNCTION save_hand_with_players_actions IS 'Atomically save hand with all players and actions (transactional, with thumbnail support)';

-- Grant permissions
GRANT EXECUTE ON FUNCTION save_hand_with_players_actions TO service_role;

-- ============================================================
-- Migration complete
-- ============================================================
