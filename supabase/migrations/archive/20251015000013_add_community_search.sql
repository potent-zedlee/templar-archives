-- Add Full-Text Search (FTS) to posts table for community search enhancement
-- This enables fast and efficient search across post titles and content

-- Add tsvector column for full-text search
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create index for full-text search (GIN index for performance)
CREATE INDEX IF NOT EXISTS posts_search_idx ON posts USING GIN (search_vector);

-- Create function to update search_vector
CREATE OR REPLACE FUNCTION update_posts_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search_vector on insert/update
DROP TRIGGER IF EXISTS posts_search_vector_update ON posts;
CREATE TRIGGER posts_search_vector_update
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_posts_search_vector();

-- Update existing rows to populate search_vector
UPDATE posts SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B');

-- Add index for author_id (for author filtering)
CREATE INDEX IF NOT EXISTS posts_author_id_idx ON posts(author_id);

-- Add index for created_at (for date range filtering)
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);

-- Add index for category (already used, but ensure it exists)
CREATE INDEX IF NOT EXISTS posts_category_idx ON posts(category);

-- Comments
COMMENT ON COLUMN posts.search_vector IS 'Full-text search vector for title and content (title weighted higher)';
COMMENT ON INDEX posts_search_idx IS 'GIN index for full-text search performance';
COMMENT ON INDEX posts_author_id_idx IS 'Index for filtering posts by author';
COMMENT ON INDEX posts_created_at_idx IS 'Index for date range filtering and sorting';
