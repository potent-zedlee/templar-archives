# Templar Archives 페이지 구조도

## 📱 네비게이션 구조

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Templar Archives 로고 │ SEARCH │ ARCHIVE │ PLAYERS │ FORUM │ 🌓 │ LOGIN/PROFILE │
└──────────────────────────────────────────────────────────────────────────┘
```

**로그인 상태에 따른 변화**:
- **로그인 전**: "LOGIN" 버튼 → `/auth/login`
- **로그인 후**: 아바타 + 드롭다운 (Profile, Bookmarks, 관리자 메뉴, Logout)

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
**파일**: `app/archive/page.tsx`

### 레이아웃
좌우 분할 (Resizable Panels)

### 왼쪽: 토너먼트 트리

#### 계층 구조
```
Tournament (토너먼트)
├── Sub Event (서브 이벤트)
│   ├── Day 1
│   ├── Day 2
│   └── Day 3 (Final Table)
```

#### 각 레벨별 기능
- **Tournament**: ⋮ 메뉴 (수정, Sub Event 추가, 삭제), 카테고리, 위치, 날짜
- **Sub Event**: ⋮ 메뉴 (수정, Day 추가, 삭제), 이벤트명, 총 상금, 우승자
- **Day**: ⋮ 메뉴 (수정, 삭제), Day 이름, 비디오 소스 (YouTube/Upload/NAS)

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

## 💬 5. 커뮤니티 페이지 (FORUM)

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
- 핸드 첨부 (Tournament → SubEvent → Day → Hand 4단계 선택)
- 포스트 카드 (작성자, 카테고리, 좋아요/댓글/조회수, 작성 시간)
- 좋아요 토글
- 검색 기능 (Full-Text Search)

### 5.2 포스트 상세
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

## 📚 6. 북마크 페이지 (BOOKMARKS)
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

## 👤 7. 프로필 페이지 (PROFILE)

### 7.1 내 프로필
**URL**: `/profile`
**파일**: `app/profile/page.tsx`

- 프로필 정보 (아바타, 닉네임, 소셜 링크)
- 통계 (포스트 수, 댓글 수, 받은 좋아요)
- 활동 요약 (포스트, 댓글, 북마크)

### 7.2 다른 유저 프로필
**URL**: `/profile/[id]`
**파일**: `app/profile/[id]/page.tsx`

- 공개 프로필 정보
- 활동 내역 (프라이버시 설정에 따름)

---

## 🔐 8. 인증 페이지 (AUTH)

### 8.1 로그인 페이지
**URL**: `/auth/login`
**파일**: `app/auth/login/page.tsx`

- Google OAuth 로그인
- 원클릭 로그인, 자동 계정 생성
- 로그인 성공 시 → 이전 페이지 또는 홈으로 이동

### 8.2 OAuth 콜백
**URL**: `/auth/callback`
**파일**: `app/auth/callback/page.tsx`

- Google OAuth 리디렉션 처리
- 로딩 스피너, 자동 홈 이동

---

## 👮 9. 관리자 페이지 (ADMIN)
**인증**: 관리자 권한 필수

### 9.1 대시보드
**URL**: `/admin/dashboard`
- 통계 요약 (사용자, 포스트, 댓글, 핸드)

### 9.2 사용자 관리
**URL**: `/admin/users`
- 사용자 목록 (검색, 페이지네이션)
- 밴/언밴, 역할 변경 (user/moderator/admin)

### 9.3 플레이어 클레임
**URL**: `/admin/claims`
- 클레임 요청 목록
- 승인/거절 워크플로우

### 9.4 핸드 수정 요청
**URL**: `/admin/edit-requests`
- 수정 제안 목록 (Before/After 비교)
- 승인 시 핸드 데이터 자동 적용

### 9.5 콘텐츠 신고
**URL**: `/admin/content`
- 포스트/댓글 신고 목록
- 승인 (콘텐츠 숨김) / 거부

---

## 🔧 10. API 엔드포인트

### 10.1 자연어 검색 API
**Endpoint**: `POST /api/natural-search`
**파일**: `app/api/natural-search/route.ts`

**기능**: Claude AI로 자연어 질문을 SQL 쿼리로 변환

**요청**:
```json
{"query": "Daniel Negreanu가 AA를 들고 플레이한 핸드"}
```

**응답**:
```json
{"success": true, "hands": [...]}
```

### 10.2 핸드 Import API
**Endpoint**: `POST /api/import-hands`
**파일**: `app/api/import-hands/route.ts`
**문서**: `docs/HAND_IMPORT_API.md`

**기능**: 외부 시스템에서 분석한 핸드 히스토리를 Templar Archives에 추가

**요청 예시**: dayId, source, hands[] (handNumber, startTime, endTime, players[], potSize 등)

**응답 예시**:
```json
{"success": true, "imported": 5, "failed": 0, "errors": []}
```

### 10.3 영상 분석 API
**Endpoint**: `POST /api/analyze-video`
**파일**: `app/api/analyze-video/route.ts`

**기능**: Claude Vision으로 영상 분석 (핸드 경계 감지 + 시퀀스 분석)

---

## 🗄️ 11. 데이터베이스 구조

### 테이블 관계도
```
tournaments
    ├── sub_events
    │     └── days
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
- **tournaments**: name, category, location, start_date, end_date
- **sub_events**: tournament_id, name, date, total_prize, winner
- **days**: sub_event_id, name, video_url/file/nas_path, video_source
- **hands**: day_id, number, timestamp, description, confidence, summary
- **players**: name, photo_url, country, total_winnings
- **hand_players**: hand_id, player_id, position, cards
- **posts**: title, content, category, author_id, hand_id, likes_count, comments_count, views_count
- **comments**: post_id, parent_comment_id, author_id, content
- **hand_bookmarks**: user_id, hand_id, folder, notes
- **player_claims**: player_id, user_id, status, proof_url, admin_comment
- **reports**: content_type, content_id, reporter_id, reason, status
- **hand_edit_requests**: hand_id, user_id, edit_type, proposed_changes, status

---

## ✨ 12. 구현 상태

### 완료된 Phase ✅

#### Phase 0: 인증 시스템
- Google OAuth 로그인, 로그아웃
- 전역 인증 상태 관리, Row Level Security

#### Phase 1: 핸드 상호작용
- 핸드 좋아요/싫어요, 댓글 시스템

#### Phase 2: 커뮤니티 강화
- 포스트 작성, 핸드 첨부
- 북마크 시스템 (폴더, 노트)

#### Phase 3: 핸드 수정 요청
- 수정 제안 시스템 (백엔드 완성)
- 관리자 승인 페이지

#### Phase 4: 관리자 시스템
- 역할 관리 (user/moderator/admin)
- 밴 시스템, 활동 로그

#### Phase 5: 콘텐츠 신고
- 포스트/댓글 신고, 관리자 승인/거부

#### Phase 6: 유저 프로필 고도화
- 소셜 링크, 프로필 가시성
- 통계 캐싱 (자동 업데이트 트리거)

#### Phase 7: 커뮤니티 검색
- Full-Text Search (tsvector, GIN 인덱스)

### 인증 필수 vs 선택 기능 🔐

#### 인증 없이 가능 (읽기 전용)
- 홈, 아카이브, 핸드, 검색, 플레이어, 커뮤니티 읽기

#### 인증 필수 (쓰기 작업)
- 핸드 좋아요/댓글, 포스트 작성, 북마크, 핸드 수정 제안

---

## 📋 13. 페이지별 파일 매핑

| 페이지 | URL | 파일 경로 |
|--------|-----|-----------|
| 홈 | `/` | `app/page.tsx` |
| 검색 | `/search` | `app/search/page.tsx` |
| 아카이브 | `/archive` | `app/archive/page.tsx` |
| 플레이어 목록 | `/players` | `app/players/page.tsx` |
| 플레이어 상세 | `/players/[id]` | `app/players/[id]/page.tsx` |
| 커뮤니티 | `/community` | `app/community/page.tsx` |
| 포스트 상세 | `/community/[id]` | `app/community/[id]/page.tsx` |
| 북마크 | `/bookmarks` | `app/bookmarks/page.tsx` |
| 내 프로필 | `/profile` | `app/profile/page.tsx` |
| 다른 유저 프로필 | `/profile/[id]` | `app/profile/[id]/page.tsx` |
| 내 수정 제안 | `/my-edit-requests` | `app/my-edit-requests/page.tsx` |
| 로그인 | `/auth/login` | `app/auth/login/page.tsx` |
| OAuth 콜백 | `/auth/callback` | `app/auth/callback/page.tsx` |
| 관리자 대시보드 | `/admin/dashboard` | `app/admin/dashboard/page.tsx` |
| 관리자 사용자 | `/admin/users` | `app/admin/users/page.tsx` |
| 관리자 클레임 | `/admin/claims` | `app/admin/claims/page.tsx` |
| 관리자 수정 요청 | `/admin/edit-requests` | `app/admin/edit-requests/page.tsx` |
| 관리자 신고 | `/admin/content` | `app/admin/content/page.tsx` |

---

**마지막 업데이트**: 2025-10-16
**버전**: 3.1
**상태**: Phase 0-8 완료 (모든 핵심 기능)
**총 페이지**: 22개 (유저 17개, 관리자 5개)

**최근 추가 (세션 12)**:
- `/community/[id]` - 포스트 상세 페이지 (Reddit 스타일 댓글 시스템)
