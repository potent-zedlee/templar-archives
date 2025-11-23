-- Content Moderation System
-- Reports table for user reports on posts and comments

-- Reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_name TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'misinformation', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT report_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  ),
  UNIQUE(reporter_id, post_id),
  UNIQUE(reporter_id, comment_id)
);

-- Add hidden flags to posts and comments
ALTER TABLE posts ADD COLUMN is_hidden BOOLEAN DEFAULT false;
ALTER TABLE comments ADD COLUMN is_hidden BOOLEAN DEFAULT false;

-- Indexes for performance
CREATE INDEX idx_reports_post_id ON reports(post_id);
CREATE INDEX idx_reports_comment_id ON reports(comment_id);
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

CREATE INDEX idx_posts_is_hidden ON posts(is_hidden);
CREATE INDEX idx_comments_is_hidden ON comments(is_hidden);

-- RLS Policies for reports

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update reports (approve/reject)
CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Update posts queries to exclude hidden posts by default
-- Note: Application layer will handle filtering

-- Comments for documentation
COMMENT ON TABLE reports IS 'User reports on posts and comments';
COMMENT ON COLUMN reports.reason IS 'Report reason: spam, harassment, inappropriate, misinformation, other';
COMMENT ON COLUMN reports.status IS 'Report status: pending, approved (hidden), rejected';
COMMENT ON COLUMN posts.is_hidden IS 'Whether post is hidden by moderators';
COMMENT ON COLUMN comments.is_hidden IS 'Whether comment is hidden by moderators';
