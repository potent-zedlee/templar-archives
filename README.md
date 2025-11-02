# Templar Archives Web App

> 포커 핸드 히스토리 아카이브 플랫폼 - Next.js 웹 애플리케이션

[![Next.js](https://img.shields.io/badge/Next.js-15.5.5-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black)](https://templar-archives.vercel.app)

## 📑 목차

- [Quick Start](#-quick-start)
- [기술 스택](#-기술-스택)
- [디렉토리 구조](#-디렉토리-구조)
- [개발 현황](#-개발-현황)
- [배포 및 호스팅](#-배포-및-호스팅)
- [테스트 및 품질](#-테스트-및-품질)
- [데이터베이스](#-데이터베이스)
- [개발 명령어](#-개발-명령어)
- [환경 변수](#-환경-변수)
- [문서](#-상세-문서)
- [브랜딩](#-브랜딩)

## 🚀 Quick Start

### 필수 요구사항

- **Node.js**: >= 22.0.0
- **npm**: >= 10.0.0
- **Supabase 프로젝트**: [supabase.com](https://supabase.com) 계정 필요

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에 Supabase 정보 입력
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - CLAUDE_API_KEY (선택)

# 3. 개발 서버 실행
npm run dev
```

서버가 시작되면 http://localhost:3000
에서 확인

### 빠른 개발 가이드

1. **프로젝트 문서 확인**: [CLAUDE.md](./CLAUDE.md) 읽기
2. **최근 작업 확인**: [WORK_LOG.md](./WORK_LOG.md) 확인
3. **개발 로드맵**: [ROADMAP.md](./ROADMAP.md) 참조
4. **페이지 구조**: [PAGES_STRUCTURE.md](./PAGES_STRUCTURE.md) 참조

## 🏗️ 기술 스택

### 프론트엔드

- **Framework**: Next.js 15.5.5
  - App Router (최신 라우팅 시스템)
  - Server Components & Server Actions
  - Edge Runtime (API Routes)
  - Image Optimization (next/image)

- **React**: 19.2.0
  - 함수형 컴포넌트
  - Custom Hooks (20+개)
  - React.memo() 최적화

- **TypeScript**: 5.9.3
  - Strict Mode 활성화
  - 타입 안전성 100% (0개 `any`)
  - 114개 `any` 타입 완전 제거 (Phase 11)

- **UI 라이브러리**:
  - **shadcn/ui** (50+ 컴포넌트)
    - Accordion, Alert Dialog, Avatar, Badge, Button
    - Card, Checkbox, Dialog, Dropdown Menu, Form
    - Input, Label, Popover, Select, Separator
    - Sheet, Skeleton, Slider, Switch, Tabs, Toast, Tooltip 등
  - **Tailwind CSS** 4.1.16
  - **Framer Motion** 12.23.24 (애니메이션)
  - **Lucide React** 0.454.0 (아이콘, 100+ 사용)

- **상태 관리**:
  - **Zustand** 5.0.2 (UI 상태)
    - 4개 stores (780줄)
    - DevTools 통합
    - Persist Middleware (LocalStorage)
  - **React Query** 5.90.5 (서버 상태)
    - 6개 query 파일 (650줄)
    - Optimistic Updates
    - 500ms Debouncing (닉네임 중복 체크)
    - DevTools 조건부 렌더링 (개발 모드만)

### 백엔드

- **Platform**: Supabase
  - **PostgreSQL**: 데이터베이스 (72개 마이그레이션)
  - **Storage**: 영상 파일, 로고, 프로필 이미지
  - **Realtime**: 실시간 데이터 동기화
  - **Auth**: Google OAuth 2.0
  - **Edge Functions**: (예정)

- **API**:
  - REST API (Next.js API Routes)
  - Server Actions (Next.js 15)
  - SSE (Server-Sent Events) - 실시간 진행률

- **Rate Limiting**: Upstash Redis
  - IP 기반 제한
  - User ID 기반 제한
  - 5분 슬라이딩 윈도우

### AI/ML

- **자연어 검색**: Anthropic Claude 3.5 Sonnet
  - SQL → JSON 필터 변환
  - 30+ 검색 조건 지원

- **영상 분석**:
  - **Hand Analysis Engine** 1.0.6 (로컬 npm 패키지)
  - **Gemini Vision API** (Google)
  - 타임코드 기반 워크플로우

### 개발 도구

- **Testing**:
  - **Vitest** 3.2.4 (단위 테스트)
  - **Playwright** 1.56.1 (E2E 테스트, 13개)
  - **Testing Library** (React 컴포넌트 테스트)

- **Code Quality**:
  - **ESLint** (Next.js 권장 설정)
  - **TypeScript Compiler** (타입 체크)
  - **Sharp** 0.34.4 (이미지 최적화)

- **Bundling**:
  - **Next.js Bundle Analyzer** 15.5.6
  - **PostCSS** 8.5
  - **LightningCSS** 1.30.2 (초고속 CSS 처리)

### 배포 및 모니터링

- **Hosting**: Vercel (자동 배포)
- **Analytics**: Vercel Analytics
- **Performance**: Vercel Speed Insights
- **Monitoring**: Web Vitals 5.1.0

## 📁 디렉토리 구조

```
templar-archives/
├── app/                      # Next.js App Router (30+개 페이지)
│   ├── icon.webp            # 파비콘 (Protoss Carrier)
│   ├── page.tsx             # 홈페이지
│   ├── layout.tsx           # 루트 레이아웃
│   ├── globals.css          # 전역 스타일
│   │
│   ├── archive/             # Archive 페이지 ⭐
│   │   ├── page.tsx         # 메인 페이지 (88줄, 리팩토링 완료)
│   │   └── _components/     # 전용 컴포넌트 (5개)
│   │       ├── navigator.tsx
│   │       ├── video-player.tsx
│   │       ├── hand-list.tsx
│   │       ├── form-dialogs.tsx
│   │       └── tournament-accordion.tsx
│   │
│   ├── search/              # 검색 페이지
│   │   └── page.tsx         # AI 검색, 고급 필터
│   │
│   ├── players/             # 플레이어 페이지
│   │   ├── page.tsx         # 플레이어 목록
│   │   └── [id]/            # 플레이어 상세
│   │
│   ├── community/           # 커뮤니티
│   │   ├── page.tsx         # 포럼 (포스트 목록)
│   │   └── [id]/            # 포스트 상세 (댓글)
│   │
│   ├── admin/               # 관리자 페이지 (6개)
│   │   ├── dashboard/       # 대시보드
│   │   ├── users/           # 사용자 관리
│   │   ├── claims/          # 플레이어 클레임 승인
│   │   ├── edit-requests/   # 핸드 수정 요청
│   │   ├── content/         # 콘텐츠 신고
│   │   └── migration/       # DB 마이그레이션
│   │
│   ├── reporter/            # Reporter 페이지 (2개)
│   │   ├── news/            # 뉴스 작성
│   │   └── live/            # 라이브 리포팅
│   │
│   ├── auth/                # 인증
│   │   ├── login/           # 로그인 페이지
│   │   └── callback/        # OAuth 콜백
│   │
│   └── api/                 # API 라우트 (9개)
│       ├── import-hands/    # 핸드 Import API
│       ├── natural-search/  # AI 자연어 검색
│       ├── parse-hendon-mob/# Hendon Mob 파싱
│       └── ...              # 기타 API
│
├── components/               # React 컴포넌트 (50+개)
│   ├── ui/                  # shadcn/ui 컴포넌트 (40+개)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   └── ...
│   │
│   ├── archive/             # Archive 전용 컴포넌트
│   ├── search/              # 검색 전용 컴포넌트
│   ├── community/           # 커뮤니티 컴포넌트
│   └── ...                  # 공통 컴포넌트
│
├── lib/                      # 유틸리티 라이브러리
│   ├── supabase.ts          # Supabase 클라이언트
│   ├── auth.ts              # 인증 헬퍼
│   ├── logger.ts            # 로깅 시스템
│   ├── env.ts               # 환경 변수 검증
│   ├── types/               # 타입 정의
│   │   ├── archive.ts
│   │   ├── hand.ts
│   │   ├── player.ts
│   │   └── ...
│   └── utils.ts             # 유틸리티 함수
│
├── stores/                   # Zustand 상태 관리 (4개, 780줄)
│   ├── archive-data-store.ts# Archive 데이터 관리
│   ├── archive-ui-store.ts  # Archive UI 상태 (persist)
│   ├── archive-form-store.ts# Archive 폼 데이터
│   └── filter-store.ts      # 검색 필터 상태
│
├── hooks/                    # Custom React Hooks (20+개)
│   ├── use-archive.ts       # Archive 관련 hooks
│   ├── use-auth.ts          # 인증 hooks
│   └── ...
│
├── queries/                  # React Query (6개 파일, 650줄)
│   ├── tournaments.ts       # Tournament queries
│   ├── hands.ts             # Hand queries
│   ├── players.ts           # Player queries
│   ├── posts.ts             # Post queries
│   ├── notifications.ts     # Notification queries
│   └── profile.ts           # Profile queries
│
├── docs/                     # API 및 UI 문서 (9개)
│   ├── HAND_IMPORT_API.md   # Import API 문서
│   ├── REACT_QUERY_GUIDE.md # React Query 가이드
│   └── ui-specifications/   # UI 명세서 (6개)
│
├── scripts/                  # 유틸리티 스크립트
│   └── logo-management.ts   # 로고 관리 (fetch/upload/delete/validate)
│
├── public/                   # 정적 파일
│   ├── logos/               # 카테고리 로고 (WSOP, Triton 등)
│   └── ...
│
├── supabase/                 # Supabase 설정
│   ├── config.toml          # Supabase CLI 설정
│   └── migrations/          # DB 마이그레이션 (72개)
│       ├── 00000_initial_schema.sql
│       ├── 00001_players.sql
│       └── ...
│
├── tests/                    # 테스트
│   ├── e2e/                 # E2E 테스트 (Playwright, 13개)
│   └── __tests__/           # 단위 테스트 (Vitest, 40+개)
│
├── .env.example             # 환경 변수 템플릿
├── .env.local               # 로컬 환경 변수 (Git 제외)
├── next.config.js           # Next.js 설정
├── package.json             # 의존성 및 스크립트
├── tsconfig.json            # TypeScript 설정
├── tailwind.config.ts       # Tailwind CSS 설정
├── playwright.config.ts     # Playwright 설정
├── vitest.config.ts         # Vitest 설정
│
├── README.md                # 이 파일 (Quick Start)
├── CLAUDE.md                # 전체 프로젝트 문서 ⭐
├── ROADMAP.md               # 개발 로드맵
├── PAGES_STRUCTURE.md       # 페이지 구조도
├── DIRECTORY_STRUCTURE.md   # 디렉토리 상세 구조
├── WORK_LOG.md              # 작업 로그
└── DEPLOYMENT.md            # 배포 가이드
```

## 🎯 개발 현황

### 현재 상태 (2025-11-03)

**Phase 0-33 완료** ✅

#### 완료된 핵심 기능

**Phase 0-8: 핵심 시스템**
- ✅ Google OAuth 인증
- ✅ 데이터베이스 스키마 (72개 마이그레이션)
- ✅ Archive 관리 (Tournament/SubEvent/Day)
- ✅ 핸드 히스토리 UI
- ✅ 커뮤니티 (Reddit 스타일 댓글)

**Phase 9-11: 코드 품질**
- ✅ Archive 페이지 리팩토링 (1,733줄 → 88줄, -95%)
- ✅ Zustand stores 도입 (780줄, 4개)
- ✅ 타입 시스템 개선 (114개 `any` 제거)

**Phase 12-19: 현대화**
- ✅ React Query Migration (6개 파일, 650줄)
- ✅ E2E 테스트 (Playwright, 13개)
- ✅ 보안 강화 (A 등급)
- ✅ 로고 관리 시스템

**Phase 20-33: 고급 기능**
- ✅ 알림 시스템
- ✅ 플레이어 통계 고도화
- ✅ News & Live Reporting
- ✅ Archive Single Mode Accordion
- ✅ 보안 감사 및 강화

#### 기술 통계

- **총 페이지**: 30+개
- **총 컴포넌트**: 50+개
- **총 마이그레이션**: 72개
- **Zustand Stores**: 4개 (780줄)
- **React Query**: 6개 파일 (650줄)
- **E2E 테스트**: 13개
- **단위 테스트**: 40+개
- **타입 안전성**: 100% (0개 `any`)
- **보안 등급**: A

### 페이지 목록 (30+개)

| 카테고리 | 페이지 | URL | 상태 |
|---------|--------|-----|------|
| **메인** | 홈 | `/` | ✅ |
| | 검색 | `/search` | ✅ |
| | 아카이브 | `/archive` | ✅ |
| **플레이어** | 플레이어 목록 | `/players` | ✅ |
| | 플레이어 상세 | `/players/[id]` | ✅ |
| **커뮤니티** | 포럼 | `/community` | ✅ |
| | 포스트 상세 | `/community/[id]` | ✅ |
| | 북마크 | `/bookmarks` | ✅ |
| **유저** | 프로필 | `/profile` | ✅ |
| | 프로필 상세 | `/profile/[id]` | ✅ |
| | 알림 | `/notifications` | ✅ |
| | 수정 요청 | `/my-edit-requests` | ✅ |
| **인증** | 로그인 | `/auth/login` | ✅ |
| | OAuth 콜백 | `/auth/callback` | ✅ |
| **관리자** | 대시보드 | `/admin/dashboard` | ✅ |
| | 사용자 관리 | `/admin/users` | ✅ |
| | 클레임 | `/admin/claims` | ✅ |
| | 콘텐츠 | `/admin/content` | ✅ |
| | 수정 요청 | `/admin/edit-requests` | ✅ |
| | 마이그레이션 | `/admin/migration` | ✅ |
| **Reporter** | News | `/reporter/news` | ✅ |
| | Live | `/reporter/live` | ✅ |

### API 엔드포인트 (9개)

| API | 메서드 | 설명 | 문서 |
|-----|--------|------|------|
| `/api/import-hands` | POST | 핸드 데이터 Import | [HAND_IMPORT_API.md](./docs/HAND_IMPORT_API.md) |
| `/api/natural-search` | POST | AI 자연어 검색 | - |
| `/api/parse-hendon-mob` | POST | Hendon Mob HTML 파싱 | - |
| `/api/parse-hendon-mob-html` | POST | 페이아웃 HTML 파싱 | - |
| `/api/parse-payout-csv` | POST | CSV 페이아웃 파싱 | - |

## 🚀 배포 및 호스팅

### 프로덕션 환경

- **URL**: https://templar-archives.vercel.app
- **플랫폼**: Vercel
- **배포 방식**: Git Push → 자동 배포 (~2분)

### 배포 프로세스

#### 자동 배포 (권장)

```bash
# main 브랜치에 푸시하면 자동 배포
git push origin main

# Vercel이 자동으로:
# 1. 의존성 설치 (npm install)
# 2. TypeScript 타입 체크
# 3. ESLint 린팅
# 4. Next.js 빌드 (npm run build)
# 5. 프로덕션 배포
```

#### 수동 배포

```bash
# 1. 로컬에서 빌드 테스트
npm run build
npm start  # http://localhost:3000 확인

# 2. Vercel CLI로 배포
npm install -g vercel
vercel --prod
```

### 환경 변수 (Vercel Dashboard)

**필수 환경 변수**:
1. Vercel Dashboard → Project → Settings → Environment Variables
2. 다음 변수들을 `Production` 환경에 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `CLAUDE_API_KEY` (Sensitive 체크)

### 배포 체크리스트

- [ ] `npm run build` 로컬 빌드 성공
- [ ] `npm run test:e2e` E2E 테스트 통과
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] 환경 변수 Vercel에 등록
- [ ] Supabase 마이그레이션 적용 (`supabase db push`)
- [ ] `.env.local`에 민감 정보 없음 (Git 커밋 전)

### 모니터링

**Vercel Analytics**: 실시간 트래픽 및 성능 메트릭
- 페이지 뷰, FCP, LCP, TTFB

**Vercel Speed Insights**: Core Web Vitals
- LCP, FID, CLS, Performance Score

**Supabase Dashboard**: DB 상태
- CPU, 메모리, 디스크 사용량
- API 요청 수, 응답 시간

## 🧪 테스트 및 품질

### E2E 테스트 (Playwright)

**테스트 수**: 13개

**커버리지**:
- Archive CRUD (Tournament, SubEvent, Day)
- 검색 (기본, AI, 필터)
- 커뮤니티 (포스트, 댓글, 좋아요)
- 인증 (로그인/로그아웃)

**실행 방법**:
```bash
# 헤드리스 모드 (CI/CD)
npm run test:e2e

# UI 모드 (디버깅)
npm run test:e2e:ui

# 헤드풀 모드 (브라우저 표시)
npm run test:e2e:headed
```

**파일 위치**: `tests/e2e/`

### 단위 테스트 (Vitest)

**테스트 수**: 40+개

**커버리지**:
- 유틸리티 함수 (lib/)
- 커스텀 훅 (hooks/)
- Zustand stores
- API 라우트

**실행 방법**:
```bash
# 단위 테스트
npm run test

# UI 모드
npm run test:ui

# 커버리지 리포트
npm run test:coverage
```

**파일 위치**: `__tests__/`

### 코드 품질

#### TypeScript
- **타입 안전성**: 100% (0개 `any`)
- **Strict Mode**: 활성화
- **타입 체크**: `npx tsc --noEmit`

#### ESLint
- **규칙**: Next.js 권장 설정
- **린팅**: `npm run lint`

#### 번들 분석
- **도구**: Next.js Bundle Analyzer
- **실행**: `npm run analyze`
- **메트릭**:
  - First Load JS: ~150kB
  - 총 페이지: 46개
  - 코어 청크: ~80kB

## 🗄️ 데이터베이스

### Supabase PostgreSQL

**프로젝트**: `diopilmkehygiqpizvga`

### 마이그레이션 (72개)

| Phase | 수 | 주요 내용 |
|-------|---|---------|
| 0-8 | 25개 | 기본 스키마, RLS, 인증, 커뮤니티, Archive |
| 9-11 | 5개 | 성능 최적화, 인덱스, Full-Text Search |
| 12-19 | 12개 | 테스팅, 보안, 알림 시스템 |
| 20-33 | 30개 | News, Live Reporting, 플레이어 통계, 보안 강화 |

### 주요 테이블

- `tournaments` - 토너먼트
- `sub_events` - 서브 이벤트
- `days` - 일별 세션
- `hands` - 핸드
- `hand_players` - 핸드-플레이어 연결
- `players` - 플레이어
- `posts` - 커뮤니티 포스트
- `post_comments` - 댓글
- `profiles` - 유저 프로필
- `notifications` - 알림
- `hand_edit_requests` - 핸드 수정 요청
- `content_reports` - 콘텐츠 신고
- `news_posts` - 뉴스
- `live_reports` - 라이브 리포팅

### Supabase CLI 사용법

```bash
# 마이그레이션 관리
supabase migration list        # 마이그레이션 목록
supabase migration new <name>  # 새 마이그레이션 생성
supabase db reset              # 로컬 DB 리셋
supabase db push               # 프로덕션 DB에 적용

# 로컬 DB 관리
supabase start                 # 로컬 Supabase 시작
supabase stop                  # 로컬 Supabase 중지
supabase status                # 상태 확인

# 프로젝트 링크
supabase link --project-ref diopilmkehygiqpizvga
```

**주의**: 프로덕션 DB에 마이그레이션 적용 시 신중히 진행

## 🛠️ 개발 명령어

### 기본 명령어

```bash
# 개발 서버
npm run dev                    # http://localhost:3000

# 프로덕션 빌드
npm run build                  # .next/ 디렉토리 생성

# 프로덕션 서버
npm start                      # 빌드 후 실행
```

### 테스트 명령어

```bash
# 단위 테스트
npm test                       # Vitest
npm run test:ui                # UI 모드
npm run test:coverage          # 커버리지 리포트

# E2E 테스트
npm run test:e2e               # Playwright (헤드리스)
npm run test:e2e:ui            # UI 모드
npm run test:e2e:headed        # 브라우저 표시
```

### 코드 품질

```bash
# 린팅
npm run lint                   # ESLint

# 타입 체크
npx tsc --noEmit               # TypeScript

# 번들 분석
npm run analyze                # Bundle Analyzer
```

### 로고 관리

```bash
# 로고 관리 스크립트
npm run logo:fetch             # Supabase Storage에서 다운로드
npm run logo:upload            # Supabase Storage에 업로드
npm run logo:delete            # Supabase Storage에서 삭제
npm run logo:validate          # 로고 파일 검증
```

**로고 디렉토리**: `public/logos/`

**지원 형식**: `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`

## 🔐 환경 변수

### 로컬 개발 (`.env.local`)

```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://diopilmkehygiqpizvga.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Anthropic Claude (필수 - AI 자연어 검색 및 영상 분석)
CLAUDE_API_KEY=sk-ant-...

# 디버그 모드 (선택)
DEBUG=true  # 프로덕션 환경에서 디버그 로그 활성화
```

### 환경 변수 소스

- **Supabase**: [Dashboard](https://supabase.com/dashboard/project/diopilmkehygiqpizvga/settings/api) → Settings → API
- **Anthropic**: [Claude Console](https://console.anthropic.com/settings/keys)

### 환경 변수 보안

- `.env.local` 파일은 **Git에 커밋하지 않음** (`.gitignore`에 포함)
- 프로덕션 환경 변수는 **Vercel Dashboard**에서 관리
- `CLAUDE_API_KEY`는 **Sensitive** 옵션 체크

## 📚 상세 문서

### 프로젝트 전체
- **[../README.md](../README.md)** - 프로젝트 소개 및 전체 가이드
- **[../CLAUDE.md](../CLAUDE.md)** - Claude용 프로젝트 컨텍스트 ⭐ 완전한 문서
- **[../SETUP.md](../SETUP.md)** - 환경 설정 가이드

### 웹 앱 구조 (Templar Archives)
- **[CLAUDE.md](./CLAUDE.md)** - Templar Archives 상세 문서 (Phase별 개발 내역)
- **[ROADMAP.md](./ROADMAP.md)** - 개발 로드맵 (Phase 0-19 완료)
- **[PAGES_STRUCTURE.md](./PAGES_STRUCTURE.md)** - 페이지 구조도 (30+개)
- **[DIRECTORY_STRUCTURE.md](./DIRECTORY_STRUCTURE.md)** - 디렉토리 구조 상세
- **[WORK_LOG.md](./WORK_LOG.md)** - 작업 로그 (일별)
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - 배포 가이드

### API 및 개발 가이드
- **[docs/HAND_IMPORT_API.md](./docs/HAND_IMPORT_API.md)** - 핸드 Import API 문서
- **[docs/REACT_QUERY_GUIDE.md](./docs/REACT_QUERY_GUIDE.md)** - React Query 사용 가이드
- **[docs/ui-specifications/](./docs/ui-specifications/)** - UI 스펙 문서 (6개)

## 📦 주요 의존성

### 프로덕션 의존성

```json
{
  "next": "15.5.5",
  "react": "19.2.0",
  "react-dom": "19.2.0",
  "typescript": "5.9.3",
  "@supabase/supabase-js": "2.48.0",
  "@anthropic-ai/sdk": "0.30.1",
  "tailwindcss": "4.1.16",
  "zustand": "5.0.2",
  "@tanstack/react-query": "5.90.5",
  "@tanstack/react-query-devtools": "5.90.2",
  "framer-motion": "12.23.24",
  "recharts": "2.15.4",
  "zod": "3.25.67",
  "react-hook-form": "7.60.0",
  "hand-analysis-engine": "1.0.6"
}
```

### 개발 의존성

```json
{
  "@next/bundle-analyzer": "15.5.6",
  "@playwright/test": "1.56.1",
  "@tailwindcss/postcss": "4.1.16",
  "@testing-library/jest-dom": "6.9.1",
  "@testing-library/react": "16.3.0",
  "vitest": "3.2.4",
  "jsdom": "27.0.1",
  "lightningcss": "1.30.2"
}
```

## 🎨 브랜딩

### 프로젝트 정보

- **프로젝트 이름**: Templar Archives (구 GGVault)
- **설명**: Comprehensive poker hand history archive and analysis platform
- **버전**: 6.1
- **URL**: https://templar-archives.vercel.app

### 디자인 시스템

- **로고**: "TA" (그라데이션 배지)
- **파비콘**: Protoss Carrier (icon.webp)
- **색상**: Tailwind CSS 기본 팔레트 + 커스텀
- **폰트**: Geist (Variable Font)
- **아이콘**: Lucide React (100+ 사용)

### 카테고리 로고

**지원 카테고리** (8개):
- WSOP (World Series of Poker)
- Triton
- EPT (European Poker Tour)
- Hustler Casino Live
- APT (Asian Poker Tour)
- APL (Asian Poker League)
- GGPOKER
- All (전체)

**로고 위치**: `public/logos/`

**관리 스크립트**: `scripts/logo-management.ts`

---

## 🎉 프로젝트 현황

**마지막 업데이트**: 2025-11-03
**버전**: 6.1
**README 버전**: 2.0 (완전 개선)

### 최근 업데이트 (v6.1)

- ✅ **Archive Single Mode Accordion** (Phase 33)
  - Multiple → Single Mode 전환
  - Framer Motion 애니메이션 추가
  - Zustand Store 최적화
  - 모바일 친화적 UI

- ✅ **README 완전 개선** (v2.0)
  - 목차 추가
  - 배포 섹션 신설
  - 테스트 섹션 신설
  - 기술 중심 문서화

### Phase 0-33 완료 ✅

**총 개발 기간**: 2025-10-16 ~ 2025-10-30

**핵심 성과**:
- 30+개 페이지, 50+개 컴포넌트
- 72개 마이그레이션 완료
- 13개 E2E 테스트, 40+개 단위 테스트
- 타입 안전성 100% (0개 `any`)
- 보안 등급 A

---

**전체 프로젝트 정보**: [상위 README](../README.md) 또는 [CLAUDE.md](./CLAUDE.md) 참조

**🚀 Ready to build the future of poker archives!**
