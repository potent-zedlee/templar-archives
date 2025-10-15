# GGVault 디렉토리 구조

## 📁 프로젝트 루트 구조

```
ggvault/
├── app/                    # Next.js 14 App Router 페이지
├── components/             # React 컴포넌트
├── lib/                    # 유틸리티 라이브러리
├── hooks/                  # Custom React Hooks
├── docs/                   # 프로젝트 문서
├── scripts/                # 유틸리티 스크립트
├── public/                 # 정적 파일
├── supabase/              # Supabase 마이그레이션
├── .next/                 # Next.js 빌드 출력 (무시됨)
├── node_modules/          # npm 패키지 (무시됨)
└── [설정 파일들]
```

---

## 📂 1. app/ - Next.js 페이지 및 API

### 1.1 페이지 파일

```
app/
├── page.tsx                      # 홈페이지 (/)
├── layout.tsx                    # 루트 레이아웃 (전역 설정)
├── globals.css                   # 전역 CSS
│
├── archive/
│   └── page.tsx                  # 아카이브 페이지 (/archive)
│
├── search/
│   └── page.tsx                  # 검색 페이지 (/search)
│
├── players/
│   ├── page.tsx                  # 플레이어 목록 (/players)
│   └── [id]/
│       └── page.tsx              # 플레이어 상세 (/players/[id])
│
├── community/
│   └── page.tsx                  # 커뮤니티 포럼 (/community)
│
├── auth/
│   ├── login/
│   │   └── page.tsx              # 로그인 페이지 (/auth/login)
│   └── callback/
│       └── page.tsx              # OAuth 콜백 페이지 (/auth/callback)
│
└── api/
    ├── natural-search/
    │   └── route.ts              # Claude AI 자연어 검색 API
    └── import-hands/
        └── route.ts              # 외부 시스템 핸드 Import API
```

### 페이지별 역할

#### `page.tsx` (홈)
- Hero Section 표시
- 최근 분석, 인기 영상, 오늘의 역사 섹션

#### `layout.tsx` (루트 레이아웃)
- 전역 설정 (메타데이터, 폰트)
- ThemeProvider 설정 (다크/라이트 모드)
- Toaster 설정 (알림)
- Analytics 설정

#### `archive/page.tsx` (아카이브)
- 좌우 분할 레이아웃 (ResizablePanel)
- Tournament 트리 표시 (Tournament → SubEvent → Day)
- Day 선택 시 영상 플레이어 + 핸드 목록 표시
- CRUD 기능 (Tournament/SubEvent/Day 추가/수정/삭제)
- 3가지 영상 소스 지원 (YouTube, Upload, NAS)

#### `search/page.tsx` (검색)
- 기본 검색 (키워드, 토너먼트, 플레이어, 날짜)
- AI 자연어 검색 (Claude AI)
- 고급 필터 (포지션, 홀카드, 보드카드, POT 등)
- 검색 결과 테이블 표시

#### `players/page.tsx` (플레이어 목록)
- 플레이어 카드 그리드 표시
- 검색 기능 (이름, 국가)
- 핸드 개수, 총 상금 표시

#### `players/[id]/page.tsx` (플레이어 상세)
- 플레이어 프로필 헤더
- 통계 정보
- 플레이어가 참여한 핸드 목록

#### `community/page.tsx` (커뮤니티)
- 탭 (Trending, Recent, Popular)
- 포스트 작성 다이얼로그
- 포스트 카드 (카테고리, 좋아요, 댓글 수)

#### `auth/login/page.tsx` (로그인)
- Google OAuth 로그인 버튼
- GGVault 로고 및 설명 텍스트
- 로그인 성공 시 이전 페이지 또는 홈으로 리디렉션

#### `auth/callback/page.tsx` (OAuth 콜백)
- Google OAuth 리디렉션 처리
- 로딩 스피너 표시
- 자동으로 홈페이지로 이동

### API 라우트

#### `api/natural-search/route.ts`
- **기능**: Claude AI로 자연어 질문을 SQL 쿼리로 변환
- **메서드**: POST
- **입력**: `{ query: string }`
- **출력**: `{ success: boolean, hands: Hand[] }`

#### `api/import-hands/route.ts`
- **기능**: 외부 시스템에서 분석한 핸드 히스토리 Import
- **메서드**: POST
- **입력**: `{ dayId: string, hands: HandHistory[], source?: string }`
- **출력**: `{ success: boolean, imported: number, failed: number, errors: string[] }`
- **문서**: `docs/HAND_IMPORT_API.md`

---

## 🎨 2. components/ - React 컴포넌트

### 2.1 공통 컴포넌트

```
components/
├── header.tsx                    # 상단 네비게이션 바
├── theme-provider.tsx            # 다크/라이트 모드 Provider
├── auth-provider.tsx             # 인증 상태 관리 Provider (useAuth 훅 제공)
│
├── video-player.tsx              # 영상 플레이어 (YouTube/Upload/NAS)
├── hand-list-accordion.tsx       # 핸드 목록 (Accordion UI)
├── hand-history-detail.tsx       # 핸드 상세 정보
├── filter-panel.tsx              # 고급 검색 필터 패널
├── share-hand-dialog.tsx         # 핸드 공유 다이얼로그
│
├── hero-section.tsx              # 홈 히어로 섹션
├── recent-analyses.tsx           # 최근 분석 섹션
├── most-used-videos.tsx          # 인기 영상 섹션
├── on-this-day.tsx               # 오늘의 역사 섹션
│
└── ui/                           # shadcn/ui 컴포넌트 라이브러리
    ├── button.tsx
    ├── card.tsx
    ├── dialog.tsx
    ├── input.tsx
    ├── select.tsx
    ├── table.tsx
    ├── accordion.tsx
    ├── badge.tsx
    ├── tabs.tsx
    ├── resizable.tsx
    └── [30+ UI 컴포넌트]
```

### 주요 컴포넌트 역할

#### `header.tsx`
- 로고, 네비게이션 링크 (SEARCH, ARCHIVE, PLAYERS, FORUM)
- 다크/라이트 모드 토글
- 로그인 전: "로그인" 버튼
- 로그인 후: 프로필 아바타 + 드롭다운 메뉴 (내 프로필, 내 북마크, 내 제안 내역, 로그아웃)
- 모바일 메뉴

#### `auth-provider.tsx`
- React Context API로 전역 인증 상태 관리
- `useAuth()` 훅 제공:
  - `user`: 현재 로그인한 사용자 정보
  - `isAuthenticated`: 로그인 여부
  - `signOut()`: 로그아웃 함수
- 앱 전체에서 인증 상태 접근 가능

#### `video-player.tsx`
- YouTube 영상 재생 (iframe)
- 로컬 업로드 파일 재생 (video 태그)
- NAS 경로 영상 재생
- 현재 재생 시간 추적

#### `hand-list-accordion.tsx`
- 핸드 목록을 Accordion 형식으로 표시
- 각 핸드 클릭 시 `hand-history-detail` 표시
- 재분석 버튼 (옵션)

#### `hand-history-detail.tsx`
- 핸드 번호, 타임스탬프, 신뢰도
- 플레이어 테이블 (포지션, 홀카드, 스택)
- 스트릿별 액션 (Preflop, Flop, Turn, River)
- POT 정보, 우승자, 상금

#### `filter-panel.tsx`
- 고급 검색 필터 UI
- 포지션, 홀카드, 보드카드, POT 사이즈 등
- Zustand store와 연동 (`lib/filter-store.ts`)

#### `share-hand-dialog.tsx`
- SNS 공유 (Twitter, Facebook, Reddit)
- 링크 복사
- 임베드 코드 복사

---

## 📚 3. lib/ - 유틸리티 라이브러리

```
lib/
├── supabase.ts                   # Supabase 클라이언트 + 타입 정의
├── auth.ts                       # 인증 관련 함수 (signInWithGoogle, signOut, getUser)
├── supabase-community.ts         # 커뮤니티 관련 Supabase 함수
├── queries.ts                    # 복잡한 Supabase 쿼리 함수
├── filter-store.ts               # 고급 필터 상태 관리 (Zustand)
├── utils.ts                      # 공통 유틸리티 함수 (cn, formatDate 등)
│
└── types/
    └── hand-history.ts           # HandHistory 타입 정의
```

### 파일별 역할

#### `supabase.ts`
- Supabase 클라이언트 생성
- TypeScript 타입 정의:
  - `Tournament`, `SubEvent`, `Day`, `Hand`
  - `Player`, `HandPlayer`

#### `auth.ts`
- 인증 관련 함수:
  - `signInWithGoogle()` - Google OAuth 로그인
  - `signOut()` - 로그아웃
  - `getUser()` - 현재 사용자 정보 가져오기
  - `onAuthStateChange()` - 인증 상태 변경 구독

#### `supabase-community.ts`
- 커뮤니티 관련 함수:
  - `fetchPosts()` - 포스트 목록 조회
  - `createPost()` - 포스트 작성
  - `togglePostLike()` - 좋아요 토글

#### `queries.ts`
- 복잡한 조인 쿼리:
  - `fetchTournamentsTree()` - Tournament → SubEvent → Day 트리
  - `fetchHandsWithDetails()` - 핸드 + 플레이어 정보
  - `fetchPlayersWithHandCount()` - 플레이어 + 핸드 개수

#### `filter-store.ts`
- Zustand 상태 관리
- 고급 필터 상태 저장 (포지션, 홀카드, 보드카드 등)

#### `types/hand-history.ts`
- 외부 시스템과의 인터페이스 타입:
  - `HandHistory` - 핸드 히스토리 데이터 구조
  - `ImportHandsRequest` - Import API 요청
  - `ImportHandsResponse` - Import API 응답

#### `utils.ts`
- `cn()` - Tailwind CSS 클래스 병합 (clsx + tailwind-merge)
- 기타 공통 유틸리티 함수

---

## 🪝 4. hooks/ - Custom React Hooks

```
hooks/
├── use-mobile.ts                 # 모바일 화면 감지
└── use-toast.ts                  # Toast 알림 훅
```

---

## 📖 5. docs/ - 프로젝트 문서

```
docs/
├── HAND_IMPORT_API.md            # 핸드 Import API 문서 (한글)
├── VIDEO_SOURCES.md              # 영상 소스 가이드
│
└── ui-specifications/            # UI 스펙 문서
    ├── README.md
    ├── 00-component-library.md
    ├── 01-home.md
    ├── 03-archive.md
    ├── 04-hands.md
    ├── 05-hand-detail.md
    ├── 06-search.md
    ├── 07-players.md
    ├── 08-player-detail.md
    └── 09-community.md
```

---

## 🛠️ 6. scripts/ - 유틸리티 스크립트

```
scripts/
└── delete-all-data.ts            # 전체 데이터 삭제 스크립트
```

#### `delete-all-data.ts`
- Supabase 전체 테이블 데이터 삭제
- 순서: hand_players → hands → days → sub_events → tournaments → players
- 개발/테스트용

**실행 방법**:
```bash
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npx tsx scripts/delete-all-data.ts
```

---

## 🗄️ 7. supabase/ - 데이터베이스 마이그레이션

```
supabase/
└── migrations/
    ├── 001_init_schema.sql           # 기본 스키마 (tournaments, sub_events, days, hands)
    ├── 002_add_players.sql           # 플레이어 시스템
    ├── 003_add_video_sources.sql     # 영상 소스 (YouTube, Upload, NAS)
    └── 004_add_community.sql         # 커뮤니티 (posts, comments)
```

### 마이그레이션 순서
1. **001**: tournaments, sub_events, days, hands 테이블
2. **002**: players, hand_players 테이블
3. **003**: video_url, video_file, video_source, video_nas_path 컬럼 추가
4. **004**: posts, comments 테이블 (커뮤니티)

---

## 🌐 8. public/ - 정적 파일

```
public/
├── favicon.ico
└── [이미지, 아이콘 등]
```

---

## ⚙️ 9. 설정 파일

### 9.1 Next.js 설정

#### `package.json`
- 프로젝트 메타데이터
- 의존성 패키지 목록
- 스크립트 명령어:
  - `dev`: 개발 서버 실행
  - `build`: 프로덕션 빌드
  - `start`: 프로덕션 서버 실행

#### `next.config.js`
- Next.js 설정
- 이미지 도메인 허용 (`supabase.co`, `youtube.com` 등)

#### `tsconfig.json`
- TypeScript 컴파일러 설정
- 경로 별칭 (`@/*` → `./`)

### 9.2 Tailwind CSS 설정

#### `tailwind.config.ts`
- Tailwind CSS 설정
- 커스텀 색상, 폰트, 타이포그래피
- shadcn/ui 통합

#### `postcss.config.js`
- PostCSS 플러그인 설정
- Tailwind CSS 적용

### 9.3 shadcn/ui 설정

#### `components.json`
- shadcn/ui 컴포넌트 설정
- 스타일 설정 (CSS 변수, 다크 모드 등)

### 9.4 환경 변수

#### `.env.local` (Git 무시됨)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=your-claude-api-key
```

---

## 📄 10. 프로젝트 문서 (루트)

```
ggvault/
├── README.md                     # 프로젝트 소개
├── ROADMAP.md                    # 개발 로드맵 (단계별 계획)
├── PAGES_STRUCTURE.md            # 페이지 구조도 (이 문서와 함께)
├── DIRECTORY_STRUCTURE.md        # 디렉토리 구조 (현재 문서)
├── VIDEO_SOURCES.md              # 영상 소스 가이드
└── WORK_LOG.md                   # 작업 로그
```

---

## 🚫 11. Git 무시 파일

### `.gitignore`
```
.next/                 # Next.js 빌드 출력
node_modules/          # npm 패키지
.env.local             # 환경 변수 (비밀 키)
.DS_Store              # macOS 시스템 파일
```

---

## 📊 12. 디렉토리별 크기 및 중요도

| 디렉토리 | 파일 수 | 중요도 | 설명 |
|----------|---------|--------|------|
| `app/` | 8개 페이지 | ⭐⭐⭐⭐⭐ | 핵심 페이지 및 API |
| `components/` | 70+ 컴포넌트 | ⭐⭐⭐⭐⭐ | UI 컴포넌트 |
| `lib/` | 6개 파일 | ⭐⭐⭐⭐⭐ | 비즈니스 로직 |
| `supabase/` | 4개 마이그레이션 | ⭐⭐⭐⭐ | 데이터베이스 스키마 |
| `docs/` | 10+ 문서 | ⭐⭐⭐ | 프로젝트 문서 |
| `hooks/` | 2개 훅 | ⭐⭐ | 재사용 로직 |
| `scripts/` | 1개 스크립트 | ⭐ | 유틸리티 |
| `public/` | - | ⭐ | 정적 파일 |

---

## 🔄 13. 데이터 흐름

### 13.1 페이지 → 컴포넌트 → 라이브러리
```
app/archive/page.tsx
  ↓ 사용
components/hand-list-accordion.tsx
  ↓ 사용
components/hand-history-detail.tsx
  ↓ 사용
lib/types/hand-history.ts
```

### 13.2 API → 라이브러리 → 데이터베이스
```
app/api/import-hands/route.ts
  ↓ 사용
lib/supabase.ts
  ↓ 연결
Supabase Database
```

### 13.3 페이지 → 라이브러리 → API
```
app/search/page.tsx
  ↓ 호출
app/api/natural-search/route.ts
  ↓ 사용
Claude AI API
  ↓ 생성
SQL Query
  ↓ 실행
Supabase Database
```

---

## 🎯 14. 핵심 파일 Quick Reference

| 기능 | 파일 경로 |
|------|-----------|
| 홈 페이지 | `app/page.tsx` |
| 아카이브 페이지 | `app/archive/page.tsx` |
| 검색 페이지 | `app/search/page.tsx` |
| 플레이어 페이지 | `app/players/page.tsx` |
| 커뮤니티 페이지 | `app/community/page.tsx` |
| 로그인 페이지 | `app/auth/login/page.tsx` |
| OAuth 콜백 | `app/auth/callback/page.tsx` |
| 자연어 검색 API | `app/api/natural-search/route.ts` |
| 핸드 Import API | `app/api/import-hands/route.ts` |
| 핸드 히스토리 타입 | `lib/types/hand-history.ts` |
| Supabase 클라이언트 | `lib/supabase.ts` |
| 인증 함수 | `lib/auth.ts` |
| 복잡한 쿼리 | `lib/queries.ts` |
| 헤더 네비게이션 | `components/header.tsx` |
| 인증 상태 Provider | `components/auth-provider.tsx` |
| 핸드 목록 | `components/hand-list-accordion.tsx` |
| 핸드 상세 | `components/hand-history-detail.tsx` |
| 영상 플레이어 | `components/video-player.tsx` |
| 고급 필터 | `components/filter-panel.tsx` |

---

**마지막 업데이트**: 2025-10-12
**버전**: 2.0
**상태**: Phase 0 (인증 시스템) 계획 완료, 문서 업데이트 완료

**주요 변경사항 (v2.0)**:
- 인증 시스템 파일 추가 (lib/auth.ts, components/auth-provider.tsx)
- 로그인/OAuth 콜백 페이지 추가 (app/auth/)
- ROADMAP.md 추가 (단계별 개발 계획)
- 헤더 컴포넌트 설명 업데이트 (로그인/프로필 메뉴)

**참고**: 이 문서는 프로젝트 구조가 변경될 때마다 업데이트됩니다.
