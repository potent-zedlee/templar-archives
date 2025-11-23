CREATE OR REPLACE FUNCTION "public"."approve_hand_edit_request"("p_request_id" "uuid", "p_admin_comment" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_request hand_edit_requests;
  v_result JSONB;
BEGIN
  -- 1. 요청 조회
  SELECT * INTO v_request
  FROM hand_edit_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Edit request not found: %', p_request_id;
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request already processed: %', v_request.status;
  END IF;

  -- 2. 요청 승인
  UPDATE hand_edit_requests
  SET
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    admin_comment = p_admin_comment
  WHERE id = p_request_id;

  -- 3. 실제 핸드 데이터 업데이트 (edit_type에 따라 분기)
  -- 여기서는 simplified version - 실제로는 edit_type별로 다르게 처리
  CASE v_request.edit_type
    WHEN 'basic_info' THEN
      UPDATE hands
      SET
        description = COALESCE(v_request.proposed_data->>'description', description),
        small_blind = COALESCE((v_request.proposed_data->>'small_blind')::BIGINT, small_blind),
        big_blind = COALESCE((v_request.proposed_data->>'big_blind')::BIGINT, big_blind),
        updated_at = NOW()
      WHERE id = v_request.hand_id;

    WHEN 'board' THEN
      UPDATE hands
      SET
        board_flop = COALESCE(v_request.proposed_data->>'board_flop', board_flop),
        board_turn = COALESCE(v_request.proposed_data->>'board_turn', board_turn),
        board_river = COALESCE(v_request.proposed_data->>'board_river', board_river),
        updated_at = NOW()
      WHERE id = v_request.hand_id;

    ELSE
      -- players, actions는 복잡하므로 별도 처리 필요
      NULL;
  END CASE;

  v_result := jsonb_build_object(
    'request_id', p_request_id,
    'status', 'approved',
    'hand_id', v_request.hand_id,
    'success', true
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error approving edit request: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."approve_hand_edit_request"("p_request_id" "uuid", "p_admin_comment" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."approve_hand_edit_request"("p_request_id" "uuid", "p_admin_comment" "text") IS 'Approve hand edit request and apply changes (Arbiter system)';



CREATE OR REPLACE FUNCTION "public"."auto_normalize_player_name"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.normalized_name := normalize_player_name(NEW.name);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_normalize_player_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ban_user"("p_user_id" "uuid", "p_reason" "text", "p_banned_by" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE users
  SET
    banned_at = NOW(),
    ban_reason = p_reason,
    banned_by = p_banned_by
    -- is_banned will be set by trigger
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."ban_user"("p_user_id" "uuid", "p_reason" "text", "p_banned_by" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."ban_user"("p_user_id" "uuid", "p_reason" "text", "p_banned_by" "uuid") IS 'Atomically ban a user. Use this instead of direct UPDATE.';



CREATE OR REPLACE FUNCTION "public"."check_category_before_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  usage_count INTEGER;
BEGIN
  SELECT get_category_usage_count(OLD.id) INTO usage_count;

  IF usage_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete category "%" because it is used by % tournament(s)', OLD.name, usage_count;
  END IF;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."check_category_before_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_duplicate_analysis"("p_video_id" "uuid", "p_segments" "jsonb") RETURNS TABLE("job_id" "uuid", "status" "text", "segments" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."check_duplicate_analysis"("p_video_id" "uuid", "p_segments" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_duplicate_analysis"("p_video_id" "uuid", "p_segments" "jsonb") IS 'Check if video segments are already being analyzed or completed. SECURITY INVOKER - runs with caller privileges.';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_audit_logs"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < now() - interval '180 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_audit_logs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_audit_logs"() IS 'Delete audit logs older than 180 days';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_security_events"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM security_events
  WHERE created_at < now() - interval '90 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_security_events"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_security_events"() IS 'Delete security events older than 90 days to save storage';



CREATE OR REPLACE FUNCTION "public"."create_hand_with_details"("p_hand" "jsonb", "p_players" "jsonb", "p_actions" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_hand_with_details"("p_hand" "jsonb", "p_players" "jsonb", "p_actions" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_hand_with_details"("p_hand" "jsonb", "p_players" "jsonb", "p_actions" "jsonb") IS 'Create hand with players and actions in a single transaction (Arbiter system)';



CREATE OR REPLACE FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_sender_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_link" "text" DEFAULT NULL::"text", "p_post_id" "uuid" DEFAULT NULL::"uuid", "p_comment_id" "uuid" DEFAULT NULL::"uuid", "p_hand_id" "uuid" DEFAULT NULL::"uuid", "p_edit_request_id" "uuid" DEFAULT NULL::"uuid", "p_claim_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Don't create notification if sender = recipient
  IF p_sender_id = p_recipient_id THEN
    RETURN;
  END IF;

  -- Insert notification (ignore duplicates)
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    link,
    post_id,
    comment_id,
    hand_id,
    edit_request_id,
    claim_id
  ) VALUES (
    p_recipient_id,
    p_sender_id,
    p_type,
    p_title,
    p_message,
    p_link,
    p_post_id,
    p_comment_id,
    p_hand_id,
    p_edit_request_id,
    p_claim_id
  )
  ON CONFLICT ON CONSTRAINT unique_notification DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_sender_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_link" "text", "p_post_id" "uuid", "p_comment_id" "uuid", "p_hand_id" "uuid", "p_edit_request_id" "uuid", "p_claim_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_unsorted_stream"("p_name" "text", "p_video_url" "text" DEFAULT NULL::"text", "p_video_file" "text" DEFAULT NULL::"text", "p_video_source" "text" DEFAULT 'youtube'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_stream_id UUID;
BEGIN
  INSERT INTO streams (name, video_url, video_file, video_source, sub_event_id, is_organized)
  VALUES (p_name, p_video_url, p_video_file, p_video_source, NULL, FALSE)
  RETURNING id INTO v_stream_id;

  RETURN v_stream_id;
END;
$$;


ALTER FUNCTION "public"."create_unsorted_stream"("p_name" "text", "p_video_url" "text", "p_video_file" "text", "p_video_source" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_unsorted_stream"("p_name" "text", "p_video_url" "text", "p_video_file" "text", "p_video_source" "text") IS 'Creates a new unsorted stream/video that can be organized later';



CREATE OR REPLACE FUNCTION "public"."decrement_comments_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  END;
  $$;


ALTER FUNCTION "public"."decrement_comments_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    ELSIF OLD.comment_id IS NOT NULL THEN
      UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
    END IF;
    RETURN OLD;
  END;
  $$;


ALTER FUNCTION "public"."decrement_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_hand_cascade"("p_hand_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."delete_hand_cascade"("p_hand_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_hand_cascade"("p_hand_id" "uuid") IS 'Delete hand with cascade (players, actions) and return deletion summary';



CREATE OR REPLACE FUNCTION "public"."get_cache_statistics"() RETURNS TABLE("total_cached_players" integer, "avg_hands_per_player" numeric, "most_recent_update" timestamp with time zone, "oldest_cache" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_cached_players,
    ROUND(AVG(total_hands), 2) AS avg_hands_per_player,
    MAX(last_updated) AS most_recent_update,
    MIN(last_updated) AS oldest_cache
  FROM player_stats_cache;
END;
$$;


ALTER FUNCTION "public"."get_cache_statistics"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_cache_statistics"() IS '플레이어 통계 캐시 현황 확인';



CREATE OR REPLACE FUNCTION "public"."get_category_usage_count"("category_id" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM tournaments
    WHERE tournaments.category_id = get_category_usage_count.category_id
  );
END;
$$;


ALTER FUNCTION "public"."get_category_usage_count"("category_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_child_categories"("p_parent_id" "text") RETURNS TABLE("id" "text", "name" "text", "display_name" "text", "short_name" "text", "aliases" "text"[], "logo_url" "text", "region" "text", "priority" integer, "website" "text", "is_active" boolean, "game_type" "public"."game_type", "parent_id" "text", "theme_gradient" "text", "theme_text" "text", "theme_shadow" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.name,
    tc.display_name,
    tc.short_name,
    tc.aliases,
    tc.logo_url,
    tc.region,
    tc.priority,
    tc.website,
    tc.is_active,
    tc.game_type,
    tc.parent_id,
    tc.theme_gradient,
    tc.theme_text,
    tc.theme_shadow,
    tc.created_at,
    tc.updated_at
  FROM tournament_categories tc
  WHERE tc.parent_id = p_parent_id
  ORDER BY tc.priority ASC;
END;
$$;


ALTER FUNCTION "public"."get_child_categories"("p_parent_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_hand_details_batch"("hand_ids" "uuid"[]) RETURNS TABLE("id" "uuid", "number" "text", "description" "text", "timestamp" "text", "pot_size" integer, "board_cards" "text"[], "confidence" integer, "favorite" boolean, "day_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "hand_players" "jsonb", "day_info" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  array_size INTEGER;
BEGIN
  -- DoS Protection: Limit array size to prevent resource exhaustion
  array_size := array_length(hand_ids, 1);

  IF array_size IS NULL THEN
    -- Empty array, return no results
    RETURN;
  END IF;

  IF array_size > 100 THEN
    RAISE EXCEPTION 'Array size (%) exceeds maximum allowed (100). Please request hands in batches.', array_size
      USING HINT = 'Split your request into multiple smaller batches';
  END IF;

  -- Original query (now with DoS protection)
  RETURN QUERY
  SELECT
    h.id,
    h.number,
    h.description,
    h.timestamp,
    h.pot_size,
    h.board_cards,
    h.confidence,
    h.favorite,
    h.day_id,
    h.created_at,
    h.updated_at,
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'position', hp.position,
          'cards', hp.cards,
          'player', jsonb_build_object(
            'id', p.id,
            'name', p.name
          )
        )
      ), '[]'::jsonb)
      FROM hand_players hp
      LEFT JOIN players p ON hp.player_id = p.id
      WHERE hp.hand_id = h.id
    ) AS hand_players,
    jsonb_build_object(
      'id', d.id,
      'name', d.name,
      'video_url', d.video_url,
      'video_file', d.video_file,
      'video_source', d.video_source,
      'video_nas_path', d.video_nas_path,
      'sub_event', jsonb_build_object(
        'id', se.id,
        'name', se.name,
        'date', se.date,
        'tournament', jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'category', t.category,
          'location', t.location
        )
      )
    ) AS day_info
  FROM hands h
  INNER JOIN days d ON h.day_id = d.id
  INNER JOIN sub_events se ON d.sub_event_id = se.id
  INNER JOIN tournaments t ON se.tournament_id = t.id
  WHERE h.id = ANY(hand_ids)
  ORDER BY h.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_hand_details_batch"("hand_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_hand_details_batch"("hand_ids" "uuid"[]) IS 'Optimized function to fetch multiple hands with full details in a single query.
SECURITY FIX: Changed to SECURITY INVOKER + added array size limit (max 100).
DoS Protection: Prevents resource exhaustion from large arrays.
Returns hands with nested player and tournament hierarchy information.';



CREATE OR REPLACE FUNCTION "public"."get_hand_tag_stats"() RETURNS TABLE("tag_name" "text", "count" bigint, "percentage" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH tag_counts AS (
    SELECT
      ht.tag_name,
      COUNT(DISTINCT ht.hand_id) AS tag_count
    FROM hand_tags ht
    GROUP BY ht.tag_name
  ),
  total AS (
    SELECT COUNT(DISTINCT hand_id) AS total_count
    FROM hand_tags
  )
  SELECT
    tc.tag_name,
    tc.tag_count,
    CASE
      WHEN t.total_count > 0
      THEN ROUND((tc.tag_count::NUMERIC / t.total_count::NUMERIC) * 100, 2)
      ELSE 0
    END AS percentage
  FROM tag_counts tc
  CROSS JOIN total t
  ORDER BY tc.tag_count DESC;
END;
$$;


ALTER FUNCTION "public"."get_hand_tag_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_player_claim_info"("player_uuid" "uuid") RETURNS TABLE("claimed" boolean, "claimed_by_user_id" "uuid", "claimed_by_nickname" "text", "claim_status" "public"."claim_status")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE AS claimed,
    pc.user_id AS claimed_by_user_id,
    u.nickname AS claimed_by_nickname,
    pc.status AS claim_status
  FROM public.player_claims pc
  JOIN public.users u ON u.id = pc.user_id
  WHERE pc.player_id = player_uuid
    AND pc.status = 'approved'
  LIMIT 1;

  -- If no approved claim found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::claim_status;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_player_claim_info"("player_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_player_counts_by_day"("day_ids" "uuid"[]) RETURNS TABLE("day_id" "uuid", "player_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    h.day_id,
    COUNT(DISTINCT hp.player_id) as player_count
  FROM hands h
  INNER JOIN hand_players hp ON hp.hand_id = h.id
  WHERE h.day_id = ANY(day_ids)
  GROUP BY h.day_id
$$;


ALTER FUNCTION "public"."get_player_counts_by_day"("day_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_player_counts_by_day"("day_ids" "uuid"[]) IS 'Calculates the number of distinct players in hands for each day';



CREATE OR REPLACE FUNCTION "public"."get_player_hands_grouped"("player_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  result JSONB;
  requesting_user_id UUID;
  is_admin BOOLEAN;
  has_player_claim BOOLEAN;
BEGIN
  -- Get current authenticated user
  requesting_user_id := auth.uid();

  -- Check if user is admin/high_templar
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = requesting_user_id
    AND role IN ('admin', 'high_templar')
    AND banned_at IS NULL
  ) INTO is_admin;

  -- Check if user has approved claim on this player
  SELECT EXISTS (
    SELECT 1 FROM player_claims
    WHERE player_id = player_uuid
    AND user_id = requesting_user_id
    AND status = 'approved'
  ) INTO has_player_claim;

  -- Authorization check: Allow if admin OR has player claim
  IF NOT (is_admin OR has_player_claim) THEN
    -- Return empty result for unauthorized access instead of error
    -- This prevents information disclosure about player existence
    RETURN '[]'::jsonb;
  END IF;

  -- Original query (now with authorization)
  SELECT COALESCE(jsonb_agg(tournament_data), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'category', t.category,
      'location', t.location,
      'sub_events', (
        SELECT COALESCE(jsonb_agg(subevent_data), '[]'::jsonb)
        FROM (
          SELECT jsonb_build_object(
            'id', se.id,
            'name', se.name,
            'date', se.date,
            'days', (
              SELECT COALESCE(jsonb_agg(day_data), '[]'::jsonb)
              FROM (
                SELECT jsonb_build_object(
                  'id', d.id,
                  'name', d.name,
                  'video_url', d.video_url,
                  'video_file', d.video_file,
                  'video_source', d.video_source,
                  'video_nas_path', d.video_nas_path,
                  'hands', (
                    SELECT COALESCE(jsonb_agg(hand_data), '[]'::jsonb)
                    FROM (
                      SELECT jsonb_build_object(
                        'id', h.id,
                        'number', h.number,
                        'description', h.description,
                        'timestamp', h.timestamp,
                        'pot_size', h.pot_size,
                        'board_cards', h.board_cards,
                        'confidence', h.confidence,
                        'created_at', h.created_at,
                        'hand_players', (
                          SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                              'position', hp_inner.position,
                              'cards', hp_inner.cards,
                              'player', jsonb_build_object(
                                'name', p_inner.name
                              )
                            )
                          ), '[]'::jsonb)
                          FROM hand_players hp_inner
                          LEFT JOIN players p_inner ON hp_inner.player_id = p_inner.id
                          WHERE hp_inner.hand_id = h.id
                        )
                      ) AS hand_data
                      FROM hands h
                      INNER JOIN hand_players hp ON h.id = hp.hand_id
                      WHERE h.day_id = d.id
                        AND hp.player_id = player_uuid
                      ORDER BY h.created_at DESC
                    ) hands_subquery
                  )
                ) AS day_data
                FROM days d
                WHERE d.sub_event_id = se.id
                  AND EXISTS (
                    SELECT 1 FROM hands h2
                    INNER JOIN hand_players hp2 ON h2.id = hp2.hand_id
                    WHERE h2.day_id = d.id AND hp2.player_id = player_uuid
                  )
                ORDER BY d.published_at DESC NULLS LAST
              ) days_subquery
            )
          ) AS subevent_data
          FROM sub_events se
          WHERE se.tournament_id = t.id
            AND EXISTS (
              SELECT 1 FROM days d2
              INNER JOIN hands h3 ON d2.id = h3.day_id
              INNER JOIN hand_players hp3 ON h3.id = hp3.hand_id
              WHERE d2.sub_event_id = se.id AND hp3.player_id = player_uuid
            )
          ORDER BY se.date DESC
        ) subevents_subquery
      )
    ) AS tournament_data
    FROM tournaments t
    WHERE EXISTS (
      SELECT 1 FROM sub_events se2
      INNER JOIN days d3 ON se2.id = d3.sub_event_id
      INNER JOIN hands h4 ON d3.id = h4.day_id
      INNER JOIN hand_players hp4 ON h4.id = hp4.hand_id
      WHERE se2.tournament_id = t.id AND hp4.player_id = player_uuid
    )
    ORDER BY t.start_date DESC
  ) tournaments_subquery;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_player_hands_grouped"("player_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_player_hands_grouped"("player_uuid" "uuid") IS 'Optimized function to fetch all hands for a player grouped by tournament hierarchy.
SECURITY FIX: Changed to SECURITY INVOKER + added authorization check.
Only admins and approved player claimants can access hand history.
Returns empty array for unauthorized access (prevents player enumeration).';



CREATE OR REPLACE FUNCTION "public"."get_players_with_hand_counts"() RETURNS TABLE("id" "uuid", "name" "text", "country" "text", "gender" "text", "total_winnings" bigint, "photo_url" "text", "created_at" timestamp with time zone, "hand_count" bigint)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  -- This query respects RLS policies on players and hand_players tables
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.country,
    p.gender,
    p.total_winnings,
    p.photo_url,
    p.created_at,
    COUNT(DISTINCT hp.hand_id) AS hand_count
  FROM players p
  LEFT JOIN hand_players hp ON p.id = hp.player_id
  GROUP BY p.id, p.name, p.country, p.gender, p.total_winnings, p.photo_url, p.created_at
  ORDER BY p.total_winnings DESC NULLS LAST;
END;
$$;


ALTER FUNCTION "public"."get_players_with_hand_counts"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_players_with_hand_counts"() IS 'Optimized function to fetch all players with their hand counts.
SECURITY: SECURITY INVOKER to respect RLS policies.
Read-only function that returns public player data including gender for filtering.';



CREATE OR REPLACE FUNCTION "public"."get_query_performance_summary"() RETURNS TABLE("metric" "text", "value" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT 'Unused Indexes', COUNT(*)::TEXT FROM pg_stat_user_indexes WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey'
  UNION ALL
  SELECT 'Low Usage Indexes (<100 scans)', COUNT(*)::TEXT FROM pg_stat_user_indexes WHERE idx_scan < 100 AND indexrelname NOT LIKE '%_pkey'
  UNION ALL
  SELECT 'Total Index Size', pg_size_pretty(SUM(pg_relation_size(indexrelid))::bigint) FROM pg_stat_user_indexes
  UNION ALL
  SELECT 'Table Cache Hit Ratio', ROUND((SUM(heap_blks_hit)::numeric / NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0)) * 100, 2)::TEXT || '%'
    FROM pg_statio_user_tables
  UNION ALL
  SELECT 'Index Cache Hit Ratio', ROUND((SUM(idx_blks_hit)::numeric / NULLIF(SUM(idx_blks_hit) + SUM(idx_blks_read), 0)) * 100, 2)::TEXT || '%'
    FROM pg_statio_user_indexes
  UNION ALL
  SELECT 'Tables with Bloat >20%', COUNT(*)::TEXT FROM v_table_bloat WHERE bloat_pct > 20;
END;
$$;


ALTER FUNCTION "public"."get_query_performance_summary"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_query_performance_summary"() IS 'Provides a quick performance health check summary.
Usage: SELECT * FROM get_query_performance_summary();
Returns: Key metrics about query performance and database health.';



CREATE OR REPLACE FUNCTION "public"."get_root_categories"("p_game_type" "public"."game_type" DEFAULT NULL::"public"."game_type") RETURNS TABLE("id" "text", "name" "text", "display_name" "text", "short_name" "text", "aliases" "text"[], "logo_url" "text", "region" "text", "priority" integer, "website" "text", "is_active" boolean, "game_type" "public"."game_type", "parent_id" "text", "theme_gradient" "text", "theme_text" "text", "theme_shadow" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.name,
    tc.display_name,
    tc.short_name,
    tc.aliases,
    tc.logo_url,
    tc.region,
    tc.priority,
    tc.website,
    tc.is_active,
    tc.game_type,
    tc.parent_id,
    tc.theme_gradient,
    tc.theme_text,
    tc.theme_shadow,
    tc.created_at,
    tc.updated_at
  FROM tournament_categories tc
  WHERE tc.parent_id IS NULL
    AND tc.is_active = true
    AND (p_game_type IS NULL OR tc.game_type = p_game_type OR tc.game_type = 'both')
  ORDER BY tc.priority ASC;
END;
$$;


ALTER FUNCTION "public"."get_root_categories"("p_game_type" "public"."game_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unsorted_streams"() RETURNS TABLE("id" "uuid", "name" "text", "video_url" "text", "video_file" "text", "video_source" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.video_url,
    s.video_file,
    s.video_source,
    s.created_at
  FROM streams s
  WHERE s.sub_event_id IS NULL
    AND s.is_organized = FALSE
  ORDER BY s.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_unsorted_streams"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_unsorted_streams"() IS 'Returns all unsorted streams/videos that need to be organized into events';



CREATE OR REPLACE FUNCTION "public"."get_user_tag_history"("user_id" "uuid") RETURNS TABLE("hand_id" "uuid", "tag_name" "text", "created_at" timestamp with time zone, "hand_number" "text", "tournament_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ht.hand_id,
    ht.tag_name,
    ht.created_at,
    h.number AS hand_number,
    t.name AS tournament_name
  FROM hand_tags ht
  INNER JOIN hands h ON ht.hand_id = h.id
  INNER JOIN days d ON h.day_id = d.id
  INNER JOIN sub_events se ON d.sub_event_id = se.id
  INNER JOIN tournaments t ON se.tournament_id = t.id
  WHERE ht.created_by = user_id
  ORDER BY ht.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_tag_history"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    random_suffix TEXT;
    temp_nickname TEXT;
    nickname_exists BOOLEAN;
  BEGIN
    -- 랜덤 6자리 숫자 생성
    random_suffix := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

    -- 이메일의 @ 앞부분 추출 (없으면 'user' 사용)
    temp_nickname := COALESCE(
      SPLIT_PART(NEW.email, '@', 1),
      'user'
    ) || random_suffix;

    -- 닉네임 중복 체크 (만약 중복이면 다시 랜덤 생성)
    LOOP
      SELECT EXISTS(SELECT 1 FROM public.users WHERE nickname = temp_nickname) INTO
  nickname_exists;
      EXIT WHEN NOT nickname_exists;

      -- 중복이면 랜덤 숫자 재생성
      random_suffix := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
      temp_nickname := COALESCE(
        SPLIT_PART(NEW.email, '@', 1),
        'user'
      ) || random_suffix;
    END LOOP;

    -- users 테이블에 레코드 삽입
    INSERT INTO public.users (id, email, nickname, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      temp_nickname,
      NEW.raw_user_meta_data->>'avatar_url'
    );

    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hands_description_tsv_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.description_tsv :=
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.number, '')), 'B');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."hands_description_tsv_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_comments_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."increment_comments_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF NEW.comment_id IS NOT NULL THEN
      UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    END IF;
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."increment_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invalidate_player_stats_cache"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- hand_actions INSERT/UPDATE/DELETE 시 해당 플레이어의 캐시 무효화
  IF TG_OP = 'DELETE' THEN
    DELETE FROM player_stats_cache
    WHERE player_id = OLD.player_id;
    RETURN OLD;
  ELSE
    DELETE FROM player_stats_cache
    WHERE player_id = NEW.player_id;
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."invalidate_player_stats_cache"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."invalidate_player_stats_cache"() IS '핸드 액션 변경 시 플레이어 통계 캐시 무효화';



CREATE OR REPLACE FUNCTION "public"."invalidate_player_stats_on_hand_players"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM player_stats_cache
    WHERE player_id = OLD.player_id;
    RETURN OLD;
  ELSE
    -- starting_stack/ending_stack 변경 시 승패 판정 영향
    DELETE FROM player_stats_cache
    WHERE player_id = NEW.player_id;
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."invalidate_player_stats_on_hand_players"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'high_templar')
    AND users.banned_at IS NULL
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin"() IS 'Returns TRUE if current user is admin or high_templar and not banned.
Used in RLS policies for admin-only operations.
Cached per transaction for performance.';



CREATE OR REPLACE FUNCTION "public"."is_admin"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id
    AND role IN ('admin', 'high_templar')
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_strict"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.banned_at IS NULL
  );
$$;


ALTER FUNCTION "public"."is_admin_strict"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin_strict"() IS 'Returns TRUE only if current user is admin (not high_templar).
Used for sensitive operations requiring admin-only access.';



CREATE OR REPLACE FUNCTION "public"."is_banned"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.banned_at IS NOT NULL
  );
$$;


ALTER FUNCTION "public"."is_banned"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_banned"() IS 'Returns TRUE if current user is banned.
Used to block banned users from all operations.';



CREATE OR REPLACE FUNCTION "public"."is_owner"("owner_id" "uuid") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT auth.uid() = owner_id;
$$;


ALTER FUNCTION "public"."is_owner"("owner_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_owner"("owner_id" "uuid") IS 'Returns TRUE if current user ID matches the provided owner ID.
Used for "own content" policies.';



CREATE OR REPLACE FUNCTION "public"."is_reporter"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'high_templar', 'reporter')
    AND users.banned_at IS NULL
  );
$$;


ALTER FUNCTION "public"."is_reporter"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_reporter"() IS 'Returns TRUE if current user is reporter, high_templar, or admin.
Used for content creation permissions.';



CREATE OR REPLACE FUNCTION "public"."log_admin_action"("p_admin_id" "uuid", "p_action" "text", "p_target_type" "text", "p_target_id" "uuid" DEFAULT NULL::"uuid", "p_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (p_admin_id, p_action, p_target_type, p_target_id, p_details)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;


ALTER FUNCTION "public"."log_admin_action"("p_admin_id" "uuid", "p_action" "text", "p_target_type" "text", "p_target_id" "uuid", "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_hand_edit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_changed_fields JSONB;
BEGIN
  -- INSERT 작업
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.hand_edit_history (
      hand_id,
      editor_id,
      edit_type,
      new_data
    ) VALUES (
      NEW.id,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),  -- Fallback for system inserts
      'create',
      to_jsonb(NEW)
    );
    RETURN NEW;

  -- UPDATE 작업
  ELSIF TG_OP = 'UPDATE' THEN
    -- 변경된 필드만 추출
    v_changed_fields := jsonb_build_object(
      'description', CASE WHEN OLD.description IS DISTINCT FROM NEW.description THEN jsonb_build_object('old', OLD.description, 'new', NEW.description) ELSE NULL END,
      'small_blind', CASE WHEN OLD.small_blind IS DISTINCT FROM NEW.small_blind THEN jsonb_build_object('old', OLD.small_blind, 'new', NEW.small_blind) ELSE NULL END,
      'big_blind', CASE WHEN OLD.big_blind IS DISTINCT FROM NEW.big_blind THEN jsonb_build_object('old', OLD.big_blind, 'new', NEW.big_blind) ELSE NULL END,
      'ante', CASE WHEN OLD.ante IS DISTINCT FROM NEW.ante THEN jsonb_build_object('old', OLD.ante, 'new', NEW.ante) ELSE NULL END,
      'pot_size', CASE WHEN OLD.pot_size IS DISTINCT FROM NEW.pot_size THEN jsonb_build_object('old', OLD.pot_size, 'new', NEW.pot_size) ELSE NULL END,
      'board_flop', CASE WHEN OLD.board_flop IS DISTINCT FROM NEW.board_flop THEN jsonb_build_object('old', OLD.board_flop, 'new', NEW.board_flop) ELSE NULL END,
      'board_turn', CASE WHEN OLD.board_turn IS DISTINCT FROM NEW.board_turn THEN jsonb_build_object('old', OLD.board_turn, 'new', NEW.board_turn) ELSE NULL END,
      'board_river', CASE WHEN OLD.board_river IS DISTINCT FROM NEW.board_river THEN jsonb_build_object('old', OLD.board_river, 'new', NEW.board_river) ELSE NULL END
    );

    -- NULL 값 제거
    v_changed_fields := (
      SELECT jsonb_object_agg(key, value)
      FROM jsonb_each(v_changed_fields)
      WHERE value IS NOT NULL
    );

    -- 실제 변경이 있을 때만 로그
    IF v_changed_fields IS NOT NULL AND jsonb_object_keys(v_changed_fields) IS NOT NULL THEN
      INSERT INTO public.hand_edit_history (
        hand_id,
        editor_id,
        edit_type,
        previous_data,
        new_data,
        changed_fields
      ) VALUES (
        NEW.id,
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
        'update',
        to_jsonb(OLD),
        to_jsonb(NEW),
        v_changed_fields
      );
    END IF;

    RETURN NEW;

  -- DELETE 작업
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.hand_edit_history (
      hand_id,
      editor_id,
      edit_type,
      previous_data
    ) VALUES (
      OLD.id,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
      'delete',
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."log_hand_edit"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_hand_edit"() IS 'Automatically log hand edits to hand_edit_history (triggered on INSERT/UPDATE/DELETE)';



CREATE OR REPLACE FUNCTION "public"."normalize_player_name"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  RETURN LOWER(REGEXP_REPLACE(name, '[^a-z0-9]', '', 'gi'));
END;
$$;


ALTER FUNCTION "public"."normalize_player_name"("name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."normalize_player_name"("name" "text") IS 'Normalize player name for AI matching (lowercase, alphanumeric only)';



CREATE OR REPLACE FUNCTION "public"."normalize_tournament_category"("input_category" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  -- NULL 체크
  IF input_category IS NULL THEN
    RETURN NULL;
  END IF;

  -- 소문자로 변환하고 공백을 하이픈으로 변경
  DECLARE
    normalized TEXT;
  BEGIN
    normalized := LOWER(TRIM(input_category));

    -- 기존 별칭 매핑 (대소문자 구분 없음)
    RETURN CASE
      -- WSOP 계열
      WHEN normalized IN ('wsop', 'world series of poker', 'wsop classic') THEN 'wsop'
      WHEN normalized IN ('wsope', 'world series of poker europe') THEN 'wsope'
      WHEN normalized IN ('wsop paradise', 'world series of poker paradise') THEN 'wsop-paradise'

      -- WPT 계열
      WHEN normalized IN ('wpt', 'world poker tour') THEN 'wpt'

      -- EPT 계열
      WHEN normalized IN ('ept', 'european poker tour', 'pokerstars ept') THEN 'ept'

      -- Triton
      WHEN normalized IN ('triton', 'triton poker', 'triton series', 'triton poker series') THEN 'triton'

      -- NAPT
      WHEN normalized IN ('napt', 'north american poker tour') THEN 'napt'

      -- Asian Tours
      WHEN normalized IN ('apt', 'asian poker tour') THEN 'apt'
      WHEN normalized IN ('appt', 'asia pacific poker tour', 'pokerstars appt') THEN 'appt'
      WHEN normalized IN ('apl', 'asian poker league') THEN 'apl'

      -- Aussie Tours
      WHEN normalized IN ('aussie millions', 'australian millions') THEN 'aussie-millions'
      WHEN normalized IN ('australian poker open', 'apo') THEN 'australian-poker-open'

      -- Latin America
      WHEN normalized IN ('lapt', 'latin american poker tour', 'pokerstars lapt') THEN 'lapt'
      WHEN normalized IN ('bsop', 'brazilian series of poker') THEN 'bsop'

      -- Live Poker
      WHEN normalized IN ('hustler casino live', 'hustler', 'hcl') THEN 'hustler'

      -- GGPoker
      WHEN normalized IN ('ggpoker', 'gg poker') THEN 'ggpoker'
      WHEN normalized IN ('ggpoker uk', 'ggpoker uk poker championships', 'ggp uk') THEN 'ggpoker-uk'

      -- Online Series
      WHEN normalized IN ('wcoop', 'world championship of online poker', 'pokerstars wcoop') THEN 'wcoop'
      WHEN normalized IN ('scoop', 'spring championship of online poker', 'pokerstars scoop') THEN 'scoop'
      WHEN normalized IN ('uscoop', 'pokerstars uscoop') THEN 'uscoop'
      WHEN normalized IN ('pacoop', 'pokerstars pacoop') THEN 'pacoop'
      WHEN normalized IN ('oncoop', 'pokerstars oncoop') THEN 'oncoop'

      -- Specialty Series
      WHEN normalized IN ('super high roller bowl', 'shrb') THEN 'super-high-roller-bowl'
      WHEN normalized IN ('poker masters') THEN 'poker-masters'
      WHEN normalized IN ('us poker open', 'uspo') THEN 'us-poker-open'
      WHEN normalized IN ('pokergo tour', 'pgt') THEN 'pokergo-tour'

      -- Other Tours
      WHEN normalized IN ('888poker', '888') THEN '888poker'
      WHEN normalized IN ('888poker live', '888 live') THEN '888poker-live'
      WHEN normalized IN ('pokerstars open', 'ps open') THEN 'pokerstars-open'
      WHEN normalized IN ('unibet open', 'unibet') THEN 'unibet-open'
      WHEN normalized IN ('irish poker tour', 'ipt') THEN 'irish-poker-tour'
      WHEN normalized IN ('rungood poker series', 'rungood', 'rgps') THEN 'rungood'
      WHEN normalized IN ('merit poker', 'merit') THEN 'merit-poker'
      WHEN normalized IN ('the hendon mob championship', 'hendon mob', 'thm') THEN 'hendon-mob'
      WHEN normalized IN ('partypoker live', 'pp live') THEN 'partypoker-live'
      WHEN normalized IN ('global poker', 'global') THEN 'global-poker'

      -- 매핑되지 않은 경우: 공백을 하이픈으로 변경하고 소문자로 반환
      ELSE REPLACE(normalized, ' ', '-')
    END;
  END;
END;
$$;


ALTER FUNCTION "public"."normalize_tournament_category"("input_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_claim_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  sender_name TEXT;
  player_name TEXT;
  notif_type notification_type;
  notif_title TEXT;
  notif_message TEXT;
BEGIN
  -- Only notify when status changes to approved or rejected
  IF NEW.status = OLD.status OR (NEW.status != 'approved' AND NEW.status != 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Get admin name
  SELECT nickname INTO sender_name
  FROM users
  WHERE id = NEW.reviewed_by;

  -- Get player name
  SELECT name INTO player_name
  FROM players
  WHERE id = NEW.player_id;

  -- Set notification type and message
  IF NEW.status = 'approved' THEN
    notif_type := 'claim_approved'::notification_type;
    notif_title := 'Player Claim Approved';
    notif_message := 'Your claim for player "' || player_name || '" was approved';
  ELSE
    notif_type := 'claim_rejected'::notification_type;
    notif_title := 'Player Claim Rejected';
    notif_message := 'Your claim for player "' || player_name || '" was rejected';
  END IF;

  -- Create notification
  PERFORM create_notification(
    NEW.user_id,
    NEW.reviewed_by,
    notif_type,
    notif_title,
    notif_message,
    '/players/' || NEW.player_id,
    NULL,
    NULL,
    NULL,
    NULL,
    NEW.id
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_claim_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_comment_like"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  comment_author UUID;
  sender_name TEXT;
  comment_post UUID;
BEGIN
  -- Only notify for comment likes
  IF NEW.comment_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get comment author and post
  SELECT author_id, post_id INTO comment_author, comment_post
  FROM comments
  WHERE id = NEW.comment_id;

  -- Get sender name
  SELECT nickname INTO sender_name
  FROM users
  WHERE id = NEW.user_id;

  -- Create notification
  IF comment_author IS NOT NULL THEN
    PERFORM create_notification(
      comment_author,
      NEW.user_id,
      'like_comment'::notification_type,
      'New Like',
      sender_name || ' liked your comment',
      '/community/' || comment_post || '#comment-' || NEW.comment_id,
      comment_post,
      NEW.comment_id,
      NULL,
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_comment_like"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_comment_reply"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  parent_author UUID;
  sender_name TEXT;
  parent_content TEXT;
BEGIN
  -- Get parent comment author
  SELECT author_id, content INTO parent_author, parent_content
  FROM comments
  WHERE id = NEW.parent_comment_id;

  -- Get sender name
  SELECT nickname INTO sender_name
  FROM users
  WHERE id = NEW.author_id;

  -- Create notification
  IF parent_author IS NOT NULL THEN
    PERFORM create_notification(
      parent_author,
      NEW.author_id,
      'reply'::notification_type,
      'New Reply',
      sender_name || ' replied to your comment',
      '/community/' || NEW.post_id || '#comment-' || NEW.id,
      NEW.post_id,
      NEW.id,
      NULL,
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_comment_reply"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_edit_request_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  sender_name TEXT;
  hand_number TEXT;
  notif_type notification_type;
  notif_title TEXT;
  notif_message TEXT;
BEGIN
  -- Only notify when status changes to approved or rejected
  IF NEW.status = OLD.status OR (NEW.status != 'approved' AND NEW.status != 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Get admin name (who approved/rejected)
  SELECT nickname INTO sender_name
  FROM users
  WHERE id = NEW.reviewed_by;

  -- Get hand number
  SELECT number INTO hand_number
  FROM hands
  WHERE id = NEW.hand_id;

  -- Set notification type and message
  IF NEW.status = 'approved' THEN
    notif_type := 'edit_approved'::notification_type;
    notif_title := 'Edit Request Approved';
    notif_message := 'Your edit request for Hand #' || hand_number || ' was approved';
  ELSE
    notif_type := 'edit_rejected'::notification_type;
    notif_title := 'Edit Request Rejected';
    notif_message := 'Your edit request for Hand #' || hand_number || ' was rejected';
  END IF;

  -- Create notification
  PERFORM create_notification(
    NEW.user_id,
    NEW.reviewed_by,
    notif_type,
    notif_title,
    notif_message,
    '/my-edit-requests',
    NULL,
    NULL,
    NEW.hand_id,
    NEW.id,
    NULL
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_edit_request_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_post_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  post_author UUID;
  sender_name TEXT;
  post_title TEXT;
BEGIN
  -- Get post author and title
  SELECT author_id, title INTO post_author, post_title
  FROM posts
  WHERE id = NEW.post_id;

  -- Get sender name
  SELECT nickname INTO sender_name
  FROM users
  WHERE id = NEW.author_id;

  -- Create notification
  IF post_author IS NOT NULL THEN
    PERFORM create_notification(
      post_author,
      NEW.author_id,
      'comment'::notification_type,
      'New Comment',
      sender_name || ' commented on your post: "' || post_title || '"',
      '/community/' || NEW.post_id,
      NEW.post_id,
      NEW.id,
      NULL,
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_post_comment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_post_like"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  post_author UUID;
  sender_name TEXT;
  post_title TEXT;
BEGIN
  -- Only notify for post likes (not comment likes)
  IF NEW.post_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get post author and title
  SELECT author_id, title INTO post_author, post_title
  FROM posts
  WHERE id = NEW.post_id;

  -- Get sender name
  SELECT nickname INTO sender_name
  FROM users
  WHERE id = NEW.user_id;

  -- Create notification
  IF post_author IS NOT NULL THEN
    PERFORM create_notification(
      post_author,
      NEW.user_id,
      'like_post'::notification_type,
      'New Like',
      sender_name || ' liked your post: "' || post_title || '"',
      '/community/' || NEW.post_id,
      NEW.post_id,
      NULL,
      NULL,
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_post_like"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."organize_stream"("p_stream_id" "uuid", "p_sub_event_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE streams
  SET
    sub_event_id = p_sub_event_id,
    is_organized = TRUE,
    organized_at = NOW()
  WHERE id = p_stream_id;

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."organize_stream"("p_stream_id" "uuid", "p_sub_event_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."organize_stream"("p_stream_id" "uuid", "p_sub_event_id" "uuid") IS 'Moves a stream from unsorted to a specific sub-event';



CREATE OR REPLACE FUNCTION "public"."players_name_tsv_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.name_tsv := to_tsvector('english', COALESCE(NEW.name, ''));
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."players_name_tsv_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_circular_category_reference"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_parent_id TEXT;
  depth INT := 0;
  max_depth INT := 2;  -- 최대 2단계 깊이만 허용
BEGIN
  -- parent_id가 NULL이면 검사 불필요
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 자기 자신을 parent로 설정하는 것 방지
  IF NEW.id = NEW.parent_id THEN
    RAISE EXCEPTION 'A category cannot be its own parent';
  END IF;

  -- 순환 참조 및 깊이 검사
  current_parent_id := NEW.parent_id;

  WHILE current_parent_id IS NOT NULL AND depth < max_depth + 1 LOOP
    -- 순환 참조 검사
    IF current_parent_id = NEW.id THEN
      RAISE EXCEPTION 'Circular reference detected in category hierarchy';
    END IF;

    -- 부모의 부모 찾기
    SELECT parent_id INTO current_parent_id
    FROM tournament_categories
    WHERE id = current_parent_id;

    depth := depth + 1;

    -- 최대 깊이 초과 검사
    IF depth > max_depth THEN
      RAISE EXCEPTION 'Category hierarchy cannot exceed % levels', max_depth;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_circular_category_reference"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_all_player_stats_cache"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- 모든 캐시 삭제 (재계산 유도)
  DELETE FROM player_stats_cache;
  GET DIAGNOSTICS affected_count = ROW_COUNT;

  RETURN affected_count;
END;
$$;


ALTER FUNCTION "public"."refresh_all_player_stats_cache"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_all_player_stats_cache"() IS '모든 플레이어 통계 캐시 삭제 (재계산 유도) - 관리자 전용';



CREATE OR REPLACE FUNCTION "public"."reject_hand_edit_request"("p_request_id" "uuid", "p_admin_comment" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 1. 요청 상태 확인
  IF NOT EXISTS (
    SELECT 1 FROM hand_edit_requests
    WHERE id = p_request_id
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- 2. 요청 거부
  UPDATE hand_edit_requests
  SET
    status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    admin_comment = p_admin_comment
  WHERE id = p_request_id;

  v_result := jsonb_build_object(
    'request_id', p_request_id,
    'status', 'rejected',
    'success', true
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error rejecting edit request: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."reject_hand_edit_request"("p_request_id" "uuid", "p_admin_comment" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reject_hand_edit_request"("p_request_id" "uuid", "p_admin_comment" "text") IS 'Reject hand edit request with reason (Arbiter system)';



CREATE OR REPLACE FUNCTION "public"."reset_performance_stats"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Reset table/index statistics
  PERFORM pg_stat_reset();

  RETURN 'Performance statistics reset successfully';
EXCEPTION
  WHEN insufficient_privilege THEN
    RETURN 'ERROR: Insufficient privileges. Contact database administrator.';
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."reset_performance_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reset_performance_stats"() IS 'Resets all performance statistics for a fresh start.
Usage: SELECT reset_performance_stats();
Warning: Only use after analyzing current statistics.';



CREATE OR REPLACE FUNCTION "public"."save_hand_with_players_actions"("p_day_id" "uuid", "p_job_id" "uuid", "p_number" "text", "p_description" "text", "p_timestamp" "text", "p_video_timestamp_start" integer, "p_video_timestamp_end" integer, "p_stakes" "text", "p_board_flop" "text"[], "p_board_turn" "text", "p_board_river" "text", "p_pot_size" bigint, "p_raw_data" "jsonb", "p_players" "jsonb", "p_actions" "jsonb", "p_small_blind" integer DEFAULT NULL::integer, "p_big_blind" integer DEFAULT NULL::integer, "p_ante" integer DEFAULT 0, "p_pot_preflop" integer DEFAULT NULL::integer, "p_pot_flop" integer DEFAULT NULL::integer, "p_pot_turn" integer DEFAULT NULL::integer, "p_pot_river" integer DEFAULT NULL::integer, "p_thumbnail_url" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_hand_id UUID;
  v_player JSONB;
  v_action JSONB;
  v_player_id UUID;
  v_hand_player_id UUID;
  v_hole_cards TEXT[];
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

    -- Convert JSONB array to TEXT[] array for hole_cards
    -- Use ARRAY() constructor with jsonb_array_elements_text
    IF v_player->'hole_cards' IS NOT NULL AND jsonb_typeof(v_player->'hole_cards') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_player->'hole_cards'))
      INTO v_hole_cards;
    ELSE
      v_hole_cards := NULL;
    END IF;

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
      v_hole_cards,  -- Use the converted TEXT[] array
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
$$;


ALTER FUNCTION "public"."save_hand_with_players_actions"("p_day_id" "uuid", "p_job_id" "uuid", "p_number" "text", "p_description" "text", "p_timestamp" "text", "p_video_timestamp_start" integer, "p_video_timestamp_end" integer, "p_stakes" "text", "p_board_flop" "text"[], "p_board_turn" "text", "p_board_river" "text", "p_pot_size" bigint, "p_raw_data" "jsonb", "p_players" "jsonb", "p_actions" "jsonb", "p_small_blind" integer, "p_big_blind" integer, "p_ante" integer, "p_pot_preflop" integer, "p_pot_flop" integer, "p_pot_turn" integer, "p_pot_river" integer, "p_thumbnail_url" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_hand_with_players_actions"("p_day_id" "uuid", "p_job_id" "uuid", "p_number" "text", "p_description" "text", "p_timestamp" "text", "p_video_timestamp_start" integer, "p_video_timestamp_end" integer, "p_stakes" "text", "p_board_flop" "text"[], "p_board_turn" "text", "p_board_river" "text", "p_pot_size" bigint, "p_raw_data" "jsonb", "p_players" "jsonb", "p_actions" "jsonb", "p_small_blind" integer, "p_big_blind" integer, "p_ante" integer, "p_pot_preflop" integer, "p_pot_flop" integer, "p_pot_turn" integer, "p_pot_river" integer, "p_thumbnail_url" "text") IS 'Atomically save hand with all players and actions (transactional, with proper JSONB array handling)';



CREATE OR REPLACE FUNCTION "public"."search_hands_by_tags"("tag_names" "text"[]) RETURNS TABLE("hand_id" "uuid", "tag_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ht.hand_id,
    COUNT(DISTINCT ht.tag_name) AS tag_count
  FROM hand_tags ht
  WHERE ht.tag_name = ANY(tag_names)
  GROUP BY ht.hand_id
  HAVING COUNT(DISTINCT ht.tag_name) = array_length(tag_names, 1)
  ORDER BY ht.hand_id;
END;
$$;


ALTER FUNCTION "public"."search_hands_by_tags"("tag_names" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_hands_fulltext"("search_query" "text", "max_results" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "number" "text", "description" "text", "relevance" real)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.number,
    h.description,
    ts_rank(h.description_tsv, plainto_tsquery('english', search_query)) AS relevance
  FROM hands h
  WHERE h.description_tsv @@ plainto_tsquery('english', search_query)
  ORDER BY relevance DESC
  LIMIT max_results;
END;
$$;


ALTER FUNCTION "public"."search_hands_fulltext"("search_query" "text", "max_results" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_hands_fulltext"("search_query" "text", "max_results" integer) IS 'Full-text search for hands by description/number.
Returns relevance-ranked results.
Usage: SELECT * FROM search_hands_fulltext(''pocket aces'', 20);';



CREATE OR REPLACE FUNCTION "public"."search_players_fulltext"("search_query" "text", "max_results" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "name" "text", "country" "text", "relevance" real)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.country,
    ts_rank(p.name_tsv, plainto_tsquery('english', search_query)) AS relevance
  FROM players p
  WHERE p.name_tsv @@ plainto_tsquery('english', search_query)
  ORDER BY relevance DESC
  LIMIT max_results;
END;
$$;


ALTER FUNCTION "public"."search_players_fulltext"("search_query" "text", "max_results" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_players_fulltext"("search_query" "text", "max_results" integer) IS 'Full-text search for players by name.
Returns relevance-ranked results.
Usage: SELECT * FROM search_players_fulltext(''phil ivey'', 10);';



CREATE OR REPLACE FUNCTION "public"."sync_last_sign_in"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- auth.users의 last_sign_in_at이 업데이트되면 public.users에도 반영
  UPDATE public.users
  SET last_sign_in_at = NEW.last_sign_in_at
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_last_sign_in"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_last_sign_in"() IS 'auth.users 로그인 시 public.users에 last_sign_in_at 동기화';



CREATE OR REPLACE FUNCTION "public"."sync_user_ban_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- When banned_at is set, ensure is_banned is TRUE
  IF NEW.banned_at IS NOT NULL AND NEW.banned_at IS DISTINCT FROM OLD.banned_at THEN
    NEW.is_banned := TRUE;
  END IF;

  -- When banned_at is cleared, ensure is_banned is FALSE
  IF NEW.banned_at IS NULL AND OLD.banned_at IS NOT NULL THEN
    NEW.is_banned := FALSE;
    NEW.ban_reason := NULL;  -- Clear ban reason too
  END IF;

  -- When is_banned is set to TRUE, ensure banned_at exists
  IF NEW.is_banned = TRUE AND OLD.is_banned = FALSE AND NEW.banned_at IS NULL THEN
    NEW.banned_at := NOW();
  END IF;

  -- When is_banned is set to FALSE, clear banned_at
  IF NEW.is_banned = FALSE AND OLD.is_banned = TRUE THEN
    NEW.banned_at := NULL;
    NEW.ban_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_user_ban_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unban_user"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE users
  SET
    banned_at = NULL,
    ban_reason = NULL,
    banned_by = NULL
    -- is_banned will be cleared by trigger
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."unban_user"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unban_user"("p_user_id" "uuid") IS 'Atomically unban a user. Use this instead of direct UPDATE.';



CREATE OR REPLACE FUNCTION "public"."update_data_deletion_requests_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_data_deletion_requests_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_hand_bookmark_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 북마크 추가
    UPDATE public.hands
    SET bookmarks_count = bookmarks_count + 1
    WHERE id = NEW.hand_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- 북마크 삭제
    UPDATE public.hands
    SET bookmarks_count = GREATEST(bookmarks_count - 1, 0)
    WHERE id = OLD.hand_id;
    RETURN OLD;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_hand_bookmark_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_hand_like_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 새 좋아요/싫어요 추가
    IF NEW.vote_type = 'like' THEN
      UPDATE public.hands
      SET likes_count = likes_count + 1
      WHERE id = NEW.hand_id;
    ELSIF NEW.vote_type = 'dislike' THEN
      UPDATE public.hands
      SET dislikes_count = dislikes_count + 1
      WHERE id = NEW.hand_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- 좋아요 ↔ 싫어요 전환
    IF OLD.vote_type = 'like' AND NEW.vote_type = 'dislike' THEN
      UPDATE public.hands
      SET
        likes_count = likes_count - 1,
        dislikes_count = dislikes_count + 1
      WHERE id = NEW.hand_id;
    ELSIF OLD.vote_type = 'dislike' AND NEW.vote_type = 'like' THEN
      UPDATE public.hands
      SET
        likes_count = likes_count + 1,
        dislikes_count = dislikes_count - 1
      WHERE id = NEW.hand_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- 좋아요/싫어요 삭제
    IF OLD.vote_type = 'like' THEN
      UPDATE public.hands
      SET likes_count = GREATEST(likes_count - 1, 0)
      WHERE id = OLD.hand_id;
    ELSIF OLD.vote_type = 'dislike' THEN
      UPDATE public.hands
      SET dislikes_count = GREATEST(dislikes_count - 1, 0)
      WHERE id = OLD.hand_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_hand_like_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_hand_with_details"("p_hand_id" "uuid", "p_hand" "jsonb" DEFAULT NULL::"jsonb", "p_players_to_update" "jsonb" DEFAULT NULL::"jsonb", "p_players_to_delete" "uuid"[] DEFAULT NULL::"uuid"[], "p_actions_to_update" "jsonb" DEFAULT NULL::"jsonb", "p_actions_to_delete" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."update_hand_with_details"("p_hand_id" "uuid", "p_hand" "jsonb", "p_players_to_update" "jsonb", "p_players_to_delete" "uuid"[], "p_actions_to_update" "jsonb", "p_actions_to_delete" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_hand_with_details"("p_hand_id" "uuid", "p_hand" "jsonb", "p_players_to_update" "jsonb", "p_players_to_delete" "uuid"[], "p_actions_to_update" "jsonb", "p_actions_to_delete" "uuid"[]) IS 'Update hand with players and actions atomically (Arbiter system)';



CREATE OR REPLACE FUNCTION "public"."update_player_claims_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_player_claims_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_posts_search_vector"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_posts_search_vector"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_system_configs_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_system_configs_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tournament_categories_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tournament_categories_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_comments_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users
    SET comments_count = comments_count + 1
    WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users
    SET comments_count = comments_count - 1
    WHERE id = OLD.author_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_user_comments_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_likes_received"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  post_author_id UUID;
  comment_author_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Check if it's a post like
    IF NEW.post_id IS NOT NULL THEN
      SELECT author_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
      UPDATE public.users
      SET likes_received = likes_received + 1
      WHERE id = post_author_id;
    -- Check if it's a comment like
    ELSIF NEW.comment_id IS NOT NULL THEN
      SELECT author_id INTO comment_author_id FROM public.comments WHERE id = NEW.comment_id;
      UPDATE public.users
      SET likes_received = likes_received + 1
      WHERE id = comment_author_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Check if it's a post like
    IF OLD.post_id IS NOT NULL THEN
      SELECT author_id INTO post_author_id FROM public.posts WHERE id = OLD.post_id;
      UPDATE public.users
      SET likes_received = likes_received - 1
      WHERE id = post_author_id;
    -- Check if it's a comment like
    ELSIF OLD.comment_id IS NOT NULL THEN
      SELECT author_id INTO comment_author_id FROM public.comments WHERE id = OLD.comment_id;
      UPDATE public.users
      SET likes_received = likes_received - 1
      WHERE id = comment_author_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_user_likes_received"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_posts_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users
    SET posts_count = posts_count + 1
    WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users
    SET posts_count = posts_count - 1
    WHERE id = OLD.author_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_user_posts_count"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

