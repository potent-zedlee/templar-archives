# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 저장소 구조

```
Templar-Archives-Index-Claude/
├── app/                       # Next.js App Router
├── components/                # React 컴포넌트 (FSD 아키텍처)
│   ├── features/              # 비즈니스 로직 단위 (hand, player, archive, video, poker)
│   ├── common/                # 공용 컴포넌트
│   ├── layout/                # 레이아웃 (Header, Footer, Providers)
│   ├── dialogs/               # 다이얼로그
│   ├── ui/                    # shadcn/ui (kebab-case)
│   └── admin/                 # 어드민 패널
├── lib/                       # 유틸리티, 타입, 쿼리
├── stores/                    # Zustand 상태 관리
├── trigger/                   # Trigger.dev Tasks
├── supabase/migrations/       # DB 스키마 (분리된 SQL 파일)
│   ├── *_types.sql            # Extensions + ENUM 타입
│   ├── *_tables.sql           # 테이블 정의
│   ├── *_functions.sql        # RPC 함수
│   ├── *_views.sql            # VIEW 정의
│   ├── *_indexes.sql          # 인덱스
│   ├── *_policies.sql         # RLS 정책
│   └── *_triggers.sql         # 트리거/FK/권한
├── scripts/                   # 운영 스크립트
│   ├── admin-cli.ts           # 메인 CLI (npm run admin)
│   └── operations/            # 운영 스크립트 모음
└── docs/                      # 문서
```

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

# Admin CLI (시스템 진단)
npm run admin -- --action=diagnose
```

---

## 기술 스택

| 카테고리 | 기술 |
|----------|------|
| Framework | Next.js 16, React 19, TypeScript 5.9 |
| Styling | Tailwind CSS 4.1 |
| State | React Query 5, Zustand 5 |
| Database | Supabase (PostgreSQL) |
| AI | Gemini 2.5 Flash, Claude 3.5 Sonnet |
| Background Jobs | Trigger.dev v3 |
| Video | @distube/ytdl-core, fluent-ffmpeg |

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

### KAN 영상 분석 파이프라인

```
Frontend → Server Action → Trigger.dev v3
                              ↓
                YouTube URL → FFmpeg 구간 추출 → Gemini 분석 → DB 저장
```

**핵심 모듈**:
- `trigger/video-analysis.ts` - Trigger.dev Task
- `lib/video/*.ts` - YouTube, FFmpeg, Gemini
- `lib/hooks/use-trigger-job.ts` - 진행률 폴링

---

## 환경 변수

`.env.local`:

```bash
# 필수
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_API_KEY=your-key              # Gemini AI
TRIGGER_SECRET_KEY=your-key          # Trigger.dev v3

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
| `docs/REACT_QUERY_GUIDE.md` | 데이터 페칭 패턴 |
| `docs/DESIGN_SYSTEM.md` | 디자인 시스템 |
| `CHANGELOG.md` | 버전별 변경사항 |
| `work-logs/` | 개발 로그 |

---

**마지막 업데이트**: 2025-11-23
**문서 버전**: 3.0
