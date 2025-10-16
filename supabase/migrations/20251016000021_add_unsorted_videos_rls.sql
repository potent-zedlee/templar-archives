-- RLS Policies for Unsorted Videos

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read unsorted videos" ON days;
DROP POLICY IF EXISTS "Anyone can create unsorted videos" ON days;
DROP POLICY IF EXISTS "Anyone can organize unsorted videos" ON days;
DROP POLICY IF EXISTS "Anyone can delete unsorted videos" ON days;

-- RLS Policy: Allow anyone to read unsorted videos (where sub_event_id is NULL)
CREATE POLICY "Anyone can read unsorted videos" ON days
  FOR SELECT
  USING (sub_event_id IS NULL AND is_organized = FALSE);

-- RLS Policy: Allow anyone to create unsorted videos
CREATE POLICY "Anyone can create unsorted videos" ON days
  FOR INSERT
  WITH CHECK (sub_event_id IS NULL AND is_organized = FALSE);

-- RLS Policy: Allow anyone to update unsorted videos (for organizing)
CREATE POLICY "Anyone can organize unsorted videos" ON days
  FOR UPDATE
  USING (sub_event_id IS NULL OR is_organized = FALSE);

-- RLS Policy: Allow anyone to delete unsorted videos
CREATE POLICY "Anyone can delete unsorted videos" ON days
  FOR DELETE
  USING (sub_event_id IS NULL AND is_organized = FALSE);
