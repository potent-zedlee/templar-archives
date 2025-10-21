-- ===========================
-- 032: 최근 로그인 날짜 추적 기능 추가
-- ===========================

-- public.users 테이블에 last_sign_in_at 필드 추가
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

-- auth.users의 last_sign_in_at을 public.users로 동기화하는 함수
CREATE OR REPLACE FUNCTION public.sync_last_sign_in()
RETURNS TRIGGER AS $$
BEGIN
  -- auth.users의 last_sign_in_at이 업데이트되면 public.users에도 반영
  UPDATE public.users
  SET last_sign_in_at = NEW.last_sign_in_at
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users 업데이트 시 트리거 실행
DROP TRIGGER IF EXISTS on_auth_user_sign_in ON auth.users;
CREATE TRIGGER on_auth_user_sign_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.sync_last_sign_in();

-- 기존 사용자들의 last_sign_in_at을 auth.users에서 가져와 초기화
UPDATE public.users u
SET last_sign_in_at = a.last_sign_in_at
FROM auth.users a
WHERE u.id = a.id
  AND a.last_sign_in_at IS NOT NULL;

-- 인덱스 생성 (정렬/필터링 성능 향상)
CREATE INDEX IF NOT EXISTS users_last_sign_in_at_idx ON public.users(last_sign_in_at DESC);

-- 코멘트 추가
COMMENT ON COLUMN public.users.last_sign_in_at IS 'auth.users의 last_sign_in_at과 동기화되는 최근 로그인 시간';
COMMENT ON FUNCTION public.sync_last_sign_in() IS 'auth.users 로그인 시 public.users에 last_sign_in_at 동기화';
