# Tournament & Channel Logos

이 디렉토리에는 각 포커 투어 및 YouTube 채널의 로고 파일을 보관합니다.

## 📦 현재 상태

현재 **플레이스홀더 로고**가 생성되어 있습니다.
실제 로고는 각 투어의 공식 웹사이트에서 다운로드하여 교체하세요.

## 🎨 로고 파일 목록 (36개)

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

## 🔧 로고 교체 방법

### 1. 공식 로고 다운로드

각 투어의 공식 웹사이트에서 로고를 다운로드하세요:

- **World Series of Poker**: https://www.wsop.com
- **World Poker Tour**: https://www.wpt.com
- **European Poker Tour**: https://www.pokerstars.com/ept
- **Triton Poker Series**: https://www.triton-series.com
- **World Series of Poker Europe**: https://www.wsop.com/europe
- **North American Poker Tour**: https://www.pokerstars.com/napt
- **PokerStars Open**: 공식 웹사이트에서 검색
- **Asian Poker Tour**: https://www.asianpokertour.com
- **Asia Pacific Poker Tour**: 공식 웹사이트에서 검색
- **Asian Poker League**: 공식 웹사이트에서 검색

### 2. SVG 형식으로 변환

- PNG/JPG 로고는 [Vectorizer.ai](https://vectorizer.ai/) 또는 [Convertio](https://convertio.co/png-svg/)에서 SVG로 변환
- 또는 Figma, Adobe Illustrator에서 직접 추출

### 3. 다크/라이트 모드 호환성 확보

SVG 파일 내부의 색상을 `currentColor`로 변경:

```svg
<!-- 변경 전 -->
<path fill="#000000" d="M..."/>

<!-- 변경 후 -->
<path fill="currentColor" d="M..."/>
```

### 4. 파일 교체

플레이스홀더를 실제 로고로 교체:

```bash
# 예: WSOP 로고 교체
mv wsop-logo.svg public/logos/wsop.svg
```

## 📐 권장 사양

- **포맷**: SVG (벡터 형식)
- **크기**: 최소 100x40px (비율 자유)
- **색상**: `currentColor` 사용 (테마 자동 적응)
- **파일 크기**: 50KB 미만 권장
- **투명 배경**: 권장

## 🔍 로고 소스 찾기

### 공식 웹사이트
각 투어의 공식 사이트 Press Kit/Media 섹션 확인

### 오픈 소스 로고
- [Wikimedia Commons](https://commons.wikimedia.org/)
- [Brands of the World](https://www.brandsoftheworld.com/)

### 저작권 주의
- 로고 사용 전 라이선스 확인
- 상업적 사용 시 허가 필요 여부 체크

## 🎯 로고 사용 위치

로고는 다음 세 곳에 자동으로 표시됩니다:

1. **Archive 카테고리 필터 버튼** (16x16px)
2. **Tournament/Event 카드** (24x24px)
3. **Folder 리스트** (24x24px)

## 🤖 자동 생성 스크립트

플레이스홀더 재생성:

```bash
npx tsx scripts/generate-placeholder-logos.ts
```

## 📝 참고

- 로고 파일명은 `tournament-categories.ts`의 `id` 필드와 일치해야 합니다
- 새 투어 추가 시 해당 ID로 SVG 파일 생성
- 플레이스홀더는 자동으로 건너뛰어짐 (기존 파일 보존)
