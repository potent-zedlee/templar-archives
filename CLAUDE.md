# Templar Archive - Claude Project Context

## 프로젝트 개요
Templar Archive는 포커 핸드 데이터의 자동 추출, 보관, 분석을 통합하는 차세대 포커 생태계입니다.

## 미션
"모든 포커 영상을 핸드 히스토리로 변환하고, 분석하고, 학습 가능하게 만든다"

---

## 📦 프로젝트 구조

### Templar Archives (통합 웹 플랫폼) ⭐ 현재 개발 중
**위치**: `templar-archives/`
**역할**: 영상 분석 + 데이터 저장 + 검색/분석 통합 플랫폼
**기술**: Next.js 15.5.5, React 19.2, TypeScript 5.9.3, Tailwind CSS 4, Supabase, Hand Analysis Engine
**개발 서버**: http://localhost:3000
**프로덕션**: https://templar-archives.vercel.app

---

## 핵심 기능

### 1. 영상 분석 ✅
- **YouTube URL** 또는 **로컬 파일 업로드**
- **Hand Analysis Engine v1.0.6** (npm 패키지):
  - Gemini Vision API 기반 핸드 추출
  - SSE 스트리밍 방식 실시간 진행률
  - 타임코드 입력 → 관리자 승인 → AI 추출 → 검수 워크플로우

### 2. 데이터 관리 ✅
- 핸드 히스토리 + 영상 클립 동기화 저장
- 3가지 영상 소스 (YouTube, 로컬 파일, NAS)
- Archive 이벤트 관리 (Tournament/SubEvent/Day CRUD)
- Google Drive 스타일 폴더 네비게이션 (4단계 계층)

### 3. 검색 및 분석 ✅
- 30+ 검색 조건 필터링
- **AI 자연어 검색** (Claude 3.5 Sonnet)
- 통계 대시보드
- Full-Text Search (tsvector, GIN 인덱스)

### 4. 커뮤니티 ✅
- 포스트 작성 및 카테고리 (Analysis, Strategy, Hand Review, General)
- **Reddit 스타일 댓글/답글 시스템** (무한 중첩, 시각적 계층)
- 좋아요 기능 (포스트, 댓글)
- 핸드 공유 (SNS, 링크, 임베드)
- 북마크 시스템
- 포스트 상세 페이지 (`/community/[id]`)

### 5. 인증 및 권한 ✅
- Google OAuth 로그인
- Row Level Security (RLS)
- 역할 관리 (user/high_templar/reporter/admin)
- 밴 시스템 및 활동 로그

### 6. 플레이어 프로필 클레임 ✅
- 유저가 자신의 플레이어 프로필 클레임 요청
- 소셜 미디어, 이메일 등 다양한 인증 방법
- 관리자 승인/거절 워크플로우
- 클레임 상태 배지 표시

---

## 🎯 개발 현황 (2025-10-30)

### ✅ 완료된 Phase (0-33)

#### 핵심 시스템 (Phase 0-8)
- **인증**: Google OAuth, RLS
- **DB**: 72개 마이그레이션 완료 (RLS 정책, 알림 시스템, 플레이어 통계, 보안 강화 등)
- **영상 분석**: Hand Analysis Engine v1.0.6 (Gemini Vision API, 타임코드 기반 워크플로우)
- **커뮤니티**: Reddit 스타일 댓글, 북마크, 핸드 공유
- **관리자**: 역할 관리, 밴 시스템, 콘텐츠 신고, 핸드 수정 요청
- **Archive**: Google Drive 스타일 4단계 폴더 네비게이션

### Phase 1-33: 핵심 개발 완료 (2025-10-16 ~ 2025-10-28)

**모든 Phase 상세 내역은 [Phase 1-33 Archive](./templar-archives/work-logs/phase-1-to-33-archive.md)를 참고하세요.**

**주요 완료 기능**:
- **Phase 1-8**: 핵심 시스템 (인증, DB, 영상 분석, 커뮤니티, Archive, 폴더 네비게이션)
- **Phase 9-11**: 코드 품질 및 아키텍처 개선, 성능 최적화, UX/UI 개선
- **Phase 12-13**: 테스팅 전략 수립, 보안 강화
- **Phase 14-19**: Archive UI Redesign, 로고 관리, React Query Migration, Archive UI Enhancement
- **Phase 20-21**: 알림 시스템, 플레이어 통계 고도화
- **Phase 22-26**: News & Live Reporting, Navigation Expansion, UI Simplification, Last Sign-in Tracking
- **Phase 27-29**: Quick Upload Enhancement, YouTube API Optimization, Admin Category Logo Upload
- **Phase 30-33**: Event Management Enhancement, Archive Security Enhancement, UI/Admin Enhancement, Single Mode Accordion

**핵심 성과**:
- 72개 마이그레이션 완료 (RLS 정책, 알림 시스템, 플레이어 통계, 보안 강화)
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
- **영상 분석**:
  - Hand Analysis Engine v1.0.6 (npm 패키지)
  - Gemini Vision API (Google) - 핸드 추출
  - 타임코드 기반 워크플로우
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

### 최근 완료 (2025-10-30)
- **Session 44: TypeScript 에러 수정 및 버전 업그레이드** (3시간)
  - Analysis-Engine, templar-worker-server 프로젝트 삭제 (201MB 정리)
  - 웹사이트 전체 검토 및 정상 동작 확인
  - TypeScript Critical 에러 수정 (261 → 258):
    - category_id 속성 제거 (category로 통일)
    - 누락된 import 및 state 선언 추가
    - async 함수 호출 제거 (Promise 타입 오류 수정)
    - FolderItemType에 "unorganized" 추가
  - 버전 업그레이드:
    - React: 19.0.0 → 19.2.0
    - TypeScript: 5.x → 5.9.3
  - 프로덕션 빌드 성공 (46 페이지 생성)
  - 8개 파일 수정 (~200줄 변경)
  - 커밋: c9a1d2d → 3cb7a6a
  - 배포 완료 (Vercel)

### 이전 완료 (2025-10-28)
- **세션 43: 성능 최적화 및 모니터링 설정** - 옵션 2 & 3 완료 (1.5시간)
  - 환경 변수 설정 가이드 완성 (.env.example, .env.local 업데이트)
  - Phase 33 애니메이션 100% 완료 확인 (Framer Motion AnimatePresence 구현 검증)
  - 성능 분석 실행 (npm run analyze, 3개 번들 리포트 생성)
  - Sentry SDK v8+ 호환 (`startTransaction` → `Sentry.startSpan()`)
  - Health Check API 엔드포인트 추가 (`/api/health`, Edge Runtime)
  - 4개 파일 수정/생성
  - 커밋: TBD

- **세션 42: Phase 33 - Archive Single Mode Accordion** - Accordion Single Mode 구현 및 애니메이션 추가 (1시간)
  - Zustand Store 수정: `Set<string>` → `string | null` (Multiple → Single Mode)
  - 한 번에 하나의 Tournament/SubEvent만 열림
  - Tournament 변경 시 SubEvent 자동 닫힘
  - Framer Motion 애니메이션 추가 (0.3초, easeInOut)
  - 3개 파일 수정 (+54줄, -68줄)
  - 커밋: 1753fd9, 배포 완료

### 이전 완료 (2025-10-27)
- **Phase 32 연장: UI/Admin Enhancement** - Archive 및 Admin 페이지 사용성 개선 (3시간)
  - Archive 페이지 UX/UI 개선:
    - 색상 체계 개선 (투명도 70% 적용)
    - 간격/레이아웃, 타이포그래피 강화
    - 애니메이션 추가 (hover, active, rotate)
  - Admin Archive 정렬 기능 (5개 컬럼: Name, Category, Type, Location, Date)
  - Unsorted Videos 정렬 기능 (4개 컬럼: Name, Source, Created, Published)
  - Admin Category 간소화 (Region, Priority, Website 필드 제거)
  - 5개 커밋 (cd0df3b, a9fe3aa, 35ed27d, 08b38b6, 7e7a1a6)
  - 4개 파일 수정 (122줄 삭제)

### 이전 완료 (2025-10-24)
- **Phase 32: Comprehensive Security Enhancement** - 포괄적 보안 강화 (8가지 보안 개선)
  - Server Actions 인증 강화: Email → DB 역할 기반, Ban 상태 체크
  - RLS 정책 강화: 6개 테이블 admin-only write 제한
  - Natural Search API 재설계: SQL 생성 → JSON 필터 (SQL Injection 완전 방지)
  - CSRF 보호: import-hands API에 Origin/Referer 검증 추가
  - 파일 업로드 검증: Magic Number 검증 (7개 파일 타입)
  - Rate Limiting 개선: IP → User ID 기반 (VPN 우회 방지)
  - 입력 Sanitization: LIKE 패턴 이스케이프
  - 환경 변수 중앙 관리: 타입 안전한 런타임 검증
  - 5개 파일 생성 (1,001줄), 5개 파일 수정, 2개 마이그레이션
  - 보안 등급: B+ → A
  - 커밋: a006fa7
- **Phase 31: Archive Security Enhancement & Admin Management Page** - Server Actions 보안 강화, Admin Archive 페이지
  - Server Actions 생성 (670줄): 9개 함수, 서버 사이드 관리자 권한 검증
  - 5개 Dialog 컴포넌트 Server Actions 적용 (~200줄 변경)
  - Admin Archive 관리 페이지 생성 (365줄): 테이블 뷰, 검색/필터, CRUD 통합
  - 보안 개선: 모든 write 작업 서버 사이드 검증, 클라이언트 우회 불가
  - 2개 커밋 (51066c4, bfb4b2f)
- **Phase 30: Archive Event Management Enhancement** - SubEvent Event Number, Day Dialog "From Unsorted" 기능
  - SubEvent에 event_number 필드 추가 (순차 번호 및 공식 이벤트 코드 지원)
  - Day Dialog에 "From Unsorted" 탭 추가 (카드 리스트 UI, 비디오 이동)
  - Stream Date 필드 추가 (자동 채우기 지원)
  - Unsorted 비디오 워크플로우 완성 (Refetch 버그 수정)
  - Dialog 크기 최적화 (1000px 너비)
  - 6개 커밋 (f7664c0, e18611f, 670abb5, 0cacdfe, 51e82fa, e2844ae)

### 이전 완료 (2025-10-23)
- **Phase 29: Admin Category Logo Upload 수정** - 로고 업로드 기능 작동, Storage 버킷 설정
  - useUploadLogoMutation hook 제거, uploadCategoryLogo 직접 호출
  - 권장 사이즈/포맷 표기 강화, 캐시 버스팅 추가
  - Supabase Storage 버킷 설정 (tournament-logos, RLS 정책)
- **Phase 28: Performance Optimization & Maintenance** - 번들 크기 최적화, 기술 부채 정리, SEO 개선
  - Archive/Players 페이지 동적 임포트 (16개 컴포넌트)
  - SEO metadata 강화, sitemap.xml, robots.txt 자동 생성
- **Phase 27: Quick Upload Enhancement & YouTube API Optimization** - Quick Upload 계층 선택 기능, API Quota 최적화
  - Tournament/SubEvent/Day 계층 구조 직접 선택
  - YouTube API 쿼터 200% → 50-80% 절감

### 이전 완료 (2025-10-22)
- **Phase 26: UI Simplification** - 페이지 인트로 섹션 제거, Archive 드롭다운 개선
- **Phase 25: Last Sign-in Tracking** - 관리자 유저 관리에 마지막 로그인 추적 (2개 파일, 56줄)
- **Phase 24: Archive UI Enhancement** - Card Selector, Info Dialog, Advanced Filters (12개 파일, 865줄)
- **Phase 23: Navigation Expansion & Archive Split** - Archive를 Tournament/Cash Game으로 분리 (13개 파일, 485줄)
- **Phase 22: News & Live Reporting System** - Reporter 역할, News/Live CRUD, 승인 워크플로우 (13개 파일, 2,663줄)

### 이전 완료 (2025-10-21)
- **Phase 21: Player Statistics Enhancement** - 플레이어 통계 분석 고도화
  - React Query 훅 (218줄): usePlayerStatsQuery, usePositionalStatsQuery, usePlayStyleQuery
  - UI 컴포넌트 3개 (약 500줄): AdvancedStatsCard, PositionalStatsCard, PerformanceChartCard
  - 플레이어 페이지 통합 (기존 5개 통계 카드 교체)
  - Empty State 처리, Recharts 기반 성과 차트 (바 차트, 레이더 차트)
- **Phase 20 문서화 완료: Notification System** - 알림 시스템 완전 구현 확인 및 문서화
  - 2개 마이그레이션 (680줄), 9개 트리거
  - 2개 라이브러리 (497줄): notifications.ts, notification-queries.ts
  - 2개 프론트엔드 (544줄): 알림 페이지, 알림 벨
  - 8가지 알림 타입, 실시간 알림, Optimistic Updates
- **Phase 19: Archive UI Enhancement** - 필터 간소화 및 사용자 경험 개선
  - Quick Filters 라벨 제거
  - Date Range Picker 도입 (From/To 캘린더)
  - 불필요한 필터 삭제 (Hand Count Range, Video Sources, Has Hands Only)
  - Archive 페이지 91.5 kB 유지

### 이전 완료 (2025-10-20)
- **Phase 20: Notification System (구현)** - 알림 시스템 개발 완료
- **Phase 16: React Query Migration** - 전체 앱 데이터 페칭 현대화, 6개 query 파일 (650줄)
- **Phase 17: DevTools Optimization** - 프로덕션 번들 최적화
- **Phase 18: Manual Hand Action Input System** - 핸드 액션 수동 입력 시스템 (7개 파일, 1,395줄)

### 이전 완료 (2025-10-19)
- **Phase 14: Archive UI Redesign** - 수평 로고 바, 필터 버튼 중복 제거
- **Phase 15: 로고 관리 시스템** - 자동 확장자 감지, 실제 로고 12개 다운로드

### 이전 완료 (2025-10-18)
- **Phase 12: 테스팅** - E2E 13개, Unit 40+ 테스트, CI/CD 파이프라인
- **Phase 13: 보안 강화** - SQL/XSS 방지, CSRF 보호, Zod 검증
- **Phase 11: UX/UI 개선** - Error Boundary, Toast 통합, Loading 컴포넌트
- **Phase 10: 성능 최적화** - React 메모이제이션, 번들 분석
- **Phase 9: 코드 품질** - Archive 페이지 리팩토링 (-95%), Zustand stores
- YouTube API 최적화, 12시간 라이브 스트림 운영

### 이전 완료 (2025-10-17)
- Archive 성능 최적화 (커스텀 훅 3개, 동적 임포트 13개, DB 인덱스 20+개)
- Archive UI 현대화 (글래스모피즘, 필터 섹션 개선)

### 이전 완료 (2025-10-16)
- Phase 8: Google Drive 스타일 폴더 네비게이션
- Reddit 스타일 댓글/답글 시스템
- DB 최적화, YouTube 라이브 우선순위 시스템
- 브랜딩 변경 (GGVault → Templar Archives)
- Phase 3-7: 핸드 수정, 관리자, 신고, 프로필, 검색

---

**마지막 업데이트**: 2025-10-30
**문서 버전**: 26.0
**주요 변경**:
- Session 44: TypeScript 에러 수정, React 19.2.0 & TypeScript 5.9.3 업그레이드, 프로덕션 빌드 성공
- Phase 34 삭제 (타임코드 시스템은 Session 44에서 제거됨)
- Hand Analysis Engine v1.0.6 중심으로 문서 재정리
- DB 마이그레이션: 72개 완료 (간단히 카운트만 명시)
- 완료된 기능만 남김 (실제 배포 상태 반영)
