# Templar Archives 페이지 구조도

## 📱 네비게이션 구조

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ TA 로고 │ About │ News │ Live │ ARCHIVE ▼ │ Players │ Forum │ 🔔 │ 🌓 │ LOGIN/PROFILE │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**ARCHIVE 드롭다운** (Phase 23):
- Tournament
- Cash Game
- Search

**로그인 상태에 따른 변화**:
- **로그인 전**: "LOGIN" 버튼 → `/auth/login`
- **로그인 후**: 🔔 알림 벨 + 아바타 + 드롭다운 (Profile, Bookmarks, Notifications, 관리자 메뉴, Reporter 메뉴, Logout)

---

## 🏠 1. 홈페이지 (/)
**파일**: `app/page.tsx`

### 구성 섹션
- Hero Section (메인 비주얼, CTA 버튼)
- Recent Analyses (최근 분석 영상)
- Most Used Videos (인기 영상)
- On This Day (오늘의 역사)

---

## 🔍 2. 검색 페이지 (SEARCH)
**파일**: `app/search/page.tsx`

### 주요 기능
- **기본 검색**: 키워드, 토너먼트, 플레이어, 날짜 필터
- **AI 자연어 검색**: Claude AI 기반 (예: "Daniel Negreanu가 AA를 플레이한 핸드")
- **고급 필터**: 포지션, 홀카드, 보드 카드, POT 사이즈, 액션 유형 (30+ 조건)
- **검색 결과**: 테이블 형식, 즐겨찾기 토글

### 관련 컴포넌트
- `components/filter-panel.tsx`, `lib/filter-store.ts`

### API
- `POST /api/natural-search` - Claude AI 자연어 검색

---

## 📂 3. 아카이브 페이지 (ARCHIVE)

### 3.1 토너먼트 아카이브
**URL**: `/archive/tournament`
**파일**: `app/archive/tournament/page.tsx`

### 3.2 캐시 게임 아카이브
**URL**: `/archive/cash-game`
**파일**: `app/archive/cash-game/page.tsx`

### 3.3 통합 아카이브
**파일**: `app/archive/page.tsx` (자동 리다이렉트 → `/archive/tournament`)

### 레이아웃
좌우 분할 (Resizable Panels)

### 왼쪽: 토너먼트 트리

#### 계층 구조
```
Tournament (토너먼트)
├── Event (이벤트)
│   ├── Stream 1
│   ├── Stream 2
│   └── Stream 3 (Final Table)
```

#### 각 레벨별 기능
- **Tournament**: ⋮ 메뉴 (수정, Event 추가, 삭제), 카테고리, 위치, 날짜
- **Event**: ⋮ 메뉴 (수정, Stream 추가, 삭제), 이벤트명, 총 상금, 우승자
- **Stream**: ⋮ 메뉴 (수정, 삭제), Stream 이름, 비디오 소스 (YouTube/Upload/NAS)

#### 카테고리
WSOP, Triton, EPT, APL, Hustler Casino Live, WSOP Classic, GGPOKER

### 오른쪽: 영상 플레이어 + 핸드 목록

#### 영상 플레이어
- YouTube/로컬 업로드/NAS 영상 재생

#### 핸드 목록 (Accordion)
- 핸드 번호, 타임스탬프, 신뢰도
- 플레이어 목록 (포지션, 홀카드, 스택)
- 스트릿별 액션 (Preflop/Flop/Turn/River)
- POT 정보, 우승자, 상금
- 좋아요/싫어요, 댓글, 북마크 버튼

#### 빈 핸드 상태
- "핸드가 없습니다. 외부 시스템에서 핸드를 import하세요."
- API: `POST /api/import-hands`

### 관련 컴포넌트
- `components/video-player.tsx`
- `components/hand-list-accordion.tsx`
- `components/hand-history-detail.tsx`

---

## 👥 4. 플레이어 페이지 (PLAYERS)

### 4.1 플레이어 목록
**URL**: `/players`
**파일**: `app/players/page.tsx`

- 검색 (이름, 국가)
- 아바타, 국가 플래그
- 총 상금 (포맷: $1.5M), 핸드 개수

### 4.2 플레이어 상세
**URL**: `/players/[id]`
**파일**: `app/players/[id]/page.tsx`

- **프로필 헤더**: 아바타, 이름, 국가, 총 상금, 통계
- **핸드 히스토리 목록**: 플레이어 참여 핸드, 즐겨찾기 토글
- **클레임 시스템**: 플레이어 프로필 소유권 인증 (소셜 미디어, 이메일 인증, 관리자 승인)

---

## 📰 5. 뉴스 페이지 (NEWS)

### 5.1 뉴스 목록
**URL**: `/news`
**파일**: `app/news/page.tsx`

#### 주요 기능 (Phase 22)
- 5가지 카테고리 (Tournament News, Player News, Industry, General, Other)
- 카테고리 필터링, 검색
- 뉴스 카드 (제목, 요약, 커버 이미지, 작성자, 날짜)
- 태그 표시

### 5.2 뉴스 상세
**URL**: `/news/[id]`
**파일**: `app/news/[id]/page.tsx`

#### 주요 기능
- Markdown 콘텐츠 렌더링
- 커버 이미지, 태그, 외부 링크
- 작성자 프로필
- 공유 버튼

---

## 📡 6. 라이브 리포팅 페이지 (LIVE REPORTING)

### 6.1 라이브 리포트 목록
**URL**: `/live-reporting`
**파일**: `app/live-reporting/page.tsx`

#### 주요 기능 (Phase 22)
- 5가지 카테고리 (Tournament Update, Chip Counts, Breaking News, Results, Other)
- LIVE 배지 표시
- 실시간 업데이트

### 6.2 라이브 리포트 상세
**URL**: `/live-reporting/[id]`
**파일**: `app/live-reporting/[id]/page.tsx`

---

## 💬 7. 커뮤니티 페이지 (FORUM)

### 5.1 커뮤니티 목록
**URL**: `/community`
**파일**: `app/community/page.tsx`

#### 탭
- Trending / Recent / Popular

#### 포스트 카테고리
- **Analysis** (분석) - 파란색
- **Strategy** (전략) - 녹색
- **Hand Review** (핸드 리뷰) - 보라색
- **General** (일반) - 회색

#### 주요 기능
- 포스트 작성 (제목, 내용, 카테고리)
- 핸드 첨부 (Tournament → Event → Stream → Hand 4단계 선택)
- 포스트 카드 (작성자, 카테고리, 좋아요/댓글/조회수, 작성 시간)
- 좋아요 토글
- 검색 기능 (Full-Text Search)

### 7.2 포스트 상세
**URL**: `/community/[id]`
**파일**: `app/community/[id]/page.tsx`

#### 주요 기능
- 전체 포스트 내용 표시
- 작성자 프로필 (아바타, 이름)
- 카테고리 배지, 작성 시간
- 첨부된 핸드 프리뷰 카드 (있는 경우)
- 좋아요, 공유 버튼
- 신고 버튼
- **Reddit 스타일 댓글/답글 시스템**:
  - 무한 중첩 지원 (재귀 렌더링)
  - 시각적 계층 (ml-8 들여쓰기, border-l-2 왼쪽 테두리)
  - Reply 토글 버튼 (답글 폼 show/hide)
  - 답글 lazy loading (클릭 시 로드)
  - 댓글/답글 좋아요 지원

#### 컴포넌트
- `components/post-comments.tsx` (373줄, Reddit 스타일 구현)

---

## 🔔 8. 알림 페이지 (NOTIFICATIONS)
**URL**: `/notifications`
**파일**: `app/notifications/page.tsx`
**인증**: 로그인 필수

### 주요 기능 (Phase 20)
- **8가지 알림 타입**:
  - comment - 포스트에 새 댓글
  - reply - 댓글에 답글
  - like_post - 포스트 좋아요
  - like_comment - 댓글 좋아요
  - edit_approved - 핸드 수정 제안 승인
  - edit_rejected - 핸드 수정 제안 거부
  - claim_approved - 플레이어 클레임 승인
  - claim_rejected - 플레이어 클레임 거부
- **All/Unread 탭 필터링**
- **실시간 알림** (Supabase Realtime)
- **Toast 알림** (새 알림 실시간 표시)
- **읽음/읽지 않음 관리**
- **알림 클릭 시 자동 읽음 처리 및 관련 페이지 이동**

### 헤더 알림 벨
**컴포넌트**: `components/notification-bell.tsx`

- 읽지 않은 알림 개수 배지
- 드롭다운 미리보기 (최근 10개)
- 자동 폴링 (1분마다)

---

## 📚 9. 북마크 페이지 (BOOKMARKS)
**URL**: `/bookmarks`
**파일**: `app/bookmarks/page.tsx`
**인증**: 로그인 필수

### 주요 기능
- 북마크 목록 (폴더별 탭 필터링)
- 핸드 정보 (번호, 토너먼트, 날짜, 개인 메모)
- 북마크 액션 (View, Edit, Delete)
- 폴더 관리 ("All" 탭 + 사용자 폴더)

### 북마크 다이얼로그
**컴포넌트**: `components/bookmark-dialog.tsx`

- Add/Edit 모드
- 폴더 선택 (기존 폴더 또는 새 폴더 생성)
- 노트 작성 (선택사항)

### 백엔드 API
**파일**: `lib/hand-bookmarks.ts`
- `addHandBookmark()`, `removeHandBookmark()`
- `updateBookmarkFolder()`, `updateBookmarkNotes()`
- `getUserBookmarks()`, `getUserBookmarkFolders()`

---

## 👤 10. 프로필 페이지 (PROFILE)

### 10.1 내 프로필
**URL**: `/profile`
**파일**: `app/profile/page.tsx`

- 프로필 정보 (아바타, 닉네임, 소셜 링크)
- 통계 (포스트 수, 댓글 수, 받은 좋아요)
- 활동 요약 (포스트, 댓글, 북마크)

### 10.2 다른 유저 프로필
**URL**: `/profile/[id]`
**파일**: `app/profile/[id]/page.tsx`

- 공개 프로필 정보
- 활동 내역 (프라이버시 설정에 따름)

---

## 🔐 11. 인증 페이지 (AUTH)

### 11.1 로그인 페이지
**URL**: `/auth/login`
**파일**: `app/auth/login/page.tsx`

- Google OAuth 로그인
- 원클릭 로그인, 자동 계정 생성
- 로그인 성공 시 → 이전 페이지 또는 홈으로 이동

### 11.2 OAuth 콜백
**URL**: `/auth/callback`
**파일**: `app/auth/callback/page.tsx`

- Google OAuth 리디렉션 처리
- 로딩 스피너, 자동 홈 이동

---

## 👮 12. 관리자 페이지 (ADMIN)
**인증**: 관리자 권한 필수 (admin, high_templar)

### 12.1 대시보드
**URL**: `/admin/dashboard`
**파일**: `app/admin/dashboard/page.tsx`
- 통계 요약 (사용자, 포스트, 댓글, 핸드)

### 12.2 사용자 관리
**URL**: `/admin/users`
**파일**: `app/admin/users/page.tsx`
- 사용자 목록 (검색, 페이지네이션)
- 밴/언밴, 역할 변경 (user/high_templar/reporter/admin)
- **마지막 로그인 추적** (Phase 25): 색상 코딩 (🟢 7일 이내, ⚫ 30일 이상)

### 12.3 플레이어 클레임
**URL**: `/admin/claims`
**파일**: `app/admin/claims/page.tsx`
- 클레임 요청 목록
- 승인/거절 워크플로우

### 12.4 핸드 수정 요청
**URL**: `/admin/edit-requests`
**파일**: `app/admin/edit-requests/page.tsx`
- 수정 제안 목록 (Before/After 비교)
- 승인 시 핸드 데이터 자동 적용

### 12.5 콘텐츠 신고 및 승인
**URL**: `/admin/content`
**파일**: `app/admin/content/page.tsx`
- **포스트/댓글 신고** 목록
- 승인 (콘텐츠 숨김) / 거부
- **뉴스 승인** (Phase 22): News/Live Reports Approval 탭
- 전체 콘텐츠 미리보기 다이얼로그
- Approve/Reject 버튼

### 12.6 아카이브 관리
**URL**: `/admin/archive`
**파일**: `app/admin/archive/page.tsx`
- **토너먼트 관리** (Phase 31): 테이블 뷰, 검색/필터 (Category, Game Type)
- CRUD 작업 통합 (기존 TournamentDialog 재사용)
- 관리자 전용 접근 제어

### 12.7 핸드 액션 수정
**URL**: `/admin/hands/[id]/edit-actions`
**파일**: `app/admin/hands/[id]/edit-actions/page.tsx`
- **수동 핸드 액션 입력** (Phase 18)
- Street별 액션 관리 (Preflop, Flop, Turn, River)
- 6가지 액션 타입 (fold, check, call, bet, raise, all-in)
- Pending Actions 워크플로우

---

## 📰 13. Reporter 페이지 (REPORTER)
**인증**: Reporter 권한 필수 (reporter, admin, high_templar)

### 13.1 뉴스 관리
**URL**: `/reporter/news`
**파일**: `app/reporter/news/page.tsx`
- **뉴스 작성/수정/삭제** (Phase 22)
- 5가지 카테고리 (Tournament News, Player News, Industry, General, Other)
- Markdown 에디터, 이미지 업로드 (Supabase Storage)
- 상태 워크플로우: draft → pending → published
- 태그 관리, 외부 링크 지원

### 13.2 라이브 리포팅 관리
**URL**: `/reporter/live`
**파일**: `app/reporter/live/page.tsx`
- **라이브 리포트 작성/수정/삭제** (Phase 22)
- 5가지 카테고리 (Tournament Update, Chip Counts, Breaking News, Results, Other)
- LIVE 배지 표시
- 동일한 승인 워크플로우

---

## 🔧 14. API 엔드포인트

### 14.1 자연어 검색 API
**Endpoint**: `POST /api/natural-search`
**파일**: `app/api/natural-search/route.ts`

**기능**: Claude AI로 자연어 질문을 JSON 필터로 변환 (Phase 32 보안 강화)

**요청**:
```json
{"query": "Daniel Negreanu가 AA를 들고 플레이한 핸드"}
```

**응답**:
```json
{"success": true, "hands": [...]}
```

### 14.2 핸드 Import API
**Endpoint**: `POST /api/import-hands`
**파일**: `app/api/import-hands/route.ts`
**문서**: `docs/HAND_IMPORT_API.md`

**기능**: 외부 시스템에서 분석한 핸드 히스토리를 Templar Archives에 추가

**요청 예시**: dayId, source, hands[] (handNumber, startTime, endTime, players[], potSize 등)

**응답 예시**:
```json
{"success": true, "imported": 5, "failed": 0, "errors": []}
```

### 14.3 영상 분석 API
**Endpoint**: `POST /api/analyze-video`
**파일**: `app/api/analyze-video/route.ts`

**기능**: Claude Vision으로 영상 분석 (핸드 경계 감지 + 시퀀스 분석)

---

## 🗄️ 15. 데이터베이스 구조

### 테이블 관계도
```
tournaments
    ├── sub_events (Events)
    │     └── streams
    │           └── hands
    │                 ├── hand_players → players
    │                 ├── hand_likes
    │                 ├── comments
    │                 └── hand_bookmarks

posts
    ├── comments (재귀적 답글)
    ├── post_likes
    └── reports

users
    ├── player_claims
    ├── hand_bookmarks
    └── admin_logs
```

### 주요 테이블
- **tournaments**: name, category, location, start_date, end_date, game_type
- **sub_events**: tournament_id, name, date, total_prize, winner, event_number (테이블명은 유지, Events를 의미)
- **streams**: sub_event_id, name, video_url/file/nas_path, video_source, published_at
- **hands**: stream_id, number, timestamp, description, confidence, summary
- **hand_actions**: hand_id, player_id, street, action_type, amount, sequence_number (Phase 18)
- **players**: name, photo_url, country, total_winnings
- **hand_players**: hand_id, player_id, position, cards
- **posts**: title, content, category, author_id, hand_id, likes_count, comments_count, views_count
- **comments**: post_id, parent_comment_id, author_id, content
- **hand_bookmarks**: user_id, hand_id, folder, notes
- **player_claims**: player_id, user_id, status, proof_url, admin_comment
- **reports**: content_type, content_id, reporter_id, reason, status
- **hand_edit_requests**: hand_id, user_id, edit_type, proposed_changes, status
- **notifications**: user_id, type, title, message, link, read_at (Phase 20)
- **news**: title, content, category, author_id, status, cover_image, tags (Phase 22)
- **live_reports**: title, content, category, author_id, status, is_live (Phase 22)

---

## ✨ 16. 구현 상태

### 완료된 Phase ✅ (Phase 0-32)

#### Phase 0-7: 핵심 시스템
- 인증 시스템 (Google OAuth, RLS)
- 핸드 상호작용 (좋아요, 댓글)
- 커뮤니티 강화 (포스트, 핸드 첨부, 북마크)
- 핸드 수정 요청 시스템
- 관리자 시스템 (역할 관리, 밴)
- 콘텐츠 신고 시스템
- 유저 프로필 고도화
- 커뮤니티 검색 (Full-Text Search)

#### Phase 8-15: 아키텍처 및 UI 개선
- Archive Folder Navigation (Google Drive 스타일)
- 코드 품질 및 아키텍처 개선 (1,733줄 → 88줄)
- 성능 최적화 (React 메모이제이션)
- UX/UI 개선 (Error Boundary, Toast)
- 테스팅 전략 (E2E 13개, Unit 40+개)
- 보안 강화 (SQL/XSS 방지)
- Archive UI Redesign (수평 로고 바)
- 로고 관리 시스템

#### Phase 16-21: 현대화 및 고급 기능
- React Query Migration (6개 query 파일, 650줄)
- DevTools Optimization
- Manual Hand Action Input System (수동 액션 입력)
- Archive UI Enhancement (필터 간소화)
- Notification System (8가지 알림 타입, 실시간)
- Player Statistics Enhancement (고급 통계)

#### Phase 22-27: 콘텐츠 확장 및 최적화
- News & Live Reporting System (Reporter 역할)
- Navigation Expansion & Archive Split (Tournament/Cash Game)
- Archive UI Enhancement (Card Selector, Advanced Filters)
- Last Sign-in Tracking
- UI Simplification
- Quick Upload Enhancement & YouTube API Optimization

#### Phase 28-32: 유지보수 및 보안
- Performance Optimization & Maintenance (SEO, 번들 최적화)
- Admin Category Logo Upload 수정
- Archive Event Management Enhancement (Event Number, From Unsorted)
- Archive Security & Admin Management Page (Server Actions)
- **Comprehensive Security Enhancement** (8가지 보안 개선, 보안 등급 A)

### 인증 필수 vs 선택 기능 🔐

#### 인증 없이 가능 (읽기 전용)
- 홈, 아카이브, 핸드, 검색, 플레이어, 커뮤니티 읽기

#### 인증 필수 (쓰기 작업)
- 핸드 좋아요/댓글, 포스트 작성, 북마크, 핸드 수정 제안

---

## 📋 17. 페이지별 파일 매핑

| 페이지 | URL | 파일 경로 | 인증 |
|--------|-----|-----------|------|
| 홈 | `/` | `app/page.tsx` | - |
| About | `/about` | `app/about/page.tsx` | - |
| 검색 | `/search` | `app/search/page.tsx` | - |
| 토너먼트 아카이브 | `/archive/tournament` | `app/archive/tournament/page.tsx` | - |
| 캐시 게임 아카이브 | `/archive/cash-game` | `app/archive/cash-game/page.tsx` | - |
| 플레이어 목록 | `/players` | `app/players/page.tsx` | - |
| 플레이어 상세 | `/players/[id]` | `app/players/[id]/page.tsx` | - |
| 뉴스 목록 | `/news` | `app/news/page.tsx` | - |
| 뉴스 상세 | `/news/[id]` | `app/news/[id]/page.tsx` | - |
| 라이브 리포팅 목록 | `/live-reporting` | `app/live-reporting/page.tsx` | - |
| 라이브 리포팅 상세 | `/live-reporting/[id]` | `app/live-reporting/[id]/page.tsx` | - |
| 커뮤니티 | `/community` | `app/community/page.tsx` | - |
| 포스트 상세 | `/community/[id]` | `app/community/[id]/page.tsx` | - |
| 북마크 | `/bookmarks` | `app/bookmarks/page.tsx` | 🔐 |
| 알림 | `/notifications` | `app/notifications/page.tsx` | 🔐 |
| 내 프로필 | `/profile` | `app/profile/page.tsx` | 🔐 |
| 다른 유저 프로필 | `/profile/[id]` | `app/profile/[id]/page.tsx` | - |
| 내 수정 제안 | `/my-edit-requests` | `app/my-edit-requests/page.tsx` | 🔐 |
| 로그인 | `/auth/login` | `app/auth/login/page.tsx` | - |
| OAuth 콜백 | `/auth/callback` | `app/auth/callback/page.tsx` | - |
| **Reporter 뉴스 관리** | `/reporter/news` | `app/reporter/news/page.tsx` | 🔐 Reporter |
| **Reporter 라이브 관리** | `/reporter/live` | `app/reporter/live/page.tsx` | 🔐 Reporter |
| 관리자 대시보드 | `/admin/dashboard` | `app/admin/dashboard/page.tsx` | 🔐 Admin |
| 관리자 사용자 | `/admin/users` | `app/admin/users/page.tsx` | 🔐 Admin |
| 관리자 클레임 | `/admin/claims` | `app/admin/claims/page.tsx` | 🔐 Admin |
| 관리자 수정 요청 | `/admin/edit-requests` | `app/admin/edit-requests/page.tsx` | 🔐 Admin |
| 관리자 신고/승인 | `/admin/content` | `app/admin/content/page.tsx` | 🔐 Admin |
| **관리자 아카이브** | `/admin/archive` | `app/admin/archive/page.tsx` | 🔐 Admin |
| **관리자 핸드 액션** | `/admin/hands/[id]/edit-actions` | `app/admin/hands/[id]/edit-actions/page.tsx` | 🔐 Admin |

---

**마지막 업데이트**: 2025-11-19
**버전**: 6.0
**상태**: Phase 43 완료 (SubEvent → Event 용어 통일 + Flowbite 전면 도입)
**총 페이지**: 49개 (유저 18개, Reporter 2개, 관리자 7개, 인증 2개, API 3개)

**최근 주요 업데이트**:
- Phase 43: SubEvent → Event 전역 용어 변경
- Phase 42: Archive 페이지 Flowbite 전면 도입
- Phase 41: Virtual Scrolling 성능 최적화
- Phase 40: 플레이어 통계 시스템 고도화 (VPIP, 3BET, ATS)
- Phase 32: Comprehensive Security Enhancement (보안 등급 A)
- Phase 22: News & Live Reporting System
