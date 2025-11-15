-- ===========================
-- Arbiter System: Hand Edit History (Audit Log)
-- ===========================
-- Purpose: Track all hand modifications for audit and quality control
-- Used by: Arbiter dashboard, admin monitoring

-- ===========================
-- 001: hand_edit_history 테이블 생성
-- ===========================

CREATE TABLE IF NOT EXISTS public.hand_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  editor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  edit_type TEXT NOT NULL CHECK (edit_type IN ('create', 'update', 'delete')),
  changed_fields JSONB,  -- 변경된 필드 목록 (예: {"description": "old -> new"})
  previous_data JSONB,   -- 변경 전 데이터 (전체 또는 일부)
  new_data JSONB,        -- 변경 후 데이터 (전체 또는 일부)
  reason TEXT,           -- 변경 사유 (선택)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX hand_edit_history_hand_id_idx ON public.hand_edit_history(hand_id);
CREATE INDEX hand_edit_history_editor_id_idx ON public.hand_edit_history(editor_id);
CREATE INDEX hand_edit_history_created_at_idx ON public.hand_edit_history(created_at DESC);
CREATE INDEX hand_edit_history_composite_idx ON public.hand_edit_history(hand_id, created_at DESC);

-- 주석
COMMENT ON TABLE public.hand_edit_history IS 'Audit log for hand modifications (Arbiter system)';
COMMENT ON COLUMN public.hand_edit_history.edit_type IS 'Type of edit: create, update, delete';
COMMENT ON COLUMN public.hand_edit_history.changed_fields IS 'Summary of changed fields (JSON)';
COMMENT ON COLUMN public.hand_edit_history.previous_data IS 'Previous data snapshot (JSON)';
COMMENT ON COLUMN public.hand_edit_history.new_data IS 'New data snapshot (JSON)';
COMMENT ON COLUMN public.hand_edit_history.reason IS 'Reason for edit (optional)';

-- ===========================
-- 002: RLS 정책
-- ===========================

ALTER TABLE public.hand_edit_history ENABLE ROW LEVEL SECURITY;

-- 읽기 권한: Arbiter 이상
CREATE POLICY "Arbiters can view edit history"
  ON hand_edit_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
    )
  );

-- 쓰기 권한: 트리거로만 삽입 (수동 삽입 방지)
-- 실제로는 SECURITY DEFINER 함수에서 삽입하므로 이 정책은 사용 안 됨
CREATE POLICY "System can insert edit history"
  ON hand_edit_history
  FOR INSERT
  WITH CHECK (false);  -- 트리거만 허용, 수동 삽입 금지

COMMENT ON POLICY "Arbiters can view edit history" ON hand_edit_history
  IS 'Arbiters and above can view hand edit history';

COMMENT ON POLICY "System can insert edit history" ON hand_edit_history
  IS 'Manual inserts blocked - use trigger only';

-- ===========================
-- 003: 자동 로깅 트리거 함수
-- ===========================

CREATE OR REPLACE FUNCTION log_hand_edit()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_fields JSONB;
BEGIN
  -- INSERT 작업
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.hand_edit_history (
      hand_id,
      editor_id,
      edit_type,
      new_data
    ) VALUES (
      NEW.id,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),  -- Fallback for system inserts
      'create',
      to_jsonb(NEW)
    );
    RETURN NEW;

  -- UPDATE 작업
  ELSIF TG_OP = 'UPDATE' THEN
    -- 변경된 필드만 추출
    v_changed_fields := jsonb_build_object(
      'description', CASE WHEN OLD.description IS DISTINCT FROM NEW.description THEN jsonb_build_object('old', OLD.description, 'new', NEW.description) ELSE NULL END,
      'small_blind', CASE WHEN OLD.small_blind IS DISTINCT FROM NEW.small_blind THEN jsonb_build_object('old', OLD.small_blind, 'new', NEW.small_blind) ELSE NULL END,
      'big_blind', CASE WHEN OLD.big_blind IS DISTINCT FROM NEW.big_blind THEN jsonb_build_object('old', OLD.big_blind, 'new', NEW.big_blind) ELSE NULL END,
      'ante', CASE WHEN OLD.ante IS DISTINCT FROM NEW.ante THEN jsonb_build_object('old', OLD.ante, 'new', NEW.ante) ELSE NULL END,
      'pot_size', CASE WHEN OLD.pot_size IS DISTINCT FROM NEW.pot_size THEN jsonb_build_object('old', OLD.pot_size, 'new', NEW.pot_size) ELSE NULL END,
      'board_flop', CASE WHEN OLD.board_flop IS DISTINCT FROM NEW.board_flop THEN jsonb_build_object('old', OLD.board_flop, 'new', NEW.board_flop) ELSE NULL END,
      'board_turn', CASE WHEN OLD.board_turn IS DISTINCT FROM NEW.board_turn THEN jsonb_build_object('old', OLD.board_turn, 'new', NEW.board_turn) ELSE NULL END,
      'board_river', CASE WHEN OLD.board_river IS DISTINCT FROM NEW.board_river THEN jsonb_build_object('old', OLD.board_river, 'new', NEW.board_river) ELSE NULL END
    );

    -- NULL 값 제거
    v_changed_fields := (
      SELECT jsonb_object_agg(key, value)
      FROM jsonb_each(v_changed_fields)
      WHERE value IS NOT NULL
    );

    -- 실제 변경이 있을 때만 로그
    IF v_changed_fields IS NOT NULL AND jsonb_object_keys(v_changed_fields) IS NOT NULL THEN
      INSERT INTO public.hand_edit_history (
        hand_id,
        editor_id,
        edit_type,
        previous_data,
        new_data,
        changed_fields
      ) VALUES (
        NEW.id,
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
        'update',
        to_jsonb(OLD),
        to_jsonb(NEW),
        v_changed_fields
      );
    END IF;

    RETURN NEW;

  -- DELETE 작업
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.hand_edit_history (
      hand_id,
      editor_id,
      edit_type,
      previous_data
    ) VALUES (
      OLD.id,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
      'delete',
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_hand_edit() IS 'Automatically log hand edits to hand_edit_history (triggered on INSERT/UPDATE/DELETE)';

-- ===========================
-- 004: 트리거 생성
-- ===========================

DROP TRIGGER IF EXISTS hands_edit_log_trigger ON hands;

CREATE TRIGGER hands_edit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON hands
  FOR EACH ROW
  EXECUTE FUNCTION log_hand_edit();

COMMENT ON TRIGGER hands_edit_log_trigger ON hands IS 'Audit trigger: Log all hand modifications to hand_edit_history';

-- ===========================
-- 005: 성능 최적화 인덱스
-- ===========================

-- Arbiter 활동 통계 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_hand_edit_history_editor_date
  ON hand_edit_history(editor_id, created_at DESC)
  WHERE edit_type IN ('create', 'update');

-- 특정 핸드의 수정 이력 조회 최적화
CREATE INDEX IF NOT EXISTS idx_hand_edit_history_hand_type
  ON hand_edit_history(hand_id, edit_type, created_at DESC);

COMMENT ON INDEX idx_hand_edit_history_editor_date IS 'Optimize Arbiter activity statistics queries';
COMMENT ON INDEX idx_hand_edit_history_hand_type IS 'Optimize hand edit history timeline queries';
