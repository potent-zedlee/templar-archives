/**
 * Fix Timecode Notification Triggers - Column Name Mismatch
 *
 * notifications 테이블은 recipient_id를 사용하지만
 * timecode 트리거들이 user_id를 사용하여 에러 발생
 *
 * 에러: column "user_id" of relation "notifications" does not exist
 */

-- ================================================================
-- 트리거 함수 1: 타임코드 제출 시 관리자에게 알림
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
      recipient_id,  -- user_id → recipient_id 수정
      type,
      title,
      message,
      link,
      related_id
    ) VALUES (
      admin_record.id,
      'system',
      '새로운 타임코드 제출',
      NEW.submitter_name || '님이 새로운 타임코드를 제출했습니다.',
      '/admin/timecode-submissions',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 트리거 함수 2: 타임코드 상태 변경 시 알림
-- ================================================================

CREATE OR REPLACE FUNCTION notify_timecode_status_change()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  notification_title TEXT;
  notification_message TEXT;
  notification_link TEXT;
BEGIN
  -- 상태가 변경되지 않았으면 종료
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- approved: 승인됨
  IF NEW.status = 'approved' THEN
      notification_title := '타임코드 승인됨';
      notification_message := '제출하신 타임코드가 승인되었습니다. AI가 핸드 히스토리를 추출 중입니다.';
      notification_link := '/my-timecode-submissions';

      -- 제출자에게 알림
      INSERT INTO notifications (
        recipient_id,  -- user_id → recipient_id 수정
        type,
        title,
        message,
        link,
        related_id
      ) VALUES (
        NEW.submitter_id,
        'success',
        notification_title,
        notification_message,
        notification_link,
        NEW.id
      );

  -- rejected: 거부됨
  ELSIF NEW.status = 'rejected' THEN
      notification_title := '타임코드 거부됨';
      IF NEW.admin_comment IS NOT NULL THEN
        notification_message := '제출하신 타임코드가 거부되었습니다. 사유: ' || NEW.admin_comment;
      ELSE
        notification_message := '제출하신 타임코드가 거부되었습니다.';
      END IF;
      notification_link := '/my-timecode-submissions';

      -- 제출자에게 알림
      INSERT INTO notifications (
        recipient_id,  -- user_id → recipient_id 수정
        type,
        title,
        message,
        link,
        related_id
      ) VALUES (
        NEW.submitter_id,
        'error',
        notification_title,
        notification_message,
        notification_link,
        NEW.id
      );

  -- review: AI 추출 완료, 검수 대기
  ELSIF NEW.status = 'review' THEN
      -- 모든 관리자에게 알림
      FOR admin_record IN
        SELECT id FROM users WHERE role = 'admin' AND banned_at IS NULL
      LOOP
        INSERT INTO notifications (
          recipient_id,  -- user_id → recipient_id 수정
          type,
          title,
          message,
          link,
          related_id
        ) VALUES (
          admin_record.id,
          'system',
          '타임코드 검수 대기',
          NEW.submitter_name || '님의 타임코드 AI 추출이 완료되어 검수 대기 중입니다.',
          '/admin/timecode-submissions',
          NEW.id
        );
      END LOOP;

  -- completed: 최종 완료
  ELSIF NEW.status = 'completed' THEN
      notification_title := '핸드 분석 완료';
      notification_message := '제출하신 타임코드의 핸드 분석이 완료되어 Archive에 추가되었습니다.';
      notification_link := '/hands/' || NEW.final_hand_id::TEXT;

      -- 제출자에게 알림
      INSERT INTO notifications (
        recipient_id,  -- user_id → recipient_id 수정
        type,
        title,
        message,
        link,
        related_id
      ) VALUES (
        NEW.submitter_id,
        'success',
        notification_title,
        notification_message,
        notification_link,
        NEW.id
      );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 설명
-- ================================================================
COMMENT ON FUNCTION notify_admins_timecode_submitted() IS
'타임코드 제출 시 모든 관리자에게 알림을 전송합니다. user_id → recipient_id 수정됨.';

COMMENT ON FUNCTION notify_timecode_status_change() IS
'타임코드 상태 변경 시 제출자 또는 관리자에게 알림을 전송합니다. user_id → recipient_id 수정됨.';
