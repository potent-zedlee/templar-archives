-- Player Claims Table
-- 사용자가 플레이어 프로필을 클레임하고 인증하는 기능

-- Create enum for claim status
CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for verification method
CREATE TYPE verification_method AS ENUM ('social_media', 'email', 'admin', 'other');

-- Create player_claims table
CREATE TABLE IF NOT EXISTS public.player_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status claim_status NOT NULL DEFAULT 'pending',
  verification_method verification_method NOT NULL,
  verification_data JSONB, -- 증빙 자료 (소셜 미디어 링크, 이메일 등)
  admin_notes TEXT, -- 관리자 메모
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.users(id), -- 승인한 관리자
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_player_claims_user_id ON public.player_claims(user_id);
CREATE INDEX idx_player_claims_player_id ON public.player_claims(player_id);
CREATE INDEX idx_player_claims_status ON public.player_claims(status);

-- Unique constraint: 한 플레이어당 하나의 승인된 클레임만
CREATE UNIQUE INDEX unique_approved_claim_per_player
  ON public.player_claims(player_id)
  WHERE status = 'approved';

-- Unique constraint: 한 유저당 하나의 승인된 클레임만
CREATE UNIQUE INDEX unique_approved_claim_per_user
  ON public.player_claims(user_id)
  WHERE status = 'approved';

-- RLS (Row Level Security) 정책
ALTER TABLE public.player_claims ENABLE ROW LEVEL SECURITY;

-- 모든 사용자는 자신의 클레임을 조회할 수 있음
CREATE POLICY "Users can view their own claims"
  ON public.player_claims
  FOR SELECT
  USING (auth.uid() = user_id);

-- 로그인한 사용자는 클레임을 생성할 수 있음
CREATE POLICY "Authenticated users can create claims"
  ON public.player_claims
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 pending 상태인 자신의 클레임을 수정할 수 있음
CREATE POLICY "Users can update their own pending claims"
  ON public.player_claims
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 사용자는 pending 상태인 자신의 클레임을 삭제할 수 있음
CREATE POLICY "Users can delete their own pending claims"
  ON public.player_claims
  FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- 승인된 클레임은 모든 사람이 조회할 수 있음 (플레이어 상세 페이지에서 표시)
CREATE POLICY "Everyone can view approved claims"
  ON public.player_claims
  FOR SELECT
  USING (status = 'approved');

-- Add helper function to get claimed player info
CREATE OR REPLACE FUNCTION get_player_claim_info(player_uuid UUID)
RETURNS TABLE (
  claimed BOOLEAN,
  claimed_by_user_id UUID,
  claimed_by_nickname TEXT,
  claim_status claim_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE AS claimed,
    pc.user_id AS claimed_by_user_id,
    u.nickname AS claimed_by_nickname,
    pc.status AS claim_status
  FROM public.player_claims pc
  JOIN public.users u ON u.id = pc.user_id
  WHERE pc.player_id = player_uuid
    AND pc.status = 'approved'
  LIMIT 1;

  -- If no approved claim found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::claim_status;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_player_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER player_claims_updated_at
  BEFORE UPDATE ON public.player_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_player_claims_updated_at();

-- Add comments
COMMENT ON TABLE public.player_claims IS '플레이어 프로필 클레임 요청 및 승인 관리';
COMMENT ON COLUMN public.player_claims.verification_data IS '증빙 자료 JSON: {social_media_url, email, etc}';
COMMENT ON COLUMN public.player_claims.admin_notes IS '관리자용 메모';
