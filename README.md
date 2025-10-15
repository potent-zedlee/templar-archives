# GGVault Web App

> 포커 핸드 아카이브 플랫폼 - Next.js 웹 애플리케이션

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.com/)

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

### 웹 앱 구조 (GGVault)
- **[CLAUDE.md](./CLAUDE.md)** - GGVault 상세 문서
- **[ROADMAP.md](./ROADMAP.md)** - 개발 로드맵 (Phase 0-4)
- **[PAGES_STRUCTURE.md](./PAGES_STRUCTURE.md)** - 페이지 구조도
- **[DIRECTORY_STRUCTURE.md](./DIRECTORY_STRUCTURE.md)** - 디렉토리 구조
- **[WORK_LOG.md](./WORK_LOG.md)** - 작업 로그

### API 문서
- **[docs/HAND_IMPORT_API.md](./docs/HAND_IMPORT_API.md)** - 핸드 Import API
- **[docs/ui-specifications/](./docs/ui-specifications/)** - UI 스펙 문서

## 🏗️ 기술 스택

- **Framework**: Next.js 14 (App Router)
- **UI**: shadcn/ui, Tailwind CSS
- **State**: Zustand
- **Backend**: Supabase (PostgreSQL, Storage, Realtime)
- **AI**: Anthropic Claude 3.5 Sonnet

## 📁 디렉토리 구조

```
ggvault/
├── app/                      # Next.js 페이지 및 API
│   ├── page.tsx             # 홈페이지
│   ├── archive/             # 아카이브 (핵심!)
│   ├── search/              # 검색 (AI)
│   ├── players/             # 플레이어
│   ├── community/           # 커뮤니티
│   └── api/                 # API 라우트
├── components/               # React 컴포넌트
│   ├── ui/                  # shadcn/ui 컴포넌트
│   └── ...                  # 커스텀 컴포넌트
├── lib/                      # 유틸리티 라이브러리
│   ├── supabase.ts          # Supabase 클라이언트
│   ├── auth.ts              # 인증 함수 (Phase 0)
│   └── ...
├── supabase/migrations/      # DB 마이그레이션
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

# 타입 체크
npm run type-check

# Lint
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
| 로그인 | `/auth/login` | ✅ |
| OAuth 콜백 | `/auth/callback` | ✅ |
| 관리자 클레임 | `/admin/claims` | ✅ |

## 🔌 API 엔드포인트

| API | 메서드 | 설명 |
|-----|--------|------|
| `/api/import-hands` | POST | 핸드 데이터 Import |
| `/api/natural-search` | POST | AI 자연어 검색 |

## 📦 주요 의존성

```json
{
  "next": "14.x",
  "react": "18.x",
  "typescript": "5.x",
  "@supabase/supabase-js": "latest",
  "tailwindcss": "3.x",
  "zustand": "latest"
}
```

## 🔐 환경 변수

`.env.local` 파일 생성 (템플릿: `.env.example`):

```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://diopilmkehygiqpizvga.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google OAuth (Supabase CLI 로컬 개발용)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Anthropic Claude (선택 - AI 자연어 검색 및 영상 분석용)
ANTHROPIC_API_KEY=sk-ant-...
```

**환경 변수 설정 가이드**:
- **Supabase**: [Dashboard](https://supabase.com/dashboard/project/diopilmkehygiqpizvga/settings/api) → Settings → API
- **Google OAuth**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- **Anthropic**: [Claude Console](https://console.anthropic.com/settings/keys)

## 🎯 현재 개발 상태

- ✅ **아카이브 관리** (CRUD 완료)
- ✅ **핸드 히스토리 UI** (Accordion)
- ✅ **커뮤니티 시스템**
- ✅ **AI 자연어 검색**
- ✅ **인증 시스템** (Google OAuth)
- ✅ **플레이어 클레임 시스템** (프로필 인증 및 관리자 승인)
- ⏳ **수동 핸드 수정 UI** (계획 중)

자세한 로드맵은 [CLAUDE.md](./CLAUDE.md)를 참조하세요.

---

**프로젝트**: Templar Archive - GGVault
**버전**: 2.3
**마지막 업데이트**: 2025-10-15

**최근 업데이트 (v2.3)**:
- ✅ 문서 구조 재정리 (ggvault 관련 문서를 ggvault/ 폴더로 통합)
- ✅ 경로 참조 수정 및 최적화
- ✅ 플레이어 프로필 클레임 시스템 완료
- ✅ 관리자 승인 페이지 완료 (/admin/claims)
- ✅ 인증 시스템 완료 (Google OAuth)

전체 프로젝트 정보는 [상위 README](../README.md)를 참조하세요.
