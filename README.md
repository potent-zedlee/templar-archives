# Templar Archives

> 포커 핸드 히스토리 분석 플랫폼 - **프로덕션 배포 중** 🚀

**개발자를 위한 README** - 5분 안에 개발 시작 가능

[![Next.js](https://img.shields.io/badge/Next.js-16.0.1-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black)](https://templar-archives.vercel.app)

---

## 📋 목차

1. [Quick Start](#-quick-start)
2. [프로젝트 개요](#-프로젝트-개요)
3. [기술 스택](#-기술-스택)
4. [주요 기능](#-주요-기능)
5. [개발 가이드](#-개발-가이드)
6. [테스트 & 배포](#-테스트--배포)
7. [문서](#-문서)

---

## 🚀 Quick Start

```bash
# 1. 클론 및 설치
git clone <repository-url>
cd templar-archives
npm install  # ~2분 소요

# 2. 환경 변수 설정
cp .env.example .env.local
# .env.local 편집: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. 데이터베이스 마이그레이션
supabase link --project-ref <your-project-ref>
supabase db push  # 73개 마이그레이션 적용

# 4. 개발 서버 실행
npm run dev  # http://localhost:3000
```

**즉시 확인 가능**:
- ✅ 홈페이지 (`/`) - 플랫폼 통계, 주간 하이라이트
- ✅ Archive (`/archive/tournament`) - Tournament/SubEvent/Stream 계층 구조
- ✅ 커뮤니티 (`/community`) - Reddit 스타일 포럼
- ✅ AI 검색 (`/search`) - Gemini 2.0 Flash 자연어 검색

---

## 📊 프로젝트 개요

### 프로젝트 현황

| 항목 | 상태 |
|------|------|
| **Phase** | 0-35 완료 (2025-10-16 ~ 2025-11-12) |
| **페이지** | 43개 완전 구현 |
| **API** | 9개 엔드포인트 |
| **DB 테이블** | 27개 (73개 마이그레이션) |
| **컴포넌트** | 158개 (shadcn/ui 50+) |
| **테스트** | E2E 3개, Unit 3개 |
| **타입 안전성** | 100% (0개 `any`) |
| **보안 등급** | A |
| **배포** | Vercel 프로덕션 |

### 디렉토리 구조 (간소화)

```
templar-archives/
├── app/                           # Next.js App Router (43 페이지)
│   ├── archive/tournament/        # Tournament Archive ⭐ 핵심 기능
│   ├── search/                    # AI 검색
│   ├── community/                 # 커뮤니티
│   ├── players/                   # 플레이어
│   ├── admin/                     # 관리자 (12 페이지)
│   └── api/                       # API Routes (9개)
│
├── components/                    # React Components (158개)
│   ├── ui/                        # shadcn/ui (50+)
│   ├── archive/                   # Archive 전용
│   └── admin/                     # 관리자 전용
│
├── lib/                           # Utilities
│   ├── supabase.ts                # Supabase 클라이언트
│   ├── types/                     # TypeScript 타입
│   └── utils.ts
│
├── stores/                        # Zustand (4개, 780줄)
│   ├── archive-ui-store.ts
│   ├── archive-data-store.ts
│   └── archive-form-store.ts
│
├── lib/queries/                   # React Query (6개, 650줄)
│   ├── archive-queries.ts
│   ├── players-queries.ts
│   └── community-queries.ts
│
├── supabase/migrations/           # DB (73개)
└── e2e/                           # E2E 테스트 (Playwright)
```

### 핵심 파일 위치

| 기능 | 파일 경로 | 설명 |
|------|-----------|------|
| **Archive 메인** | `app/archive/tournament/page.tsx` | 4단계 계층 UI (88줄) |
| **HAE 분석** | `app/actions/hae-analysis.ts` | Gemini AI 영상 분석 (380줄) |
| **AI 검색 API** | `app/api/natural-search/route.ts` | Gemini 2.0 Flash 통합 |
| **플레이어 통계** | `lib/queries/players-queries.ts` | React Query + 캐싱 |
| **댓글 시스템** | `components/community/CommentTree.tsx` | Reddit 스타일 무한 중첩 |

---

## 🔧 기술 스택

### 프론트엔드

```json
{
  "next": "16.0.1",           // App Router, Server Components
  "react": "19.2.0",          // 최신 React
  "typescript": "5.9.3",      // Strict Mode
  "tailwindcss": "4.1.16",    // 스타일링
  "zustand": "5.0.2",         // UI 상태 (4개 stores)
  "@tanstack/react-query": "5.90.5",  // 서버 상태 (6개 queries)
  "framer-motion": "12.23.24" // 애니메이션
}
```

### 백엔드

- **Supabase**: PostgreSQL 15 + Storage + Auth + Realtime
- **Gemini AI**: 2.0 Flash (@google/genai 1.29.0) - 영상 분석, 자연어 검색
- **Upstash Redis**: Rate Limiting

### 아키텍처

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│   Next.js 16 (Vercel)   │
│  - Server Components    │
│  - API Routes (Edge)    │
│  - Server Actions       │
└──────┬────────┬─────────┘
       │        │
       ▼        ▼
┌──────────┐  ┌─────────────┐
│ Supabase │  │  Gemini AI  │
│   (DB)   │  │  2.0 Flash  │
└──────────┘  └─────────────┘
```

---

## 🎯 주요 기능

### 1. Archive (영상 아카이브)

**4단계 계층 구조**:
```
Tournament → SubEvent → Stream → Hand
```

**주요 기능**:
- Single Mode Accordion (한 번에 하나만 열림)
- YouTube 영상 플레이어
- Quick Upload (YouTube URL 자동 파싱)
- 핸드 히스토리 상세 (Accordion)
- 카테고리 로고 업로드

**파일**: `app/archive/tournament/page.tsx` (88줄)

### 2. HAE (Hand Analysis Engine)

**AI 영상 분석**:
- Gemini 2.0 Flash 기반
- 자동 핸드 히스토리 추출
- 타임스탬프 동기화
- 실시간 진행률 표시 (Supabase Realtime)
- 멀티 플랫폼 지원 (EPT, WSOP, Triton, PokerStars, Hustler)

**파일**: `app/actions/hae-analysis.ts` (380줄)

### 3. Search (AI 검색)

**검색 방식**:
- AI 자연어 검색 (Gemini 2.0 Flash)
- 30+ 고급 필터 (플레이어, 홀 카드, 보드 카드, 날짜, 팟 사이즈)
- Full-Text Search (PostgreSQL tsvector)

**파일**: `app/api/natural-search/route.ts`

### 4. Community (커뮤니티)

**주요 기능**:
- Reddit 스타일 포스트/댓글 (무한 중첩)
- 4가지 카테고리 (Analysis, Strategy, Hand Review, General)
- 좋아요/싫어요, 북마크
- 핸드 공유 (SNS, 링크, 임베드)

**파일**: `components/community/CommentTree.tsx`

### 5. Players (플레이어 프로필)

**주요 기능**:
- 플레이어 클레임 시스템 (소셜 미디어/이메일 인증)
- 플레이어 통계 (VPIP, PFR, 3Bet, Win Rate)
- 통계 캐싱 시스템 (50-70% 쿼리 시간 감소)
- 토너먼트 결과 리스트

**파일**: `lib/queries/players-queries.ts`

### 6. Admin Panel (관리자)

**주요 기능** (12 페이지):
- 대시보드 (15+ 메트릭, 차트)
- 사용자 관리 (밴, 역할 변경)
- 플레이어 클레임 승인/거절
- 핸드 수정 요청 관리
- 콘텐츠 모더레이션
- 보안 이벤트 로그
- 감사 로그

---

## 🗄️ 데이터베이스

### 핵심 테이블 (27개)

#### Archive 테이블 (5개)

```sql
-- tournaments: 토너먼트/캐시게임
-- sub_events: 서브 이벤트
-- streams: 일별 스트림 (구 days)
-- hands: 핸드 히스토리
-- hand_players: 핸드-플레이어 연결
```

#### 플레이어 테이블 (4개)

```sql
-- players: 플레이어 마스터
-- player_stats_cache: 플레이어 통계 캐시 ⭐ (2025-11-02)
-- player_claims: 플레이어 클레임
-- hendon_mob_data: Hendon Mob 데이터
```

**성능 최적화**: `player_stats_cache` 테이블로 50-70% 쿼리 시간 감소

#### 커뮤니티 테이블 (5개)

```sql
-- posts: 커뮤니티 포스트
-- post_comments: 댓글 (무한 중첩)
-- post_likes, comment_likes: 좋아요
-- hand_bookmarks: 북마크
```

#### 관리 시스템 (7개)

```sql
-- notifications: 알림
-- hand_edit_requests: 핸드 수정 요청
-- content_reports: 콘텐츠 신고
-- data_deletion_requests: 데이터 삭제 요청 (GDPR)
-- security_events: 보안 이벤트 로그
-- audit_logs: 감사 로그
-- performance_logs: 성능 로그
```

### ERD (간소화)

```
tournaments → sub_events → streams → hands
                                       │
                                       ├── hand_players ─── players
                                       │                      └── player_stats_cache
                                       └── hand_actions

posts → post_comments (무한 중첩)
  │
  ├── post_likes
  └── hand_bookmarks

users ─── player_claims
  │
  ├── notifications
  └── data_deletion_requests
```

### 마이그레이션 (73개)

**최신 마이그레이션** (2025-11-02):
```sql
-- 20251102000001_add_player_stats_cache.sql
-- 플레이어 통계 캐싱 시스템 + 자동 무효화 트리거
```

**마이그레이션 적용**:
```bash
# 로컬 테스트
supabase db reset  # 모든 마이그레이션 재적용

# 프로덕션
supabase db push --dry-run  # 시뮬레이션
supabase db push            # 실제 적용
```

---

## 🛠️ 개발 가이드

### 1. 새 페이지 추가

**체크리스트**:
1. Page: `app/search/page.tsx`
2. Query: `lib/queries/search-queries.ts`
3. Components: `components/search/`
4. Types: `lib/types/search.ts`

**예시**:
```typescript
// app/search/page.tsx
export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>({})
  const { data: hands, isLoading } = useHandsQuery(filters)

  return (
    <div>
      <SearchFilters filters={filters} onChange={setFilters} />
      <HandsList hands={hands} loading={isLoading} />
    </div>
  )
}

// lib/queries/search-queries.ts
export function useHandsQuery(filters: SearchFilters) {
  return useQuery({
    queryKey: ['hands', filters],
    queryFn: () => fetchHands(filters),
    staleTime: 5 * 60 * 1000, // 5분
  })
}
```

### 2. API 엔드포인트 추가

**체크리스트**:
- ✅ Zod 스키마 검증
- ✅ try-catch 에러 처리
- ✅ 보안 이벤트 로깅
- ✅ Rate Limiting (미들웨어)
- ✅ TypeScript 타입 정의

**예시**:
```typescript
// app/api/natural-search/route.ts
import { z } from 'zod'

const schema = z.object({
  query: z.string().min(1).max(500),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query } = schema.parse(body)

    // Gemini API 호출
    const result = await gemini.generateContent(query)

    // JSON 필터 생성 (SQL Injection 방지)
    const filters = extractFilters(result)

    // Supabase 쿼리
    const { data } = await supabase
      .from('hands')
      .select('*')
      .match(filters)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    await logSecurityEvent('api_error', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

### 3. DB 스키마 변경

```bash
# 1. 마이그레이션 생성
supabase migration new add_hand_tags

# 2. SQL 작성: supabase/migrations/20251103000001_add_hand_tags.sql
CREATE TABLE hand_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hand_id UUID REFERENCES hands(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hand_tags_hand_id ON hand_tags(hand_id);

# 3. 로컬 테스트
supabase db reset

# 4. TypeScript 타입 생성
export interface HandTag {
  id: string
  hand_id: string
  tag: string
  created_at: string
}

# 5. 프로덕션 적용 (신중!)
supabase db push
```

### 4. Zustand Store 사용

**예시**: Archive UI Store
```typescript
// stores/archive-ui-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ArchiveUIState {
  expandedTournament: string | null
  setExpandedTournament: (id: string | null) => void
}

export const useArchiveUIStore = create<ArchiveUIState>()(
  persist(
    (set) => ({
      expandedTournament: null,
      setExpandedTournament: (id) => set({ expandedTournament: id }),
    }),
    { name: 'archive-ui' }  // LocalStorage 키
  )
)

// 컴포넌트에서 사용
function TournamentList() {
  const { expandedTournament, setExpandedTournament } = useArchiveUIStore()

  return (
    <Accordion value={expandedTournament} onValueChange={setExpandedTournament}>
      {tournaments.map(t => <AccordionItem key={t.id} value={t.id}>...</AccordionItem>)}
    </Accordion>
  )
}
```

### 5. React Query 사용

**예시**: Optimistic Update
```typescript
// lib/queries/community-queries.ts
export function useLikePostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId })

      if (error) throw error
      return data
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
      // 에러 시 롤백
      queryClient.setQueryData(['post', postId], context?.previousPost)
    },
    onSettled: (postId) => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}
```

---

## 🧪 테스트 & 배포

### E2E 테스트 (Playwright)

```bash
# 헤드리스 모드 (CI)
npm run test:e2e

# UI 모드 (디버깅)
npm run test:e2e:ui

# 헤드풀 모드 (브라우저 표시)
npm run test:e2e:headed
```

**예시**: `e2e/archive.spec.ts`
```typescript
test('Tournament CRUD', async ({ page }) => {
  await page.goto('/archive/tournament')

  // 1. Tournament 추가
  await page.click('[data-testid="add-tournament"]')
  await page.fill('input[name="name"]', '2024 WSOP Main Event')
  await page.click('button[type="submit"]')

  // 2. Tournament 확인
  await expect(page.locator('text=2024 WSOP Main Event')).toBeVisible()
})
```

### 단위 테스트 (Vitest)

```bash
npm run test              # 단위 테스트
npm run test:coverage     # 커버리지
```

### Vercel 배포

```
Git Push (main) → Vercel Build → Production Deploy (~2분)
                                  ↓
                  https://templar-archives.vercel.app
```

**환경 변수** (Vercel Dashboard):
```bash
# 필수 (5개)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_API_KEY=your-key    # Gemini AI
ANTHROPIC_API_KEY=sk-ant-... # Claude (선택)

# 선택 (3개)
UPSTASH_REDIS_REST_URL=your-url
UPSTASH_REDIS_REST_TOKEN=your-token
YOUTUBE_API_KEY=your-key
```

**배포 전 체크리스트**:
- [ ] `npm run build` 로컬 빌드 성공
- [ ] `npm run test:e2e` E2E 테스트 통과
- [ ] `npx tsc --noEmit` TypeScript 에러 없음
- [ ] Vercel 환경 변수 등록
- [ ] Supabase 프로덕션 DB 마이그레이션 적용

---

## 🐛 문제 해결

### 1. `npm install` 실패

```bash
# 원인: Node.js 버전 < 22.0.0
node --version

# 해결: Node.js 업데이트
# https://nodejs.org/ LTS 버전 설치

# 또는 캐시 삭제 후 재설치
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 2. Supabase 연결 실패

```bash
# 원인: 환경 변수 오류
cat .env.local

# 해결: URL과 Key 정확히 복사
# Supabase Dashboard → Settings → API
```

### 3. 빌드 에러 (`Type error`)

```bash
# TypeScript 타입 체크
npx tsc --noEmit

# ESLint
npm run lint

# 캐시 삭제 후 재빌드
rm -rf .next
npm run build
```

### 4. 마이그레이션 에러

```bash
# 로컬 DB 리셋
supabase db reset

# 프로덕션: dry-run 먼저 실행
supabase db push --dry-run
supabase db push
```

---

## 📚 문서

### 프로젝트 전체

- **[CLAUDE.md](./CLAUDE.md)** - 전체 프로젝트 컨텍스트 (Phase 0-35 상세)
- **[PRD.md](./PRD.md)** - 제품 요구사항 문서
- **[ROADMAP.md](../ROADMAP.md)** - 통합 개발 로드맵 (Part 1: Templar Archives 참조)
- **[WORK_LOG.md](./WORK_LOG.md)** - 일별 작업 로그

### 개발 가이드

- **[PAGES_STRUCTURE.md](./PAGES_STRUCTURE.md)** - 페이지 구조 (43개 상세)
- **[DIRECTORY_STRUCTURE.md](./DIRECTORY_STRUCTURE.md)** - 디렉토리 구조
- **[docs/REACT_QUERY_GUIDE.md](./docs/REACT_QUERY_GUIDE.md)** - React Query 패턴
- **[docs/HAND_IMPORT_API.md](./docs/HAND_IMPORT_API.md)** - 핸드 Import API 상세
- **[docs/AI_ANALYSIS_PROCESS_FLOW.md](./docs/AI_ANALYSIS_PROCESS_FLOW.md)** - HAE 분석 프로세스

---

## 🤝 기여 가이드

### PR 프로세스

```bash
# 1. 브랜치 생성
git checkout -b feature/your-feature

# 2. 개발
npm run dev

# 3. 테스트
npm run test
npm run test:e2e

# 4. 커밋 (Conventional Commits)
git commit -m "feat(archive): add hand filtering by position"

# 5. 푸시 및 PR
git push origin feature/your-feature
```

### 커밋 메시지 규칙

```
feat(scope): 새 기능 추가
fix(scope): 버그 수정
docs(scope): 문서 수정
refactor(scope): 코드 리팩토링
test(scope): 테스트 추가/수정

예시:
feat(search): add AI natural language search
fix(archive): resolve tournament deletion bug
docs(readme): update quick start guide
```

### 코드 스타일

- **ESLint**: `npm run lint`
- **Prettier**: 자동 포맷팅
- **TypeScript**: Strict Mode (`any` 금지)
- **Naming**:
  - 컴포넌트: `PascalCase` (예: `TournamentCard`)
  - 함수: `camelCase` (예: `fetchHands`)
  - 파일: `kebab-case` (예: `tournament-card.tsx`)

---

## 📊 성능 & 보안

### 성능 메트릭

| 메트릭 | 값 |
|--------|-----|
| **First Load JS** | ~150kB |
| **빌드 시간** | ~2분 |
| **Archive 로딩** | 0.3초 (캐시) |
| **평균 쿼리 시간** | 10-30ms |
| **타입 안전성** | 100% (0개 `any`) |

### 보안 등급: A

**주요 보안 조치**:
- ✅ CSRF 보호 (Double Submit Cookie 패턴)
- ✅ SQL Injection 방지 (Prepared Statements)
- ✅ XSS 방지 (React 자동 이스케이프 + DOMPurify)
- ✅ Rate Limiting (Upstash Redis, User ID 기반)
- ✅ Row Level Security (Supabase RLS)
- ✅ 환경 변수 암호화 (Vercel Secrets)
- ✅ 보안 이벤트 로깅 (`security_events` 테이블)

---

## 📞 문의

**프로젝트**: Templar Archives
**배포 URL**: https://templar-archives.vercel.app
**개발 팀**: GGProduction

---

**마지막 업데이트**: 2025-11-12
**README 버전**: 4.0 (압축 버전 - 1043줄 → 600줄)
**Phase**: 0-35 완료 ✅

**🚀 Ready to code!**
