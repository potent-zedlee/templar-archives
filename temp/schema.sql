


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'Public schema with Arbiter system RPC functions';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";



Used for: slow query detection, performance analysis.';



CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."claim_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."claim_status" OWNER TO "postgres";


CREATE TYPE "public"."game_type" AS ENUM (
    'tournament',
    'cash_game',
    'both'
);


ALTER TYPE "public"."game_type" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'comment',
    'reply',
    'like_post',
    'like_comment',
    'edit_approved',
    'edit_rejected',
    'claim_approved',
    'claim_rejected',
    'mention',
    'timecode_submitted',
    'timecode_approved',
    'timecode_rejected',
    'timecode_ai_completed',
    'timecode_review_ready'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."verification_method" AS ENUM (
    'social_media',
    'email',
    'admin',
    'other'
);


ALTER TYPE "public"."verification_method" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."admin_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "uuid",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_logs_target_type_check" CHECK (("target_type" = ANY (ARRAY['user'::"text", 'post'::"text", 'comment'::"text", 'hand'::"text", 'player'::"text"])))
);


ALTER TABLE "public"."admin_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_logs" IS 'Log of all admin actions for audit trail';



CREATE TABLE IF NOT EXISTS "public"."analysis_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid",
    "stream_id" "uuid",
    "platform" "text" DEFAULT 'triton'::"text" NOT NULL,
    "ai_provider" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "progress" integer DEFAULT 0,
    "segments" "jsonb" NOT NULL,
    "submitted_players" "text"[],
    "hands_found" integer,
    "error_message" "text",
    "error_details" "jsonb",
    "ai_model" "text",
    "tokens_used" integer,
    "processing_time" integer,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "result" "jsonb",
    CONSTRAINT "analysis_jobs_ai_provider_check" CHECK (("ai_provider" = ANY (ARRAY['claude'::"text", 'gemini'::"text"]))),
    CONSTRAINT "analysis_jobs_platform_check" CHECK (("platform" = ANY (ARRAY['triton'::"text", 'pokerstars'::"text", 'wsop'::"text", 'hustler'::"text"]))),
    CONSTRAINT "analysis_jobs_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100))),
    CONSTRAINT "analysis_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "analysis_jobs_video_or_stream_check" CHECK ((("video_id" IS NOT NULL) OR ("stream_id" IS NOT NULL)))
);


ALTER TABLE "public"."analysis_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."analysis_jobs" IS 'HAE video analysis job tracking and status';



COMMENT ON COLUMN "public"."analysis_jobs"."segments" IS 'JSON array of video segments: [{start: 30, end: 900, type: "gameplay"}]';



COMMENT ON COLUMN "public"."analysis_jobs"."submitted_players" IS 'Player names submitted for matching AI-extracted names';



COMMENT ON COLUMN "public"."analysis_jobs"."created_by" IS 'User who created this analysis job';



COMMENT ON COLUMN "public"."analysis_jobs"."result" IS 'Analysis results including segment_results array with status and hands_found per segment';



CREATE TABLE IF NOT EXISTS "public"."hand_edit_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hand_id" "uuid" NOT NULL,
    "editor_id" "uuid" NOT NULL,
    "edit_type" "text" NOT NULL,
    "changed_fields" "jsonb",
    "previous_data" "jsonb",
    "new_data" "jsonb",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "hand_edit_history_edit_type_check" CHECK (("edit_type" = ANY (ARRAY['create'::"text", 'update'::"text", 'delete'::"text"])))
);


ALTER TABLE "public"."hand_edit_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."hand_edit_history" IS 'Audit log for hand modifications (Arbiter system)';



COMMENT ON COLUMN "public"."hand_edit_history"."edit_type" IS 'Type of edit: create, update, delete';



COMMENT ON COLUMN "public"."hand_edit_history"."changed_fields" IS 'Summary of changed fields (JSON)';



COMMENT ON COLUMN "public"."hand_edit_history"."previous_data" IS 'Previous data snapshot (JSON)';



COMMENT ON COLUMN "public"."hand_edit_history"."new_data" IS 'New data snapshot (JSON)';



COMMENT ON COLUMN "public"."hand_edit_history"."reason" IS 'Reason for edit (optional)';



CREATE TABLE IF NOT EXISTS "public"."hand_edit_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hand_id" "uuid" NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "requester_name" "text" NOT NULL,
    "edit_type" "text" NOT NULL,
    "original_data" "jsonb" NOT NULL,
    "proposed_data" "jsonb" NOT NULL,
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "admin_comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "hand_edit_requests_edit_type_check" CHECK (("edit_type" = ANY (ARRAY['basic_info'::"text", 'players'::"text", 'actions'::"text", 'board'::"text"]))),
    CONSTRAINT "hand_edit_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."hand_edit_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."hand_edit_requests" IS 'User-submitted edit requests for hand data, reviewable by Arbiters';



COMMENT ON COLUMN "public"."hand_edit_requests"."edit_type" IS 'Type of edit: basic_info, players, actions, board';



COMMENT ON COLUMN "public"."hand_edit_requests"."original_data" IS 'Original data before edit (JSON)';



COMMENT ON COLUMN "public"."hand_edit_requests"."proposed_data" IS 'Proposed changes (JSON)';



COMMENT ON COLUMN "public"."hand_edit_requests"."status" IS 'Request status: pending, approved, rejected';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "nickname" "text" NOT NULL,
    "avatar_url" "text",
    "bio" "text",
    "poker_experience" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "location" "text",
    "website" "text",
    "twitter_handle" "text",
    "instagram_handle" "text",
    "profile_visibility" "text" DEFAULT 'public'::"text",
    "posts_count" integer DEFAULT 0,
    "comments_count" integer DEFAULT 0,
    "likes_received" integer DEFAULT 0,
    "role" "text" DEFAULT 'user'::"text",
    "is_banned" boolean DEFAULT false,
    "ban_reason" "text",
    "banned_at" timestamp with time zone,
    "banned_by" "uuid",
    "last_sign_in_at" timestamp with time zone,
    "last_activity_at" timestamp with time zone,
    CONSTRAINT "check_user_email_not_empty" CHECK ((("length"(TRIM(BOTH FROM "email")) > 0) AND ("email" ~~ '%@%'::"text"))),
    CONSTRAINT "check_user_nickname_not_empty" CHECK (("length"(TRIM(BOTH FROM "nickname")) > 0)),
    CONSTRAINT "check_user_role_valid" CHECK (("role" = ANY (ARRAY['user'::"text", 'templar'::"text", 'arbiter'::"text", 'high_templar'::"text", 'reporter'::"text", 'admin'::"text"]))),
    CONSTRAINT "chk_ban_status_consistency" CHECK (((("is_banned" = true) AND ("banned_at" IS NOT NULL)) OR (("is_banned" = false) AND ("banned_at" IS NULL)))),
    CONSTRAINT "users_profile_visibility_check" CHECK (("profile_visibility" = ANY (ARRAY['public'::"text", 'private'::"text", 'friends'::"text"]))),
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'templar'::"text", 'arbiter'::"text", 'high_templar'::"text", 'reporter'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'User accounts with role-based access control. Roles: user < templar < arbiter < high_templar < admin';



COMMENT ON COLUMN "public"."users"."location" IS 'User location (city, country)';



COMMENT ON COLUMN "public"."users"."website" IS 'User personal website or blog URL';



COMMENT ON COLUMN "public"."users"."twitter_handle" IS 'Twitter/X handle (without @)';



COMMENT ON COLUMN "public"."users"."instagram_handle" IS 'Instagram handle (without @)';



COMMENT ON COLUMN "public"."users"."profile_visibility" IS 'Profile visibility setting';



COMMENT ON COLUMN "public"."users"."posts_count" IS 'Cached count of posts by user';



COMMENT ON COLUMN "public"."users"."comments_count" IS 'Cached count of comments by user';



COMMENT ON COLUMN "public"."users"."likes_received" IS 'Cached count of likes received by user';



COMMENT ON COLUMN "public"."users"."role" IS 'User role: user, templar (community moderator), arbiter (hand curator), high_templar (archive manager), admin (full access)';



COMMENT ON COLUMN "public"."users"."is_banned" IS 'Whether user is banned';



COMMENT ON COLUMN "public"."users"."ban_reason" IS 'Reason for ban';



COMMENT ON COLUMN "public"."users"."last_sign_in_at" IS 'auth.users의 last_sign_in_at과 동기화되는 최근 로그인 시간';



COMMENT ON COLUMN "public"."users"."last_activity_at" IS 'Last time the user visited/used the site (updated every 5 minutes during active use)';



COMMENT ON CONSTRAINT "check_user_email_not_empty" ON "public"."users" IS 'Ensures email is not empty and contains @.
Basic email format validation.';



COMMENT ON CONSTRAINT "check_user_nickname_not_empty" ON "public"."users" IS 'Ensures nickname is not empty or whitespace-only.';



COMMENT ON CONSTRAINT "check_user_role_valid" ON "public"."users" IS 'Ensures role is one of: user, templar, arbiter, high_templar, reporter, admin.
- user: Basic user (community participation)
- templar: Community moderator (posts/comments management)
- arbiter: Hand curator (manual hand input)
- high_templar: Archive manager (tournaments/streams + KAN analysis)
- reporter: Content creator (hand data entry)
- admin: Full system access
Prevents: Invalid role values.';



COMMENT ON CONSTRAINT "chk_ban_status_consistency" ON "public"."users" IS 'Ensures is_banned and banned_at are always consistent';



COMMENT ON CONSTRAINT "users_role_check" ON "public"."users" IS 'User role validation: user, templar (community moderator), arbiter (hand curator), high_templar (archive manager), reporter (content creator), admin (full access)';



CREATE OR REPLACE VIEW "public"."arbiter_activity_stats" AS
 SELECT "u"."id" AS "arbiter_id",
    "u"."nickname",
    "u"."email",
    "u"."created_at" AS "arbiter_since",
    "count"(DISTINCT "heh"."hand_id") FILTER (WHERE ("heh"."edit_type" = 'create'::"text")) AS "hands_created",
    "count"(DISTINCT "heh"."hand_id") FILTER (WHERE ("heh"."edit_type" = 'update'::"text")) AS "hands_updated",
    "count"(DISTINCT "heh"."hand_id") FILTER (WHERE ("heh"."edit_type" = 'delete'::"text")) AS "hands_deleted",
    "count"(DISTINCT "her"."id") FILTER (WHERE ("her"."status" = 'approved'::"text")) AS "requests_approved",
    "count"(DISTINCT "her"."id") FILTER (WHERE ("her"."status" = 'rejected'::"text")) AS "requests_rejected",
    "max"("heh"."created_at") AS "last_hand_edit",
    "max"("her"."reviewed_at") AS "last_request_review"
   FROM (("public"."users" "u"
     LEFT JOIN "public"."hand_edit_history" "heh" ON ((("u"."id" = "heh"."editor_id") AND ("heh"."created_at" > ("now"() - '30 days'::interval)))))
     LEFT JOIN "public"."hand_edit_requests" "her" ON ((("u"."id" = "her"."reviewed_by") AND ("her"."reviewed_at" > ("now"() - '30 days'::interval)))))
  WHERE (("u"."role" = 'arbiter'::"text") AND ("u"."banned_at" IS NULL))
  GROUP BY "u"."id", "u"."nickname", "u"."email", "u"."created_at"
  ORDER BY ("count"(DISTINCT "heh"."hand_id") FILTER (WHERE ("heh"."edit_type" = 'create'::"text"))) DESC;


ALTER VIEW "public"."arbiter_activity_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."arbiter_activity_stats" IS 'Arbiter activity statistics for the last 30 days';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "uuid",
    "old_value" "jsonb",
    "new_value" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Audit trail for all important user and admin actions';



CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "post_id" "uuid",
    "hand_id" "uuid",
    "parent_comment_id" "uuid",
    "author_id" "uuid",
    "author_name" "text" NOT NULL,
    "author_avatar" "text",
    "content" "text" NOT NULL,
    "likes_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_hidden" boolean DEFAULT false,
    CONSTRAINT "check_comment_content_not_empty" CHECK (("length"(TRIM(BOTH FROM "content")) > 0)),
    CONSTRAINT "comment_target" CHECK (((("post_id" IS NOT NULL) AND ("hand_id" IS NULL)) OR (("post_id" IS NULL) AND ("hand_id" IS NOT NULL))))
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."comments"."is_hidden" IS 'Whether comment is hidden by moderators';



COMMENT ON CONSTRAINT "check_comment_content_not_empty" ON "public"."comments" IS 'Ensures comment content is not empty or whitespace-only.';



CREATE TABLE IF NOT EXISTS "public"."data_deletion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "completed_at" timestamp with time zone,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "data_deletion_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."data_deletion_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_deletion_requests" IS 'GDPR/CCPA data deletion requests from users';



COMMENT ON COLUMN "public"."data_deletion_requests"."reason" IS 'User-provided reason for deletion request';



COMMENT ON COLUMN "public"."data_deletion_requests"."status" IS 'pending: awaiting review, approved: approved for deletion, rejected: denied, completed: data deleted';



COMMENT ON COLUMN "public"."data_deletion_requests"."admin_notes" IS 'Admin notes about the request (internal)';



CREATE TABLE IF NOT EXISTS "public"."event_payouts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sub_event_id" "uuid" NOT NULL,
    "rank" integer NOT NULL,
    "player_name" "text" NOT NULL,
    "prize_amount" bigint NOT NULL,
    "player_id" "uuid",
    "matched_status" "text" DEFAULT 'unmatched'::"text" NOT NULL,
    "matched_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_payout_position_positive" CHECK (("rank" > 0)),
    CONSTRAINT "check_payout_prize_positive" CHECK (("prize_amount" > 0)),
    CONSTRAINT "event_payouts_matched_status_check" CHECK (("matched_status" = ANY (ARRAY['auto'::"text", 'manual'::"text", 'unmatched'::"text"])))
);


ALTER TABLE "public"."event_payouts" OWNER TO "postgres";


COMMENT ON TABLE "public"."event_payouts" IS 'Stores tournament prize payouts with player matching status';



COMMENT ON COLUMN "public"."event_payouts"."prize_amount" IS 'Prize amount in cents (e.g., $10,000,000 = 1000000000)';



COMMENT ON COLUMN "public"."event_payouts"."matched_status" IS 'Player matching status: auto (auto-matched), manual (manually matched), unmatched (not yet matched)';



COMMENT ON CONSTRAINT "check_payout_position_positive" ON "public"."event_payouts" IS 'Ensures rank is positive (1st, 2nd, etc.).
Prevents: Zero or negative rank values.';



COMMENT ON CONSTRAINT "check_payout_prize_positive" ON "public"."event_payouts" IS 'Ensures prize amount is positive.
Prevents: Zero or negative prize entries.';



CREATE TABLE IF NOT EXISTS "public"."hand_actions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hand_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "street" "text" NOT NULL,
    "action_type" "text" NOT NULL,
    "amount" bigint DEFAULT 0,
    "sequence" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "action_order" integer,
    CONSTRAINT "check_hand_action_amount_positive" CHECK ((("amount" IS NULL) OR ("amount" >= 0))),
    CONSTRAINT "check_hand_action_sequence_positive" CHECK (("sequence" >= 0)),
    CONSTRAINT "check_hand_action_street_valid" CHECK (("street" = ANY (ARRAY['preflop'::"text", 'flop'::"text", 'turn'::"text", 'river'::"text"]))),
    CONSTRAINT "check_hand_action_type_valid" CHECK (("action_type" = ANY (ARRAY['fold'::"text", 'check'::"text", 'call'::"text", 'bet'::"text", 'raise'::"text", 'all-in'::"text"]))),
    CONSTRAINT "hand_actions_action_type_check" CHECK (("action_type" = ANY (ARRAY['fold'::"text", 'check'::"text", 'call'::"text", 'bet'::"text", 'raise'::"text", 'all-in'::"text"]))),
    CONSTRAINT "hand_actions_street_check" CHECK (("street" = ANY (ARRAY['preflop'::"text", 'flop'::"text", 'turn'::"text", 'river'::"text"])))
);


ALTER TABLE "public"."hand_actions" OWNER TO "postgres";


COMMENT ON TABLE "public"."hand_actions" IS '각 핸드에서 발생한 플레이어 액션 기록';



COMMENT ON COLUMN "public"."hand_actions"."street" IS '스트릿: preflop, flop, turn, river, showdown';



COMMENT ON COLUMN "public"."hand_actions"."action_type" IS '액션 타입: fold, check, call, bet, raise, all-in, show, muck, win';



COMMENT ON COLUMN "public"."hand_actions"."amount" IS '액션 금액 (fold/check는 0)';



COMMENT ON COLUMN "public"."hand_actions"."action_order" IS '핸드 내에서의 액션 순서 (1부터 시작)';



COMMENT ON CONSTRAINT "check_hand_action_amount_positive" ON "public"."hand_actions" IS 'Ensures action amount is non-negative when specified.
Allows: NULL (for check/fold actions).';



COMMENT ON CONSTRAINT "check_hand_action_sequence_positive" ON "public"."hand_actions" IS 'Ensures action sequence starts from 0.
Prevents: Negative sequence values.';



COMMENT ON CONSTRAINT "check_hand_action_street_valid" ON "public"."hand_actions" IS 'Ensures street is one of: preflop, flop, turn, river.
Prevents: Invalid street names.';



COMMENT ON CONSTRAINT "check_hand_action_type_valid" ON "public"."hand_actions" IS 'Ensures action_type is one of the valid poker actions.
Prevents: Invalid action types.';



CREATE TABLE IF NOT EXISTS "public"."hand_bookmarks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hand_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "folder_name" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hand_bookmarks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hand_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hand_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "vote_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "hand_likes_vote_type_check" CHECK (("vote_type" = ANY (ARRAY['like'::"text", 'dislike'::"text"])))
);


ALTER TABLE "public"."hand_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hand_players" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "hand_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "poker_position" "text",
    "cards" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "starting_stack" bigint DEFAULT 0,
    "ending_stack" bigint DEFAULT 0,
    "seat" integer,
    "hole_cards" "text"[],
    "final_amount" bigint DEFAULT 0,
    "is_winner" boolean DEFAULT false,
    "hand_description" "text",
    CONSTRAINT "hand_players_seat_check" CHECK ((("seat" >= 1) AND ("seat" <= 9)))
);


ALTER TABLE "public"."hand_players" OWNER TO "postgres";


COMMENT ON COLUMN "public"."hand_players"."poker_position" IS 'Position: BTN, SB, BB, UTG, MP, CO, HJ';



COMMENT ON COLUMN "public"."hand_players"."starting_stack" IS 'Player stack at hand start';



COMMENT ON COLUMN "public"."hand_players"."ending_stack" IS 'Player stack at hand end';



COMMENT ON COLUMN "public"."hand_players"."seat" IS 'Seat number (1-9 for 9-max tables)';



COMMENT ON COLUMN "public"."hand_players"."hole_cards" IS 'Hole cards as array: ["As", "Kd"]';



COMMENT ON COLUMN "public"."hand_players"."final_amount" IS 'Amount won/lost in this hand';



COMMENT ON COLUMN "public"."hand_players"."is_winner" IS 'True if player won the pot';



COMMENT ON COLUMN "public"."hand_players"."hand_description" IS 'Winning hand description (e.g., "Flush, Ace high")';



CREATE TABLE IF NOT EXISTS "public"."hand_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hand_id" "uuid" NOT NULL,
    "tag_name" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hand_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hands" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "day_id" "uuid" NOT NULL,
    "number" "text" NOT NULL,
    "description" "text" NOT NULL,
    "timestamp" "text" NOT NULL,
    "favorite" boolean DEFAULT false,
    "board_cards" "text",
    "pot_size" bigint,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "likes_count" integer DEFAULT 0,
    "dislikes_count" integer DEFAULT 0,
    "bookmarks_count" integer DEFAULT 0,
    "description_tsv" "tsvector",
    "thumbnail_url" "text",
    "job_id" "uuid",
    "video_timestamp_start" integer,
    "video_timestamp_end" integer,
    "board_flop" "text"[],
    "board_turn" "text",
    "board_river" "text",
    "stakes" "text",
    "raw_data" "jsonb",
    "ai_summary" "text",
    "small_blind" integer,
    "big_blind" integer,
    "ante" integer DEFAULT 0,
    "pot_preflop" integer,
    "pot_flop" integer,
    "pot_turn" integer,
    "pot_river" integer,
    CONSTRAINT "check_hand_number_not_empty" CHECK (("length"(TRIM(BOTH FROM "number")) > 0)),
    CONSTRAINT "check_hand_pot_size_positive" CHECK (("pot_size" >= 0)),
    CONSTRAINT "check_hands_blind_positive" CHECK (((("small_blind" IS NULL) OR ("small_blind" > 0)) AND (("big_blind" IS NULL) OR ("big_blind" > 0)) AND (("ante" IS NULL) OR ("ante" >= 0)))),
    CONSTRAINT "check_hands_blind_relationship" CHECK (((("small_blind" IS NULL) AND ("big_blind" IS NULL)) OR (("small_blind" IS NOT NULL) AND ("big_blind" IS NOT NULL) AND ("small_blind" <= "big_blind")))),
    CONSTRAINT "check_hands_pot_positive" CHECK (((("pot_preflop" IS NULL) OR ("pot_preflop" > 0)) AND (("pot_flop" IS NULL) OR ("pot_flop" > 0)) AND (("pot_turn" IS NULL) OR ("pot_turn" > 0)) AND (("pot_river" IS NULL) OR ("pot_river" > 0)))),
    CONSTRAINT "check_hands_pot_progression" CHECK (((("pot_preflop" IS NULL) OR ("pot_flop" IS NULL) OR ("pot_flop" >= "pot_preflop")) AND (("pot_flop" IS NULL) OR ("pot_turn" IS NULL) OR ("pot_turn" >= "pot_flop")) AND (("pot_turn" IS NULL) OR ("pot_river" IS NULL) OR ("pot_river" >= "pot_turn"))))
);


ALTER TABLE "public"."hands" OWNER TO "postgres";


COMMENT ON COLUMN "public"."hands"."description_tsv" IS 'Full-text search vector for hand descriptions.
Automatically updated by trigger on INSERT/UPDATE.
Used for: hand search, natural language queries.';



COMMENT ON COLUMN "public"."hands"."thumbnail_url" IS 'URL of the hand thumbnail image in Supabase Storage';



COMMENT ON COLUMN "public"."hands"."job_id" IS 'Reference to analysis job that created this hand';



COMMENT ON COLUMN "public"."hands"."video_timestamp_start" IS 'Start time in video (seconds)';



COMMENT ON COLUMN "public"."hands"."video_timestamp_end" IS 'End time in video (seconds)';



COMMENT ON COLUMN "public"."hands"."board_flop" IS 'Flop cards as array: ["As", "Kh", "Qd"]';



COMMENT ON COLUMN "public"."hands"."board_turn" IS 'Turn card: "7c"';



COMMENT ON COLUMN "public"."hands"."board_river" IS 'River card: "3s"';



COMMENT ON COLUMN "public"."hands"."stakes" IS 'DEPRECATED: Use small_blind/big_blind/ante instead. Format: "50k/100k/100k"';



COMMENT ON COLUMN "public"."hands"."raw_data" IS 'Full AI extraction output (JSON)';



COMMENT ON COLUMN "public"."hands"."ai_summary" IS 'AI-generated summary of the hand (2-3 sentences)';



COMMENT ON COLUMN "public"."hands"."small_blind" IS 'Small blind amount (in chips)';



COMMENT ON COLUMN "public"."hands"."big_blind" IS 'Big blind amount (in chips)';



COMMENT ON COLUMN "public"."hands"."ante" IS 'Ante amount (in chips), default 0';



COMMENT ON COLUMN "public"."hands"."pot_preflop" IS 'Pot size after preflop action';



COMMENT ON COLUMN "public"."hands"."pot_flop" IS 'Pot size after flop action';



COMMENT ON COLUMN "public"."hands"."pot_turn" IS 'Pot size after turn action';



COMMENT ON COLUMN "public"."hands"."pot_river" IS 'Pot size after river action (final pot)';



COMMENT ON CONSTRAINT "check_hand_number_not_empty" ON "public"."hands" IS 'Ensures hand number is not empty or whitespace-only.';



COMMENT ON CONSTRAINT "check_hands_blind_positive" ON "public"."hands" IS 'Ensures blind/ante values are positive (ante can be 0).';



COMMENT ON CONSTRAINT "check_hands_blind_relationship" ON "public"."hands" IS 'Ensures small blind is less than or equal to big blind when both exist.';



COMMENT ON CONSTRAINT "check_hands_pot_positive" ON "public"."hands" IS 'Ensures pot sizes are positive.';



COMMENT ON CONSTRAINT "check_hands_pot_progression" ON "public"."hands" IS 'Ensures pot size increases monotonically across streets.';



CREATE TABLE IF NOT EXISTS "public"."khaydarin_frames" (
    "id" "text" NOT NULL,
    "session_id" "text" NOT NULL,
    "index" integer NOT NULL,
    "url" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "label" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."khaydarin_frames" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."khaydarin_sessions" (
    "id" "text" NOT NULL,
    "video_path" "text" NOT NULL,
    "video_url" "text",
    "fps" "text" DEFAULT '1/3'::"text",
    "total_frames" integer DEFAULT 0,
    "labels_completed" boolean DEFAULT false,
    "training_completed" boolean DEFAULT false,
    "model_path" "text",
    "best_accuracy" real,
    "hf_model_url" "text",
    "hf_api_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "roboflow_uploaded" boolean DEFAULT false,
    "roboflow_uploaded_at" timestamp with time zone
);


ALTER TABLE "public"."khaydarin_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."likes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "post_id" "uuid",
    "comment_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "like_target" CHECK (((("post_id" IS NOT NULL) AND ("comment_id" IS NULL)) OR (("post_id" IS NULL) AND ("comment_id" IS NOT NULL))))
);


ALTER TABLE "public"."likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "sender_id" "uuid",
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "link" "text",
    "post_id" "uuid",
    "comment_id" "uuid",
    "hand_id" "uuid",
    "edit_request_id" "uuid",
    "claim_id" "uuid",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_claims" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "status" "public"."claim_status" DEFAULT 'pending'::"public"."claim_status" NOT NULL,
    "verification_method" "public"."verification_method" NOT NULL,
    "verification_data" "jsonb",
    "admin_notes" "text",
    "claimed_at" timestamp with time zone DEFAULT "now"(),
    "verified_at" timestamp with time zone,
    "verified_by" "uuid",
    "rejected_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."player_claims" OWNER TO "postgres";


COMMENT ON TABLE "public"."player_claims" IS '플레이어 프로필 클레임 요청 및 승인 관리';



COMMENT ON COLUMN "public"."player_claims"."verification_data" IS '증빙 자료 JSON: {social_media_url, email, etc}';



COMMENT ON COLUMN "public"."player_claims"."admin_notes" IS '관리자용 메모';



CREATE TABLE IF NOT EXISTS "public"."player_stats_cache" (
    "player_id" "uuid" NOT NULL,
    "vpip" double precision DEFAULT 0,
    "pfr" double precision DEFAULT 0,
    "three_bet" double precision DEFAULT 0,
    "ats" double precision DEFAULT 0,
    "win_rate" double precision DEFAULT 0,
    "avg_pot_size" bigint DEFAULT 0,
    "showdown_win_rate" double precision DEFAULT 0,
    "total_hands" integer DEFAULT 0,
    "hands_won" integer DEFAULT 0,
    "positional_stats" "jsonb",
    "play_style" "text",
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."player_stats_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."player_stats_cache" IS '플레이어 통계 캐시 테이블 - 성능 최적화용';



COMMENT ON COLUMN "public"."player_stats_cache"."vpip" IS 'Voluntarily Put In Pot - 프리플롭 자발적 참여율 (%)';



COMMENT ON COLUMN "public"."player_stats_cache"."pfr" IS 'Pre-Flop Raise - 프리플롭 레이즈율 (%)';



COMMENT ON COLUMN "public"."player_stats_cache"."three_bet" IS '3Bet - 3벳 비율 (%)';



COMMENT ON COLUMN "public"."player_stats_cache"."ats" IS 'Attempt To Steal - 스틸 시도 비율 (%)';



COMMENT ON COLUMN "public"."player_stats_cache"."win_rate" IS 'Win Rate - 승률 (%)';



COMMENT ON COLUMN "public"."player_stats_cache"."avg_pot_size" IS 'Average Pot Size - 평균 팟 크기';



COMMENT ON COLUMN "public"."player_stats_cache"."showdown_win_rate" IS 'Showdown Win Rate - 쇼다운 승률 (%)';



COMMENT ON COLUMN "public"."player_stats_cache"."total_hands" IS 'Total Hands - 총 플레이한 핸드 수';



COMMENT ON COLUMN "public"."player_stats_cache"."hands_won" IS 'Hands Won - 승리한 핸드 수';



COMMENT ON COLUMN "public"."player_stats_cache"."positional_stats" IS '포지션별 상세 통계 (JSON)';



COMMENT ON COLUMN "public"."player_stats_cache"."play_style" IS '플레이 스타일 분류 (Tight-Aggressive, Loose-Aggressive 등)';



CREATE TABLE IF NOT EXISTS "public"."players" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "photo_url" "text",
    "country" "text",
    "total_winnings" bigint DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "aliases" "text"[],
    "name_tsv" "tsvector",
    "normalized_name" "text" NOT NULL,
    "is_pro" boolean DEFAULT false,
    "bio" "text",
    "gender" "text",
    CONSTRAINT "check_player_name_not_empty" CHECK (("length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "check_player_winnings_positive" CHECK (("total_winnings" >= 0)),
    CONSTRAINT "players_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."players" OWNER TO "postgres";


COMMENT ON COLUMN "public"."players"."aliases" IS 'Alternative names/spellings for player matching';



COMMENT ON COLUMN "public"."players"."name_tsv" IS 'Full-text search vector for player names.
Automatically updated by trigger on INSERT/UPDATE.
Used for: player search, autocomplete.';



COMMENT ON COLUMN "public"."players"."normalized_name" IS 'Lowercase, alphanumeric only - for fast AI name matching';



COMMENT ON COLUMN "public"."players"."gender" IS 'Player gender for leaderboard filtering (male/female/other)';



COMMENT ON CONSTRAINT "check_player_name_not_empty" ON "public"."players" IS 'Ensures player name is not empty or whitespace-only.';



COMMENT ON CONSTRAINT "check_player_winnings_positive" ON "public"."players" IS 'Ensures total_winnings is non-negative.
Prevents: Negative winnings values.';



CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "author_id" "uuid",
    "author_name" "text" NOT NULL,
    "author_avatar" "text",
    "hand_id" "uuid",
    "category" "text" NOT NULL,
    "likes_count" integer DEFAULT 0,
    "comments_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "search_vector" "tsvector",
    "is_hidden" boolean DEFAULT false,
    CONSTRAINT "check_post_category_valid" CHECK (("category" = ANY (ARRAY['analysis'::"text", 'strategy'::"text", 'hand_review'::"text", 'general'::"text"]))),
    CONSTRAINT "check_post_content_not_empty" CHECK (("length"(TRIM(BOTH FROM "content")) > 0)),
    CONSTRAINT "check_post_title_not_empty" CHECK (("length"(TRIM(BOTH FROM "title")) > 0)),
    CONSTRAINT "posts_category_check" CHECK (("category" = ANY (ARRAY['analysis'::"text", 'strategy'::"text", 'hand-review'::"text", 'general'::"text"])))
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."posts"."search_vector" IS 'Full-text search vector for title and content (title weighted higher)';



COMMENT ON COLUMN "public"."posts"."is_hidden" IS 'Whether post is hidden by moderators';



COMMENT ON CONSTRAINT "check_post_category_valid" ON "public"."posts" IS 'Ensures category is one of the valid post categories.';



COMMENT ON CONSTRAINT "check_post_content_not_empty" ON "public"."posts" IS 'Ensures post content is not empty or whitespace-only.';



COMMENT ON CONSTRAINT "check_post_title_not_empty" ON "public"."posts" IS 'Ensures post title is not empty or whitespace-only.';



CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid",
    "comment_id" "uuid",
    "reporter_id" "uuid" NOT NULL,
    "reporter_name" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "admin_comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "report_target" CHECK (((("post_id" IS NOT NULL) AND ("comment_id" IS NULL)) OR (("post_id" IS NULL) AND ("comment_id" IS NOT NULL)))),
    CONSTRAINT "reports_reason_check" CHECK (("reason" = ANY (ARRAY['spam'::"text", 'harassment'::"text", 'inappropriate'::"text", 'misinformation'::"text", 'other'::"text"]))),
    CONSTRAINT "reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


COMMENT ON TABLE "public"."reports" IS 'User reports on posts and comments';



COMMENT ON COLUMN "public"."reports"."reason" IS 'Report reason: spam, harassment, inappropriate, misinformation, other';



COMMENT ON COLUMN "public"."reports"."status" IS 'Report status: pending, approved (hidden), rejected';



CREATE TABLE IF NOT EXISTS "public"."security_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "severity" "text" DEFAULT 'medium'::"text" NOT NULL,
    "user_id" "uuid",
    "ip_address" "text",
    "user_agent" "text",
    "request_method" "text",
    "request_path" "text",
    "request_body" "jsonb",
    "response_status" integer,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "security_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['sql_injection'::"text", 'xss_attempt'::"text", 'csrf_violation'::"text", 'rate_limit_exceeded'::"text", 'suspicious_file_upload'::"text", 'permission_violation'::"text", 'failed_login_attempt'::"text", 'admin_action'::"text"]))),
    CONSTRAINT "security_events_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."security_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."security_events" IS 'Security events log for monitoring and auditing';



COMMENT ON COLUMN "public"."security_events"."event_type" IS 'Type of security event (sql_injection, xss_attempt, etc.)';



COMMENT ON COLUMN "public"."security_events"."severity" IS 'Severity level of the event (low, medium, high, critical)';



COMMENT ON COLUMN "public"."security_events"."details" IS 'Additional details about the event (JSON)';



CREATE TABLE IF NOT EXISTS "public"."streams" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sub_event_id" "uuid",
    "name" "text" NOT NULL,
    "video_url" "text",
    "video_file" "text",
    "video_source" "text" DEFAULT 'youtube'::"text",
    "video_nas_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_organized" boolean DEFAULT false,
    "organized_at" timestamp with time zone,
    "published_at" timestamp with time zone,
    "status" "text" DEFAULT 'published'::"text",
    "published_by" "uuid",
    CONSTRAINT "check_stream_has_video" CHECK ((("video_url" IS NOT NULL) OR ("video_file" IS NOT NULL) OR ("video_nas_path" IS NOT NULL))),
    CONSTRAINT "check_stream_name_not_empty" CHECK (("length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "days_video_source_check" CHECK (("video_source" = ANY (ARRAY['youtube'::"text", 'upload'::"text", 'nas'::"text"]))),
    CONSTRAINT "streams_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."streams" OWNER TO "postgres";


COMMENT ON TABLE "public"."streams" IS 'Feature table streams/videos for poker events. Each stream is a broadcast of a specific event.';



COMMENT ON COLUMN "public"."streams"."id" IS 'Unique identifier for the stream';



COMMENT ON COLUMN "public"."streams"."sub_event_id" IS 'Reference to the sub-event (NULL if unsorted)';



COMMENT ON COLUMN "public"."streams"."name" IS 'Name of the stream (e.g., "Day 1", "Final Table")';



COMMENT ON COLUMN "public"."streams"."video_url" IS 'URL to the video (YouTube, etc.)';



COMMENT ON COLUMN "public"."streams"."video_file" IS 'Path to local/NAS video file';



COMMENT ON COLUMN "public"."streams"."video_source" IS 'Source of the video: youtube, local, or nas';



COMMENT ON COLUMN "public"."streams"."created_at" IS 'Timestamp when this record was created';



COMMENT ON COLUMN "public"."streams"."is_organized" IS 'Whether the stream has been organized into an event';



COMMENT ON COLUMN "public"."streams"."organized_at" IS 'Timestamp when the stream was organized';



COMMENT ON COLUMN "public"."streams"."published_at" IS 'Timestamp when this stream was published';



COMMENT ON COLUMN "public"."streams"."status" IS 'Publication status: draft, published, or archived';



COMMENT ON COLUMN "public"."streams"."published_by" IS 'User who published this stream';



CREATE TABLE IF NOT EXISTS "public"."sub_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "date" "date" NOT NULL,
    "total_prize" "text",
    "winner" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "buy_in" "text",
    "entry_count" integer,
    "blind_structure" "text",
    "level_duration" integer,
    "starting_stack" integer,
    "notes" "text",
    "event_number" "text",
    "status" "text" DEFAULT 'published'::"text",
    "published_by" "uuid",
    "published_at" timestamp with time zone,
    CONSTRAINT "check_subevent_name_not_empty" CHECK (("length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "sub_events_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."sub_events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sub_events"."buy_in" IS 'Buy-in amount (e.g., $10,000 + $400)';



COMMENT ON COLUMN "public"."sub_events"."entry_count" IS 'Number of entries/players';



COMMENT ON COLUMN "public"."sub_events"."blind_structure" IS 'Blind structure description';



COMMENT ON COLUMN "public"."sub_events"."level_duration" IS 'Level duration in minutes';



COMMENT ON COLUMN "public"."sub_events"."starting_stack" IS 'Starting chip stack';



COMMENT ON COLUMN "public"."sub_events"."notes" IS 'Additional notes or information';



COMMENT ON COLUMN "public"."sub_events"."event_number" IS 'Event number or identifier (e.g., "#1", "Event #15", "1A"). Supports both sequential numbering and official event codes.';



COMMENT ON COLUMN "public"."sub_events"."status" IS 'Publication status: draft, published, or archived';



COMMENT ON COLUMN "public"."sub_events"."published_by" IS 'User who published this sub_event';



COMMENT ON COLUMN "public"."sub_events"."published_at" IS 'Timestamp when this sub_event was published';



COMMENT ON CONSTRAINT "check_subevent_name_not_empty" ON "public"."sub_events" IS 'Ensures sub-event name is not empty or whitespace-only.';



CREATE TABLE IF NOT EXISTS "public"."tournament_categories" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "short_name" "text",
    "aliases" "text"[] DEFAULT '{}'::"text"[],
    "logo_url" "text",
    "is_active" boolean DEFAULT true,
    "theme_gradient" "text",
    "theme_text" "text",
    "theme_shadow" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "parent_id" "text",
    "game_type" "public"."game_type" DEFAULT 'both'::"public"."game_type" NOT NULL,
    CONSTRAINT "check_category_display_name_not_empty" CHECK (("length"(TRIM(BOTH FROM "display_name")) > 0)),
    CONSTRAINT "check_category_game_type_valid" CHECK (("game_type" = ANY (ARRAY['tournament'::"public"."game_type", 'cash_game'::"public"."game_type", 'both'::"public"."game_type"]))),
    CONSTRAINT "check_category_name_not_empty" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."tournament_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournaments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "category_logo" "text",
    "location" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "game_type" "text" DEFAULT 'tournament'::"text" NOT NULL,
    "category_id" "text" NOT NULL,
    "city" "text",
    "country" "text",
    "status" "text" DEFAULT 'published'::"text",
    "published_by" "uuid",
    "published_at" timestamp with time zone,
    CONSTRAINT "check_tournament_dates" CHECK (("start_date" <= "end_date")),
    CONSTRAINT "check_tournament_name_not_empty" CHECK (("length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "tournaments_game_type_check" CHECK (("game_type" = ANY (ARRAY['tournament'::"text", 'cash-game'::"text"]))),
    CONSTRAINT "tournaments_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."tournaments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tournaments"."category" IS 'Tournament category (standardized capitalization)';



COMMENT ON COLUMN "public"."tournaments"."game_type" IS 'Type of poker game: tournament or cash-game';



COMMENT ON COLUMN "public"."tournaments"."city" IS 'City where the tournament takes place (e.g., Las Vegas, Macau, Paris)';



COMMENT ON COLUMN "public"."tournaments"."country" IS 'Country code or name (e.g., USA, CHN, FRA)';



COMMENT ON COLUMN "public"."tournaments"."status" IS 'Publication status: draft, published, or archived';



COMMENT ON COLUMN "public"."tournaments"."published_by" IS 'User who published this tournament';



COMMENT ON COLUMN "public"."tournaments"."published_at" IS 'Timestamp when this tournament was published';



COMMENT ON CONSTRAINT "check_tournament_dates" ON "public"."tournaments" IS 'Ensures tournament start date is not after end date.
Prevents: Invalid date ranges.';



COMMENT ON CONSTRAINT "check_tournament_name_not_empty" ON "public"."tournaments" IS 'Ensures tournament name is not empty or whitespace-only.';



CREATE OR REPLACE VIEW "public"."tournament_category_stats" AS
 SELECT "public"."normalize_tournament_category"("category") AS "normalized_category",
    "category" AS "original_category",
    "count"(*) AS "tournament_count",
    "min"("start_date") AS "earliest_date",
    "max"("end_date") AS "latest_date"
   FROM "public"."tournaments"
  GROUP BY "category"
  ORDER BY ("count"(*)) DESC;


ALTER VIEW "public"."tournament_category_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_admin_performance_quick_check" AS
 SELECT 'Database Size'::"text" AS "check_name",
    ( SELECT "pg_size_pretty"(("sum"("pg_total_relation_size"((((("pg_tables"."schemaname")::"text" || '.'::"text") || ("pg_tables"."tablename")::"text"))::"regclass")))::bigint) AS "pg_size_pretty"
           FROM "pg_tables"
          WHERE ("pg_tables"."schemaname" = 'public'::"name")) AS "value",
    'OK'::"text" AS "status"
UNION ALL
 SELECT 'Table Cache Hit Ratio'::"text" AS "check_name",
    ( SELECT (("round"((("sum"("pg_statio_user_tables"."heap_blks_hit") / NULLIF(("sum"("pg_statio_user_tables"."heap_blks_hit") + "sum"("pg_statio_user_tables"."heap_blks_read")), (0)::numeric)) * (100)::numeric), 2))::"text" || '%'::"text")
           FROM "pg_statio_user_tables") AS "value",
        CASE
            WHEN (( SELECT "round"((("sum"("pg_statio_user_tables"."heap_blks_hit") / NULLIF(("sum"("pg_statio_user_tables"."heap_blks_hit") + "sum"("pg_statio_user_tables"."heap_blks_read")), (0)::numeric)) * (100)::numeric), 2) AS "round"
               FROM "pg_statio_user_tables") > (95)::numeric) THEN 'GOOD'::"text"
            WHEN (( SELECT "round"((("sum"("pg_statio_user_tables"."heap_blks_hit") / NULLIF(("sum"("pg_statio_user_tables"."heap_blks_hit") + "sum"("pg_statio_user_tables"."heap_blks_read")), (0)::numeric)) * (100)::numeric), 2) AS "round"
               FROM "pg_statio_user_tables") > (90)::numeric) THEN 'OK'::"text"
            ELSE 'WARNING'::"text"
        END AS "status"
UNION ALL
 SELECT 'Index Cache Hit Ratio'::"text" AS "check_name",
    ( SELECT (("round"((("sum"("pg_statio_user_indexes"."idx_blks_hit") / NULLIF(("sum"("pg_statio_user_indexes"."idx_blks_hit") + "sum"("pg_statio_user_indexes"."idx_blks_read")), (0)::numeric)) * (100)::numeric), 2))::"text" || '%'::"text")
           FROM "pg_statio_user_indexes") AS "value",
        CASE
            WHEN (( SELECT "round"((("sum"("pg_statio_user_indexes"."idx_blks_hit") / NULLIF(("sum"("pg_statio_user_indexes"."idx_blks_hit") + "sum"("pg_statio_user_indexes"."idx_blks_read")), (0)::numeric)) * (100)::numeric), 2) AS "round"
               FROM "pg_statio_user_indexes") > (95)::numeric) THEN 'GOOD'::"text"
            WHEN (( SELECT "round"((("sum"("pg_statio_user_indexes"."idx_blks_hit") / NULLIF(("sum"("pg_statio_user_indexes"."idx_blks_hit") + "sum"("pg_statio_user_indexes"."idx_blks_read")), (0)::numeric)) * (100)::numeric), 2) AS "round"
               FROM "pg_statio_user_indexes") > (90)::numeric) THEN 'OK'::"text"
            ELSE 'WARNING'::"text"
        END AS "status"
UNION ALL
 SELECT 'Unused Indexes'::"text" AS "check_name",
    ( SELECT ("count"(*))::"text" AS "count"
           FROM "pg_stat_user_indexes"
          WHERE (("pg_stat_user_indexes"."idx_scan" = 0) AND ("pg_stat_user_indexes"."indexrelname" !~~ '%_pkey'::"text"))) AS "value",
        CASE
            WHEN (( SELECT "count"(*) AS "count"
               FROM "pg_stat_user_indexes"
              WHERE (("pg_stat_user_indexes"."idx_scan" = 0) AND ("pg_stat_user_indexes"."indexrelname" !~~ '%_pkey'::"text"))) = 0) THEN 'GOOD'::"text"
            WHEN (( SELECT "count"(*) AS "count"
               FROM "pg_stat_user_indexes"
              WHERE (("pg_stat_user_indexes"."idx_scan" = 0) AND ("pg_stat_user_indexes"."indexrelname" !~~ '%_pkey'::"text"))) < 5) THEN 'OK'::"text"
            ELSE 'WARNING'::"text"
        END AS "status";


ALTER VIEW "public"."v_admin_performance_quick_check" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_admin_performance_quick_check" IS 'Quick health check for admins with status indicators.
Usage: SELECT * FROM v_admin_performance_quick_check;
Statuses: GOOD (optimal), OK (acceptable), WARNING (needs attention).';



CREATE OR REPLACE VIEW "public"."v_cache_hit_ratio" AS
 SELECT 'Index'::"text" AS "cache_type",
    "sum"("pg_statio_user_indexes"."idx_blks_hit") AS "hits",
    "sum"("pg_statio_user_indexes"."idx_blks_read") AS "reads",
        CASE
            WHEN (("sum"("pg_statio_user_indexes"."idx_blks_hit") + "sum"("pg_statio_user_indexes"."idx_blks_read")) = (0)::numeric) THEN (0)::numeric
            ELSE "round"((("sum"("pg_statio_user_indexes"."idx_blks_hit") / ("sum"("pg_statio_user_indexes"."idx_blks_hit") + "sum"("pg_statio_user_indexes"."idx_blks_read"))) * (100)::numeric), 2)
        END AS "hit_ratio_pct"
   FROM "pg_statio_user_indexes"
UNION ALL
 SELECT 'Table'::"text" AS "cache_type",
    "sum"("pg_statio_user_tables"."heap_blks_hit") AS "hits",
    "sum"("pg_statio_user_tables"."heap_blks_read") AS "reads",
        CASE
            WHEN (("sum"("pg_statio_user_tables"."heap_blks_hit") + "sum"("pg_statio_user_tables"."heap_blks_read")) = (0)::numeric) THEN (0)::numeric
            ELSE "round"((("sum"("pg_statio_user_tables"."heap_blks_hit") / ("sum"("pg_statio_user_tables"."heap_blks_hit") + "sum"("pg_statio_user_tables"."heap_blks_read"))) * (100)::numeric), 2)
        END AS "hit_ratio_pct"
   FROM "pg_statio_user_tables";


ALTER VIEW "public"."v_cache_hit_ratio" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_cache_hit_ratio" IS 'Shows cache hit ratios for tables and indexes.
Target: >95% hit ratio. Lower values indicate insufficient shared_buffers.
Usage: SELECT * FROM v_cache_hit_ratio;';



CREATE OR REPLACE VIEW "public"."v_database_size" AS
 SELECT "datname" AS "database_name",
    "pg_size_pretty"("pg_database_size"("datname")) AS "size"
   FROM "pg_database"
  WHERE ("datname" = "current_database"());


ALTER VIEW "public"."v_database_size" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_database_size" IS 'Shows total database size';



CREATE OR REPLACE VIEW "public"."v_duplicate_indexes" AS
 SELECT "pg_size_pretty"(("sum"("pg_relation_size"(("idx"."indexrelid")::"regclass")))::bigint) AS "total_size",
    "array_agg"(("idx"."indexrelid")::"regclass") AS "indexes",
    ("idx"."indkey")::"text" AS "columns"
   FROM ("pg_index" "idx"
     JOIN "pg_class" "c" ON (("c"."oid" = "idx"."indexrelid")))
  WHERE (("c"."relnamespace" = ( SELECT "pg_namespace"."oid"
           FROM "pg_namespace"
          WHERE ("pg_namespace"."nspname" = 'public'::"name"))) AND (NOT "idx"."indisprimary"))
  GROUP BY "idx"."indrelid", "idx"."indkey"
 HAVING ("count"(*) > 1);


ALTER VIEW "public"."v_duplicate_indexes" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_duplicate_indexes" IS 'Detects potentially duplicate indexes (same columns).
Usage: SELECT * FROM v_duplicate_indexes;
Action: Review and drop unnecessary duplicates.';



CREATE OR REPLACE VIEW "public"."v_fulltext_search_stats" AS
SELECT
    NULL::"text" AS "table_name",
    NULL::bigint AS "total_rows",
    NULL::bigint AS "indexed_rows",
    NULL::"text" AS "index_size";


ALTER VIEW "public"."v_fulltext_search_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_fulltext_search_stats" IS 'Statistics for full-text search indexes.
Shows coverage and size of FTS indexes.
Usage: SELECT * FROM v_fulltext_search_stats;';



CREATE OR REPLACE VIEW "public"."v_index_sizes" AS
 SELECT "schemaname",
    "relname" AS "tablename",
    "indexrelname" AS "indexname",
    "pg_size_pretty"("pg_relation_size"(("indexrelid")::"regclass")) AS "index_size",
    "idx_scan" AS "scans",
    "idx_tup_read" AS "tuples_read",
    "idx_tup_fetch" AS "tuples_fetched"
   FROM "pg_stat_user_indexes"
  WHERE ("schemaname" = 'public'::"name")
  ORDER BY ("pg_relation_size"(("indexrelid")::"regclass")) DESC;


ALTER VIEW "public"."v_index_sizes" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_index_sizes" IS 'Shows all indexes with their sizes and usage statistics';



CREATE OR REPLACE VIEW "public"."v_index_statistics" AS
 SELECT "schemaname",
    "relname" AS "tablename",
    "indexrelname" AS "indexname",
    "idx_scan",
    "idx_tup_read",
    "idx_tup_fetch",
    "pg_size_pretty"("pg_relation_size"(("indexrelid")::"regclass")) AS "size"
   FROM "pg_stat_user_indexes"
  WHERE ("schemaname" = 'public'::"name")
  ORDER BY ("pg_relation_size"(("indexrelid")::"regclass")) DESC;


ALTER VIEW "public"."v_index_statistics" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_index_statistics" IS 'Shows index usage and size statistics';



CREATE OR REPLACE VIEW "public"."v_index_usage_stats" AS
 SELECT "schemaname",
    "relname" AS "tablename",
    "indexrelname" AS "indexname",
    "idx_scan" AS "scans",
    "idx_tup_read" AS "tuples_read",
    "idx_tup_fetch" AS "tuples_fetched",
    "pg_size_pretty"("pg_relation_size"(("indexrelid")::"regclass")) AS "size",
        CASE
            WHEN ("idx_scan" = 0) THEN 'UNUSED'::"text"
            WHEN ("idx_scan" < 100) THEN 'LOW'::"text"
            WHEN ("idx_scan" < 1000) THEN 'MEDIUM'::"text"
            ELSE 'HIGH'::"text"
        END AS "usage_level"
   FROM "pg_stat_user_indexes"
  WHERE ("schemaname" = 'public'::"name")
  ORDER BY "idx_scan", ("pg_relation_size"(("indexrelid")::"regclass")) DESC;


ALTER VIEW "public"."v_index_usage_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_index_usage_stats" IS 'Shows index usage statistics with usage level classification.
Usage: SELECT * FROM v_index_usage_stats WHERE usage_level = ''UNUSED'';
Helps identify: unused indexes, underutilized indexes.';



CREATE OR REPLACE VIEW "public"."v_monitoring_dashboard" AS
 SELECT ( SELECT "count"(*) AS "count"
           FROM "pg_stat_user_tables") AS "total_tables",
    ( SELECT "count"(*) AS "count"
           FROM "pg_stat_user_indexes"
          WHERE ("pg_stat_user_indexes"."indexrelname" !~~ '%_pkey'::"text")) AS "total_indexes",
    ( SELECT "count"(*) AS "count"
           FROM "pg_stat_user_indexes"
          WHERE (("pg_stat_user_indexes"."idx_scan" = 0) AND ("pg_stat_user_indexes"."indexrelname" !~~ '%_pkey'::"text"))) AS "unused_indexes",
    ( SELECT "pg_size_pretty"(("sum"("pg_total_relation_size"((((("pg_tables"."schemaname")::"text" || '.'::"text") || ("pg_tables"."tablename")::"text"))::"regclass")))::bigint) AS "pg_size_pretty"
           FROM "pg_tables"
          WHERE ("pg_tables"."schemaname" = 'public'::"name")) AS "total_db_size",
    ( SELECT "round"((("sum"("pg_statio_user_tables"."heap_blks_hit") / NULLIF(("sum"("pg_statio_user_tables"."heap_blks_hit") + "sum"("pg_statio_user_tables"."heap_blks_read")), (0)::numeric)) * (100)::numeric), 2) AS "round"
           FROM "pg_statio_user_tables") AS "table_cache_hit_pct",
    ( SELECT "round"((("sum"("pg_statio_user_indexes"."idx_blks_hit") / NULLIF(("sum"("pg_statio_user_indexes"."idx_blks_hit") + "sum"("pg_statio_user_indexes"."idx_blks_read")), (0)::numeric)) * (100)::numeric), 2) AS "round"
           FROM "pg_statio_user_indexes") AS "index_cache_hit_pct";


ALTER VIEW "public"."v_monitoring_dashboard" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_monitoring_dashboard" IS 'Single-row dashboard with key database health metrics.
Usage: SELECT * FROM v_monitoring_dashboard;
Use for: Quick health checks, monitoring alerts.';



CREATE OR REPLACE VIEW "public"."v_rls_function_test" AS
 SELECT 'is_admin'::"text" AS "function_name",
    "public"."is_admin"() AS "result",
    'Should be fast with STABLE'::"text" AS "note"
UNION ALL
 SELECT 'is_reporter'::"text" AS "function_name",
    "public"."is_reporter"() AS "result",
    'Should be fast with STABLE'::"text" AS "note"
UNION ALL
 SELECT 'is_banned'::"text" AS "function_name",
    "public"."is_banned"() AS "result",
    'Should be fast with STABLE'::"text" AS "note";


ALTER VIEW "public"."v_rls_function_test" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_rls_function_test" IS 'Test view to verify RLS helper functions are working correctly.
Run: SELECT * FROM v_rls_function_test;';



CREATE OR REPLACE VIEW "public"."v_rls_policy_stats" AS
 SELECT "schemaname",
    "tablename",
    "count"(*) AS "policy_count",
    "string_agg"(("policyname")::"text", ', '::"text" ORDER BY (("policyname")::"text")) AS "policies"
   FROM "pg_policies"
  WHERE ("schemaname" = 'public'::"name")
  GROUP BY "schemaname", "tablename"
  ORDER BY ("count"(*)) DESC, "tablename";


ALTER VIEW "public"."v_rls_policy_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_rls_policy_stats" IS 'Shows RLS policy count per table.
Usage: SELECT * FROM v_rls_policy_stats;
Helps identify tables with many policies.';



CREATE OR REPLACE VIEW "public"."v_table_bloat" AS
 SELECT "s"."schemaname",
    "s"."relname" AS "tablename",
    "pg_size_pretty"("pg_relation_size"((((("s"."schemaname")::"text" || '.'::"text") || ("s"."relname")::"text"))::"regclass")) AS "table_size",
    "round"(((("pg_relation_size"((((("s"."schemaname")::"text" || '.'::"text") || ("s"."relname")::"text"))::"regclass"))::numeric / (NULLIF(("pg_stat_get_live_tuples"("c"."oid") + "pg_stat_get_dead_tuples"("c"."oid")), 0))::numeric) * ("pg_stat_get_dead_tuples"("c"."oid"))::numeric), 2) AS "estimated_bloat_bytes",
    "pg_stat_get_dead_tuples"("c"."oid") AS "dead_tuples",
    "pg_stat_get_live_tuples"("c"."oid") AS "live_tuples",
        CASE
            WHEN (("pg_stat_get_live_tuples"("c"."oid") + "pg_stat_get_dead_tuples"("c"."oid")) = 0) THEN (0)::numeric
            ELSE "round"(((("pg_stat_get_dead_tuples"("c"."oid"))::numeric / (("pg_stat_get_live_tuples"("c"."oid") + "pg_stat_get_dead_tuples"("c"."oid")))::numeric) * (100)::numeric), 2)
        END AS "bloat_pct"
   FROM ("pg_stat_user_tables" "s"
     JOIN "pg_class" "c" ON ((("c"."relname" = "s"."relname") AND ("c"."relnamespace" = ( SELECT "pg_namespace"."oid"
           FROM "pg_namespace"
          WHERE ("pg_namespace"."nspname" = "s"."schemaname"))))))
  WHERE ("s"."schemaname" = 'public'::"name")
  ORDER BY ("pg_stat_get_dead_tuples"("c"."oid")) DESC;


ALTER VIEW "public"."v_table_bloat" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_table_bloat" IS 'Estimates table bloat from dead tuples.
Bloat >20%: Consider running VACUUM.
Usage: SELECT * FROM v_table_bloat WHERE bloat_pct > 20;';



CREATE OR REPLACE VIEW "public"."v_table_sizes" AS
 SELECT "schemaname",
    "tablename",
    "pg_size_pretty"("pg_total_relation_size"((((("schemaname")::"text" || '.'::"text") || ("tablename")::"text"))::"regclass")) AS "total_size",
    "pg_size_pretty"("pg_relation_size"((((("schemaname")::"text" || '.'::"text") || ("tablename")::"text"))::"regclass")) AS "table_size",
    "pg_size_pretty"(("pg_total_relation_size"((((("schemaname")::"text" || '.'::"text") || ("tablename")::"text"))::"regclass") - "pg_relation_size"((((("schemaname")::"text" || '.'::"text") || ("tablename")::"text"))::"regclass"))) AS "indexes_size",
    "pg_total_relation_size"((((("schemaname")::"text" || '.'::"text") || ("tablename")::"text"))::"regclass") AS "total_bytes"
   FROM "pg_tables"
  WHERE ("schemaname" = 'public'::"name")
  ORDER BY ("pg_total_relation_size"((((("schemaname")::"text" || '.'::"text") || ("tablename")::"text"))::"regclass")) DESC;


ALTER VIEW "public"."v_table_sizes" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_table_sizes" IS 'Shows table and index sizes sorted by total size.
Usage: SELECT * FROM v_table_sizes;
Helps identify: large tables, index bloat, storage issues.';



CREATE OR REPLACE VIEW "public"."v_table_statistics" AS
 SELECT "schemaname",
    "relname" AS "tablename",
    "pg_size_pretty"("pg_total_relation_size"((((("schemaname")::"text" || '.'::"text") || ("relname")::"text"))::"regclass")) AS "total_size",
    "pg_size_pretty"("pg_relation_size"((((("schemaname")::"text" || '.'::"text") || ("relname")::"text"))::"regclass")) AS "table_size",
    "pg_size_pretty"(("pg_total_relation_size"((((("schemaname")::"text" || '.'::"text") || ("relname")::"text"))::"regclass") - "pg_relation_size"((((("schemaname")::"text" || '.'::"text") || ("relname")::"text"))::"regclass"))) AS "indexes_size",
    "n_live_tup" AS "live_rows",
    "n_dead_tup" AS "dead_rows",
    "n_tup_ins" AS "inserts",
    "n_tup_upd" AS "updates",
    "n_tup_del" AS "deletes",
    "last_vacuum",
    "last_autovacuum",
    "last_analyze",
    "last_autoanalyze"
   FROM "pg_stat_user_tables"
  WHERE ("schemaname" = 'public'::"name")
  ORDER BY ("pg_total_relation_size"((((("schemaname")::"text" || '.'::"text") || ("relname")::"text"))::"regclass")) DESC;


ALTER VIEW "public"."v_table_statistics" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_table_statistics" IS 'Shows table sizes, row counts, and maintenance statistics';



CREATE OR REPLACE VIEW "public"."v_unused_indexes" AS
 SELECT "schemaname",
    "relname" AS "tablename",
    "indexrelname" AS "indexname",
    "idx_scan" AS "index_scans",
    "pg_size_pretty"("pg_relation_size"(("indexrelid")::"regclass")) AS "index_size",
    "pg_relation_size"(("indexrelid")::"regclass") AS "index_size_bytes"
   FROM "pg_stat_user_indexes"
  WHERE (("schemaname" = 'public'::"name") AND ("idx_scan" = 0) AND ("indexrelid" IS NOT NULL))
  ORDER BY ("pg_relation_size"(("indexrelid")::"regclass")) DESC;


ALTER VIEW "public"."v_unused_indexes" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_unused_indexes" IS 'Identifies potentially unused indexes for removal consideration. Run after 7+ days of production usage.';



CREATE OR REPLACE VIEW "public"."v_user_ban_status" AS
 SELECT "id",
    "email",
    "nickname",
    ("banned_at" IS NOT NULL) AS "is_banned_computed",
    "banned_at",
    "ban_reason",
    "banned_by",
        CASE
            WHEN ("banned_at" IS NOT NULL) THEN (EXTRACT(epoch FROM ("now"() - "banned_at")) / 86400.0)
            ELSE NULL::numeric
        END AS "days_since_ban"
   FROM "public"."users";


ALTER VIEW "public"."v_user_ban_status" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_user_ban_status" IS 'Helper view for ban status. Use is_banned_computed instead of is_banned column.';



CREATE TABLE IF NOT EXISTS "public"."videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "url" "text" NOT NULL,
    "youtube_id" "text",
    "platform" "text" DEFAULT 'youtube'::"text" NOT NULL,
    "title" "text",
    "description" "text",
    "duration" integer,
    "thumbnail_url" "text",
    "published_at" timestamp with time zone,
    "channel_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."videos" OWNER TO "postgres";


COMMENT ON TABLE "public"."videos" IS 'YouTube video metadata for HAE analysis (separate from streams)';



COMMENT ON COLUMN "public"."videos"."youtube_id" IS 'YouTube video ID extracted from URL';



ALTER TABLE ONLY "public"."admin_logs"
    ADD CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analysis_jobs"
    ADD CONSTRAINT "analysis_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_deletion_requests"
    ADD CONSTRAINT "data_deletion_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."streams"
    ADD CONSTRAINT "days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_payouts"
    ADD CONSTRAINT "event_payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_payouts"
    ADD CONSTRAINT "event_payouts_sub_event_id_rank_key" UNIQUE ("sub_event_id", "rank");



ALTER TABLE ONLY "public"."hand_actions"
    ADD CONSTRAINT "hand_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hand_bookmarks"
    ADD CONSTRAINT "hand_bookmarks_hand_id_user_id_key" UNIQUE ("hand_id", "user_id");



ALTER TABLE ONLY "public"."hand_bookmarks"
    ADD CONSTRAINT "hand_bookmarks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hand_edit_history"
    ADD CONSTRAINT "hand_edit_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hand_edit_requests"
    ADD CONSTRAINT "hand_edit_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hand_likes"
    ADD CONSTRAINT "hand_likes_hand_id_user_id_key" UNIQUE ("hand_id", "user_id");



ALTER TABLE ONLY "public"."hand_likes"
    ADD CONSTRAINT "hand_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hand_players"
    ADD CONSTRAINT "hand_players_hand_id_player_id_key" UNIQUE ("hand_id", "player_id");



ALTER TABLE ONLY "public"."hand_players"
    ADD CONSTRAINT "hand_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hand_tags"
    ADD CONSTRAINT "hand_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hands"
    ADD CONSTRAINT "hands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."khaydarin_frames"
    ADD CONSTRAINT "khaydarin_frames_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."khaydarin_frames"
    ADD CONSTRAINT "khaydarin_frames_session_id_index_key" UNIQUE ("session_id", "index");



ALTER TABLE ONLY "public"."khaydarin_sessions"
    ADD CONSTRAINT "khaydarin_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_comment_id_key" UNIQUE ("user_id", "comment_id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_post_id_key" UNIQUE ("user_id", "post_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_claims"
    ADD CONSTRAINT "player_claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_stats_cache"
    ADD CONSTRAINT "player_stats_cache_pkey" PRIMARY KEY ("player_id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_comment_id_key" UNIQUE ("reporter_id", "comment_id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_post_id_key" UNIQUE ("reporter_id", "post_id");



ALTER TABLE ONLY "public"."security_events"
    ADD CONSTRAINT "security_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sub_events"
    ADD CONSTRAINT "sub_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_categories"
    ADD CONSTRAINT "tournament_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hand_tags"
    ADD CONSTRAINT "unique_hand_tag" UNIQUE ("hand_id", "tag_name", "created_by");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "unique_notification" UNIQUE ("recipient_id", "type", "post_id", "comment_id", "sender_id", "created_at");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_nickname_key" UNIQUE ("nickname");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_url_key" UNIQUE ("url");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_youtube_id_key" UNIQUE ("youtube_id");



CREATE INDEX "admin_logs_admin_id_idx" ON "public"."admin_logs" USING "btree" ("admin_id");



CREATE INDEX "admin_logs_created_at_idx" ON "public"."admin_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "admin_logs_target_idx" ON "public"."admin_logs" USING "btree" ("target_type", "target_id");



CREATE INDEX "hand_bookmarks_created_at_idx" ON "public"."hand_bookmarks" USING "btree" ("created_at" DESC);



CREATE INDEX "hand_bookmarks_folder_name_idx" ON "public"."hand_bookmarks" USING "btree" ("folder_name");



CREATE INDEX "hand_bookmarks_hand_id_idx" ON "public"."hand_bookmarks" USING "btree" ("hand_id");



CREATE INDEX "hand_bookmarks_user_id_idx" ON "public"."hand_bookmarks" USING "btree" ("user_id");



CREATE INDEX "hand_edit_history_composite_idx" ON "public"."hand_edit_history" USING "btree" ("hand_id", "created_at" DESC);



CREATE INDEX "hand_edit_history_created_at_idx" ON "public"."hand_edit_history" USING "btree" ("created_at" DESC);



CREATE INDEX "hand_edit_history_editor_id_idx" ON "public"."hand_edit_history" USING "btree" ("editor_id");



CREATE INDEX "hand_edit_history_hand_id_idx" ON "public"."hand_edit_history" USING "btree" ("hand_id");



CREATE INDEX "hand_likes_hand_id_idx" ON "public"."hand_likes" USING "btree" ("hand_id");



CREATE INDEX "hand_likes_user_id_idx" ON "public"."hand_likes" USING "btree" ("user_id");



CREATE INDEX "hand_likes_vote_type_idx" ON "public"."hand_likes" USING "btree" ("vote_type");



CREATE INDEX "hands_bookmarks_count_idx" ON "public"."hands" USING "btree" ("bookmarks_count");



CREATE INDEX "hands_dislikes_count_idx" ON "public"."hands" USING "btree" ("dislikes_count");



CREATE INDEX "hands_likes_count_idx" ON "public"."hands" USING "btree" ("likes_count");



CREATE INDEX "idx_analysis_jobs_created_at" ON "public"."analysis_jobs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_analysis_jobs_created_by_created_at" ON "public"."analysis_jobs" USING "btree" ("created_by", "created_at" DESC);



CREATE INDEX "idx_analysis_jobs_status" ON "public"."analysis_jobs" USING "btree" ("status");



CREATE INDEX "idx_analysis_jobs_stream_id" ON "public"."analysis_jobs" USING "btree" ("stream_id");



CREATE INDEX "idx_analysis_jobs_video_id" ON "public"."analysis_jobs" USING "btree" ("video_id");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_resource" ON "public"."audit_logs" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_categories_active" ON "public"."tournament_categories" USING "btree" ("is_active");



CREATE INDEX "idx_categories_game_type" ON "public"."tournament_categories" USING "btree" ("game_type");



CREATE INDEX "idx_categories_parent_id" ON "public"."tournament_categories" USING "btree" ("parent_id");



CREATE INDEX "idx_comments_author_created" ON "public"."comments" USING "btree" ("author_id", "created_at" DESC);



CREATE INDEX "idx_comments_author_id" ON "public"."comments" USING "btree" ("author_id");



CREATE INDEX "idx_comments_created_at" ON "public"."comments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_comments_hand_id" ON "public"."comments" USING "btree" ("hand_id");



CREATE INDEX "idx_comments_is_hidden" ON "public"."comments" USING "btree" ("is_hidden");



CREATE INDEX "idx_comments_parent" ON "public"."comments" USING "btree" ("parent_comment_id") WHERE ("parent_comment_id" IS NOT NULL);



CREATE INDEX "idx_comments_parent_id" ON "public"."comments" USING "btree" ("parent_comment_id");



CREATE INDEX "idx_comments_post_created" ON "public"."comments" USING "btree" ("post_id", "created_at" DESC);



CREATE INDEX "idx_comments_post_id" ON "public"."comments" USING "btree" ("post_id");



CREATE INDEX "idx_comments_post_parent" ON "public"."comments" USING "btree" ("post_id", "parent_comment_id") WHERE ("post_id" IS NOT NULL);



CREATE INDEX "idx_comments_post_parent_created" ON "public"."comments" USING "btree" ("post_id", "parent_comment_id", "created_at" DESC);



CREATE INDEX "idx_data_deletion_requests_requested_at" ON "public"."data_deletion_requests" USING "btree" ("requested_at" DESC);



CREATE INDEX "idx_data_deletion_requests_status" ON "public"."data_deletion_requests" USING "btree" ("status");



CREATE INDEX "idx_data_deletion_requests_user_id" ON "public"."data_deletion_requests" USING "btree" ("user_id");



CREATE INDEX "idx_event_payouts_matched_status" ON "public"."event_payouts" USING "btree" ("matched_status");



CREATE INDEX "idx_event_payouts_player_id" ON "public"."event_payouts" USING "btree" ("player_id");



CREATE INDEX "idx_event_payouts_player_subevent" ON "public"."event_payouts" USING "btree" ("player_id", "sub_event_id") WHERE (("player_id" IS NOT NULL) AND ("sub_event_id" IS NOT NULL));



COMMENT ON INDEX "public"."idx_event_payouts_player_subevent" IS 'Optimizes queries fetching prize history for a player.
Used in: player profile pages, prize statistics.
Expected improvement: 50% faster prize history queries.';



CREATE INDEX "idx_event_payouts_sub_event_id" ON "public"."event_payouts" USING "btree" ("sub_event_id");



CREATE INDEX "idx_hand_actions_hand_id" ON "public"."hand_actions" USING "btree" ("hand_id");



CREATE INDEX "idx_hand_actions_hand_order" ON "public"."hand_actions" USING "btree" ("hand_id", "action_order");



CREATE INDEX "idx_hand_actions_hand_street_seq" ON "public"."hand_actions" USING "btree" ("hand_id", "street", "sequence");



COMMENT ON INDEX "public"."idx_hand_actions_hand_street_seq" IS 'Optimizes queries fetching actions for a hand in street order.
Used in: hand history timelines, action replays.
Expected improvement: 70% faster action sequence queries.';



CREATE INDEX "idx_hand_actions_player_action" ON "public"."hand_actions" USING "btree" ("player_id", "action_type") WHERE ("player_id" IS NOT NULL);



COMMENT ON INDEX "public"."idx_hand_actions_player_action" IS 'Optimizes action-type frequency queries for players.
Used in: player style analysis (aggressive/passive classification).';



CREATE INDEX "idx_hand_actions_player_id" ON "public"."hand_actions" USING "btree" ("player_id");



COMMENT ON INDEX "public"."idx_hand_actions_player_id" IS 'Optimizes player action statistics queries.
Used in: player profile pages, VPIP/PFR calculations.
Expected improvement: 25-35% faster statistics queries.';



CREATE INDEX "idx_hand_actions_sequence" ON "public"."hand_actions" USING "btree" ("hand_id", "sequence");



CREATE INDEX "idx_hand_actions_street" ON "public"."hand_actions" USING "btree" ("street");



CREATE INDEX "idx_hand_bookmarks_user_folder_created" ON "public"."hand_bookmarks" USING "btree" ("user_id", "folder_name", "created_at" DESC);



CREATE INDEX "idx_hand_bookmarks_user_folder_name" ON "public"."hand_bookmarks" USING "btree" ("user_id", "folder_name") WHERE ("folder_name" IS NOT NULL);



CREATE INDEX "idx_hand_edit_history_editor_date" ON "public"."hand_edit_history" USING "btree" ("editor_id", "created_at" DESC) WHERE ("edit_type" = ANY (ARRAY['create'::"text", 'update'::"text"]));



COMMENT ON INDEX "public"."idx_hand_edit_history_editor_date" IS 'Optimize Arbiter activity statistics queries';



CREATE INDEX "idx_hand_edit_history_hand_type" ON "public"."hand_edit_history" USING "btree" ("hand_id", "edit_type", "created_at" DESC);



COMMENT ON INDEX "public"."idx_hand_edit_history_hand_type" IS 'Optimize hand edit history timeline queries';



CREATE INDEX "idx_hand_edit_requests_created_at" ON "public"."hand_edit_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_hand_edit_requests_hand_id" ON "public"."hand_edit_requests" USING "btree" ("hand_id");



CREATE INDEX "idx_hand_edit_requests_pending" ON "public"."hand_edit_requests" USING "btree" ("status", "created_at" DESC) WHERE ("status" = 'pending'::"text");



COMMENT ON INDEX "public"."idx_hand_edit_requests_pending" IS 'Optimize pending requests dashboard queries';



CREATE INDEX "idx_hand_edit_requests_requester_id" ON "public"."hand_edit_requests" USING "btree" ("requester_id");



CREATE INDEX "idx_hand_edit_requests_requester_status" ON "public"."hand_edit_requests" USING "btree" ("requester_id", "status", "created_at" DESC) WHERE ("requester_id" IS NOT NULL);



COMMENT ON INDEX "public"."idx_hand_edit_requests_requester_status" IS 'Optimizes user edit request history queries.
Used in: /my-edit-requests page, user profiles.';



CREATE INDEX "idx_hand_edit_requests_reviewer" ON "public"."hand_edit_requests" USING "btree" ("reviewed_by", "reviewed_at" DESC) WHERE ("status" = ANY (ARRAY['approved'::"text", 'rejected'::"text"]));



COMMENT ON INDEX "public"."idx_hand_edit_requests_reviewer" IS 'Optimize reviewer statistics queries';



CREATE INDEX "idx_hand_edit_requests_status" ON "public"."hand_edit_requests" USING "btree" ("status");



COMMENT ON INDEX "public"."idx_hand_edit_requests_status" IS 'Optimizes edit request queue queries by status.
Used in: admin approval pages, pending request lists.
Expected improvement: 30-40% faster queue queries.';



CREATE INDEX "idx_hand_likes_user_hand" ON "public"."hand_likes" USING "btree" ("user_id", "hand_id");



CREATE INDEX "idx_hand_players_cards" ON "public"."hand_players" USING "gin" ("cards" "public"."gin_trgm_ops") WHERE (("cards" IS NOT NULL) AND ("cards" <> ''::"text"));



CREATE INDEX "idx_hand_players_hand_id" ON "public"."hand_players" USING "btree" ("hand_id");



CREATE INDEX "idx_hand_players_hand_player" ON "public"."hand_players" USING "btree" ("hand_id", "player_id");



COMMENT ON INDEX "public"."idx_hand_players_hand_player" IS 'Optimizes queries fetching all players for specific hands.
Used in: hand detail pages, hand history timelines.';



CREATE INDEX "idx_hand_players_hand_position" ON "public"."hand_players" USING "btree" ("hand_id", "poker_position");



CREATE INDEX "idx_hand_players_is_winner" ON "public"."hand_players" USING "btree" ("hand_id") WHERE ("is_winner" = true);



CREATE INDEX "idx_hand_players_player_hand" ON "public"."hand_players" USING "btree" ("player_id", "hand_id");



COMMENT ON INDEX "public"."idx_hand_players_player_hand" IS 'Composite index for player_id + hand_id. Covers both:
1. Queries filtering by player_id only (leftmost prefix)
2. JOIN operations between players and hands
Replaces: idx_hand_players_player_id (removed as duplicate)';



CREATE INDEX "idx_hand_players_player_position_created" ON "public"."hand_players" USING "btree" ("player_id", "poker_position", "created_at") WHERE ("poker_position" IS NOT NULL);



CREATE INDEX "idx_hand_players_position" ON "public"."hand_players" USING "btree" ("poker_position") WHERE ("poker_position" IS NOT NULL);



CREATE INDEX "idx_hand_players_seat" ON "public"."hand_players" USING "btree" ("hand_id", "seat");



CREATE INDEX "idx_hand_tags_created_by" ON "public"."hand_tags" USING "btree" ("created_by");



CREATE INDEX "idx_hand_tags_hand_id" ON "public"."hand_tags" USING "btree" ("hand_id");



CREATE INDEX "idx_hand_tags_tag_name" ON "public"."hand_tags" USING "btree" ("tag_name");



CREATE INDEX "idx_hands_ante" ON "public"."hands" USING "btree" ("ante") WHERE ("ante" > 0);



CREATE INDEX "idx_hands_blinds" ON "public"."hands" USING "btree" ("big_blind", "small_blind") WHERE ("big_blind" IS NOT NULL);



CREATE INDEX "idx_hands_blinds_pot" ON "public"."hands" USING "btree" ("big_blind", "pot_river" DESC) WHERE (("big_blind" IS NOT NULL) AND ("pot_river" IS NOT NULL));



CREATE INDEX "idx_hands_board_cards_trgm" ON "public"."hands" USING "gin" ("board_cards" "public"."gin_trgm_ops") WHERE ("board_cards" IS NOT NULL);



CREATE INDEX "idx_hands_day_created" ON "public"."hands" USING "btree" ("day_id", "created_at");



COMMENT ON INDEX "public"."idx_hands_day_created" IS 'Composite index for day_id + created_at. Covers both:
1. Queries filtering by day_id only (PostgreSQL can use leftmost prefix)
2. Queries filtering by day_id with ORDER BY created_at
Replaces: idx_hands_day_id (removed as duplicate)';



CREATE INDEX "idx_hands_day_favorite" ON "public"."hands" USING "btree" ("day_id", "favorite") WHERE ("favorite" = true);



CREATE INDEX "idx_hands_description_tsv" ON "public"."hands" USING "gin" ("description_tsv");



COMMENT ON INDEX "public"."idx_hands_description_tsv" IS 'GIN index for full-text search on hand descriptions.
Expected improvement: 50-70% faster text searches.
Used in: /search page, natural search API.';



CREATE INDEX "idx_hands_favorite" ON "public"."hands" USING "btree" ("day_id", "created_at" DESC) WHERE ("favorite" = true);



COMMENT ON INDEX "public"."idx_hands_favorite" IS 'Partial index for favorite hands. Much smaller than full index.
Used in: Favorites page, bookmarked hands';



CREATE INDEX "idx_hands_job_id" ON "public"."hands" USING "btree" ("job_id");



CREATE INDEX "idx_hands_number_day" ON "public"."hands" USING "btree" ("number", "day_id") WHERE (("number" IS NOT NULL) AND ("day_id" IS NOT NULL));



COMMENT ON INDEX "public"."idx_hands_number_day" IS 'Optimizes queries searching for specific hand numbers within a day.
Used in: hand search, duplicate detection.';



CREATE INDEX "idx_hands_pot_created" ON "public"."hands" USING "btree" ("pot_size" DESC, "created_at" DESC) WHERE (("pot_size" IS NOT NULL) AND ("pot_size" > 0));



CREATE INDEX "idx_hands_pot_river" ON "public"."hands" USING "btree" ("pot_river" DESC) WHERE ("pot_river" IS NOT NULL);



CREATE INDEX "idx_hands_pot_size" ON "public"."hands" USING "btree" ("pot_size") WHERE (("pot_size" IS NOT NULL) AND ("pot_size" > 0));



CREATE INDEX "idx_hands_thumbnail_url" ON "public"."hands" USING "btree" ("thumbnail_url") WHERE ("thumbnail_url" IS NOT NULL);



CREATE INDEX "idx_khaydarin_frames_label" ON "public"."khaydarin_frames" USING "btree" ("label");



CREATE INDEX "idx_khaydarin_frames_session_id" ON "public"."khaydarin_frames" USING "btree" ("session_id");



CREATE INDEX "idx_khaydarin_sessions_created_at" ON "public"."khaydarin_sessions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_khaydarin_sessions_roboflow_uploaded" ON "public"."khaydarin_sessions" USING "btree" ("roboflow_uploaded");



CREATE INDEX "idx_likes_comment_id" ON "public"."likes" USING "btree" ("comment_id");



CREATE INDEX "idx_likes_post_id" ON "public"."likes" USING "btree" ("post_id");



CREATE INDEX "idx_likes_user_id" ON "public"."likes" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_recipient" ON "public"."notifications" USING "btree" ("recipient_id", "created_at" DESC);



CREATE INDEX "idx_notifications_recipient_type_created" ON "public"."notifications" USING "btree" ("recipient_id", "type", "created_at" DESC);



CREATE INDEX "idx_notifications_recipient_unread_type" ON "public"."notifications" USING "btree" ("recipient_id", "is_read", "type") WHERE ("is_read" = false);



CREATE INDEX "idx_notifications_sender_id" ON "public"."notifications" USING "btree" ("sender_id", "created_at" DESC) WHERE ("sender_id" IS NOT NULL);



COMMENT ON INDEX "public"."idx_notifications_sender_id" IS 'Optimizes queries for notifications sent by a specific user.
Used in: admin dashboards, user activity tracking.
Expected improvement: 20-30% faster sender queries.';



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("recipient_id", "is_read", "created_at" DESC) WHERE ("is_read" = false);



CREATE INDEX "idx_player_claims_player_id" ON "public"."player_claims" USING "btree" ("player_id");



COMMENT ON INDEX "public"."idx_player_claims_player_id" IS 'Optimizes claims lookup for a specific player.
Used in: player profile pages, claim verification.';



CREATE INDEX "idx_player_claims_status" ON "public"."player_claims" USING "btree" ("status");



CREATE INDEX "idx_player_claims_user_id" ON "public"."player_claims" USING "btree" ("user_id");



CREATE INDEX "idx_player_stats_cache_hands" ON "public"."player_stats_cache" USING "btree" ("total_hands" DESC) WHERE ("total_hands" > 0);



CREATE INDEX "idx_player_stats_cache_style" ON "public"."player_stats_cache" USING "btree" ("play_style") WHERE ("play_style" IS NOT NULL);



CREATE INDEX "idx_player_stats_cache_updated" ON "public"."player_stats_cache" USING "btree" ("last_updated" DESC);



CREATE INDEX "idx_players_aliases" ON "public"."players" USING "gin" ("aliases");



CREATE INDEX "idx_players_country" ON "public"."players" USING "btree" ("country") WHERE ("country" IS NOT NULL);



CREATE INDEX "idx_players_gender" ON "public"."players" USING "btree" ("gender") WHERE ("gender" IS NOT NULL);



CREATE INDEX "idx_players_name" ON "public"."players" USING "btree" ("name");



CREATE INDEX "idx_players_name_lower" ON "public"."players" USING "btree" ("lower"("name"));



CREATE INDEX "idx_players_name_tsv" ON "public"."players" USING "gin" ("name_tsv");



COMMENT ON INDEX "public"."idx_players_name_tsv" IS 'GIN index for full-text search on player names.
Expected improvement: 60-70% faster player searches.
Used in: /players page search, quick player lookup.';



CREATE UNIQUE INDEX "idx_players_normalized_name" ON "public"."players" USING "btree" ("normalized_name");



CREATE INDEX "idx_players_total_winnings" ON "public"."players" USING "btree" ("total_winnings" DESC NULLS LAST);



CREATE INDEX "idx_posts_author_created" ON "public"."posts" USING "btree" ("author_id", "created_at" DESC);



CREATE INDEX "idx_posts_author_id" ON "public"."posts" USING "btree" ("author_id");



CREATE INDEX "idx_posts_category" ON "public"."posts" USING "btree" ("category");



CREATE INDEX "idx_posts_category_created" ON "public"."posts" USING "btree" ("category", "created_at" DESC);



COMMENT ON INDEX "public"."idx_posts_category_created" IS 'Optimizes post listing by category with date sorting.
Used in: /community page category tabs.
Expected improvement: 20-30% faster category filtering.';



CREATE INDEX "idx_posts_created_at" ON "public"."posts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_posts_hand_created" ON "public"."posts" USING "btree" ("hand_id", "created_at" DESC) WHERE ("hand_id" IS NOT NULL);



CREATE INDEX "idx_posts_hand_id" ON "public"."posts" USING "btree" ("hand_id");



CREATE INDEX "idx_posts_is_hidden" ON "public"."posts" USING "btree" ("is_hidden");



CREATE INDEX "idx_posts_likes_count" ON "public"."posts" USING "btree" ("likes_count" DESC);



CREATE INDEX "idx_posts_likes_popular" ON "public"."posts" USING "btree" ("likes_count" DESC, "created_at" DESC) WHERE ("likes_count" > 0);



CREATE INDEX "idx_posts_popular_recent" ON "public"."posts" USING "btree" ("likes_count" DESC, "comments_count" DESC, "created_at" DESC) WHERE (("likes_count" > 5) OR ("comments_count" > 3));



CREATE INDEX "idx_reports_comment_id" ON "public"."reports" USING "btree" ("comment_id");



CREATE INDEX "idx_reports_created_at" ON "public"."reports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_reports_post_id" ON "public"."reports" USING "btree" ("post_id");



CREATE INDEX "idx_reports_reporter_id" ON "public"."reports" USING "btree" ("reporter_id");



CREATE INDEX "idx_reports_status" ON "public"."reports" USING "btree" ("status");



CREATE INDEX "idx_reports_status_created" ON "public"."reports" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_security_events_created_at" ON "public"."security_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_security_events_event_type" ON "public"."security_events" USING "btree" ("event_type");



CREATE INDEX "idx_security_events_ip_address" ON "public"."security_events" USING "btree" ("ip_address");



CREATE INDEX "idx_security_events_severity" ON "public"."security_events" USING "btree" ("severity");



CREATE INDEX "idx_security_events_type_severity_created" ON "public"."security_events" USING "btree" ("event_type", "severity", "created_at" DESC);



CREATE INDEX "idx_security_events_user_id" ON "public"."security_events" USING "btree" ("user_id");



CREATE INDEX "idx_streams_is_organized" ON "public"."streams" USING "btree" ("is_organized") WHERE ("is_organized" = false);



CREATE INDEX "idx_streams_organized" ON "public"."streams" USING "btree" ("is_organized", "created_at" DESC) WHERE ("is_organized" = false);



CREATE INDEX "idx_streams_sub_event_id" ON "public"."streams" USING "btree" ("sub_event_id");



CREATE INDEX "idx_streams_unorganized" ON "public"."streams" USING "btree" ("created_at" DESC) WHERE ("is_organized" = false);



COMMENT ON INDEX "public"."idx_streams_unorganized" IS 'Partial index for unorganized streams. Smaller and faster than full index.
Used in: Unsorted Videos page, HAE analysis queue';



CREATE INDEX "idx_sub_events_date" ON "public"."sub_events" USING "btree" ("date" DESC);



CREATE INDEX "idx_sub_events_date_prize" ON "public"."sub_events" USING "btree" ("date" DESC, "total_prize" DESC NULLS LAST) WHERE ("total_prize" IS NOT NULL);



CREATE INDEX "idx_sub_events_event_number" ON "public"."sub_events" USING "btree" ("event_number") WHERE ("event_number" IS NOT NULL);



CREATE INDEX "idx_sub_events_tournament_date" ON "public"."sub_events" USING "btree" ("tournament_id", "date" DESC);



COMMENT ON INDEX "public"."idx_sub_events_tournament_date" IS 'Composite index for tournament_id + date DESC. Covers both:
1. Queries filtering by tournament_id only (leftmost prefix)
2. Tournament sub-events with date sorting
Replaces: idx_sub_events_tournament_id (removed as duplicate)';



CREATE INDEX "idx_tournaments_category" ON "public"."tournaments" USING "btree" ("category");



CREATE INDEX "idx_tournaments_category_id" ON "public"."tournaments" USING "btree" ("category_id");



CREATE INDEX "idx_tournaments_category_normalized" ON "public"."tournaments" USING "btree" ("public"."normalize_tournament_category"("category"));



CREATE INDEX "idx_tournaments_city" ON "public"."tournaments" USING "btree" ("city");



CREATE INDEX "idx_tournaments_country" ON "public"."tournaments" USING "btree" ("country");



CREATE INDEX "idx_tournaments_date_range" ON "public"."tournaments" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_tournaments_end_date" ON "public"."tournaments" USING "btree" ("end_date" DESC);



COMMENT ON INDEX "public"."idx_tournaments_end_date" IS 'Used in Admin Archive page for sorting tournaments by completion date';



CREATE INDEX "idx_tournaments_game_type" ON "public"."tournaments" USING "btree" ("game_type");



CREATE INDEX "idx_tournaments_game_type_start_date" ON "public"."tournaments" USING "btree" ("game_type", "start_date" DESC);



CREATE INDEX "idx_tournaments_start_date" ON "public"."tournaments" USING "btree" ("start_date" DESC);



CREATE INDEX "idx_users_activity_stats" ON "public"."users" USING "btree" ("last_sign_in_at" DESC, "posts_count" DESC, "comments_count" DESC) WHERE ("last_sign_in_at" IS NOT NULL);



CREATE INDEX "idx_users_contribution_stats" ON "public"."users" USING "btree" ("posts_count" DESC, "comments_count" DESC);



CREATE INDEX "idx_users_last_activity_at" ON "public"."users" USING "btree" ("last_activity_at" DESC);



CREATE INDEX "idx_users_nickname_lower" ON "public"."users" USING "btree" ("lower"("nickname"));



CREATE INDEX "idx_users_role_activity" ON "public"."users" USING "btree" ("role", "last_sign_in_at" DESC) WHERE ("role" = ANY (ARRAY['high_templar'::"text", 'reporter'::"text", 'admin'::"text"]));



CREATE INDEX "idx_users_stats" ON "public"."users" USING "btree" ("posts_count" DESC, "comments_count" DESC);



CREATE INDEX "idx_videos_created_at" ON "public"."videos" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_videos_platform" ON "public"."videos" USING "btree" ("platform");



CREATE INDEX "idx_videos_url" ON "public"."videos" USING "btree" ("url");



CREATE INDEX "idx_videos_youtube_id" ON "public"."videos" USING "btree" ("youtube_id");



CREATE INDEX "posts_author_id_idx" ON "public"."posts" USING "btree" ("author_id");



COMMENT ON INDEX "public"."posts_author_id_idx" IS 'Index for filtering posts by author';



CREATE INDEX "posts_category_idx" ON "public"."posts" USING "btree" ("category");



CREATE INDEX "posts_created_at_idx" ON "public"."posts" USING "btree" ("created_at" DESC);



COMMENT ON INDEX "public"."posts_created_at_idx" IS 'Index for date range filtering and sorting';



CREATE INDEX "posts_search_idx" ON "public"."posts" USING "gin" ("search_vector");



COMMENT ON INDEX "public"."posts_search_idx" IS 'GIN index for full-text search performance';



CREATE INDEX "streams_status_idx" ON "public"."streams" USING "btree" ("status");



CREATE INDEX "sub_events_status_idx" ON "public"."sub_events" USING "btree" ("status");



CREATE INDEX "tournaments_status_idx" ON "public"."tournaments" USING "btree" ("status");



CREATE UNIQUE INDEX "unique_approved_claim_per_player" ON "public"."player_claims" USING "btree" ("player_id") WHERE ("status" = 'approved'::"public"."claim_status");



CREATE UNIQUE INDEX "unique_approved_claim_per_user" ON "public"."player_claims" USING "btree" ("user_id") WHERE ("status" = 'approved'::"public"."claim_status");



CREATE INDEX "users_banned_idx" ON "public"."users" USING "btree" ("is_banned");



CREATE INDEX "users_email_idx" ON "public"."users" USING "btree" ("email");



CREATE INDEX "users_last_sign_in_at_idx" ON "public"."users" USING "btree" ("last_sign_in_at" DESC);



CREATE INDEX "users_nickname_idx" ON "public"."users" USING "btree" ("nickname");



CREATE INDEX "users_role_idx" ON "public"."users" USING "btree" ("role") WHERE ("role" = ANY (ARRAY['arbiter'::"text", 'high_templar'::"text", 'admin'::"text"]));



COMMENT ON INDEX "public"."users_role_idx" IS 'Partial index for privileged roles (arbiter, high_templar, admin)';



CREATE OR REPLACE VIEW "public"."v_fulltext_search_stats" AS
 SELECT 'hands'::"text" AS "table_name",
    "count"(*) AS "total_rows",
    "count"("hands"."description_tsv") AS "indexed_rows",
    "pg_size_pretty"("pg_total_relation_size"('"public"."idx_hands_description_tsv"'::"regclass")) AS "index_size"
   FROM "public"."hands"
UNION ALL
 SELECT 'players'::"text" AS "table_name",
    "count"(*) AS "total_rows",
    "count"("players"."name_tsv") AS "indexed_rows",
    "pg_size_pretty"("pg_total_relation_size"('"public"."idx_players_name_tsv"'::"regclass")) AS "index_size"
   FROM "public"."players";



CREATE OR REPLACE TRIGGER "check_category_circular_reference" BEFORE INSERT OR UPDATE OF "parent_id" ON "public"."tournament_categories" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_circular_category_reference"();



CREATE OR REPLACE TRIGGER "comments_count_trigger" AFTER INSERT OR DELETE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_comments_count"();



CREATE OR REPLACE TRIGGER "decrement_likes" AFTER DELETE ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."decrement_likes_count"();



CREATE OR REPLACE TRIGGER "decrement_post_comments" AFTER DELETE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."decrement_comments_count"();



CREATE OR REPLACE TRIGGER "hand_bookmark_count_trigger" AFTER INSERT OR DELETE ON "public"."hand_bookmarks" FOR EACH ROW EXECUTE FUNCTION "public"."update_hand_bookmark_count"();



CREATE OR REPLACE TRIGGER "hand_like_count_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."hand_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_hand_like_count"();



CREATE OR REPLACE TRIGGER "hands_description_tsv_update" BEFORE INSERT OR UPDATE OF "description", "number" ON "public"."hands" FOR EACH ROW EXECUTE FUNCTION "public"."hands_description_tsv_trigger"();



COMMENT ON TRIGGER "hands_description_tsv_update" ON "public"."hands" IS 'Automatically updates description_tsv on INSERT/UPDATE.
Weights: description (A - highest), number (B - high).';



CREATE OR REPLACE TRIGGER "hands_edit_log_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."hands" FOR EACH ROW EXECUTE FUNCTION "public"."log_hand_edit"();



COMMENT ON TRIGGER "hands_edit_log_trigger" ON "public"."hands" IS 'Audit trigger: Log all hand modifications to hand_edit_history';



CREATE OR REPLACE TRIGGER "increment_likes" AFTER INSERT ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."increment_likes_count"();



CREATE OR REPLACE TRIGGER "increment_post_comments" AFTER INSERT ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."increment_comments_count"();



CREATE OR REPLACE TRIGGER "likes_received_trigger" AFTER INSERT OR DELETE ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_likes_received"();



CREATE OR REPLACE TRIGGER "player_claims_updated_at" BEFORE UPDATE ON "public"."player_claims" FOR EACH ROW EXECUTE FUNCTION "public"."update_player_claims_updated_at"();



CREATE OR REPLACE TRIGGER "players_name_tsv_update" BEFORE INSERT OR UPDATE OF "name" ON "public"."players" FOR EACH ROW EXECUTE FUNCTION "public"."players_name_tsv_trigger"();



COMMENT ON TRIGGER "players_name_tsv_update" ON "public"."players" IS 'Automatically updates name_tsv on INSERT/UPDATE.';



CREATE OR REPLACE TRIGGER "posts_count_trigger" AFTER INSERT OR DELETE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_posts_count"();



CREATE OR REPLACE TRIGGER "posts_search_vector_update" BEFORE INSERT OR UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_posts_search_vector"();



CREATE OR REPLACE TRIGGER "prevent_category_delete_if_in_use" BEFORE DELETE ON "public"."tournament_categories" FOR EACH ROW EXECUTE FUNCTION "public"."check_category_before_delete"();



CREATE OR REPLACE TRIGGER "tournament_categories_updated_at" BEFORE UPDATE ON "public"."tournament_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_tournament_categories_updated_at"();



CREATE OR REPLACE TRIGGER "tr_sync_user_ban_status" BEFORE UPDATE OF "is_banned", "banned_at" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_ban_status"();



COMMENT ON TRIGGER "tr_sync_user_ban_status" ON "public"."users" IS 'Keeps is_banned and banned_at fields synchronized';



CREATE OR REPLACE TRIGGER "trigger_auto_normalize_player_name" BEFORE INSERT OR UPDATE OF "name" ON "public"."players" FOR EACH ROW EXECUTE FUNCTION "public"."auto_normalize_player_name"();



CREATE OR REPLACE TRIGGER "trigger_invalidate_stats_on_hand_actions" AFTER INSERT OR DELETE OR UPDATE ON "public"."hand_actions" FOR EACH ROW EXECUTE FUNCTION "public"."invalidate_player_stats_cache"();



CREATE OR REPLACE TRIGGER "trigger_invalidate_stats_on_hand_players" AFTER INSERT OR UPDATE OF "starting_stack", "ending_stack" ON "public"."hand_players" FOR EACH ROW EXECUTE FUNCTION "public"."invalidate_player_stats_on_hand_players"();



CREATE OR REPLACE TRIGGER "trigger_notify_claim_status" AFTER UPDATE ON "public"."player_claims" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."notify_claim_status"();



CREATE OR REPLACE TRIGGER "trigger_notify_comment_like" AFTER INSERT ON "public"."likes" FOR EACH ROW WHEN (("new"."comment_id" IS NOT NULL)) EXECUTE FUNCTION "public"."notify_comment_like"();



CREATE OR REPLACE TRIGGER "trigger_notify_comment_reply" AFTER INSERT ON "public"."comments" FOR EACH ROW WHEN (("new"."parent_comment_id" IS NOT NULL)) EXECUTE FUNCTION "public"."notify_comment_reply"();



CREATE OR REPLACE TRIGGER "trigger_notify_edit_request_status" AFTER UPDATE ON "public"."hand_edit_requests" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."notify_edit_request_status"();



CREATE OR REPLACE TRIGGER "trigger_notify_post_comment" AFTER INSERT ON "public"."comments" FOR EACH ROW WHEN ((("new"."post_id" IS NOT NULL) AND ("new"."parent_comment_id" IS NULL))) EXECUTE FUNCTION "public"."notify_post_comment"();



CREATE OR REPLACE TRIGGER "trigger_notify_post_like" AFTER INSERT ON "public"."likes" FOR EACH ROW WHEN (("new"."post_id" IS NOT NULL)) EXECUTE FUNCTION "public"."notify_post_like"();



CREATE OR REPLACE TRIGGER "trigger_update_data_deletion_requests_updated_at" BEFORE UPDATE ON "public"."data_deletion_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_data_deletion_requests_updated_at"();



CREATE OR REPLACE TRIGGER "update_analysis_jobs_updated_at" BEFORE UPDATE ON "public"."analysis_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_comments_updated_at" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_event_payouts_updated_at" BEFORE UPDATE ON "public"."event_payouts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_posts_updated_at" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_videos_updated_at" BEFORE UPDATE ON "public"."videos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."admin_logs"
    ADD CONSTRAINT "admin_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analysis_jobs"
    ADD CONSTRAINT "analysis_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analysis_jobs"
    ADD CONSTRAINT "analysis_jobs_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analysis_jobs"
    ADD CONSTRAINT "analysis_jobs_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



COMMENT ON CONSTRAINT "comments_author_id_fkey" ON "public"."comments" IS 'Foreign key to public.users table';



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_hand_id_fkey" FOREIGN KEY ("hand_id") REFERENCES "public"."hands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_deletion_requests"
    ADD CONSTRAINT "data_deletion_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."data_deletion_requests"
    ADD CONSTRAINT "data_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."streams"
    ADD CONSTRAINT "days_sub_event_id_fkey" FOREIGN KEY ("sub_event_id") REFERENCES "public"."sub_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_payouts"
    ADD CONSTRAINT "event_payouts_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_payouts"
    ADD CONSTRAINT "event_payouts_sub_event_id_fkey" FOREIGN KEY ("sub_event_id") REFERENCES "public"."sub_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "fk_tournament_category" FOREIGN KEY ("category_id") REFERENCES "public"."tournament_categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."hand_actions"
    ADD CONSTRAINT "hand_actions_hand_id_fkey" FOREIGN KEY ("hand_id") REFERENCES "public"."hands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hand_actions"
    ADD CONSTRAINT "hand_actions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hand_bookmarks"
    ADD CONSTRAINT "hand_bookmarks_hand_id_fkey" FOREIGN KEY ("hand_id") REFERENCES "public"."hands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hand_bookmarks"
    ADD CONSTRAINT "hand_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hand_edit_history"
    ADD CONSTRAINT "hand_edit_history_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hand_edit_history"
    ADD CONSTRAINT "hand_edit_history_hand_id_fkey" FOREIGN KEY ("hand_id") REFERENCES "public"."hands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hand_edit_requests"
    ADD CONSTRAINT "hand_edit_requests_hand_id_fkey" FOREIGN KEY ("hand_id") REFERENCES "public"."hands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hand_edit_requests"
    ADD CONSTRAINT "hand_edit_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hand_edit_requests"
    ADD CONSTRAINT "hand_edit_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hand_likes"
    ADD CONSTRAINT "hand_likes_hand_id_fkey" FOREIGN KEY ("hand_id") REFERENCES "public"."hands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hand_likes"
    ADD CONSTRAINT "hand_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hand_players"
    ADD CONSTRAINT "hand_players_hand_id_fkey" FOREIGN KEY ("hand_id") REFERENCES "public"."hands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hand_players"
    ADD CONSTRAINT "hand_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hand_tags"
    ADD CONSTRAINT "hand_tags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hand_tags"
    ADD CONSTRAINT "hand_tags_hand_id_fkey" FOREIGN KEY ("hand_id") REFERENCES "public"."hands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hands"
    ADD CONSTRAINT "hands_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."analysis_jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hands"
    ADD CONSTRAINT "hands_stream_id_fkey" FOREIGN KEY ("day_id") REFERENCES "public"."streams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."khaydarin_frames"
    ADD CONSTRAINT "khaydarin_frames_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."khaydarin_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



COMMENT ON CONSTRAINT "likes_user_id_fkey" ON "public"."likes" IS 'Foreign key to public.users table';



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."player_claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_edit_request_id_fkey" FOREIGN KEY ("edit_request_id") REFERENCES "public"."hand_edit_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_hand_id_fkey" FOREIGN KEY ("hand_id") REFERENCES "public"."hands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."player_claims"
    ADD CONSTRAINT "player_claims_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_claims"
    ADD CONSTRAINT "player_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_claims"
    ADD CONSTRAINT "player_claims_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."player_stats_cache"
    ADD CONSTRAINT "player_stats_cache_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



COMMENT ON CONSTRAINT "posts_author_id_fkey" ON "public"."posts" IS 'Foreign key to public.users table';



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_hand_id_fkey" FOREIGN KEY ("hand_id") REFERENCES "public"."hands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."security_events"
    ADD CONSTRAINT "security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."streams"
    ADD CONSTRAINT "streams_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sub_events"
    ADD CONSTRAINT "sub_events_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sub_events"
    ADD CONSTRAINT "sub_events_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_categories"
    ADD CONSTRAINT "tournament_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."tournament_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_banned_by_fkey" FOREIGN KEY ("banned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can delete categories" ON "public"."tournament_categories" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Admin can insert categories" ON "public"."tournament_categories" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin can manage all streams" ON "public"."streams" USING ("public"."is_admin"());



CREATE POLICY "Admin can update categories" ON "public"."tournament_categories" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins can delete players" ON "public"."players" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete sub_events" ON "public"."sub_events" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete tournaments" ON "public"."tournaments" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can insert logs" ON "public"."admin_logs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"]))))));



CREATE POLICY "Admins can insert players" ON "public"."players" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert sub_events" ON "public"."sub_events" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert tournaments" ON "public"."tournaments" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update any user" ON "public"."users" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users" "admin_users"
  WHERE (("admin_users"."id" = "auth"."uid"()) AND ("admin_users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "admin_users"
  WHERE (("admin_users"."id" = "auth"."uid"()) AND ("admin_users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"]))))));



COMMENT ON POLICY "Admins can update any user" ON "public"."users" IS 'Allows admins and high templars to modify any user';



CREATE POLICY "Admins can update deletion requests" ON "public"."data_deletion_requests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"]))))));



CREATE POLICY "Admins can update players" ON "public"."players" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can update reports" ON "public"."reports" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update sub_events" ON "public"."sub_events" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can update tournaments" ON "public"."tournaments" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"])) AND ("users"."banned_at" IS NULL)))));



CREATE POLICY "Admins can view all deletion requests" ON "public"."data_deletion_requests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"]))))));



CREATE POLICY "Admins can view all logs" ON "public"."admin_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"]))))));



CREATE POLICY "Admins can view all reports" ON "public"."reports" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all security events" ON "public"."security_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"])) AND ("users"."banned_at" IS NULL)))));



CREATE POLICY "Anyone can delete unsorted streams" ON "public"."streams" FOR DELETE USING ((("sub_event_id" IS NULL) AND ("is_organized" = false)));



CREATE POLICY "Anyone can read videos" ON "public"."videos" FOR SELECT USING (true);



CREATE POLICY "Anyone can view comments" ON "public"."comments" FOR SELECT USING ((("is_hidden" = false) OR ("auth"."uid"() = "author_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'moderator'::"text"])))))));



COMMENT ON POLICY "Anyone can view comments" ON "public"."comments" IS 'Public can view non-hidden comments, authors and moderators can view all';



CREATE POLICY "Anyone can view days" ON "public"."streams" FOR SELECT USING (true);



COMMENT ON POLICY "Anyone can view days" ON "public"."streams" IS 'Public read access for days - required for video player';



CREATE POLICY "Anyone can view hand tags" ON "public"."hand_tags" FOR SELECT USING (true);



CREATE POLICY "Anyone can view hand_actions" ON "public"."hand_actions" FOR SELECT USING (true);



COMMENT ON POLICY "Anyone can view hand_actions" ON "public"."hand_actions" IS 'Public read access to all hand actions';



CREATE POLICY "Anyone can view likes" ON "public"."likes" FOR SELECT USING (true);



COMMENT ON POLICY "Anyone can view likes" ON "public"."likes" IS 'Likes are public information';



CREATE POLICY "Anyone can view posts" ON "public"."posts" FOR SELECT USING ((("is_hidden" = false) OR ("auth"."uid"() = "author_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'moderator'::"text"])))))));



COMMENT ON POLICY "Anyone can view posts" ON "public"."posts" IS 'Public can view non-hidden posts, authors and moderators can view all';



CREATE POLICY "Arbiters can delete hand_actions" ON "public"."hand_actions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text", 'arbiter'::"text"])) AND ("users"."banned_at" IS NULL)))));



COMMENT ON POLICY "Arbiters can delete hand_actions" ON "public"."hand_actions" IS 'Security: Admins, high_templars, and arbiters can delete hand actions';



CREATE POLICY "Arbiters can delete hand_players" ON "public"."hand_players" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text", 'arbiter'::"text"])) AND ("users"."banned_at" IS NULL)))));



COMMENT ON POLICY "Arbiters can delete hand_players" ON "public"."hand_players" IS 'Security: Admins, high_templars, and arbiters can delete hand_players';



CREATE POLICY "Arbiters can delete hands" ON "public"."hands" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text", 'arbiter'::"text"])) AND ("users"."banned_at" IS NULL)))));



COMMENT ON POLICY "Arbiters can delete hands" ON "public"."hands" IS 'Security: Admins, high_templars, and arbiters can delete hands';



CREATE POLICY "Arbiters can insert hand_actions" ON "public"."hand_actions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text", 'arbiter'::"text"])) AND ("users"."banned_at" IS NULL)))));



COMMENT ON POLICY "Arbiters can insert hand_actions" ON "public"."hand_actions" IS 'Security: Admins, high_templars, and arbiters can create hand actions';



CREATE POLICY "Arbiters can insert hand_players" ON "public"."hand_players" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text", 'arbiter'::"text"])) AND ("users"."banned_at" IS NULL)))));



COMMENT ON POLICY "Arbiters can insert hand_players" ON "public"."hand_players" IS 'Security: Admins, high_templars, and arbiters can create hand_players';



CREATE POLICY "Arbiters can insert hands" ON "public"."hands" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text", 'arbiter'::"text"])) AND ("users"."banned_at" IS NULL)))));



COMMENT ON POLICY "Arbiters can insert hands" ON "public"."hands" IS 'Security: Admins, high_templars, and arbiters can create hands';



CREATE POLICY "Arbiters can update edit requests" ON "public"."hand_edit_requests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text", 'arbiter'::"text"])) AND ("users"."banned_at" IS NULL)))));



COMMENT ON POLICY "Arbiters can update edit requests" ON "public"."hand_edit_requests" IS 'Arbiters, high_templars, and admins can approve/reject requests';



CREATE POLICY "Arbiters can update hand_actions" ON "public"."hand_actions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text", 'arbiter'::"text"])) AND ("users"."banned_at" IS NULL)))));



COMMENT ON POLICY "Arbiters can update hand_actions" ON "public"."hand_actions" IS 'Security: Admins, high_templars, and arbiters can modify hand actions';



CREATE POLICY "Arbiters can update hand_players" ON "public"."hand_players" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text", 'arbiter'::"text"])) AND ("users"."banned_at" IS NULL)))));



COMMENT ON POLICY "Arbiters can update hand_players" ON "public"."hand_players" IS 'Security: Admins, high_templars, and arbiters can modify hand_players';



CREATE POLICY "Arbiters can update hands" ON "public"."hands" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text", 'arbiter'::"text"])) AND ("users"."banned_at" IS NULL)))));



COMMENT ON POLICY "Arbiters can update hands" ON "public"."hands" IS 'Security: Admins, high_templars, and arbiters can modify hands';



CREATE POLICY "Arbiters can view all edit requests" ON "public"."hand_edit_requests" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "requester_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text", 'arbiter'::"text"])))))));



COMMENT ON POLICY "Arbiters can view all edit requests" ON "public"."hand_edit_requests" IS 'Users can view their own requests, arbiters+ can view all';



CREATE POLICY "Arbiters can view edit history" ON "public"."hand_edit_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text", 'arbiter'::"text"]))))));



COMMENT ON POLICY "Arbiters can view edit history" ON "public"."hand_edit_history" IS 'Arbiters and above can view hand edit history';



CREATE POLICY "Authenticated users can add tags" ON "public"."hand_tags" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Authenticated users can create claims" ON "public"."player_claims" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can create comments" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Authenticated users can create jobs" ON "public"."analysis_jobs" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can create likes" ON "public"."likes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can create posts" ON "public"."posts" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Authenticated users can delete days" ON "public"."streams" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete hand_players" ON "public"."hand_players" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete hands" ON "public"."hands" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete players" ON "public"."players" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete sub_events" ON "public"."sub_events" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete tournaments" ON "public"."tournaments" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can insert days" ON "public"."streams" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert hand_players" ON "public"."hand_players" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert hands" ON "public"."hands" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert players" ON "public"."players" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert sub_events" ON "public"."sub_events" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert tournaments" ON "public"."tournaments" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert videos" ON "public"."videos" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can read jobs" ON "public"."analysis_jobs" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can update days" ON "public"."streams" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update hand_players" ON "public"."hand_players" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update hands" ON "public"."hands" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update jobs" ON "public"."analysis_jobs" FOR UPDATE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can update players" ON "public"."players" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update sub_events" ON "public"."sub_events" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update tournaments" ON "public"."tournaments" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update videos" ON "public"."videos" FOR UPDATE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Categories are viewable" ON "public"."tournament_categories" FOR SELECT USING ((("is_active" = true) OR "public"."is_admin"()));



COMMENT ON POLICY "Categories are viewable" ON "public"."tournament_categories" IS 'Unified policy: Everyone sees active categories, admins see all.
Replaces: 2 separate SELECT policies.';



CREATE POLICY "Enable all access for khaydarin_frames" ON "public"."khaydarin_frames" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for khaydarin_sessions" ON "public"."khaydarin_sessions" USING (true) WITH CHECK (true);



CREATE POLICY "Everyone can view approved claims" ON "public"."player_claims" FOR SELECT USING (("status" = 'approved'::"public"."claim_status"));



CREATE POLICY "Hand likes are viewable by everyone" ON "public"."hand_likes" FOR SELECT USING (true);



CREATE POLICY "Public can read hand_actions" ON "public"."hand_actions" FOR SELECT USING (true);



COMMENT ON POLICY "Public can read hand_actions" ON "public"."hand_actions" IS 'Allow anonymous and authenticated users to read all hand_actions.
Required for Hand history playback.';



CREATE POLICY "Public can read hand_players" ON "public"."hand_players" FOR SELECT USING (true);



COMMENT ON POLICY "Public can read hand_players" ON "public"."hand_players" IS 'Allow anonymous and authenticated users to read all hand_players.
Required for Hand analysis.';



CREATE POLICY "Public can read hands" ON "public"."hands" FOR SELECT USING (true);



COMMENT ON POLICY "Public can read hands" ON "public"."hands" IS 'Allow anonymous and authenticated users to read all hands.
Required for Hand viewer.';



CREATE POLICY "Public can read players" ON "public"."players" FOR SELECT USING (true);



COMMENT ON POLICY "Public can read players" ON "public"."players" IS 'Allow anonymous and authenticated users to read all players.
Required for Player profiles.';



CREATE POLICY "Public can read streams" ON "public"."streams" FOR SELECT USING (true);



COMMENT ON POLICY "Public can read streams" ON "public"."streams" IS 'Allow anonymous and authenticated users to read all streams.
Required for Archive day navigation.';



CREATE POLICY "Public can read sub_events" ON "public"."sub_events" FOR SELECT USING (true);



COMMENT ON POLICY "Public can read sub_events" ON "public"."sub_events" IS 'Allow anonymous and authenticated users to read all sub_events.
Required for Archive navigation.';



CREATE POLICY "Public can read tournaments" ON "public"."tournaments" FOR SELECT USING (true);



COMMENT ON POLICY "Public can read tournaments" ON "public"."tournaments" IS 'Allow anonymous and authenticated users to read all tournaments.
Required for Archive page and homepage.';



CREATE POLICY "System can insert edit history" ON "public"."hand_edit_history" FOR INSERT WITH CHECK (false);



COMMENT ON POLICY "System can insert edit history" ON "public"."hand_edit_history" IS 'Manual inserts blocked - use trigger only';



CREATE POLICY "System can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Unsorted streams can be managed" ON "public"."streams" FOR INSERT WITH CHECK ((("sub_event_id" IS NULL) AND ("is_organized" = false)));



CREATE POLICY "Unsorted streams can be updated" ON "public"."streams" FOR UPDATE USING ((("sub_event_id" IS NULL) OR ("is_organized" = false)));



CREATE POLICY "Users are viewable by everyone" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Users can create comments" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_owner"("author_id") AND (NOT "public"."is_banned"())));



CREATE POLICY "Users can create deletion requests" ON "public"."data_deletion_requests" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (NOT (EXISTS ( SELECT 1
   FROM "public"."data_deletion_requests" "data_deletion_requests_1"
  WHERE (("data_deletion_requests_1"."user_id" = "auth"."uid"()) AND ("data_deletion_requests_1"."status" = ANY (ARRAY['pending'::"text", 'approved'::"text"]))))))));



CREATE POLICY "Users can create posts" ON "public"."posts" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_owner"("author_id") AND (NOT "public"."is_banned"())));



COMMENT ON POLICY "Users can create posts" ON "public"."posts" IS 'Users can create posts if they are the author and not banned.';



CREATE POLICY "Users can delete own comments, admins can delete any" ON "public"."comments" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "author_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can delete own likes" ON "public"."likes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own posts, admins can delete any" ON "public"."posts" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "author_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can delete their own bookmarks" ON "public"."hand_bookmarks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own comments" ON "public"."comments" FOR DELETE USING (("public"."is_owner"("author_id") OR "public"."is_admin"()));



CREATE POLICY "Users can delete their own likes" ON "public"."hand_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own pending claims" ON "public"."player_claims" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"public"."claim_status")));



CREATE POLICY "Users can delete their own posts" ON "public"."posts" FOR DELETE USING (("public"."is_owner"("author_id") OR "public"."is_admin"()));



CREATE POLICY "Users can delete their own tags" ON "public"."hand_tags" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert their own bookmarks" ON "public"."hand_bookmarks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own likes" ON "public"."hand_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage likes" ON "public"."likes" TO "authenticated" USING ("public"."is_owner"("user_id")) WITH CHECK (("public"."is_owner"("user_id") AND (NOT "public"."is_banned"())));



COMMENT ON POLICY "Users can manage likes" ON "public"."likes" IS 'Unified policy for likes: view own likes, create/delete own likes.
Replaces: 4 separate policies.';



CREATE POLICY "Users can update own comments" ON "public"."comments" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can update own posts" ON "public"."posts" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can update their own bookmarks" ON "public"."hand_bookmarks" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own comments" ON "public"."comments" FOR UPDATE USING (("public"."is_owner"("author_id") AND (NOT "public"."is_banned"())));



CREATE POLICY "Users can update their own likes" ON "public"."hand_likes" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own pending claims" ON "public"."player_claims" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"public"."claim_status"))) WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"public"."claim_status")));



CREATE POLICY "Users can update their own posts" ON "public"."posts" FOR UPDATE USING (("public"."is_owner"("author_id") AND (NOT "public"."is_banned"())));



CREATE POLICY "Users can update their own profile" ON "public"."users" FOR UPDATE USING ("public"."is_owner"("id")) WITH CHECK ("public"."is_owner"("id"));



CREATE POLICY "Users can view own deletion requests" ON "public"."data_deletion_requests" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own bookmarks" ON "public"."hand_bookmarks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own claims" ON "public"."player_claims" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own edit requests" ON "public"."hand_edit_requests" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "requester_id"));



CREATE POLICY "Users can view their own reports" ON "public"."reports" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users manage bookmarks" ON "public"."hand_bookmarks" USING ("public"."is_owner"("user_id")) WITH CHECK (("public"."is_owner"("user_id") AND (NOT "public"."is_banned"())));



CREATE POLICY "Users manage own claims" ON "public"."player_claims" USING (("public"."is_owner"("user_id") OR "public"."is_admin"())) WITH CHECK (("public"."is_owner"("user_id") AND (NOT "public"."is_banned"())));



COMMENT ON POLICY "Users manage own claims" ON "public"."player_claims" IS 'Users can create/view their own claims. Admins can view/update all.
Replaces: 2 separate policies.';



CREATE POLICY "Users manage own edit requests" ON "public"."hand_edit_requests" USING (("public"."is_owner"("requester_id") OR "public"."is_admin"())) WITH CHECK (("public"."is_owner"("requester_id") AND (NOT "public"."is_banned"())));



COMMENT ON POLICY "Users manage own edit requests" ON "public"."hand_edit_requests" IS 'Users can create/view their own edit requests. Admins can view/update all.
Replaces: 2 separate policies.';



CREATE POLICY "Users manage own notifications" ON "public"."notifications" USING ("public"."is_owner"("recipient_id")) WITH CHECK ("public"."is_owner"("recipient_id"));



COMMENT ON POLICY "Users manage own notifications" ON "public"."notifications" IS 'Unified policy: users can view/update/delete their own notifications.
Replaces: 3 separate policies.';



CREATE POLICY "Users manage own reports" ON "public"."reports" USING (("public"."is_owner"("reporter_id") OR "public"."is_admin"())) WITH CHECK (("public"."is_owner"("reporter_id") AND (NOT "public"."is_banned"())));



COMMENT ON POLICY "Users manage own reports" ON "public"."reports" IS 'Users can create/view their own reports. Admins can view/update all.
Replaces: 2 separate policies.';



ALTER TABLE "public"."admin_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analysis_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_deletion_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hand_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hand_bookmarks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hand_edit_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hand_edit_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hand_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hand_players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hand_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hands" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "high_templars_can_manage_days" ON "public"."streams" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"]))))));



CREATE POLICY "high_templars_can_manage_hands" ON "public"."hands" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"]))))));



CREATE POLICY "high_templars_can_manage_sub_events" ON "public"."sub_events" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"]))))));



CREATE POLICY "high_templars_can_manage_tournaments" ON "public"."tournaments" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"]))))));



ALTER TABLE "public"."khaydarin_frames" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."khaydarin_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_stats_cache" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "player_stats_cache_delete_system" ON "public"."player_stats_cache" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "player_stats_cache_insert_system" ON "public"."player_stats_cache" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "player_stats_cache_select_public" ON "public"."player_stats_cache" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "player_stats_cache_update_system" ON "public"."player_stats_cache" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."streams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sub_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournaments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."analysis_jobs";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."approve_hand_edit_request"("p_request_id" "uuid", "p_admin_comment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_hand_edit_request"("p_request_id" "uuid", "p_admin_comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_hand_edit_request"("p_request_id" "uuid", "p_admin_comment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_normalize_player_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_normalize_player_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_normalize_player_name"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ban_user"("p_user_id" "uuid", "p_reason" "text", "p_banned_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ban_user"("p_user_id" "uuid", "p_reason" "text", "p_banned_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ban_user"("p_user_id" "uuid", "p_reason" "text", "p_banned_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_category_before_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_category_before_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_category_before_delete"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_duplicate_analysis"("p_video_id" "uuid", "p_segments" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_duplicate_analysis"("p_video_id" "uuid", "p_segments" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."check_duplicate_analysis"("p_video_id" "uuid", "p_segments" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_duplicate_analysis"("p_video_id" "uuid", "p_segments" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_security_events"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_security_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_security_events"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_hand_with_details"("p_hand" "jsonb", "p_players" "jsonb", "p_actions" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_hand_with_details"("p_hand" "jsonb", "p_players" "jsonb", "p_actions" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_hand_with_details"("p_hand" "jsonb", "p_players" "jsonb", "p_actions" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_sender_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_link" "text", "p_post_id" "uuid", "p_comment_id" "uuid", "p_hand_id" "uuid", "p_edit_request_id" "uuid", "p_claim_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_sender_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_link" "text", "p_post_id" "uuid", "p_comment_id" "uuid", "p_hand_id" "uuid", "p_edit_request_id" "uuid", "p_claim_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_sender_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_link" "text", "p_post_id" "uuid", "p_comment_id" "uuid", "p_hand_id" "uuid", "p_edit_request_id" "uuid", "p_claim_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_unsorted_stream"("p_name" "text", "p_video_url" "text", "p_video_file" "text", "p_video_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_unsorted_stream"("p_name" "text", "p_video_url" "text", "p_video_file" "text", "p_video_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_unsorted_stream"("p_name" "text", "p_video_url" "text", "p_video_file" "text", "p_video_source" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_comments_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_comments_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_comments_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_hand_cascade"("p_hand_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_hand_cascade"("p_hand_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_hand_cascade"("p_hand_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cache_statistics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_cache_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cache_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_category_usage_count"("category_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_category_usage_count"("category_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_category_usage_count"("category_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_child_categories"("p_parent_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_child_categories"("p_parent_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_child_categories"("p_parent_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_hand_details_batch"("hand_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_hand_details_batch"("hand_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_hand_details_batch"("hand_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_hand_tag_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_hand_tag_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_hand_tag_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_player_claim_info"("player_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_claim_info"("player_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_claim_info"("player_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_player_counts_by_day"("day_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_counts_by_day"("day_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_counts_by_day"("day_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_player_hands_grouped"("player_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_hands_grouped"("player_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_hands_grouped"("player_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_players_with_hand_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_players_with_hand_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_players_with_hand_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_query_performance_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_query_performance_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_query_performance_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_root_categories"("p_game_type" "public"."game_type") TO "anon";
GRANT ALL ON FUNCTION "public"."get_root_categories"("p_game_type" "public"."game_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_root_categories"("p_game_type" "public"."game_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unsorted_streams"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_unsorted_streams"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unsorted_streams"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_tag_history"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_tag_history"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_tag_history"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hands_description_tsv_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."hands_description_tsv_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hands_description_tsv_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_comments_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_comments_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_comments_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."invalidate_player_stats_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."invalidate_player_stats_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."invalidate_player_stats_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."invalidate_player_stats_on_hand_players"() TO "anon";
GRANT ALL ON FUNCTION "public"."invalidate_player_stats_on_hand_players"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."invalidate_player_stats_on_hand_players"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_strict"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_strict"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_strict"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_banned"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_banned"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_banned"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_owner"("owner_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_owner"("owner_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_owner"("owner_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_reporter"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_reporter"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_reporter"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_admin_action"("p_admin_id" "uuid", "p_action" "text", "p_target_type" "text", "p_target_id" "uuid", "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_admin_action"("p_admin_id" "uuid", "p_action" "text", "p_target_type" "text", "p_target_id" "uuid", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_admin_action"("p_admin_id" "uuid", "p_action" "text", "p_target_type" "text", "p_target_id" "uuid", "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_hand_edit"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_hand_edit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_hand_edit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_player_name"("name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_player_name"("name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_player_name"("name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_tournament_category"("input_category" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_tournament_category"("input_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_tournament_category"("input_category" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_claim_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_claim_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_claim_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_comment_like"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_comment_like"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_comment_like"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_comment_reply"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_comment_reply"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_comment_reply"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_edit_request_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_edit_request_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_edit_request_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_post_comment"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_post_comment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_post_comment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_post_like"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_post_like"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_post_like"() TO "service_role";



GRANT ALL ON FUNCTION "public"."organize_stream"("p_stream_id" "uuid", "p_sub_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."organize_stream"("p_stream_id" "uuid", "p_sub_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."organize_stream"("p_stream_id" "uuid", "p_sub_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."players_name_tsv_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."players_name_tsv_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."players_name_tsv_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_circular_category_reference"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_circular_category_reference"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_circular_category_reference"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_all_player_stats_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_all_player_stats_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_all_player_stats_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_hand_edit_request"("p_request_id" "uuid", "p_admin_comment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_hand_edit_request"("p_request_id" "uuid", "p_admin_comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_hand_edit_request"("p_request_id" "uuid", "p_admin_comment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_performance_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_performance_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_performance_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."save_hand_with_players_actions"("p_day_id" "uuid", "p_job_id" "uuid", "p_number" "text", "p_description" "text", "p_timestamp" "text", "p_video_timestamp_start" integer, "p_video_timestamp_end" integer, "p_stakes" "text", "p_board_flop" "text"[], "p_board_turn" "text", "p_board_river" "text", "p_pot_size" bigint, "p_raw_data" "jsonb", "p_players" "jsonb", "p_actions" "jsonb", "p_small_blind" integer, "p_big_blind" integer, "p_ante" integer, "p_pot_preflop" integer, "p_pot_flop" integer, "p_pot_turn" integer, "p_pot_river" integer, "p_thumbnail_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."save_hand_with_players_actions"("p_day_id" "uuid", "p_job_id" "uuid", "p_number" "text", "p_description" "text", "p_timestamp" "text", "p_video_timestamp_start" integer, "p_video_timestamp_end" integer, "p_stakes" "text", "p_board_flop" "text"[], "p_board_turn" "text", "p_board_river" "text", "p_pot_size" bigint, "p_raw_data" "jsonb", "p_players" "jsonb", "p_actions" "jsonb", "p_small_blind" integer, "p_big_blind" integer, "p_ante" integer, "p_pot_preflop" integer, "p_pot_flop" integer, "p_pot_turn" integer, "p_pot_river" integer, "p_thumbnail_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_hand_with_players_actions"("p_day_id" "uuid", "p_job_id" "uuid", "p_number" "text", "p_description" "text", "p_timestamp" "text", "p_video_timestamp_start" integer, "p_video_timestamp_end" integer, "p_stakes" "text", "p_board_flop" "text"[], "p_board_turn" "text", "p_board_river" "text", "p_pot_size" bigint, "p_raw_data" "jsonb", "p_players" "jsonb", "p_actions" "jsonb", "p_small_blind" integer, "p_big_blind" integer, "p_ante" integer, "p_pot_preflop" integer, "p_pot_flop" integer, "p_pot_turn" integer, "p_pot_river" integer, "p_thumbnail_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_hands_by_tags"("tag_names" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."search_hands_by_tags"("tag_names" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_hands_by_tags"("tag_names" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_hands_fulltext"("search_query" "text", "max_results" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_hands_fulltext"("search_query" "text", "max_results" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_hands_fulltext"("search_query" "text", "max_results" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_players_fulltext"("search_query" "text", "max_results" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_players_fulltext"("search_query" "text", "max_results" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_players_fulltext"("search_query" "text", "max_results" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_last_sign_in"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_last_sign_in"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_last_sign_in"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_ban_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_ban_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_ban_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unban_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."unban_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unban_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_data_deletion_requests_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_data_deletion_requests_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_data_deletion_requests_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_hand_bookmark_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_hand_bookmark_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_hand_bookmark_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_hand_like_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_hand_like_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_hand_like_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_hand_with_details"("p_hand_id" "uuid", "p_hand" "jsonb", "p_players_to_update" "jsonb", "p_players_to_delete" "uuid"[], "p_actions_to_update" "jsonb", "p_actions_to_delete" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."update_hand_with_details"("p_hand_id" "uuid", "p_hand" "jsonb", "p_players_to_update" "jsonb", "p_players_to_delete" "uuid"[], "p_actions_to_update" "jsonb", "p_actions_to_delete" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_hand_with_details"("p_hand_id" "uuid", "p_hand" "jsonb", "p_players_to_update" "jsonb", "p_players_to_delete" "uuid"[], "p_actions_to_update" "jsonb", "p_actions_to_delete" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_player_claims_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_player_claims_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_player_claims_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_posts_search_vector"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_posts_search_vector"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_posts_search_vector"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tournament_categories_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tournament_categories_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tournament_categories_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_comments_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_comments_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_comments_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_likes_received"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_likes_received"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_likes_received"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_posts_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_posts_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_posts_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";


















GRANT ALL ON TABLE "public"."admin_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_logs" TO "service_role";



GRANT ALL ON TABLE "public"."analysis_jobs" TO "anon";
GRANT ALL ON TABLE "public"."analysis_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."analysis_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."hand_edit_history" TO "anon";
GRANT ALL ON TABLE "public"."hand_edit_history" TO "authenticated";
GRANT ALL ON TABLE "public"."hand_edit_history" TO "service_role";



GRANT ALL ON TABLE "public"."hand_edit_requests" TO "anon";
GRANT ALL ON TABLE "public"."hand_edit_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."hand_edit_requests" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."arbiter_activity_stats" TO "anon";
GRANT ALL ON TABLE "public"."arbiter_activity_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."arbiter_activity_stats" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."data_deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."data_deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."data_deletion_requests" TO "service_role";



GRANT ALL ON TABLE "public"."event_payouts" TO "anon";
GRANT ALL ON TABLE "public"."event_payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."event_payouts" TO "service_role";



GRANT ALL ON TABLE "public"."hand_actions" TO "anon";
GRANT ALL ON TABLE "public"."hand_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."hand_actions" TO "service_role";



GRANT ALL ON TABLE "public"."hand_bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."hand_bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."hand_bookmarks" TO "service_role";



GRANT ALL ON TABLE "public"."hand_likes" TO "anon";
GRANT ALL ON TABLE "public"."hand_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."hand_likes" TO "service_role";



GRANT ALL ON TABLE "public"."hand_players" TO "anon";
GRANT ALL ON TABLE "public"."hand_players" TO "authenticated";
GRANT ALL ON TABLE "public"."hand_players" TO "service_role";



GRANT ALL ON TABLE "public"."hand_tags" TO "anon";
GRANT ALL ON TABLE "public"."hand_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."hand_tags" TO "service_role";



GRANT ALL ON TABLE "public"."hands" TO "anon";
GRANT ALL ON TABLE "public"."hands" TO "authenticated";
GRANT ALL ON TABLE "public"."hands" TO "service_role";



GRANT ALL ON TABLE "public"."khaydarin_frames" TO "anon";
GRANT ALL ON TABLE "public"."khaydarin_frames" TO "authenticated";
GRANT ALL ON TABLE "public"."khaydarin_frames" TO "service_role";



GRANT ALL ON TABLE "public"."khaydarin_sessions" TO "anon";
GRANT ALL ON TABLE "public"."khaydarin_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."khaydarin_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."player_claims" TO "anon";
GRANT ALL ON TABLE "public"."player_claims" TO "authenticated";
GRANT ALL ON TABLE "public"."player_claims" TO "service_role";



GRANT ALL ON TABLE "public"."player_stats_cache" TO "anon";
GRANT ALL ON TABLE "public"."player_stats_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."player_stats_cache" TO "service_role";



GRANT ALL ON TABLE "public"."players" TO "anon";
GRANT ALL ON TABLE "public"."players" TO "authenticated";
GRANT ALL ON TABLE "public"."players" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."security_events" TO "anon";
GRANT ALL ON TABLE "public"."security_events" TO "authenticated";
GRANT ALL ON TABLE "public"."security_events" TO "service_role";



GRANT ALL ON TABLE "public"."streams" TO "anon";
GRANT ALL ON TABLE "public"."streams" TO "authenticated";
GRANT ALL ON TABLE "public"."streams" TO "service_role";



GRANT ALL ON TABLE "public"."sub_events" TO "anon";
GRANT ALL ON TABLE "public"."sub_events" TO "authenticated";
GRANT ALL ON TABLE "public"."sub_events" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_categories" TO "anon";
GRANT ALL ON TABLE "public"."tournament_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_categories" TO "service_role";



GRANT ALL ON TABLE "public"."tournaments" TO "anon";
GRANT ALL ON TABLE "public"."tournaments" TO "authenticated";
GRANT ALL ON TABLE "public"."tournaments" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_category_stats" TO "anon";
GRANT ALL ON TABLE "public"."tournament_category_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_category_stats" TO "service_role";



GRANT ALL ON TABLE "public"."v_admin_performance_quick_check" TO "anon";
GRANT ALL ON TABLE "public"."v_admin_performance_quick_check" TO "authenticated";
GRANT ALL ON TABLE "public"."v_admin_performance_quick_check" TO "service_role";



GRANT ALL ON TABLE "public"."v_cache_hit_ratio" TO "anon";
GRANT ALL ON TABLE "public"."v_cache_hit_ratio" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cache_hit_ratio" TO "service_role";



GRANT ALL ON TABLE "public"."v_database_size" TO "anon";
GRANT ALL ON TABLE "public"."v_database_size" TO "authenticated";
GRANT ALL ON TABLE "public"."v_database_size" TO "service_role";



GRANT ALL ON TABLE "public"."v_duplicate_indexes" TO "anon";
GRANT ALL ON TABLE "public"."v_duplicate_indexes" TO "authenticated";
GRANT ALL ON TABLE "public"."v_duplicate_indexes" TO "service_role";



GRANT ALL ON TABLE "public"."v_fulltext_search_stats" TO "anon";
GRANT ALL ON TABLE "public"."v_fulltext_search_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."v_fulltext_search_stats" TO "service_role";



GRANT ALL ON TABLE "public"."v_index_sizes" TO "anon";
GRANT ALL ON TABLE "public"."v_index_sizes" TO "authenticated";
GRANT ALL ON TABLE "public"."v_index_sizes" TO "service_role";



GRANT ALL ON TABLE "public"."v_index_statistics" TO "anon";
GRANT ALL ON TABLE "public"."v_index_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."v_index_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."v_index_usage_stats" TO "anon";
GRANT ALL ON TABLE "public"."v_index_usage_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."v_index_usage_stats" TO "service_role";



GRANT ALL ON TABLE "public"."v_monitoring_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."v_monitoring_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."v_monitoring_dashboard" TO "service_role";



GRANT ALL ON TABLE "public"."v_rls_function_test" TO "anon";
GRANT ALL ON TABLE "public"."v_rls_function_test" TO "authenticated";
GRANT ALL ON TABLE "public"."v_rls_function_test" TO "service_role";



GRANT ALL ON TABLE "public"."v_rls_policy_stats" TO "anon";
GRANT ALL ON TABLE "public"."v_rls_policy_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."v_rls_policy_stats" TO "service_role";



GRANT ALL ON TABLE "public"."v_table_bloat" TO "anon";
GRANT ALL ON TABLE "public"."v_table_bloat" TO "authenticated";
GRANT ALL ON TABLE "public"."v_table_bloat" TO "service_role";



GRANT ALL ON TABLE "public"."v_table_sizes" TO "anon";
GRANT ALL ON TABLE "public"."v_table_sizes" TO "authenticated";
GRANT ALL ON TABLE "public"."v_table_sizes" TO "service_role";



GRANT ALL ON TABLE "public"."v_table_statistics" TO "anon";
GRANT ALL ON TABLE "public"."v_table_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."v_table_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."v_unused_indexes" TO "anon";
GRANT ALL ON TABLE "public"."v_unused_indexes" TO "authenticated";
GRANT ALL ON TABLE "public"."v_unused_indexes" TO "service_role";



GRANT ALL ON TABLE "public"."v_user_ban_status" TO "anon";
GRANT ALL ON TABLE "public"."v_user_ban_status" TO "authenticated";
GRANT ALL ON TABLE "public"."v_user_ban_status" TO "service_role";



GRANT ALL ON TABLE "public"."videos" TO "anon";
GRANT ALL ON TABLE "public"."videos" TO "authenticated";
GRANT ALL ON TABLE "public"."videos" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































