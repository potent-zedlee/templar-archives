-- Add additional profile fields to users table
-- For enhanced user profiles with social links and stats

-- Add social links and additional profile info
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS twitter_handle TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS instagram_handle TEXT;

-- Add profile visibility settings (for future use)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'friends'));

-- Add stats cache columns (for performance - updated by triggers)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS likes_received INTEGER DEFAULT 0;

-- Create function to update user stats
CREATE OR REPLACE FUNCTION update_user_posts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users
    SET posts_count = posts_count + 1
    WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users
    SET posts_count = posts_count - 1
    WHERE id = OLD.author_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users
    SET comments_count = comments_count + 1
    WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users
    SET comments_count = comments_count - 1
    WHERE id = OLD.author_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_likes_received()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  comment_author_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Check if it's a post like
    IF NEW.post_id IS NOT NULL THEN
      SELECT author_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
      UPDATE public.users
      SET likes_received = likes_received + 1
      WHERE id = post_author_id;
    -- Check if it's a comment like
    ELSIF NEW.comment_id IS NOT NULL THEN
      SELECT author_id INTO comment_author_id FROM public.comments WHERE id = NEW.comment_id;
      UPDATE public.users
      SET likes_received = likes_received + 1
      WHERE id = comment_author_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Check if it's a post like
    IF OLD.post_id IS NOT NULL THEN
      SELECT author_id INTO post_author_id FROM public.posts WHERE id = OLD.post_id;
      UPDATE public.users
      SET likes_received = likes_received - 1
      WHERE id = post_author_id;
    -- Check if it's a comment like
    ELSIF OLD.comment_id IS NOT NULL THEN
      SELECT author_id INTO comment_author_id FROM public.comments WHERE id = OLD.comment_id;
      UPDATE public.users
      SET likes_received = likes_received - 1
      WHERE id = comment_author_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating stats
DROP TRIGGER IF EXISTS posts_count_trigger ON public.posts;
CREATE TRIGGER posts_count_trigger
  AFTER INSERT OR DELETE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_posts_count();

DROP TRIGGER IF EXISTS comments_count_trigger ON public.comments;
CREATE TRIGGER comments_count_trigger
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION update_user_comments_count();

DROP TRIGGER IF EXISTS likes_received_trigger ON public.likes;
CREATE TRIGGER likes_received_trigger
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_likes_received();

-- Initialize stats for existing users
UPDATE public.users u
SET
  posts_count = COALESCE((SELECT COUNT(*) FROM public.posts WHERE author_id = u.id), 0),
  comments_count = COALESCE((SELECT COUNT(*) FROM public.comments WHERE author_id = u.id), 0),
  likes_received = COALESCE(
    (SELECT COUNT(*) FROM public.likes l
     INNER JOIN public.posts p ON l.post_id = p.id
     WHERE p.author_id = u.id), 0
  ) + COALESCE(
    (SELECT COUNT(*) FROM public.likes l
     INNER JOIN public.comments c ON l.comment_id = c.id
     WHERE c.author_id = u.id), 0
  );

-- Comments
COMMENT ON COLUMN public.users.location IS 'User location (city, country)';
COMMENT ON COLUMN public.users.website IS 'User personal website or blog URL';
COMMENT ON COLUMN public.users.twitter_handle IS 'Twitter/X handle (without @)';
COMMENT ON COLUMN public.users.instagram_handle IS 'Instagram handle (without @)';
COMMENT ON COLUMN public.users.profile_visibility IS 'Profile visibility setting';
COMMENT ON COLUMN public.users.posts_count IS 'Cached count of posts by user';
COMMENT ON COLUMN public.users.comments_count IS 'Cached count of comments by user';
COMMENT ON COLUMN public.users.likes_received IS 'Cached count of likes received by user';
