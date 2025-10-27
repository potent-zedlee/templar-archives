-- =====================================================
-- Phase 3.2: Add Check Constraints
-- =====================================================
-- Purpose: Enforce data integrity rules at database level
-- Expected Effect: Prevent invalid data insertion, improve data quality

-- =====================================================
-- 1. Tournaments Table Constraints
-- =====================================================

-- Ensure start_date is before or equal to end_date
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS check_tournament_dates;
ALTER TABLE tournaments
  ADD CONSTRAINT check_tournament_dates
  CHECK (start_date <= end_date);

COMMENT ON CONSTRAINT check_tournament_dates ON tournaments IS
'Ensures tournament start date is not after end date.
Prevents: Invalid date ranges.';

-- Ensure name is not empty
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS check_tournament_name_not_empty;
ALTER TABLE tournaments
  ADD CONSTRAINT check_tournament_name_not_empty
  CHECK (LENGTH(TRIM(name)) > 0);

COMMENT ON CONSTRAINT check_tournament_name_not_empty ON tournaments IS
'Ensures tournament name is not empty or whitespace-only.';

-- =====================================================
-- 2. Sub Events Table Constraints
-- =====================================================

-- Ensure sub event name is not empty
ALTER TABLE sub_events DROP CONSTRAINT IF EXISTS check_subevent_name_not_empty;
ALTER TABLE sub_events
  ADD CONSTRAINT check_subevent_name_not_empty
  CHECK (LENGTH(TRIM(name)) > 0);

COMMENT ON CONSTRAINT check_subevent_name_not_empty ON sub_events IS
'Ensures sub-event name is not empty or whitespace-only.';

-- =====================================================
-- 3. Streams/Days Table Constraints
-- =====================================================

DO $$
BEGIN
  -- Check if streams table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'streams') THEN
    -- Ensure stream name is not empty
    EXECUTE 'ALTER TABLE streams DROP CONSTRAINT IF EXISTS check_stream_name_not_empty';
    EXECUTE 'ALTER TABLE streams
      ADD CONSTRAINT check_stream_name_not_empty
      CHECK (LENGTH(TRIM(name)) > 0)';

    -- Ensure at least one video source exists
    EXECUTE 'ALTER TABLE streams DROP CONSTRAINT IF EXISTS check_stream_has_video';
    EXECUTE 'ALTER TABLE streams
      ADD CONSTRAINT check_stream_has_video
      CHECK (
        video_url IS NOT NULL OR
        video_file IS NOT NULL OR
        video_nas_path IS NOT NULL
      )';

    RAISE NOTICE 'Added constraints to streams table';

  -- Fallback to days table
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'days') THEN
    EXECUTE 'ALTER TABLE days DROP CONSTRAINT IF EXISTS check_day_name_not_empty';
    EXECUTE 'ALTER TABLE days
      ADD CONSTRAINT check_day_name_not_empty
      CHECK (LENGTH(TRIM(name)) > 0)';

    EXECUTE 'ALTER TABLE days DROP CONSTRAINT IF EXISTS check_day_has_video';
    EXECUTE 'ALTER TABLE days
      ADD CONSTRAINT check_day_has_video
      CHECK (
        video_url IS NOT NULL OR
        video_file IS NOT NULL OR
        video_nas_path IS NOT NULL
      )';

    RAISE NOTICE 'Added constraints to days table';
  END IF;
END $$;

-- =====================================================
-- 4. Hands Table Constraints
-- =====================================================

-- Ensure hand number is not empty
ALTER TABLE hands DROP CONSTRAINT IF EXISTS check_hand_number_not_empty;
ALTER TABLE hands
  ADD CONSTRAINT check_hand_number_not_empty
  CHECK (LENGTH(TRIM(number)) > 0);

COMMENT ON CONSTRAINT check_hand_number_not_empty ON hands IS
'Ensures hand number is not empty or whitespace-only.';

-- Ensure pot_size is non-negative (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hands' AND column_name = 'pot_size'
  ) THEN
    EXECUTE 'ALTER TABLE hands DROP CONSTRAINT IF EXISTS check_hand_pot_size_positive';
    EXECUTE 'ALTER TABLE hands
      ADD CONSTRAINT check_hand_pot_size_positive
      CHECK (pot_size >= 0)';

    RAISE NOTICE 'Added pot_size constraint to hands table';
  END IF;
END $$;

-- =====================================================
-- 5. Event Payouts Table Constraints
-- =====================================================

-- Ensure prize_amount is positive
ALTER TABLE event_payouts DROP CONSTRAINT IF EXISTS check_payout_prize_positive;
ALTER TABLE event_payouts
  ADD CONSTRAINT check_payout_prize_positive
  CHECK (prize_amount > 0);

COMMENT ON CONSTRAINT check_payout_prize_positive ON event_payouts IS
'Ensures prize amount is positive.
Prevents: Zero or negative prize entries.';

-- Ensure rank is positive
ALTER TABLE event_payouts DROP CONSTRAINT IF EXISTS check_payout_position_positive;
ALTER TABLE event_payouts
  ADD CONSTRAINT check_payout_position_positive
  CHECK (rank > 0);

COMMENT ON CONSTRAINT check_payout_position_positive ON event_payouts IS
'Ensures rank is positive (1st, 2nd, etc.).
Prevents: Zero or negative rank values.';

-- =====================================================
-- 6. Hand Actions Table Constraints
-- =====================================================

-- Ensure sequence is non-negative
ALTER TABLE hand_actions DROP CONSTRAINT IF EXISTS check_hand_action_sequence_positive;
ALTER TABLE hand_actions
  ADD CONSTRAINT check_hand_action_sequence_positive
  CHECK (sequence >= 0);

COMMENT ON CONSTRAINT check_hand_action_sequence_positive ON hand_actions IS
'Ensures action sequence starts from 0.
Prevents: Negative sequence values.';

-- Ensure amount is non-negative when present
ALTER TABLE hand_actions DROP CONSTRAINT IF EXISTS check_hand_action_amount_positive;
ALTER TABLE hand_actions
  ADD CONSTRAINT check_hand_action_amount_positive
  CHECK (amount IS NULL OR amount >= 0);

COMMENT ON CONSTRAINT check_hand_action_amount_positive ON hand_actions IS
'Ensures action amount is non-negative when specified.
Allows: NULL (for check/fold actions).';

-- Ensure valid street values
ALTER TABLE hand_actions DROP CONSTRAINT IF EXISTS check_hand_action_street_valid;
ALTER TABLE hand_actions
  ADD CONSTRAINT check_hand_action_street_valid
  CHECK (street IN ('preflop', 'flop', 'turn', 'river'));

COMMENT ON CONSTRAINT check_hand_action_street_valid ON hand_actions IS
'Ensures street is one of: preflop, flop, turn, river.
Prevents: Invalid street names.';

-- Ensure valid action types
ALTER TABLE hand_actions DROP CONSTRAINT IF EXISTS check_hand_action_type_valid;
ALTER TABLE hand_actions
  ADD CONSTRAINT check_hand_action_type_valid
  CHECK (action_type IN ('fold', 'check', 'call', 'bet', 'raise', 'all-in'));

COMMENT ON CONSTRAINT check_hand_action_type_valid ON hand_actions IS
'Ensures action_type is one of the valid poker actions.
Prevents: Invalid action types.';

-- =====================================================
-- 7. Players Table Constraints
-- =====================================================

-- Ensure player name is not empty
ALTER TABLE players DROP CONSTRAINT IF EXISTS check_player_name_not_empty;
ALTER TABLE players
  ADD CONSTRAINT check_player_name_not_empty
  CHECK (LENGTH(TRIM(name)) > 0);

COMMENT ON CONSTRAINT check_player_name_not_empty ON players IS
'Ensures player name is not empty or whitespace-only.';

-- Ensure total_winnings is non-negative
ALTER TABLE players DROP CONSTRAINT IF EXISTS check_player_winnings_positive;
ALTER TABLE players
  ADD CONSTRAINT check_player_winnings_positive
  CHECK (total_winnings >= 0);

COMMENT ON CONSTRAINT check_player_winnings_positive ON players IS
'Ensures total_winnings is non-negative.
Prevents: Negative winnings values.';

-- =====================================================
-- 8. Users Table Constraints
-- =====================================================

-- Ensure email is not empty
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_email_not_empty;
ALTER TABLE users
  ADD CONSTRAINT check_user_email_not_empty
  CHECK (LENGTH(TRIM(email)) > 0 AND email LIKE '%@%');

COMMENT ON CONSTRAINT check_user_email_not_empty ON users IS
'Ensures email is not empty and contains @.
Basic email format validation.';

-- Ensure nickname is not empty
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_nickname_not_empty;
ALTER TABLE users
  ADD CONSTRAINT check_user_nickname_not_empty
  CHECK (LENGTH(TRIM(nickname)) > 0);

COMMENT ON CONSTRAINT check_user_nickname_not_empty ON users IS
'Ensures nickname is not empty or whitespace-only.';

-- Ensure role is valid
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_role_valid;
ALTER TABLE users
  ADD CONSTRAINT check_user_role_valid
  CHECK (role IN ('user', 'high_templar', 'reporter', 'admin'));

COMMENT ON CONSTRAINT check_user_role_valid ON users IS
'Ensures role is one of: user, high_templar, reporter, admin.
Prevents: Invalid role values.';

-- =====================================================
-- 9. Posts Table Constraints
-- =====================================================

-- Ensure title is not empty
ALTER TABLE posts DROP CONSTRAINT IF EXISTS check_post_title_not_empty;
ALTER TABLE posts
  ADD CONSTRAINT check_post_title_not_empty
  CHECK (LENGTH(TRIM(title)) > 0);

COMMENT ON CONSTRAINT check_post_title_not_empty ON posts IS
'Ensures post title is not empty or whitespace-only.';

-- Ensure content is not empty
ALTER TABLE posts DROP CONSTRAINT IF EXISTS check_post_content_not_empty;
ALTER TABLE posts
  ADD CONSTRAINT check_post_content_not_empty
  CHECK (LENGTH(TRIM(content)) > 0);

COMMENT ON CONSTRAINT check_post_content_not_empty ON posts IS
'Ensures post content is not empty or whitespace-only.';

-- Ensure category is valid
ALTER TABLE posts DROP CONSTRAINT IF EXISTS check_post_category_valid;
ALTER TABLE posts
  ADD CONSTRAINT check_post_category_valid
  CHECK (category IN ('analysis', 'strategy', 'hand_review', 'general'));

COMMENT ON CONSTRAINT check_post_category_valid ON posts IS
'Ensures category is one of the valid post categories.';

-- =====================================================
-- 10. Comments Table Constraints
-- =====================================================

-- Ensure content is not empty
ALTER TABLE comments DROP CONSTRAINT IF EXISTS check_comment_content_not_empty;
ALTER TABLE comments
  ADD CONSTRAINT check_comment_content_not_empty
  CHECK (LENGTH(TRIM(content)) > 0);

COMMENT ON CONSTRAINT check_comment_content_not_empty ON comments IS
'Ensures comment content is not empty or whitespace-only.';

-- =====================================================
-- 11. Tournament Categories Table Constraints
-- =====================================================

-- Ensure name is not empty
ALTER TABLE tournament_categories DROP CONSTRAINT IF EXISTS check_category_name_not_empty;
ALTER TABLE tournament_categories
  ADD CONSTRAINT check_category_name_not_empty
  CHECK (LENGTH(TRIM(name)) > 0);

-- Ensure display_name is not empty
ALTER TABLE tournament_categories DROP CONSTRAINT IF EXISTS check_category_display_name_not_empty;
ALTER TABLE tournament_categories
  ADD CONSTRAINT check_category_display_name_not_empty
  CHECK (LENGTH(TRIM(display_name)) > 0);

-- Ensure game_type is valid (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_categories' AND column_name = 'game_type'
  ) THEN
    EXECUTE 'ALTER TABLE tournament_categories DROP CONSTRAINT IF EXISTS check_category_game_type_valid';
    EXECUTE 'ALTER TABLE tournament_categories
      ADD CONSTRAINT check_category_game_type_valid
      CHECK (game_type IN (''tournament'', ''cash_game'', ''both''))';

    RAISE NOTICE 'Added game_type constraint to tournament_categories';
  END IF;
END $$;

-- =====================================================
-- 12. Summary Report
-- =====================================================

DO $$
DECLARE
  total_constraints INTEGER;
  new_constraints INTEGER := 25;  -- Approximate count
BEGIN
  SELECT COUNT(*) INTO total_constraints
  FROM information_schema.table_constraints
  WHERE constraint_schema = 'public'
    AND constraint_type = 'CHECK';

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Check Constraints Added - Phase 3.2';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'New CHECK constraints: ~%', new_constraints;
  RAISE NOTICE 'Total CHECK constraints: %', total_constraints;
  RAISE NOTICE '';
  RAISE NOTICE 'Constraints Added By Table:';
  RAISE NOTICE '  tournaments: 2 constraints (dates, name)';
  RAISE NOTICE '  sub_events: 1 constraint (name)';
  RAISE NOTICE '  streams/days: 2 constraints (name, video source)';
  RAISE NOTICE '  hands: 2 constraints (number, pot_size)';
  RAISE NOTICE '  event_payouts: 2 constraints (prize, position)';
  RAISE NOTICE '  hand_actions: 4 constraints (sequence, amount, street, type)';
  RAISE NOTICE '  players: 2 constraints (name, winnings)';
  RAISE NOTICE '  users: 3 constraints (email, nickname, role)';
  RAISE NOTICE '  posts: 3 constraints (title, content, category)';
  RAISE NOTICE '  comments: 1 constraint (content)';
  RAISE NOTICE '  tournament_categories: 3 constraints (name, display, game_type)';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected Benefits:';
  RAISE NOTICE '  - Data quality: Prevents invalid data at DB level';
  RAISE NOTICE '  - Application logic: Reduces validation code in app';
  RAISE NOTICE '  - Debugging: Easier to identify data issues';
  RAISE NOTICE '  - Documentation: Constraints self-document business rules';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Existing invalid data (if any) was not modified.';
  RAISE NOTICE 'Run validation queries to check for violations.';
  RAISE NOTICE '============================================================';
END $$;
