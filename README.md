# Templar Archives

> 포커 영상을 자동으로 핸드 히스토리로 변환하고 분석하는 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)](https://firebase.google.com/)
[![Firebase Hosting](https://img.shields.io/badge/Deployed-Firebase%20Hosting-yellow)](https://templar-archives-index.web.app)

**프로덕션**: https://templar-archives-index.web.app

---

## Quick Start

```bash
# 1. 설치
npm install

# 2. 환경 변수 설정
cp .env.local.example .env.local
# .env.local 편집

# 3. 개발 서버
npm run dev
```

---

## 기술 스택

| 카테고리 | 기술 |
|----------|------|
| Framework | Next.js 16, React 19, TypeScript 5.9 |
| Styling | Tailwind CSS 4.1 |
| State | React Query 5, Zustand 5 |
| Database | Firebase Firestore |
| Auth | Firebase Auth (Google OAuth) |
| AI | Vertex AI Gemini 2.5 Flash |
| Background Jobs | Cloud Run + Cloud Tasks |
| Video | GCS 직접 업로드, fluent-ffmpeg |
| Hosting | Firebase Hosting (GitHub Actions CI/CD) |

**Node.js**: >=22.0.0
**패키지 매니저**: npm

---

## 프로젝트 구조

```
templar-archives/
├── app/                       # Next.js App Router
│   ├── archive/               # Archive 페이지 (핵심)
│   ├── search/                # AI 검색
│   ├── community/             # 커뮤니티
│   ├── players/               # 플레이어
│   ├── admin/                 # 관리자 패널
│   ├── api/                   # API Routes
│   └── actions/               # Server Actions
│
├── components/                # React 컴포넌트
│   ├── features/              # 비즈니스 로직 단위
│   ├── common/                # 공용 컴포넌트
│   ├── layout/                # 레이아웃
│   ├── dialogs/               # 다이얼로그
│   └── ui/                    # shadcn/ui
│
├── lib/                       # 유틸리티
│   ├── queries/               # React Query 훅
│   ├── video/                 # 영상 처리 모듈
│   ├── ai/                    # AI 프롬프트
│   └── types/                 # TypeScript 타입
│
├── stores/                    # Zustand 상태 관리
└── cloud-run/                 # Cloud Run 서비스
    ├── orchestrator/          # 작업 관리
    └── segment-analyzer/      # 영상 분석
```

---

## 핵심 기능

### 1. Archive (영상 아카이브)

**4단계 계층 구조**:
```
Tournament → Event → Stream → Hand
                              ├── HandPlayers
                              └── HandActions
```

- YouTube 영상 플레이어
- Quick Upload (URL 자동 파싱)
- 핸드 히스토리 상세 보기

### 2. KAN (영상 분석 파이프라인)

```
사용자 → Server Action → Cloud Run Orchestrator
                            ↓
         GCS 영상 → FFmpeg 추출 → Gemini 분석 → Firestore 저장
```

**핵심 특징**:
- Gemini 2.5 Flash 기반 AI 분석
- GCS gs:// URI 직접 전달 (대용량 최적화)
- 30분 세그먼트 자동 분할
- Cloud Tasks 재시도 (3회, Exponential Backoff)
- Firestore 실시간 진행률

### 3. Search (AI 검색)

- Gemini 기반 자연어 검색
- 30+ 고급 필터
- Algolia Full-Text Search

### 4. Community

- Reddit 스타일 포스트/댓글 (무한 중첩)
- 좋아요/싫어요, 북마크
- 핸드 공유

### 5. Players

- 플레이어 통계 (VPIP, PFR, 3Bet, Win Rate)
- 통계 캐싱 시스템
- 플레이어 클레임

---

## 개발 명령어

```bash
# 개발
npm run dev                               # 개발 서버

# 빌드 & 린트
npm run build
npm run lint
npx tsc --noEmit                          # TypeScript 체크

# 테스트
npm run test                              # Vitest 전체
npm run test lib/filter-utils.test.ts     # 단일 파일
npm run test:e2e                          # Playwright E2E

# 배포
firebase deploy --only hosting            # Firebase Hosting 수동 배포
npm run analyze                           # 번들 분석

# Cloud Run 배포
cd cloud-run/orchestrator && ./deploy.sh
cd cloud-run/segment-analyzer && ./deploy.sh
```

---

## 환경 변수

```bash
# 필수 - Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
FIREBASE_ADMIN_PRIVATE_KEY=your-private-key
FIREBASE_ADMIN_CLIENT_EMAIL=your-client-email

# 필수 - AI / Cloud Run
GOOGLE_API_KEY=your-key                   # Gemini AI
CLOUD_RUN_ORCHESTRATOR_URL=https://xxx.run.app

# 선택
ANTHROPIC_API_KEY=sk-ant-...              # Claude
UPSTASH_REDIS_REST_URL=your-url           # Rate Limiting
```

---

## 문서

| 문서 | 설명 |
|------|------|
| `CLAUDE.md` | Claude Code 가이드 (핵심) |
| `docs/POKER_DOMAIN.md` | 포커 도메인 지식 |
| `docs/FIRESTORE_SCHEMA.md` | Firestore 스키마 상세 |
| `docs/REACT_QUERY_GUIDE.md` | 데이터 페칭 패턴 |
| `docs/DEPLOYMENT.md` | 배포 가이드 |
| `docs/DESIGN_SYSTEM.md` | 디자인 시스템 |

---

## 배포

```
Git Push (main) → GitHub Actions → Firebase Hosting
                                    ↓
                   https://templar-archives-index.web.app
```

**배포 전 체크리스트**:
- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 에러 없음
- [ ] GitHub Secrets 등록

---

**마지막 업데이트**: 2025-11-27
**프로젝트**: Templar Archives
