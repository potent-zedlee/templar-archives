-- =====================================================
-- Add Category Hierarchy and Game Type
-- =====================================================
-- 카테고리 계층 구조(parent-child) 및 게임 타입 추가

-- 1. game_type ENUM 생성
CREATE TYPE game_type AS ENUM ('tournament', 'cash_game', 'both');

-- 2. tournament_categories 테이블에 컬럼 추가
ALTER TABLE tournament_categories
  ADD COLUMN parent_id TEXT REFERENCES tournament_categories(id) ON DELETE CASCADE,
  ADD COLUMN game_type game_type NOT NULL DEFAULT 'both';

-- 3. 인덱스 추가
CREATE INDEX idx_categories_parent_id ON tournament_categories(parent_id);
CREATE INDEX idx_categories_game_type ON tournament_categories(game_type);

-- 4. 기존 데이터 업데이트 (모두 최상위 카테고리로, game_type은 'both')
-- parent_id는 이미 NULL이므로 별도 작업 불필요
-- game_type은 DEFAULT 'both'로 자동 설정됨

-- 5. 순환 참조 방지 함수
CREATE OR REPLACE FUNCTION prevent_circular_category_reference()
RETURNS TRIGGER AS $$
DECLARE
  current_parent_id TEXT;
  depth INT := 0;
  max_depth INT := 2;  -- 최대 2단계 깊이만 허용
BEGIN
  -- parent_id가 NULL이면 검사 불필요
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 자기 자신을 parent로 설정하는 것 방지
  IF NEW.id = NEW.parent_id THEN
    RAISE EXCEPTION 'A category cannot be its own parent';
  END IF;

  -- 순환 참조 및 깊이 검사
  current_parent_id := NEW.parent_id;

  WHILE current_parent_id IS NOT NULL AND depth < max_depth + 1 LOOP
    -- 순환 참조 검사
    IF current_parent_id = NEW.id THEN
      RAISE EXCEPTION 'Circular reference detected in category hierarchy';
    END IF;

    -- 부모의 부모 찾기
    SELECT parent_id INTO current_parent_id
    FROM tournament_categories
    WHERE id = current_parent_id;

    depth := depth + 1;

    -- 최대 깊이 초과 검사
    IF depth > max_depth THEN
      RAISE EXCEPTION 'Category hierarchy cannot exceed % levels', max_depth;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 트리거 생성
DROP TRIGGER IF EXISTS check_category_circular_reference ON tournament_categories;
CREATE TRIGGER check_category_circular_reference
  BEFORE INSERT OR UPDATE OF parent_id ON tournament_categories
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_category_reference();

-- 7. 하위 카테고리 조회 함수 (재귀 쿼리)
CREATE OR REPLACE FUNCTION get_child_categories(p_parent_id TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  display_name TEXT,
  short_name TEXT,
  aliases TEXT[],
  logo_url TEXT,
  region TEXT,
  priority INTEGER,
  website TEXT,
  is_active BOOLEAN,
  game_type game_type,
  parent_id TEXT,
  theme_gradient TEXT,
  theme_text TEXT,
  theme_shadow TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.name,
    tc.display_name,
    tc.short_name,
    tc.aliases,
    tc.logo_url,
    tc.region,
    tc.priority,
    tc.website,
    tc.is_active,
    tc.game_type,
    tc.parent_id,
    tc.theme_gradient,
    tc.theme_text,
    tc.theme_shadow,
    tc.created_at,
    tc.updated_at
  FROM tournament_categories tc
  WHERE tc.parent_id = p_parent_id
  ORDER BY tc.priority ASC;
END;
$$ LANGUAGE plpgsql;

-- 8. 최상위 카테고리만 조회 함수
CREATE OR REPLACE FUNCTION get_root_categories(p_game_type game_type DEFAULT NULL)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  display_name TEXT,
  short_name TEXT,
  aliases TEXT[],
  logo_url TEXT,
  region TEXT,
  priority INTEGER,
  website TEXT,
  is_active BOOLEAN,
  game_type game_type,
  parent_id TEXT,
  theme_gradient TEXT,
  theme_text TEXT,
  theme_shadow TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.name,
    tc.display_name,
    tc.short_name,
    tc.aliases,
    tc.logo_url,
    tc.region,
    tc.priority,
    tc.website,
    tc.is_active,
    tc.game_type,
    tc.parent_id,
    tc.theme_gradient,
    tc.theme_text,
    tc.theme_shadow,
    tc.created_at,
    tc.updated_at
  FROM tournament_categories tc
  WHERE tc.parent_id IS NULL
    AND tc.is_active = true
    AND (p_game_type IS NULL OR tc.game_type = p_game_type OR tc.game_type = 'both')
  ORDER BY tc.priority ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 완료 메시지
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Category Hierarchy and Game Type System 설치 완료!';
  RAISE NOTICE '📊 parent_id, game_type 컬럼 추가';
  RAISE NOTICE '🔒 순환 참조 방지 트리거 생성';
  RAISE NOTICE '🔍 하위 카테고리 조회 함수 생성';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '1. /admin/categories에서 parent_id 및 game_type 설정';
  RAISE NOTICE '2. Archive 페이지에서 게임 타입별 필터링 확인';
END $$;
