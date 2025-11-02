# Phase 1-33 상세 아카이브

> Templar Archives 프로젝트의 Phase 1부터 Phase 33까지의 상세 개발 내역

**아카이브 생성일**: 2025-11-02
**포함 기간**: Phase 1 ~ Phase 33 (2025-10-16 ~ 2025-10-28)

---

## Phase 1: 핸드 상호작용
- 좋아요/싫어요 (hand_likes 테이블, Optimistic Update)
- 댓글 시스템 (재귀적 대댓글, `hand-comments.tsx`)

## Phase 2: 커뮤니티 강화
- 핸드 첨부 (Tournament → SubEvent → Day → Hand 4단계 선택)
- 북마크 시스템 (폴더, 노트, `bookmark-dialog.tsx`)

## Phase 3: 핸드 수정 요청 ✅
- 수정 제안 시스템 (4가지 유형: basic_info, board, players, actions)
- 3단계 수정 제안 다이얼로그 (EditRequestDialog)
- 핸드 상세 페이지 "수정 제안" 버튼 통합 완료
- 관리자 승인 페이지 (Before/After 비교)
- 내 수정 제안 페이지 (`/my-edit-requests`)

## Phase 4: 관리자 시스템
- 역할 관리 (user/high_templar/admin), 밴 시스템, 활동 로그
- 관리자 페이지 6개 (dashboard, users, claims, edit-requests, content, archive)
- Admin RLS 정책 (역할 변경, 사용자 관리 권한)

## Phase 5: 콘텐츠 신고
- 포스트/댓글 신고, 5가지 신고 사유
- 관리자 승인/거부 워크플로우

## Phase 6: 유저 프로필 고도화
- 소셜 링크, 프로필 가시성 (public/private/friends)
- 통계 캐싱 (자동 업데이트 트리거)

## Phase 7: 커뮤니티 검색
- Full-Text Search (tsvector, GIN 인덱스, 제목/내용 가중치 검색)

## Phase 8: Archive 폴더 네비게이션
- Google Drive 스타일 폴더 네비게이션 (4단계 계층)
- ArchiveBreadcrumb 컴포넌트 (계층적 경로 표시)
- ArchiveFolderList 컴포넌트 (통합 폴더/파일 리스트)
- Unsorted Videos → Unorganized 폴더로 전환
- TournamentDialog 컴포넌트 분리 (코드 구조 개선)

## Phase 9: 코드 품질 및 아키텍처 개선 ✅
- **페이지 리팩토링**: `app/archive/page.tsx` 1,733줄 → 88줄 (-95%)
- **상태 관리 현대화**: 75개 useState → 3개 Zustand stores (총 780줄)
  - `archive-data-store.ts` (230줄) - 데이터 관리
  - `archive-ui-store.ts` (350줄) - UI 상태
  - `archive-form-store.ts` (200줄) - 폼 데이터
- **타입 시스템 구축**: `lib/types/archive.ts` (350줄, 20+ 타입 정의)
  - 114개 `any` 타입 완전 제거
  - Type Guards 및 초기값 상수 제공
- **컴포넌트 분리**: 5개 전용 컴포넌트 (`app/archive/_components/`)
  - `ArchiveProviders.tsx` - DnD + 키보드 단축키
  - `ArchiveToolbar.tsx` - 검색/필터/뷰모드
  - `ArchiveEventsList.tsx` - 이벤트 리스트
  - `ArchiveHandHistory.tsx` - 핸드 히스토리
  - `ArchiveDialogs.tsx` - 11개 다이얼로그 통합 관리
- **동적 임포트**: 모든 다이얼로그 동적 로딩 (초기 번들 크기 감소)

## Phase 10: 성능 최적화 ✅
- **React 메모이제이션**: ArchiveEventsList 컴포넌트
  - 9개 핸들러 함수를 useCallback으로 메모이제이션
  - 의존성 배열 최적화로 불필요한 재생성 방지
- **React.memo 적용**: 2개 핵심 컴포넌트
  - ArchiveFolderList - 대규모 리스트 렌더링 최적화
  - ArchiveBreadcrumb - 네비게이션 최적화
- **번들 분석 도구**: @next/bundle-analyzer 설정
  - `npm run analyze` 명령어로 번들 분석
  - 번들 크기 및 의존성 시각화
- **이미지 최적화**: Next.js Image 컴포넌트 사용 확인
  - 자동 lazy loading, WebP 변환, Responsive images

## Phase 11: UX/UI 개선 ✅
- **Error Boundary 시스템**: 커스텀 Error Boundary 컴포넌트
  - 3개 주요 페이지 적용 (Archive, Community, Search)
  - 기본 + Inline 변형 지원
- **Toast 통합 유틸리티**: `lib/toast-utils.ts`
  - 8개 헬퍼 함수 (toastPromise, tryCatchWithToast 등)
  - API 에러 처리 통합
- **Loading 컴포넌트**: Spinner (sm/md/lg/xl) + Progress (라벨, 단계별)
- **접근성 개선**: ARIA 레이블, role 속성, 시맨틱 HTML

## Phase 12: 테스팅 전략 수립 ✅
- **E2E 테스트 (Playwright)**: 13개 테스트
  - Home, Archive, Community 페이지 테스트
  - 3개 브라우저 지원 (Chromium, Firefox, WebKit)
  - 자동 dev 서버 실행, Trace + 스크린샷
- **유닛 테스트 (Vitest)**: 40+ 테스트
  - Security (SQL + XSS): 11 스위트, 20+ 테스트
  - Validation (Zod): 12 스위트, 15+ 테스트
  - Toast Utils: 9 스위트, 15+ 테스트
  - jsdom 환경, vi.mock() 활용
- **CI/CD 파이프라인 (GitHub Actions)**: 4 Jobs
  - Lint, Unit Test, Build, E2E Test
  - PR 및 Push 트리거, 병렬 실행
  - Playwright 리포트 아티팩트
- **PR 템플릿**: 체크리스트 기반 PR 프로세스

## Phase 13: 보안 강화 ✅
- **보안 유틸리티 모듈**: 4개 파일 (총 900+ 줄)
  - `lib/security/sql-sanitizer.ts` - SQL Injection 방지 (188줄)
  - `lib/security/xss-sanitizer.ts` - XSS 방지 (262줄)
  - `lib/security/csrf.ts` - CSRF 보호 (224줄)
  - `lib/security/index.ts` - 통합 보안 모듈 (227줄)
- **입력 검증 시스템**: `lib/validation/api-schemas.ts`
  - 15개 Zod 스키마 (모든 API 엔드포인트)
  - validateInput, formatValidationErrors 헬퍼
- **API 라우트 보안 강화**: 4개 API 보안 적용
  - natural-search, import-hands, parse-hendon-mob, parse-payout-csv
  - Zod 검증, SQL/XSS 방지, 보안 로깅
- **에러 메시지 보안**: 민감한 정보 필터링
  - 13개 키워드 차단 (password, token, secret 등)
  - Stack trace 및 파일 경로 제거

## Phase 14: Archive UI Redesign ✅
- **수평 로고 바**: Netflix/Spotify 스타일 토너먼트 로고 스크롤 바
  - 선택된 항목 자동 스크롤
  - Horizontal ScrollArea 컴포넌트 활용
- **필터 버튼 중복 제거**: `ArchiveUnifiedFilters` 컴포넌트에 `showToggleButton` prop 추가
  - 조건부 렌더링으로 ArchiveToolbar와 충돌 해결
- **Archive 페이지**: 72.9 kB (최적화 유지)

## Phase 15: 로고 관리 시스템 ✅
- **자동 확장자 감지**: `scripts/update-logo-extensions.ts` (132줄)
  - public/logos/ 폴더 스캔 (.svg/.png 자동 감지)
  - 파일 크기 비교 (큰 파일 우선 - 실제 로고 vs 플레이스홀더)
  - tournament-categories.ts 자동 업데이트
- **실제 로고 다운로드**: pokernews.com/tours에서 12개 로고 다운로드
  - wsop (20.5 KB), triton (25.7 KB), ept (7.8 KB), wpt (2.1 KB) 등
  - `scripts/download-pokernews-logos.ts` (145줄)
- **결과**: 30개 로고 파일 관리, 1개 경로 자동 수정 (ggpoker-uk)

## Phase 16: React Query Migration 완료 ✅
- **데이터 페칭 현대화**: 전체 앱에 @tanstack/react-query 적용
- **Query 파일 생성**: 6개 파일 (총 650줄)
  - `community-queries.ts` (89줄) - 포스트 상세, 좋아요
  - `search-queries.ts` (68줄) - 핸드 검색, 필터 옵션
  - `players-queries.ts` (203줄) - 플레이어 리스트, 상세, 통계, 사진 업로드
  - `profile-queries.ts` (163줄) - 프로필, 닉네임 중복 체크, 아바타 업로드
  - `bookmarks-queries.ts` (79줄) - 북마크 CRUD
  - `edit-requests-queries.ts` (38줄) - 수정 제안 목록
- **페이지 업데이트**: 9개 페이지 리팩토링
  - Community/[id], Search, Players, Players/[id]
  - Profile, Profile/[id], Bookmarks, My Edit Requests
  - 코드 감소: ~200줄 제거 (useState/useEffect → React Query)
- **Optimistic Updates**: 즉각적인 UI 반응
  - Community 포스트 좋아요 (queryClient.setQueryData)
  - 자동 롤백 (onError에서 이전 상태 복원)
- **성능 최적화**:
  - 닉네임 중복 체크 500ms 디바운싱
  - useMemo로 folders/filteredBookmarks 계산
  - 계층적 쿼리 키 패턴 (`['players', 'detail', playerId]`)
- **캐시 전략**:
  - staleTime: 1분~10분 (데이터 특성별 차등 적용)
  - gcTime: 5분 (메모리 관리)
  - refetchOnWindowFocus: false (불필요한 재요청 방지)

## Phase 17: DevTools Optimization ✅
- **프로덕션 번들 최적화**: React Query DevTools 조건부 렌더링
- **수정 사항**: `components/providers.tsx`
  - `process.env.NODE_ENV === 'development'` 체크
  - Tree shaking으로 프로덕션 빌드에서 완전 제거
- **결과**: 프로덕션 번들 크기 감소, 개발자 경험 유지

## Phase 18: Manual Hand Action Input System ✅
- **수동 핸드 액션 입력 시스템**: 관리자가 핸드의 액션 데이터를 수동으로 입력
- **핵심 라이브러리** (515줄):
  - `lib/hand-actions.ts` (297줄) - CRUD 함수, 시퀀스 관리, 유효성 검증
  - `lib/queries/hand-actions-queries.ts` (218줄) - React Query 훅, Optimistic Updates
- **UI 컴포넌트** (547줄):
  - `components/hand-actions/ActionInput.tsx` (178줄) - 액션 입력 폼
  - `components/hand-actions/ActionList.tsx` (141줄) - 액션 목록, 이동/삭제
  - `components/hand-actions/StreetTabs.tsx` (42줄) - Street 탭 네비게이션
  - `components/hand-actions/ActionEditor.tsx` (230줄) - 메인 에디터
- **관리자 페이지**: `app/admin/hands/[id]/edit-actions/page.tsx` (333줄)
- **핸드 상세 페이지 통합**: "Edit Actions" 버튼 추가 (관리자만)
- **기능**:
  - Street별 액션 관리 (Preflop, Flop, Turn, River)
  - 6가지 액션 타입 (fold, check, call, bet, raise, all-in)
  - 액션 순서 관리, Pending Actions 워크플로우
  - 플레이어 통계 캐시 자동 무효화
- **배경**: `hand_actions` 테이블 데이터 생성으로 플레이어 통계 계산 가능

## Phase 19: Archive UI Enhancement ✅
- **필터 간소화**: 불필요한 필터 제거로 사용자 경험 개선
- **Date Range Picker**: From/To 캘린더 도입
- **Quick Filters 라벨 제거**: 더 깔끔한 UI
- **삭제된 필터**: Hand Count Range, Video Sources, Has Hands Only
- **Archive 페이지**: 91.5 kB 유지 (성능 최적화)

## Phase 20: Notification System ✅
- **완전한 알림 시스템**: 실시간 알림, Toast, Optimistic Updates
- **백엔드** (680줄):
  - `supabase/migrations/20251018000026_add_notifications_system.sql` (434줄)
  - `supabase/migrations/20251020000030_add_hand_notification_triggers.sql` (246줄)
  - `notifications` 테이블, RLS 정책, 9개 트리거
- **라이브러리** (497줄):
  - `lib/notifications.ts` (253줄) - 7개 함수, 실시간 구독, 유틸리티
  - `lib/queries/notification-queries.ts` (244줄) - React Query 훅, Optimistic Updates
- **프론트엔드** (544줄):
  - `app/notifications/page.tsx` (299줄) - 알림 페이지 (All/Unread 탭)
  - `components/notification-bell.tsx` (245줄) - 헤더 알림 벨, 실시간 업데이트
- **기능**:
  - 8가지 알림 타입 (comment, reply, like_post, like_comment, edit_approved, edit_rejected, claim_approved, claim_rejected)
  - 실시간 알림 (Supabase Realtime)
  - Toast 알림
  - Optimistic Updates (즉각적인 UI 반응)
  - 자동 폴링 (1분마다 읽지 않은 알림 개수 업데이트)
  - 읽음/읽지 않음 관리
  - 헤더 알림 벨 (읽지 않은 알림 개수 배지)
- **완성도**: 2025-10-18, 2025-10-20 개발 완료

## Phase 21: Player Statistics Enhancement ✅
- **고급 통계 시스템**: 플레이어 통계 분석 고도화
- **React Query 훅** (218줄):
  - `lib/queries/player-stats-queries.ts` - 통계 조회, 캐싱, 포맷팅 유틸리티
  - usePlayerStatsQuery, usePositionalStatsQuery, usePlayStyleQuery
  - staleTime: 10분, gcTime: 30분 (효율적인 캐싱)
- **UI 컴포넌트** (3개, 총 약 500줄):
  - `components/player-stats/AdvancedStatsCard.tsx` - VPIP, PFR, 3-Bet, ATS, 승률, 평균 팟 크기, 플레이 스타일
  - `components/player-stats/PositionalStatsCard.tsx` - 포지션별 통계 테이블 (BTN, CO, MP, UTG, SB, BB)
  - `components/player-stats/PerformanceChartCard.tsx` - Recharts 기반 성과 차트 (바 차트, 레이더 차트)
- **플레이어 페이지 통합**: `app/players/[id]/page.tsx` 업데이트
  - 기존 5개 통계 카드를 AdvancedStatsCard로 교체
  - 포지션별 통계 및 성과 차트 추가
- **Empty State 처리**: 데이터 없을 때 안내 메시지 표시
- **기존 lib/player-stats.ts 활용**: 이미 구현된 통계 계산 함수 사용 (446줄)
  - calculatePlayerStatistics, calculatePositionStats, classifyPlayStyle
  - VPIP, PFR, 3-Bet, ATS, Win Rate 계산
- **완성도**: 2025-10-21 개발 완료

## Phase 22: News & Live Reporting System ✅
- **Reporter 역할 추가**: user/high_templar/reporter/admin 4단계 역할 시스템
- **News 시스템** (완전한 CRUD):
  - 뉴스 작성/수정/삭제 (`/reporter/news`)
  - 5가지 카테고리 (Tournament News, Player News, Industry, General, Other)
  - Markdown 에디터, 이미지 업로드 (Supabase Storage)
  - 상태 워크플로우: draft → pending → published
  - 태그 관리, 외부 링크 지원
- **Live Reporting 시스템** (실시간 리포팅):
  - 라이브 리포트 작성/수정/삭제 (`/reporter/live`)
  - 5가지 카테고리 (Tournament Update, Chip Counts, Breaking News, Results, Other)
  - LIVE 배지 표시
  - 동일한 승인 워크플로우
- **관리자 승인 시스템**:
  - News/Live Reports Approval 탭 (`/admin/content`)
  - 전체 콘텐츠 미리보기 다이얼로그
  - Approve/Reject 버튼
- **Public 페이지**:
  - `/news` - 뉴스 목록 (카테고리 필터)
  - `/news/[id]` - 뉴스 상세 (Markdown 렌더링)
  - `/live-reporting` - 라이브 리포트 목록
  - `/live-reporting/[id]` - 라이브 리포트 상세
- **React Query 통합**:
  - `lib/queries/news-queries.ts` (313줄)
  - `lib/queries/live-reports-queries.ts` (313줄)
  - Optimistic Updates
- **파일**: 13개 파일, 2,663줄 추가
- **마이그레이션**: `20251022000002_add_news_and_live_reports.sql`
- **완성도**: 2025-10-22 개발 완료

## Phase 23: Navigation Expansion & Archive Split ✅
- **Navigation 구조 변경**:
  - 기존: About, Archive, Players, Community, Search
  - 신규: About, News, Live, Archive (dropdown), Players, Forum
  - Archive 드롭다운: Tournament, Cash Game, Search
- **Archive 분리**:
  - `/archive/tournament` - 토너먼트 전용 페이지
  - `/archive/cash-game` - 캐시 게임 전용 페이지
  - `/archive` → `/archive/tournament` 자동 리다이렉트
- **game_type 필드 추가** (tournaments 테이블):
  - tournament / cash-game 구분
  - TournamentDialog에 game_type 선택 추가
  - 쿼리 자동 필터링
- **파일**: 13개 파일, 485줄 추가
- **마이그레이션**: `20251022000001_add_game_type_to_tournaments.sql`
- **완성도**: 2025-10-22 개발 완료

## Phase 24: Archive UI Enhancement ✅
- **Card Selector 컴포넌트** (`components/card-selector.tsx` 171줄):
  - 52-card 포커 덱 인터랙티브 선택
  - 멀티 셀렉트 (홀카드 2장, 보드 5장)
  - Suit 색상 및 선택 상태 시각화
  - Clear all, 개별 카드 제거
- **Archive Info Dialog** (`components/archive-info-dialog.tsx` 345줄):
  - Tournament/SubEvent/Day 상세 정보 표시
  - 레벨별 렌더링 (계층 구조 반영)
  - 관리자 액션: Edit/Delete 버튼
  - 아이콘 및 배지 리치 디스플레이
- **Advanced Filters 확장** (4개 신규 필터):
  - Tournament Name 텍스트 필터
  - Player Name 텍스트 필터
  - Hole Cards 선택기 (최대 2장)
  - Board Cards 선택기 (최대 5장)
  - Active filter counter 및 "Reset Quick" 버튼
- **Filtering Logic 구현**:
  - Tournament Name: tournaments, subevents 필터링
  - Player Name: hand_players로 핸드 필터링
  - Hole Cards: player_cards로 핸드 필터링
  - Board Cards: community_cards로 핸드 필터링
- **UI 개선**:
  - 모든 폴더 아이템에 Info 아이콘 (호버 표시)
  - Grid/Timeline 뷰 모드 제거 (List only)
  - 뷰 모드 키보드 단축키 삭제
  - Tailwind grid-cols-13 추가 (카드 덱 레이아웃)
- **파일**: 12개 파일, 865줄 추가
- **완성도**: 2025-10-22 개발 완료

## Phase 25: Last Sign-in Tracking ✅
- **last_sign_in_at 필드 추가** (users 테이블):
  - auth.users 테이블과 자동 동기화 트리거
  - 기존 유저 데이터 초기화
  - 성능 인덱스 (last_sign_in_at DESC)
- **관리자 UI 업데이트** (`/admin/users`):
  - 마지막 로그인 날짜 표시
  - 색상 코딩:
    - 🟢 Green: 7일 이내 (활성 유저)
    - ⚫ Gray: 30일 이상 (비활성 유저)
    - 기본: 7-30일
  - "Never" 표시 (로그인 기록 없음)
- **파일**: 2개 파일, 56줄 추가
- **마이그레이션**: `20251021000032_add_last_sign_in_tracking.sql`
- **완성도**: 2025-10-21 개발 완료

## Phase 26: UI Simplification ✅
- **Page Intro 섹션 제거**: 더 깔끔한 UI를 위한 간소화
  - Search 페이지
  - Players 페이지
  - Forum (Community) 페이지
  - News 페이지
  - Live Reporting 페이지
- **Archive 드롭다운 개선**:
  - Search 메뉴 추가
  - Tournament/Cash Game/Search 3개 항목
- **About 페이지 업데이트**:
  - News & Live Reporting 기능 소개 추가
  - 기능 설명 업데이트
- **완성도**: 2025-10-22 개발 완료

## Phase 27: Quick Upload Enhancement & YouTube API Optimization ✅
- **Quick Upload 계층 선택 기능 추가** (커밋 a3790c5):
  - Tournament → SubEvent → Day 계층 구조 직접 선택
  - YouTube 탭과 Local File 탭 모두 적용
  - 드롭다운 셀렉트 UI (3단계 캐스케이딩)
  - "Add to Unsorted" 체크박스로 기존 동작 유지
  - Create New Day 옵션 추가
- **YouTube API Quota 최적화** (커밋 418179f):
  - 메인 페이지 라이브 스트림 섹션 완전 삭제
    - `components/main/live-poker-streams.tsx` 삭제
    - `app/api/youtube/live-streams/route.ts` 삭제
  - Channel ID 직접 입력 옵션 추가 (Quick Upload)
    - RadioGroup으로 URL/ID 방식 선택
    - Channel ID 직접 입력 시 API 호출 생략
  - API 쿼터 사용량: 200% → 50-80%로 감소
  - 메인 페이지 번들 크기: 7.14 kB → 5.97 kB (-16%)
- **Channel Not Found 버그 수정** (커밋 c1645b7):
  - `inputMethod` 파라미터 처리 추가
  - API route에서 URL/ID 방식 구분 로직 구현
  - Channel ID 형식 검증 (UC로 시작, 24자)
  - 채널 URL 입력 시 정상 작동
- **핵심 파일**:
  - `components/quick-upload-dialog.tsx` (수정)
  - `app/api/youtube/channel-streams/route.ts` (수정)
  - `app/page.tsx` (수정)
  - `components/main/live-poker-streams.tsx` (삭제)
  - `app/api/youtube/live-streams/route.ts` (삭제)
- **완성도**: 2025-10-23 개발 완료

## Phase 28: Performance Optimization & Maintenance ✅
- **번들 크기 최적화** (2시간):
  - Archive 페이지 동적 임포트 (11개 다이얼로그)
    - `app/archive/_components/ArchiveDialogs.tsx` 수정
    - Dynamic import로 필요할 때만 로드
  - Players 상세 페이지 동적 임포트 (5개 차트/통계 컴포넌트)
    - `app/players/[id]/page.tsx` 수정
    - Recharts 차트 컴포넌트 lazy loading
    - 로딩 상태 표시 추가
- **기술 부채 정리** (1시간):
  - pnpm-lock.yaml 삭제 (npm만 사용)
  - README.md 버전 업데이트 (15.1.6 → 15.5.5, v4.0 → v5.0)
  - next.config.mjs workspace root 경고 해결
    - output: 'standalone' 추가
    - outputFileTracingRoot 설정
- **SEO 최적화** (2시간):
  - 루트 layout metadata 강화
    - OpenGraph, Twitter Card 메타태그
    - keywords, authors, robots 설정
  - sitemap.xml 자동 생성 (`app/sitemap.ts`)
    - 10개 정적 라우트 등록
    - 동적 라우트 확장 가능
  - robots.txt 자동 생성 (`app/robots.ts`)
    - API, admin, auth 경로 차단
    - sitemap 위치 명시
- **핵심 파일**:
  - `app/archive/_components/ArchiveDialogs.tsx` (동적 임포트)
  - `app/players/[id]/page.tsx` (동적 임포트)
  - `app/layout.tsx` (SEO metadata)
  - `app/sitemap.ts` (신규 생성)
  - `app/robots.ts` (신규 생성)
  - `next.config.mjs` (workspace root 설정)
  - `README.md` (버전 업데이트)
- **예상 효과**:
  - 페이지 로딩 속도 30-40% 개선
  - 번들 크기 감소로 초기 로드 속도 향상
  - 검색 엔진 노출 개선
- **완성도**: 2025-10-23 개발 완료

## Phase 29: Admin Category Logo Upload 수정 ✅
- **문제 해결**: 관리자 카테고리 메뉴에서 로고 업로드 기능이 작동하지 않는 문제 수정
  - **원인**: useUploadLogoMutation이 컴포넌트 렌더링 시점에 초기화되어 생성 모드에서 빈 categoryId로 설정됨
  - **해결**: uploadCategoryLogo 함수를 직접 호출하여 정확한 categoryId 사용
- **CategoryDialog.tsx 수정**:
  - useUploadLogoMutation hook 제거
  - uploadCategoryLogo 직접 import 및 호출
  - isUploading 상태 추가로 업로드 진행 상태 표시
  - 생성/수정 모드 모두에서 정확한 categoryId로 로고 업로드
- **권장 사이즈/포맷 표기 강화**:
  - FormDescription 업데이트
  - **권장**: 200x200px 이상 정사각형 이미지
  - **형식**: SVG/PNG (투명 배경 권장), JPEG (최대 5MB)
- **캐시 버스팅 추가**:
  - 로고 업로드 후 URL에 timestamp 쿼리 파라미터 추가
  - 브라우저 캐시로 인한 표시 문제 해결
  - `${publicUrl}?t=${Date.now()}` 형식
- **Supabase Storage 버킷 설정**:
  - `tournament-logos` 버킷 생성 (public, 5MB 제한)
  - RLS 정책 4개 추가 (SELECT: 모든 사용자, INSERT/UPDATE/DELETE: 관리자만)
  - 마이그레이션: `20251023000001_create_tournament_logos_storage.sql`
- **핵심 파일**:
  - `components/admin/CategoryDialog.tsx` (로고 업로드 로직 개선)
  - `supabase/migrations/20251023000001_create_tournament_logos_storage.sql` (신규 생성)
- **완성도**: 2025-10-23 개발 완료

## Phase 30: Archive Event Management Enhancement ✅
- **SubEvent Event Number 필드 추가** (0.5시간):
  - DB 마이그레이션: `20251024000001_add_event_number_to_sub_events.sql`
  - `event_number TEXT` 컬럼 추가 (optional)
  - 인덱스 생성: `idx_sub_events_event_number`
  - 용도: 순차 번호(#1, #2) 및 공식 이벤트 코드(Event #15, 1A) 지원
  - SubEventDialog UI에 Event Number 입력 필드 추가
- **Day Dialog "From Unsorted" 기능 추가** (1.5시간):
  - 세 번째 비디오 소스 탭 추가 (YouTube, Upload, From Unsorted)
  - ScrollArea 기반 카드 리스트 UI (h-500px, w-460px)
  - 각 카드에 비디오 썸네일, 이름, 소스 배지, 생성일, URL 표시
  - 선택 시 체크마크 및 하이라이트
  - `organizeUnsortedVideo()` 함수로 비디오를 Day로 변환 (이동, 복사 아님)
  - Empty state 처리
- **Stream Date 필드 추가** (0.5시간):
  - Day에 `published_at` 필드 추가 (이미 존재하던 컬럼 활용)
  - Day Name과 Video Source 사이에 날짜 입력 필드 추가
  - Unsorted 비디오 선택 시 published_at 자동 입력
- **UX 개선 및 버그 수정** (1시간):
  - 명칭 통일: "Unorganized" → "Unsorted"
  - Refetch 버그 수정: Day 추가 후 Unsorted 목록 자동 새로고침
  - Dialog 크기 조정: 800px → 500px → 1000px (최종)
  - Unsorted ScrollArea 너비: 460px 설정
- **커밋**:
  - f7664c0: Add SubEvent Event Number field and Unsorted Video selection to Day Dialog
  - e18611f: Improve Day Dialog UX and fix Unsorted video refetch bug
  - 670abb5: Adjust Day Dialog ScrollArea height for better card visibility
  - 0cacdfe: Set Day Dialog width to 800px
  - 51e82fa: Adjust Day Dialog width to 500px and Unsorted video ScrollArea width to 460px
  - e2844ae: Increase Day Dialog width to 1000px for better visibility
- **핵심 파일**:
  - `supabase/migrations/20251024000001_add_event_number_to_sub_events.sql` (신규)
  - `lib/types/archive.ts` (수정)
  - `components/archive-dialogs/sub-event-dialog.tsx` (수정)
  - `components/archive-dialogs/day-dialog.tsx` (수정)
  - `app/archive/_components/ArchiveDialogs.tsx` (수정)
  - `app/archive/_components/ArchiveEventsList.tsx` (수정)
- **완성도**: 2025-10-24 개발 완료

## Phase 31: Archive Security Enhancement & Admin Management Page ✅
- **Server Actions 생성** (2시간):
  - `app/actions/archive.ts` 파일 생성 (670줄)
  - 9개 Server Action 함수:
    - createTournament, updateTournament, deleteTournament
    - createSubEvent, updateSubEvent, deleteSubEvent
    - createDay, updateDay, deleteDay
  - 서버 사이드 관리자 권한 검증 (`verifyAdmin()`)
  - 클라이언트 우회 불가능한 보안 강화
  - Payout 관리 Server Action 추가 (`saveEventPayouts`)
  - Rename 통합 Server Action (`renameItem`)
- **Dialog 컴포넌트 Server Actions 적용** (2시간):
  - 5개 Dialog 컴포넌트 수정 (총 ~200줄 변경):
    - `components/tournament-dialog.tsx`
    - `components/archive-dialogs/delete-dialog.tsx`
    - `components/archive-dialogs/rename-dialog.tsx`
    - `components/archive-dialogs/sub-event-dialog.tsx`
    - `components/archive-dialogs/day-dialog.tsx`
  - 직접 Supabase 클라이언트 호출 제거
  - Server Actions 호출로 교체
  - 타입 안전성 개선 ('unorganized', 'unsorted' 처리)
- **Admin Archive 관리 페이지** (1.5시간):
  - `/admin/archive` 페이지 생성 (365줄)
  - 토너먼트 관리 테이블 뷰
  - 검색 및 필터링 (Category, Game Type)
  - 기존 TournamentDialog 재사용
  - 관리자 전용 접근 제어
  - CRUD 작업 통합
- **보안 개선 사항**:
  - 모든 write 작업에 서버 사이드 관리자 체크
  - `lib/auth-utils.ts`의 `isAdmin(email)` 함수 활용
  - revalidatePath로 캐시 무효화
  - 에러 처리 및 로깅 개선
- **커밋**:
  - 51066c4: Add Server Actions for Archive security - Phase 1 complete
  - bfb4b2f: Add Admin Archive management page - Phase 2 complete
- **핵심 파일**:
  - `app/actions/archive.ts` (신규, 670줄)
  - `app/admin/archive/page.tsx` (신규, 365줄)
  - 5개 Dialog 컴포넌트 (수정)
- **완성도**: 2025-10-24 개발 완료

## Phase 32: Comprehensive Security Enhancement ✅
- **Server Actions 인증 강화** (1.5시간):
  - Email 화이트리스트 → DB 역할 기반 검증으로 변경
  - Ban 상태 체크 추가 (banned_at 필드 검증)
  - `verifyAdmin()` 함수 로직 개선 (`app/actions/archive.ts`)
- **RLS 정책 강화** (2시간):
  - 6개 핵심 테이블 admin-only write 제한
    - tournaments, sub_events, days, hands, players, hand_players
  - 모든 INSERT/UPDATE/DELETE 작업에 역할 및 밴 상태 체크
  - 마이그레이션: `20251024000001_fix_rls_admin_only.sql` (357줄)
- **Natural Search API 재설계** (2시간):
  - 위험한 SQL 생성 방식 → 안전한 JSON 필터 방식
  - `lib/natural-search-filter.ts` (277줄) - 15개 필터 타입, Zod 검증
  - Claude API는 JSON 객체 생성, Query Builder로 안전하게 쿼리 구성
  - `execute_search_query` RPC 함수 삭제 (SQL Injection 벡터 제거)
- **CSRF 보호 추가** (0.5시간):
  - `app/api/import-hands/route.ts`에 `verifyCSRF()` 추가
  - Origin/Referer 검증으로 CSRF 공격 방어
- **파일 업로드 검증 강화** (1.5시간):
  - `lib/file-upload-validator.ts` (212줄) - Magic Number 검증
  - MIME 타입과 실제 파일 시그니처 비교
  - 7개 파일 타입 지원 (JPEG, PNG, WebP, GIF, MP4, QuickTime, WebM)
  - 파일명 Sanitization, 크기 제한 (이미지 5MB, 비디오 500MB)
- **Rate Limiting 개선** (1시간):
  - IP 기반 → User ID 기반 (JWT 파싱)
  - VPN 우회 방지, 계정당 정확한 Rate Limit
  - `lib/rate-limit.ts` 업데이트
- **입력 Sanitization 강화** (0.5시간):
  - LIKE 패턴 이스케이프 (`escapeLikePattern()`)
  - SQL 와일드카드 문자 처리 (%, _, \)
  - `lib/admin.ts` 사용자 검색에 적용
- **환경 변수 중앙 관리** (1시간):
  - `lib/env.ts` (125줄) - 타입 안전한 환경 변수 관리
  - 런타임 검증, 누락된 변수 조기 감지
  - 5개 환경 변수 객체 (supabaseEnv, claudeEnv, youtubeEnv, redisEnv, appEnv)
- **파일**:
  - 5개 생성 (1,001줄): natural-search-filter.ts, file-upload-validator.ts, env.ts, 2개 마이그레이션
  - 5개 수정: archive.ts, natural-search/route.ts, import-hands/route.ts, rate-limit.ts, admin.ts
- **보안 등급**: B+ → A (포괄적 보안 강화)
- **완성도**: 2025-10-24 개발 완료
- **UI/Admin 개선 작업** (3시간, 2025-10-27):
  - Archive 페이지 UX/UI 개선 (색상 70% 투명도, 간격/레이아웃, 타이포그래피, 애니메이션)
  - Admin Archive 정렬 기능 추가 (5개 컬럼: Name, Category, Type, Location, Date)
  - Unsorted Videos 정렬 기능 추가 (4개 컬럼: Name, Source, Created, Published)
  - Admin Category 필드 제거 (Region, Priority, Website)
  - 5개 커밋 (cd0df3b, a9fe3aa, 35ed27d, 08b38b6, 7e7a1a6)
  - 4개 파일 수정 (122줄 삭제)

## Phase 33: Archive Single Mode Accordion ✅
- **Accordion 동작 변경** (0.5시간):
  - Multiple → Single Mode 전환
  - 한 번에 하나의 Tournament/SubEvent만 열림
  - Tournament 변경 시 SubEvent 자동 닫힘
- **Zustand Store 수정** (stores/archive-ui-store.ts):
  - `expandedTournaments: Set<string>` → `expandedTournament: string | null`
  - `expandedSubEvents: Set<string>` → `expandedSubEvent: string | null`
  - 토글 로직: 같은 ID → 닫기 (null), 다른 ID → 현재 닫고 새 항목 열기
  - `expandAll/collapseAll` 함수 제거 (Single mode에서 불필요)
- **컴포넌트 업데이트** (0.3시간):
  - ArchiveEventsList: `Set.has(id)` → `expandedTournament === id` 비교로 변경
  - useMemo 의존성 배열 업데이트 (Set → string | null)
- **애니메이션 추가** (0.2시간):
  - Tournament 레벨: Framer Motion AnimatePresence 적용
  - SubEvent 레벨: Framer Motion AnimatePresence 적용
  - 전환 효과: duration 0.3s, easeInOut
  - opacity: 0 → 1, height: 0 → auto
- **결과**:
  - 3개 파일 수정 (+54줄, -68줄)
  - 더 깔끔한 UI (한 번에 하나만 열림)
  - 부드러운 애니메이션으로 UX 개선
  - 모바일 친화적 (스크롤 감소)
- **커밋**: 1753fd9
- **완성도**: 2025-10-28 개발 및 배포 완료

---

## 추가 완료 기능
- Archive 카테고리 필터 (WSOP, Triton, EPT, Hustler, APT, APL, GGPOKER)
- 브랜딩: GGVault → Templar Archives (로고 "TA", 파비콘 Protoss Carrier)
- 플레이어 클레임 시스템 (소셜 미디어/이메일 인증, 관리자 승인)
- YouTube 라이브 스트림 (채널 ID 하드코딩, 1시간 캐시, 12시간 운영)

---

**아카이브 생성일**: 2025-11-02
**총 Phase 수**: 33개
**개발 기간**: 2025-10-16 ~ 2025-10-28
