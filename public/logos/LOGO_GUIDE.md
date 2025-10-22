# 토너먼트 로고 관리 가이드

> Templar Archives 토너먼트 로고 추가 및 관리 완벽 가이드

**마지막 업데이트**: 2025-10-22

---

## 📚 목차
1. [로고 시스템 개요](#로고-시스템-개요)
2. [지원 파일 형식](#지원-파일-형식)
3. [로고 추가 방법](#로고-추가-방법)
4. [새 투어 추가 방법](#새-투어-추가-방법)
5. [플레이스홀더 로고 교체](#플레이스홀더-로고-교체)
6. [자동 업데이트 스크립트](#자동-업데이트-스크립트)
7. [권장 사양](#권장-사양)
8. [플레이스홀더 목록](#플레이스홀더-목록)

---

## 로고 시스템 개요

### 파일 구조
```
public/logos/
├── wsop.svg              # SVG 로고 (권장)
├── triton.png            # PNG 로고 (대체)
├── ggpoker-uk.png        # PNG 로고 예시
└── ...
```

### 로고 사용 위치
로고는 다음 세 곳에 자동으로 표시됩니다:

1. **Archive 카테고리 필터 버튼** (16x16px)
2. **Tournament/Event 카드** (24x24px)
3. **Folder 리스트** (24x24px)

### 현재 상태 (2025-10-22)
- **총 36개 로고 파일**
- **실제 로고**: 12개 (wsop, triton, ept, wpt, ggpoker-uk, 888poker, global-poker, hendon-mob, rungood, pokerstars-open, merit-poker, 888poker-live)
- **플레이스홀더**: 24개 (200-230 bytes 작은 SVG)

---

## 지원 파일 형식

### SVG (권장) ✅
- **장점**:
  - 벡터 형식으로 무한 확대 가능
  - 파일 크기 작음 (평균 5-20KB)
  - 다크/라이트 모드 자동 적응 (`currentColor` 사용)
- **단점**:
  - 복잡한 로고는 PNG보다 클 수 있음

### PNG (대체) ✅
- **장점**:
  - 모든 브라우저에서 지원
  - 포토샵/일러스트 등에서 쉽게 생성
- **단점**:
  - 래스터 형식으로 확대 시 깨짐
  - 파일 크기 큼 (평균 15-30KB)

---

## 로고 추가 방법

### 1단계: 로고 파일 준비

#### SVG 로고 (권장)
1. 공식 웹사이트에서 SVG 로고 다운로드
2. 또는 PNG/JPG를 [Vectorizer.ai](https://vectorizer.ai/)에서 SVG로 변환

#### PNG 로고 (대체)
1. 공식 웹사이트에서 PNG 로고 다운로드
2. 투명 배경 권장

### 2단계: 파일명 확인
- **파일명 규칙**: `{tournament-id}.{svg|png}`
- **tournament-id**: `lib/tournament-categories.ts`의 `id` 필드와 동일해야 함

**예시**:
```
wsop.svg         → id: 'wsop'
triton.png       → id: 'triton'
ggpoker-uk.png   → id: 'ggpoker-uk'
```

### 3단계: 파일 저장
```bash
# 로고 파일을 public/logos/ 폴더에 저장
cp your-logo.svg public/logos/wsop.svg
```

### 4단계: 자동 업데이트 실행
```bash
# 자동 업데이트 스크립트 실행
npx tsx scripts/update-logo-extensions.ts

# 출력 예시:
# 🔍 로고 파일 스캔 시작...
# 📊 발견된 로고 파일: 36개
# ─────────────────────────────────────
#   wsop.svg (21 KB)
#   triton.png (26 KB)
#   ...
# 📝 tournament-categories.ts 업데이트 중...
#   📝 wsop: .svg → .svg (변경 없음)
#   📝 ggpoker-uk: .svg → .png (자동 업데이트)
# ✅ 1개 logoUrl 업데이트 완료!
```

---

## 새 투어 추가 방법

### 1단계: tournament-categories.ts 편집

**파일**: `lib/tournament-categories.ts`

**추가할 위치**: `TOURNAMENT_CATEGORIES` 배열 내부 (알파벳 순서 권장)

**템플릿**:
```typescript
{
  id: 'my-new-tour',                  // 고유 ID (URL-safe, 로고 파일명과 동일)
  name: 'My New Poker Tour',         // 정식 명칭
  displayName: 'My New Tour',        // UI 표시명 (짧은 버전)
  shortName: 'MNT',                  // 약칭 (선택)
  aliases: ['MNT', 'My New Tour'],   // 별칭 배열 (기존 데이터 호환용)
  logoUrl: '/logos/my-new-tour.svg', // 로고 경로
  region: 'premier',                 // 카테고리: premier/regional/online/specialty
  priority: 50,                      // 인기순 정렬 (낮을수록 우선, 0-100)
  website: 'https://example.com',    // 공식 웹사이트 (선택)
  isActive: true,                    // 활성 투어 여부
  theme: {                           // 3D 배너 테마 색상 (선택)
    gradient: 'from-blue-900 via-blue-800 to-blue-700',
    text: 'text-white',
    shadow: 'shadow-blue-900/50',
  },
}
```

### 2단계: 로고 파일 추가
```bash
# 로고 파일을 public/logos/에 저장
cp my-new-tour-logo.svg public/logos/my-new-tour.svg
```

### 3단계: 자동 업데이트 실행
```bash
npx tsx scripts/update-logo-extensions.ts
```

### 4단계: 빌드 및 테스트
```bash
# 빌드하여 TypeScript 에러 확인
npm run build

# 개발 서버 실행
npm run dev

# http://localhost:3000
# Archive 페이지에서 새 투어 로고 확인
```

---

## 플레이스홀더 로고 교체

### 교체 필요한 24개 투어

#### Regional Tours (지역별 투어)
1. `apt.svg` - Asian Poker Tour
2. `apl.svg` - Asian Poker League
3. `appt.svg` - Asia Pacific Poker Tour
4. `australian-poker-open.svg` - Australian Poker Open
5. `lapt.svg` - Latin American Poker Tour
6. `bsop.svg` - Brazilian Series of Poker
7. `irish-poker-tour.svg` - Irish Poker Tour
8. `unibet-open.svg` - Unibet Open

#### Specialty/Premier (특별 시리즈)
9. `wsope.svg` - World Series of Poker Europe
10. `napt.svg` - North American Poker Tour
11. `super-high-roller-bowl.svg` - Super High Roller Bowl
12. `poker-masters.svg` - Poker Masters
13. `us-poker-open.svg` - US Poker Open
14. `pokergo-tour.svg` - PokerGO Tour
15. `wsop-paradise.svg` - WSOP Paradise

#### Online (온라인 시리즈)
16. `wcoop.svg` - PokerStars WCOOP
17. `scoop.svg` - PokerStars SCOOP
18. `uscoop.svg` - PokerStars USCOOP
19. `pacoop.svg` - PokerStars PACOOP
20. `oncoop.svg` - PokerStars ONCOOP

#### Other (기타)
21. `hustler.svg` - Hustler Casino Live
22. `ggpoker-uk.svg` - GGPoker UK (PNG는 이미 있음, SVG 추가 가능)
23. `partypoker-live.svg` - partypoker LIVE
24. `aussie-millions.svg` - Aussie Millions (추가 확인 필요)

### 교체 방법
```bash
# 1. 실제 로고 다운로드 또는 제작
# 2. public/logos/ 폴더에 저장 (기존 플레이스홀더 덮어쓰기)
cp apt-real-logo.svg public/logos/apt.svg

# 3. 자동 업데이트 스크립트 실행
npx tsx scripts/update-logo-extensions.ts

# 출력 예시:
#   ✓ apt: .svg → .svg (25.7 KB)  # 파일 크기가 커졌으므로 실제 로고로 인식
```

---

## 자동 업데이트 스크립트

### 스크립트 위치
`scripts/update-logo-extensions.ts` (132줄)

### 기능
1. **SVG/PNG 자동 감지**: public/logos/ 폴더 스캔
2. **더 큰 파일 우선**: 실제 로고 vs 플레이스홀더 구분
3. **tournament-categories.ts 자동 업데이트**: logoUrl 경로 자동 수정

### 실행 방법
```bash
# TypeScript 실행 (tsx 필요)
npx tsx scripts/update-logo-extensions.ts

# 또는 package.json에 스크립트 추가 후
npm run update-logos
```

### 출력 해석
```
🔍 로고 파일 스캔 시작...

📊 발견된 로고 파일: 36개
─────────────────────────────────────
  wsop.svg (21.0 KB)        # 실제 로고
  triton.png (26.0 KB)      # 실제 로고
  apt.svg (0.2 KB)          # 플레이스홀더
  ...

📝 tournament-categories.ts 업데이트 중...

  📝 ggpoker-uk: .svg → .png  # SVG 플레이스홀더를 PNG 실제 로고로 교체

✅ 1개 logoUrl 업데이트 완료!
```

---

## 권장 사양

### SVG 로고
- **크기**: 최소 100x40px (비율 자유)
- **색상**: `currentColor` 사용 (다크/라이트 모드 자동 적응)
  ```svg
  <!-- 변경 전 -->
  <path fill="#000000" d="M..."/>

  <!-- 변경 후 -->
  <path fill="currentColor" d="M..."/>
  ```
- **파일 크기**: 50KB 미만 권장
- **투명 배경**: 권장

### PNG 로고
- **크기**: 최소 200x80px (비율 자유)
- **해상도**: 72 DPI
- **색상 모드**: RGB
- **투명 배경**: 권장 (알파 채널)
- **파일 크기**: 100KB 미만 권장

---

## 로고 소스 찾기

### 공식 웹사이트
각 투어의 공식 사이트 **Press Kit** 또는 **Media** 섹션 확인

**주요 투어 웹사이트**:
- WSOP: https://www.wsop.com (Press → Media Kit)
- WPT: https://www.wpt.com (About → Media)
- EPT: https://www.pokerstars.com/ept (Footer → Press)
- Triton: https://www.triton-series.com
- PokerStars Tours: https://www.pokerstars.com/tours

### 오픈 소스 로고
- [Wikimedia Commons](https://commons.wikimedia.org/) - 라이선스 확인 필수
- [Brands of the World](https://www.brandsoftheworld.com/) - 벡터 로고

### 저작권 주의
- 로고 사용 전 **라이선스 확인** 필수
- **상업적 사용** 시 허가 필요 여부 체크
- **Fair Use** 원칙 준수 (비영리 아카이브 목적)

---

## 플레이스홀더 목록

### 교체 필요한 24개 투어 (파일 크기 200-230 bytes)

| 파일명 | 투어 이름 | 지역 | 우선순위 |
|--------|-----------|------|----------|
| apt.svg | Asian Poker Tour | Regional | 10 |
| apl.svg | Asian Poker League | Regional | 12 |
| appt.svg | Asia Pacific Poker Tour | Regional | 11 |
| australian-poker-open.svg | Australian Poker Open | Regional | 14 |
| lapt.svg | Latin American Poker Tour | Regional | 15 |
| bsop.svg | Brazilian Series of Poker | Regional | 16 |
| irish-poker-tour.svg | Irish Poker Tour | Regional | 17 |
| unibet-open.svg | Unibet Open | Regional | 18 |
| wsope.svg | WSOP Europe | Premier | 5 |
| napt.svg | North American Poker Tour | Premier | 6 |
| super-high-roller-bowl.svg | Super High Roller Bowl | Specialty | 40 |
| poker-masters.svg | Poker Masters | Specialty | 41 |
| us-poker-open.svg | US Poker Open | Specialty | 42 |
| pokergo-tour.svg | PokerGO Tour | Specialty | 43 |
| wsop-paradise.svg | WSOP Paradise | Specialty | 44 |
| wcoop.svg | PokerStars WCOOP | Online | 30 |
| scoop.svg | PokerStars SCOOP | Online | 31 |
| uscoop.svg | PokerStars USCOOP | Online | 32 |
| pacoop.svg | PokerStars PACOOP | Online | 33 |
| oncoop.svg | PokerStars ONCOOP | Online | 34 |
| hustler.svg | Hustler Casino Live | Specialty | 20 |
| partypoker-live.svg | partypoker LIVE | Regional | 55 |
| aussie-millions.svg | Aussie Millions | Regional | 13 |
| ggpoker.svg | GGPoker | Online | 21 |

---

## FAQ

### Q1: SVG와 PNG 중 어느 것을 사용해야 하나요?
**A**: SVG를 권장합니다. 벡터 형식이므로 크기 조정 시 깨지지 않으며, 파일 크기도 작습니다. 다만, 복잡한 로고는 PNG가 더 나을 수 있습니다.

### Q2: 로고 파일을 추가했는데 화면에 나타나지 않습니다.
**A**: 다음을 확인하세요:
1. 파일명이 `lib/tournament-categories.ts`의 `id`와 정확히 일치하는지
2. `npx tsx scripts/update-logo-extensions.ts` 실행했는지
3. 브라우저 캐시 삭제 (`Cmd+Shift+R` 또는 `Ctrl+Shift+R`)
4. 개발 서버 재시작 (`npm run dev`)

### Q3: 동일한 ID로 SVG와 PNG가 모두 있으면 어느 것이 사용되나요?
**A**: 자동 업데이트 스크립트가 **더 큰 파일**을 우선 선택합니다. 실제 로고가 플레이스홀더보다 크기 때문에, 자동으로 실제 로고가 선택됩니다.

### Q4: 새 투어를 추가했는데 Archive 페이지에 나타나지 않습니다.
**A**: `isActive: true`로 설정했는지 확인하세요. `isActive: false`면 화면에 표시되지 않습니다.

### Q5: 로고 색상을 다크/라이트 모드에 맞게 자동 변경하고 싶습니다.
**A**: SVG 로고에서 `fill` 속성을 `currentColor`로 변경하세요:
```svg
<path fill="currentColor" d="M..."/>
```

---

## 참고 자료

- **tournament-categories.ts**: `lib/tournament-categories.ts` (550줄)
- **자동 업데이트 스크립트**: `scripts/update-logo-extensions.ts` (132줄)
- **로고 다운로드 스크립트** (참고용): `scripts/download-pokernews-logos.ts` (145줄)

---

**마지막 업데이트**: 2025-10-22
**버전**: 1.0
**작성자**: Templar Archives Team
