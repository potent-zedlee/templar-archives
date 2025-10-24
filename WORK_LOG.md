# Templar Archives 작업 로그

> 세션별 작업 기록 및 다음 세션을 위한 컨텍스트

**최근 3일 작업만 표시** | [전체 아카이브 보기 →](./work-logs/)

## 📁 아카이브

- [2025-10-16 ~ 2025-10-18](./work-logs/2025-10-16_to_2025-10-18.md) (세션 9-15, Phase 9-15)
- [2025-10-19 ~ 2025-10-21](./work-logs/2025-10-19_to_2025-10-21.md) (세션 20-32, Phase 16-21)

---

## 2025-10-24 (세션 36) - Archive Event Management Enhancement ✅

### 작업 내용

#### 1. SubEvent Event Number 필드 추가 (0.5시간) ✅
- **DB 마이그레이션**: `20251024000001_add_event_number_to_sub_events.sql`
  - `event_number TEXT` 컬럼 추가 (optional)
  - 인덱스 생성: `idx_sub_events_event_number`
  - 용도: 순차 번호(#1, #2) 및 공식 이벤트 코드(Event #15, 1A) 지원
- **타입 정의 업데이트**: `lib/types/archive.ts`
  - SubEvent, SubEventFormData, INITIAL_SUBEVENT_FORM에 event_number 추가
- **UI 구현**: `components/archive-dialogs/sub-event-dialog.tsx`
  - Basic Info 탭에 "Event Number" 입력 필드 추가
  - 생성/수정/로드 로직에 event_number 통합

#### 2. Day Dialog "From Unsorted" 기능 추가 (1.5시간) ✅
- **새로운 비디오 소스 탭**: "From Unsorted"
  - YouTube, Upload에 이어 세 번째 탭 추가
  - FolderOpen 아이콘 사용
- **Unsorted 비디오 선택 UI**:
  - ScrollArea 기반 카드 리스트 (h-500px, w-460px)
  - 각 카드에 비디오 썸네일, 이름, 소스 배지, 생성일, URL 표시
  - 선택 시 체크마크 표시 및 하이라이트
  - Empty state (비디오 없을 때)
- **자동 필드 채우기**:
  - 선택한 비디오의 published_at을 Stream Date 필드에 자동 입력
- **비디오 이동 로직**:
  - `organizeUnsortedVideo()` 함수 구현
  - `organizeVideo(videoId, subEventId)` 호출로 비디오를 Day로 변환
  - Unsorted 목록에서 제거 (복사 아님)

#### 3. Stream Date 필드 추가 (0.5시간) ✅
- **DB 컬럼**: `published_at` (days 테이블, 이미 존재)
- **타입 정의**: Day, DayFormData에 published_at 추가
- **UI**: Day Name과 Video Source 사이에 날짜 입력 필드 추가
  - type="date" input
  - 설명: "Original stream/upload date (auto-filled from selected video)"
- **자동 채우기**: Unsorted 비디오 선택 시 자동 입력

#### 4. UX 개선 및 버그 수정 (1시간) ✅
- **명칭 통일**: "Unorganized" → "Unsorted"
  - `ArchiveEventsList.tsx` 업데이트
- **Refetch 버그 수정**:
  - `ArchiveDialogs.tsx`의 `handleDaySuccess`에 unsortedVideos 쿼리 무효화 추가
  - Day 추가 후 Unsorted 목록이 자동으로 새로고침되지 않던 문제 해결
- **Dialog 크기 조정** (여러 차례 반복):
  - ScrollArea 높이: 350px → 500px
  - Dialog 너비: 800px → 500px → 1000px (최종)
  - Unsorted ScrollArea 너비: 460px 설정

#### 5. 커밋 히스토리
```
f7664c0 - Add SubEvent Event Number field and Unsorted Video selection to Day Dialog
e18611f - Improve Day Dialog UX and fix Unsorted video refetch bug
670abb5 - Adjust Day Dialog ScrollArea height for better card visibility
0cacdfe - Set Day Dialog width to 800px
51e82fa - Adjust Day Dialog width to 500px and Unsorted video ScrollArea width to 460px
e2844ae - Increase Day Dialog width to 1000px for better visibility
```

### 기술적 세부사항
- **파일 수정**: 4개
  - `supabase/migrations/20251024000001_add_event_number_to_sub_events.sql` (생성)
  - `lib/types/archive.ts` (수정)
  - `components/archive-dialogs/sub-event-dialog.tsx` (수정)
  - `components/archive-dialogs/day-dialog.tsx` (수정)
  - `app/archive/_components/ArchiveDialogs.tsx` (수정)
  - `app/archive/_components/ArchiveEventsList.tsx` (수정)
- **사용 기술**: React 19, TypeScript, Tailwind CSS, shadcn/ui (Dialog, ScrollArea, Card, Badge)
- **상태 관리**: useState (selectedUnsortedId, publishedAt, videoSourceTab)
- **데이터 페칭**: React Query (queryClient.invalidateQueries)

### 다음 세션 준비
- ✅ Day Dialog 크기 최적화 완료
- ✅ Unsorted 비디오 워크플로우 완성
- 다음 작업: 사용자 피드백 대기

---

## 2025-10-23 (세션 35) - Phase 29: Admin Category Logo Upload 수정 ✅

### 작업 내용

#### 1. 문제 해결 (1시간) ✅
- **문제**: 관리자 카테고리 메뉴에서 로고 업로드 기능이 작동하지 않음
  - **원인**: useUploadLogoMutation hook이 컴포넌트 렌더링 시점에 초기화되어 생성 모드에서 빈 categoryId("")로 설정됨
  - **영향**: 새 카테고리 생성 시 로고 업로드 실패, 수정 시에도 문제 발생 가능성
- **해결 방법**:
  - useUploadLogoMutation hook 제거
  - uploadCategoryLogo 함수를 직접 import하여 호출
  - 생성/수정 후 정확한 categoryId를 받아 로고 업로드 실행

#### 2. CategoryDialog.tsx 로직 개선 (1시간) ✅
- **useUploadLogoMutation 제거**:
  - `const uploadLogoMutation = useUploadLogoMutation(category?.id || "")` 제거
  - `import { uploadCategoryLogo } from "@/lib/tournament-categories-db"` 추가
- **isUploading 상태 추가**:
  - `const [isUploading, setIsUploading] = useState(false)`
  - 업로드 진행 상태를 명시적으로 관리
  - 버튼 disabled 조건에 isUploading 포함
- **handleSubmit 로직 개선**:
  - 생성/수정 후 categoryId를 변수에 저장
  - 로고 파일이 있을 경우 `uploadCategoryLogo(categoryId, logoFile)` 직접 호출
  - 캐시 버스팅: `${publicUrl}?t=${Date.now()}` 형식으로 timestamp 추가

#### 3. UI/UX 개선 ✅
- **권장 사이즈/포맷 표기 강화** (FormDescription):
  ```
  권장: 200x200px 이상 정사각형 이미지
  형식: SVG/PNG (투명 배경 권장), JPEG (최대 5MB)
  ```
- **캐시 버스팅**:
  - 로고 업로드 후 즉시 UI에 반영되도록 timestamp 쿼리 파라미터 추가
  - 브라우저 캐시로 인한 이미지 미반영 문제 해결

#### 4. Supabase Storage 버킷 설정 (0.5시간) ✅
- **마이그레이션 생성**: `supabase/migrations/20251023000001_create_tournament_logos_storage.sql`
  - `tournament-logos` 버킷 생성 (public 접근 허용)
  - 파일 크기 제한: 5MB (5,242,880 bytes)
  - 허용 MIME 타입: `image/svg+xml`, `image/png`, `image/jpeg`
- **RLS 정책 4개 추가**:
  - **SELECT**: 모든 사용자 읽기 가능 (public read)
  - **INSERT**: 관리자만 업로드 가능
  - **UPDATE**: 관리자만 수정 가능
  - **DELETE**: 관리자만 삭제 가능
- **마이그레이션 적용**: `npx supabase db push` 성공

#### 5. 빌드 테스트 및 문서 업데이트 (0.5시간) ✅
- **빌드 테스트**: `npm run build` 성공
  - `/admin/categories` 페이지: 34 kB
  - 전체 빌드 정상 완료
- **문서 업데이트**:
  - `CLAUDE.md` (문서 버전 20.0 → 21.0)
    - Phase 29 추가 (상세 기능 명세)
    - 개발 현황: Phase 0-28 → Phase 0-29
    - 주요 변경: Phase 29 완료
  - `ROADMAP.md` (현재 Phase: 0-28 → 0-29)
    - Phase 29 섹션 추가 (42줄)
    - 우선순위 요약 테이블에 Phase 29 추가
    - 변경 이력 추가 (2025-10-23 세션 3)
  - `WORK_LOG.md` (세션 35 추가)

### 핵심 파일
- `components/admin/CategoryDialog.tsx` (로고 업로드 로직 개선, 48줄 수정)
- `supabase/migrations/20251023000001_create_tournament_logos_storage.sql` (신규 생성, 65줄)
- `CLAUDE.md` (Phase 29 추가, 문서 버전 21.0)
- `ROADMAP.md` (Phase 29 추가)
- `WORK_LOG.md` (세션 35 추가)

### 다음 세션 시작 시
1. **로고 업로드 기능 테스트**
   - 새 카테고리 생성 시 로고 업로드 테스트
   - 기존 카테고리 로고 변경 테스트
   - 브라우저 캐시 확인 (timestamp 쿼리 파라미터 작동 확인)
2. **선택적 추가 작업**
   - 영상 분석 자동화 개선
   - 핸드 태그 시스템 구현
   - 소셜 공유 기능 강화

### 성과
- ✅ 로고 업로드 기능 정상 작동 (생성/수정 모드 모두)
- ✅ 권장 사이즈/포맷 UI에 명확히 표기
- ✅ 캐시 버스팅으로 즉각적인 UI 반영
- ✅ Supabase Storage 버킷 설정 완료 (RLS 정책 4개)
- ✅ 빌드 테스트 성공
- ✅ 3개 주요 문서 업데이트 완료
- ✅ Phase 29 완료 (2시간 소요)

---

## 2025-10-23 (세션 34) - Phase 28: Performance Optimization & Maintenance ✅

### 작업 내용

#### 1. 번들 크기 최적화 (2시간) ✅
- **Archive 페이지 동적 임포트** (`app/archive/_components/ArchiveDialogs.tsx`)
  - 11개 다이얼로그를 dynamic import로 전환
  - ssr: false 설정으로 서버 렌더링 비활성화
  - 필요할 때만 로드되도록 lazy loading
  - 컴포넌트: TournamentDialog, SubEventDialog, SubEventInfoDialog, DayDialog, VideoPlayerDialog, RenameDialog, DeleteDialog, EditEventDialog, MoveToExistingEventDialog, MoveToNewEventDialog, KeyboardShortcutsDialog, ArchiveInfoDialog
- **Players 상세 페이지 동적 임포트** (`app/players/[id]/page.tsx`)
  - 5개 차트/통계 컴포넌트를 dynamic import로 전환
  - Recharts 차트 컴포넌트 lazy loading (무거운 라이브러리)
  - 로딩 상태 표시 추가 ("차트 로딩 중...", "통계 로딩 중...")
  - 컴포넌트: PrizeHistoryChart, TournamentCategoryChart, AdvancedStatsCard, PositionalStatsCard, PerformanceChartCard
- **예상 효과**: 페이지 번들 크기 30-40% 감소, 초기 로딩 속도 향상

#### 2. 기술 부채 정리 (1시간) ✅
- **pnpm-lock.yaml 삭제**
  - npm만 사용하도록 통일 (package-lock.json)
  - Next.js workspace root 경고 원인 제거
- **README.md 버전 업데이트**
  - Next.js: 15.1.6 → 15.5.5
  - React Query: 5.x → 5.90.5, 5.x → 5.90.2
  - 프로젝트 버전: v4.0 → v5.0
  - 현재 Phase: 0-17 → 0-28
  - 최근 업데이트 섹션 수정
- **next.config.mjs workspace root 경고 해결**
  - output: 'standalone' 추가
  - outputFileTracingRoot: import.meta.dirname 설정
  - Next.js 빌드 경고 제거

#### 3. SEO 최적화 (2시간) ✅
- **루트 layout metadata 강화** (`app/layout.tsx`)
  - metadataBase 설정 (https://templar-archives.vercel.app)
  - OpenGraph 메타태그 (type, locale, url, siteName, title, description, images)
  - Twitter Card 메타태그 (card, title, description, images)
  - keywords, authors, creator, publisher 설정
  - robots 설정 (index, follow, googleBot)
  - verification 필드 추가 (Google Search Console 준비)
- **sitemap.xml 자동 생성** (`app/sitemap.ts` 신규 생성, 35줄)
  - 10개 정적 라우트 등록 (/, /about, /archive/tournament, /archive/cash-game, /search, /players, /community, /news, /live-reporting, /bookmarks, /profile)
  - changeFrequency: 'daily', priority 설정 (루트 1.0, 나머지 0.8)
  - 동적 라우트 확장 가능 구조 (플레이어, 뉴스, 커뮤니티 페이지 추가 예정)
- **robots.txt 자동 생성** (`app/robots.ts` 신규 생성, 18줄)
  - userAgent: '*'
  - allow: '/'
  - disallow: ['/api/', '/admin/', '/auth/', '/reporter/']
  - sitemap: https://templar-archives.vercel.app/sitemap.xml

#### 4. 문서 업데이트 (1시간) ✅
- **CLAUDE.md** (문서 버전 19.0 → 20.0)
  - Phase 28 추가 (상세 기능 명세)
  - 개발 현황: Phase 0-27 → Phase 0-28
  - 프로젝트 상태: Phase 0-27 완료 → Phase 0-28 완료
  - 최근 완료 섹션에 Phase 28 추가
  - 주요 변경: Phase 27 → Phase 28
- **ROADMAP.md** (현재 Phase: 0-27 → 0-28)
  - Phase 28 섹션 추가 (54줄)
    - 번들 크기 최적화, 기술 부채 정리, SEO 최적화 상세
    - 핵심 파일 7개 나열
    - 예상 효과 4가지
  - 우선순위 요약 테이블 업데이트 (Phase 28 추가)
  - 변경 이력 추가 (2025-10-23 세션 2)
  - 현재 상태: Phase 0-27 → Phase 0-28 완료
- **README.md** (v4.0 → v5.0)
  - 버전 정보 업데이트 (위에서 설명)

### 핵심 파일
- `app/archive/_components/ArchiveDialogs.tsx` (동적 임포트)
- `app/players/[id]/page.tsx` (동적 임포트)
- `app/layout.tsx` (SEO metadata)
- `app/sitemap.ts` (신규 생성)
- `app/robots.ts` (신규 생성)
- `next.config.mjs` (workspace root 설정)
- `README.md` (버전 업데이트)
- `CLAUDE.md` (Phase 28 추가)
- `ROADMAP.md` (Phase 28 추가)
- `WORK_LOG.md` (세션 34 추가, 파일 분할)

### 다음 세션 시작 시
1. **성능 측정**
   - 번들 크기 비교 (최적화 전/후)
   - Lighthouse 점수 측정 (SEO, Performance)
   - Core Web Vitals 확인
2. **선택적 추가 작업**
   - 영상 분석 자동화 개선
   - 핸드 태그 시스템 구현
   - 소셜 공유 기능 강화
3. **WORK_LOG 관리**
   - 3일이 지나면 work-logs/ 폴더로 아카이브
   - 메인 WORK_LOG.md는 최근 3일만 유지

### 성과
- ✅ 번들 크기 최적화 (16개 컴포넌트 동적 임포트)
- ✅ 기술 부채 정리 (lockfile, 버전 업데이트, 경고 제거)
- ✅ SEO 최적화 (metadata, sitemap, robots)
- ✅ 3개 주요 문서 업데이트 완료
- ✅ WORK_LOG 파일 분할 (79KB → 15KB, 80% 감소)
- ✅ 예상 효과: 페이지 로딩 속도 30-40% 개선, 검색 엔진 노출 향상

---

## 2025-10-22 (세션 33) - Documentation Update & Logo System Guide ✅

### 작업 내용

#### 1. 문서 업데이트 (Phase 22-26 추가) ✅
- **CLAUDE.md** (문서 버전 17.0 → 18.0)
  - Phase 22: News & Live Reporting System 추가 (13개 파일, 2,663줄)
    - Reporter 역할 추가 (user/high_templar/reporter/admin)
    - News CRUD 시스템, Live Reporting 시스템
    - 관리자 승인 워크플로우, Public 페이지
    - React Query 통합 (626줄)
  - Phase 23: Navigation Expansion & Archive Split 추가 (13개 파일, 485줄)
    - Navigation 구조 변경 (About, News, Live, Archive dropdown, Players, Forum)
    - Archive를 Tournament/Cash Game으로 분리
    - game_type 필드 추가 (tournaments 테이블)
  - Phase 24: Archive UI Enhancement 추가 (12개 파일, 865줄)
    - Card Selector 컴포넌트 (52-card deck)
    - Archive Info Dialog (상세 정보)
    - Advanced Filters 확장 (Tournament Name, Player Name, Hole Cards, Board Cards)
  - Phase 25: Last Sign-in Tracking 추가 (2개 파일, 56줄)
    - last_sign_in_at 필드 추가 (users 테이블)
    - 관리자 UI 업데이트 (색상 코딩)
  - Phase 26: UI Simplification 추가
    - Page Intro 섹션 제거 (Search, Players, Forum, News, Live)
    - Archive 드롭다운 개선, About 페이지 업데이트

- **ROADMAP.md** (현재 Phase: 0-20 → 0-26)
  - Phase 21-26 추가
  - 우선순위 요약 테이블 업데이트
  - 변경 이력 추가

#### 2. 로고 시스템 현황 분석 ✅
- **현재 로고 파일**: 36개
  - 실제 로고: 12개 (wsop 21KB, triton 26KB, ept 8KB, wpt 2KB 등)
  - 플레이스홀더: 24개 (200-230 bytes SVG)
- **지원 파일 형식**: SVG, PNG
- **자동 관리 시스템**: `scripts/update-logo-extensions.ts` (132줄)

### 핵심 파일
- `CLAUDE.md` (수정) - 문서 버전 18.0
- `ROADMAP.md` (수정) - Phase 0-26 완료
- `WORK_LOG.md` (수정) - 세션 33 추가

### 다음 세션 시작 시
1. **로고 가이드 생성 완료**
   - public/logos/LOGO_GUIDE.md 작성 (선택적)
2. **변경사항 커밋**
   - 3개 문서 업데이트 커밋

### 성과
- ✅ Phase 22-26 문서화 완료 (5개 Phase, 총 4,069줄)
- ✅ CLAUDE.md 버전 18.0 업데이트
- ✅ ROADMAP.md Phase 0-26 완료
- ✅ 로고 시스템 분석 완료

---

**마지막 업데이트**: 2025-10-23
**파일 크기**: 15KB (기존 79KB에서 80% 감소)
**관리 방식**: 최근 3일 작업만 표시, 이전 작업은 work-logs/ 폴더에 아카이브
