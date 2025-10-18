-- ============================================
-- Expand Tournament Categories
-- ============================================
-- 이 마이그레이션은 포커 투어 카테고리를 확장합니다
-- 1. CHECK constraint 제거하여 모든 투어 지원
-- 2. 별칭 정규화 함수 생성
-- 3. 인덱스 최적화

-- ============================================
-- 1. CHECK constraint 제거
-- ============================================
-- 기존 CHECK constraint는 7개 카테고리만 허용
-- 40+ 투어를 지원하기 위해 제거
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_category_check;

-- ============================================
-- 2. 별칭 정규화 함수 생성
-- ============================================
-- 기존 데이터의 별칭을 정규화된 ID로 변환
-- 예: "Hustler Casino Live" → "hustler"
--     "WSOP Classic" → "wsop"

CREATE OR REPLACE FUNCTION normalize_tournament_category(input_category TEXT)
RETURNS TEXT AS $$
BEGIN
  -- NULL 체크
  IF input_category IS NULL THEN
    RETURN NULL;
  END IF;

  -- 소문자로 변환하고 공백을 하이픈으로 변경
  DECLARE
    normalized TEXT;
  BEGIN
    normalized := LOWER(TRIM(input_category));

    -- 기존 별칭 매핑 (대소문자 구분 없음)
    RETURN CASE
      -- WSOP 계열
      WHEN normalized IN ('wsop', 'world series of poker', 'wsop classic') THEN 'wsop'
      WHEN normalized IN ('wsope', 'world series of poker europe') THEN 'wsope'
      WHEN normalized IN ('wsop paradise', 'world series of poker paradise') THEN 'wsop-paradise'

      -- WPT 계열
      WHEN normalized IN ('wpt', 'world poker tour') THEN 'wpt'

      -- EPT 계열
      WHEN normalized IN ('ept', 'european poker tour', 'pokerstars ept') THEN 'ept'

      -- Triton
      WHEN normalized IN ('triton', 'triton poker', 'triton series', 'triton poker series') THEN 'triton'

      -- NAPT
      WHEN normalized IN ('napt', 'north american poker tour') THEN 'napt'

      -- Asian Tours
      WHEN normalized IN ('apt', 'asian poker tour') THEN 'apt'
      WHEN normalized IN ('appt', 'asia pacific poker tour', 'pokerstars appt') THEN 'appt'
      WHEN normalized IN ('apl', 'asian poker league') THEN 'apl'

      -- Aussie Tours
      WHEN normalized IN ('aussie millions', 'australian millions') THEN 'aussie-millions'
      WHEN normalized IN ('australian poker open', 'apo') THEN 'australian-poker-open'

      -- Latin America
      WHEN normalized IN ('lapt', 'latin american poker tour', 'pokerstars lapt') THEN 'lapt'
      WHEN normalized IN ('bsop', 'brazilian series of poker') THEN 'bsop'

      -- Live Poker
      WHEN normalized IN ('hustler casino live', 'hustler', 'hcl') THEN 'hustler'

      -- GGPoker
      WHEN normalized IN ('ggpoker', 'gg poker') THEN 'ggpoker'
      WHEN normalized IN ('ggpoker uk', 'ggpoker uk poker championships', 'ggp uk') THEN 'ggpoker-uk'

      -- Online Series
      WHEN normalized IN ('wcoop', 'world championship of online poker', 'pokerstars wcoop') THEN 'wcoop'
      WHEN normalized IN ('scoop', 'spring championship of online poker', 'pokerstars scoop') THEN 'scoop'
      WHEN normalized IN ('uscoop', 'pokerstars uscoop') THEN 'uscoop'
      WHEN normalized IN ('pacoop', 'pokerstars pacoop') THEN 'pacoop'
      WHEN normalized IN ('oncoop', 'pokerstars oncoop') THEN 'oncoop'

      -- Specialty Series
      WHEN normalized IN ('super high roller bowl', 'shrb') THEN 'super-high-roller-bowl'
      WHEN normalized IN ('poker masters') THEN 'poker-masters'
      WHEN normalized IN ('us poker open', 'uspo') THEN 'us-poker-open'
      WHEN normalized IN ('pokergo tour', 'pgt') THEN 'pokergo-tour'

      -- Other Tours
      WHEN normalized IN ('888poker', '888') THEN '888poker'
      WHEN normalized IN ('888poker live', '888 live') THEN '888poker-live'
      WHEN normalized IN ('pokerstars open', 'ps open') THEN 'pokerstars-open'
      WHEN normalized IN ('unibet open', 'unibet') THEN 'unibet-open'
      WHEN normalized IN ('irish poker tour', 'ipt') THEN 'irish-poker-tour'
      WHEN normalized IN ('rungood poker series', 'rungood', 'rgps') THEN 'rungood'
      WHEN normalized IN ('merit poker', 'merit') THEN 'merit-poker'
      WHEN normalized IN ('the hendon mob championship', 'hendon mob', 'thm') THEN 'hendon-mob'
      WHEN normalized IN ('partypoker live', 'pp live') THEN 'partypoker-live'
      WHEN normalized IN ('global poker', 'global') THEN 'global-poker'

      -- 매핑되지 않은 경우: 공백을 하이픈으로 변경하고 소문자로 반환
      ELSE REPLACE(normalized, ' ', '-')
    END;
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 3. 인덱스 최적화
-- ============================================
-- 정규화된 카테고리로 빠른 검색을 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_tournaments_category_normalized
  ON tournaments(normalize_tournament_category(category));

-- ============================================
-- 4. 기존 데이터 정규화 (선택적)
-- ============================================
-- 주의: 이 작업은 기존 데이터를 변경합니다
-- 필요한 경우 주석을 해제하세요

-- UPDATE tournaments
-- SET category = normalize_tournament_category(category)
-- WHERE category != normalize_tournament_category(category);

-- ============================================
-- 5. 유틸리티 뷰 생성 (선택적)
-- ============================================
-- 투어 카테고리 통계를 위한 뷰
CREATE OR REPLACE VIEW tournament_category_stats AS
SELECT
  normalize_tournament_category(category) as normalized_category,
  category as original_category,
  COUNT(*) as tournament_count,
  MIN(start_date) as earliest_date,
  MAX(end_date) as latest_date
FROM tournaments
GROUP BY category
ORDER BY tournament_count DESC;

-- 권한 설정
GRANT SELECT ON tournament_category_stats TO authenticated;
GRANT SELECT ON tournament_category_stats TO anon;

-- ============================================
-- 마이그레이션 완료
-- ============================================
-- 이제 tournaments.category 컬럼은 모든 투어를 지원합니다
-- normalize_tournament_category() 함수로 별칭을 정규화할 수 있습니다
