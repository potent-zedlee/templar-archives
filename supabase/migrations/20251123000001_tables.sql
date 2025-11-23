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
    "retry_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "analysis_jobs_ai_provider_check" CHECK (("ai_provider" = ANY (ARRAY['claude'::"text", 'gemini'::"text"]))),
    CONSTRAINT "analysis_jobs_platform_check" CHECK (("platform" = ANY (ARRAY['triton'::"text", 'pokerstars'::"text", 'wsop'::"text", 'hustler'::"text"]))),
    CONSTRAINT "analysis_jobs_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100))),
    CONSTRAINT "analysis_jobs_retry_count_check" CHECK ((("retry_count" >= 0) AND ("retry_count" <= 10))),
    CONSTRAINT "analysis_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "analysis_jobs_video_or_stream_check" CHECK ((("video_id" IS NOT NULL) OR ("stream_id" IS NOT NULL)))
);


ALTER TABLE "public"."analysis_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."analysis_jobs" IS 'HAE video analysis job tracking and status';



COMMENT ON COLUMN "public"."analysis_jobs"."segments" IS 'JSON array of video segments: [{start: 30, end: 900, type: "gameplay"}]';



COMMENT ON COLUMN "public"."analysis_jobs"."submitted_players" IS 'Player names submitted for matching AI-extracted names';



COMMENT ON COLUMN "public"."analysis_jobs"."created_by" IS 'User who created this analysis job (for rate limiting)';



COMMENT ON COLUMN "public"."analysis_jobs"."result" IS 'Analysis results including segment_results array with status and hands_found per segment';



COMMENT ON COLUMN "public"."analysis_jobs"."retry_count" IS 'Number of retry attempts for failed jobs (max 3 per Worker config)';



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



CREATE TABLE IF NOT EXISTS "public"."system_configs" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."system_configs" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_configs" IS 'Updated EPT and Triton prompts to detailed versions (v2) - includes UI layout details, extraction instructions, output examples, and PokerKit format';



COMMENT ON COLUMN "public"."system_configs"."key" IS 'Unique configuration key (e.g., ai_prompt_ept)';



COMMENT ON COLUMN "public"."system_configs"."value" IS 'Configuration value (JSONB for flexibility)';



COMMENT ON COLUMN "public"."system_configs"."description" IS 'Human-readable description';



COMMENT ON COLUMN "public"."system_configs"."updated_by" IS 'User who last updated this config';



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



ALTER TABLE ONLY "public"."system_configs"
    ADD CONSTRAINT "system_configs_pkey" PRIMARY KEY ("key");



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



