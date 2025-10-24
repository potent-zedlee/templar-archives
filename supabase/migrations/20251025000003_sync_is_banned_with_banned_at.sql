-- Database Consistency: Sync is_banned with banned_at
-- Created: 2025-10-25
-- Purpose: Ensure is_banned and banned_at fields stay synchronized

-- ============================================================
-- Problem Statement
-- ============================================================
-- users table has two fields for ban status:
--   1. is_banned BOOLEAN
--   2. banned_at TIMESTAMPTZ
--
-- This creates potential data inconsistency.
-- Solution: Create triggers to keep them synchronized.
-- Future: Deprecate is_banned in favor of (banned_at IS NOT NULL)

-- ============================================================
-- 1. Data Consistency Check & Fix
-- ============================================================

-- Fix any existing inconsistencies
-- Case 1: banned_at exists but is_banned is false
UPDATE users
SET is_banned = TRUE
WHERE banned_at IS NOT NULL AND is_banned = FALSE;

-- Case 2: is_banned is true but banned_at is null
UPDATE users
SET banned_at = NOW()
WHERE is_banned = TRUE AND banned_at IS NULL;

-- ============================================================
-- 2. Create Synchronization Trigger Function
-- ============================================================

CREATE OR REPLACE FUNCTION sync_user_ban_status()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. Create Trigger
-- ============================================================

DROP TRIGGER IF EXISTS tr_sync_user_ban_status ON users;

CREATE TRIGGER tr_sync_user_ban_status
  BEFORE UPDATE OF is_banned, banned_at ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_ban_status();

COMMENT ON TRIGGER tr_sync_user_ban_status ON users IS 'Keeps is_banned and banned_at fields synchronized';

-- ============================================================
-- 4. Create Helper View (Recommended Usage)
-- ============================================================

-- Create a view that exposes ban status using banned_at
-- This is the recommended way to check ban status going forward
CREATE OR REPLACE VIEW v_user_ban_status AS
SELECT
  id,
  email,
  nickname,
  (banned_at IS NOT NULL) AS is_banned_computed,
  banned_at,
  ban_reason,
  banned_by,
  CASE
    WHEN banned_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (NOW() - banned_at)) / 86400.0
    ELSE NULL
  END AS days_since_ban
FROM users;

COMMENT ON VIEW v_user_ban_status IS 'Helper view for ban status. Use is_banned_computed instead of is_banned column.';

GRANT SELECT ON v_user_ban_status TO authenticated;

-- ============================================================
-- 5. Add Check Constraint (Ensure Data Integrity)
-- ============================================================

-- Add constraint to ensure is_banned and banned_at are consistent
-- Note: This will be checked on INSERT and UPDATE
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS chk_ban_status_consistency;

ALTER TABLE users
  ADD CONSTRAINT chk_ban_status_consistency
  CHECK (
    (is_banned = TRUE AND banned_at IS NOT NULL) OR
    (is_banned = FALSE AND banned_at IS NULL)
  );

COMMENT ON CONSTRAINT chk_ban_status_consistency ON users IS 'Ensures is_banned and banned_at are always consistent';

-- ============================================================
-- 6. Create Function to Ban User (Atomic Operation)
-- ============================================================

CREATE OR REPLACE FUNCTION ban_user(
  p_user_id UUID,
  p_reason TEXT,
  p_banned_by UUID
)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET
    banned_at = NOW(),
    ban_reason = p_reason,
    banned_by = p_banned_by
    -- is_banned will be set by trigger
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION ban_user IS 'Atomically ban a user. Use this instead of direct UPDATE.';

-- ============================================================
-- 7. Create Function to Unban User (Atomic Operation)
-- ============================================================

CREATE OR REPLACE FUNCTION unban_user(
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET
    banned_at = NULL,
    ban_reason = NULL,
    banned_by = NULL
    -- is_banned will be cleared by trigger
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unban_user IS 'Atomically unban a user. Use this instead of direct UPDATE.';

-- ============================================================
-- Migration Complete
-- ============================================================

DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count FROM users WHERE is_banned != (banned_at IS NOT NULL);

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'User Ban Status Synchronization Migration Completed';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes Applied:';
  RAISE NOTICE '  1. Fixed % inconsistent records', fixed_count;
  RAISE NOTICE '  2. Created sync_user_ban_status() trigger function';
  RAISE NOTICE '  3. Created tr_sync_user_ban_status trigger';
  RAISE NOTICE '  4. Added chk_ban_status_consistency constraint';
  RAISE NOTICE '  5. Created v_user_ban_status view (recommended usage)';
  RAISE NOTICE '  6. Created ban_user() and unban_user() helper functions';
  RAISE NOTICE '';
  RAISE NOTICE 'Recommended Code Migration:';
  RAISE NOTICE '  - Use banned_at IS NOT NULL instead of is_banned';
  RAISE NOTICE '  - Use ban_user() function instead of direct UPDATE';
  RAISE NOTICE '  - Use unban_user() function instead of direct UPDATE';
  RAISE NOTICE '';
  RAISE NOTICE 'Query Examples:';
  RAISE NOTICE '  SELECT * FROM v_user_ban_status WHERE is_banned_computed = TRUE;';
  RAISE NOTICE '  SELECT ban_user(user_id, ''spam'', admin_id);';
  RAISE NOTICE '  SELECT unban_user(user_id);';
  RAISE NOTICE '============================================================';
END $$;
