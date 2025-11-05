# Templar Archive - Claude Project Context

## 프로젝트 개요
Templar Archive는 포커 핸드 데이터의 자동 추출, 보관, 분석을 통합하는 차세대 포커 생태계입니다.

## 미션
"모든 포커 영상을 핸드 히스토리로 변환하고, 분석하고, 학습 가능하게 만든다"

---

## 📦 프로젝트 구조

### Templar Archives (통합 웹 플랫폼) ⭐ 현재 개발 중
**위치**: `templar-archives/`
**역할**: 포커 핸드 데이터 저장 + 검색/분석 통합 플랫폼
**기술**: Next.js 15.5.5, React 19.2, TypeScript 5.9.3, Tailwind CSS 4, Supabase
**개발 서버**: http://localhost:3000
**프로덕션**: https://templar-archives.vercel.app

---

## 핵심 기능

### 1. 데이터 관리 ✅
- 핸드 히스토리 + 영상 클립 동기화 저장
- 3가지 영상 소스 (YouTube, 로컬 파일, NAS)
- Archive 이벤트 관리 (Tournament/SubEvent/Day CRUD)
- Google Drive 스타일 폴더 네비게이션 (4단계 계층)

### 2. 검색 및 분석 ✅
- 30+ 검색 조건 필터링
- **AI 자연어 검색** (Claude 3.5 Sonnet)
- 통계 대시보드
- Full-Text Search (tsvector, GIN 인덱스)

### 3. 커뮤니티 ✅
- 포스트 작성 및 카테고리 (Analysis, Strategy, Hand Review, General)
- **Reddit 스타일 댓글/답글 시스템** (무한 중첩, 시각적 계층)
- 좋아요 기능 (포스트, 댓글)
- 핸드 공유 (SNS, 링크, 임베드)
- 북마크 시스템
- 포스트 상세 페이지 (`/community/[id]`)

### 4. 인증 및 권한 ✅
- Google OAuth 로그인
- Row Level Security (RLS)
- 역할 관리 (user/high_templar/reporter/admin)
- 밴 시스템 및 활동 로그

### 5. 플레이어 프로필 클레임 ✅
- 유저가 자신의 플레이어 프로필 클레임 요청
- 소셜 미디어, 이메일 등 다양한 인증 방법
- 관리자 승인/거절 워크플로우
- 클레임 상태 배지 표시

---

## 🎯 개발 현황 (2025-10-30)

### ✅ 완료된 Phase (0-33)

#### 핵심 시스템 (Phase 0-8)
- **인증**: Google OAuth, RLS
- **DB**: 73개 마이그레이션 완료 (RLS 정책, 알림 시스템, 플레이어 통계, 보안 강화 등)
- **커뮤니티**: Reddit 스타일 댓글, 북마크, 핸드 공유
- **관리자**: 역할 관리, 밴 시스템, 콘텐츠 신고, 핸드 수정 요청
- **Archive**: Google Drive 스타일 4단계 폴더 네비게이션

### Phase 1-33: 핵심 개발 완료 (2025-10-16 ~ 2025-10-28)

**모든 Phase 상세 내역은 [Phase 1-33 Archive](./work-logs/phase-1-to-33-archive.md)를 참고하세요.**

**주요 완료 기능**:
- **Phase 1-8**: 핵심 시스템 (인증, DB, 커뮤니티, Archive, 폴더 네비게이션)
- **Phase 9-11**: 코드 품질 및 아키텍처 개선, 성능 최적화, UX/UI 개선
- **Phase 12-13**: 테스팅 전략 수립, 보안 강화
- **Phase 14-19**: Archive UI Redesign, 로고 관리, React Query Migration, Archive UI Enhancement
- **Phase 20-21**: 알림 시스템, 플레이어 통계 고도화
- **Phase 22-26**: News & Live Reporting, Navigation Expansion, UI Simplification, Last Sign-in Tracking
- **Phase 27-29**: Quick Upload Enhancement, YouTube API Optimization, Admin Category Logo Upload
- **Phase 30-33**: Event Management Enhancement, Archive Security Enhancement, UI/Admin Enhancement, Single Mode Accordion

**핵심 성과**:
- 73개 마이그레이션 완료 (RLS 정책, 알림 시스템, 플레이어 통계, 보안 강화, Hand Analysis Engine 제거)
- Archive 페이지 리팩토링: 1,733줄 → 88줄 (-95%)
- 114개 `any` 타입 완전 제거, 타입 안전성 확보
- 보안 등급: B+ → A (포괄적 보안 강화)
- React Query 마이그레이션 완료 (6개 query 파일, 650줄)
- 30+개 페이지, 50+개 컴포넌트, 4개 Zustand stores

### 프론트엔드 (30+개 페이지)
- 메인 페이지 (라이브 스트림 포함)
- Archive 3개 (Tournament, Cash Game, 리다이렉트)
- News 2개 (목록, 상세)
- Live Reporting 2개 (목록, 상세)
- Search, Players, Community (Forum) 페이지
- 알림 페이지 1개 (notifications)
- 관리자 페이지 6개 (dashboard, users, claims, edit-requests, content, archive)
- Reporter 페이지 2개 (news, live)
- 유저 프로필 3개 (본인, 다른 유저, 플레이어 클레임)
- 커뮤니티 상세 페이지 1개

---

## 🛠️ 기술 스택

### 프론트엔드
- **프레임워크**: Next.js 15.5.5 (App Router, Edge Runtime)
- **UI 라이브러리**: shadcn/ui (50+ 컴포넌트)
- **스타일링**: Tailwind CSS 4.1.9
- **React**: 19.2.0
- **TypeScript**: 5.9.3
- **상태 관리**:
  - Zustand (4개 stores, devtools + persist)
    - `archive-data-store.ts` - 데이터 관리
    - `archive-ui-store.ts` - UI 상태 (persist)
    - `archive-form-store.ts` - 폼 데이터
    - `filter-store.ts` - 검색 필터
  - React Query (@tanstack/react-query 5.x)
    - 서버 상태 관리 및 캐싱
    - 6개 query 파일 (650줄)
    - Optimistic Updates, Debouncing
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
- **자연어 검색**: Claude 3.5 Sonnet

### 배포
- **웹 앱**: Vercel
- **데이터베이스**: Supabase Cloud

---

## 📂 프로젝트 파일 구조

```
Archive/
├── CLAUDE.md              # 이 파일 (전체 프로젝트 문서)
├── SETUP.md               # 환경 설정 가이드
├── README.md              # 프로젝트 소개
│
└── templar-archives/      # Next.js 웹 앱 ⭐
    ├── README.md          # Quick Start
    ├── WORK_LOG.md        # 작업 로그
    ├── ROADMAP.md         # 개발 로드맵
    ├── PAGES_STRUCTURE.md # 페이지 구조
    ├── DIRECTORY_STRUCTURE.md # 디렉토리 구조
    ├── app/               # 페이지 및 API
    │   └── archive/       # Archive 페이지 (88줄, Phase 9 리팩토링)
    │       └── _components/ # 5개 전용 컴포넌트
    ├── components/        # React 컴포넌트 (50+ 개)
    ├── lib/               # 유틸리티 라이브러리
    │   └── types/         # 타입 정의 (archive.ts 등)
    ├── stores/            # Zustand 상태 관리 (3개, 780줄)
    ├── hooks/             # Custom React Hooks
    ├── docs/              # API 문서
    ├── scripts/           # 유틸리티 스크립트
    ├── public/            # 정적 파일
    └── supabase/          # 데이터베이스 마이그레이션 (72개)
```

---

## 📖 참고 문서

### 개발 문서
- **개발 로드맵**: `templar-archives/ROADMAP.md` (Phase 0-17 계획)
- **페이지 구조**: `templar-archives/PAGES_STRUCTURE.md` (모든 페이지 설명)
- **디렉토리 구조**: `templar-archives/DIRECTORY_STRUCTURE.md` (파일 구조 상세)
- **작업 로그**: `templar-archives/WORK_LOG.md` (일별 작업 기록)
- **React Query 가이드**: `templar-archives/docs/REACT_QUERY_GUIDE.md` (데이터 페칭 패턴)

### 설정 가이드
- **환경 설정**: `SETUP.md` (Supabase, Claude API 설정)

### API 문서
- **핸드 Import API**: `templar-archives/docs/HAND_IMPORT_API.md`
- **영상 소스 가이드**: `templar-archives/docs/VIDEO_SOURCES.md`

---

## 🚀 개발 시작하기

### 세션 시작 시
1. `templar-archives/WORK_LOG.md` 확인 (최근 작업 내용)
2. 개발 서버 실행: http://localhost:3000
3. 데이터베이스 확인 (Supabase Studio)
4. 최신 마이그레이션 적용 여부 확인

### 개발 서버 실행
```bash
cd templar-archives
npm run dev
```

---

## 🌟 프로젝트 상태

**Phase 0-33 완료, 모든 핵심 기능 완성** 🎉

### 개발 내역 아카이브

**상세한 개발 내역은 work-logs 디렉토리를 참고하세요:**

- **[Phase 1-33 Archive](./work-logs/phase-1-to-33-archive.md)** - Phase 1~33 상세 개발 내역 (2025-10-16 ~ 2025-10-28)
- **[Recent Development History](./work-logs/recent-development-history.md)** - 최근 세션 및 Phase 완료 내역 (2025-10-16 ~ 2025-10-30)

### 최신 상태 (2025-11-02)

- ✅ **프로덕션 배포**: https://templar-archives.vercel.app
- ✅ **빌드 상태**: 46 페이지 생성, 정상 동작
- ✅ **버전**: React 19.2.0, TypeScript 5.9.3, Next.js 15.5.5
- ✅ **보안 등급**: A
- ✅ **총 마이그레이션**: 72개 완료

---

**마지막 업데이트**: 2025-11-02
**문서 버전**: 27.0
**주요 변경**:
- 문서 간소화: 상세 개발 내역을 work-logs로 이동
- Phase 1-33 및 최근 개발 내역 아카이브화
- CLAUDE.md 크기 감소: 372줄 → ~230줄 (-38%)
