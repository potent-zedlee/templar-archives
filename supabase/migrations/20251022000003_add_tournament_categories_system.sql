-- =====================================================
-- Tournament Categories System
-- =====================================================
-- 토너먼트 카테고리를 데이터베이스로 관리하는 시스템
-- 웹에서 추가/수정/삭제 가능, 로고 업로드 지원

-- =====================================================
-- 1. tournament_categories 테이블 생성
-- =====================================================
CREATE TABLE tournament_categories (
  id TEXT PRIMARY KEY,  -- 'wsop', 'triton' 등 (URL-safe slug)
  name TEXT NOT NULL,  -- 'World Series of Poker'
  display_name TEXT NOT NULL,  -- 'WSOP'
  short_name TEXT,  -- 'WSOP' (약칭)
  aliases TEXT[] DEFAULT '{}',  -- ['WSOP', 'World Series of Poker']
  logo_url TEXT,  -- Storage URL 또는 public/logos/ 경로
  region TEXT NOT NULL CHECK (region IN ('premier', 'regional', 'online', 'specialty')),
  priority INTEGER NOT NULL DEFAULT 50,  -- 정렬 순서 (낮을수록 우선)
  website TEXT,  -- 공식 웹사이트
  is_active BOOLEAN DEFAULT true,  -- 활성화 여부
  theme_gradient TEXT,  -- Tailwind gradient class
  theme_text TEXT,  -- Tailwind text color class
  theme_shadow TEXT,  -- Tailwind shadow class
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_categories_priority ON tournament_categories(priority);
CREATE INDEX idx_categories_active ON tournament_categories(is_active);
CREATE INDEX idx_categories_region ON tournament_categories(region);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_tournament_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tournament_categories_updated_at
  BEFORE UPDATE ON tournament_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_tournament_categories_updated_at();

-- =====================================================
-- 2. 기존 36개 카테고리 데이터 INSERT
-- =====================================================

-- Premier Tours
INSERT INTO tournament_categories (id, name, display_name, short_name, aliases, logo_url, region, priority, website, is_active, theme_gradient, theme_text, theme_shadow) VALUES
('wsop', 'World Series of Poker', 'WSOP', 'WSOP', ARRAY['WSOP', 'World Series of Poker', 'WSOP Classic'], '/logos/wsop.svg', 'premier', 1, 'https://www.wsop.com', true, 'from-amber-900 via-amber-800 to-amber-700', 'text-white', 'shadow-amber-900/50'),
('wpt', 'World Poker Tour', 'WPT', 'WPT', ARRAY['WPT', 'World Poker Tour'], '/logos/wpt.svg', 'premier', 2, 'https://www.wpt.com', true, 'from-purple-900 via-purple-800 to-purple-700', 'text-white', 'shadow-purple-900/50'),
('ept', 'European Poker Tour', 'EPT', 'EPT', ARRAY['EPT', 'European Poker Tour', 'PokerStars EPT'], '/logos/ept.svg', 'premier', 3, 'https://www.pokerstars.com/ept', true, 'from-blue-900 via-blue-800 to-blue-700', 'text-white', 'shadow-blue-900/50'),
('triton', 'Triton Poker Series', 'Triton', 'Triton', ARRAY['Triton', 'Triton Poker', 'Triton Series'], '/logos/triton.png', 'premier', 4, 'https://www.triton-series.com', true, 'from-yellow-600 via-yellow-500 to-yellow-400', 'text-black', 'shadow-yellow-600/50'),
('wsope', 'World Series of Poker Europe', 'WSOPE', 'WSOPE', ARRAY['WSOPE', 'World Series of Poker Europe'], '/logos/wsope.svg', 'premier', 5, 'https://www.wsop.com/europe', true, NULL, NULL, NULL),
('napt', 'North American Poker Tour', 'NAPT', 'NAPT', ARRAY['NAPT', 'North American Poker Tour'], '/logos/napt.svg', 'premier', 6, 'https://www.pokerstars.com/napt', true, NULL, NULL, NULL),
('pokerstars-open', 'PokerStars Open', 'PokerStars Open', 'PS Open', ARRAY['PokerStars Open', 'PS Open'], '/logos/pokerstars-open.png', 'premier', 7, NULL, true, NULL, NULL, NULL);

-- Regional Tours
INSERT INTO tournament_categories (id, name, display_name, short_name, aliases, logo_url, region, priority, website, is_active) VALUES
('apt', 'Asian Poker Tour', 'APT', 'APT', ARRAY['APT', 'Asian Poker Tour'], '/logos/apt.svg', 'regional', 10, 'https://www.asianpokertour.com', true),
('appt', 'Asia Pacific Poker Tour', 'APPT', 'APPT', ARRAY['APPT', 'Asia Pacific Poker Tour', 'PokerStars APPT'], '/logos/appt.svg', 'regional', 11, NULL, true),
('apl', 'Asian Poker League', 'APL', 'APL', ARRAY['APL', 'Asian Poker League'], '/logos/apl.svg', 'regional', 12, NULL, true),
('aussie-millions', 'Aussie Millions', 'Aussie Millions', 'Aussie Millions', ARRAY['Aussie Millions', 'Australian Millions'], '/logos/aussie-millions.svg', 'regional', 13, 'https://www.aussiemillions.com', true),
('australian-poker-open', 'Australian Poker Open', 'Aus Poker Open', 'APO', ARRAY['Australian Poker Open', 'APO'], '/logos/australian-poker-open.svg', 'regional', 14, NULL, true),
('lapt', 'Latin American Poker Tour', 'LAPT', 'LAPT', ARRAY['LAPT', 'Latin American Poker Tour', 'PokerStars LAPT'], '/logos/lapt.svg', 'regional', 15, NULL, true),
('bsop', 'Brazilian Series of Poker', 'BSOP', 'BSOP', ARRAY['BSOP', 'Brazilian Series of Poker'], '/logos/bsop.svg', 'regional', 16, NULL, true),
('irish-poker-tour', 'Irish Poker Tour', 'Irish Poker Tour', 'IPT', ARRAY['Irish Poker Tour', 'IPT'], '/logos/irish-poker-tour.svg', 'regional', 17, NULL, true),
('unibet-open', 'Unibet Open', 'Unibet Open', 'Unibet', ARRAY['Unibet Open', 'Unibet'], '/logos/unibet-open.svg', 'regional', 18, NULL, true),
('ggpoker-uk', 'GGPoker UK Poker Championships', 'GGPoker UK', 'GGP UK', ARRAY['GGPoker UK', 'GGPoker UK Poker Championships'], '/logos/ggpoker-uk.png', 'regional', 22, NULL, true),
('888poker-live', '888poker LIVE', '888poker LIVE', '888 LIVE', ARRAY['888poker LIVE', '888 LIVE'], '/logos/888poker-live.svg', 'regional', 51, NULL, true),
('rungood', 'RunGood Poker Series', 'RunGood', 'RGPS', ARRAY['RunGood Poker Series', 'RunGood', 'RGPS'], '/logos/rungood.svg', 'regional', 52, NULL, true),
('merit-poker', 'Merit Poker', 'Merit Poker', 'Merit', ARRAY['Merit Poker', 'Merit'], '/logos/merit-poker.svg', 'regional', 53, NULL, true),
('partypoker-live', 'partypoker LIVE', 'partypoker LIVE', 'PP LIVE', ARRAY['partypoker LIVE', 'PP LIVE'], '/logos/partypoker-live.svg', 'regional', 55, NULL, true);

-- Specialty & High Roller
INSERT INTO tournament_categories (id, name, display_name, short_name, aliases, logo_url, region, priority, website, is_active) VALUES
('hustler', 'Hustler Casino Live', 'Hustler', 'HCL', ARRAY['Hustler Casino Live', 'Hustler', 'HCL'], '/logos/hustler.svg', 'specialty', 20, 'https://www.hustlercasinolive.com', true),
('super-high-roller-bowl', 'Super High Roller Bowl', 'Super High Roller Bowl', 'SHRB', ARRAY['Super High Roller Bowl', 'SHRB'], '/logos/super-high-roller-bowl.svg', 'specialty', 40, NULL, true),
('poker-masters', 'Poker Masters', 'Poker Masters', 'Poker Masters', ARRAY['Poker Masters'], '/logos/poker-masters.svg', 'specialty', 41, NULL, true),
('us-poker-open', 'US Poker Open', 'US Poker Open', 'USPO', ARRAY['US Poker Open', 'USPO'], '/logos/us-poker-open.svg', 'specialty', 42, NULL, true),
('pokergo-tour', 'PokerGO Tour', 'PokerGO Tour', 'PGT', ARRAY['PokerGO Tour', 'PGT'], '/logos/pokergo-tour.svg', 'specialty', 43, 'https://www.pokergo.com', true),
('wsop-paradise', 'World Series of Poker Paradise', 'WSOP Paradise', 'WSOP Paradise', ARRAY['WSOP Paradise', 'World Series of Poker Paradise'], '/logos/wsop-paradise.svg', 'specialty', 44, NULL, true),
('hendon-mob', 'The Hendon Mob Championship', 'Hendon Mob', 'THM', ARRAY['The Hendon Mob Championship', 'Hendon Mob', 'THM'], '/logos/hendon-mob.svg', 'specialty', 54, NULL, true);

-- Online Series
INSERT INTO tournament_categories (id, name, display_name, short_name, aliases, logo_url, region, priority, website, is_active) VALUES
('ggpoker', 'GGPoker', 'GGPoker', 'GGPoker', ARRAY['GGPOKER', 'GGPoker', 'GG Poker'], '/logos/ggpoker.svg', 'online', 21, 'https://www.ggpoker.com', true),
('wcoop', 'PokerStars WCOOP', 'WCOOP', 'WCOOP', ARRAY['WCOOP', 'World Championship of Online Poker', 'PokerStars WCOOP'], '/logos/wcoop.svg', 'online', 30, 'https://www.pokerstars.com/wcoop', true),
('scoop', 'PokerStars SCOOP', 'SCOOP', 'SCOOP', ARRAY['SCOOP', 'Spring Championship of Online Poker', 'PokerStars SCOOP'], '/logos/scoop.svg', 'online', 31, 'https://www.pokerstars.com/scoop', true),
('uscoop', 'PokerStars USCOOP', 'USCOOP', 'USCOOP', ARRAY['USCOOP', 'PokerStars USCOOP'], '/logos/uscoop.svg', 'online', 32, NULL, true),
('pacoop', 'PokerStars PACOOP', 'PACOOP', 'PACOOP', ARRAY['PACOOP', 'PokerStars PACOOP'], '/logos/pacoop.svg', 'online', 33, NULL, true),
('oncoop', 'PokerStars ONCOOP', 'ONCOOP', 'ONCOOP', ARRAY['ONCOOP', 'PokerStars ONCOOP'], '/logos/oncoop.svg', 'online', 34, NULL, true),
('888poker', '888poker', '888poker', '888', ARRAY['888poker', '888'], '/logos/888poker.svg', 'online', 50, 'https://www.888poker.com', true),
('global-poker', 'Global Poker', 'Global Poker', 'Global', ARRAY['Global Poker', 'Global'], '/logos/global-poker.svg', 'online', 56, NULL, true);

-- =====================================================
-- 3. tournaments 테이블 수정
-- =====================================================

-- 새 컬럼 추가
ALTER TABLE tournaments ADD COLUMN category_id TEXT;

-- 기존 category 데이터를 category_id로 매핑
UPDATE tournaments SET category_id =
  CASE
    WHEN category = 'WSOP' THEN 'wsop'
    WHEN category = 'Triton' THEN 'triton'
    WHEN category = 'EPT' THEN 'ept'
    WHEN category = 'APL' THEN 'apl'
    WHEN category = 'Hustler Casino Live' THEN 'hustler'
    WHEN category = 'WSOP Classic' THEN 'wsop'
    WHEN category = 'GGPOKER' THEN 'ggpoker'
    ELSE 'wsop'  -- 기본값
  END;

-- Foreign Key 추가
ALTER TABLE tournaments
  ADD CONSTRAINT fk_tournament_category
  FOREIGN KEY (category_id) REFERENCES tournament_categories(id)
  ON DELETE RESTRICT;

-- category_id NOT NULL 제약조건 추가
ALTER TABLE tournaments ALTER COLUMN category_id SET NOT NULL;

-- 기존 category 컬럼 제거 (나중에 필요하면 주석 해제)
-- ALTER TABLE tournaments DROP COLUMN category;
-- ALTER TABLE tournaments DROP COLUMN category_logo;

-- 인덱스 추가
CREATE INDEX idx_tournaments_category_id ON tournaments(category_id);

-- =====================================================
-- 4. Supabase Storage 버킷 생성 (Supabase Dashboard에서 수동 생성 필요)
-- =====================================================
-- Name: tournament-logos
-- Public: true
-- Allowed MIME types: image/svg+xml, image/png, image/jpeg
-- Max file size: 5MB

-- Storage RLS 정책
INSERT INTO storage.buckets (id, name, public)
VALUES ('tournament-logos', 'tournament-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Admin만 업로드/삭제 가능
CREATE POLICY "Admin can upload tournament logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tournament-logos'
    AND auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

CREATE POLICY "Admin can update tournament logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'tournament-logos'
    AND auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

CREATE POLICY "Admin can delete tournament logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tournament-logos'
    AND auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- 모두 읽기 가능 (public bucket)
CREATE POLICY "Anyone can view tournament logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tournament-logos');

-- =====================================================
-- 5. RLS 정책
-- =====================================================

-- RLS 활성화
ALTER TABLE tournament_categories ENABLE ROW LEVEL SECURITY;

-- 모두 읽기 가능 (활성화된 카테고리만)
CREATE POLICY "Anyone can view active categories"
  ON tournament_categories FOR SELECT
  USING (is_active = true);

-- Admin은 모두 읽기 가능
CREATE POLICY "Admin can view all categories"
  ON tournament_categories FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- Admin만 추가 가능
CREATE POLICY "Admin can insert categories"
  ON tournament_categories FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- Admin만 수정 가능
CREATE POLICY "Admin can update categories"
  ON tournament_categories FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- Admin만 삭제 가능 (사용 중인 카테고리는 FK로 보호됨)
CREATE POLICY "Admin can delete categories"
  ON tournament_categories FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- =====================================================
-- 6. 유틸리티 함수
-- =====================================================

-- 카테고리 사용 개수 확인 함수
CREATE OR REPLACE FUNCTION get_category_usage_count(category_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM tournaments
    WHERE tournaments.category_id = get_category_usage_count.category_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 카테고리 삭제 전 사용 여부 확인 함수
CREATE OR REPLACE FUNCTION check_category_before_delete()
RETURNS TRIGGER AS $$
DECLARE
  usage_count INTEGER;
BEGIN
  SELECT get_category_usage_count(OLD.id) INTO usage_count;

  IF usage_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete category "%" because it is used by % tournament(s)', OLD.name, usage_count;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_category_delete_if_in_use
  BEFORE DELETE ON tournament_categories
  FOR EACH ROW
  EXECUTE FUNCTION check_category_before_delete();

-- =====================================================
-- 7. 완료 메시지
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Tournament Categories System 설치 완료!';
  RAISE NOTICE '📊 36개 카테고리 데이터 INSERT 완료';
  RAISE NOTICE '🗂️ tournaments 테이블 마이그레이션 완료';
  RAISE NOTICE '🪣 tournament-logos Storage 버킷 생성 완료';
  RAISE NOTICE '🔒 RLS 정책 설정 완료';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '1. Supabase Dashboard에서 tournament-logos 버킷 확인';
  RAISE NOTICE '2. /admin/categories 페이지에서 카테고리 관리';
  RAISE NOTICE '3. 로고 업로드 테스트';
END $$;
