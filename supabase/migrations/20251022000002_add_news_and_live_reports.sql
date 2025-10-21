-- Add News & Live Reports System
-- Migration: 20251022000002_add_news_and_live_reports

-- 1. Add 'reporter' role to users.role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'reporter';

-- 2. Create news table
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL CHECK (category IN ('Tournament', 'Player News', 'Industry', 'General', 'Other')),
  tags TEXT[] DEFAULT '{}',
  external_link TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published')),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  CONSTRAINT news_published_at_check CHECK (
    (status = 'published' AND published_at IS NOT NULL) OR
    (status != 'published' AND published_at IS NULL)
  )
);

-- 3. Create live_reports table
CREATE TABLE IF NOT EXISTS live_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL CHECK (category IN ('Tournament Update', 'Chip Counts', 'Breaking News', 'Results', 'Other')),
  tags TEXT[] DEFAULT '{}',
  external_link TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published')),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  CONSTRAINT live_reports_published_at_check CHECK (
    (status = 'published' AND published_at IS NOT NULL) OR
    (status != 'published' AND published_at IS NULL)
  )
);

-- 4. Add indexes for performance
CREATE INDEX idx_news_status ON news(status);
CREATE INDEX idx_news_author_id ON news(author_id);
CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_news_published_at ON news(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_news_tags ON news USING GIN(tags);

CREATE INDEX idx_live_reports_status ON live_reports(status);
CREATE INDEX idx_live_reports_author_id ON live_reports(author_id);
CREATE INDEX idx_live_reports_category ON live_reports(category);
CREATE INDEX idx_live_reports_published_at ON live_reports(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_live_reports_tags ON live_reports USING GIN(tags);

-- 5. Add RLS policies for news

-- Enable RLS
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Public can read published news
CREATE POLICY "Public can read published news"
  ON news
  FOR SELECT
  USING (status = 'published');

-- Reporter can view their own news
CREATE POLICY "Reporter can view their own news"
  ON news
  FOR SELECT
  USING (auth.uid() = author_id);

-- Reporter can insert their own news
CREATE POLICY "Reporter can create news"
  ON news
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('reporter', 'admin')
    )
  );

-- Reporter can update their own news (only if not published)
CREATE POLICY "Reporter can update their own news"
  ON news
  FOR UPDATE
  USING (
    auth.uid() = author_id AND
    status != 'published'
  )
  WITH CHECK (
    auth.uid() = author_id AND
    status != 'published'
  );

-- Admin can do everything
CREATE POLICY "Admin can do everything on news"
  ON news
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- 6. Add RLS policies for live_reports

-- Enable RLS
ALTER TABLE live_reports ENABLE ROW LEVEL SECURITY;

-- Public can read published live reports
CREATE POLICY "Public can read published live reports"
  ON live_reports
  FOR SELECT
  USING (status = 'published');

-- Reporter can view their own live reports
CREATE POLICY "Reporter can view their own live reports"
  ON live_reports
  FOR SELECT
  USING (auth.uid() = author_id);

-- Reporter can insert their own live reports
CREATE POLICY "Reporter can create live reports"
  ON live_reports
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('reporter', 'admin')
    )
  );

-- Reporter can update their own live reports (only if not published)
CREATE POLICY "Reporter can update their own live reports"
  ON live_reports
  FOR UPDATE
  USING (
    auth.uid() = author_id AND
    status != 'published'
  )
  WITH CHECK (
    auth.uid() = author_id AND
    status != 'published'
  );

-- Admin can do everything
CREATE POLICY "Admin can do everything on live reports"
  ON live_reports
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- 7. Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for news
CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON news
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for live_reports
CREATE TRIGGER update_live_reports_updated_at
  BEFORE UPDATE ON live_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Add comments
COMMENT ON TABLE news IS 'News articles written by reporters and approved by admins';
COMMENT ON TABLE live_reports IS 'Live tournament reporting and updates';
COMMENT ON COLUMN news.status IS 'draft: Not submitted, pending: Awaiting approval, published: Approved and public';
COMMENT ON COLUMN live_reports.status IS 'draft: Not submitted, pending: Awaiting approval, published: Approved and public';
