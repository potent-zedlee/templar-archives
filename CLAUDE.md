# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

Templar Archives는 포커 영상을 자동으로 핸드 히스토리로 변환하고 분석하는 프로덕션 플랫폼입니다.

- **프로덕션**: https://templar-archives.vercel.app
- **로컬**: http://localhost:3000
- **레이아웃**: 3-Column (Desktop 전용, lg+)

---

## 빠른 시작

```bash
# 개발 서버
npm run dev

# 빌드 & 린트
npm run build
npm run lint

# 테스트
npm run test                              # Vitest 전체
npm run test lib/filter-utils.test.ts     # 단일 파일
npm run test:e2e                          # Playwright 전체
npx playwright test e2e/archive.spec.ts   # 단일 파일

# Firebase 에뮬레이터 (로컬 개발)
firebase emulators:start

# Cloud Functions 배포
firebase deploy --only functions

# Cloud Run 배포 (영상 분석)
cd cloud-run && ./deploy.sh

# 번들 분석
npm run analyze

# Admin CLI
npm run admin -- --action=diagnose        # 전체 시스템 진단
npm run admin -- --action=check-db        # DB 상태
npm run admin -- --action=check-jobs      # 분석 작업 상태
```

---

## 기술 스택

| 카테고리 | 기술 |
|----------|------|
| Framework | Next.js 16, React 19, TypeScript 5.9 |
| Styling | Tailwind CSS 4.1 |
| State | React Query 5, Zustand 5 |
| Database | Firebase Firestore (NoSQL) |
| Auth | Firebase Auth (Google OAuth) |
| Search | Algolia (전체텍스트 검색) |
| AI | Vertex AI Gemini 2.5 Flash |
| Background Jobs | Cloud Run + Cloud Tasks |
| Video | GCS 직접 업로드, fluent-ffmpeg |
| Functions | Firebase Cloud Functions (트리거) |

**Node.js**: >=22.0.0
**패키지 매니저**: npm (pnpm 사용 금지)

---

## 핵심 아키텍처

### 상태 관리

| 유형 | 도구 | 위치 |
|------|------|------|
| 서버 상태 | React Query | `lib/queries/*.ts` |
| 클라이언트 상태 | Zustand | `stores/*.ts` |

### Server Actions

**모든 write 작업은 Server Actions 사용** (클라이언트 직접 Firestore 호출 금지)

```typescript
'use server'

import { adminFirestore } from '@/lib/firebase-admin'
import { revalidatePath } from 'next/cache'

export async function createTournament(data: TournamentData) {
  const user = await verifyAdmin()
  if (!user) return { success: false, error: 'Unauthorized' }

  const docRef = adminFirestore.collection('tournaments').doc()
  await docRef.set({
    ...data,
    createdAt: new Date(),
    stats: { eventsCount: 0, handsCount: 0 }
  })

  revalidatePath('/archive')
  return { success: true, data: { id: docRef.id, ...data } }
}
```

### Archive 계층 구조

```
Tournament → Event → Stream → Hand
                              ├── HandPlayers
                              └── HandActions
```

### KAN 영상 분석 파이프라인 (GCS + Cloud Run + Vertex AI)

```
사용자 (분석 시작)
    → Server Action (app/actions/kan-trigger.ts)
    → GCS 업로드 (gs://bucket/videos/xxx.mp4)
    → Cloud Run Orchestrator
        → Cloud Tasks 큐잉
        → Segment Analyzer (FFmpeg + Vertex AI)
    → JSON 핸드 데이터 파싱 (Self-Healing)
    → Firestore 저장 (hands 컬렉션)
    → Firestore 실시간 진행률 업데이트
```

**핵심 모듈**:
| 파일 | 역할 |
|------|------|
| `app/actions/kan-trigger.ts` | Server Action - 분석 시작 |
| `cloud-run/orchestrator/` | Cloud Run - 작업 관리, 세그먼트 분할 |
| `cloud-run/segment-analyzer/` | Cloud Run - FFmpeg + Gemini 분석 |
| `lib/video/vertex-analyzer.ts` | Vertex AI Gemini 분석 및 JSON 파싱 |
| `lib/ai/prompts.ts` | Platform별 AI 프롬프트 (EPT/Triton) |
| `lib/hooks/use-analysis-job.ts` | React Query Firestore 폴링 (2초) |

**특징**:
- GCS gs:// URI 직접 전달 (대용량 최적화)
- 30분 세그먼트 자동 분할
- Cloud Tasks 재시도: 3회, Exponential Backoff
- Firestore 실시간 진행률
- Vertex AI global 리전 (Gemini 2.5 모델 1M 토큰 지원)

---

## 환경 변수

`.env.local`:

```bash
# Firebase (필수)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_ADMIN_PRIVATE_KEY=your-private-key
FIREBASE_ADMIN_CLIENT_EMAIL=your-client-email

# Algolia (검색)
NEXT_PUBLIC_ALGOLIA_APP_ID=your-app-id
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=your-search-key
ALGOLIA_ADMIN_KEY=your-admin-key

# GCP / Vertex AI (영상 분석)
GCP_PROJECT_ID=your-project-id
VERTEX_AI_LOCATION=global
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Cloud Run
CLOUD_RUN_ORCHESTRATOR_URL=https://video-orchestrator-xxx.run.app

# 선택
ANTHROPIC_API_KEY=sk-ant-...         # Claude
UPSTASH_REDIS_REST_URL=your-url      # Rate Limiting
```

---

## 보안 가이드라인

### 금지 사항

- 클라이언트에서 직접 Firestore write
- `any` 타입 사용
- 인증 없이 민감한 데이터 접근
- pnpm 사용

### 필수 사항

- Server Actions: 모든 write 작업
- Firebase Security Rules: 역할 기반 접근 제어
- Zod 검증: API 입력
- TypeScript Strict Mode

### Firebase Security Rules 역할

| 역할 | 권한 |
|------|------|
| `user` | 커뮤니티 참여 (포스트, 댓글) |
| `templar` | 커뮤니티 중재 |
| `arbiter` | 핸드 데이터 수정 |
| `high_templar` | 아카이브 관리 |
| `admin` | 전체 시스템 접근 |

---

## 디버깅

```bash
# TypeScript 체크
npx tsc --noEmit

# 빌드 캐시 초기화
rm -rf .next && npm run build

# Firebase 로그
firebase functions:log

# Cloud Run 로그
gcloud run services logs read video-orchestrator --region=asia-northeast3
gcloud run services logs read segment-analyzer --region=asia-northeast3
```

---

## 참고 문서

| 문서 | 설명 |
|------|------|
| `docs/POKER_DOMAIN.md` | 포커 도메인 지식 |
| `docs/FIRESTORE_SCHEMA.md` | Firestore 컬렉션 구조 |
| `docs/REACT_QUERY_GUIDE.md` | 데이터 페칭 패턴 |
| `docs/DESIGN_SYSTEM.md` | 디자인 시스템 |
| `docs/DEPLOYMENT.md` | 배포 가이드 |
| `firestore.rules` | Firebase Security Rules |

---

**마지막 업데이트**: 2025-11-27
**문서 버전**: 4.0 (Firebase/Firestore 마이그레이션)
