-- Add last_activity_at tracking to users table
-- This tracks when users last visited/used the site (not just login)

-- Add last_activity_at column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_last_activity_at
ON public.users(last_activity_at DESC);

-- Initialize last_activity_at with last_sign_in_at for existing users
UPDATE public.users
SET last_activity_at = last_sign_in_at
WHERE last_activity_at IS NULL AND last_sign_in_at IS NOT NULL;

-- Initialize with created_at for users who never signed in
UPDATE public.users
SET last_activity_at = created_at
WHERE last_activity_at IS NULL;

-- Add comment
COMMENT ON COLUMN public.users.last_activity_at IS 'Last time the user visited/used the site (updated every 5 minutes during active use)';
