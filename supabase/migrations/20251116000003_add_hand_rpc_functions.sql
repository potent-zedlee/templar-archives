-- ===========================
-- Arbiter System: RPC Functions for Hand Management
-- ===========================
-- Purpose: Transactional hand creation with players and actions
-- Used by: Server Actions (createHandManually)

-- ===========================
-- 001: create_hand_with_details
-- ===========================
-- Creates a hand with associated players and actions in a single transaction

CREATE OR REPLACE FUNCTION create_hand_with_details(
  p_hand JSONB,
  p_players JSONB,
  p_actions JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_hand_id UUID;
  v_player JSONB;
  v_action JSONB;
  v_result JSONB;
BEGIN
  -- 1. Hand 생성
  INSERT INTO hands (
    stream_id,
    number,
    description,
    small_blind,
    big_blind,
    ante,
    pot_size,
    pot_preflop,
    pot_flop,
    pot_turn,
    pot_river,
    board_flop,
    board_turn,
    board_river,
    video_timestamp_start,
    video_timestamp_end,
    ai_summary
  )
  VALUES (
    (p_hand->>'stream_id')::UUID,
    p_hand->>'number',
    p_hand->>'description',
    COALESCE((p_hand->>'small_blind')::BIGINT, 0),
    COALESCE((p_hand->>'big_blind')::BIGINT, 0),
    (p_hand->>'ante')::BIGINT,
    (p_hand->>'pot_size')::BIGINT,
    (p_hand->>'pot_preflop')::BIGINT,
    (p_hand->>'pot_flop')::BIGINT,
    (p_hand->>'pot_turn')::BIGINT,
    (p_hand->>'pot_river')::BIGINT,
    p_hand->>'board_flop',
    p_hand->>'board_turn',
    p_hand->>'board_river',
    p_hand->>'video_timestamp_start',
    p_hand->>'video_timestamp_end',
    p_hand->>'ai_summary'
  )
  RETURNING id INTO v_hand_id;

  -- 2. Hand Players 생성 (배열이 있을 경우)
  IF p_players IS NOT NULL AND jsonb_array_length(p_players) > 0 THEN
    FOR v_player IN SELECT * FROM jsonb_array_elements(p_players)
    LOOP
      INSERT INTO hand_players (
        hand_id,
        player_id,
        poker_position,
        seat,
        starting_stack,
        ending_stack,
        hole_cards,
        is_winner,
        final_amount,
        hand_description
      )
      VALUES (
        v_hand_id,
        (v_player->>'player_id')::UUID,
        v_player->>'poker_position',
        COALESCE((v_player->>'seat')::INTEGER, 1),
        COALESCE((v_player->>'starting_stack')::BIGINT, 0),
        COALESCE((v_player->>'ending_stack')::BIGINT, 0),
        v_player->>'hole_cards',
        COALESCE((v_player->>'is_winner')::BOOLEAN, false),
        (v_player->>'final_amount')::BIGINT,
        v_player->>'hand_description'
      );
    END LOOP;
  END IF;

  -- 3. Hand Actions 생성 (배열이 있을 경우)
  IF p_actions IS NOT NULL AND jsonb_array_length(p_actions) > 0 THEN
    FOR v_action IN SELECT * FROM jsonb_array_elements(p_actions)
    LOOP
      INSERT INTO hand_actions (
        hand_id,
        player_id,
        action_type,
        street,
        amount,
        action_order,
        description
      )
      VALUES (
        v_hand_id,
        (v_action->>'player_id')::UUID,
        v_action->>'action_type',
        v_action->>'street',
        COALESCE((v_action->>'amount')::BIGINT, 0),
        COALESCE((v_action->>'action_order')::INTEGER, 1),
        v_action->>'description'
      );
    END LOOP;
  END IF;

  -- 4. 생성된 Hand 전체 데이터 조회
  SELECT jsonb_build_object(
    'hand_id', h.id,
    'hand', to_jsonb(h.*),
    'players', (
      SELECT jsonb_agg(to_jsonb(hp.*))
      FROM hand_players hp
      WHERE hp.hand_id = h.id
    ),
    'actions', (
      SELECT jsonb_agg(to_jsonb(ha.* ORDER BY ha.action_order))
      FROM hand_actions ha
      WHERE ha.hand_id = h.id
    ),
    'success', true
  )
  INTO v_result
  FROM hands h
  WHERE h.id = v_hand_id;

  RETURN v_result;

EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Foreign key violation: Invalid stream_id or player_id';
  WHEN check_violation THEN
    RAISE EXCEPTION 'Check constraint violation: Invalid data values';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating hand: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_hand_with_details(JSONB, JSONB, JSONB)
  IS 'Create hand with players and actions in a single transaction (Arbiter system)';

-- ===========================
-- 002: update_hand_with_details
-- ===========================
-- Updates a hand and its related data atomically

CREATE OR REPLACE FUNCTION update_hand_with_details(
  p_hand_id UUID,
  p_hand JSONB DEFAULT NULL,
  p_players_to_update JSONB DEFAULT NULL,
  p_players_to_delete UUID[] DEFAULT NULL,
  p_actions_to_update JSONB DEFAULT NULL,
  p_actions_to_delete UUID[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_player JSONB;
  v_action JSONB;
  v_result JSONB;
BEGIN
  -- 1. Hand 존재 확인
  IF NOT EXISTS (SELECT 1 FROM hands WHERE id = p_hand_id) THEN
    RAISE EXCEPTION 'Hand not found: %', p_hand_id;
  END IF;

  -- 2. Hand 업데이트 (있으면)
  IF p_hand IS NOT NULL THEN
    UPDATE hands
    SET
      description = COALESCE(p_hand->>'description', description),
      small_blind = COALESCE((p_hand->>'small_blind')::BIGINT, small_blind),
      big_blind = COALESCE((p_hand->>'big_blind')::BIGINT, big_blind),
      ante = COALESCE((p_hand->>'ante')::BIGINT, ante),
      pot_size = COALESCE((p_hand->>'pot_size')::BIGINT, pot_size),
      pot_preflop = COALESCE((p_hand->>'pot_preflop')::BIGINT, pot_preflop),
      pot_flop = COALESCE((p_hand->>'pot_flop')::BIGINT, pot_flop),
      pot_turn = COALESCE((p_hand->>'pot_turn')::BIGINT, pot_turn),
      pot_river = COALESCE((p_hand->>'pot_river')::BIGINT, pot_river),
      board_flop = COALESCE(p_hand->>'board_flop', board_flop),
      board_turn = COALESCE(p_hand->>'board_turn', board_turn),
      board_river = COALESCE(p_hand->>'board_river', board_river),
      video_timestamp_start = COALESCE(p_hand->>'video_timestamp_start', video_timestamp_start),
      video_timestamp_end = COALESCE(p_hand->>'video_timestamp_end', video_timestamp_end),
      ai_summary = COALESCE(p_hand->>'ai_summary', ai_summary),
      updated_at = NOW()
    WHERE id = p_hand_id;
  END IF;

  -- 3. Hand Players 삭제 (있으면)
  IF p_players_to_delete IS NOT NULL AND array_length(p_players_to_delete, 1) > 0 THEN
    DELETE FROM hand_players
    WHERE id = ANY(p_players_to_delete);
  END IF;

  -- 4. Hand Players 업데이트 (있으면)
  IF p_players_to_update IS NOT NULL AND jsonb_array_length(p_players_to_update) > 0 THEN
    FOR v_player IN SELECT * FROM jsonb_array_elements(p_players_to_update)
    LOOP
      UPDATE hand_players
      SET
        poker_position = COALESCE(v_player->>'poker_position', poker_position),
        seat = COALESCE((v_player->>'seat')::INTEGER, seat),
        starting_stack = COALESCE((v_player->>'starting_stack')::BIGINT, starting_stack),
        ending_stack = COALESCE((v_player->>'ending_stack')::BIGINT, ending_stack),
        hole_cards = COALESCE(v_player->>'hole_cards', hole_cards),
        is_winner = COALESCE((v_player->>'is_winner')::BOOLEAN, is_winner),
        final_amount = COALESCE((v_player->>'final_amount')::BIGINT, final_amount),
        hand_description = COALESCE(v_player->>'hand_description', hand_description)
      WHERE id = (v_player->>'id')::UUID;
    END LOOP;
  END IF;

  -- 5. Hand Actions 삭제 (있으면)
  IF p_actions_to_delete IS NOT NULL AND array_length(p_actions_to_delete, 1) > 0 THEN
    DELETE FROM hand_actions
    WHERE id = ANY(p_actions_to_delete);
  END IF;

  -- 6. Hand Actions 업데이트 (있으면)
  IF p_actions_to_update IS NOT NULL AND jsonb_array_length(p_actions_to_update) > 0 THEN
    FOR v_action IN SELECT * FROM jsonb_array_elements(p_actions_to_update)
    LOOP
      UPDATE hand_actions
      SET
        action_type = COALESCE(v_action->>'action_type', action_type),
        street = COALESCE(v_action->>'street', street),
        amount = COALESCE((v_action->>'amount')::BIGINT, amount),
        action_order = COALESCE((v_action->>'action_order')::INTEGER, action_order),
        description = COALESCE(v_action->>'description', description)
      WHERE id = (v_action->>'id')::UUID;
    END LOOP;
  END IF;

  -- 7. 업데이트된 Hand 전체 데이터 조회
  SELECT jsonb_build_object(
    'hand_id', h.id,
    'hand', to_jsonb(h.*),
    'players', (
      SELECT jsonb_agg(to_jsonb(hp.*))
      FROM hand_players hp
      WHERE hp.hand_id = h.id
    ),
    'actions', (
      SELECT jsonb_agg(to_jsonb(ha.* ORDER BY ha.action_order))
      FROM hand_actions ha
      WHERE ha.hand_id = h.id
    ),
    'success', true
  )
  INTO v_result
  FROM hands h
  WHERE h.id = p_hand_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error updating hand: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_hand_with_details(UUID, JSONB, JSONB, UUID[], JSONB, UUID[])
  IS 'Update hand with players and actions atomically (Arbiter system)';

-- ===========================
-- 003: delete_hand_cascade
-- ===========================
-- Explicitly delete hand with all related data (for audit logging)

CREATE OR REPLACE FUNCTION delete_hand_cascade(
  p_hand_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_hand hands;
  v_result JSONB;
BEGIN
  -- 1. Hand 존재 확인 및 조회
  SELECT * INTO v_hand
  FROM hands
  WHERE id = p_hand_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hand not found: %', p_hand_id;
  END IF;

  -- 2. 관련 데이터 수 확인
  v_result := jsonb_build_object(
    'hand_id', p_hand_id,
    'deleted_players', (SELECT COUNT(*) FROM hand_players WHERE hand_id = p_hand_id),
    'deleted_actions', (SELECT COUNT(*) FROM hand_actions WHERE hand_id = p_hand_id),
    'success', true
  );

  -- 3. Hand 삭제 (CASCADE로 players, actions 자동 삭제)
  DELETE FROM hands WHERE id = p_hand_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting hand: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_hand_cascade(UUID)
  IS 'Delete hand with cascade (players, actions) and return deletion summary';

-- ===========================
-- 004: Grant permissions
-- ===========================
-- RPC 함수는 authenticated role에서 실행 가능

GRANT EXECUTE ON FUNCTION create_hand_with_details(JSONB, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_hand_with_details(UUID, JSONB, JSONB, UUID[], JSONB, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_hand_cascade(UUID) TO authenticated;

-- 주석
COMMENT ON SCHEMA public IS 'Public schema with Arbiter system RPC functions';
