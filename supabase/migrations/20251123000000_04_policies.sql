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


ALTER TABLE "public"."system_configs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_configs_delete_admin" ON "public"."system_configs" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"])) AND ("users"."banned_at" IS NULL)))));



CREATE POLICY "system_configs_insert_admin" ON "public"."system_configs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"])) AND ("users"."banned_at" IS NULL)))));



CREATE POLICY "system_configs_select_all" ON "public"."system_configs" FOR SELECT USING (true);



CREATE POLICY "system_configs_update_admin" ON "public"."system_configs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"])) AND ("users"."banned_at" IS NULL))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'high_templar'::"text"])) AND ("users"."banned_at" IS NULL)))));



ALTER TABLE "public"."tournament_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournaments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;


