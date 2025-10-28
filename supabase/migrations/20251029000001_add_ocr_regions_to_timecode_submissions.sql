-- Migration: Add OCR Regions to Timecode Submissions
-- Description: 사용자가 비디오 플레이어에서 지정한 OCR 영역 좌표를 저장
-- Author: Claude Code
-- Date: 2025-01-29

-- ============================================================================
-- 1. Add ocr_regions column to timecode_submissions
-- ============================================================================

ALTER TABLE timecode_submissions
ADD COLUMN ocr_regions JSONB DEFAULT NULL;

COMMENT ON COLUMN timecode_submissions.ocr_regions IS
'OCR 영역 좌표 정보
- player: 플레이어 카드 영역 (x, y, width, height, x_percent, y_percent, width_percent, height_percent)
- board: 보드 카드 + 팟 크기 영역 (동일한 구조)
예시:
{
  "player": {
    "x": 100,
    "y": 200,
    "width": 300,
    "height": 100,
    "x_percent": 7.8,
    "y_percent": 27.8,
    "width_percent": 23.4,
    "height_percent": 13.9
  },
  "board": {
    "x": 400,
    "y": 100,
    "width": 400,
    "height": 150,
    "x_percent": 31.25,
    "y_percent": 13.9,
    "width_percent": 31.25,
    "height_percent": 20.8
  }
}';

-- ============================================================================
-- 2. Create index for faster queries on ocr_regions
-- ============================================================================

CREATE INDEX idx_timecode_submissions_ocr_regions
ON timecode_submissions USING GIN (ocr_regions)
WHERE ocr_regions IS NOT NULL;

COMMENT ON INDEX idx_timecode_submissions_ocr_regions IS
'OCR 영역이 설정된 제출 내역을 빠르게 조회하기 위한 GIN 인덱스';

-- ============================================================================
-- 3. Create validation function for ocr_regions structure
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_ocr_regions(regions JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Check if regions is NULL (allowed)
  IF regions IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if regions has 'player' and 'board' keys
  IF NOT (regions ? 'player' AND regions ? 'board') THEN
    RETURN FALSE;
  END IF;

  -- Check if 'player' has required fields
  IF NOT (
    regions->'player' ? 'x' AND
    regions->'player' ? 'y' AND
    regions->'player' ? 'width' AND
    regions->'player' ? 'height' AND
    regions->'player' ? 'x_percent' AND
    regions->'player' ? 'y_percent' AND
    regions->'player' ? 'width_percent' AND
    regions->'player' ? 'height_percent'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check if 'board' has required fields
  IF NOT (
    regions->'board' ? 'x' AND
    regions->'board' ? 'y' AND
    regions->'board' ? 'width' AND
    regions->'board' ? 'height' AND
    regions->'board' ? 'x_percent' AND
    regions->'board' ? 'y_percent' AND
    regions->'board' ? 'width_percent' AND
    regions->'board' ? 'height_percent'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check if numeric values are valid (non-negative)
  IF (
    (regions->'player'->>'x')::numeric < 0 OR
    (regions->'player'->>'y')::numeric < 0 OR
    (regions->'player'->>'width')::numeric <= 0 OR
    (regions->'player'->>'height')::numeric <= 0 OR
    (regions->'board'->>'x')::numeric < 0 OR
    (regions->'board'->>'y')::numeric < 0 OR
    (regions->'board'->>'width')::numeric <= 0 OR
    (regions->'board'->>'height')::numeric <= 0
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check if percent values are valid (0-100)
  IF (
    (regions->'player'->>'x_percent')::numeric < 0 OR
    (regions->'player'->>'x_percent')::numeric > 100 OR
    (regions->'player'->>'y_percent')::numeric < 0 OR
    (regions->'player'->>'y_percent')::numeric > 100 OR
    (regions->'player'->>'width_percent')::numeric < 0 OR
    (regions->'player'->>'width_percent')::numeric > 100 OR
    (regions->'player'->>'height_percent')::numeric < 0 OR
    (regions->'player'->>'height_percent')::numeric > 100 OR
    (regions->'board'->>'x_percent')::numeric < 0 OR
    (regions->'board'->>'x_percent')::numeric > 100 OR
    (regions->'board'->>'y_percent')::numeric < 0 OR
    (regions->'board'->>'y_percent')::numeric > 100 OR
    (regions->'board'->>'width_percent')::numeric < 0 OR
    (regions->'board'->>'width_percent')::numeric > 100 OR
    (regions->'board'->>'height_percent')::numeric < 0 OR
    (regions->'board'->>'height_percent')::numeric > 100
  ) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION validate_ocr_regions(JSONB) IS
'OCR 영역 JSONB 구조가 유효한지 검증하는 함수
- player, board 키 존재 여부
- 필수 필드 (x, y, width, height, x_percent, y_percent, width_percent, height_percent) 존재 여부
- 숫자 값 유효성 (음수 아님, 퍼센트 0-100)';

-- ============================================================================
-- 4. Add check constraint using validation function
-- ============================================================================

ALTER TABLE timecode_submissions
ADD CONSTRAINT check_ocr_regions_structure
CHECK (validate_ocr_regions(ocr_regions));

COMMENT ON CONSTRAINT check_ocr_regions_structure ON timecode_submissions IS
'OCR 영역 구조 검증 제약 조건';

-- ============================================================================
-- 5. Create helper function to update ocr_regions
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timecode_submission_ocr_regions(
  p_submission_id UUID,
  p_ocr_regions JSONB
)
RETURNS timecode_submissions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission timecode_submissions;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is admin (High Templar or higher)
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = v_user_id
    AND role IN ('high_templar', 'admin')
    AND banned_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions. Only High Templar or Admin can update OCR regions.';
  END IF;

  -- Validate ocr_regions structure
  IF NOT validate_ocr_regions(p_ocr_regions) THEN
    RAISE EXCEPTION 'Invalid OCR regions structure';
  END IF;

  -- Update ocr_regions
  UPDATE timecode_submissions
  SET
    ocr_regions = p_ocr_regions,
    updated_at = NOW()
  WHERE id = p_submission_id
  RETURNING * INTO v_submission;

  -- Check if submission exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Timecode submission not found: %', p_submission_id;
  END IF;

  RETURN v_submission;
END;
$$;

COMMENT ON FUNCTION update_timecode_submission_ocr_regions(UUID, JSONB) IS
'타임코드 제출 내역의 OCR 영역을 업데이트하는 함수
- 관리자 권한 확인 (High Templar 이상)
- OCR 영역 구조 검증
- updated_at 자동 업데이트';

-- ============================================================================
-- 6. Grant necessary permissions
-- ============================================================================

-- Allow admins to execute the update function
GRANT EXECUTE ON FUNCTION update_timecode_submission_ocr_regions(UUID, JSONB)
TO authenticated;

-- ============================================================================
-- 7. Create index for submissions without OCR regions
-- ============================================================================

CREATE INDEX idx_timecode_submissions_no_ocr_regions
ON timecode_submissions (status, created_at DESC)
WHERE ocr_regions IS NULL AND status = 'approved';

COMMENT ON INDEX idx_timecode_submissions_no_ocr_regions IS
'OCR 영역이 설정되지 않은 approved 상태 제출 내역을 빠르게 조회';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify migration
DO $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'timecode_submissions'
    AND column_name = 'ocr_regions'
  ) THEN
    RAISE EXCEPTION 'Migration failed: ocr_regions column not created';
  END IF;

  -- Check if validation function exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'validate_ocr_regions'
  ) THEN
    RAISE EXCEPTION 'Migration failed: validate_ocr_regions function not created';
  END IF;

  -- Check if update function exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_timecode_submission_ocr_regions'
  ) THEN
    RAISE EXCEPTION 'Migration failed: update_timecode_submission_ocr_regions function not created';
  END IF;

  RAISE NOTICE 'Migration 20251029000001 completed successfully';
END;
$$;
