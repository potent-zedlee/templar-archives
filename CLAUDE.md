# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Templar Archives는 포커 핸드 데이터의 자동 추출, 보관, 분석을 통합하는 차세대 포커 생태계입니다.

**미션**: "모든 포커 영상을 핸드 히스토리로 변환하고, 분석하고, 학습 가능하게 만든다"

- **프로덕션**: https://templar-archives.vercel.app
- **개발 서버**: http://localhost:3000
- **현재 Phase**: 0-33 완료 (2025-11-08)

---

## 빠른 시작

### 개발 환경 실행

```bash
# 개발 서버 시작
npm run dev

# 빌드 (프로덕션)
npm run build

# 린트
npm run lint

# 테스트
npm run test              # Unit tests (Vitest)
npm run test:ui           # Vitest UI
npm run test:coverage     # Coverage report
npm run test:e2e          # E2E tests (Playwright)
npm run test:e2e:ui       # Playwright UI mode
npm run test:e2e:headed   # Playwright with browser
```

### 데이터베이스

```bash
# Supabase 마이그레이션 적용
supabase db push

# 로컬 DB 리셋
supabase db reset

# 마이그레이션 생성
supabase migration new migration_name
```

### 유틸리티 스크립트

```bash
# 로고 관리
npm run logo:fetch         # 로고 다운로드
npm run logo:upload        # Supabase에 업로드
npm run logo:delete        # 로고 삭제
npm run logo:validate      # 로고 검증

# 썸네일 생성
npm run thumbnails:generate           # 전체 생성
npm run thumbnails:generate:day --day-id=<uuid>  # 특정 Day만
```

---

## 기술 스택 및 버전

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
  "@google/genai": "1.29.0"
}
```

**Node.js**: >=22.0.0
**패키지 매니저**: npm (pnpm 사용 금지)

---

## 핵심 아키텍처 패턴

### 1. 상태 관리 전략

**서버 상태 (React Query)**: 데이터 페칭, 캐싱, 동기화
- 위치: `lib/queries/*.ts`
- 6개 쿼리 파일 (650줄): archive, players, community, bookmarks, notifications, profile
- staleTime: 1-10분 (데이터 특성별)
- Optimistic Updates 적극 활용

```typescript
// 예시: lib/queries/community-queries.ts
export function useLikePostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postId: string) => {
      // API 호출
    },
    onMutate: async (postId) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['post', postId] })
      const previousPost = queryClient.getQueryData(['post', postId])

      queryClient.setQueryData(['post', postId], (old: any) => ({
        ...old,
        like_count: (old.like_count || 0) + 1,
        user_has_liked: true,
      }))

      return { previousPost }
    },
    onError: (err, postId, context) => {
      // 실패 시 롤백
      queryClient.setQueryData(['post', postId], context?.previousPost)
    },
    onSettled: (postId) => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}
```

**클라이언트 상태 (Zustand)**: UI 상태, 폼 데이터
- 위치: `stores/*.ts`
- 4개 스토어 (780줄): archive-ui, archive-data, archive-form, filter
- persist 미들웨어 활용 (LocalStorage 저장)

```typescript
// 예시: stores/archive-ui-store.ts
export const useArchiveUIStore = create<ArchiveUIState>()(
  persist(
    (set) => ({
      expandedTournament: null,
      setExpandedTournament: (id) => set({ expandedTournament: id }),
    }),
    { name: 'archive-ui' }
  )
)
```

### 2. Server Actions 패턴

**모든 write 작업은 Server Actions 사용** (클라이언트 직접 Supabase 호출 금지)

위치: `app/actions/*.ts`
- `archive.ts` (670줄): Tournament/SubEvent/Day CRUD
- `hae-analysis.ts` (380줄): HAE 영상 분석

```typescript
// 예시: app/actions/archive.ts
'use server'

export async function createTournament(data: TournamentData) {
  // 1. 서버 사이드 인증 검증
  const user = await verifyAdmin()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // 2. Supabase 작업
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert(data)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // 3. 캐시 무효화
  revalidatePath('/archive')

  return { success: true, data: tournament }
}
```

**인증 검증**: `lib/auth-utils.ts`의 `verifyAdmin()`, `isHighTemplar()` 사용

### 3. Archive 계층 구조 (4단계)

```
Tournament (토너먼트)
  └── SubEvent (서브 이벤트, Event #15)
      └── Stream/Day (일별 스트림, Day 1A)
          └── Hand (핸드, #001)
              ├── HandPlayers (플레이어별 액션)
              └── HandActions (시퀀스별 액션)
```

**핵심 파일**:
- `app/archive/tournament/page.tsx` (88줄) - 리팩토링 완료
- `app/archive/_components/` (5개 컴포넌트, 단일 책임)
- `lib/types/archive.ts` (타입 정의)

**Single Mode Accordion**: 한 번에 하나의 아이템만 열림 (Google Drive 스타일)

### 4. AI 통합

**Gemini 2.0 Flash** (영상 분석, HAE)
- 위치: `lib/ai/gemini.ts`
- HAE Prompt: `lib/ai/prompts.ts` (EPT_PROMPT 기본값)
- TimeSegment 시스템 (초 단위)

```typescript
// 예시: startHaeAnalysis() 서버 액션
const result = await analyzeVideo({
  videoUrl,
  streamId,
  layout: 'ept',  // 기본값: EPT
  maxIterations: 150,
})
```

**Claude 3.5 Sonnet** (자연어 검색)
- 위치: `app/api/natural-search/route.ts`
- JSON 필터 방식 (SQL Injection 방지)

### 5. 타입 시스템

**114개 `any` 타입 완전 제거** (Phase 9)

핵심 타입 위치:
- `lib/types/archive.ts` - Tournament, SubEvent, Stream, Hand
- `lib/types/database.types.ts` - Supabase 자동 생성 타입
- `lib/types/*.ts` - 도메인별 타입

**중요**: 절대 `any` 사용 금지, `unknown` 또는 구체적 타입 사용

---

## 보안 가이드라인 (등급 A)

### 1. RLS (Row Level Security) 정책

모든 write 작업은 admin/high_templar 권한 필요:
- tournaments, sub_events, streams, hands
- players, hand_players, hand_actions

```sql
-- 예시: 20251024000001_fix_rls_admin_only.sql
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

### 2. Server Actions 인증

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

### 3. 입력 검증

**Zod 스키마**: 모든 API 입력에 적용
```typescript
const schema = z.object({
  query: z.string().min(1).max(500),
})

const { query } = schema.parse(body)
```

**파일 업로드**: Magic Number 검증 (`lib/file-upload-validator.ts`)

### 4. CSRF 보호

모든 POST API에 `verifyCSRF()` 적용
```typescript
// app/api/import-hands/route.ts
const csrfValid = verifyCSRF(request)
if (!csrfValid) {
  return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 })
}
```

### 5. Rate Limiting

User ID 기반 (JWT 파싱, IP는 fallback)
```typescript
// lib/rate-limit.ts
const identifier = await getUserIdFromToken(request) || getIP(request)
const { success } = await ratelimit.limit(identifier)
```

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
8. **문서 업데이트** (WORK_LOG.md)

### 코드 스타일

- **ESLint + Prettier**: 자동 포맷팅
- **네이밍**:
  - 컴포넌트: `PascalCase` (TournamentCard.tsx)
  - 함수: `camelCase` (fetchHands)
  - 파일: `kebab-case` (tournament-card.tsx)
- **Import 순서**: React → Next.js → 외부 라이브러리 → 내부 모듈 → 타입

### 커밋 메시지

Conventional Commits 규칙:
```
feat(archive): add hand filtering by position
fix(search): resolve natural language query parsing
docs(readme): update quick start guide
refactor(stores): simplify archive UI store
test(e2e): add archive CRUD tests
```

### DB 스키마 변경 시 주의사항

1. **로컬 테스트**: `supabase db reset` 전체 재적용
2. **백업 확인**: 프로덕션 데이터 백업
3. **인덱스**: off-peak 시간에 추가
4. **RLS 정책**: 모든 테이블에 적용
5. **마이그레이션 순서**: 의존성 고려

---

## 중요한 제약 사항

### 금지 사항

1. ❌ **클라이언트에서 직접 Supabase write**: Server Actions 사용 필수
2. ❌ **`any` 타입 사용**: `unknown` 또는 구체적 타입
3. ❌ **SQL Injection 위험**: Prepared Statements, JSON 필터만
4. ❌ **민감 정보 노출**: 환경 변수, API 키 하드코딩
5. ❌ **pnpm 사용**: npm만 사용

### 필수 사항

1. ✅ **Server Actions**: 모든 write 작업
2. ✅ **React Query**: 서버 상태 관리
3. ✅ **Zod 검증**: API 입력
4. ✅ **RLS 정책**: 모든 테이블
5. ✅ **Optimistic Updates**: 사용자 경험 개선
6. ✅ **Error Boundary**: 에러 처리
7. ✅ **TypeScript Strict Mode**: 타입 안전성

---

## 디버깅 및 문제 해결

### 빌드 에러

```bash
# TypeScript 에러 확인
npx tsc --noEmit

# ESLint 확인
npm run lint

# 캐시 삭제
rm -rf .next
npm run build
```

### Supabase 연결 문제

1. `.env.local` 확인
2. Supabase Dashboard → Settings → API
3. RLS 정책 확인 (테이블별)

### 마이그레이션 실패

```bash
# 로컬 DB 리셋
supabase db reset

# dry-run 먼저 실행 (프로덕션)
supabase db push --dry-run
supabase db push
```

### React Query 캐시 문제

```typescript
// 특정 쿼리 무효화
queryClient.invalidateQueries({ queryKey: ['tournaments'] })

// 모든 쿼리 무효화
queryClient.invalidateQueries()
```

---

## 성능 최적화 팁

1. **동적 임포트**: 큰 컴포넌트 lazy loading
   ```typescript
   const Dialog = dynamic(() => import('./Dialog'), { ssr: false })
   ```

2. **React.memo**: 재렌더링 방지
   ```typescript
   export const TournamentCard = React.memo(({ tournament }) => { ... })
   ```

3. **useCallback**: 함수 메모이제이션
   ```typescript
   const handleClick = useCallback(() => { ... }, [dependencies])
   ```

4. **React Query staleTime**: 적절한 캐싱 시간 설정
   - 정적 데이터: 10분
   - 동적 데이터: 1-2분
   - 실시간 데이터: 0 (항상 새로고침)

---

## 핵심 파일 위치

### 아키텍처

- **Archive 메인**: `app/archive/tournament/page.tsx` (88줄)
- **Archive 컴포넌트**: `app/archive/_components/` (5개 파일)
- **Archive 타입**: `lib/types/archive.ts`
- **Archive Stores**: `stores/archive-*.ts` (3개 파일)

### 인증 & 보안

- **인증 유틸**: `lib/auth-utils.ts`
- **보안 유틸**: `lib/security.ts`
- **파일 검증**: `lib/file-upload-validator.ts`
- **Rate Limiting**: `lib/rate-limit.ts`

### AI 통합

- **Gemini**: `lib/ai/gemini.ts`
- **HAE Prompts**: `lib/ai/prompts.ts`
- **HAE Actions**: `app/actions/hae-analysis.ts`

### React Query

- **Archive**: `lib/queries/archive-queries.ts`
- **Players**: `lib/queries/players-queries.ts`
- **Community**: `lib/queries/community-queries.ts`
- **Notifications**: `lib/queries/notification-queries.ts`

---

## 참고 문서

- **../ROADMAP.md**: 통합 로드맵 (Part 1: Templar Archives 섹션 참조)
- **PAGES_STRUCTURE.md**: 43개 페이지 구조
- **WORK_LOG.md**: 일별 작업 로그
- **README.md**: Quick Start 가이드
- **docs/REACT_QUERY_GUIDE.md**: 데이터 페칭 패턴
- **docs/HAND_IMPORT_API.md**: 핸드 Import API 상세

---

---

## 최근 중요 변경사항

### Phase 35: 보안 & 안정성 강화 (2025-11-12)

**완료된 작업**:

1. **HAE 권한 체크 정상화**
   - 권한 우회 코드 제거 (app/actions/hae-analysis.ts)
   - Admin 역할 명시적 포함
   - 보안 로깅 강화 (개발/프로덕션 환경 분기)
   - 커밋: `ceff46b`

2. **Next.js 16.0 Proxy 시스템 마이그레이션**
   - `middleware.ts` → `proxy.ts` 변경
   - Next.js 공식 codemod 실행
   - Deprecated 경고 해결
   - 커밋: `210d40c`

3. **Console 로그 정리 및 프로덕션 최적화**
   - 민감한 사용자 정보 로그 제거 (userId 개발 환경으로 제한)
   - 개발/프로덕션 환경 분기 처리 (`process.env.NODE_ENV`)
   - 3개 주요 파일 수정 (hae-analysis, analyze-video-dialog, ArchiveMainPanel)
   - 커밋: `1967ecd`

4. **CSRF 토큰 검증 시스템 완성**
   - Double Submit Cookie 패턴 구현
   - SHA-256 해시 기반 검증 (lib/security/csrf.ts)
   - 프로덕션 레벨 보안 완성
   - 커밋: `d6db879`

5. **Deprecated 타입 제거**
   - Day → Stream 리네이밍 완전 완료
   - 8개 파일 수정, 117줄 코드 감소
   - 타입 안전성 100% 달성
   - 커밋: `1380154`

6. **profiles 테이블 참조 오류 수정** (프로덕션 핫픽스)
   - 문제: Supabase 프로덕션에 `profiles` 테이블 존재하지 않음
   - 해결: `users` 테이블로 변경 (app/actions/hae-analysis.ts:422-426)
   - 커밋: `e8d7d07`

**성과**:
- ✅ 보안 등급 A 유지
- ✅ 117줄 코드 감소
- ✅ TypeScript 타입 안전성 100%
- ✅ Next.js 16.0 완전 호환
- ✅ 프로덕션 로그 최적화

### Phase 34: HAE 데이터 저장 수정 (2025-11-12)

**문제**: HAE 분석 성공 후 hands 테이블에 데이터가 저장되지 않음

**원인 및 해결**:
1. **테이블 이름 불일치**: `days` → `streams`로 수정 (app/actions/hae-analysis.ts:598)
2. **컬럼 이름 불일치**: `hand_number` → `number`로 수정 (hands 테이블)
3. **"Unsorted Hands" 스트림**: 스크립트로 생성 완료 (scripts/create-unsorted-stream.mjs)

**유틸리티 스크립트**:
```bash
node scripts/check-db.mjs              # DB 상태 확인
node scripts/create-unsorted-stream.mjs # "Unsorted Hands" 스트림 생성
node scripts/fix_stuck_jobs.mjs        # 멈춘 작업 정리 (30분 타임아웃)
```

**중요**: HAE 분석 결과는 반드시 기존 stream에 저장되어야 합니다. 자동 스트림 생성은 제거되었습니다.

---

**마지막 업데이트**: 2025-11-12
**문서 버전**: 30.0
**현재 Phase**: 35 완료 (보안 & 안정성 강화, 프로덕션 배포)
**보안 등급**: A
