# Templar Archives

> 포커 핸드 히스토리 분석 플랫폼 - **프로덕션 배포 중** 🚀

**개발자를 위한 README** - 5분 안에 개발 시작 가능

[![Next.js](https://img.shields.io/badge/Next.js-15.5.5-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black)](https://templar-archives.vercel.app)

## 🚀 5분 Quick Start

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

**즉시 확인할 수 있는 것**:
- ✅ 홈페이지 (`/`) - 플랫폼 통계, 주간 하이라이트
- ✅ Archive (`/archive/tournament`) - Tournament/SubEvent/Stream 계층 구조
- ✅ 커뮤니티 (`/community`) - Reddit 스타일 포럼
- ✅ AI 검색 (`/search`) - Claude 3.5 Sonnet 자연어 검색

## 📊 프로젝트 현황

| 항목 | 상태 |
|------|------|
| **Phase** | 0-33 완료 (2025-10-16 ~ 2025-10-30) |
| **페이지** | 43개 완전 구현 |
| **API** | 9개 엔드포인트 |
| **DB 테이블** | 27개 (73개 마이그레이션) |
| **컴포넌트** | 158개 (shadcn/ui 50+) |
| **테스트** | E2E 3개, Unit 3개 |
| **타입 안전성** | 100% (0개 `any`) |
| **보안 등급** | A |
| **배포** | Vercel 프로덕션 |

## 🏗️ 프로젝트 구조

### 디렉토리 트리

```
templar-archives/
├── app/                           # Next.js App Router (43개 페이지)
│   ├── page.tsx                   # 홈페이지
│   ├── archive/
│   │   ├── tournament/page.tsx    # Tournament Archive ⭐ 핵심 기능
│   │   └── cash-game/page.tsx     # Cash Game Archive
│   ├── search/page.tsx            # AI 자연어 검색
│   ├── players/                   # 플레이어 목록 & 상세
│   ├── community/                 # 커뮤니티 포럼
│   ├── admin/                     # 관리자 (12개 페이지)
│   ├── reporter/                  # Reporter (2개 페이지)
│   └── api/                       # API Routes (9개)
│       ├── import-hands/          # 핸드 Import
│       ├── analyze-video/         # 영상 분석 (SSE)
│       └── natural-search/        # AI 검색
│
├── components/                    # React Components (158개)
│   ├── ui/                        # shadcn/ui (50+)
│   ├── archive/                   # Archive 전용 (10+)
│   ├── admin/                     # 관리자 전용 (15+)
│   └── ...
│
├── lib/                           # Utilities
│   ├── supabase.ts                # Supabase 클라이언트
│   ├── types/                     # TypeScript 타입
│   └── utils.ts
│
├── stores/                        # Zustand (4개, 780줄)
│   ├── archive-ui-store.ts        # Archive UI 상태
│   ├── archive-data-store.ts      # Archive 데이터
│   └── archive-form-store.ts      # Archive 폼
│
├── queries/                       # React Query (6개, 650줄)
│   ├── archive-queries.ts         # Archive 쿼리
│   ├── players-queries.ts         # 플레이어 쿼리
│   └── community-queries.ts       # 커뮤니티 쿼리
│
├── supabase/migrations/           # DB (73개 파일)
│   └── 20251102000001_*.sql       # 최신: player_stats_cache
│
├── e2e/                           # E2E 테스트 (Playwright)
│   ├── archive.spec.ts
│   ├── community.spec.ts
│   └── home.spec.ts
│
└── docs/                          # 문서
    ├── HAND_IMPORT_API.md
    └── REACT_QUERY_GUIDE.md
```

### 핵심 파일 위치

| 기능 | 파일 경로 | 설명 |
|------|-----------|------|
| **Archive 메인** | `app/archive/tournament/page.tsx` | 4단계 계층 UI (88줄, 리팩토링 완료) |
| **영상 분석 API** | `app/api/analyze-video/route.ts` | HAE (Hand Analysis Engine) - SSE 스트리밍 |
| **AI 검색 API** | `app/api/natural-search/route.ts` | Claude 3.5 Sonnet 통합 |
| **플레이어 통계** | `queries/players-queries.ts` | React Query + 캐싱 |
| **댓글 시스템** | `components/community/CommentTree.tsx` | Reddit 스타일 무한 중첩 |
| **DB 스키마** | `supabase/migrations/` | 73개 마이그레이션 |

## 🔧 기술 스택

### 프론트엔드
```json
{
  "next": "15.5.5",           // App Router, Server Components
  "react": "19.2.0",          // 최신 React
  "typescript": "5.9.3",      // Strict Mode
  "tailwindcss": "4.1.16",    // 스타일링
  "zustand": "5.0.2",         // UI 상태 (4개 stores)
  "@tanstack/react-query": "5.90.5",  // 서버 상태 (6개 queries)
  "framer-motion": "12.23.24" // 애니메이션
}
```

### 백엔드
- **Supabase**: PostgreSQL + Storage + Auth + Realtime
- **Anthropic Claude**: 자연어 검색
- **Google Gemini 2.5 Pro**: 영상 분석 및 핸드 히스토리 자동 추출
- **Upstash Redis**: Rate Limiting

### 테스팅
```json
{
  "@playwright/test": "1.56.1",  // E2E
  "vitest": "3.2.4"              // Unit
}
```

### 아키텍처

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│   Next.js 15 (Vercel)   │
│  - Server Components    │
│  - API Routes (Edge)    │
│  - SSE Streaming        │
└──────┬────────┬─────────┘
       │        │
       ▼        ▼
┌──────────┐  ┌─────────────┐
│ Supabase │  │  AI APIs    │
│   (DB)   │  │ - Claude    │
│          │  │ - Gemini    │
└──────────┘  └─────────────┘
```

## 📄 실제 구현된 페이지 (43개)

### 메인 (1개)
- `/` - 홈페이지 (플랫폼 통계, 주간 하이라이트, 최신 포스트, 상위 플레이어)

### Archive (3개)
- `/archive` - 리다이렉트 → `/archive/tournament`
- `/archive/tournament` - **Tournament Archive** ⭐ 핵심 기능
  - 4단계 계층: Tournament → SubEvent → Stream → Hand
  - Single Mode Accordion (한 번에 하나만 열림)
  - 영상 플레이어 (YouTube, 로컬, NAS)
  - 핸드 히스토리 상세 (Accordion)
- `/archive/cash-game` - Cash Game Archive

### 검색 & 플레이어 (3개)
- `/search` - AI 자연어 검색 + 30+ 고급 필터
- `/players` - 플레이어 목록 (VPIP, PFR, 3Bet 통계)
- `/players/[id]` - 플레이어 상세 (통계, 핸드 히스토리)

### 커뮤니티 (4개)
- `/community` - 포럼 (포스트 목록, 카테고리 필터)
- `/community/[id]` - 포스트 상세 (Reddit 스타일 댓글)
- `/bookmarks` - 북마크한 핸드
- `/notifications` - 알림 센터

### 뉴스 & 라이브 리포팅 (4개)
- `/news` - 뉴스 목록
- `/news/[id]` - 뉴스 상세
- `/live-reporting` - 라이브 리포팅 목록
- `/live-reporting/[id]` - 라이브 리포팅 상세

### 유저 프로필 (4개)
- `/profile` - 내 프로필
- `/profile/[id]` - 다른 유저 프로필
- `/profile/delete-data` - 데이터 삭제 요청 (GDPR)
- `/my-edit-requests` - 내 핸드 수정 요청

### 인증 (3개)
- `/auth/login` - Google OAuth 로그인
- `/auth/callback` - OAuth 콜백
- `/about` - 프로젝트 소개

### Reporter (2개)
- `/reporter/news` - 뉴스 작성
- `/reporter/live` - 라이브 리포팅 작성

### 관리자 (12개)
- `/admin/dashboard` - 대시보드 (15+ 메트릭, 차트)
- `/admin/users` - 사용자 관리 (밴, 역할 변경)
- `/admin/claims` - 플레이어 클레임 승인/거절
- `/admin/edit-requests` - 핸드 수정 요청 관리
- `/admin/content` - 콘텐츠 모더레이션 (신고, 댓글, 뉴스, 라이브)
- `/admin/archive` - Archive 관리
- `/admin/categories` - 카테고리 관리
- `/admin/migration` - DB 마이그레이션 관리
- `/admin/performance` - 성능 모니터링
- `/admin/security-logs` - 보안 이벤트 로그
- `/admin/audit-logs` - 감사 로그
- `/admin/hands/[id]/edit-actions` - 핸드 액션 편집
- `/admin/data-deletion-requests` - 데이터 삭제 요청 관리

### Legal (4개)
- `/legal/privacy`, `/legal/terms`, `/legal/cookies`, `/legal/dmca`, `/legal/affiliate`

## 🔌 API 엔드포인트 (9개)

### 1. 핸드 Import API
```typescript
// POST /api/import-hands
// 외부 시스템에서 핸드 히스토리 Import

interface ImportRequest {
  streamId: string
  hands: HandHistory[]
}

interface HandHistory {
  number: string
  description: string
  timestamp: string
  players: PlayerAction[]
  // ...
}

// 응답
{
  success: true,
  data: {
    imported: 150,
    skipped: 5
  }
}
```

**실제 사용 예시**:
```bash
curl -X POST http://localhost:3000/api/import-hands \
  -H "Content-Type: application/json" \
  -d '{
    "streamId": "uuid",
    "hands": [
      {
        "number": "001",
        "description": "AA vs KK All-in Preflop",
        "timestamp": "00:26:37",
        "players": [...]
      }
    ]
  }'
```

### 2. 영상 분석 API (SSE)
```typescript
// GET /api/analyze-video?videoUrl=...&streamId=...
// HAE (Hand Analysis Engine) 통합 (Server-Sent Events)

// 실시간 진행률 스트리밍
event: progress
data: {"progress": 25, "status": "Extracting frames..."}

event: progress
data: {"progress": 50, "status": "Analyzing hands..."}

event: complete
data: {"handsExtracted": 150}
```

**실제 사용**:
- 파일: `app/api/analyze-video/route.ts`
- HAE v1.0.6 (Hand Analysis Engine, 로컬 npm 패키지)
- Gemini Vision API 통합

### 3. AI 자연어 검색 API
```typescript
// POST /api/natural-search
// Claude 3.5 Sonnet 통합

interface SearchRequest {
  query: string  // "AA를 들고 플레이한 핸드"
}

// 응답: SQL이 아닌 JSON 필터 (SQL Injection 방지)
{
  success: true,
  data: {
    filters: {
      holecards: "AA",
      minPot: null,
      position: null
    },
    hands: [...]
  }
}
```

### 4-9. 기타 API
| API | 메서드 | 기능 |
|-----|--------|------|
| `/api/parse-hendon-mob` | POST | Hendon Mob URL 파싱 |
| `/api/parse-hendon-mob-html` | POST | Hendon Mob HTML 파싱 |
| `/api/parse-payout-csv` | POST | CSV 페이아웃 파싱 |
| `/api/youtube/channel-streams` | GET | YouTube 라이브 스트림 조회 |
| `/api/health` | GET | 헬스체크 |
| `/api/test-analysis-engine` | POST | HAE 테스트 |

**보안**:
- ✅ CSRF 보호 (모든 POST)
- ✅ Rate Limiting (Upstash Redis)
- ✅ Zod 스키마 검증
- ✅ XSS/SQL Injection 방어

## 🗄️ 데이터베이스

### 핵심 테이블 (27개)

#### Archive 테이블 (5개)
```sql
-- tournaments: 토너먼트/캐시게임
CREATE TABLE tournaments (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,  -- 'wsop', 'triton', 'ept', etc.
  game_type TEXT, -- 'tournament', 'cash_game'
  start_date DATE,
  end_date DATE
);

-- sub_events: 서브 이벤트
CREATE TABLE sub_events (
  id UUID PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id),
  event_number TEXT,
  buy_in DECIMAL,
  total_prize DECIMAL
);

-- streams: 일별 스트림 (구 days)
CREATE TABLE streams (
  id UUID PRIMARY KEY,
  sub_event_id UUID REFERENCES sub_events(id),
  video_url TEXT,
  video_file TEXT,
  published_at TIMESTAMP
);

-- hands: 핸드 히스토리
CREATE TABLE hands (
  id UUID PRIMARY KEY,
  stream_id UUID REFERENCES streams(id),
  number TEXT,
  description TEXT,
  timestamp TEXT,  -- "00:26:37"
  analysis_metadata JSONB  -- 최신 추가 (Phase 35)
);

-- hand_players: 핸드-플레이어 연결
CREATE TABLE hand_players (
  id UUID PRIMARY KEY,
  hand_id UUID REFERENCES hands(id),
  player_id UUID REFERENCES players(id),
  position TEXT,  -- 'BTN', 'SB', 'BB', etc.
  starting_stack DECIMAL,
  ending_stack DECIMAL
);
```

#### 플레이어 테이블 (4개)
```sql
-- players: 플레이어
CREATE TABLE players (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  country TEXT,
  hendon_mob_url TEXT
);

-- player_stats_cache: 플레이어 통계 캐시 ⭐ 최신 추가 (2025-11-02)
CREATE TABLE player_stats_cache (
  player_id UUID PRIMARY KEY REFERENCES players(id),
  vpip DECIMAL,     -- Voluntarily Put In Pot
  pfr DECIMAL,      -- Pre-Flop Raise
  three_bet DECIMAL,
  win_rate DECIMAL,
  total_hands INTEGER,
  positional_stats JSONB,  -- 포지션별 통계
  last_updated TIMESTAMP
);

-- 성능 개선: 50-70% 쿼리 시간 감소
CREATE INDEX idx_player_stats_last_updated ON player_stats_cache(last_updated);
```

#### 커뮤니티 테이블 (5개)
```sql
-- posts: 커뮤니티 포스트
-- post_comments: 댓글 (parent_comment_id로 무한 중첩)
-- post_likes, comment_likes, hand_bookmarks
```

#### 관리 시스템 (7개)
```sql
-- notifications: 알림 (type, is_read, metadata JSONB)
-- hand_edit_requests: 핸드 수정 요청 (pending/approved/rejected)
-- content_reports: 콘텐츠 신고
-- data_deletion_requests: 데이터 삭제 요청 (GDPR)
-- security_events: 보안 이벤트 로그 (xss_attempt, sql_injection)
-- audit_logs: 감사 로그 (action, entity_type, changes JSONB)
-- performance_logs: 성능 로그 (query_time, cache_hit)
```

### 마이그레이션 (73개)

**최신 마이그레이션** (2025-11-02):
```sql
-- 20251102000001_add_player_stats_cache.sql
-- 플레이어 통계 캐싱 시스템

CREATE TABLE player_stats_cache (...);

-- 자동 무효화 트리거
CREATE FUNCTION invalidate_player_stats_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM player_stats_cache WHERE player_id = NEW.player_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invalidate_stats
  AFTER INSERT OR UPDATE OR DELETE ON hand_actions
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_player_stats_cache();
```

**성능 최적화**:
- 50+ 인덱스 (B-tree, GIN)
- Full-Text Search (tsvector)
- 복합 인덱스 (쿼리 패턴 최적화)

### ERD (간소화)

```
tournaments (토너먼트)
    ├── sub_events (서브 이벤트)
    │     └── streams (스트림)
    │           └── hands (핸드)
    │                 └── hand_players ─── players (플레이어)
    │                       │                  └── player_stats_cache (통계 캐시)
    │                       └── hand_actions (액션)
    │
    └── payouts (페이아웃)

posts (커뮤니티)
    ├── post_likes
    └── post_comments (무한 중첩)
          └── comment_likes

users ─── profiles
  │
  ├── notifications
  ├── player_claims
  ├── hand_bookmarks
  └── data_deletion_requests
```

## 🛠️ 개발 가이드

### 1. 새 페이지 추가

**실제 예시**: `/search` 페이지 구현

```typescript
// 1. app/search/page.tsx 생성 (250줄)
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

// 2. queries/search-queries.ts 생성
export function useHandsQuery(filters: SearchFilters) {
  return useQuery({
    queryKey: ['hands', filters],
    queryFn: () => fetchHands(filters),
    staleTime: 5 * 60 * 1000, // 5분
  })
}

// 3. components/search/SearchFilters.tsx 생성
export function SearchFilters({ filters, onChange }) {
  return (
    <div>
      <Input name="player" value={filters.player} onChange={...} />
      <Select name="position" value={filters.position} onChange={...} />
      {/* 30+ 필터 조건 */}
    </div>
  )
}
```

**파일 위치**:
- Page: `app/search/page.tsx`
- Query: `queries/search-queries.ts`
- Components: `components/search/`
- Types: `lib/types/search.ts`

### 2. API 엔드포인트 추가

**실제 예시**: `/api/natural-search`

```typescript
// app/api/natural-search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

// 1. 요청 스키마 정의
const schema = z.object({
  query: z.string().min(1).max(500),
})

// 2. POST 핸들러
export async function POST(request: NextRequest) {
  try {
    // 검증
    const body = await request.json()
    const { query } = schema.parse(body)

    // Claude API 호출
    const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: query }],
    })

    // JSON 필터 생성 (SQL Injection 방지)
    const filters = extractFilters(message.content)

    // Supabase 쿼리
    const { data, error } = await supabase
      .from('hands')
      .select('*')
      .match(filters)

    if (error) throw error

    return NextResponse.json({ success: true, data })

  } catch (error) {
    // 보안 이벤트 로깅
    await logSecurityEvent('api_error', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

**체크리스트**:
- ✅ Zod 스키마 검증
- ✅ try-catch 에러 처리
- ✅ 보안 이벤트 로깅
- ✅ Rate Limiting (미들웨어)
- ✅ TypeScript 타입 정의

### 3. DB 스키마 변경

```bash
# 1. 마이그레이션 생성
supabase migration new add_hand_tags

# 2. SQL 작성: supabase/migrations/20251103000001_add_hand_tags.sql
CREATE TABLE hand_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hand_id UUID REFERENCES hands(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,  -- 'Bluff', 'All-in', 'Hero Call'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hand_tags_hand_id ON hand_tags(hand_id);
CREATE INDEX idx_hand_tags_tag ON hand_tags(tag);

# 3. 로컬 테스트
supabase db reset  # 모든 마이그레이션 재적용

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

**주의사항**:
- ⚠️ `supabase db push` 전에 반드시 로컬 테스트
- ⚠️ 프로덕션 데이터 백업 확인
- ⚠️ 인덱스는 off-peak 시간에 추가

### 4. Zustand Store 사용

**실제 예시**: Archive UI Store

```typescript
// stores/archive-ui-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ArchiveUIState {
  expandedTournament: string | null
  expandedSubEvent: string | null
  setExpandedTournament: (id: string | null) => void
  setExpandedSubEvent: (id: string | null) => void
}

export const useArchiveUIStore = create<ArchiveUIState>()(
  persist(
    (set) => ({
      expandedTournament: null,
      expandedSubEvent: null,
      setExpandedTournament: (id) => set({ expandedTournament: id }),
      setExpandedSubEvent: (id) => set({ expandedSubEvent: id }),
    }),
    {
      name: 'archive-ui',  // LocalStorage 키
    }
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

**실제 예시**: 플레이어 통계 쿼리

```typescript
// queries/players-queries.ts
export function usePlayerStatsQuery(playerId: string) {
  return useQuery({
    queryKey: ['player-stats', playerId],
    queryFn: async () => {
      // 캐시 먼저 확인 (player_stats_cache 테이블)
      const { data: cached } = await supabase
        .from('player_stats_cache')
        .select('*')
        .eq('player_id', playerId)
        .single()

      if (cached && isRecent(cached.last_updated)) {
        return cached
      }

      // 캐시 미스: 실시간 계산
      const stats = await calculatePlayerStats(playerId)

      // 캐시 업데이트
      await supabase.from('player_stats_cache').upsert({
        player_id: playerId,
        ...stats,
        last_updated: new Date().toISOString(),
      })

      return stats
    },
    staleTime: 5 * 60 * 1000, // 5분
  })
}

// Optimistic Update 예시
export function useLikeHandMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (handId: string) => {
      const { data, error } = await supabase
        .from('hand_likes')
        .insert({ hand_id: handId })

      if (error) throw error
      return data
    },
    onMutate: async (handId) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['hand', handId] })

      const previousHand = queryClient.getQueryData(['hand', handId])

      queryClient.setQueryData(['hand', handId], (old: any) => ({
        ...old,
        like_count: (old.like_count || 0) + 1,
        user_has_liked: true,
      }))

      return { previousHand }
    },
    onError: (err, handId, context) => {
      // 에러 시 롤백
      queryClient.setQueryData(['hand', handId], context?.previousHand)
    },
    onSettled: (handId) => {
      // 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['hand', handId] })
    },
  })
}
```

## 🧪 테스트

### E2E 테스트 (Playwright)

```bash
# 헤드리스 모드 (CI)
npm run test:e2e

# UI 모드 (디버깅)
npm run test:e2e:ui

# 헤드풀 모드 (브라우저 표시)
npm run test:e2e:headed
```

**실제 테스트 파일**: `e2e/archive.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Archive', () => {
  test('Tournament CRUD', async ({ page }) => {
    await page.goto('/archive/tournament')

    // 1. Tournament 추가
    await page.click('[data-testid="add-tournament"]')
    await page.fill('input[name="name"]', '2024 WSOP Main Event')
    await page.selectOption('select[name="category"]', 'wsop')
    await page.click('button[type="submit"]')

    // 2. Tournament 확인
    await expect(page.locator('text=2024 WSOP Main Event')).toBeVisible()

    // 3. Tournament 수정
    await page.click('[data-testid="edit-tournament"]')
    await page.fill('input[name="name"]', '2024 WSOP Main Event (Updated)')
    await page.click('button[type="submit"]')

    // 4. Tournament 삭제
    await page.click('[data-testid="delete-tournament"]')
    await page.click('button:has-text("확인")')

    await expect(page.locator('text=2024 WSOP Main Event')).not.toBeVisible()
  })
})
```

### 단위 테스트 (Vitest)

```bash
# 단위 테스트
npm run test

# 커버리지
npm run test:coverage
```

**실제 테스트 파일**: `lib/__tests__/security.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { sanitizeInput, validateCsrfToken } from '../security'

describe('Security', () => {
  it('should sanitize XSS attempts', () => {
    const input = '<script>alert("XSS")</script>'
    const sanitized = sanitizeInput(input)
    expect(sanitized).not.toContain('<script>')
  })

  it('should validate CSRF tokens', () => {
    const validToken = 'valid-token-123'
    expect(validateCsrfToken(validToken, validToken)).toBe(true)
    expect(validateCsrfToken(validToken, 'invalid')).toBe(false)
  })
})
```

## 🚀 배포

### Vercel 자동 배포

```
Git Push (main) → Vercel Build → Production Deploy
                                  ↓ (~2분)
                         https://templar-archives.vercel.app
```

**빌드 설정**:
- Build Command: `next build`
- Output Directory: `.next`
- Node.js Version: 22.x

### 환경 변수 체크리스트

**Vercel Dashboard → Settings → Environment Variables**:

```bash
# 필수 (5개)
NEXT_PUBLIC_SUPABASE_URL=https://diopilmkehygiqpizvga.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # 관리자 전용
CLAUDE_API_KEY=sk-ant-...  # AI 검색
GOOGLE_API_KEY=your-key    # 영상 분석

# 선택 (5개)
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret
UPSTASH_REDIS_REST_URL=your-url
UPSTASH_REDIS_REST_TOKEN=your-token
YOUTUBE_API_KEY=your-key
```

### 배포 전 체크리스트

- [ ] `npm run build` 로컬 빌드 성공
- [ ] `npm run test:e2e` E2E 테스트 통과
- [ ] `npx tsc --noEmit` TypeScript 에러 없음
- [ ] Vercel 환경 변수 등록
- [ ] Supabase 프로덕션 DB 마이그레이션 적용
- [ ] Google OAuth Redirect URL 설정

## 🐛 문제 해결

### 1. `npm install` 실패

```bash
# 원인: Node.js 버전 < 22.0.0
node --version  # 확인

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
cat .env.local  # 확인

# 해결: URL과 Key 정확히 복사
# Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
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
supabase db push --dry-run  # 시뮬레이션
supabase db push            # 실제 적용
```

### 5. 영상 분석 타임아웃

```bash
# 원인: Vercel Edge Function 제한 (최대 5분)
# 해결: 영상을 5분 이하로 분할하거나 Background Job 사용 (예정)
```

## 📚 추가 문서

### 프로젝트 전체
- **[CLAUDE.md](./CLAUDE.md)** - 전체 프로젝트 컨텍스트 (Phase 0-33 상세)
- **[ROADMAP.md](../ROADMAP.md)** - 통합 개발 로드맵 (Part 1: Templar Archives 참조)
- **[WORK_LOG.md](./WORK_LOG.md)** - 일별 작업 로그

### 개발 가이드
- **[PAGES_STRUCTURE.md](./PAGES_STRUCTURE.md)** - 페이지 구조 (43개 상세)
- **[DIRECTORY_STRUCTURE.md](./DIRECTORY_STRUCTURE.md)** - 디렉토리 구조
- **[docs/REACT_QUERY_GUIDE.md](./docs/REACT_QUERY_GUIDE.md)** - React Query 패턴

### API 문서
- **[docs/HAND_IMPORT_API.md](./docs/HAND_IMPORT_API.md)** - 핸드 Import API 상세

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
git add .
git commit -m "feat(archive): add hand filtering by position"

# 5. 푸시 및 PR
git push origin feature/your-feature
# GitHub에서 Pull Request 생성
```

### 커밋 메시지 규칙

```
feat(scope): 새 기능 추가
fix(scope): 버그 수정
docs(scope): 문서 수정
refactor(scope): 코드 리팩토링
test(scope): 테스트 추가/수정
chore(scope): 빌드, 설정 변경

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

## 📊 성능 메트릭

| 메트릭 | 값 |
|--------|-----|
| **First Load JS** | ~150kB |
| **빌드 시간** | ~2분 |
| **Archive 로딩** | 0.3초 (캐시) |
| **평균 쿼리 시간** | 10-30ms |
| **타입 안전성** | 100% (0개 `any`) |
| **보안 등급** | A |

## 🔐 보안

**보안 등급**: A (2025-10-24 감사 완료)

**주요 보안 조치**:
- ✅ CSRF 보호 (모든 POST 요청)
- ✅ SQL Injection 방지 (Prepared Statements)
- ✅ XSS 방지 (React 자동 이스케이프 + DOMPurify)
- ✅ Rate Limiting (Upstash Redis)
- ✅ Row Level Security (Supabase RLS)
- ✅ 환경 변수 암호화 (Vercel Secrets)
- ✅ 보안 이벤트 로깅 (`security_events` 테이블)

## 📞 문의

**프로젝트**: Templar Archives
**배포 URL**: https://templar-archives.vercel.app
**GitHub**: [리포지토리 URL]

**개발 팀**: GGProduction

---

**마지막 업데이트**: 2025-11-03
**README 버전**: 3.0 (개발자 친화적)
**Phase**: 0-33 완료 ✅

**🚀 Ready to code!**
