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

# Trigger.dev 로컬 개발 (영상 분석 테스트 시 필수)
npx trigger.dev@latest dev --port 3001

# 빌드 & 린트
npm run build
npm run lint

# 테스트
npm run test                              # Vitest 전체
npm run test lib/filter-utils.test.ts     # 단일 파일
npm run test:e2e                          # Playwright 전체
npx playwright test e2e/archive.spec.ts   # 단일 파일

# 데이터베이스 마이그레이션
supabase db push                          # 프로덕션 적용
supabase db reset                         # 로컬 리셋
supabase migration new migration_name     # 새 마이그레이션

# Trigger.dev 프로덕션 배포
npx trigger.dev@latest deploy

# 번들 분석
npm run analyze

# Admin CLI
npm run admin -- --action=diagnose        # 전체 시스템 진단
npm run admin -- --action=check-db        # DB 상태
npm run admin -- --action=check-jobs      # KAN 작업 상태
npm run admin -- --action=cleanup-jobs    # STUCK 작업 정리
```

---

## 기술 스택

| 카테고리 | 기술 |
|----------|------|
| Framework | Next.js 16, React 19, TypeScript 5.9 |
| Styling | Tailwind CSS 4.1 |
| State | React Query 5, Zustand 5 |
| Database | Supabase (PostgreSQL) |
| AI | Vertex AI Gemini 2.5 Flash |
| Background Jobs | Trigger.dev v4 (`@trigger.dev/sdk`) |
| Video | GCS 직접 업로드, fluent-ffmpeg |

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

**모든 write 작업은 Server Actions 사용** (클라이언트 직접 Supabase 호출 금지)

```typescript
'use server'

export async function createTournament(data: TournamentData) {
  const user = await verifyAdmin()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert(data)
    .select()
    .single()

  revalidatePath('/archive')
  return { success: true, data: tournament }
}
```

### Archive 계층 구조

```
Tournament → Event → Stream → Hand
                              ├── HandPlayers
                              └── HandActions
```

### KAN 영상 분석 파이프라인 (GCS + Vertex AI)

```
사용자 (분석 시작)
    → Server Action (app/actions/kan-trigger.ts)
    → GCS 업로드 (gs://bucket/videos/xxx.mp4)
    → Trigger.dev Task (trigger/gcs-video-analysis.ts)
        └─ Vertex AI Gemini 분석 (gs:// URI 직접 전달)
    → JSON 핸드 데이터 파싱 (Self-Healing)
    → DB 저장 (hands → hand_players → hand_actions)
```

**핵심 모듈**:
| 파일 | 역할 |
|------|------|
| `app/actions/kan-trigger.ts` | Server Action - 분석 시작, 결과 저장 |
| `trigger/gcs-video-analysis.ts` | Trigger.dev Task - GCS 영상 분석 (최대 7200초) |
| `lib/video/vertex-analyzer.ts` | Vertex AI Gemini 분석 및 JSON 파싱 |
| `lib/video/ffmpeg-processor.ts` | FFmpeg 영상 처리 |
| `lib/ai/prompts.ts` | Platform별 AI 프롬프트 (EPT/Triton) |
| `lib/hooks/use-trigger-job.ts` | React Query 폴링 (2초 간격) |

**특징**:
- GCS gs:// URI 직접 전달 (File API 대비 대용량 최적화)
- 30분 초과 세그먼트 자동 분할
- 재시도: 3회, Exponential Backoff
- Vertex AI 서울 리전 (asia-northeast3)

---

## 환경 변수

`.env.local`:

```bash
# 필수
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TRIGGER_SECRET_KEY=your-key          # Trigger.dev v4

# Vertex AI / GCS (영상 분석 시 필수)
GCS_PROJECT_ID=your-project-id       # Google Cloud 프로젝트 ID
VERTEX_AI_LOCATION=asia-northeast3   # 리전 (기본: 서울)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# 선택
ANTHROPIC_API_KEY=sk-ant-...         # Claude
UPSTASH_REDIS_REST_URL=your-url      # Rate Limiting
```

---

## 보안 가이드라인

### 금지 사항

- 클라이언트에서 직접 Supabase write
- `any` 타입 사용
- SQL Injection 위험 코드
- pnpm 사용

### 필수 사항

- Server Actions: 모든 write 작업
- Zod 검증: API 입력
- RLS 정책: 모든 테이블
- TypeScript Strict Mode

---

## 디버깅

```bash
# TypeScript 체크
npx tsc --noEmit

# 빌드 캐시 초기화
rm -rf .next && npm run build

# Trigger.dev 로그
# https://cloud.trigger.dev/
```

---

## 참고 문서

| 문서 | 설명 |
|------|------|
| `docs/POKER_DOMAIN.md` | 포커 도메인 지식 |
| `docs/DATABASE_SCHEMA.md` | DB 스키마 상세 |
| `docs/REACT_QUERY_GUIDE.md` | 데이터 페칭 패턴 |
| `docs/DESIGN_SYSTEM.md` | 디자인 시스템 |
| `docs/DEPLOYMENT.md` | 배포 가이드 |

---

**마지막 업데이트**: 2025-11-25
**문서 버전**: 3.2
