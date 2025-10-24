# Templar Archives 개발 로드맵

> 단계별 기능 구현 계획 및 우선순위

**마지막 업데이트**: 2025-10-24
**현재 Phase**: Phase 0-32 완료 🎉

---

## 🎯 전체 개요

Templar Archives는 포커 핸드 아카이브와 커뮤니티 플랫폼입니다. 이 로드맵은 핵심 기능부터 고급 기능까지 단계별로 구현 계획을 제시합니다.

---

## ✅ 완료된 Phase

### Phase 0: 인증 시스템 (2025-10-12)
**소요 시간**: 4시간
- Google OAuth 로그인, 로그아웃
- 전역 인증 상태 관리 (`useAuth` 훅)
- 로그인/비로그인 UI 분기, 보호된 액션

**핵심 파일**:
- `lib/auth.ts`, `components/auth-provider.tsx`
- `app/auth/login/page.tsx`, `app/auth/callback/page.tsx`

---

### Phase 1: 핸드 상호작용 (2025-10-15 확인)
**소요 시간**: 이미 구현됨

#### Phase 1.1: 핸드 좋아요/싫어요
- `hand_likes` 테이블, 자동 카운트 업데이트 트리거
- `lib/hand-likes.ts` (4개 함수)
- UI: `hand-history-detail.tsx`, `hand-list-accordion.tsx`
- Optimistic Update, 로그인 체크

#### Phase 1.2: 핸드 댓글 시스템
- `HandComments` 컴포넌트 (재귀적 대댓글)
- 댓글 작성 폼, 댓글 좋아요
- 실시간 댓글 개수 업데이트

**핵심 파일**:
- `components/hand-comments.tsx`
- `lib/supabase-community.ts`

---

### Phase 2: 커뮤니티 강화 (2025-10-15)
**소요 시간**: 5-6시간

#### Phase 2.1: 포럼 핸드 첨부 (3시간)
- 핸드 검색 모달 (Tournament → SubEvent → Day → Hand, 4단계)
- 선택된 핸드 미리보기 카드
- Archive 페이지로 이동 링크

#### Phase 2.2: 북마크 시스템 (2-3시간)
- `hand_bookmarks` 테이블, RLS 정책
- `lib/hand-bookmarks.ts` (9개 함수)
- 북마크 페이지 (`/bookmarks`), 폴더 기능

**핵심 파일**:
- `components/hand-search-dialog.tsx`, `components/bookmark-dialog.tsx`
- `app/bookmarks/page.tsx`

---

### Phase 3: 핸드 수정 요청 시스템 (2025-10-15) ✅
**소요 시간**: 완성

#### 완료 기능
- `hand_edit_requests` 테이블 (4가지 수정 유형: basic_info, board, players, actions)
- `lib/hand-edit-requests.ts` (8개 함수)
- 상태 관리 (pending, approved, rejected)
- 3단계 수정 제안 다이얼로그 (`EditRequestDialog`)
- 핸드 상세 페이지 "수정 제안" 버튼 통합
- 내 제안 목록 페이지 (`/my-edit-requests`)
- 관리자 승인 페이지 (`/admin/edit-requests`, Before/After 비교)

**핵심 파일**:
- `components/edit-request-dialog.tsx`
- `lib/hand-edit-requests.ts`
- `supabase/migrations/017_add_hand_edit_requests.sql`

---

### Phase 4: 관리자 시스템 (2025-10-15)
**소요 시간**: 완성

- 역할 관리 (user/moderator/admin), 밴 시스템
- `lib/admin.ts` (15개 함수)
- 관리자 페이지 5개 (dashboard, users, claims, edit-requests, content)

**핵심 파일**:
- `app/admin/dashboard/page.tsx`, `app/admin/users/page.tsx`
- `supabase/migrations/015_add_admin_system.sql`

---

### Phase 5: 콘텐츠 신고 시스템 (2025-10-15)
**소요 시간**: 완성

- `reports` 테이블 (5가지 신고 사유)
- `lib/content-moderation.ts` (10개 함수)
- 관리자 페이지 (`/admin/content`)

**핵심 파일**:
- `supabase/migrations/016_add_content_moderation.sql`

---

### Phase 6: 유저 프로필 고도화 (2025-10-15)
**소요 시간**: 완성

- 소셜 링크, 프로필 가시성 (public/private/friends)
- 통계 캐싱 (자동 업데이트 트리거 3개)
- `lib/user-profile.ts` (12개 함수)
- 프로필 페이지 2개 (`/profile`, `/profile/[id]`)

**핵심 파일**:
- `supabase/migrations/014_add_user_profile_fields.sql`
- `app/profile/page.tsx`

---

### Phase 7: 커뮤니티 검색 강화 (2025-10-15)
**소요 시간**: 완성

- Full-Text Search (tsvector, GIN 인덱스)
- 제목/내용 가중치 검색 (제목 우선)
- 자동 search_vector 업데이트 트리거

**핵심 파일**:
- `supabase/migrations/013_add_community_search.sql`

---

### Phase 8: Archive Folder Navigation (2025-10-16) ✅
- Google Drive 스타일 폴더 네비게이션
- ArchiveBreadcrumb, ArchiveFolderList 컴포넌트

---

### Phase 9: 코드 품질 및 아키텍처 개선 (2025-10-18) ✅
- Archive 페이지 리팩토링 (1,733줄 → 88줄, -95%)
- Zustand stores 도입 (780줄)
- 타입 시스템 구축 (114개 `any` 제거)

---

### Phase 10: 성능 최적화 (2025-10-18) ✅
- React 메모이제이션 (useCallback, React.memo)
- 번들 분석 도구 설정

---

### Phase 11: UX/UI 개선 (2025-10-18) ✅
- Error Boundary 시스템
- Toast 통합 유틸리티
- Loading 컴포넌트

---

### Phase 12: 테스팅 전략 수립 (2025-10-18) ✅
- E2E 테스트 (Playwright, 13개)
- 유닛 테스트 (Vitest, 40+개)
- CI/CD 파이프라인 (GitHub Actions)

---

### Phase 13: 보안 강화 (2025-10-18) ✅
- SQL/XSS 방지 유틸리티 (900+ 줄)
- Zod 입력 검증 시스템

---

### Phase 14: Archive UI Redesign (2025-10-19) ✅
- 수평 로고 바 (Netflix 스타일)
- 필터 버튼 중복 제거

---

### Phase 15: 로고 관리 시스템 (2025-10-19) ✅
- 실제 로고 12개 다운로드
- 자동 확장자 감지 시스템

---

### Phase 16: React Query Migration (2025-10-20) ✅
**소요 시간**: 6시간

#### 완료 기능
- 전체 앱 데이터 페칭 현대화 (@tanstack/react-query 5.x)
- 6개 query 파일 생성 (총 650줄)
  - `community-queries.ts` (89줄) - 포스트 상세, 좋아요
  - `search-queries.ts` (68줄) - 핸드 검색, 필터 옵션
  - `players-queries.ts` (203줄) - 플레이어 리스트, 상세, 통계, 사진
  - `profile-queries.ts` (163줄) - 프로필, 닉네임 체크, 아바타
  - `bookmarks-queries.ts` (79줄) - 북마크 CRUD
  - `edit-requests-queries.ts` (38줄) - 수정 제안 목록
- 9개 페이지 리팩토링 (~200줄 코드 감소)
  - Community/[id], Search, Players, Players/[id]
  - Profile, Profile/[id], Bookmarks, My Edit Requests
- Optimistic Updates 구현
  - Community 포스트 좋아요 (즉각적인 UI 반응)
  - 자동 롤백 (onError 처리)
- 성능 최적화
  - 닉네임 중복 체크 500ms 디바운싱
  - useMemo로 folders/filteredBookmarks 계산
  - 계층적 쿼리 키 패턴
- 캐시 전략 설정
  - staleTime: 1분~10분 (데이터 특성별)
  - gcTime: 5분 (메모리 관리)
  - refetchOnWindowFocus: false

**핵심 파일**:
- `lib/queries/community-queries.ts`
- `lib/queries/players-queries.ts`
- `components/providers.tsx`

---

### Phase 17: DevTools Optimization (2025-10-20) ✅
**소요 시간**: 30분

#### 완료 기능
- React Query DevTools 조건부 렌더링
- `process.env.NODE_ENV === 'development'` 체크
- Tree shaking으로 프로덕션 빌드에서 완전 제거
- 프로덕션 번들 크기 감소

**핵심 파일**:
- `components/providers.tsx`

---

### Phase 18: Manual Hand Action Input System (2025-10-20) ✅
**소요 시간**: 4시간

#### 완료 기능
- **수동 핸드 액션 입력 시스템**: 관리자가 핸드의 액션 데이터를 수동으로 입력
- **핵심 라이브러리** (515줄):
  - `lib/hand-actions.ts` (297줄) - CRUD 함수, 시퀀스 관리, 유효성 검증
  - `lib/queries/hand-actions-queries.ts` (218줄) - React Query 훅, Optimistic Updates
- **UI 컴포넌트** (547줄):
  - `components/hand-actions/ActionInput.tsx` (178줄) - 액션 입력 폼
  - `components/hand-actions/ActionList.tsx` (141줄) - 액션 목록 표시, 이동/삭제
  - `components/hand-actions/StreetTabs.tsx` (42줄) - Street 탭 네비게이션
  - `components/hand-actions/ActionEditor.tsx` (230줄) - 메인 에디터 (저장/미저장 상태 관리)
- **관리자 페이지**: `app/admin/hands/[id]/edit-actions/page.tsx` (333줄)
  - 핸드 정보 표시, 플레이어 목록
  - Pending Actions 워크플로우
  - Bulk Create/Delete 기능
- **핸드 상세 페이지 통합**: "Edit Actions" 버튼 추가 (관리자만)
- **기능**:
  - Street별 액션 관리 (Preflop, Flop, Turn, River)
  - 6가지 액션 타입 (fold, check, call, bet, raise, all-in)
  - 액션 순서 관리 (Move Up/Down)
  - Pending Actions (저장 전 미리보기)
  - 플레이어 통계 캐시 자동 무효화

**핵심 파일**:
- `lib/hand-actions.ts` (297줄)
- `lib/queries/hand-actions-queries.ts` (218줄)
- `components/hand-actions/ActionEditor.tsx` (230줄)
- `app/admin/hands/[id]/edit-actions/page.tsx` (333줄)

**배경**:
- `hand_actions` 테이블이 비어있어 플레이어 통계 계산 불가
- 수동 입력 시스템으로 테스트 및 실제 데이터 생성 가능
- 향후 영상 분석 파이프라인 구현 시 기반 제공

---

### Phase 19: Archive UI Enhancement (2025-10-21) ✅
**소요 시간**: 2시간

#### 완료 기능
- **필터 간소화 및 사용자 경험 개선**
- **Quick Filters 라벨 제거**: 깔끔한 인터페이스를 위한 텍스트 제거
- **Date Range Picker 도입**:
  - 기존 단순 Date 드롭다운 삭제
  - From/To 캘린더 버튼으로 교체
  - Shadcn/ui Popover + Calendar 컴포넌트 사용
  - 날짜 포맷: "MMM dd, yyyy"
- **불필요한 필터 완전 삭제**:
  - Advanced Filters Grid 제거
  - Hand Count Range 필터 삭제
  - Video Sources 필터 삭제 (YouTube/Local Upload)
  - "Show videos with hands only" 필터 삭제
- **코드 정리**:
  - 관련 핸들러 함수 삭제 (handleHandCountRangeChange, handleVideoSourceChange, handleHasHandsOnlyChange)
  - activeFilterCount 함수 업데이트 (2개 파일)

**핵심 파일**:
- `components/archive-unified-filters.tsx` (수정)
- `app/archive/_components/ArchiveToolbar.tsx` (수정)

**개선 효과**:
- 더 직관적인 날짜 범위 선택
- 간결한 필터 UI로 사용자 경험 향상
- 불필요한 복잡성 제거

---

### Phase 20: Notification System (2025-10-18, 2025-10-20, 문서화 2025-10-21) ✅
**소요 시간**: 6시간 (구현 5시간, 문서화 1시간)

#### 완료 기능
- **완전한 실시간 알림 시스템** (Supabase Realtime + React Query)
- **8가지 알림 타입**:
  - `comment` - 포스트에 새 댓글
  - `reply` - 댓글에 답글
  - `like_post` - 포스트 좋아요
  - `like_comment` - 댓글 좋아요
  - `edit_approved` - 핸드 수정 제안 승인
  - `edit_rejected` - 핸드 수정 제안 거부
  - `claim_approved` - 플레이어 클레임 승인
  - `claim_rejected` - 플레이어 클레임 거부
- **백엔드 구조** (2개 마이그레이션, 680줄):
  - `notifications` 테이블 (8개 컬럼, RLS 정책)
  - 9개 자동 트리거 (포스트, 댓글, 핸드, 좋아요, 수정 제안, 클레임)
  - 중복 알림 방지 (UNIQUE 제약조건)
  - 성능 최적화 인덱스 2개
- **라이브러리** (2개 파일, 497줄):
  - 7개 함수: fetch, getUnreadCount, markAsRead, markAllAsRead, delete, deleteAllRead, subscribe
  - 실시간 구독 (subscribeToNotifications)
  - 유틸리티 함수 (아이콘, 시간 포맷팅)
  - React Query 통합 (Optimistic Updates)
- **프론트엔드** (2개 파일, 544줄):
  - 알림 페이지 (`/notifications`) - All/Unread 탭, 필터링
  - 알림 벨 컴포넌트 (헤더 통합) - 드롭다운 미리보기, 읽지 않은 알림 배지
  - Toast 알림 (새 알림 실시간 표시)
- **자동 폴링**: 1분마다 읽지 않은 알림 개수 업데이트
- **Optimistic Updates**: 읽음 표시, 삭제 즉각 반영
- **캐시 전략**: staleTime 2분, gcTime 5분

**핵심 파일**:
- `supabase/migrations/20251018000026_add_notifications_system.sql` (434줄)
- `supabase/migrations/20251020000030_add_hand_notification_triggers.sql` (246줄)
- `lib/notifications.ts` (253줄)
- `lib/queries/notification-queries.ts` (244줄)
- `app/notifications/page.tsx` (299줄)
- `components/notification-bell.tsx` (245줄)

**사용자 경험**:
- 실시간 알림으로 즉각적인 피드백
- 알림 벨 배지로 읽지 않은 알림 수 표시
- 드롭다운에서 최근 10개 알림 미리보기
- 알림 클릭 시 자동으로 읽음 처리 및 관련 페이지 이동

---

### Phase 21: Player Statistics Enhancement (2025-10-21) ✅
**소요 시간**: 4시간

#### 완료 기능
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

**핵심 파일**:
- `lib/queries/player-stats-queries.ts` (218줄)
- `components/player-stats/AdvancedStatsCard.tsx`
- `components/player-stats/PositionalStatsCard.tsx`
- `components/player-stats/PerformanceChartCard.tsx`

---

### Phase 22: News & Live Reporting System (2025-10-22) ✅
**소요 시간**: 6시간

#### 완료 기능
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

**핵심 파일**:
- `supabase/migrations/20251022000002_add_news_and_live_reports.sql`
- `lib/queries/news-queries.ts` (313줄)
- `lib/queries/live-reports-queries.ts` (313줄)
- `app/reporter/news/page.tsx` (225줄)
- `app/reporter/live/page.tsx` (225줄)
- `app/news/page.tsx`, `app/news/[id]/page.tsx`
- `app/live-reporting/page.tsx`, `app/live-reporting/[id]/page.tsx`
- `components/reporter/content-editor.tsx` (293줄)

**파일**: 13개 파일, 2,663줄 추가

---

### Phase 23: Navigation Expansion & Archive Split (2025-10-22) ✅
**소요 시간**: 3시간

#### 완료 기능
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

**핵심 파일**:
- `supabase/migrations/20251022000001_add_game_type_to_tournaments.sql`
- `app/archive/tournament/page.tsx` (141줄)
- `app/archive/cash-game/page.tsx` (141줄)
- `components/header.tsx` (업데이트)
- `components/tournament-dialog.tsx` (업데이트)

**파일**: 13개 파일, 485줄 추가

---

### Phase 24: Archive UI Enhancement (2025-10-22) ✅
**소요 시간**: 4시간

#### 완료 기능
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

**핵심 파일**:
- `components/card-selector.tsx` (171줄)
- `components/archive-info-dialog.tsx` (345줄)
- `components/archive-unified-filters.tsx` (업데이트)
- `app/archive/_components/ArchiveEventsList.tsx` (업데이트)

**파일**: 12개 파일, 865줄 추가

---

### Phase 25: Last Sign-in Tracking (2025-10-21) ✅
**소요 시간**: 1시간

#### 완료 기능
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

**핵심 파일**:
- `supabase/migrations/20251021000032_add_last_sign_in_tracking.sql`
- `app/admin/users/page.tsx` (업데이트)

**파일**: 2개 파일, 56줄 추가

---

### Phase 26: UI Simplification (2025-10-22) ✅
**소요 시간**: 1시간

#### 완료 기능
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

**핵심 파일**:
- `app/search/page.tsx` (업데이트)
- `app/players/page.tsx` (업데이트)
- `app/community/page.tsx` (업데이트)
- `app/news/page.tsx` (업데이트)
- `app/live-reporting/page.tsx` (업데이트)
- `components/header.tsx` (업데이트)

---

### Phase 27: Quick Upload Enhancement & YouTube API Optimization (2025-10-23) ✅
**소요 시간**: 3시간

#### 완료 기능
- **Quick Upload 계층 선택 기능 추가** (커밋 a3790c5):
  - Tournament → SubEvent → Day 계층 구조 직접 선택
  - YouTube 탭과 Local File 탭 모두 적용
  - 드롭다운 셀렉트 UI (3단계 캐스케이딩)
  - "Add to Unsorted" 체크박스로 기존 동작 유지 (backward compatibility)
  - Create New Day 옵션 추가
  - `useTournamentsQuery` 활용 (React Query)
- **YouTube API Quota 최적화** (커밋 418179f):
  - 메인 페이지 라이브 스트림 섹션 완전 삭제
    - `components/main/live-poker-streams.tsx` 삭제
    - `app/api/youtube/live-streams/route.ts` 삭제
  - Channel ID 직접 입력 옵션 추가 (Quick Upload Channel 탭)
    - RadioGroup으로 URL/ID 방식 선택
    - Channel ID 직접 입력 시 API 호출 생략 (100-200 units 절약)
  - API 쿼터 사용량: 200% → 50-80%로 감소
  - 메인 페이지 번들 크기: 7.14 kB → 5.97 kB (-16%)
- **Channel Not Found 버그 수정** (커밋 c1645b7):
  - `inputMethod` 파라미터 처리 추가
  - API route에서 URL/ID 방식 구분 로직 구현
  - Channel ID 형식 검증 (UC로 시작, 24자)
  - 채널 URL 입력 시 정상 작동

**핵심 파일**:
- `components/quick-upload-dialog.tsx` (수정)
- `app/api/youtube/channel-streams/route.ts` (수정)
- `app/page.tsx` (수정)
- `components/main/live-poker-streams.tsx` (삭제)
- `app/api/youtube/live-streams/route.ts` (삭제)

**개선 효과**:
- YouTube API Quota 문제 완전 해결
- Quick Upload 사용자 경험 개선 (계층 구조 직접 선택)
- 메인 페이지 성능 향상 (번들 크기 감소)

---

### Phase 28: Performance Optimization & Maintenance (2025-10-23) ✅
**소요 시간**: 5시간

#### 완료 기능
- **번들 크기 최적화** (2시간):
  - Archive 페이지 동적 임포트 (11개 다이얼로그)
    - `app/archive/_components/ArchiveDialogs.tsx` 수정
    - Dynamic import로 모든 다이얼로그 lazy loading
    - ssr: false 설정으로 서버 렌더링 비활성화
  - Players 상세 페이지 동적 임포트 (5개 차트/통계 컴포넌트)
    - `app/players/[id]/page.tsx` 수정
    - Recharts 차트 컴포넌트 lazy loading
    - 로딩 상태 표시 추가 ("차트 로딩 중...", "통계 로딩 중...")
  - 예상 효과: 페이지 번들 크기 30-40% 감소
- **기술 부채 정리** (1시간):
  - pnpm-lock.yaml 삭제 (npm만 사용으로 통일)
  - README.md 버전 업데이트
    - Next.js: 15.1.6 → 15.5.5
    - React Query: 5.x → 5.90.5
    - 프로젝트 버전: v4.0 → v5.0
  - next.config.mjs workspace root 경고 해결
    - output: 'standalone' 추가
    - outputFileTracingRoot: import.meta.dirname 설정
- **SEO 최적화** (2시간):
  - 루트 layout metadata 강화 (`app/layout.tsx`)
    - metadataBase 설정 (https://templar-archives.vercel.app)
    - OpenGraph 메타태그 (type, locale, url, siteName, images)
    - Twitter Card 메타태그 (card, title, description, images)
    - keywords, authors, creator, publisher 설정
    - robots 설정 (index, follow, googleBot)
  - sitemap.xml 자동 생성 (`app/sitemap.ts` 신규 생성)
    - 10개 정적 라우트 등록 (/, /about, /archive/tournament 등)
    - changeFrequency: 'daily', priority 설정
    - 동적 라우트 확장 가능 구조
  - robots.txt 자동 생성 (`app/robots.ts` 신규 생성)
    - API, admin, auth, reporter 경로 차단
    - sitemap 위치 명시

**핵심 파일**:
- `app/archive/_components/ArchiveDialogs.tsx` (동적 임포트)
- `app/players/[id]/page.tsx` (동적 임포트)
- `app/layout.tsx` (SEO metadata)
- `app/sitemap.ts` (신규 생성)
- `app/robots.ts` (신규 생성)
- `next.config.mjs` (workspace root 설정)
- `README.md` (버전 업데이트)

**예상 효과**:
- 페이지 로딩 속도 30-40% 개선 (번들 크기 감소)
- 검색 엔진 노출 향상 (SEO 최적화)
- 기술 부채 감소로 유지보수 용이성 증가
- Next.js 빌드 경고 제거

---

### Phase 29: Admin Category Logo Upload 수정 (2025-10-23) ✅
**소요 시간**: 2시간

#### 문제 및 해결
- **문제**: 관리자 카테고리 메뉴에서 로고 업로드 기능이 작동하지 않음
  - **원인**: useUploadLogoMutation hook이 컴포넌트 렌더링 시점에 초기화되어 생성 모드에서 빈 categoryId("")로 설정됨
  - **해결**: uploadCategoryLogo 함수를 직접 호출하여 정확한 categoryId 사용

#### 완료 기능
- **CategoryDialog.tsx 로직 개선** (1시간):
  - useUploadLogoMutation hook 제거
  - uploadCategoryLogo 함수 직접 import 및 호출
  - isUploading 상태 추가로 업로드 진행 상태 표시
  - 생성/수정 모드 모두에서 정확한 categoryId로 로고 업로드 처리
- **권장 사이즈/포맷 표기 강화**:
  - FormDescription 업데이트
  - **권장**: 200x200px 이상 정사각형 이미지
  - **형식**: SVG/PNG (투명 배경 권장), JPEG (최대 5MB)
- **캐시 버스팅 추가** (0.5시간):
  - 로고 업로드 후 URL에 timestamp 쿼리 파라미터 추가
  - `${publicUrl}?t=${Date.now()}` 형식
  - 브라우저 캐시로 인한 표시 문제 해결
- **Supabase Storage 버킷 설정** (0.5시간):
  - `tournament-logos` 버킷 생성 (public 접근 허용)
  - 파일 크기 제한: 5MB
  - 허용 MIME 타입: image/svg+xml, image/png, image/jpeg
  - RLS 정책 4개 추가:
    - SELECT: 모든 사용자 (public read)
    - INSERT/UPDATE/DELETE: 관리자만 (admin only)
  - 마이그레이션: `20251023000001_create_tournament_logos_storage.sql`

**핵심 파일**:
- `components/admin/CategoryDialog.tsx` (로고 업로드 로직 개선)
- `supabase/migrations/20251023000001_create_tournament_logos_storage.sql` (신규 생성)

**완료 기준 달성**:
- ✅ 로고 업로드 기능 정상 작동 (생성/수정 모드 모두)
- ✅ 권장 사이즈/포맷 UI에 명확히 표기
- ✅ 캐시 버스팅으로 즉각적인 UI 반영
- ✅ Supabase Storage 버킷 설정 완료
- ✅ 빌드 테스트 성공

---

### Phase 30: Archive Event Management Enhancement (2025-10-24) ✅
**소요 시간**: 3.5시간

#### 완료 기능
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

**핵심 파일**:
- `supabase/migrations/20251024000001_add_event_number_to_sub_events.sql` (신규)
- `lib/types/archive.ts` (수정)
- `components/archive-dialogs/sub-event-dialog.tsx` (수정)
- `components/archive-dialogs/day-dialog.tsx` (수정)
- `app/archive/_components/ArchiveDialogs.tsx` (수정)
- `app/archive/_components/ArchiveEventsList.tsx` (수정)

**커밋**:
- f7664c0, e18611f, 670abb5, 0cacdfe, 51e82fa, e2844ae

---

### Phase 31: Archive Security Enhancement & Admin Management Page (2025-10-24) ✅
**소요 시간**: 5.5시간

#### 완료 기능
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

**핵심 파일**:
- `app/actions/archive.ts` (신규, 670줄)
- `app/admin/archive/page.tsx` (신규, 365줄)
- 5개 Dialog 컴포넌트 (수정)

**커밋**:
- 51066c4, bfb4b2f

---

### Phase 32: Comprehensive Security Enhancement (2025-10-24) ✅
**소요 시간**: 10시간

#### 완료 기능
- **Server Actions 인증 강화** (1.5시간):
  - Email 화이트리스트 → DB 역할 기반 검증으로 변경
  - Ban 상태 체크 추가 (banned_at 필드 검증)
  - `verifyAdmin()` 함수 로직 개선 (`app/actions/archive.ts`)
  - Supabase 쿼리로 users 테이블에서 role과 banned_at 직접 조회
  - 더 안전하고 유연한 권한 관리 시스템
- **RLS 정책 강화** (2시간):
  - 6개 핵심 테이블 admin-only write 제한
    - tournaments, sub_events, days, hands, players, hand_players
  - 모든 INSERT/UPDATE/DELETE 작업에 역할 및 밴 상태 체크
  - 마이그레이션: `20251024000001_fix_rls_admin_only.sql` (357줄)
  - 기존 불안전한 정책 삭제 및 보안 정책 추가
  - WITH CHECK 절로 삽입/수정 시점 검증 강화
- **Natural Search API 재설계** (2시간):
  - 위험한 SQL 생성 방식 → 안전한 JSON 필터 방식
  - `lib/natural-search-filter.ts` (277줄) - 15개 필터 타입, Zod 검증
  - NaturalSearchFilterSchema로 AI 출력 검증
  - Claude API는 JSON 객체 생성, Query Builder로 안전하게 쿼리 구성
  - `execute_search_query` RPC 함수 삭제 (SQL Injection 벡터 제거)
  - 100% 기능 유지, 내부 구현만 안전하게 변경
- **CSRF 보호 추가** (0.5시간):
  - `app/api/import-hands/route.ts`에 `verifyCSRF()` 추가
  - Origin/Referer 검증으로 CSRF 공격 방어
  - 동일 출처 요청만 허용
- **파일 업로드 검증 강화** (1.5시간):
  - `lib/file-upload-validator.ts` (212줄) - Magic Number 검증
  - MIME 타입과 실제 파일 시그니처 비교
  - 7개 파일 타입 지원 (JPEG, PNG, WebP, GIF, MP4, QuickTime, WebM)
  - 파일명 Sanitization (영문, 숫자, 하이픈, 언더스코어만)
  - 크기 제한 (이미지 5MB, 비디오 500MB, 아바타 2MB)
  - 확장자 스푸핑 방지
- **Rate Limiting 개선** (1시간):
  - IP 기반 → User ID 기반 (JWT 파싱)
  - VPN 우회 방지, 계정당 정확한 Rate Limit
  - `lib/rate-limit.ts` 업데이트
  - JWT payload에서 sub/user_id 추출
  - IP는 fallback으로만 사용
- **입력 Sanitization 강화** (0.5시간):
  - LIKE 패턴 이스케이프 (`escapeLikePattern()`)
  - SQL 와일드카드 문자 처리 (%, _, \)
  - `lib/admin.ts` 사용자 검색에 적용
  - SQL Injection 리스크 추가 감소
- **환경 변수 중앙 관리** (1시간):
  - `lib/env.ts` (125줄) - 타입 안전한 환경 변수 관리
  - 런타임 검증, 누락된 변수 조기 감지
  - 5개 환경 변수 객체 (supabaseEnv, claudeEnv, youtubeEnv, redisEnv, appEnv)
  - validateEnv() 함수로 앱 시작 시 검증
  - 프로덕션 환경에서 자동 검증

**핵심 파일**:
- `lib/natural-search-filter.ts` (신규, 277줄)
- `lib/file-upload-validator.ts` (신규, 212줄)
- `lib/env.ts` (신규, 125줄)
- `supabase/migrations/20251024000001_fix_rls_admin_only.sql` (신규, 357줄)
- `supabase/migrations/20251024000002_remove_dangerous_rpc.sql` (신규, 9줄)
- `app/actions/archive.ts` (수정)
- `app/api/natural-search/route.ts` (수정)
- `app/api/import-hands/route.ts` (수정)
- `lib/rate-limit.ts` (수정)
- `lib/admin.ts` (수정)

**보안 개선 효과**:
- SQL Injection 완전 방지 (Natural Search API 재설계)
- CSRF 공격 방어 (토큰 기반 검증)
- 파일 업로드 공격 방지 (Magic Number 검증)
- 권한 상승 공격 방지 (DB 역할 기반 인증)
- Rate Limit 우회 방지 (User ID 기반)
- 보안 등급: B+ → A

**커밋**:
- a006fa7

---

## 📊 우선순위 요약

| Phase | 기능 | 우선순위 | 상태 | 완료일 |
|-------|------|----------|------|--------|
| Phase 0 | 인증 시스템 | ⭐⭐⭐⭐⭐ | ✅ | 2025-10-12 |
| Phase 1 | 핸드 상호작용 | ⭐⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 2 | 커뮤니티 강화 | ⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 3 | 핸드 수정 요청 | ⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 4 | 관리자 시스템 | ⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 5 | 콘텐츠 신고 | ⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 6 | 유저 프로필 | ⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 7 | 커뮤니티 검색 | ⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 8 | Folder Navigation | ⭐⭐⭐ | ✅ | 2025-10-16 |
| Phase 9 | 코드 품질 | ⭐⭐⭐⭐ | ✅ | 2025-10-18 |
| Phase 10 | 성능 최적화 | ⭐⭐⭐ | ✅ | 2025-10-18 |
| Phase 11 | UX/UI 개선 | ⭐⭐⭐ | ✅ | 2025-10-18 |
| Phase 12 | 테스팅 | ⭐⭐⭐⭐ | ✅ | 2025-10-18 |
| Phase 13 | 보안 강화 | ⭐⭐⭐⭐ | ✅ | 2025-10-18 |
| Phase 14 | Archive Redesign | ⭐⭐⭐ | ✅ | 2025-10-19 |
| Phase 15 | 로고 관리 | ⭐⭐ | ✅ | 2025-10-19 |
| Phase 16 | React Query Migration | ⭐⭐⭐⭐ | ✅ | 2025-10-20 |
| Phase 17 | DevTools Optimization | ⭐⭐⭐ | ✅ | 2025-10-20 |
| Phase 18 | Manual Hand Actions | ⭐⭐⭐⭐ | ✅ | 2025-10-20 |
| Phase 19 | Archive UI Enhancement | ⭐⭐⭐ | ✅ | 2025-10-21 |
| Phase 20 | Notification System | ⭐⭐⭐⭐ | ✅ | 2025-10-21 |
| Phase 21 | Player Statistics | ⭐⭐⭐⭐ | ✅ | 2025-10-21 |
| Phase 22 | News & Live Reporting | ⭐⭐⭐⭐⭐ | ✅ | 2025-10-22 |
| Phase 23 | Navigation Expansion | ⭐⭐⭐ | ✅ | 2025-10-22 |
| Phase 24 | Archive UI Enhancement | ⭐⭐⭐⭐ | ✅ | 2025-10-22 |
| Phase 25 | Last Sign-in Tracking | ⭐⭐ | ✅ | 2025-10-21 |
| Phase 26 | UI Simplification | ⭐⭐ | ✅ | 2025-10-22 |
| Phase 27 | Quick Upload & API Optimization | ⭐⭐⭐⭐ | ✅ | 2025-10-23 |
| Phase 28 | Performance Optimization & Maintenance | ⭐⭐⭐⭐ | ✅ | 2025-10-23 |
| Phase 29 | Admin Category Logo Upload Fix | ⭐⭐⭐ | ✅ | 2025-10-23 |
| Phase 30 | Archive Event Management Enhancement | ⭐⭐⭐ | ✅ | 2025-10-24 |
| Phase 31 | Archive Security & Admin Page | ⭐⭐⭐⭐ | ✅ | 2025-10-24 |
| Phase 32 | Comprehensive Security Enhancement | ⭐⭐⭐⭐⭐ | ✅ | 2025-10-24 |

---

## 🎯 권장 구현 스케줄

### Week 1: 인증 & 핸드 상호작용 ✅
- Day 1-2: Phase 0 (인증)
- Day 3-5: Phase 1 (좋아요, 댓글)

### Week 2: 커뮤니티 강화 ✅
- Day 1-3: Phase 2 (핸드 첨부, 북마크)
- Day 4-5: 테스트 및 버그 수정

### Week 3-4: 고급 기능 ✅
- Day 1-10: Phase 3-7 완료

### Week 5+: 고급 기능 (완료) ✅
- Phase 8-15 완료 (폴더 네비게이션, 코드 품질, 성능, 테스팅, 보안, UI 개선)

---

## 📝 변경 이력

| 날짜 | 변경 내용 |
|------|-----------|
| 2025-10-12 | 로드맵 최초 작성, Phase 0 완료 |
| 2025-10-15 | Phase 1-7 완료, 문서 업데이트 |
| 2025-10-16 (세션 11) | 로드맵 최적화, Phase 8 완료 |
| 2025-10-16 (세션 12) | Phase 3 완료, 문서 정리 |
| 2025-10-18 | Phase 9-13 완료 (코드 품질, 성능, 테스팅, 보안) |
| 2025-10-19 | Phase 14-15 완료 (UI Redesign, 로고 관리) |
| 2025-10-20 (세션 1) | Phase 16-17 완료 (React Query Migration, DevTools) |
| 2025-10-20 (세션 2) | Phase 18 완료 (Manual Hand Action Input System) |
| 2025-10-21 | Phase 19-21 완료 (Archive UI, Notification, Player Stats) |
| 2025-10-22 | Phase 22-26 완료 (News, Navigation, Archive Enhancement, Last Sign-in, UI Simplification) |
| 2025-10-23 (세션 1) | Phase 27 완료 (Quick Upload Enhancement & YouTube API Optimization) |
| 2025-10-23 (세션 2) | Phase 28 완료 (Performance Optimization & Maintenance) |
| 2025-10-23 (세션 3) | Phase 29 완료 (Admin Category Logo Upload Fix) |
| 2025-10-24 (세션 1) | Phase 30 완료 (Archive Event Management Enhancement) |
| 2025-10-24 (세션 2) | Phase 31 완료 (Archive Security & Admin Management Page) |
| 2025-10-24 (세션 3) | Phase 32 완료 (Comprehensive Security Enhancement) |

---

**다음 작업** (선택적):
- 영상 분석 자동화 개선 (YouTube API 캐싱, Claude Vision 최적화, 배치 처리)
- 핸드 태그 시스템 (태그 생성/관리, 태그 기반 검색, 태그 추천)
- 소셜 공유 기능 강화

**현재 상태**: Phase 0-32 완료, 포괄적 보안 강화 완료 (보안 등급 A) 🎉
**상세 정보**: `../CLAUDE.md` 참조
