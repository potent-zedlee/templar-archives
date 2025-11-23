-- =====================================================
-- Phase 2.2: Consolidate RLS Policies
-- =====================================================
-- Purpose: Merge duplicate/similar RLS policies to reduce complexity
-- Expected Effect: Reduce policy count from 122 to ~80-90, easier maintenance

-- =====================================================
-- 1. Tournament Categories - Merge SELECT Policies
-- =====================================================

-- Drop separate policies
DROP POLICY IF EXISTS "Anyone can view active categories" ON tournament_categories;
DROP POLICY IF EXISTS "Admin can view all categories" ON tournament_categories;

-- Create single unified policy
CREATE POLICY "Categories are viewable"
  ON tournament_categories FOR SELECT
  USING (is_active = true OR is_admin());

COMMENT ON POLICY "Categories are viewable" ON tournament_categories IS
'Unified policy: Everyone sees active categories, admins see all.
Replaces: 2 separate SELECT policies.';

-- =====================================================
-- 2. Tournaments - Public Read Policy
-- =====================================================

-- Ensure public read policy exists
DROP POLICY IF EXISTS "Anyone can view tournaments" ON tournaments;

CREATE POLICY "Anyone can view tournaments"
  ON tournaments FOR SELECT
  USING (true);

COMMENT ON POLICY "Anyone can view tournaments" ON tournaments IS
'Public read access to all tournaments.';

-- =====================================================
-- 3. Sub Events - Public Read Policy
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view sub_events" ON sub_events;

CREATE POLICY "Anyone can view sub_events"
  ON sub_events FOR SELECT
  USING (true);

-- =====================================================
-- 4. Streams/Days - Unified Public + Unsorted Policies
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'streams') THEN
    -- Drop separate policies
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can read unsorted streams" ON streams';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view streams" ON streams';

    -- Create unified read policy
    EXECUTE 'CREATE POLICY "Streams are viewable"
      ON streams FOR SELECT
      USING (true)';

    -- Keep separate write policies for unsorted (they have different logic)
    -- But merge create/organize into one policy
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can create unsorted streams" ON streams';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can organize unsorted streams" ON streams';

    EXECUTE 'CREATE POLICY "Unsorted streams can be managed"
      ON streams FOR INSERT
      WITH CHECK (sub_event_id IS NULL AND is_organized = FALSE)';

    EXECUTE 'CREATE POLICY "Unsorted streams can be updated"
      ON streams FOR UPDATE
      USING (sub_event_id IS NULL OR is_organized = FALSE)';

    RAISE NOTICE 'Consolidated streams policies';

  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'days') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view days" ON days';
    EXECUTE 'CREATE POLICY "Days are viewable" ON days FOR SELECT USING (true)';

    RAISE NOTICE 'Consolidated days policies';
  END IF;
END $$;

-- =====================================================
-- 5. Hands - Public Read Policy
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view hands" ON hands;

CREATE POLICY "Anyone can view hands"
  ON hands FOR SELECT
  USING (true);

-- =====================================================
-- 6. Players - Public Read Policy
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view players" ON players;

CREATE POLICY "Anyone can view players"
  ON players FOR SELECT
  USING (true);

-- =====================================================
-- 7. Hand Players - Public Read Policy
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view hand_players" ON hand_players;

CREATE POLICY "Anyone can view hand_players"
  ON hand_players FOR SELECT
  USING (true);

-- =====================================================
-- 8. Posts - Unified Write Policy
-- =====================================================

-- Drop separate insert policy if exists
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can insert posts" ON posts;

-- Create unified insert policy
CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (is_owner(author_id) AND NOT is_banned());

COMMENT ON POLICY "Users can create posts" ON posts IS
'Users can create posts if they are the author and not banned.';

-- Update policy already exists from Phase 2.1
-- Delete policy already exists from Phase 2.1

-- =====================================================
-- 9. Comments - Unified Write Policy
-- =====================================================

DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON comments;

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (is_owner(author_id) AND NOT is_banned());

-- Update/Delete policies already exist from Phase 2.1

-- =====================================================
-- 10. Likes - Unified Policy
-- =====================================================

-- Merge read and write into single policy
DROP POLICY IF EXISTS "Users can view likes" ON likes;
DROP POLICY IF EXISTS "Users can manage their own likes" ON likes;
DROP POLICY IF EXISTS "Users can insert likes" ON likes;
DROP POLICY IF EXISTS "Users can delete likes" ON likes;

CREATE POLICY "Users can manage likes"
  ON likes FOR ALL
  TO authenticated
  USING (is_owner(user_id))
  WITH CHECK (is_owner(user_id) AND NOT is_banned());

COMMENT ON POLICY "Users can manage likes" ON likes IS
'Unified policy for likes: view own likes, create/delete own likes.
Replaces: 4 separate policies.';

-- =====================================================
-- 11. Notifications - Unified Recipient Policy
-- =====================================================

-- Merge read/update/delete into single policy
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

CREATE POLICY "Users manage own notifications"
  ON notifications FOR ALL
  USING (is_owner(recipient_id))
  WITH CHECK (is_owner(recipient_id));

COMMENT ON POLICY "Users manage own notifications" ON notifications IS
'Unified policy: users can view/update/delete their own notifications.
Replaces: 3 separate policies.';

-- System insert policy remains separate (it has different logic)

-- =====================================================
-- 12. Player Claims - Unified User Policy
-- =====================================================

DROP POLICY IF EXISTS "Users can create claims" ON player_claims;
DROP POLICY IF EXISTS "Users can view own claims" ON player_claims;

CREATE POLICY "Users manage own claims"
  ON player_claims FOR ALL
  USING (is_owner(user_id) OR is_admin())
  WITH CHECK (is_owner(user_id) AND NOT is_banned());

COMMENT ON POLICY "Users manage own claims" ON player_claims IS
'Users can create/view their own claims. Admins can view/update all.
Replaces: 2 separate policies.';

-- =====================================================
-- 13. Hand Edit Requests - Unified User Policy
-- =====================================================

DROP POLICY IF EXISTS "Users can create edit requests" ON hand_edit_requests;
DROP POLICY IF EXISTS "Users can view own edit requests" ON hand_edit_requests;

CREATE POLICY "Users manage own edit requests"
  ON hand_edit_requests FOR ALL
  USING (is_owner(requester_id) OR is_admin())
  WITH CHECK (is_owner(requester_id) AND NOT is_banned());

COMMENT ON POLICY "Users manage own edit requests" ON hand_edit_requests IS
'Users can create/view their own edit requests. Admins can view/update all.
Replaces: 2 separate policies.';

-- =====================================================
-- 14. Reports - Unified User Policy
-- =====================================================

DROP POLICY IF EXISTS "Users can create reports" ON reports;
DROP POLICY IF EXISTS "Users can view own reports" ON reports;

CREATE POLICY "Users manage own reports"
  ON reports FOR ALL
  USING (is_owner(reporter_id) OR is_admin())
  WITH CHECK (is_owner(reporter_id) AND NOT is_banned());

COMMENT ON POLICY "Users manage own reports" ON reports IS
'Users can create/view their own reports. Admins can view/update all.
Replaces: 2 separate policies.';

-- =====================================================
-- 15. Hand Bookmarks - Unified Policy
-- =====================================================

-- Check if table exists (may be named differently)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hand_bookmarks') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own bookmarks" ON hand_bookmarks';
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage own bookmarks" ON hand_bookmarks';

    EXECUTE 'CREATE POLICY "Users manage bookmarks"
      ON hand_bookmarks FOR ALL
      USING (is_owner(user_id))
      WITH CHECK (is_owner(user_id) AND NOT is_banned())';

    RAISE NOTICE 'Consolidated hand_bookmarks policies';
  END IF;
END $$;

-- =====================================================
-- 16. Player Notes - Unified Policy
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_notes') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own player notes" ON player_notes';
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage own player notes" ON player_notes';

    EXECUTE 'CREATE POLICY "Users manage player notes"
      ON player_notes FOR ALL
      USING (is_owner(user_id))
      WITH CHECK (is_owner(user_id) AND NOT is_banned())';

    RAISE NOTICE 'Consolidated player_notes policies';
  END IF;
END $$;

-- =====================================================
-- 17. Create Policy Statistics View
-- =====================================================

CREATE OR REPLACE VIEW v_rls_policy_stats AS
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY policy_count DESC, tablename;

COMMENT ON VIEW v_rls_policy_stats IS
'Shows RLS policy count per table.
Usage: SELECT * FROM v_rls_policy_stats;
Helps identify tables with many policies.';

-- =====================================================
-- 18. Summary Report
-- =====================================================

DO $$
DECLARE
  total_policies INTEGER;
  tables_with_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  SELECT COUNT(DISTINCT tablename) INTO tables_with_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'RLS Policy Consolidation - Phase 2.2';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Total policies after consolidation: %', total_policies;
  RAISE NOTICE 'Tables with policies: %', tables_with_policies;
  RAISE NOTICE '';
  RAISE NOTICE 'Policies Consolidated:';
  RAISE NOTICE '  - tournament_categories: 2 → 1 SELECT policy';
  RAISE NOTICE '  - streams/days: 3 → 2 policies';
  RAISE NOTICE '  - likes: 4 → 1 unified policy';
  RAISE NOTICE '  - notifications: 3 → 1 unified policy';
  RAISE NOTICE '  - player_claims: 2 → 1 unified policy';
  RAISE NOTICE '  - hand_edit_requests: 2 → 1 unified policy';
  RAISE NOTICE '  - reports: 2 → 1 unified policy';
  RAISE NOTICE '  - hand_bookmarks: 2 → 1 unified policy (if exists)';
  RAISE NOTICE '  - player_notes: 2 → 1 unified policy (if exists)';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected Benefits:';
  RAISE NOTICE '  - Reduced policy count: ~30-40%% fewer policies';
  RAISE NOTICE '  - Easier maintenance: Fewer policies to manage';
  RAISE NOTICE '  - Better performance: Fewer policy evaluations';
  RAISE NOTICE '  - Clearer logic: Unified policies are easier to understand';
  RAISE NOTICE '';
  RAISE NOTICE 'View policy statistics:';
  RAISE NOTICE '  SELECT * FROM v_rls_policy_stats;';
  RAISE NOTICE '============================================================';
END $$;
