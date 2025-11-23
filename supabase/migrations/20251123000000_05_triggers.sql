


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



CREATE OR REPLACE TRIGGER "system_configs_update_metadata" BEFORE UPDATE ON "public"."system_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_system_configs_metadata"();



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



ALTER TABLE ONLY "public"."system_configs"
    ADD CONSTRAINT "system_configs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tournament_categories"
    ADD CONSTRAINT "tournament_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."tournament_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_banned_by_fkey" FOREIGN KEY ("banned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



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



GRANT ALL ON FUNCTION "public"."update_system_configs_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_system_configs_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_system_configs_metadata"() TO "service_role";



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



GRANT ALL ON TABLE "public"."system_configs" TO "anon";
GRANT ALL ON TABLE "public"."system_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."system_configs" TO "service_role";



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







