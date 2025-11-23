-- ===========================
-- Fix: Add 'arbiter' to check_user_role_valid constraint
-- ===========================
-- Problem: 20251116000001_add_arbiter_role.sql updated users_role_check,
--          but missed check_user_role_valid constraint (from 20251027000006)
-- Solution: Update check_user_role_valid to include 'arbiter', 'templar'

-- Drop existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_role_valid;

-- Add updated constraint with all roles
-- Role hierarchy: user < templar < arbiter < high_templar < reporter < admin
ALTER TABLE users
  ADD CONSTRAINT check_user_role_valid
  CHECK (role IN ('user', 'templar', 'arbiter', 'high_templar', 'reporter', 'admin'));

COMMENT ON CONSTRAINT check_user_role_valid ON users IS
'Ensures role is one of: user, templar, arbiter, high_templar, reporter, admin.
- user: Basic user (community participation)
- templar: Community moderator (posts/comments management)
- arbiter: Hand curator (manual hand input)
- high_templar: Archive manager (tournaments/streams + KAN analysis)
- reporter: Content creator (hand data entry)
- admin: Full system access
Prevents: Invalid role values.';

-- Also update users_role_check for consistency (20251116000001 already did this)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'templar', 'arbiter', 'high_templar', 'reporter', 'admin'));

COMMENT ON CONSTRAINT users_role_check ON users IS
'User role validation: user, templar (community moderator), arbiter (hand curator), high_templar (archive manager), reporter (content creator), admin (full access)';

-- Verification query (commented out - for manual testing)
-- SELECT conname, pg_get_constraintdef(oid) AS definition
-- FROM pg_constraint
-- WHERE conrelid = 'public.users'::regclass
--   AND contype = 'c'
--   AND conname LIKE '%role%';
