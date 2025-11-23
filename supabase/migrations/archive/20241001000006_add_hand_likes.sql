-- ===========================
-- 006: 핸드 좋아요/싫어요 시스템
-- ===========================

-- hand_likes 테이블 생성
CREATE TABLE IF NOT EXISTS public.hand_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hand_id UUID NOT NULL REFERENCES public.hands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hand_id, user_id) -- 한 사용자는 한 핸드에 하나의 투표만
);

-- RLS 활성화
ALTER TABLE public.hand_likes ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자가 좋아요 정보를 볼 수 있음
CREATE POLICY "Hand likes are viewable by everyone"
  ON public.hand_likes
  FOR SELECT
  USING (true);

-- RLS 정책: 로그인한 사용자만 좋아요 추가 가능
CREATE POLICY "Users can insert their own likes"
  ON public.hand_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 좋아요만 삭제 가능
CREATE POLICY "Users can delete their own likes"
  ON public.hand_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 좋아요만 수정 가능
CREATE POLICY "Users can update their own likes"
  ON public.hand_likes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS hand_likes_hand_id_idx ON public.hand_likes(hand_id);
CREATE INDEX IF NOT EXISTS hand_likes_user_id_idx ON public.hand_likes(user_id);
CREATE INDEX IF NOT EXISTS hand_likes_vote_type_idx ON public.hand_likes(vote_type);

-- hands 테이블에 카운트 컬럼 추가
ALTER TABLE public.hands
  ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dislikes_count INTEGER DEFAULT 0;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS hands_likes_count_idx ON public.hands(likes_count);
CREATE INDEX IF NOT EXISTS hands_dislikes_count_idx ON public.hands(dislikes_count);

-- ===========================
-- 트리거: 좋아요/싫어요 추가 시 카운트 자동 업데이트
-- ===========================

CREATE OR REPLACE FUNCTION public.update_hand_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 새 좋아요/싫어요 추가
    IF NEW.vote_type = 'like' THEN
      UPDATE public.hands
      SET likes_count = likes_count + 1
      WHERE id = NEW.hand_id;
    ELSIF NEW.vote_type = 'dislike' THEN
      UPDATE public.hands
      SET dislikes_count = dislikes_count + 1
      WHERE id = NEW.hand_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- 좋아요 ↔ 싫어요 전환
    IF OLD.vote_type = 'like' AND NEW.vote_type = 'dislike' THEN
      UPDATE public.hands
      SET
        likes_count = likes_count - 1,
        dislikes_count = dislikes_count + 1
      WHERE id = NEW.hand_id;
    ELSIF OLD.vote_type = 'dislike' AND NEW.vote_type = 'like' THEN
      UPDATE public.hands
      SET
        likes_count = likes_count + 1,
        dislikes_count = dislikes_count - 1
      WHERE id = NEW.hand_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- 좋아요/싫어요 삭제
    IF OLD.vote_type = 'like' THEN
      UPDATE public.hands
      SET likes_count = GREATEST(likes_count - 1, 0)
      WHERE id = OLD.hand_id;
    ELSIF OLD.vote_type = 'dislike' THEN
      UPDATE public.hands
      SET dislikes_count = GREATEST(dislikes_count - 1, 0)
      WHERE id = OLD.hand_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER hand_like_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.hand_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_hand_like_count();

-- ===========================
-- 기존 hands 데이터의 카운트 초기화
-- ===========================

-- 기존 핸드의 likes_count, dislikes_count를 0으로 초기화
UPDATE public.hands
SET
  likes_count = 0,
  dislikes_count = 0
WHERE likes_count IS NULL OR dislikes_count IS NULL;
