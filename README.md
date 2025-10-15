# Templar Archives Web App

> 포커 핸드 히스토리 아카이브 플랫폼 - Next.js 웹 애플리케이션

[![Next.js](https://img.shields.io/badge/Next.js-15.1.6-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.com/)
[![React](https://img.shields.io/badge/React-19.0-blue)](https://react.dev/)

## 🚀 Quick Start

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에 Supabase 정보 입력

# 3. 개발 서버 실행
npm run dev
```

서버가 시작되면 http://localhost:3000 에서 확인

## 📚 상세 문서

전체 프로젝트 문서는 상위 디렉토리를 참조하세요:

### 프로젝트 전체
- **[../README.md](../README.md)** - 프로젝트 소개 및 전체 가이드
- **[../CLAUDE.md](../CLAUDE.md)** - Claude용 프로젝트 컨텍스트
- **[../SETUP.md](../SETUP.md)** - 환경 설정 가이드 ⭐ 필수

### 웹 앱 구조 (Templar Archives)
- **[CLAUDE.md](./CLAUDE.md)** - Templar Archives 상세 문서
- **[ROADMAP.md](./ROADMAP.md)** - 개발 로드맵 (Phase 0-7 완료)
- **[PAGES_STRUCTURE.md](./PAGES_STRUCTURE.md)** - 페이지 구조도
- **[DIRECTORY_STRUCTURE.md](./DIRECTORY_STRUCTURE.md)** - 디렉토리 구조
- **[WORK_LOG.md](./WORK_LOG.md)** - 작업 로그

### API 문서
- **[docs/HAND_IMPORT_API.md](./docs/HAND_IMPORT_API.md)** - 핸드 Import API
- **[docs/ui-specifications/](./docs/ui-specifications/)** - UI 스펙 문서

## 🏗️ 기술 스택

- **Framework**: Next.js 15.1.6 (App Router, Edge Runtime)
- **UI**: shadcn/ui, Tailwind CSS 4
- **State**: Zustand
- **Backend**: Supabase (PostgreSQL, Storage, Realtime, Auth)
- **AI**: Anthropic Claude 3.5 Sonnet

## 📁 디렉토리 구조

```
ggvault/
├── app/                      # Next.js 페이지 및 API
│   ├── icon.webp            # 파비콘 (Protoss Carrier)
│   ├── page.tsx             # 홈페이지
│   ├── archive/             # 아카이브 (핵심!)
│   ├── search/              # 검색 (AI)
│   ├── players/             # 플레이어
│   ├── community/           # 커뮤니티
│   ├── admin/               # 관리자 페이지
│   └── api/                 # API 라우트
├── components/               # React 컴포넌트
│   ├── ui/                  # shadcn/ui 컴포넌트
│   └── ...                  # 커스텀 컴포넌트
├── lib/                      # 유틸리티 라이브러리
│   ├── supabase.ts          # Supabase 클라이언트
│   ├── auth.ts              # 인증 함수
│   ├── logger.ts            # 로깅 유틸리티
│   └── ...
├── supabase/migrations/      # DB 마이그레이션 (17개)
├── docs/                     # UI 레퍼런스 문서
└── README.md                 # 이 파일
```

## 🛠️ 개발 명령어

```bash
# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버
npm start

# Lint (disabled)
npm run lint
```

## 🗄️ Supabase CLI 사용법

### 마이그레이션 관리

```bash
# 마이그레이션 상태 확인
supabase migration list

# 로컬 DB 시작
supabase start

# 로컬 DB 중지
supabase stop

# 새 마이그레이션 생성
supabase migration new migration_name

# 마이그레이션 적용 (로컬)
supabase db reset

# 마이그레이션 적용 (원격)
supabase db push
```

### 프로젝트 링크

```bash
# 로그인 (이미 완료됨)
supabase login

# 프로젝트 링크 (이미 완료됨)
supabase link --project-ref diopilmkehygiqpizvga
```

**주의**: 원격 데이터베이스에 직접 마이그레이션을 적용할 때는 신중하게 진행하세요.

## 📄 페이지 목록

| 페이지 | URL | 상태 |
|--------|-----|------|
| 홈 | `/` | ✅ |
| 아카이브 | `/archive` | ✅ |
| 검색 | `/search` | ✅ |
| 플레이어 | `/players` | ✅ |
| 플레이어 상세 | `/players/[id]` | ✅ |
| 커뮤니티 | `/community` | ✅ |
| 북마크 | `/bookmarks` | ✅ |
| 프로필 | `/profile` | ✅ |
| 프로필 상세 | `/profile/[id]` | ✅ |
| 내 수정 요청 | `/my-edit-requests` | ✅ |
| 로그인 | `/auth/login` | ✅ |
| OAuth 콜백 | `/auth/callback` | ✅ |
| **관리자 대시보드** | `/admin/dashboard` | ✅ |
| **관리자 사용자 관리** | `/admin/users` | ✅ |
| **관리자 클레임** | `/admin/claims` | ✅ |
| **관리자 콘텐츠** | `/admin/content` | ✅ |
| **관리자 수정 요청** | `/admin/edit-requests` | ✅ |
| **관리자 마이그레이션** | `/admin/migration` | ✅ |

## 🔌 API 엔드포인트

| API | 메서드 | 설명 |
|-----|--------|------|
| `/api/import-hands` | POST | 핸드 데이터 Import |
| `/api/natural-search` | POST | AI 자연어 검색 |
| `/api/parse-hendon-mob` | POST | Hendon Mob HTML 파싱 |
| `/api/parse-hendon-mob-html` | POST | 페이아웃 HTML 파싱 |
| `/api/parse-payout-csv` | POST | CSV 페이아웃 파싱 |

## 📦 주요 의존성

```json
{
  "next": "15.1.6",
  "react": "19.0.0",
  "typescript": "5.x",
  "@supabase/supabase-js": "2.48.0",
  "@anthropic-ai/sdk": "0.30.1",
  "tailwindcss": "4.1.9",
  "zustand": "5.0.2"
}
```

## 🔐 환경 변수

`.env.local` 파일 생성 (템플릿: `.env.example`):

```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://diopilmkehygiqpizvga.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Anthropic Claude (필수 - AI 자연어 검색 및 영상 분석용)
CLAUDE_API_KEY=sk-ant-...

# 디버그 모드 (선택)
DEBUG=true  # 프로덕션 환경에서 디버그 로그 활성화
```

**환경 변수 설정 가이드**:
- **Supabase**: [Dashboard](https://supabase.com/dashboard/project/diopilmkehygiqpizvga/settings/api) → Settings → API
- **Anthropic**: [Claude Console](https://console.anthropic.com/settings/keys)

## 🎯 현재 개발 상태 (2025-10-16)

### ✅ 완료된 기능 (Phase 0-7)

#### Phase 0: 인증 시스템
- Google OAuth 로그인
- 전역 인증 상태 관리
- 보호된 액션

#### Phase 1: 핸드 상호작용
- 핸드 좋아요/싫어요 시스템
- 핸드 댓글 시스템

#### Phase 2: 커뮤니티 강화
- 커뮤니티 핸드 첨부
- 북마크 시스템 (폴더별 정리)

#### Phase 3: 핸드 수정 요청
- 백엔드 완성 (8개 함수)
- 사용자용 페이지 (`/my-edit-requests`)
- 관리자용 승인 페이지

#### Phase 4: 관리자 시스템
- 역할 관리 (user/moderator/admin)
- 밴 시스템
- 관리자 활동 로그

#### Phase 5: 콘텐츠 신고
- 포스트/댓글 신고
- 콘텐츠 숨김/표시
- 신고 승인/거부

#### Phase 6: 유저 프로필
- 소셜 링크
- 프로필 가시성
- 통계 캐싱

#### Phase 7: 검색 강화
- Full-Text Search (FTS)
- 제목/내용 가중치 검색

#### 추가 기능
- ✅ **아카이브 카테고리 필터** (2025-10-16)
  - All, WSOP, Triton, EPT, Hustler, APT, APL, GGPOKER
  - 네비게이터 하단 필터 버튼
- ✅ **브랜딩 변경** (2025-10-16)
  - GGVault → Templar Archives
  - 파비콘 추가 (Protoss Carrier)

### ⏳ 다음 작업
- 수동 핸드 수정 UI 진입점
- 영상 분석 테스트 및 개선
- 플레이어 통계 고도화

자세한 로드맵은 [CLAUDE.md](./CLAUDE.md)를 참조하세요.

## 🎨 브랜딩

- **프로젝트 이름**: Templar Archives
- **URL**: https://templar-archives.vercel.app
- **로고**: "TA" (그라데이션 배지)
- **파비콘**: Protoss Carrier (icon.webp)
- **설명**: Comprehensive poker hand history archive and analysis platform

---

**프로젝트**: Templar Archives (구 GGVault)
**버전**: 3.0
**마지막 업데이트**: 2025-10-16

**최근 업데이트 (v3.0)**:
- ✅ 브랜딩 변경: GGVault → Templar Archives
- ✅ 파비콘 추가 (Protoss Carrier)
- ✅ 아카이브 카테고리 필터 추가
- ✅ 코드 최적화 (logger 유틸리티, console.log 정리)
- ✅ Edge Runtime 적용 (모든 페이지)
- ✅ Next.js 15.1.6 + React 19.0 업그레이드

전체 프로젝트 정보는 [상위 README](../README.md)를 참조하세요.
