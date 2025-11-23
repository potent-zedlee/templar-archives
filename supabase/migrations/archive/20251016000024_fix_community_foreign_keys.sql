-- Fix foreign key relationships for posts and comments
-- The original migration used auth.users but should use public.users

-- ===========================
-- 1. Drop existing incorrect foreign keys
-- ===========================

-- Drop posts.author_id foreign key if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'posts_author_id_fkey'
    AND table_name = 'posts'
  ) THEN
    ALTER TABLE public.posts DROP CONSTRAINT posts_author_id_fkey;
  END IF;
END $$;

-- Drop comments.author_id foreign key if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'comments_author_id_fkey'
    AND table_name = 'comments'
  ) THEN
    ALTER TABLE public.comments DROP CONSTRAINT comments_author_id_fkey;
  END IF;
END $$;

-- Drop likes.user_id foreign key if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'likes_user_id_fkey'
    AND table_name = 'likes'
  ) THEN
    ALTER TABLE public.likes DROP CONSTRAINT likes_user_id_fkey;
  END IF;
END $$;

-- ===========================
-- 2. Add correct foreign keys to public.users
-- ===========================

-- Add posts.author_id foreign key to public.users
ALTER TABLE public.posts
  ADD CONSTRAINT posts_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Add comments.author_id foreign key to public.users
ALTER TABLE public.comments
  ADD CONSTRAINT comments_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Add likes.user_id foreign key to public.users
ALTER TABLE public.likes
  ADD CONSTRAINT likes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ===========================
-- 3. Verify relationships
-- ===========================

COMMENT ON CONSTRAINT posts_author_id_fkey ON public.posts IS 'Foreign key to public.users table';
COMMENT ON CONSTRAINT comments_author_id_fkey ON public.comments IS 'Foreign key to public.users table';
COMMENT ON CONSTRAINT likes_user_id_fkey ON public.likes IS 'Foreign key to public.users table';
