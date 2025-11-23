-- =====================================================
-- Remove Unused Fields from tournament_categories
-- =====================================================
-- Phase 33: Comprehensive Sorting & Type Safety Enhancement
-- 사용하지 않는 region, priority, website 필드 제거

-- =====================================================
-- 1. 인덱스 제거
-- =====================================================
DROP INDEX IF EXISTS idx_categories_priority;
DROP INDEX IF EXISTS idx_categories_region;

-- =====================================================
-- 2. 컬럼 제거
-- =====================================================
ALTER TABLE tournament_categories DROP COLUMN IF EXISTS region;
ALTER TABLE tournament_categories DROP COLUMN IF EXISTS priority;
ALTER TABLE tournament_categories DROP COLUMN IF EXISTS website;

-- =====================================================
-- 3. game_type 필드 추가 (이미 존재하면 스킵)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_categories' AND column_name = 'game_type'
  ) THEN
    ALTER TABLE tournament_categories
      ADD COLUMN game_type TEXT NOT NULL DEFAULT 'both'
      CHECK (game_type IN ('tournament', 'cash_game', 'both'));

    CREATE INDEX idx_categories_game_type ON tournament_categories(game_type);
  END IF;
END $$;

-- =====================================================
-- 4. parent_id 필드 추가 (카테고리 계층 구조 지원)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_categories' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE tournament_categories
      ADD COLUMN parent_id TEXT REFERENCES tournament_categories(id) ON DELETE CASCADE;

    CREATE INDEX idx_categories_parent_id ON tournament_categories(parent_id);
  END IF;
END $$;

-- =====================================================
-- 5. 완료 메시지
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ tournament_categories 테이블 정리 완료!';
  RAISE NOTICE '❌ 제거된 필드: region, priority, website';
  RAISE NOTICE '✨ 추가된 필드: game_type, parent_id (이미 존재하면 스킵)';
  RAISE NOTICE '🗑️ 제거된 인덱스: idx_categories_priority, idx_categories_region';
  RAISE NOTICE '';
  RAISE NOTICE '영향받는 컴포넌트:';
  RAISE NOTICE '- components/admin/CategoryDialog.tsx (이미 수정됨)';
  RAISE NOTICE '- components/admin/CategoryTable.tsx (이미 수정됨)';
  RAISE NOTICE '- app/admin/categories/page.tsx (이미 수정됨)';
END $$;
