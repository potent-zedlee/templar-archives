-- Fix admin permissions and update role names
-- This migration adds RLS policies for admins to manage users
-- and updates 'moderator' role to 'high_templar'

-- 1. Update role constraint to use 'high_templar' instead of 'moderator'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'high_templar', 'admin'));

-- 2. Update existing 'moderator' roles to 'high_templar'
UPDATE public.users SET role = 'high_templar' WHERE role = 'moderator';

-- 3. Update admin helper function
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id
    AND role IN ('admin', 'high_templar')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add RLS policy for admins to update other users
CREATE POLICY "Admins can update any user"
  ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('admin', 'high_templar')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('admin', 'high_templar')
    )
  );

-- 5. Update admin logs policies to use 'high_templar'
DROP POLICY IF EXISTS "Admins can view all logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Admins can insert logs" ON public.admin_logs;

CREATE POLICY "Admins can view all logs"
  ON public.admin_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
    )
  );

CREATE POLICY "Admins can insert logs"
  ON public.admin_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
    )
  );

-- Comments
COMMENT ON CONSTRAINT users_role_check ON public.users IS 'User role must be user, high_templar, or admin';
COMMENT ON POLICY "Admins can update any user" ON public.users IS 'Allows admins and high templars to modify any user';
