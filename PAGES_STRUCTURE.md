# GGVault 페이지 구조도

## 📱 네비게이션 구조

```
┌──────────────────────────────────────────────────────────────────────────┐
│ GGVault 로고 │ SEARCH │ ARCHIVE │ PLAYERS │ FORUM │ 🌓 │ LOGIN/PROFILE │
└──────────────────────────────────────────────────────────────────────────┘
```

**로그인 상태에 따른 변화**:
- **로그인 전**: "LOGIN" 버튼 → `/auth/login` 페이지로 이동
- **로그인 후**: 사용자 아바타 + 드롭다운 메뉴
  - Profile (`/profile`)
  - Bookmarks (`/bookmarks`)
  - [관리자 메뉴] (관리자만 표시)
  - Logout

---

## 🏠 1. 홈페이지 (/)
**URL**: `/`
**파일**: `app/page.tsx`

### 구성 섹션
- **Hero Section**: 메인 비주얼, CTA 버튼
- **Recent Analyses**: 최근 분석된 영상들
- **Most Used Videos**: 가장 많이 사용된 영상들
- **On This Day**: 오늘의 역사

### 관련 컴포넌트
- `components/hero-section.tsx`
- `components/recent-analyses.tsx`
- `components/most-used-videos.tsx`
- `components/on-this-day.tsx`

---

## 🔍 2. 검색 페이지 (SEARCH)
**URL**: `/search`
**파일**: `app/search/page.tsx`

### 주요 기능
1. **기본 검색**
   - 키워드 검색
   - 토너먼트 필터
   - 플레이어 필터
   - 날짜 범위 필터
   - 즐겨찾기 필터

2. **AI 자연어 검색** ⭐
   - Claude AI 기반
   - 자연스러운 질문으로 검색
   - 예: "Daniel Negreanu가 AA를 들고 플레이한 핸드"

3. **고급 필터**
   - 포지션별 필터
   - 홀카드 필터
   - 보드 카드 필터
   - POT 사이즈 범위
   - 액션 유형 필터

4. **검색 결과**
   - 테이블 형식
   - 핸드 번호, 설명, 플레이어, 타임스탬프
   - 즐겨찾기 토글

### 관련 컴포넌트
- `components/filter-panel.tsx`
- `lib/filter-store.ts`

### API 엔드포인트
- `POST /api/natural-search` - Claude AI 자연어 검색

---

## 📂 3. 아카이브 페이지 (ARCHIVE)
**URL**: `/archive`
**파일**: `app/archive/page.tsx`

### 레이아웃
좌우 분할 (Resizable Panels)

### 왼쪽 패널: 토너먼트 트리

#### 계층 구조
```
Tournament (토너먼트)
├── Sub Event (서브 이벤트)
│   ├── Day 1
│   ├── Day 2
│   └── Day 3 (Final Table)
```

#### 각 레벨별 기능

**Tournament 레벨**
- ⋮ 메뉴 (호버 시 표시)
  - ✏️ 수정
  - ➕ Sub Event 추가
  - 🗑️ 삭제
- 속성: 카테고리, 위치, 시작일, 종료일
- 카테고리: WSOP, Triton, EPT, APL, Hustler Casino Live, WSOP Classic, GGPOKER

**Sub Event 레벨**
- ⋮ 메뉴
  - ✏️ 수정
  - ➕ Day 추가
  - 🗑️ 삭제
- 속성: 이벤트명, 날짜, 총 상금, 우승자

**Day 레벨**
- ⋮ 메뉴
  - ✏️ 수정
  - 🗑️ 삭제
- 속성: Day 이름, 비디오 소스
- 비디오 소스 타입:
  - **YouTube**: YouTube URL
  - **Upload**: 로컬 파일 업로드 (Supabase Storage)
  - **NAS**: NAS 경로

### 오른쪽 패널: 영상 플레이어 + 핸드 목록

#### 영상 플레이어
- YouTube 영상 재생
- 로컬 업로드 파일 재생
- NAS 경로 영상 재생

#### 핸드 목록 (Accordion)
- 각 핸드 클릭 시 확장
- 핸드 상세 정보:
  - 핸드 번호, 타임스탬프, 신뢰도
  - 플레이어 목록 (포지션, 홀카드, 스택)
  - 스트릿별 액션 (Preflop, Flop, Turn, River)
  - POT 정보
  - 우승자, 상금

#### 빈 핸드 상태
- "핸드가 없습니다. 외부 시스템에서 핸드를 import하세요."
- API: `POST /api/import-hands`

### 관련 컴포넌트
- `components/video-player.tsx`
- `components/hand-list-accordion.tsx`
- `components/hand-history-detail.tsx`

### API 엔드포인트
- `POST /api/import-hands` - 외부 시스템에서 핸드 import

---

## 👥 4. 플레이어 페이지 (PLAYERS)
**URL**: `/players`
**파일**: `app/players/page.tsx`

### 주요 기능
1. **플레이어 목록**
   - 검색 기능 (이름, 국가)
   - 아바타 이미지
   - 국가 플래그
   - 총 상금 (포맷팅: $1.5M, $200K)
   - 핸드 개수

2. **플레이어 카드**
   - 클릭 시 플레이어 상세 페이지로 이동

### 4.1 플레이어 상세 페이지
**URL**: `/players/[id]`
**파일**: `app/players/[id]/page.tsx`

#### 섹션
1. **프로필 헤더**
   - 아바타, 이름, 국가
   - 총 상금
   - 통계 (핸드 수)

2. **핸드 히스토리 목록**
   - 플레이어가 참여한 모든 핸드
   - 즐겨찾기 토글
   - 핸드 번호, 설명, 타임스탬프

---

## 💬 5. 커뮤니티 페이지 (FORUM)
**URL**: `/community`
**파일**: `app/community/page.tsx`

### 탭
- **Trending**: 트렌딩 포스트
- **Recent**: 최근 포스트
- **Popular**: 인기 포스트

### 포스트 카테고리
- **Analysis** (분석) - 파란색
- **Strategy** (전략) - 녹색
- **Hand Review** (핸드 리뷰) - 보라색
- **General** (일반) - 회색

### 주요 기능
1. **포스트 작성**
   - 제목, 내용, 카테고리 선택
   - 작성자 이름

2. **포스트 카드**
   - 작성자 정보
   - 카테고리 뱃지
   - 좋아요 수, 댓글 수, 조회수
   - 작성 시간

3. **좋아요 기능**
   - 클릭으로 좋아요 토글

### 향후 기능 (미구현)
- 댓글 및 답글 시스템 (백엔드 준비 완료)
- 핸드 공유 기능

---

## 📚 6. 북마크 페이지 (BOOKMARKS)
**URL**: `/bookmarks`
**파일**: `app/bookmarks/page.tsx`
**인증**: 로그인 필수

### 주요 기능
1. **북마크 목록**
   - 저장한 모든 핸드 표시
   - 폴더별 탭 필터링
   - 핸드 정보 (번호, 토너먼트, 날짜)
   - 개인 메모 표시

2. **폴더 관리**
   - "All" 탭: 모든 북마크
   - 폴더별 탭: 사용자가 만든 폴더
   - 각 탭에 북마크 개수 표시

3. **북마크 액션**
   - **View**: Archive 페이지로 이동
   - **Edit**: 폴더 변경 및 노트 수정
   - **Delete**: 북마크 제거

4. **빈 상태**
   - 북마크 없을 때 안내 메시지
   - Archive 둘러보기 버튼

### 북마크 다이얼로그
**컴포넌트**: `components/bookmark-dialog.tsx`

#### 기능
- **Add 모드**: 새 북마크 추가
- **Edit 모드**: 기존 북마크 수정
- **폴더 선택**:
  - 기존 폴더 드롭다운
  - "New Folder" 옵션으로 새 폴더 생성
  - "Default" 폴더 (폴더 없음)
- **노트 작성**: 선택사항, 개인 메모

### 관련 컴포넌트
- `components/bookmark-dialog.tsx` - 북마크 추가/수정 다이얼로그
- `components/hand-history-detail.tsx` - 북마크 버튼
- `components/header.tsx` - 프로필 메뉴에 북마크 링크

### 백엔드 API
**파일**: `lib/hand-bookmarks.ts`

**주요 함수**:
- `addHandBookmark()` - 북마크 추가
- `removeHandBookmark()` - 북마크 제거
- `updateBookmarkFolder()` - 폴더 변경
- `updateBookmarkNotes()` - 노트 수정
- `getUserBookmarks()` - 사용자 북마크 조회
- `getUserBookmarkFolders()` - 폴더 목록 조회

---

## 🔐 7. 인증 페이지 (AUTH)

### 7.1 로그인 페이지
**URL**: `/auth/login`
**파일**: `app/auth/login/page.tsx`

#### 주요 기능
1. **Google 로그인**
   - Google OAuth 버튼
   - 원클릭 로그인
   - 자동 계정 생성

2. **UI 요소**
   - GGVault 로고
   - "포커 핸드 분석의 새로운 기준" 설명 텍스트
   - Google 로그인 버튼 (Google 아이콘 포함)

3. **리디렉션**
   - 로그인 성공 시 → 이전 페이지 또는 홈으로 이동

### 7.2 OAuth 콜백 페이지
**URL**: `/auth/callback`
**파일**: `app/auth/callback/page.tsx`

#### 주요 기능
- Google OAuth 리디렉션 처리
- 로딩 스피너 표시
- 자동으로 홈페이지로 이동

---

## 🔧 8. API 엔드포인트

### 8.1 자연어 검색 API
**Endpoint**: `POST /api/natural-search`
**파일**: `app/api/natural-search/route.ts`

**기능**: Claude AI로 자연어 질문을 SQL 쿼리로 변환

**요청 예시**:
```json
{
  "query": "Daniel Negreanu가 AA를 들고 플레이한 핸드"
}
```

**응답 예시**:
```json
{
  "success": true,
  "hands": [...]
}
```

### 8.2 핸드 Import API ⭐
**Endpoint**: `POST /api/import-hands`
**파일**: `app/api/import-hands/route.ts`
**문서**: `docs/HAND_IMPORT_API.md`

**기능**: 외부 시스템에서 분석한 핸드 히스토리를 GGVault에 추가

**요청 예시**:
```json
{
  "dayId": "uuid",
  "source": "external-analyzer-v1",
  "hands": [
    {
      "handNumber": "001",
      "startTime": "00:26:37",
      "endTime": "00:27:58",
      "duration": 81,
      "confidence": 95,
      "summary": "타카자와 오픈레이즈, 모두 폴드",
      "players": [
        {
          "name": "Takasugi",
          "position": "BTN",
          "cards": "AhKh",
          "stack": 25000
        }
      ],
      "potSize": 1500,
      "winner": "Takasugi",
      "winAmount": 1500
    }
  ]
}
```

**응답 예시**:
```json
{
  "success": true,
  "imported": 5,
  "failed": 0,
  "errors": []
}
```

---

## 🗄️ 9. 데이터베이스 구조

### 테이블 관계도
```
tournaments
    ├── sub_events
    │     └── days
    │           └── hands
    │                 └── hand_players
    │                       └── players
    │
posts
    └── comments (미구현)
```

### 주요 테이블

#### tournaments
- id, name, category, category_logo
- location, start_date, end_date

#### sub_events
- id, tournament_id, name, date
- total_prize, winner

#### days
- id, sub_event_id, name
- video_url, video_file, video_source (youtube/upload/nas)
- video_nas_path

#### hands
- id, day_id, number, description
- timestamp (형식: "MM:SS-MM:SS")
- favorite

#### players
- id, name, photo_url
- country, total_winnings

#### hand_players (연결 테이블)
- id, hand_id, player_id
- position, cards

#### posts (커뮤니티)
- id, title, content, category
- author_name, likes_count, comments_count, views_count

---

## ✨ 10. 구현 상태

### 구현 완료 ✅
1. **인증 시스템** ⭐ (Phase 0)
   - Google OAuth 로그인
   - 로그아웃
   - 전역 인증 상태 관리
   - 로그인/비로그인 UI 분기

2. **Archive 관리**
   - Tournament/SubEvent/Day CRUD
   - 3가지 영상 소스 지원
   - 컴팩트 더보기 메뉴

3. **핸드 Import API**
   - 외부 시스템 통합
   - 자동 플레이어 생성
   - 부분 성공 처리

4. **검색 기능**
   - 기본 필터 검색
   - Claude AI 자연어 검색
   - 고급 필터 (30+ 조건)

5. **커뮤니티**
   - 포스트 작성
   - 카테고리별 분류
   - 좋아요 기능

### 최근 완료 기능 ✅ (2025-10-15)
1. ✅ 핸드 좋아요/싫어요 (Phase 1.1)
2. ✅ 핸드 댓글 시스템 (Phase 1.2)
3. ✅ 포럼 핸드 첨부 (Phase 2.1)
4. ✅ 북마크 시스템 (Phase 2.2)
   - 북마크 다이얼로그 (폴더/노트 선택)
   - 북마크 편집 기능
   - 헤더 메뉴 통합
   - 영어 번역

### 미구현 기능 ❌
1. 핸드 수정 요청 (Phase 3)
2. 플레이어 통계 대시보드 (Phase 4)
3. 알림 시스템 (Phase 4)
4. 핸드 공유 강화 (Phase 4)

### 인증 필수 vs 선택 기능 🔐

#### 인증 없이 가능 (읽기 전용)
- ✅ 홈페이지 보기
- ✅ 아카이브 보기 (Tournament/Day/핸드)
- ✅ 핸드 목록/상세 보기
- ✅ 검색 (기본/AI)
- ✅ 플레이어 정보 보기
- ✅ 커뮤니티 포스트 읽기
- ✅ 댓글 읽기

#### 인증 필수 (쓰기 작업)
- ✅ 핸드 좋아요/싫어요
- ✅ 핸드 댓글 작성
- ✅ 포스트 작성
- ✅ 포스트 좋아요
- ✅ 북마크 추가/편집
- ❌ 핸드 수정 제안 (미구현)

---

## 📋 11. 페이지별 파일 매핑

| 페이지 | URL | 파일 경로 |
|--------|-----|-----------|
| 홈 | `/` | `app/page.tsx` |
| 검색 | `/search` | `app/search/page.tsx` |
| 아카이브 | `/archive` | `app/archive/page.tsx` |
| 플레이어 목록 | `/players` | `app/players/page.tsx` |
| 플레이어 상세 | `/players/[id]` | `app/players/[id]/page.tsx` |
| 커뮤니티 | `/community` | `app/community/page.tsx` |
| 북마크 | `/bookmarks` | `app/bookmarks/page.tsx` |
| 프로필 | `/profile` | `app/profile/page.tsx` |
| 로그인 | `/auth/login` | `app/auth/login/page.tsx` |
| OAuth 콜백 | `/auth/callback` | `app/auth/callback/page.tsx` |
| 자연어 검색 API | `POST /api/natural-search` | `app/api/natural-search/route.ts` |
| 핸드 Import API | `POST /api/import-hands` | `app/api/import-hands/route.ts` |

---

**마지막 업데이트**: 2025-10-15
**버전**: 2.1
**상태**: Phase 0-2 완료

**주요 변경사항 (v2.1)**:
- ✅ Phase 1 완료: 핸드 좋아요/싫어요, 댓글 시스템
- ✅ Phase 2 완료: 커뮤니티 핸드 첨부, 북마크 시스템
- ✅ 북마크 UI 완성 (다이얼로그, 편집, 헤더 메뉴)
- ✅ 헤더 메뉴에 Bookmarks 링크 추가
- ✅ 북마크 페이지 영어 번역

**참고**: 이 문서는 새로운 기능이 추가되거나 삭제될 때마다 업데이트됩니다.
