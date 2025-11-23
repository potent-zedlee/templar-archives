/**
 * Timecode Submission System
 *
 * 사용자가 영상을 보며 핸드 타임코드를 제출하고,
 * 관리자가 승인 후 AI가 핸드 히스토리를 추출하는 시스템
 */

-- ================================================================
-- Timecode Submissions 테이블
-- ================================================================

CREATE TABLE timecode_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 연결된 스트림
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,

  -- 제출자 정보
  submitter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submitter_name TEXT NOT NULL,

  -- 타임코드 정보
  start_time TEXT NOT NULL,  -- "05:11" or "1:05:11"
  end_time TEXT,             -- 종료 시간 (선택 사항)
  hand_number TEXT,          -- 핸드 번호 (선택 사항, 예: "#45")
  description TEXT,          -- 간단한 설명 (예: "AA vs KK all-in preflop")

  -- 승인 워크플로우
  -- pending: 제출 완료, 관리자 승인 대기
  -- approved: 관리자 승인 완료, AI 추출 대기
  -- ai_processing: AI가 핸드 히스토리 추출 중
  -- review: AI 추출 완료, 검수 대기
  -- completed: 최종 승인 완료
  -- rejected: 거부됨
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'ai_processing', 'review', 'completed', 'rejected')),

  -- 관리자 승인 정보
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_comment TEXT,  -- 승인/거부 사유

  -- AI 추출 데이터
  ai_extracted_data JSONB,  -- Claude가 추출한 핸드 히스토리
  ai_processing_error TEXT,
  ai_processed_at TIMESTAMPTZ,

  -- 최종 핸드 데이터 (검수 완료 후)
  final_hand_id UUID REFERENCES hands(id) ON DELETE SET NULL,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 인덱스
-- ================================================================

CREATE INDEX idx_timecode_submissions_stream_id ON timecode_submissions(stream_id);
CREATE INDEX idx_timecode_submissions_submitter_id ON timecode_submissions(submitter_id);
CREATE INDEX idx_timecode_submissions_status ON timecode_submissions(status);
CREATE INDEX idx_timecode_submissions_created_at ON timecode_submissions(created_at DESC);

-- 복합 인덱스: 관리자가 상태별로 필터링할 때 사용
CREATE INDEX idx_timecode_submissions_status_created_at
  ON timecode_submissions(status, created_at DESC);

-- ================================================================
-- RLS 정책
-- ================================================================

ALTER TABLE timecode_submissions ENABLE ROW LEVEL SECURITY;

-- 1. 모든 로그인 유저가 타임코드 제출 가능
CREATE POLICY "Authenticated users can submit timecodes"
  ON timecode_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = submitter_id
    AND NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND banned_at IS NOT NULL
    )
  );

-- 2. 제출자는 자신의 제출 내역 조회 가능
CREATE POLICY "Users can view their own submissions"
  ON timecode_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = submitter_id);

-- 3. 관리자는 모든 제출 내역 조회 가능
CREATE POLICY "Admins can view all submissions"
  ON timecode_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin')
      AND banned_at IS NULL
    )
  );

-- 4. 관리자는 모든 제출 내역 수정 가능
CREATE POLICY "Admins can update submissions"
  ON timecode_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin')
      AND banned_at IS NULL
    )
  );

-- 5. 관리자는 제출 내역 삭제 가능
CREATE POLICY "Admins can delete submissions"
  ON timecode_submissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin')
      AND banned_at IS NULL
    )
  );

-- ================================================================
-- 자동 업데이트 트리거
-- ================================================================

CREATE TRIGGER update_timecode_submissions_updated_at
  BEFORE UPDATE ON timecode_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 통계 함수 (관리자 대시보드용)
-- ================================================================

CREATE OR REPLACE FUNCTION get_timecode_submission_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'ai_processing', COUNT(*) FILTER (WHERE status = 'ai_processing'),
    'review', COUNT(*) FILTER (WHERE status = 'review'),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
    'this_week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'this_month', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')
  ) INTO result
  FROM timecode_submissions;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 알림 타입 업데이트
-- ================================================================

-- notifications 테이블의 type enum에 새로운 알림 타입 추가
-- PostgreSQL enum 타입에는 ALTER TYPE ... ADD VALUE를 사용
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'timecode_submitted';      -- 유저가 타임코드 제출 → 관리자에게
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'timecode_approved';       -- 관리자가 타임코드 승인 → 제출자에게
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'timecode_rejected';       -- 관리자가 타임코드 거부 → 제출자에게
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'timecode_ai_completed';   -- AI 추출 완료 → 관리자에게
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'timecode_review_ready';   -- 검수 준비 완료 → 관리자에게

-- ================================================================
-- 헬퍼 함수: 타임코드 제출 시 관리자에게 알림 전송
-- ================================================================

CREATE OR REPLACE FUNCTION notify_admins_timecode_submitted()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- 모든 관리자에게 알림 전송
  FOR admin_record IN
    SELECT id FROM users WHERE role = 'admin' AND banned_at IS NULL
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      related_id
    ) VALUES (
      admin_record.id,
      'timecode_submitted',
      '새로운 타임코드 제출',
      NEW.submitter_name || '님이 핸드 타임코드를 제출했습니다.',
      '/admin/timecode-submissions',
      NEW.id::TEXT
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_admins_timecode_submitted
  AFTER INSERT ON timecode_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_timecode_submitted();

-- ================================================================
-- 헬퍼 함수: 상태 변경 시 알림 전송
-- ================================================================

CREATE OR REPLACE FUNCTION notify_timecode_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_type TEXT;
  notification_title TEXT;
  notification_message TEXT;
  notification_link TEXT;
  admin_record RECORD;
BEGIN
  -- 상태가 변경되지 않았으면 아무것도 하지 않음
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- 상태별 알림 설정
  CASE NEW.status
    WHEN 'approved' THEN
      notification_type := 'timecode_approved';
      notification_title := '타임코드 승인됨';
      notification_message := '제출하신 타임코드가 승인되었습니다. AI가 핸드 히스토리를 추출 중입니다.';
      notification_link := '/my-timecode-submissions';

      -- 제출자에게 알림
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        related_id
      ) VALUES (
        NEW.submitter_id,
        notification_type,
        notification_title,
        notification_message,
        notification_link,
        NEW.id::TEXT
      );

    WHEN 'rejected' THEN
      notification_type := 'timecode_rejected';
      notification_title := '타임코드 거부됨';
      notification_message := '제출하신 타임코드가 거부되었습니다.' ||
        CASE WHEN NEW.admin_comment IS NOT NULL
          THEN ' 사유: ' || NEW.admin_comment
          ELSE ''
        END;
      notification_link := '/my-timecode-submissions';

      -- 제출자에게 알림
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        related_id
      ) VALUES (
        NEW.submitter_id,
        notification_type,
        notification_title,
        notification_message,
        notification_link,
        NEW.id::TEXT
      );

    WHEN 'review' THEN
      notification_type := 'timecode_review_ready';
      notification_title := 'AI 추출 완료 - 검수 필요';
      notification_message := NEW.submitter_name || '님의 타임코드에 대한 AI 추출이 완료되었습니다.';
      notification_link := '/admin/timecode-submissions';

      -- 모든 관리자에게 알림
      FOR admin_record IN
        SELECT id FROM users WHERE role = 'admin' AND banned_at IS NULL
      LOOP
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          link,
          related_id
        ) VALUES (
          admin_record.id,
          notification_type,
          notification_title,
          notification_message,
          notification_link,
          NEW.id::TEXT
        );
      END LOOP;

    WHEN 'completed' THEN
      notification_type := 'timecode_approved';
      notification_title := '핸드 분석 완료';
      notification_message := '제출하신 타임코드의 핸드 분석이 완료되어 Archive에 추가되었습니다.';
      notification_link := '/hands/' || NEW.final_hand_id::TEXT;

      -- 제출자에게 알림
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        related_id
      ) VALUES (
        NEW.submitter_id,
        notification_type,
        notification_title,
        notification_message,
        notification_link,
        NEW.id::TEXT
      );

    ELSE
      -- 다른 상태 변경은 알림 없음
      RETURN NEW;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_timecode_status_change
  AFTER UPDATE ON timecode_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_timecode_status_change();

-- ================================================================
-- 코멘트
-- ================================================================

COMMENT ON TABLE timecode_submissions IS '사용자 타임코드 제출 및 AI 핸드 추출 시스템';
COMMENT ON COLUMN timecode_submissions.status IS 'pending → approved → ai_processing → review → completed | rejected';
COMMENT ON COLUMN timecode_submissions.ai_extracted_data IS 'Claude Vision이 추출한 핸드 히스토리 JSON';
COMMENT ON COLUMN timecode_submissions.final_hand_id IS '최종 승인 후 생성된 hands 테이블의 ID';
