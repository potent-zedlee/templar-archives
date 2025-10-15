# GGVault - Claude Project Context

## 프로젝트 개요
GGVault는 YouTube/Twitch 영상에서 포커 핸드를 자동으로 추출하고, 체계적으로 보관하며, 지능적으로 검색할 수 있는 **웹 기반 통합 플랫폼**입니다.

**기술**: Next.js 14, Supabase, Claude Vision API
**배포**: Vercel + Supabase
**개발 서버**: http://localhost:3000

---

## 핵심 기능

### 1. 영상 분석 ✅ (Phase 1-4 완료)
- **YouTube URL** 또는 **로컬 파일 업로드**
- **Claude Vision 2단계 파이프라인**:
  - 핸드 경계 감지 (CHECK_INTERVAL=2, 6초 간격)
  - 핸드 시퀀스 분석 (8개 키프레임)
- **성능**: 처리 15분/37분 영상, 비용 $2.75, 정확도 95%+
- **실시간 진행률** (SSE 스트리밍)

### 2. 데이터 관리 ✅
- 핸드 히스토리 + 영상 클립 동기화 저장
- 3가지 영상 소스 (YouTube, 로컬 파일, NAS)
- Archive 이벤트 관리 (Tournament/SubEvent/Day CRUD)

### 3. 검색 및 분석 ✅
- 30+ 검색 조건 필터링
- **AI 자연어 검색** (Claude 3.5 Sonnet)
- 통계 대시보드

### 4. 커뮤니티 ✅
- 포스트 작성 및 카테고리
- 댓글 및 답글 시스템
- 좋아요 기능
- 핸드 공유 (SNS, 링크, 임베드)

### 5. 인증 ✅ (Phase 0 완료)
- Google OAuth 로그인
- Row Level Security (RLS)

### 6. 플레이어 프로필 클레임 ✅ (2025-10-14 완료)
- 유저가 자신의 플레이어 프로필 클레임 요청
- 소셜 미디어, 이메일 등 다양한 인증 방법
- 관리자 승인/거절 워크플로우
- 클레임 상태 배지 표시

---

## 현재 개발 상태 (2025-10-14)

### ✅ 완료된 Phase

#### Phase 0: 인증 시스템 (2025-10-12 완료)
- Google OAuth 로그인
- 전역 인증 상태 관리 (`useAuth` 훅)
- 보호된 액션 (댓글, 좋아요)

#### 프론트엔드 UI (100%)
- **메인 페이지**: Hero, 인기 영상, 오늘의 역사
- **Archive 페이지**: Tournament 트리, 영상 플레이어, 핸드 목록 (Accordion)
- **Search 페이지**: 고급 검색, AI 자연어 검색
- **Players 페이지**: 목록, 상세, 통계 차트
- **Community 페이지**: 포스트, 댓글, 좋아요

#### 데이터베이스 (17개 마이그레이션)
```
20241001000001_init_schema.sql           # Tournaments, Sub Events, Days, Hands
20241001000002_add_players.sql           # Players, Hand Players
20241001000003_add_video_sources.sql     # 영상 소스 (YouTube, Upload, NAS)
20241001000004_add_community.sql         # Posts, Comments
20241001000005_add_users_table.sql       # Users
20241001000006_add_hand_likes.sql        # Hand Likes
20241001000007_add_payouts_and_matching.sql
20241001000008_add_subevent_details.sql
20241001000009_add_hand_details.sql      # POT, 보드 카드, 액션
20241001000010_add_player_notes.sql      # 플레이어 노트
20241001000011_add_player_claims.sql     # 플레이어 프로필 클레임
20241001000012_add_hand_bookmarks.sql    # 핸드 북마크
20251015000013_add_community_search.sql  # 커뮤니티 전체 텍스트 검색 (FTS)
20251015000014_add_user_profile_fields.sql  # 유저 프로필 확장 (소셜 링크, 통계)
20251015000015_add_admin_system.sql      # 관리자 시스템 (role, 밴, 활동 로그)
20251015000016_add_content_moderation.sql  # 콘텐츠 신고 시스템
20251015000017_add_hand_edit_requests.sql  # 핸드 수정 요청 시스템
```

#### 영상 분석 (Phase 1-4 완료)
- **Phase 1**: Claude Vision 핸드 경계 감지
- **Phase 2**: Accordion UI 구현
- **Phase 3**: OCR 시도 (롤백됨)
- **Phase 4**: 정확도 개선 (CHECK_INTERVAL=2, summary 필드)

**핵심 파일**:
- `lib/hand-boundary-detector.ts` - 핸드 경계 감지
- `lib/hand-sequence-analyzer.ts` - 시퀀스 분석
- `app/api/analyze-video/route.ts` - 2단계 파이프라인
- `components/analyze-dialog.tsx` - 분석 UI
- `components/hand-list-accordion.tsx` - 핸드 목록 Accordion
- `app/archive/page.tsx` - Archive 페이지

#### Archive 이벤트 관리 (2025-10-08)
- Tournament/SubEvent/Day CRUD 기능
- 컴팩트 더보기 메뉴 (호버 시 표시)
- 핸드 타임스탬프 "MM:SS-MM:SS" 형식

#### 플레이어 프로필 클레임 시스템 (2025-10-14 완료)
- **데이터베이스**: `player_claims` 테이블, RLS 정책, 헬퍼 함수
- **백엔드 API**: `lib/player-claims.ts` (클레임 요청, 조회, 승인/거절)
- **프론트엔드**:
  - `components/claim-player-dialog.tsx` - 클레임 요청 다이얼로그
  - `app/players/[id]/page.tsx` - 클레임 버튼 및 상태 배지
  - `app/admin/claims/page.tsx` - 관리자 승인 페이지
- **기능**:
  - 유저가 플레이어 프로필 클레임 요청 (소셜 미디어, 이메일 인증)
  - 관리자 승인/거절 워크플로우
  - 클레임 상태 배지 (대기 중, 승인됨, Your Profile)
  - 한 플레이어당 하나의 승인된 클레임만 허용

#### Phase 2: 커뮤니티 강화 (2025-10-15 완료) ✅

**Phase 2.1: 커뮤니티 핸드 첨부**
- **데이터베이스**: `posts` 테이블 `hand_id` 필드 (이미 존재)
- **프론트엔드**:
  - `components/hand-search-dialog.tsx` - 4단계 핸드 선택 다이얼로그
  - `app/community/page.tsx` - 핸드 첨부 UI 및 미리보기
- **기능**:
  - Tournament → SubEvent → Day → Hand 4단계 검색
  - 포스트에 핸드 첨부
  - 첨부된 핸드 미리보기 카드
  - Archive 페이지로 이동 링크

**Phase 2.2: 북마크 시스템** ✅
- **데이터베이스**: `012_add_hand_bookmarks.sql` (hand_bookmarks 테이블)
- **백엔드 API**: `lib/hand-bookmarks.ts` (9개 함수)
- **프론트엔드**:
  - `components/bookmark-dialog.tsx` - 북마크 추가/수정 다이얼로그
  - `components/hand-history-detail.tsx` - 북마크 버튼 및 다이얼로그 통합
  - `app/bookmarks/page.tsx` - 북마크 페이지
  - `components/header.tsx` - 프로필 메뉴에 북마크 링크
- **기능**:
  - 핸드 북마크 추가/제거 (다이얼로그 UI)
  - 폴더별 북마크 정리 (기존 폴더 선택 + 새 폴더 생성)
  - 북마크에 노트 추가 (선택사항)
  - 북마크 편집 기능 (Edit 버튼)
  - 북마크 페이지에서 폴더별 필터링 및 관리
  - 헤더 메뉴에서 북마크 페이지 접근

#### Phase 3: 핸드 수정 요청 시스템 (2025-10-15 완료) ✅

**Phase 3.1: 백엔드 - 수정 요청 시스템** ✅
- **데이터베이스**: `017_add_hand_edit_requests.sql`
  - `hand_edit_requests` 테이블 (수정 제안 저장)
  - 4가지 수정 유형 (basic_info, board, players, actions)
  - 상태 관리 (pending, approved, rejected)
  - RLS 정책 (사용자/관리자 권한)
- **백엔드 API**: `lib/hand-edit-requests.ts` (8개 함수)
  - `createEditRequest()` - 수정 요청 생성
  - `fetchEditRequests()` - 수정 요청 목록 조회 (관리자)
  - `fetchUserEditRequests()` - 사용자별 요청 조회
  - `approveEditRequest()` - 수정 승인 및 핸드 데이터 적용
  - `rejectEditRequest()` - 수정 거부
  - `applyEditToHand()` - 핸드 데이터에 수정사항 적용
  - `getHandDataForEdit()` - 핸드 데이터 가져오기

**Phase 3.2: 프론트엔드 - 수정 요청 UI** ✅
- **사용자용**:
  - `app/my-edit-requests/page.tsx` - 내 제안 목록 페이지
  - 상태별 필터링 (전체/대기 중/승인됨/거부됨)
  - 관리자 코멘트 표시
- **관리자용**:
  - `app/admin/edit-requests/page.tsx` - 관리자 승인 페이지
  - Before/After 비교 UI
  - 승인/거부 워크플로우

**Note**: 핸드 상세 페이지의 "수정 제안" 버튼은 아직 미구현 (백엔드는 완성)

#### Phase 4: 관리자 시스템 (2025-10-15 완료) ✅

**Phase 4.1: 권한 및 역할 관리** ✅
- **데이터베이스**: `015_add_admin_system.sql`
  - `users.role` 컬럼 (user/moderator/admin)
  - 밴 시스템 (is_banned, ban_reason, banned_at)
  - `admin_logs` 테이블 (관리자 활동 로그)
- **백엔드 API**: `lib/admin.ts` (15개 함수)
  - `isAdmin()` - 관리자 권한 체크
  - `getDashboardStats()` - 대시보드 통계
  - `getRecentActivity()` - 최근 관리자 활동
  - `getUsers()` - 사용자 목록 (페이지네이션, 검색)
  - `banUser()`, `unbanUser()` - 사용자 밴/언밴
  - `changeUserRole()` - 역할 변경
  - `deletePost()`, `deleteComment()` - 콘텐츠 삭제
  - `logAdminAction()` - 관리자 활동 로그

**Phase 4.2: 관리자 페이지** ✅
- **프론트엔드**:
  - `app/admin/dashboard/page.tsx` - 대시보드 (통계 요약)
  - `app/admin/users/page.tsx` - 사용자 관리 (검색, 밴, 역할 변경)
  - `app/admin/claims/page.tsx` - 플레이어 클레임 승인
  - `app/admin/edit-requests/page.tsx` - 핸드 수정 요청 관리
  - `app/admin/content/page.tsx` - 콘텐츠 신고 관리

#### Phase 5: 콘텐츠 신고 시스템 (2025-10-15 완료) ✅

**Phase 5.1: 신고 시스템** ✅
- **데이터베이스**: `016_add_content_moderation.sql`
  - `reports` 테이블 (포스트/댓글 신고)
  - 신고 사유 (spam, harassment, inappropriate, misinformation, other)
  - `posts.is_hidden`, `comments.is_hidden` 컬럼
- **백엔드 API**: `lib/content-moderation.ts` (10개 함수)
  - `createReport()` - 신고 생성
  - `fetchReports()` - 신고 목록 조회 (관리자)
  - `approveReport()` - 신고 승인 (콘텐츠 숨김)
  - `rejectReport()` - 신고 거부
  - `hideContent()`, `unhideContent()` - 콘텐츠 숨김/표시
  - `deleteContent()` - 콘텐츠 삭제
  - `fetchAllPosts()`, `fetchAllComments()` - 전체 콘텐츠 조회

#### Phase 6: 유저 프로필 고도화 (2025-10-15 완료) ✅

**Phase 6.1: 프로필 확장** ✅
- **데이터베이스**: `014_add_user_profile_fields.sql`
  - 소셜 링크 (location, website, twitter_handle, instagram_handle)
  - 프로필 가시성 (public/private/friends)
  - 통계 캐싱 (posts_count, comments_count, likes_received)
  - 자동 통계 업데이트 트리거
- **백엔드 API**: `lib/user-profile.ts` (12개 함수)
  - `getProfile()`, `getCurrentUserProfile()` - 프로필 조회
  - `updateProfile()` - 프로필 수정
  - `checkNicknameAvailable()` - 닉네임 중복 체크
  - `fetchUserPosts()`, `fetchUserComments()`, `fetchUserBookmarks()` - 활동 조회
  - `uploadAvatar()` - 아바타 업로드

**Phase 6.2: 프로필 페이지** ✅
- **프론트엔드**:
  - `app/profile/page.tsx` - 내 프로필 페이지
  - `app/profile/[id]/page.tsx` - 다른 유저 프로필 페이지
  - 활동 요약 (포스트, 댓글, 북마크)
  - 소셜 링크 표시

#### Phase 7: 커뮤니티 검색 강화 (2025-10-15 완료) ✅

**Phase 7.1: Full-Text Search** ✅
- **데이터베이스**: `013_add_community_search.sql`
  - `posts.search_vector` 컬럼 (tsvector)
  - GIN 인덱스 (성능 최적화)
  - 자동 search_vector 업데이트 트리거
  - 제목/내용 가중치 검색 (제목 우선)
  - 작성자/날짜/카테고리 인덱스

#### Supabase CLI 설정 (2025-10-15 완료)
- **설정 파일**: `supabase/config.toml`
- **마이그레이션 히스토리**: `000_init_migration_history.sql`
- **파일명 표준화**: 모든 마이그레이션 파일을 타임스탬프 형식으로 변경
- **환경 변수**: `.env.example` 템플릿 생성
- **상태**: Local/Remote 마이그레이션 완벽 동기화

#### Phase 1: 핸드 상호작용 기본 기능 (2025-10-15 확인 완료)

**Phase 1.1: 핸드 좋아요/싫어요 시스템** ✅
- **백엔드**: `006_add_hand_likes.sql` (hand_likes 테이블, 트리거)
- **API**: `lib/hand-likes.ts` (4개 함수)
- **UI**:
  - `hand-history-detail.tsx` (line 239-259) - 좋아요/싫어요 버튼
  - `hand-list-accordion.tsx` (line 137-148) - 카운트 표시
- **기능**:
  - 좋아요/싫어요 토글 (추가/변경/취소)
  - Optimistic Update
  - 실시간 카운트 업데이트

**Phase 1.2: 핸드 댓글 시스템** ✅
- **컴포넌트**: `components/hand-comments.tsx` (완전한 댓글 시스템)
- **API**: `lib/supabase-community.ts` (댓글 관련 함수)
- **통합**: `hand-history-detail.tsx` (line 469-489)
- **기능**:
  - 댓글 작성 및 목록 표시
  - 답글 기능 (재귀적 대댓글)
  - 댓글 좋아요
  - 실시간 댓글 개수 업데이트

### ⏳ 다음 작업

#### 다음 우선순위
1. **핸드 수정 제안 UI 진입점 추가** (우선순위: 높음, 2-3시간)
   - 핸드 상세 페이지에 "수정 제안" 버튼 추가
   - 수정 제안 다이얼로그 구현 (4단계 폼)
   - Before/After 비교 미리보기
   - **Note**: 백엔드는 완성, 프론트엔드 진입점만 추가 필요

2. **영상 분석 테스트 및 개선** (우선순위: 중, 4-6시간)
   - 실제 포커 영상으로 분석 테스트
   - 감지 정확도 측정 및 개선
   - 오류 케이스 수집 및 프롬프트 개선

3. **플레이어 통계 고도화** (우선순위: 중, 3-5시간)
   - 더 많은 통계 지표 추가
   - 시간대별 성과 분석
   - 고급 차트 및 시각화

4. **추가 고급 기능** (우선순위: 낮)
   - 알림 시스템 (댓글, 수정 제안 응답)
   - 핸드 태그 시스템
   - 핸드 비교 기능 (Side-by-Side)

---

## 기술 스택

### 프론트엔드
- **프레임워크**: Next.js 14 (App Router)
- **UI 라이브러리**: shadcn/ui (50+ 컴포넌트)
- **스타일링**: Tailwind CSS
- **상태 관리**: Zustand (`filter-store.ts`)
- **영상 처리**: FFmpeg.wasm (브라우저 내 프레임 추출)
- **차트**: Recharts

### 백엔드 (완전 서버리스)
- **플랫폼**: Supabase
  - PostgreSQL (데이터베이스)
  - Storage (영상 파일)
  - Realtime (실시간 진행률)
  - Auth (Google OAuth)
- **API**: REST (Next.js API Routes)

### AI/ML
- **영상 분석**: Claude Vision API (Anthropic)
  - 핸드 경계 감지
  - 핸드 시퀀스 분석
- **자연어 검색**: Claude 3.5 Sonnet

---

## 디렉토리 구조

```
ggvault/
├── app/                      # Next.js 페이지 및 API
│   ├── page.tsx              # 홈
│   ├── archive/page.tsx      # Archive (Tournament 트리)
│   ├── search/page.tsx       # 검색
│   ├── players/              # 플레이어
│   ├── community/page.tsx    # 커뮤니티
│   ├── auth/                 # 로그인/OAuth
│   └── api/
│       ├── analyze-video/    # 영상 분석
│       ├── extract-youtube-frames/
│       └── natural-search/   # AI 자연어 검색
│
├── components/               # React 컴포넌트
│   ├── header.tsx            # 헤더 (네비게이션)
│   ├── auth-provider.tsx     # 인증 상태 관리
│   ├── video-player.tsx      # 영상 플레이어
│   ├── hand-list-accordion.tsx  # 핸드 목록 Accordion
│   ├── hand-history-detail.tsx  # 핸드 상세
│   ├── analyze-dialog.tsx    # 영상 분석 다이얼로그
│   ├── filter-panel.tsx      # 고급 검색 필터
│   ├── player-charts.tsx     # 플레이어 차트 (동적 임포트)
│   ├── claim-player-dialog.tsx  # 플레이어 클레임 다이얼로그
│   └── ui/                   # shadcn/ui 컴포넌트
│
├── lib/                      # 유틸리티
│   ├── supabase.ts           # Supabase 클라이언트
│   ├── auth.ts               # 인증 함수
│   ├── queries.ts            # 복잡한 쿼리
│   ├── filter-store.ts       # 검색 필터 상태
│   ├── hand-boundary-detector.ts  # 핸드 경계 감지
│   ├── hand-sequence-analyzer.ts  # 시퀀스 분석
│   ├── player-claims.ts      # 플레이어 클레임 API
│   └── types/
│       └── hand-history.ts   # HandHistory 타입
│
├── supabase/migrations/      # 데이터베이스 마이그레이션 (11개)
├── scripts/                  # 유틸리티 스크립트
│   └── delete-all-data.ts    # 전체 데이터 삭제
│
├── CLAUDE.md                 # 이 파일 (프로젝트 컨텍스트)
├── WORK_LOG.md               # 작업 로그
├── ROADMAP.md                # 개발 로드맵
├── PAGES_STRUCTURE.md        # 페이지 구조
└── DIRECTORY_STRUCTURE.md    # 디렉토리 구조
```

---

## 참고 문서

### 프로젝트 문서
- **개발 로드맵**: `ROADMAP.md` (Phase 0-4 계획)
- **페이지 구조**: `PAGES_STRUCTURE.md` (모든 페이지 설명)
- **디렉토리 구조**: `DIRECTORY_STRUCTURE.md` (파일 구조 상세)
- **작업 로그**: `WORK_LOG.md` (일별 작업 기록)

### 설정 가이드
- **환경 설정**: `../SETUP.md` (Supabase, Claude API 설정)

### API 문서
- **핸드 Import API**: `docs/HAND_IMPORT_API.md`
- **영상 소스 가이드**: `docs/VIDEO_SOURCES.md`

---

## 타이포그래피 시스템

```css
/* 제목 (Title) */
.text-title-lg    /* 24px, Bold (Desktop) */
.text-title       /* 18px, Semibold (Mobile) */

/* 본문 (Body) */
.text-body-lg     /* 16px, Regular */
.text-body        /* 14px, Regular */

/* 보조 정보 (Caption) */
.text-caption-lg  /* 14px, Regular/Medium */
.text-caption     /* 12px, Regular/Medium */
```

---

## 다음 세션 시작 시

1. `WORK_LOG.md` 확인 (최근 작업 내용)
2. http://localhost:3000 에서 개발 서버 실행
3. Supabase Studio에서 `011_add_player_claims.sql` 마이그레이션 실행 (아직 미실행)
4. 플레이어 클레임 기능 테스트

---

**마지막 업데이트**: 2025-10-15
**문서 버전**: 2.0
**프로젝트 상태**: Phase 0-7 완료, 모든 핵심 기능 완성 🎉

**최근 완료 작업 (2025-10-15 세션 8)**:
- ✅ Phase 3: 핸드 수정 요청 시스템 (백엔드 완성)
- ✅ Phase 4: 관리자 시스템 (역할, 밴, 활동 로그)
- ✅ Phase 5: 콘텐츠 신고 시스템 (포스트/댓글 신고)
- ✅ Phase 6: 유저 프로필 고도화 (소셜 링크, 통계 캐싱)
- ✅ Phase 7: 커뮤니티 검색 강화 (Full-Text Search)
- ✅ 관리자 페이지 5개 추가 (dashboard, users, claims, content, edit-requests)
- ✅ 유저 페이지 3개 추가 (profile, profile/[id], my-edit-requests)
- ✅ 마이그레이션 5개 추가 (013-017)

**이전 세션 완료 작업**:
- ✅ Phase 0: 인증 시스템 (Google OAuth)
- ✅ Phase 1: 핸드 좋아요/싫어요 + 댓글 시스템
- ✅ Phase 2: 커뮤니티 핸드 첨부 + 북마크 시스템
- ✅ 영상 분석 (Claude Vision 2단계 파이프라인)
- ✅ Supabase CLI 설정 및 마이그레이션 동기화

**다음 작업**:
- ⏳ 핸드 수정 제안 UI 진입점 추가 (2-3시간)
- ⏳ 영상 분석 테스트 및 개선
- ⏳ 플레이어 통계 고도화
