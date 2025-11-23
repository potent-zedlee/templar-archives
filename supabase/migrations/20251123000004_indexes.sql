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



CREATE INDEX "idx_analysis_jobs_created_by" ON "public"."analysis_jobs" USING "btree" ("created_by") WHERE ("status" = ANY (ARRAY['pending'::"text", 'processing'::"text"]));



CREATE INDEX "idx_analysis_jobs_created_by_created_at" ON "public"."analysis_jobs" USING "btree" ("created_by", "created_at" DESC);



CREATE INDEX "idx_analysis_jobs_retry_count" ON "public"."analysis_jobs" USING "btree" ("retry_count") WHERE ("status" = ANY (ARRAY['pending'::"text", 'failed'::"text"]));



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



CREATE INDEX "idx_hand_actions_hand_id_street_sequence" ON "public"."hand_actions" USING "btree" ("hand_id", "street", "sequence");



COMMENT ON INDEX "public"."idx_hand_actions_hand_id_street_sequence" IS 'Optimize hand action sequence 
  queries';



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



CREATE INDEX "idx_hand_players_player_id_created_at" ON "public"."hand_players" USING "btree" ("player_id", "created_at" DESC);



COMMENT ON INDEX "public"."idx_hand_players_player_id_created_at" IS 'Optimize player hand history queries';



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



CREATE INDEX "idx_player_stats_cache_player_id_last_updated" ON "public"."player_stats_cache" USING "btree" ("player_id", "last_updated");



COMMENT ON INDEX "public"."idx_player_stats_cache_player_id_last_updated" IS 'Optimize player stats cache 
  lookups';



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



CREATE INDEX "idx_posts_created_at_is_hidden" ON "public"."posts" USING "btree" ("created_at" DESC, "is_hidden") WHERE ("is_hidden" = false);



COMMENT ON INDEX "public"."idx_posts_created_at_is_hidden" IS 'Optimize published post feed queries';



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



CREATE INDEX "idx_system_configs_key" ON "public"."system_configs" USING "btree" ("key");



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
