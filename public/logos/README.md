# Tournament & Channel Logos

## ⚠️ IMPORTANT: 마이그레이션 안내 (2025-10-26)

**이 디렉토리의 로고 파일들은 Supabase Storage로 마이그레이션되었습니다.**

### 새로운 로고 관리 방법

앞으로 로고는 **Supabase Storage**에서 관리됩니다:

```bash
# 로고 업로드 (URL에서 다운로드)
npm run logo:fetch <categoryId> <imageUrl>

# 로고 업로드 (로컬 파일)
npm run logo:upload <categoryId> <filePath>

# 로고 삭제
npm run logo:delete <categoryId>

# 로고 검증
npm run logo:validate
```

### 예시

```bash
# PokerNews에서 EPT 로고 다운로드 및 업로드
npm run logo:fetch ept https://example.com/ept-logo.svg

# 로컬 파일 업로드
npm run logo:upload wsop ./my-wsop-logo.svg

# 로고 삭제
npm run logo:delete triton

# 모든 카테고리 로고 검증
npm run logo:validate
```

### 마이그레이션 완료 후

마이그레이션이 완료되면 이 디렉토리의 로고 파일들은 삭제됩니다.
**placeholder-logo.svg**만 fallback용으로 유지됩니다.

---

## 📦 기존 안내 (참고용)

### 로고 파일 목록 (36개)

- `wsop.svg` - **World Series of Poker** (Premier)
- `wpt.svg` - **World Poker Tour** (Premier)
- `ept.svg` - **European Poker Tour** (Premier)
- `triton.svg` - **Triton Poker Series** (Premier)
- `wsope.svg` - **World Series of Poker Europe** (Premier)
- `napt.svg` - **North American Poker Tour** (Premier)
- `pokerstars-open.svg` - **PokerStars Open** (Premier)
- `apt.svg` - **Asian Poker Tour** (Regional)
- `appt.svg` - **Asia Pacific Poker Tour** (Regional)
- `apl.svg` - **Asian Poker League** (Regional)
- `aussie-millions.svg` - **Aussie Millions** (Regional)
- `australian-poker-open.svg` - **Australian Poker Open** (Regional)
- `lapt.svg` - **Latin American Poker Tour** (Regional)
- `bsop.svg` - **Brazilian Series of Poker** (Regional)
- `irish-poker-tour.svg` - **Irish Poker Tour** (Regional)
- `unibet-open.svg` - **Unibet Open** (Regional)
- `hustler.svg` - **Hustler Casino Live** (Specialty)
- `ggpoker.svg` - **GGPoker** (Online)
- `ggpoker-uk.svg` - **GGPoker UK Poker Championships** (Regional)
- `wcoop.svg` - **PokerStars WCOOP** (Online)
- `scoop.svg` - **PokerStars SCOOP** (Online)
- `uscoop.svg` - **PokerStars USCOOP** (Online)
- `pacoop.svg` - **PokerStars PACOOP** (Online)
- `oncoop.svg` - **PokerStars ONCOOP** (Online)
- `super-high-roller-bowl.svg` - **Super High Roller Bowl** (Specialty)
- `poker-masters.svg` - **Poker Masters** (Specialty)
- `us-poker-open.svg` - **US Poker Open** (Specialty)
- `pokergo-tour.svg` - **PokerGO Tour** (Specialty)
- `wsop-paradise.svg` - **World Series of Poker Paradise** (Specialty)
- `888poker.svg` - **888poker** (Online)
- `888poker-live.svg` - **888poker LIVE** (Regional)
- `rungood.svg` - **RunGood Poker Series** (Regional)
- `merit-poker.svg` - **Merit Poker** (Regional)
- `hendon-mob.svg` - **The Hendon Mob Championship** (Specialty)
- `partypoker-live.svg` - **partypoker LIVE** (Regional)
- `global-poker.svg` - **Global Poker** (Online)

## 📐 권장 사양

- **포맷**: SVG/PNG/JPEG/WebP
- **크기**: 200x200px 이상 정사각형 이미지
- **파일 크기**: 최대 5MB
- **투명 배경**: SVG/PNG 권장

## 🎯 로고 사용 위치

로고는 다음 위치에 자동으로 표시됩니다:

1. **Archive 카테고리 필터** (토너먼트 로고 바)
2. **Tournament/Event 카드**
3. **Folder 리스트**
4. **관리자 카테고리 테이블**

## 🔍 로고 소스 찾기

### 공식 웹사이트
각 투어의 공식 사이트 Press Kit/Media 섹션 확인

### PokerNews
- https://www.pokernews.com/tours/

### 오픈 소스 로고
- [Wikimedia Commons](https://commons.wikimedia.org/)
- [Brands of the World](https://www.brandsoftheworld.com/)

### 저작권 주의
- 로고 사용 전 라이선스 확인
- 상업적 사용 시 허가 필요 여부 체크

## 📝 참고

- 로고는 `tournament_categories` 테이블의 `logo_url` 필드에 저장됩니다
- Supabase Storage bucket: `tournament-logos`
- Fallback 로고: `/logos/placeholder-logo.svg`
