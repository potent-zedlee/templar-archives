# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

Templar Archives는 포커 영상을 자동으로 핸드 히스토리로 변환하고 분석하는 프로덕션 플랫폼입니다.

- **프로덕션**: https://templar-archives.vercel.app
- **로컬**: http://localhost:3000
- **Phase**: 44 완료 (2025-11-19)
- **페이지 수**: 49개
- **레이아웃**: 3-Column (Desktop 전용, lg+)

---

## 빠른 시작

### 개발 환경

```bash
# 개발 서버
npm run dev                # http://localhost:3000

# Trigger.dev 로컬 개발 (영상 분석 테스트 시 필수)
npx trigger.dev@latest dev --port 3001

# 빌드
npm run build
npm run lint

# 테스트
npm run test               # Vitest 전체
npm run test lib/filter-utils.test.ts  # 단일 파일
npm run test:ui            # Vitest UI
npm run test:coverage

npm run test:e2e           # Playwright 전체
npx playwright test e2e/archive.spec.ts  # 단일 파일
npm run test:e2e:ui        # Playwright UI
npm run test:e2e:headed    # 브라우저 표시

# 번들 분석
npm run analyze
```

### 데이터베이스

```bash
# Supabase 마이그레이션
supabase db push           # 프로덕션 적용
supabase db reset          # 로컬 리셋
supabase migration new migration_name
```

### 플레이어 데이터 관리

```bash
# Hendonmob 플레이어 Import
node scripts/import-hendonmob-players.mjs

# 여성 플레이어 gender 업데이트
node scripts/update-female-players.mjs

# DB 확인
node scripts/check-players-db.mjs
```

### 유틸리티 스크립트

```bash
# 로고 관리
npm run logo:fetch
npm run logo:upload
npm run logo:validate

# 썸네일
npm run thumbnails:generate
npm run thumbnails:generate:day --day-id=<uuid>

# DB 관리
node scripts/check-analysis-status.mjs
node scripts/update-user-role.mjs
node scripts/cleanup-stuck-job.mjs
node scripts/create-unsorted-stream.mjs
```

### 환경 변수

`.env.local`:
```bash
# 필수
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_API_KEY=your-key              # Gemini AI
TRIGGER_SECRET_KEY=your-key          # Trigger.dev v3 (영상 분석 필수!)
ANTHROPIC_API_KEY=sk-ant-...         # Claude (선택)

# 선택
UPSTASH_REDIS_REST_URL=your-url      # Rate Limiting
UPSTASH_REDIS_REST_TOKEN=your-token
YOUTUBE_API_KEY=your-key
CSRF_SECRET=your-secure-random-string
```

**Trigger.dev 설정 (영상 분석 필수)**:
1. https://cloud.trigger.dev/ 가입
2. 프로젝트 생성 (`proj_oeniovgjdjmalhpsigaa`)
3. Settings → API Keys → Secret Key 발급
4. `.env.local`에 `TRIGGER_SECRET_KEY` 추가
5. 로컬 개발: `npx trigger.dev@latest dev --port 3001`
6. 프로덕션: Vercel 환경 변수에 추가

---

## 프로젝트 구조

```
templar-archives/
├── app/
│   ├── (main)/
│   │   ├── archive/              # Archive 페이지 (3-Column)
│   │   │   ├── tournament/       # 토너먼트 아카이브
│   │   │   ├── cash-game/        # 캐시게임 아카이브
│   │   │   └── _components/      # Archive 전용 컴포넌트
│   │   ├── search/               # Search 페이지 (3-Column)
│   │   │   └── _components/      # Search 전용 컴포넌트
│   │   ├── players/              # Players 페이지
│   │   │   ├── [id]/             # 플레이어 상세
│   │   │   └── _components/      # Player 전용 컴포넌트
│   │   └── community/            # Community 페이지
│   ├── actions/                  # Server Actions (7개)
│   │   ├── kan-trigger.ts        # KAN 영상 분석 ⭐
│   │   ├── archive.ts            # Archive CRUD
│   │   └── kan-analysis.ts       # KAN 분석 (legacy)
│   └── api/
│       ├── natural-search/       # Claude 자연어 검색
│       └── trigger/              # Trigger.dev 상태 조회
├── trigger/
│   └── video-analysis.ts         # Trigger.dev Task (KAN) ⭐
├── lib/
│   ├── video/                    # YouTube/FFmpeg/Gemini ⭐
│   │   ├── youtube-downloader.ts
│   │   ├── ffmpeg-processor.ts
│   │   └── gemini-analyzer.ts
│   ├── queries/                  # React Query (20개 파일)
│   ├── hooks/                    # React Hooks
│   │   └── use-trigger-job.ts    # Trigger.dev 폴링 ⭐
│   ├── types/                    # TypeScript 타입
│   ├── ai/                       # AI 통합
│   │   ├── gemini.ts
│   │   └── prompts.ts            # KAN Prompts
│   ├── auth-utils.ts             # 인증
│   ├── security.ts               # 보안
│   └── filter-utils.ts           # 필터 로직
├── components/                   # 공통 컴포넌트
│   ├── ui/                       # shadcn/ui
│   ├── trigger-job-monitor.tsx   # Trigger.dev 진행률 ⭐
│   └── player-stats.tsx          # 플레이어 통계
├── stores/                       # Zustand (4개 파일)
├── supabase/
│   └── migrations/               # DB 마이그레이션
├── e2e/                          # Playwright 테스트
└── scripts/                      # 유틸리티 스크립트
```

---

## 기술 스택

```json
{
  "next": "16.0.1",
  "react": "19.2.0",
  "typescript": "5.9.3",
  "tailwindcss": "4.1.16",
  "@tanstack/react-query": "5.90.5",
  "zustand": "5.0.2",
  "@supabase/supabase-js": "2.48.0",
  "@anthropic-ai/sdk": "0.30.1",
  "@google/genai": "1.29.0",
  "@trigger.dev/sdk": "3.3.17",
  "@distube/ytdl-core": "4.16.12",
  "fluent-ffmpeg": "2.1.3",
  "@ffmpeg-installer/ffmpeg": "1.1.0"
}
```

**Node.js**: >=22.0.0
**패키지 매니저**: npm (pnpm 사용 금지)

---

## 핵심 아키텍처

### 1. 상태 관리

**서버 상태 (React Query)**:
- 위치: `lib/queries/*.ts` (20개 파일)
- staleTime: 1-10분 (데이터 특성별)
- Optimistic Updates 적극 활용

**주요 쿼리 파일**:
- `archive-queries.ts` - Tournament/SubEvent/Stream/Hands
- `players-queries.ts` - 플레이어 통계 및 프로필
- `community-queries.ts` - 포스트/댓글
- `kan-queries.ts` - KAN 분석 작업 모니터링

```typescript
// Optimistic Update 패턴
export function useLikePostMutation() {
  return useMutation({
    mutationFn: async (postId) => { /* ... */ },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['post', postId] })
      queryClient.setQueryData(['post', postId], (old) => ({
        ...old,
        like_count: old.like_count + 1
      }))
    }
  })
}
```

**클라이언트 상태 (Zustand)**:
- 위치: `stores/*.ts` (4개 파일)
- persist 미들웨어 활용 (LocalStorage)
- archive-ui-store, archive-form-store, hand-input-store, filter-store

### 2. Server Actions

**모든 write 작업은 Server Actions 사용** (클라이언트 직접 Supabase 호출 금지)

위치: `app/actions/*.ts` (7개 파일)

**주요 Server Actions**:
- `archive.ts` (19KB) - Tournament/SubEvent/Stream CRUD
- `kan-analysis.ts` (27KB) - KAN 영상 분석 ⭐ 핵심
- `hands-manual.ts` - 수동 핸드 입력

```typescript
'use server'

export async function createTournament(data: TournamentData) {
  // 1. 서버 사이드 인증 검증
  const user = await verifyAdmin()
  if (!user) return { success: false, error: 'Unauthorized' }

  // 2. Supabase 작업
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert(data)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // 3. 캐시 무효화
  revalidatePath('/archive')

  return { success: true, data: tournament }
}
```

### 3. Archive 계층 구조 (4단계)

```
Tournament (토너먼트)
  └── Event (이벤트)
      └── Stream (일별 스트림)
          └── Hand (핸드)
              ├── HandPlayers (플레이어별 정보)
              └── HandActions (시퀀스별 액션)
```

**핵심 파일**:
- `app/(main)/archive/tournament/page.tsx` - 3-column 레이아웃
- `app/(main)/archive/cash-game/page.tsx` - 3-column 레이아웃
- `app/(main)/archive/_components/`:
  - `ArchiveFilterSidebar.tsx` - 왼쪽 필터 (320px)
  - `ArchiveNavigationSidebar.tsx` - 중앙 네비게이션 (400px)
  - `ArchiveDashboard.tsx` - 초기 대시보드
  - `HandsListPanel.tsx` - 핸드 리스트
- `lib/types/archive.ts`

**3-Column 레이아웃 구조**:
```
┌─────────────────────────────────────────────────────┐
│ 필터 (320px)  │  네비게이션 (400px)  │  메인 (flex-1) │
│               │                     │                │
│ [Filters]     │ [Tournament Tree]   │ [Dashboard]    │
│ • Category    │ ▼ Tournament        │ 또는           │
│ • Location    │   ▼ Event           │ [Hands List]   │
│ • Date        │     • Stream        │                │
│ • HandCount   │                     │                │
│ [Reset]       │                     │                │
└─────────────────────────────────────────────────────┘
```

**UI 패턴**:
- 네비게이션: 3-level 중첩 Accordion (Tournament → Event → Stream)
- 데스크톱 전용 (lg+ 브레이크포인트)
- 모바일: "데스크톱 전용" 안내 메시지

### 4. 플레이어 시스템

**데이터 구조**:
- `players` 테이블 - 플레이어 마스터 (1,500+ players)
- `player_stats_cache` 테이블 - 통계 캐시 (50-70% 성능 향상) ⭐
- `player_claims` 테이블 - 플레이어 소유권 주장

**통계 계산** (`lib/player-stats.ts`):
- VPIP (Voluntarily Put In Pot) - 프리플롭 참여율
- PFR (Pre-Flop Raise) - 프리플롭 레이즈율
- 3BET - 3벳 비율
- ATS (Attempt To Steal) - BTN/CO/SB 스틸 시도율
- Win Rate, Avg Pot Size

**캐싱 전략**:
1. `player_stats_cache`에서 조회 시도
2. 캐시 없으면 실시간 계산
3. 계산 결과를 캐시에 저장
4. `hand_actions` 변경 시 자동 무효화 (트리거)

**플레이어 상세 페이지 컴포넌트**:
- `AdvancedStatsCard` - VPIP, PFR, 3BET, ATS 표시
- `PositionalStatsCard` - 포지션별 통계 차트
- `PerformanceChartCard` - 승률 분석

### 5. Search 페이지 (3-Column)

**레이아웃 구조**:
```
┌─────────────────────────────────────────────────────────┐
│ 필터 (320px)   │  핸드 리스트 (400px)  │  핸드 상세 (flex-1) │
│                │                       │                     │
│ [Filters]      │ [Search Results]      │ [Hand Detail]       │
│ • Search Type  │ • Hand #001           │ • Board Cards       │
│ • Tournament   │ • Hand #002           │ • Players           │
│ • Player       │ • Hand #003           │ • Actions           │
│ • Position     │                       │ • Video Link        │
│ • Pot Size     │ 클릭 시 우측 표시      │                     │
│ • Date Range   │                       │ 초기: 안내 메시지    │
│ • Board Cards  │                       │                     │
│ • Hole Cards   │                       │                     │
│ • Hand Value   │                       │                     │
│ • Actions      │                       │                     │
│ [Reset]        │                       │                     │
└─────────────────────────────────────────────────────────┘
```

**주요 컴포넌트**:
- `SearchFilterSidebar.tsx` - 10개 Accordion 섹션, 21개 필터
- `SearchResultsList.tsx` - 검색된 핸드 리스트
- `HandDetailPanel.tsx` - 선택된 핸드 상세 정보
- `HoleCardDialog.tsx` - 홀 카드 선택 다이얼로그 (2줄 Rank 그리드)
- `HandValueDialog.tsx` - 핸드 강도 선택 다이얼로그 (10가지 핸드 타입)

**세밀한 필터 (21개)**:
1. Search Type (Natural Language / Basic)
2. Tournament, Player, Date Range
3. Blinds & Stakes (SB, BB, Ante)
4. Board Cards (Flop, Turn, River, Texture)
5. Hole Cards (다이얼로그: ?, 2-A, Suited only)
6. Hand Value (다이얼로그: Royal Flush ~ High card, Exact/At Least/At Most)
7. Actions & Streets (fold, check, call, bet, raise, 3-bet, 4-bet, all-in)
8. Position (BTN, SB, BB, UTG, MP, CO)
9. Stack Size, Winner/Loser
10. Pot Size Range
11. Video Available, AI Summary

**필터 로직**:
- 위치: `lib/filter-utils.ts`
- `applyExtendedSearchFilters()` 함수
- LocalStorage 필터 상태 저장

### 6. AI 통합

**KAN (Khalai Archive Network)** - 영상 분석:
- **새 아키텍처**: Trigger.dev v3 + TypeScript 전환 완료 (2025-11-21)
- **Server Actions**: `app/actions/kan-trigger.ts`
- **Trigger.dev Task**: `trigger/video-analysis.ts`
- **진행률 모니터링**: React Query 폴링 (2초 간격)
- Gemini 2.5 Flash 기반
- YouTube 영상 → 구조화된 핸드 히스토리 자동 추출

**분석 파이프라인** (Trigger.dev 기반):
```
Frontend → Server Action → Trigger.dev v3 → TypeScript Pipeline
              ↓                  ↓
    UI 업데이트          Task: kan-video-analysis
              ↓                  ↓
    폴링 (2초)          YouTube URL 가져오기 (@distube/ytdl-core)
              ↓                  ↓
    진행률 표시         FFmpeg 구간 추출 (in-memory, fluent-ffmpeg)
              ↓                  ↓
    완료 콜백           Gemini 2.5 Flash File API 업로드 & 분석
                                 ↓
                        JSON 핸드 파싱
                                 ↓
                        결과 반환 (output)
                                 ↓
                 Server Action이 DB 저장
```

**핵심 모듈** (TypeScript):
- `lib/video/youtube-downloader.ts` - YouTube 스트림 URL 추출
- `lib/video/ffmpeg-processor.ts` - 인메모리 영상 구간 추출
- `lib/video/gemini-analyzer.ts` - Gemini File API 업로드 및 분석
- `lib/hooks/use-trigger-job.ts` - React Query 폴링 훅
- `components/trigger-job-monitor.tsx` - 진행률 UI

**장점**:
- ⚡ 단일 TypeScript 스택 (Python 제거)
- ☁️ 무제한 실행 시간 (Trigger.dev maxDuration: 3600s)
- 🔄 자동 재시도 (3회, exponential backoff)
- 📊 실시간 진행률 표시
- 💾 인메모리 처리 (임시 파일 없음)

**지원 플랫폼**:
- EPT (European Poker Tour) - 기본값
- Triton Poker
- WSOP (World Series of Poker)
- PokerStars
- Hustler Casino Live

**자동 분할 처리**:
- 1시간 초과 영상 → 자동 세그먼트 분할
- 순차 처리 → 결과 병합

**자연어 검색**:
- 위치: `app/api/natural-search/route.ts`
- Claude 3.5 Sonnet
- JSON 필터 방식 (SQL Injection 방지)

---

## 보안 가이드라인

### RLS (Row Level Security)

모든 write 작업은 admin/high_templar 권한 필요:

```sql
CREATE POLICY "admin_only_insert" ON tournaments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'high_templar')
      AND banned_at IS NULL
    )
  );
```

### Server Actions 인증

```typescript
// lib/auth-utils.ts
async function verifyAdmin() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')

  const { data } = await supabase
    .from('users')
    .select('role, banned_at')
    .eq('id', user.id)
    .single()

  if (data.banned_at) throw new Error('User is banned')
  if (!['admin', 'high_templar'].includes(data.role)) {
    throw new Error('Insufficient permissions')
  }

  return user
}
```

### 입력 검증 및 보안

- **Zod 스키마**: 모든 API 입력
- **CSRF 보호**: 모든 POST API (`verifyCSRF()`)
- **Rate Limiting**: User ID 기반 (JWT 파싱)
- **파일 업로드**: Magic Number 검증 (`lib/file-upload-validator.ts`)

---

## 개발 워크플로우

### 새 기능 추가 체크리스트

1. **타입 정의** (`lib/types/`)
2. **DB 마이그레이션** (`supabase/migrations/`)
3. **Server Actions** (`app/actions/`)
4. **React Query 훅** (`lib/queries/`)
5. **UI 컴포넌트** (`components/`)
6. **페이지** (`app/`)
7. **테스트** (`e2e/`, `lib/__tests__/`)

### DB 스키마 변경

```bash
# 1. 마이그레이션 생성
supabase migration new migration_name

# 2. SQL 작성
# supabase/migrations/20251118000001_add_feature.sql

# 3. 로컬 테스트
supabase db reset

# 4. 프로덕션 적용
supabase db push --dry-run
supabase db push
```

**주의사항**:
1. 로컬 테스트 필수 (`supabase db reset`)
2. 프로덕션 백업 확인
3. 인덱스는 `CONCURRENTLY` 사용 (off-peak 시간)
4. RLS 정책 모든 테이블에 적용
5. 마이그레이션 순서 의존성 고려

### 커밋 규칙

Conventional Commits:
```
feat(archive): add hand filtering by position
fix(search): resolve natural language query parsing
docs(readme): update quick start guide
refactor(stores): simplify archive UI store
test(e2e): add archive CRUD tests
```

---

## 중요한 제약 사항

### 금지 사항

1. ❌ **클라이언트에서 직접 Supabase write**: Server Actions 사용 필수
2. ❌ **`any` 타입 사용**: `unknown` 또는 구체적 타입
3. ❌ **SQL Injection 위험**: Prepared Statements, JSON 필터만
4. ❌ **민감 정보 노출**: 환경 변수, API 키 하드코딩
5. ❌ **pnpm 사용**: npm만 사용 (package.json engines 설정)

### 필수 사항

1. ✅ **Server Actions**: 모든 write 작업
2. ✅ **React Query**: 서버 상태 관리
3. ✅ **Zod 검증**: API 입력
4. ✅ **RLS 정책**: 모든 테이블
5. ✅ **Optimistic Updates**: 사용자 경험 개선
6. ✅ **Error Boundary**: 에러 처리
7. ✅ **TypeScript Strict Mode**: 타입 안전성

---

## 디버깅

### 빌드 에러

```bash
npx tsc --noEmit           # TypeScript 체크
npm run lint               # ESLint
rm -rf .next && npm run build
```

### Supabase 연결

1. `.env.local` 확인
2. Supabase Dashboard → Settings → API
3. RLS 정책 확인 (테이블별)

### React Query 캐시

```typescript
// 특정 쿼리 무효화
queryClient.invalidateQueries({ queryKey: ['tournaments'] })

// 모든 쿼리 무효화
queryClient.invalidateQueries()
```

### Trigger.dev (KAN 영상 분석)

**로컬 개발 문제**:
```bash
# Trigger.dev CLI가 실행 중인지 확인
npx trigger.dev@latest dev --port 3001

# 작업 실행 테스트
# Archive 페이지에서 영상 분석 시작 → 진행률 확인

# Trigger.dev Dashboard에서 작업 상태 확인
# https://cloud.trigger.dev/
```

**프로덕션 문제**:
```bash
# 1. Vercel 환경 변수 확인
# TRIGGER_SECRET_KEY 설정 필요

# 2. Trigger.dev Dashboard에서 실행 로그 확인
# https://cloud.trigger.dev/projects/proj_oeniovgjdjmalhpsigaa/runs

# 3. 작업 상태 조회 API 테스트
curl https://templar-archives.vercel.app/api/trigger/status/[jobId]
```

**일반적인 에러**:
- **401 Unauthorized**: `TRIGGER_SECRET_KEY` 누락 또는 잘못됨
- **Task not found**: `trigger/video-analysis.ts` 배포 안 됨 (재배포 필요)
- **Timeout**: 영상이 너무 길거나 네트워크 문제 (자동 재시도 3회)
- **Gemini API Error**: `GOOGLE_API_KEY` 문제 또는 할당량 초과

---

## Trigger.dev 배포 (프로덕션)

KAN 영상 분석을 프로덕션에서 사용하려면 Trigger.dev Task를 배포해야 합니다.

### 배포 절차

```bash
# 1. Trigger.dev CLI 설치 (전역)
npm install -g @trigger.dev/cli@latest

# 2. 배포
npx trigger.dev@latest deploy

# 3. 배포 확인
# Trigger.dev Dashboard → Deployments 확인
# https://cloud.trigger.dev/projects/proj_oeniovgjdjmalhpsigaa/deployments
```

### Vercel 통합

Vercel에 배포 시 자동으로 Trigger.dev Task가 배포됩니다:

1. **환경 변수 설정** (Vercel Dashboard):
   ```bash
   TRIGGER_SECRET_KEY=tr_prod_xxx...
   ```

2. **Git Push 후 자동 배포**:
   ```bash
   git push origin main
   ```

3. **배포 확인**:
   - Vercel Dashboard에서 배포 상태 확인
   - Trigger.dev Dashboard에서 새 Task 배포 확인

### 주의사항

- **TRIGGER_SECRET_KEY**는 프로덕션 환경에만 설정 (개발 환경은 로컬 CLI 사용)
- Trigger.dev 무료 플랜: 월 100시간 제한
- 유료 플랜 ($20/월): 무제한 실행 시간

---

## 포커 도메인 지식

### 핵심 용어

**게임 구조**:
- Small Blind (SB): 강제 베팅 (BB의 절반)
- Big Blind (BB): 강제 베팅
- Ante: 모든 플레이어 의무 베팅
- Pot: 베팅된 칩의 총합
- Stack: 플레이어 보유 칩

**포지션** (시계 방향):
- BTN (Button): 가장 유리한 포지션
- SB (Small Blind): 포스트플랍 첫 번째 액션
- BB (Big Blind): 프리플랍 마지막 액션
- UTG (Under The Gun): 가장 불리한 포지션
- MP (Middle Position): 중립적
- CO (Cut-Off): 두 번째로 유리한 포지션

**스트리트**:
- Preflop: 홀카드 받은 직후
- Flop: 첫 3장 커뮤니티 카드
- Turn: 4번째 카드
- River: 5번째 카드

**액션**:
- Fold: 포기
- Check: 베팅 없이 차례 넘김
- Call: 현재 베팅 금액 추가
- Bet: 처음으로 칩 거는 행위
- Raise: 이전 베팅보다 많이 베팅
- 3-bet: 레이즈에 대한 리레이즈
- All-in: 모든 칩 베팅

**핸드 랭킹** (높은 순):
1. Royal Flush
2. Straight Flush
3. Four of a Kind (Quads)
4. Full House
5. Flush
6. Straight
7. Three of a Kind (Set)
8. Two Pair
9. One Pair
10. High Card

**전략 용어**:
- GTO (Game Theory Optimal): 수학적 최적 전략
- ICM (Independent Chip Model): 토너먼트 칩 가치 모델
- Equity: 현재 핸드에서 팟을 가져갈 확률
- Range: 플레이어가 가질 수 있는 핸드 조합
- Balanced Range: 강한 핸드와 블러프가 적절히 섞인 레인지

### DB 스키마 매핑

#### hands 테이블

| DB 컬럼 | 포커 개념 | 예시 |
|---------|-----------|------|
| `number` | 핸드 번호 | `"001"` |
| `small_blind` | 스몰 블라인드 (cents) | `50000` |
| `big_blind` | 빅 블라인드 (cents) | `100000` |
| `ante` | 앤티 (cents) | `100000` |
| `board_flop` | 플랍 카드 (3장) | `["9d", "6s", "3c"]` |
| `board_turn` | 턴 카드 (1장) | `"As"` |
| `board_river` | 리버 카드 (1장) | `"2h"` |
| `final_pot` | 최종 팟 크기 (cents) | `19500000` |
| `video_timestamp_start` | 시작 타임스탬프 (초) | `3245` |

**카드 표기법**:
- Rank: `A` (Ace), `K` (King), `Q` (Queen), `J` (Jack), `T` (Ten), `9`-`2`
- Suit: `s` (♠), `h` (♥), `d` (♦), `c` (♣)
- 예시: `["Ah", "As"]` = Ace of hearts, Ace of spades

#### hand_players 테이블

| DB 컬럼 | 포커 개념 | 예시 |
|---------|-----------|------|
| `poker_position` | 포지션 | `"BTN"`, `"SB"`, `"UTG"` |
| `hole_cards` | 홀카드 (2장) | `["Ah", "As"]` |
| `starting_stack` | 시작 스택 (cents) | `9600000` |
| `ending_stack` | 종료 스택 (cents) | `19500000` |
| `is_winner` | 승자 여부 | `true` |

#### hand_actions 테이블

| DB 컬럼 | 포커 개념 | 예시 |
|---------|-----------|------|
| `street` | 스트리트 | `"preflop"`, `"flop"`, `"turn"`, `"river"` |
| `sequence_order` | 액션 순서 (핸드 전체) | `1`, `2`, `3`... |
| `action_type` | 액션 타입 | `"fold"`, `"check"`, `"call"`, `"bet"`, `"raise"`, `"all-in"`, `"3-bet"` |
| `amount` | 베팅 금액 (cents) | `300000` |
| `pot_after` | 액션 후 팟 (cents) | `650000` |

#### players 테이블

| DB 컬럼 | 설명 | 예시 |
|---------|------|------|
| `name` | 플레이어 이름 | `"Kristen Foxen"` |
| `country` | 국가 | `"Canada"` |
| `gender` | 성별 | `"female"`, `"male"`, `"other"` |
| `total_winnings` | 총 상금 (cents) | `402060300` ($4,020,603) |
| `photo_url` | 프로필 사진 URL | Supabase Storage URL |

**여성 플레이어 필터**:
- Women's Elite Board: `gender='female'`
- 500명 여성 플레이어 데이터 보유

### KAN 분석 체크리스트

**분석 전**:
- [ ] YouTube URL 유효성 확인
- [ ] 영상 길이 1시간 이하 세그먼트로 분할
- [ ] 플랫폼 식별 (EPT, WSOP, Triton)
- [ ] Prompt 선택 (`lib/ai/prompts.ts`)
- [ ] Stream 존재 확인 (stream_id 필요)

**분석 후**:
- [ ] 플레이어 이름 인식 (EPT: 대문자, WSOP/Triton: 일반 케이스)
- [ ] 포지션 추출 정확도
- [ ] 홀카드 파싱 (`["Ah", "As"]` 형식)
- [ ] 보드 카드 추출 (Flop 3장, Turn 1장, River 1장)
- [ ] 액션 시퀀스 순서 보장
- [ ] 베팅 금액 일관성 (amount, pot_after, stack_after)

**플랫폼별 특이사항**:
- **EPT**: 이름 전부 대문자 (`"BRZEZINSKI"`)
- **WSOP/Triton**: 일반 케이스 (`"Phil Ivey"`)
- **Cash Game**: Ante 없음 (0 또는 NULL)

### 핸드 히스토리 예시 (JSON)

```json
{
  "number": "001",
  "small_blind": 50000,
  "big_blind": 100000,
  "ante": 100000,
  "stakes": "50K/100K/100K ante",
  "board_flop": ["9d", "6s", "3c"],
  "board_turn": "As",
  "board_river": "2h",
  "final_pot": 19500000,
  "video_timestamp_start": 3245,
  "video_timestamp_end": 3510,
  "ai_summary": "Preflop all-in battle between pocket Aces and pocket Kings.",
  "hand_players": [
    {
      "name": "BRZEZINSKI",
      "poker_position": "BTN",
      "hole_cards": ["Ah", "As"],
      "starting_stack": 9600000,
      "ending_stack": 19500000,
      "seat": 3,
      "is_winner": true,
      "hand_description": "Pair of Aces"
    }
  ],
  "hand_actions": [
    {
      "street": "preflop",
      "sequence_order": 1,
      "player_name": "BRZEZINSKI",
      "action_type": "raise",
      "amount": 300000,
      "pot_after": 650000,
      "stack_after": 9300000
    }
  ]
}
```

---

## 핵심 파일 위치

### 아키텍처

**Archive 페이지** (3-Column):
- `app/(main)/archive/tournament/page.tsx`
- `app/(main)/archive/cash-game/page.tsx`
- `app/(main)/archive/_components/`:
  - `ArchiveFilterSidebar.tsx` - 필터 (320px)
  - `ArchiveNavigationSidebar.tsx` - 네비게이션 (400px)
  - `ArchiveDashboard.tsx` - 대시보드
  - `HandsListPanel.tsx` - 핸드 리스트
- `lib/types/archive.ts`
- `stores/archive-*.ts` (3개 파일)

**Search 페이지** (3-Column):
- `app/(main)/search/page.tsx`
- `app/(main)/search/_components/`:
  - `SearchFilterSidebar.tsx` - 21개 필터 (320px)
  - `SearchResultsList.tsx` - 검색 결과 (400px)
  - `HandDetailPanel.tsx` - 핸드 상세 (flex-1)
  - `HoleCardDialog.tsx` - 홀 카드 선택
  - `HandValueDialog.tsx` - 핸드 강도 선택
- `lib/filter-utils.ts` - 필터 로직

### 플레이어 시스템

- **플레이어 메인**: `app/(main)/players/page.tsx`
- **플레이어 상세**: `app/(main)/players/[id]/page.tsx`
- **플레이어 컴포넌트**: `app/(main)/players/_components/`
- **플레이어 통계**: `components/player-stats.tsx` ⭐ 신규
- **통계 계산**: `lib/player-stats.ts`
- **통계 쿼리**: `lib/queries/player-stats-queries.ts`

### 인증 & 보안

- **인증 유틸**: `lib/auth-utils.ts`
- **보안 유틸**: `lib/security.ts`
- **파일 검증**: `lib/file-upload-validator.ts`
- **Rate Limiting**: `lib/rate-limit.ts`

### AI 통합

- **Gemini**: `lib/ai/gemini.ts`
- **KAN Prompts**: `lib/ai/prompts.ts`
- **KAN Actions**: `app/actions/kan-analysis.ts`
- **Natural Search**: `app/api/natural-search/route.ts`

### React Query

- **Archive**: `lib/queries/archive-queries.ts`
- **Players**: `lib/queries/players-queries.ts`
- **Player Stats**: `lib/queries/player-stats-queries.ts` ⭐
- **Community**: `lib/queries/community-queries.ts`
- **Notifications**: `lib/queries/notification-queries.ts`

---

## 참고 문서

- **README.md**: Quick Start 가이드
- **PRD.md**: 제품 요구사항 문서
- **ROADMAP.md**: 통합 로드맵
- **WORK_LOG.md**: 일별 작업 로그
- **PAGES_STRUCTURE.md**: 49개 페이지 구조
- **docs/REACT_QUERY_GUIDE.md**: 데이터 페칭 패턴
- **docs/HAND_IMPORT_API.md**: 핸드 Import API
- **docs/FLOWBITE_GUIDE.md**: Flowbite UI 컴포넌트 라이브러리 가이드
- **docs/DESIGN_SYSTEM.md**: 포스트모던 디자인 시스템

---

**마지막 업데이트**: 2025-11-21
**문서 버전**: 2.4
**현재 Phase**: 44 완료
**보안 등급**: A
**주요 업데이트** (v2.4):
- 📚 **프로젝트 구조 섹션 추가**: 디렉토리 구조 시각화
- 🔧 **Trigger.dev 개발/배포 가이드 추가**: 로컬 개발 및 프로덕션 배포 절차
- 🐛 **디버깅 섹션 강화**: Trigger.dev 문제 해결 가이드
- 🧪 **테스트 명령어 정확화**: Vitest 단일 파일 실행 명령 수정
- 📝 **환경 변수 가이드 개선**: Trigger.dev 설정 단계별 안내

**이전 업데이트** (v2.3):
- ⚡ **KAN 전면 재설계**: Python → TypeScript + Trigger.dev v3 전환
- 🎬 영상 분석 파이프라인 완전 재작성 (단일 스택)
- 📦 새 의존성: @trigger.dev/sdk, @distube/ytdl-core, fluent-ffmpeg
- 🔄 실시간 진행률 모니터링 (React Query 폴링)
- 💾 인메모리 처리 (디스크 I/O 제거)
- ☁️ 무제한 실행 시간 (Trigger.dev maxDuration: 3600s)
- 🚀 Python 백엔드 완전 제거 (kan/backend 삭제)
