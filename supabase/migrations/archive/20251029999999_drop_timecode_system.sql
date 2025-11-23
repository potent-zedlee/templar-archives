/**
 * Drop Timecode Submission System
 *
 * 타임코드 제출 시스템 완전 제거
 * 영상 분석 기능을 별도 프로젝트로 분리하기 위해
 * 기존 timecode_submissions 테이블 및 관련 객체들을 모두 삭제합니다.
 *
 * 삭제 대상:
 * - timecode_submissions 테이블
 * - 관련 인덱스 7개
 * - 관련 함수 5개
 * - 관련 트리거 3개
 * - 관련 RLS 정책 6개
 * - 관련 제약조건 1개
 */

-- ================================================================
-- 1. 트리거 삭제
-- ================================================================

DROP TRIGGER IF EXISTS trigger_notify_timecode_status_change ON timecode_submissions;
DROP TRIGGER IF EXISTS trigger_notify_admins_timecode_submitted ON timecode_submissions;
DROP TRIGGER IF EXISTS update_timecode_submissions_updated_at ON timecode_submissions;

-- ================================================================
-- 2. 함수 삭제
-- ================================================================

DROP FUNCTION IF EXISTS notify_timecode_status_change() CASCADE;
DROP FUNCTION IF EXISTS notify_admins_timecode_submitted() CASCADE;
DROP FUNCTION IF EXISTS get_timecode_submission_stats() CASCADE;
DROP FUNCTION IF EXISTS update_timecode_submission_ocr_regions(UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS validate_ocr_regions(JSONB) CASCADE;

-- ================================================================
-- 3. 인덱스 삭제 (테이블 삭제 시 자동 삭제되지만 명시적으로 제거)
-- ================================================================

DROP INDEX IF EXISTS idx_timecode_submissions_stream_id;
DROP INDEX IF EXISTS idx_timecode_submissions_submitter_id;
DROP INDEX IF EXISTS idx_timecode_submissions_status;
DROP INDEX IF EXISTS idx_timecode_submissions_created_at;
DROP INDEX IF EXISTS idx_timecode_submissions_status_created_at;
DROP INDEX IF EXISTS idx_timecode_submissions_ocr_regions;
DROP INDEX IF EXISTS idx_timecode_submissions_no_ocr_regions;

-- ================================================================
-- 4. RLS 정책 삭제
-- ================================================================

DROP POLICY IF EXISTS "Authenticated users can submit timecodes" ON timecode_submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON timecode_submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON timecode_submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON timecode_submissions;
DROP POLICY IF EXISTS "Admins can delete submissions" ON timecode_submissions;
DROP POLICY IF EXISTS "High Templar can view all timecode submissions" ON timecode_submissions;

-- ================================================================
-- 5. 테이블 삭제 (제약조건 포함)
-- ================================================================

DROP TABLE IF EXISTS timecode_submissions CASCADE;

-- ================================================================
-- 6. 알림 타입 정리 (참고용 - PostgreSQL enum은 값 제거 불가)
-- ================================================================

-- 참고: PostgreSQL enum 타입에서 값 제거는 지원되지 않습니다.
-- 다음 알림 타입들이 notification_type enum에 남아있지만 사용되지 않습니다:
-- - timecode_submitted
-- - timecode_approved
-- - timecode_rejected
-- - timecode_ai_completed
-- - timecode_review_ready
--
-- 이 값들은 무해하며, 필요시 enum 타입을 재생성해야 합니다.

-- ================================================================
-- 완료 메시지
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE 'Timecode submission system has been completely removed.';
  RAISE NOTICE 'All related tables, functions, triggers, and policies have been dropped.';
  RAISE NOTICE 'Note: notification_type enum values cannot be removed and will remain unused.';
END;
$$;
