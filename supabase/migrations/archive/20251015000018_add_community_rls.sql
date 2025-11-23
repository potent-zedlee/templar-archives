-- Add Row Level Security (RLS) to community tables
-- This ensures users can only modify their own content

-- ========================================
-- POSTS TABLE RLS
-- ========================================

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Anyone can view posts (unless hidden by moderators)
CREATE POLICY "Anyone can view posts"
  ON posts
  FOR SELECT
  USING (
    is_hidden = false OR
    auth.uid() = author_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'moderator')
    )
  );

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
  ON posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

-- Users can delete their own posts, admins can delete any
CREATE POLICY "Users can delete own posts, admins can delete any"
  ON posts
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = author_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ========================================
-- COMMENTS TABLE RLS
-- ========================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments (unless hidden)
CREATE POLICY "Anyone can view comments"
  ON comments
  FOR SELECT
  USING (
    is_hidden = false OR
    auth.uid() = author_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'moderator')
    )
  );

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

-- Users can delete their own comments, admins can delete any
CREATE POLICY "Users can delete own comments, admins can delete any"
  ON comments
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = author_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ========================================
-- LIKES TABLE RLS
-- ========================================

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Anyone can view likes
CREATE POLICY "Anyone can view likes"
  ON likes
  FOR SELECT
  USING (true);

-- Authenticated users can create likes
CREATE POLICY "Authenticated users can create likes"
  ON likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes only
CREATE POLICY "Users can delete own likes"
  ON likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON POLICY "Anyone can view posts" ON posts IS 'Public can view non-hidden posts, authors and moderators can view all';
COMMENT ON POLICY "Anyone can view comments" ON comments IS 'Public can view non-hidden comments, authors and moderators can view all';
COMMENT ON POLICY "Anyone can view likes" ON likes IS 'Likes are public information';
