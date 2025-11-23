-- ===========================
-- 012: 핸드 북마크 시스템
-- ===========================

-- hand_bookmarks 테이블 생성
CREATE TABLE IF NOT EXISTS public.hand_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hand_id UUID NOT NULL REFERENCES public.hands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  folder_name TEXT, -- 북마크 폴더 (선택 사항)
  notes TEXT, -- 개인 메모 (선택 사항)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hand_id, user_id) -- 한 사용자는 한 핸드를 한 번만 북마크
);

-- RLS 활성화
ALTER TABLE public.hand_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 북마크만 볼 수 있음
CREATE POLICY "Users can view their own bookmarks"
  ON public.hand_bookmarks
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 북마크만 추가 가능
CREATE POLICY "Users can insert their own bookmarks"
  ON public.hand_bookmarks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 북마크만 삭제 가능
CREATE POLICY "Users can delete their own bookmarks"
  ON public.hand_bookmarks
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 북마크만 수정 가능
CREATE POLICY "Users can update their own bookmarks"
  ON public.hand_bookmarks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS hand_bookmarks_hand_id_idx ON public.hand_bookmarks(hand_id);
CREATE INDEX IF NOT EXISTS hand_bookmarks_user_id_idx ON public.hand_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS hand_bookmarks_folder_name_idx ON public.hand_bookmarks(folder_name);
CREATE INDEX IF NOT EXISTS hand_bookmarks_created_at_idx ON public.hand_bookmarks(created_at DESC);

-- hands 테이블에 북마크 카운트 컬럼 추가
ALTER TABLE public.hands
  ADD COLUMN IF NOT EXISTS bookmarks_count INTEGER DEFAULT 0;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS hands_bookmarks_count_idx ON public.hands(bookmarks_count);

-- ===========================
-- 트리거: 북마크 추가/삭제 시 카운트 자동 업데이트
-- ===========================

CREATE OR REPLACE FUNCTION public.update_hand_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 북마크 추가
    UPDATE public.hands
    SET bookmarks_count = bookmarks_count + 1
    WHERE id = NEW.hand_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- 북마크 삭제
    UPDATE public.hands
    SET bookmarks_count = GREATEST(bookmarks_count - 1, 0)
    WHERE id = OLD.hand_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER hand_bookmark_count_trigger
  AFTER INSERT OR DELETE ON public.hand_bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_hand_bookmark_count();

-- ===========================
-- 기존 hands 데이터의 북마크 카운트 초기화
-- ===========================

UPDATE public.hands
SET bookmarks_count = 0
WHERE bookmarks_count IS NULL;
