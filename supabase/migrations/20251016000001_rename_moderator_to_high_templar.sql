-- Rename moderator role to high_templar and add permissions
-- This migration updates the role system to use "high_templar" instead of "moderator"
-- and grants high_templars permission to create events and upload videos

-- Update role constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'high_templar', 'admin'));

-- Update existing moderator users to high_templar
UPDATE public.users SET role = 'high_templar' WHERE role = 'moderator';

-- Update comments
COMMENT ON COLUMN public.users.role IS 'User role: user, high_templar, admin';

-- Grant high_templars permission to manage tournaments, sub_events, and days
-- (These policies allow high_templars to INSERT, UPDATE, DELETE events)

-- Tournaments: Allow high_templars to create/edit/delete
DROP POLICY IF EXISTS "high_templars_can_manage_tournaments" ON public.tournaments;
CREATE POLICY "high_templars_can_manage_tournaments"
  ON public.tournaments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
    )
  );

-- Sub Events: Allow high_templars to create/edit/delete
DROP POLICY IF EXISTS "high_templars_can_manage_sub_events" ON public.sub_events;
CREATE POLICY "high_templars_can_manage_sub_events"
  ON public.sub_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
    )
  );

-- Days: Allow high_templars to create/edit/delete
DROP POLICY IF EXISTS "high_templars_can_manage_days" ON public.days;
CREATE POLICY "high_templars_can_manage_days"
  ON public.days
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
    )
  );

-- Hands: Allow high_templars to upload/edit/delete
DROP POLICY IF EXISTS "high_templars_can_manage_hands" ON public.hands;
CREATE POLICY "high_templars_can_manage_hands"
  ON public.hands
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
    )
  );

-- Video Sources: Allow high_templars to manage video sources
DROP POLICY IF EXISTS "high_templars_can_manage_video_sources" ON public.video_sources;
CREATE POLICY "high_templars_can_manage_video_sources"
  ON public.video_sources
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
    )
  );
