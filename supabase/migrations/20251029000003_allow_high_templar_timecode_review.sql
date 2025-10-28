/**
 * Allow High Templar to Review Timecode Submissions
 *
 * High Templar 및 Admin이 타임코드 제출을 검토/승인/거부할 수 있도록 RLS 정책 업데이트
 */

-- ============================================================================
-- UPDATE 정책: High Templar + Admin이 타임코드 제출을 업데이트 가능
-- ============================================================================

-- 기존 Admin 전용 정책 삭제
DROP POLICY IF EXISTS "Admin can update any timecode submission" ON public.timecode_submissions;

-- 새 정책 생성: High Templar + Admin
CREATE POLICY "High Templar and Admin can update timecode submissions"
ON public.timecode_submissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('high_templar', 'admin')
    AND users.banned_at IS NULL
  )
);

-- ============================================================================
-- DELETE 정책: High Templar + Admin이 타임코드 제출을 삭제 가능
-- ============================================================================

-- 기존 Admin 전용 정책 삭제
DROP POLICY IF EXISTS "Admin can delete any timecode submission" ON public.timecode_submissions;

-- 새 정책 생성: High Templar + Admin
CREATE POLICY "High Templar and Admin can delete timecode submissions"
ON public.timecode_submissions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('high_templar', 'admin')
    AND users.banned_at IS NULL
  )
);

-- ============================================================================
-- 설명
-- ============================================================================
COMMENT ON POLICY "High Templar and Admin can update timecode submissions" ON public.timecode_submissions IS
'High Templar 및 Admin 역할을 가진 밴되지 않은 사용자가 모든 타임코드 제출을 업데이트할 수 있습니다.';

COMMENT ON POLICY "High Templar and Admin can delete timecode submissions" ON public.timecode_submissions IS
'High Templar 및 Admin 역할을 가진 밴되지 않은 사용자가 모든 타임코드 제출을 삭제할 수 있습니다.';
