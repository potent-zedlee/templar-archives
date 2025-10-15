-- ===========================
-- 005: 사용자 프로필 테이블 추가
-- ===========================

-- users 테이블 생성
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nickname TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  poker_experience TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자가 다른 사용자의 프로필을 볼 수 있음
CREATE POLICY "Users are viewable by everyone"
  ON public.users
  FOR SELECT
  USING (true);

-- RLS 정책: 사용자는 자신의 프로필만 수정 가능
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS users_nickname_idx ON public.users(nickname);
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ===========================
-- 첫 로그인 시 자동 레코드 생성 트리거
-- ===========================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  random_suffix TEXT;
  temp_nickname TEXT;
  nickname_exists BOOLEAN;
BEGIN
  -- 랜덤 6자리 숫자 생성
  random_suffix := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  -- 이메일의 @ 앞부분 추출 (없으면 'user' 사용)
  temp_nickname := COALESCE(
    SPLIT_PART(NEW.email, '@', 1),
    'user'
  ) || random_suffix;

  -- 닉네임 중복 체크 (만약 중복이면 다시 랜덤 생성)
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.users WHERE nickname = temp_nickname) INTO nickname_exists;
    EXIT WHEN NOT nickname_exists;

    -- 중복이면 랜덤 숫자 재생성
    random_suffix := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    temp_nickname := COALESCE(
      SPLIT_PART(NEW.email, '@', 1),
      'user'
    ) || random_suffix;
  END LOOP;

  -- users 테이블에 레코드 삽입
  INSERT INTO public.users (id, email, nickname, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    temp_nickname,
    NEW.raw_user_meta_data->>'avatar_url'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users에 새 사용자 생성 시 트리거 실행
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===========================
-- 기존 테이블 수정: author_id를 users 테이블과 연결
-- ===========================

-- posts 테이블 외래키 추가 (이미 있으면 무시)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'posts_author_id_fkey'
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- comments 테이블 외래키 추가 (이미 있으면 무시)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'comments_author_id_fkey'
  ) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;
