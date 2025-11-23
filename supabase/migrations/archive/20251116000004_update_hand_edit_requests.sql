-- ===========================
-- Arbiter System: Update Hand Edit Requests
-- ===========================
-- Purpose: Allow Arbiters to review and approve/reject hand edit requests
-- Extends: 20251015000017_add_hand_edit_requests.sql

-- ===========================
-- 001: hand_edit_requests 정책 업데이트
-- ===========================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can view all edit requests" ON hand_edit_requests;
DROP POLICY IF EXISTS "Admins can update edit requests" ON hand_edit_requests;

-- 새 정책: Arbiter도 검토 가능
CREATE POLICY "Arbiters can view all edit requests"
  ON hand_edit_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = requester_id  -- 본인 요청은 항상 볼 수 있음
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
    )
  );

CREATE POLICY "Arbiters can update edit requests"
  ON hand_edit_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

COMMENT ON POLICY "Arbiters can view all edit requests" ON hand_edit_requests
  IS 'Users can view their own requests, arbiters+ can view all';

COMMENT ON POLICY "Arbiters can update edit requests" ON hand_edit_requests
  IS 'Arbiters, high_templars, and admins can approve/reject requests';

-- ===========================
-- 002: 인덱스 최적화
-- ===========================

-- Arbiter 대시보드 쿼리 최적화 (pending 요청만)
CREATE INDEX IF NOT EXISTS idx_hand_edit_requests_pending
  ON hand_edit_requests(status, created_at DESC)
  WHERE status = 'pending';

-- Arbiter별 검토 통계 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_hand_edit_requests_reviewer
  ON hand_edit_requests(reviewed_by, reviewed_at DESC)
  WHERE status IN ('approved', 'rejected');

COMMENT ON INDEX idx_hand_edit_requests_pending IS 'Optimize pending requests dashboard queries';
COMMENT ON INDEX idx_hand_edit_requests_reviewer IS 'Optimize reviewer statistics queries';

-- ===========================
-- 003: 헬퍼 함수 - 수정 요청 승인
-- ===========================

CREATE OR REPLACE FUNCTION approve_hand_edit_request(
  p_request_id UUID,
  p_admin_comment TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_request hand_edit_requests;
  v_result JSONB;
BEGIN
  -- 1. 요청 조회
  SELECT * INTO v_request
  FROM hand_edit_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Edit request not found: %', p_request_id;
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request already processed: %', v_request.status;
  END IF;

  -- 2. 요청 승인
  UPDATE hand_edit_requests
  SET
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    admin_comment = p_admin_comment
  WHERE id = p_request_id;

  -- 3. 실제 핸드 데이터 업데이트 (edit_type에 따라 분기)
  -- 여기서는 simplified version - 실제로는 edit_type별로 다르게 처리
  CASE v_request.edit_type
    WHEN 'basic_info' THEN
      UPDATE hands
      SET
        description = COALESCE(v_request.proposed_data->>'description', description),
        small_blind = COALESCE((v_request.proposed_data->>'small_blind')::BIGINT, small_blind),
        big_blind = COALESCE((v_request.proposed_data->>'big_blind')::BIGINT, big_blind),
        updated_at = NOW()
      WHERE id = v_request.hand_id;

    WHEN 'board' THEN
      UPDATE hands
      SET
        board_flop = COALESCE(v_request.proposed_data->>'board_flop', board_flop),
        board_turn = COALESCE(v_request.proposed_data->>'board_turn', board_turn),
        board_river = COALESCE(v_request.proposed_data->>'board_river', board_river),
        updated_at = NOW()
      WHERE id = v_request.hand_id;

    ELSE
      -- players, actions는 복잡하므로 별도 처리 필요
      NULL;
  END CASE;

  v_result := jsonb_build_object(
    'request_id', p_request_id,
    'status', 'approved',
    'hand_id', v_request.hand_id,
    'success', true
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error approving edit request: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION approve_hand_edit_request(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION approve_hand_edit_request(UUID, TEXT)
  IS 'Approve hand edit request and apply changes (Arbiter system)';

-- ===========================
-- 004: 헬퍼 함수 - 수정 요청 거부
-- ===========================

CREATE OR REPLACE FUNCTION reject_hand_edit_request(
  p_request_id UUID,
  p_admin_comment TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 1. 요청 상태 확인
  IF NOT EXISTS (
    SELECT 1 FROM hand_edit_requests
    WHERE id = p_request_id
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- 2. 요청 거부
  UPDATE hand_edit_requests
  SET
    status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    admin_comment = p_admin_comment
  WHERE id = p_request_id;

  v_result := jsonb_build_object(
    'request_id', p_request_id,
    'status', 'rejected',
    'success', true
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error rejecting edit request: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reject_hand_edit_request(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION reject_hand_edit_request(UUID, TEXT)
  IS 'Reject hand edit request with reason (Arbiter system)';

-- ===========================
-- 005: 통계 뷰 - Arbiter 활동
-- ===========================

CREATE OR REPLACE VIEW arbiter_activity_stats AS
SELECT
  u.id AS arbiter_id,
  u.nickname,
  u.email,
  u.created_at AS arbiter_since,
  -- 핸드 생성 통계
  COUNT(DISTINCT heh.hand_id) FILTER (WHERE heh.edit_type = 'create') AS hands_created,
  COUNT(DISTINCT heh.hand_id) FILTER (WHERE heh.edit_type = 'update') AS hands_updated,
  COUNT(DISTINCT heh.hand_id) FILTER (WHERE heh.edit_type = 'delete') AS hands_deleted,
  -- 수정 요청 검토 통계
  COUNT(DISTINCT her.id) FILTER (WHERE her.status = 'approved') AS requests_approved,
  COUNT(DISTINCT her.id) FILTER (WHERE her.status = 'rejected') AS requests_rejected,
  -- 최근 활동
  MAX(heh.created_at) AS last_hand_edit,
  MAX(her.reviewed_at) AS last_request_review
FROM users u
LEFT JOIN hand_edit_history heh ON u.id = heh.editor_id
  AND heh.created_at > NOW() - INTERVAL '30 days'
LEFT JOIN hand_edit_requests her ON u.id = her.reviewed_by
  AND her.reviewed_at > NOW() - INTERVAL '30 days'
WHERE u.role = 'arbiter'
  AND u.banned_at IS NULL
GROUP BY u.id, u.nickname, u.email, u.created_at
ORDER BY hands_created DESC;

COMMENT ON VIEW arbiter_activity_stats IS 'Arbiter activity statistics for the last 30 days';

-- ===========================
-- 006: 주석 업데이트
-- ===========================

COMMENT ON TABLE hand_edit_requests IS 'User-submitted edit requests for hand data, reviewable by Arbiters';
