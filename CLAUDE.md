# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Templar Archives Index는 포커 핸드 데이터의 자동 추출, 보관, 분석을 통합하는 차세대 포커 생태계입니다.

**미션**: "모든 포커 영상을 핸드 히스토리로 변환하고, 분석하고, 학습 가능하게 만든다"

- **프로덕션**: https://templar-archives.vercel.app
- **개발 서버**: http://localhost:3000
- **현재 Phase**: 40 완료 (2025-11-16)
- **KAN Backend**: https://kan-backend-700566907563.us-central1.run.app

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

# 번들 분석
npm run analyze           # Bundle size 분석
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

# DB 관리 및 디버깅 (Node.js 스크립트)
node scripts/check-analysis-status.mjs  # 분석 작업 상태 및 사용자 권한 확인
node scripts/update-user-role.mjs       # 사용자 권한 업데이트
node scripts/cleanup-stuck-job.mjs      # STUCK 상태 작업 정리
node scripts/check-db.mjs               # DB 상태 확인
node scripts/create-unsorted-stream.mjs # "Unsorted Hands" 스트림 생성
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
- `kan-analysis.ts` (1200줄): KAN 영상 분석

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

**Gemini 2.0 Flash** (영상 분석, KAN)
- 위치: `lib/ai/gemini.ts`
- KAN Prompt: `lib/ai/prompts.ts` (EPT_PROMPT 기본값)
- TimeSegment 시스템 (초 단위)

```typescript
// 예시: startKanAnalysis() 서버 액션
const result = await startKanAnalysis({
  videoUrl,
  segments,
  streamId,
  platform: 'ept',  // 기본값: EPT
})
```

**Claude 3.5 Sonnet** (자연어 검색)
- 위치: `app/api/natural-search/route.ts`
- JSON 필터 방식 (SQL Injection 방지)

---

## 포커 도메인 지식 (전문가 수준)

Templar Archives는 포커 핸드 데이터의 자동 추출, 분석, 아카이브를 다루는 플랫폼입니다. 정확한 데이터 처리를 위해서는 전문적인 포커 지식이 필수적입니다.

### 1. 포커 용어 사전 (Poker Terminology)

#### 게임 구조 (Game Structure)

| 용어 | 영문 | 설명 | 예시 |
|------|------|------|------|
| **스몰 블라인드** | Small Blind (SB) | 딜러 왼쪽 첫 번째 플레이어가 강제로 베팅하는 금액 (빅 블라인드의 절반) | 50,000 chips |
| **빅 블라인드** | Big Blind (BB) | 딜러 왼쪽 두 번째 플레이어가 강제로 베팅하는 금액 | 100,000 chips |
| **앤티** | Ante | 모든 플레이어가 핸드 시작 전 의무적으로 내는 금액 (토너먼트에서 주로 사용) | 100,000 chips |
| **스택** | Stack | 플레이어가 보유한 칩의 총량 | 9,600,000 chips |
| **팟** | Pot | 현재 핸드에서 베팅된 칩의 총합 | 2,500,000 chips |
| **레이크** | Rake | 하우스(카지노)가 가져가는 수수료 (캐시 게임) | 5% (최대 $15) |

#### 포지션 (Positions)

포지션은 **시계 방향**으로 배치되며, 딜러 버튼(BTN)이 기준점입니다.

| 포지션 | 약어 | 순서 | 설명 | 전략적 의미 |
|--------|------|------|------|-------------|
| **딜러 버튼** | BTN | 마지막 | 가장 유리한 포지션, 액션을 마지막에 할 수 있음 | 가장 넓은 핸드 레인지 플레이 가능 |
| **스몰 블라인드** | SB | 첫 번째 (플랍 이후) | 포스트플랍에서 첫 번째 액션, 불리한 포지션 | 타이트한 플레이 권장 |
| **빅 블라인드** | BB | 두 번째 (플랍 이후) | 프리플랍에서 마지막 액션, 포스트플랍에서 두 번째 | 디펜드 레인지 넓음 |
| **언더 더 건** | UTG | 프리플랍 첫 번째 | 가장 불리한 포지션, 9-10인 테이블 기준 | 가장 타이트한 오픈 레인지 (8-10%) |
| **언더 더 건 +1** | UTG+1 | UTG 다음 | UTG보다 약간 유리 | 11-13% 오픈 레인지 |
| **미들 포지션** | MP | 중간 | 중립적 포지션 | 14-18% 오픈 레인지 |
| **미들 포지션 +1** | MP+1 | MP 다음 | MP보다 유리 | 18-22% 오픈 레인지 |
| **컷오프** | CO | BTN 바로 앞 | 두 번째로 유리한 포지션 | 25-30% 오픈 레인지 |

**6-handed (6인 테이블) 포지션**: UTG, MP, CO, BTN, SB, BB

**중요**:
- 포지션은 핸드 레인지를 결정하는 가장 중요한 요소입니다.
- Late Position (CO, BTN)은 더 많은 정보를 얻을 수 있어 유리합니다.
- Early Position (UTG, UTG+1)은 강한 핸드만 플레이해야 합니다.

#### 스트리트 (Streets)

| 스트리트 | 설명 | 액션 순서 | 예시 보드 |
|----------|------|-----------|-----------|
| **프리플랍** | Preflop | 홀카드를 받은 직후, 커뮤니티 카드 공개 전 | - |
| **플랍** | Flop | 첫 3장의 커뮤니티 카드 공개 | 9♦ 6♠ 3♣ |
| **턴** | Turn | 4번째 커뮤니티 카드 공개 | 9♦ 6♠ 3♣ **A♠** |
| **리버** | River | 5번째(마지막) 커뮤니티 카드 공개 | 9♦ 6♠ 3♣ A♠ **2♥** |

#### 액션 (Actions)

| 액션 | 영문 | 설명 | 예시 | 전략적 의미 |
|------|------|------|------|-------------|
| **폴드** | Fold | 카드를 버리고 핸드에서 포기 | - | 핸드 종료 |
| **체크** | Check | 베팅 없이 다음 플레이어에게 차례 넘김 (베팅이 없을 때만 가능) | - | 약한 핸드 or 트랩 |
| **콜** | Call | 현재 베팅 금액만큼 추가로 베팅 | 이전 레이즈 500K → 콜 500K | 패시브한 플레이 |
| **벳** | Bet | 처음으로 칩을 거는 행위 | 100K 벳 | 공격적 플레이 시작 |
| **레이즈** | Raise | 이전 베팅보다 더 많은 금액 베팅 | 이전 100K → 300K 레이즈 | 강한 핸드 or 블러프 |
| **3벳** | 3-bet | 레이즈에 대한 리레이즈 | UTG 오픈 → CO 3벳 | 프리미엄 핸드 or 포지션 플레이 |
| **4벳** | 4-bet | 3벳에 대한 리레이즈 | UTG 오픈 → CO 3벳 → UTG 4벳 | AA, KK 또는 블러프 |
| **5벳** | 5-bet | 4벳에 대한 리레이즈 | 4벳 시퀀스 → 5벳 | 올인 또는 블러프 캐치 |
| **올인** | All-in | 보유한 모든 칩을 베팅 | 3,500,000 (전체 스택) | 최대 압박 or 커밋 |

**중요 개념**:
- **C-Bet (Continuation Bet)**: 프리플랍 레이저가 플랍에서 다시 베팅하는 행위 (60-70% 빈도)
- **Donk Bet**: Out-of-position 플레이어가 먼저 베팅하는 비표준 플레이
- **Float**: 포지션 이점을 활용해 약한 핸드로 콜하는 플레이

#### 핸드 랭킹 (Hand Rankings)

| 순위 | 핸드 | 영문 | 예시 | 확률 |
|------|------|------|------|------|
| 1 | **로얄 플러시** | Royal Flush | A♠ K♠ Q♠ J♠ 10♠ | 0.00015% |
| 2 | **스트레이트 플러시** | Straight Flush | 9♥ 8♥ 7♥ 6♥ 5♥ | 0.00139% |
| 3 | **포카드** | Four of a Kind (Quads) | A♠ A♥ A♦ A♣ K♠ | 0.024% |
| 4 | **풀하우스** | Full House (Boat) | K♠ K♥ K♦ 9♠ 9♥ | 0.144% |
| 5 | **플러시** | Flush | A♠ J♠ 9♠ 7♠ 3♠ | 0.197% |
| 6 | **스트레이트** | Straight (Wheel: A-2-3-4-5) | 10♣ 9♠ 8♥ 7♦ 6♠ | 0.392% |
| 7 | **트립스/셋** | Three of a Kind (Trips/Set) | Q♠ Q♥ Q♦ 8♠ 4♣ | 2.11% |
| 8 | **투페어** | Two Pair | A♠ A♥ 9♠ 9♦ 5♣ | 4.75% |
| 9 | **원페어** | One Pair | K♠ K♥ 9♠ 6♦ 3♣ | 42.26% |
| 10 | **하이카드** | High Card (Ace-high) | A♠ J♥ 9♠ 7♦ 4♣ | 50.12% |

**특수 용어**:
- **너츠** (Nuts): 현재 보드에서 가능한 최강 핸드
- **탑페어** (Top Pair): 보드 최고 랭크 카드와 매칭된 페어
- **언더페어** (Underpair): 보드보다 낮은 포켓 페어
- **드로우** (Draw): 추가 카드가 필요한 미완성 핸드
  - **플러시 드로우**: 같은 무늬 4장 (9 아웃)
  - **오픈엔드 스트레이트 드로우**: 양쪽에서 완성 가능한 스트레이트 (8 아웃)
  - **컴보 드로우**: 플러시 + 스트레이트 드로우 (최대 15 아웃)

#### 토너먼트 용어 (Tournament Terms)

| 용어 | 영문 | 설명 | 예시 |
|------|------|------|------|
| **버블** | Bubble | 상금권 진입 직전 탈락하는 순위 | 101위 탈락 (100위까지 상금) |
| **인더머니** | In The Money (ITM) | 상금권 진입 | Top 15% |
| **칩리더** | Chip Leader | 가장 많은 칩을 보유한 플레이어 | 25,000,000 chips |
| **파이널 테이블** | Final Table | 토너먼트 마지막 테이블 (보통 9인) | Top 9 players |
| **리엔트리** | Re-entry | 탈락 후 재진입 (비용 추가) | Day 1A, 1B, 1C 각각 재진입 가능 |
| **레이트 레지스트레이션** | Late Registration | 토너먼트 시작 후 늦게 참가 | Level 8까지 가능 |
| **프리즈아웃** | Freezeout | 재진입 불가 토너먼트 | WSOP Main Event |

#### 전략 용어 (Strategy Terms)

| 용어 | 약어 | 설명 | 예시 |
|------|------|------|------|
| **게임 이론 최적** | GTO (Game Theory Optimal) | 수학적으로 최적의 전략, 상대가 익스플로잇 불가능 | Nash Equilibrium |
| **익스플로잇** | Exploitative Play | 상대의 약점을 공략하는 플레이 | 타이트한 상대에게 블러프 증가 |
| **인디펜던트 칩 모델** | ICM (Independent Chip Model) | 토너먼트에서 칩의 가치를 $EV로 환산하는 모델 | 버블에서 폴드 에퀴티 증가 |
| **에퀴티** | Equity | 현재 핸드에서 팟을 가져갈 확률 | AA vs KK 프리플랍 = 82% equity |
| **폴드 에퀴티** | Fold Equity | 상대가 폴드할 확률을 고려한 이익 | 블러프 성공률 40% |
| **임플라이드 오즈** | Implied Odds | 미래 베팅을 고려한 확률 계산 | 작은 페어로 셋 만들기 |
| **팟 오즈** | Pot Odds | 현재 팟 크기 대비 콜 비용의 비율 | 팟 1M, 콜 200K = 5:1 pot odds |
| **레인지** | Range | 플레이어가 가질 수 있는 핸드 조합의 집합 | UTG 오픈 레인지 = 8-10% (AA-TT, AK-AQ) |
| **밸런스** | Balanced Range | 강한 핸드와 블러프가 적절히 섞인 레인지 | 벨류:블러프 = 2:1 |
| **폴라라이즈드** | Polarized Range | 매우 강한 핸드와 블러프만 있는 레인지 | 리버 올인 레인지 |

#### 토너먼트 구조 용어

| 용어 | 설명 | 예시 |
|------|------|------|
| **엔트리 피** | Entry Fee | 토너먼트 참가 비용 | €25,000 + €1,000 (rake) |
| **바이인** | Buy-in | 엔트리 피와 동일 | €26,000 total |
| **애드온** | Add-on | 추가 칩 구매 옵션 (정해진 시점) | 브레이크 타임에 10K chips 추가 |
| **리바이** | Rebuy | 초반 탈락 시 재구매 옵션 | 처음 1시간 동안 무제한 리바이 |
| **스타팅 스택** | Starting Stack | 토너먼트 시작 칩 | 60,000 chips |
| **블라인드 레벨** | Blind Level | 블라인드 증가 단계 | Level 1: 100/200, Level 2: 200/400 |

### 2. 핸드 히스토리 예시 (JSON 형식)

Templar Archives의 핸드 데이터는 다음과 같은 구조로 저장됩니다. 이는 KAN 분석 결과 및 수동 입력의 표준 포맷입니다.

#### 예시 1: EPT Paris 2024, Preflop All-in (AA vs KK)

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
  "ai_summary": "Preflop all-in battle between pocket Aces and pocket Kings. BRZEZINSKI's Aces hold up on a safe board to win a massive 19.5M pot.",
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
    },
    {
      "name": "HENDERSON",
      "poker_position": "SB",
      "hole_cards": ["Kh", "Kc"],
      "starting_stack": 10200000,
      "ending_stack": 0,
      "seat": 4,
      "is_winner": false,
      "hand_description": "Pair of Kings"
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
    },
    {
      "street": "preflop",
      "sequence_order": 2,
      "player_name": "HENDERSON",
      "action_type": "3-bet",
      "amount": 900000,
      "pot_after": 1550000,
      "stack_after": 9300000
    },
    {
      "street": "preflop",
      "sequence_order": 3,
      "player_name": "BRZEZINSKI",
      "action_type": "4-bet",
      "amount": 2100000,
      "pot_after": 3650000,
      "stack_after": 7200000
    },
    {
      "street": "preflop",
      "sequence_order": 4,
      "player_name": "HENDERSON",
      "action_type": "all-in",
      "amount": 10200000,
      "pot_after": 13850000,
      "stack_after": 0
    },
    {
      "street": "preflop",
      "sequence_order": 5,
      "player_name": "BRZEZINSKI",
      "action_type": "call",
      "amount": 9600000,
      "pot_after": 19500000,
      "stack_after": 0
    }
  ],
  "notable_moments": [
    {
      "description": "Preflop all-in with AA vs KK",
      "timestamp": 3280
    }
  ]
}
```

#### 예시 2: WSOP Main Event 2024, Big Bluff on River

```json
{
  "number": "042",
  "small_blind": 200000,
  "big_blind": 400000,
  "ante": 400000,
  "stakes": "200K/400K/400K ante",
  "board_flop": ["Kh", "9d", "4c"],
  "board_turn": "7s",
  "board_river": "2d",
  "final_pot": 8600000,
  "video_timestamp_start": 12450,
  "video_timestamp_end": 12720,
  "ai_summary": "NGUYEN pulls off a massive river bluff with Ace-high, representing a missed flush draw. GARCIA folds top pair after 4 minutes of tanking.",
  "hand_players": [
    {
      "name": "NGUYEN",
      "poker_position": "CO",
      "hole_cards": ["Ad", "Qd"],
      "starting_stack": 15200000,
      "ending_stack": 19600000,
      "seat": 7,
      "is_winner": true,
      "hand_description": "Ace-high"
    },
    {
      "name": "GARCIA",
      "poker_position": "BB",
      "hole_cards": ["Kc", "Js"],
      "starting_stack": 12800000,
      "ending_stack": 8400000,
      "seat": 2,
      "is_winner": false,
      "hand_description": "Pair of Kings"
    }
  ],
  "hand_actions": [
    {
      "street": "preflop",
      "sequence_order": 1,
      "player_name": "NGUYEN",
      "action_type": "raise",
      "amount": 900000,
      "pot_after": 1700000,
      "stack_after": 14300000
    },
    {
      "street": "preflop",
      "sequence_order": 2,
      "player_name": "GARCIA",
      "action_type": "call",
      "amount": 500000,
      "pot_after": 2200000,
      "stack_after": 12300000
    },
    {
      "street": "flop",
      "sequence_order": 3,
      "player_name": "GARCIA",
      "action_type": "check",
      "amount": 0,
      "pot_after": 2200000,
      "stack_after": 12300000
    },
    {
      "street": "flop",
      "sequence_order": 4,
      "player_name": "NGUYEN",
      "action_type": "bet",
      "amount": 1100000,
      "pot_after": 3300000,
      "stack_after": 13200000
    },
    {
      "street": "flop",
      "sequence_order": 5,
      "player_name": "GARCIA",
      "action_type": "call",
      "amount": 1100000,
      "pot_after": 4400000,
      "stack_after": 11200000
    },
    {
      "street": "turn",
      "sequence_order": 6,
      "player_name": "GARCIA",
      "action_type": "check",
      "amount": 0,
      "pot_after": 4400000,
      "stack_after": 11200000
    },
    {
      "street": "turn",
      "sequence_order": 7,
      "player_name": "NGUYEN",
      "action_type": "bet",
      "amount": 2200000,
      "pot_after": 6600000,
      "stack_after": 11000000
    },
    {
      "street": "turn",
      "sequence_order": 8,
      "player_name": "GARCIA",
      "action_type": "call",
      "amount": 2200000,
      "pot_after": 8800000,
      "stack_after": 9000000
    },
    {
      "street": "river",
      "sequence_order": 9,
      "player_name": "GARCIA",
      "action_type": "check",
      "amount": 0,
      "pot_after": 8800000,
      "stack_after": 9000000
    },
    {
      "street": "river",
      "sequence_order": 10,
      "player_name": "NGUYEN",
      "action_type": "bet",
      "amount": 6200000,
      "pot_after": 15000000,
      "stack_after": 4800000,
      "description": "Overbet bluff (70% pot)"
    },
    {
      "street": "river",
      "sequence_order": 11,
      "player_name": "GARCIA",
      "action_type": "fold",
      "amount": 0,
      "pot_after": 8600000,
      "stack_after": 9000000,
      "description": "Folds top pair after 4-minute tank"
    }
  ],
  "notable_moments": [
    {
      "description": "NGUYEN's massive 70% pot overbet bluff on river",
      "timestamp": 12680
    },
    {
      "description": "GARCIA tanks for 4 minutes before folding top pair",
      "timestamp": 12700
    }
  ]
}
```

#### 예시 3: Triton Series 2024, Set over Set Cooler

```json
{
  "number": "087",
  "small_blind": 1000000,
  "big_blind": 2000000,
  "ante": 2000000,
  "stakes": "1M/2M/2M ante",
  "board_flop": ["Qc", "8h", "3d"],
  "board_turn": "Qs",
  "board_river": "9c",
  "final_pot": 156000000,
  "video_timestamp_start": 18920,
  "video_timestamp_end": 19240,
  "ai_summary": "Classic cooler situation. IVEY flops bottom set (33) while TAN flops middle set (88). All chips go in on the turn after the Queen pairs, giving IVEY a full house.",
  "hand_players": [
    {
      "name": "TAN",
      "poker_position": "MP",
      "hole_cards": ["8s", "8c"],
      "starting_stack": 82000000,
      "ending_stack": 0,
      "seat": 4,
      "is_winner": false,
      "hand_description": "Full House, Queens over Eights"
    },
    {
      "name": "IVEY",
      "poker_position": "BTN",
      "hole_cards": ["3h", "3s"],
      "starting_stack": 74000000,
      "ending_stack": 156000000,
      "seat": 1,
      "is_winner": true,
      "hand_description": "Full House, Queens over Threes"
    }
  ],
  "hand_actions": [
    {
      "street": "preflop",
      "sequence_order": 1,
      "player_name": "TAN",
      "action_type": "raise",
      "amount": 4500000,
      "pot_after": 9500000,
      "stack_after": 77500000
    },
    {
      "street": "preflop",
      "sequence_order": 2,
      "player_name": "IVEY",
      "action_type": "call",
      "amount": 4500000,
      "pot_after": 14000000,
      "stack_after": 69500000
    },
    {
      "street": "flop",
      "sequence_order": 3,
      "player_name": "TAN",
      "action_type": "bet",
      "amount": 6000000,
      "pot_after": 20000000,
      "stack_after": 71500000,
      "description": "C-bet with middle set"
    },
    {
      "street": "flop",
      "sequence_order": 4,
      "player_name": "IVEY",
      "action_type": "raise",
      "amount": 18000000,
      "pot_after": 38000000,
      "stack_after": 51500000,
      "description": "Raise with bottom set"
    },
    {
      "street": "flop",
      "sequence_order": 5,
      "player_name": "TAN",
      "action_type": "call",
      "amount": 12000000,
      "pot_after": 50000000,
      "stack_after": 59500000
    },
    {
      "street": "turn",
      "sequence_order": 6,
      "player_name": "TAN",
      "action_type": "check",
      "amount": 0,
      "pot_after": 50000000,
      "stack_after": 59500000
    },
    {
      "street": "turn",
      "sequence_order": 7,
      "player_name": "IVEY",
      "action_type": "bet",
      "amount": 25000000,
      "pot_after": 75000000,
      "stack_after": 26500000,
      "description": "Bet with turned full house"
    },
    {
      "street": "turn",
      "sequence_order": 8,
      "player_name": "TAN",
      "action_type": "all-in",
      "amount": 59500000,
      "pot_after": 134500000,
      "stack_after": 0,
      "description": "Shove with second full house"
    },
    {
      "street": "turn",
      "sequence_order": 9,
      "player_name": "IVEY",
      "action_type": "call",
      "amount": 26500000,
      "pot_after": 156000000,
      "stack_after": 0
    }
  ],
  "notable_moments": [
    {
      "description": "Set over set on flop (88 vs 33)",
      "timestamp": 19020
    },
    {
      "description": "Board pairs on turn, IVEY makes better full house",
      "timestamp": 19100
    },
    {
      "description": "All chips go in on turn",
      "timestamp": 19140
    }
  ]
}
```

#### 예시 4: Cash Game, Hero Fold with Overpair

```json
{
  "number": "156",
  "small_blind": 500,
  "big_blind": 1000,
  "ante": 0,
  "stakes": "$500/$1,000 NL Hold'em",
  "board_flop": ["Jh", "Td", "7s"],
  "board_turn": "4h",
  "board_river": "2c",
  "final_pot": 87500,
  "video_timestamp_start": 25680,
  "video_timestamp_end": 25920,
  "ai_summary": "DWAN makes a hero fold with pocket Queens after ANTONIUS represents a strong hand with delayed turn raise. Later revealed ANTONIUS had AK-high bluff.",
  "hand_players": [
    {
      "name": "DWAN",
      "poker_position": "CO",
      "hole_cards": ["Qh", "Qc"],
      "starting_stack": 285000,
      "ending_stack": 242500,
      "seat": 7,
      "is_winner": false,
      "hand_description": "Pair of Queens"
    },
    {
      "name": "ANTONIUS",
      "poker_position": "BB",
      "hole_cards": ["As", "Kd"],
      "starting_stack": 320000,
      "ending_stack": 362500,
      "seat": 2,
      "is_winner": true,
      "hand_description": "Ace-high"
    }
  ],
  "hand_actions": [
    {
      "street": "preflop",
      "sequence_order": 1,
      "player_name": "DWAN",
      "action_type": "raise",
      "amount": 3500,
      "pot_after": 5000,
      "stack_after": 281500
    },
    {
      "street": "preflop",
      "sequence_order": 2,
      "player_name": "ANTONIUS",
      "action_type": "call",
      "amount": 2500,
      "pot_after": 7500,
      "stack_after": 317500
    },
    {
      "street": "flop",
      "sequence_order": 3,
      "player_name": "ANTONIUS",
      "action_type": "check",
      "amount": 0,
      "pot_after": 7500,
      "stack_after": 317500
    },
    {
      "street": "flop",
      "sequence_order": 4,
      "player_name": "DWAN",
      "action_type": "bet",
      "amount": 5000,
      "pot_after": 12500,
      "stack_after": 276500
    },
    {
      "street": "flop",
      "sequence_order": 5,
      "player_name": "ANTONIUS",
      "action_type": "call",
      "amount": 5000,
      "pot_after": 17500,
      "stack_after": 312500
    },
    {
      "street": "turn",
      "sequence_order": 6,
      "player_name": "ANTONIUS",
      "action_type": "check",
      "amount": 0,
      "pot_after": 17500,
      "stack_after": 312500
    },
    {
      "street": "turn",
      "sequence_order": 7,
      "player_name": "DWAN",
      "action_type": "bet",
      "amount": 12000,
      "pot_after": 29500,
      "stack_after": 264500
    },
    {
      "street": "turn",
      "sequence_order": 8,
      "player_name": "ANTONIUS",
      "action_type": "raise",
      "amount": 35000,
      "pot_after": 64500,
      "stack_after": 277500,
      "description": "Delayed check-raise bluff"
    },
    {
      "street": "turn",
      "sequence_order": 9,
      "player_name": "DWAN",
      "action_type": "call",
      "amount": 23000,
      "pot_after": 87500,
      "stack_after": 241500
    },
    {
      "street": "river",
      "sequence_order": 10,
      "player_name": "ANTONIUS",
      "action_type": "bet",
      "amount": 55000,
      "pot_after": 142500,
      "stack_after": 222500,
      "description": "Triple barrel bluff (63% pot)"
    },
    {
      "street": "river",
      "sequence_order": 11,
      "player_name": "DWAN",
      "action_type": "fold",
      "amount": 0,
      "pot_after": 87500,
      "stack_after": 241500,
      "description": "Hero fold with overpair"
    }
  ],
  "notable_moments": [
    {
      "description": "ANTONIUS delayed check-raise bluff on turn with AK-high",
      "timestamp": 25780
    },
    {
      "description": "DWAN folds pocket Queens after 2-minute tank",
      "timestamp": 25900
    }
  ]
}
```

#### 예시 5: Short Deck (6+ Hold'em), Flush over Flush

```json
{
  "number": "203",
  "small_blind": 3000,
  "big_blind": 6000,
  "ante": 6000,
  "stakes": "3K/6K/6K ante (Short Deck)",
  "board_flop": ["Ah", "Kh", "9h"],
  "board_turn": "6h",
  "board_river": "Ts",
  "final_pot": 1248000,
  "video_timestamp_start": 32100,
  "video_timestamp_end": 32380,
  "ai_summary": "Short Deck poker hand where LIM flops nut flush with Qh-Jh while CHOW has lower flush with 8h-7h. All chips go in on the turn after the 4th heart appears.",
  "hand_players": [
    {
      "name": "LIM",
      "poker_position": "BTN",
      "hole_cards": ["Qh", "Jh"],
      "starting_stack": 580000,
      "ending_stack": 1248000,
      "seat": 1,
      "is_winner": true,
      "hand_description": "Flush, Ace-high with Queen kicker"
    },
    {
      "name": "CHOW",
      "poker_position": "SB",
      "hole_cards": ["8h", "7h"],
      "starting_stack": 668000,
      "ending_stack": 0,
      "seat": 3,
      "is_winner": false,
      "hand_description": "Flush, Ace-high with Eight kicker"
    }
  ],
  "hand_actions": [
    {
      "street": "preflop",
      "sequence_order": 1,
      "player_name": "LIM",
      "action_type": "raise",
      "amount": 15000,
      "pot_after": 27000,
      "stack_after": 565000
    },
    {
      "street": "preflop",
      "sequence_order": 2,
      "player_name": "CHOW",
      "action_type": "3-bet",
      "amount": 48000,
      "pot_after": 75000,
      "stack_after": 620000
    },
    {
      "street": "preflop",
      "sequence_order": 3,
      "player_name": "LIM",
      "action_type": "call",
      "amount": 33000,
      "pot_after": 108000,
      "stack_after": 532000
    },
    {
      "street": "flop",
      "sequence_order": 4,
      "player_name": "CHOW",
      "action_type": "bet",
      "amount": 45000,
      "pot_after": 153000,
      "stack_after": 575000,
      "description": "C-bet with flopped flush"
    },
    {
      "street": "flop",
      "sequence_order": 5,
      "player_name": "LIM",
      "action_type": "call",
      "amount": 45000,
      "pot_after": 198000,
      "stack_after": 487000,
      "description": "Slow play with nut flush"
    },
    {
      "street": "turn",
      "sequence_order": 6,
      "player_name": "CHOW",
      "action_type": "bet",
      "amount": 120000,
      "pot_after": 318000,
      "stack_after": 455000
    },
    {
      "street": "turn",
      "sequence_order": 7,
      "player_name": "LIM",
      "action_type": "raise",
      "amount": 300000,
      "pot_after": 618000,
      "stack_after": 187000,
      "description": "Raise with nut flush"
    },
    {
      "street": "turn",
      "sequence_order": 8,
      "player_name": "CHOW",
      "action_type": "all-in",
      "amount": 455000,
      "pot_after": 1073000,
      "stack_after": 0
    },
    {
      "street": "turn",
      "sequence_order": 9,
      "player_name": "LIM",
      "action_type": "call",
      "amount": 187000,
      "pot_after": 1248000,
      "stack_after": 0
    }
  ],
  "notable_moments": [
    {
      "description": "Flopped flush over flush (Qh-Jh vs 8h-7h)",
      "timestamp": 32150
    },
    {
      "description": "4th heart on turn, all chips go in",
      "timestamp": 32250
    }
  ]
}
```

### 3. DB 스키마 매핑 테이블

Templar Archives의 PostgreSQL 스키마와 포커 개념의 매핑입니다. KAN 분석 및 핸드 입력 시 참고하세요.

#### hands 테이블

| DB 컬럼 | 타입 | 포커 개념 | 예시 | 설명 |
|---------|------|-----------|------|------|
| `id` | uuid | 핸드 ID | `e5e2d2d5-990d-4c01-90e7-b67fe3ba4b32` | Primary key |
| `number` | text | 핸드 번호 | `"001"`, `"042"` | 해당 세션에서의 순번 |
| `stream_id` | uuid | 스트림 참조 (Day) | `abc123...` | Foreign key to streams table |
| `small_blind` | integer | 스몰 블라인드 | `50000` | 스몰 블라인드 금액 (cents) |
| `big_blind` | integer | 빅 블라인드 | `100000` | 빅 블라인드 금액 (cents) |
| `ante` | integer | 앤티 | `100000` | 앤티 금액 (cents), 없으면 NULL |
| `stakes` | text | 스테이크 표기 | `"50K/100K/100K ante"` | 사람이 읽기 쉬운 형식 |
| `board_flop` | text[] | 플랍 카드 | `["9d", "6s", "3c"]` | 3장 배열 |
| `board_turn` | text | 턴 카드 | `"As"` | 1장 |
| `board_river` | text | 리버 카드 | `"2h"` | 1장 |
| `final_pot` | integer | 최종 팟 크기 | `19500000` | 모든 베팅 합산 (cents) |
| `video_timestamp_start` | integer | 시작 타임스탬프 | `3245` | 초 단위 |
| `video_timestamp_end` | integer | 종료 타임스탬프 | `3510` | 초 단위 |
| `ai_summary` | text | AI 요약 | `"Preflop all-in..."` | KAN 생성 요약 |
| `created_at` | timestamp | 생성 시각 | `2024-11-13 12:34:56` | Auto-generated |
| `updated_at` | timestamp | 수정 시각 | `2024-11-13 12:35:10` | Auto-updated |
| `job_id` | uuid | 분석 작업 ID | `f7g8h9...` | KAN analysis job 참조 |
| `bookmarks_count` | integer | 북마크 수 | `42` | 커뮤니티 북마크 카운트 |
| `raw_data` | jsonb | 원본 데이터 | `{"platform": "ept"}` | KAN 원본 JSON |

#### hand_players 테이블

| DB 컬럼 | 타입 | 포커 개념 | 예시 | 설명 |
|---------|------|-----------|------|------|
| `id` | uuid | 핸드-플레이어 ID | `xyz789...` | Primary key |
| `hand_id` | uuid | 핸드 참조 | `e5e2d2d5...` | Foreign key to hands |
| `player_id` | uuid | 플레이어 참조 | `player123...` | Foreign key to players |
| `name` | text | 플레이어 이름 | `"BRZEZINSKI"` | 대문자 (EPT), 일반 케이스 (기타) |
| `poker_position` | text | 포지션 | `"BTN"`, `"SB"`, `"UTG"` | 표준 약어 사용 |
| `hole_cards` | text[] | 홀카드 | `["Ah", "As"]` | 2장 배열, 카드 표기법: Rank + Suit |
| `starting_stack` | integer | 시작 스택 | `9600000` | 핸드 시작 시 칩 (cents) |
| `ending_stack` | integer | 종료 스택 | `19500000` | 핸드 종료 시 칩 (cents) |
| `seat` | integer | 좌석 번호 | `3` | 1-10 (테이블 크기에 따라) |
| `is_winner` | boolean | 승자 여부 | `true`, `false` | 팟을 가져갔는지 |
| `hand_description` | text | 핸드 설명 | `"Pair of Aces"` | 최종 핸드 랭킹 |
| `final_amount` | integer | 최종 금액 | `875000` | 해당 핸드에서 얻은/잃은 금액 (cents) |

**카드 표기법**:
- Rank: `A` (Ace), `K` (King), `Q` (Queen), `J` (Jack), `T` (Ten), `9`-`2`
- Suit: `s` (spades ♠), `h` (hearts ♥), `d` (diamonds ♦), `c` (clubs ♣)
- 예시: `["Ah", "As"]` = Ace of hearts, Ace of spades

#### hand_actions 테이블

| DB 컬럼 | 타입 | 포커 개념 | 예시 | 설명 |
|---------|------|-----------|------|------|
| `id` | uuid | 액션 ID | `action123...` | Primary key |
| `hand_id` | uuid | 핸드 참조 | `e5e2d2d5...` | Foreign key to hands |
| `street` | text | 스트리트 | `"preflop"`, `"flop"`, `"turn"`, `"river"` | 소문자 |
| `sequence_order` | integer | 액션 순서 | `1`, `2`, `3`... | 핸드 내 전체 순서 |
| `player_name` | text | 플레이어 이름 | `"BRZEZINSKI"` | hand_players.name과 일치 |
| `action_type` | text | 액션 타입 | `"fold"`, `"check"`, `"call"`, `"bet"`, `"raise"`, `"all-in"`, `"3-bet"`, `"4-bet"` | 소문자, 하이픈 |
| `amount` | integer | 베팅 금액 | `300000` | 해당 액션의 베팅 금액 (cents), fold/check는 0 |
| `pot_after` | integer | 액션 후 팟 | `650000` | 해당 액션 후 누적 팟 크기 (cents) |
| `stack_after` | integer | 액션 후 스택 | `9300000` | 해당 액션 후 플레이어 스택 (cents) |
| `description` | text | 설명 (선택) | `"Overbet bluff (70% pot)"` | 추가 컨텍스트 |
| `created_at` | timestamp | 생성 시각 | `2024-11-13 12:34:56` | Auto-generated |

**중요**:
- `sequence_order`는 프리플랍부터 리버까지 **전체 핸드에서의 절대 순서**입니다.
- 같은 street 내에서는 테이블 순서대로 증가합니다.

#### players 테이블

| DB 컬럼 | 타입 | 포커 개념 | 예시 | 설명 |
|---------|------|-----------|------|------|
| `id` | uuid | 플레이어 ID | `player123...` | Primary key |
| `name` | text | 표시 이름 | `"Phil Ivey"`, `"BRZEZINSKI"` | 공식 이름 |
| `normalized_name` | text | 정규화 이름 | `"phil_ivey"`, `"brzezinski"` | 소문자, 언더스코어 |
| `aliases` | text[] | 별칭 | `["IVEY", "Phil I."]` | 닉네임, 변형 |
| `bio` | text | 약력 | `"10x WSOP bracelet winner"` | 플레이어 설명 |
| `is_pro` | boolean | 프로 여부 | `true`, `false` | 프로 플레이어 식별 |
| `country` | text | 국가 | `"USA"`, `"KOR"` | ISO 3166-1 alpha-3 |
| `profile_image` | text | 프로필 사진 URL | `"https://..."` | 외부 URL 또는 Supabase Storage |
| `created_at` | timestamp | 생성 시각 | `2024-11-13 12:34:56` | Auto-generated |
| `updated_at` | timestamp | 수정 시각 | `2024-11-13 12:35:10` | Auto-updated |

**중요**:
- EPT 영상에서는 대문자 이름 (예: `"BRZEZINSKI"`)을 사용합니다.
- WSOP/Triton 등 다른 플랫폼은 일반 케이스 (예: `"Phil Ivey"`)를 사용합니다.
- KAN 분석 시 플랫폼별 네이밍 규칙을 준수해야 합니다.

#### streams 테이블 (Day 테이블의 새 이름)

| DB 컬럼 | 타입 | 포커 개념 | 예시 | 설명 |
|---------|------|-----------|------|------|
| `id` | uuid | 스트림 ID | `stream123...` | Primary key |
| `sub_event_id` | uuid | 서브 이벤트 참조 | `subevent123...` | Foreign key to sub_events |
| `name` | text | 스트림 이름 | `"Day 1A"`, `"Final Table"` | 일별 세션 이름 |
| `description` | text | 설명 | `"First flight of Day 1"` | 추가 설명 |
| `published_at` | timestamp | 공개 날짜 | `2024-03-15` | 실제 방송 날짜 |
| `video_source` | text | 영상 소스 | `"youtube"`, `"local"`, `"nas"` | 영상 위치 |
| `video_url` | text | 영상 URL | `"https://youtube.com/watch?v=..."` | YouTube URL |
| `video_file` | text | 영상 파일 경로 | `"/videos/ept_2024_day1a.mp4"` | 로컬 파일 경로 |
| `video_nas_path` | text | NAS 경로 | `"/nas/videos/ept_2024_day1a.mp4"` | NAS 스토리지 경로 |
| `player_count` | integer | 플레이어 수 | `342` | 해당 세션 참가자 수 |
| `status` | text | 상태 | `"draft"`, `"published"` | 공개 상태 |
| `created_at` | timestamp | 생성 시각 | `2024-11-13 12:34:56` | Auto-generated |
| `updated_at` | timestamp | 수정 시각 | `2024-11-13 12:35:10` | Auto-updated |

**중요**:
- 모든 핸드는 반드시 기존 `stream`에 연결되어야 합니다.
- KAN 분석 시 자동 스트림 생성은 하지 않습니다.

#### analysis_jobs 테이블 (KAN 분석 작업)

| DB 컬럼 | 타입 | 포커 개념 | 예시 | 설명 |
|---------|------|-----------|------|------|
| `id` | uuid | 작업 ID | `job123...` | Primary key |
| `video_url` | text | 영상 URL | `"https://youtube.com/watch?v=..."` | 분석 대상 영상 |
| `status` | text | 작업 상태 | `"pending"`, `"processing"`, `"completed"`, `"failed"` | 작업 상태 |
| `progress` | integer | 진행률 | `0-100` | 퍼센트 단위 |
| `hands_found` | integer | 발견된 핸드 수 | `87` | KAN이 추출한 핸드 개수 |
| `error_message` | text | 에러 메시지 | `"Video download failed"` | 실패 시 에러 내용 |
| `created_at` | timestamp | 생성 시각 | `2024-11-13 12:34:56` | 작업 시작 시각 |
| `started_at` | timestamp | 시작 시각 | `2024-11-13 12:35:00` | 실제 처리 시작 |
| `completed_at` | timestamp | 완료 시각 | `2024-11-13 12:45:30` | 작업 완료 시각 |
| `user_id` | uuid | 사용자 ID | `user123...` | 작업 생성 사용자 |

**작업 상태 흐름**:
1. `pending`: 대기 중
2. `processing`: 처리 중 (KAN 분석 진행)
3. `completed`: 완료 (hands 테이블에 데이터 저장)
4. `failed`: 실패 (error_message 확인)

**STUCK 작업 감지**:
- `processing` 상태로 10분 이상 경과 시 STUCK으로 간주
- `scripts/cleanup-stuck-job.mjs`로 정리

### 4. KAN 분석 체크리스트

KAN (Khalai Archive Network)은 Gemini 2.0 Flash를 사용하여 포커 영상을 핸드 히스토리로 자동 변환합니다. 분석 시 다음 사항을 확인하세요.

#### 분석 전 (Pre-Analysis)

- [ ] **영상 URL 유효성**: YouTube URL이 올바른지 확인
- [ ] **영상 길이**: 1시간 이하 세그먼트로 분할 (Gemini API 제한)
- [ ] **플랫폼 식별**: EPT, WSOP, Triton 등 플랫폼 확인
- [ ] **Prompt 선택**: 플랫폼별 맞춤 Prompt 사용 (`lib/ai/prompts.ts`)
- [ ] **Stream 존재 확인**: 핸드를 저장할 stream_id 사전 생성

#### 분석 중 (During Analysis)

- [ ] **다운로드 진행률**: 0-25% (yt-dlp)
- [ ] **업로드 진행률**: 25-50% (Gemini File API)
- [ ] **처리 진행률**: 50-75% (Gemini 영상 처리)
- [ ] **분석 진행률**: 75-100% (AI 핸드 추출)
- [ ] **에러 모니터링**: `analysis_jobs.error_message` 확인

#### 분석 후 (Post-Analysis)

- [ ] **플레이어 이름 인식**: 대문자/소문자 규칙 준수
  - EPT: `"BRZEZINSKI"` (대문자)
  - WSOP/Triton: `"Phil Ivey"` (일반 케이스)
- [ ] **포지션 추출**: BTN, SB, BB, UTG, MP, CO 정확도
- [ ] **홀카드 파싱**: `["Ah", "As"]` 형식 (Rank + Suit)
- [ ] **보드 카드 추출**: Flop (3장), Turn (1장), River (1장)
- [ ] **액션 시퀀스**: 프리플랍 → 플랍 → 턴 → 리버 순서 보장
- [ ] **스트리트별 액션**: 각 스트리트에서 액션 순서 정확도
- [ ] **베팅 금액**: amount, pot_after, stack_after 일관성
- [ ] **팟 크기 계산**: final_pot = 모든 베팅 합산
- [ ] **타임스탬프**: video_timestamp_start, video_timestamp_end 정확도

#### 품질 검증 (Quality Check)

- [ ] **핸드 완성도**: 불완전한 핸드 (missing data) 필터링
- [ ] **중복 제거**: 같은 핸드가 여러 번 추출되지 않았는지 확인
- [ ] **AI 요약**: ai_summary가 핸드 내용을 정확히 반영하는지 검증
- [ ] **Notable Moments**: 하이라이트 타임스탬프 정확도
- [ ] **DB 저장 검증**: hands, hand_players, hand_actions 테이블에 정상 저장

#### 플랫폼별 특이사항

**EPT (European Poker Tour)**:
- 이름: **전부 대문자** (예: `"BRZEZINSKI"`)
- 화면 레이아웃: 플레이어 이름이 항상 화면 하단 표시
- 홀카드: 최종 쇼다운에서만 공개되는 경우 많음

**WSOP (World Series of Poker)**:
- 이름: 일반 케이스 (예: `"Daniel Negreanu"`)
- 화면 레이아웃: 플레이어 이름 + 홀카드 실시간 표시
- 스택 크기: 항상 화면에 표시됨

**Triton Series**:
- 이름: 일반 케이스 (예: `"Phil Ivey"`)
- 고액 캐시 게임: 블라인드가 매우 높음 (예: $1M/$2M)
- Short Deck (6+ Hold'em): 2-5 카드 제거, 플러시 > 풀하우스 랭킹

**Cash Game (High Stakes Poker 등)**:
- Ante: 일반적으로 없음 (0 또는 NULL)
- 스택 크기: 가변적 (리바이 가능)
- 핸드 번호: 세션 내 순번 (토너먼트와 달리 연속성 없음)

### 5. GTO 및 ICM 개념

#### GTO (Game Theory Optimal)

**정의**: 수학적으로 최적의 전략. 상대가 어떤 전략을 사용하더라도 익스플로잇 당하지 않는 플레이.

**핵심 원리**:
- **Nash Equilibrium**: 양측이 최적 전략을 사용할 때 아무도 전략을 바꿀 유인이 없는 균형점
- **Mixed Strategy**: 여러 액션을 일정 빈도로 섞어서 사용 (예: 3-bet 25%, Call 75%)
- **Unexploitable**: 상대가 GTO 플레이어를 익스플로잇할 수 없음
- **Balanced Range**: 강한 핸드와 블러프가 최적 비율로 섞임 (보통 벨류:블러프 = 2:1)

**GTO vs Exploitative**:
| GTO | Exploitative |
|-----|--------------|
| 수학적 최적 | 상대 약점 공략 |
| 익스플로잇 불가능 | 최대 EV (상대 의존) |
| 강한 상대에게 효과적 | 약한 상대에게 더 유리 |
| 소프트웨어로 학습 가능 | 상대 관찰 필요 |

**GTO 도구**:
- **PioSolver**: 포스트플랍 GTO 솔버
- **GTO+**: 저렴한 대안
- **Simple Postflop**: 빠른 계산

**예시**:
- GTO 3-bet 빈도 (CO vs BTN): ~8-10%
- GTO C-bet 빈도 (BTN, A-high flop): ~60-65%
- GTO Bluff-to-Value ratio (River): ~33% bluffs, 67% value

#### ICM (Independent Chip Model)

**정의**: 토너먼트에서 칩의 가치를 현금 가치($EV)로 환산하는 수학적 모델. 칩이 선형적 가치를 갖지 않는다는 원리.

**핵심 원리**:
- **칩의 비선형성**: 10,000 chips ≠ 2 × 5,000 chips (현금 가치)
- **생존 프리미엄**: 버블, 파이널 테이블 등에서 살아남는 것이 중요
- **스택 크기 영향**: 칩리더의 칩은 가치가 낮고, 숏스택의 칩은 가치가 높음

**ICM 적용 시점**:
1. **버블 (Bubble)**: 상금권 진입 직전
2. **파이널 테이블 (Final Table)**: 상금 점프가 큰 구간
3. **딜 (Deal)**: 상금 분배 협상 시
4. **Satellite**: 티켓 획득이 목표인 경우

**예시**:

**상황**: WSOP Main Event, 상금권 100위까지, 현재 101명 남음 (버블)

| 플레이어 | 스택 크기 | 칩 가치 ($EV) | 칩 1개당 가치 |
|----------|-----------|---------------|---------------|
| 칩리더 | 10,000,000 | $180,000 | $0.018 |
| 평균 스택 | 2,000,000 | $50,000 | $0.025 |
| 숏스택 | 500,000 | $18,000 | $0.036 |

→ 숏스택의 칩 1개는 칩리더 칩 1개의 **2배** 가치!

**ICM 전략**:
- **버블에서 숏스택**: 타이트하게 플레이, 생존 우선
- **버블에서 칩리더**: 공격적 플레이, 미들스택 압박
- **파이널 테이블**: 상금 점프 고려, 리스크 회피

**ICM Pressure (압박)**:
- 버블에서 미들스택이 가장 큰 압박 받음
- 칩리더는 압박을 가할 수 있지만, 자신도 ICM 리스크 존재
- 숏스택은 폴드 에퀴티가 높아져 생존 가능

**ICM 계산 도구**:
- **ICMizer**: 토너먼트 푸시/폴드 전략
- **HoldemResources Calculator**: ICM 시뮬레이션
- **PokerCruncher**: 모바일 ICM 계산기

**ICM의 한계**:
- 미래 포지션 고려 안 함 (블라인드 위치)
- 스킬 차이 무시 (모든 플레이어 동일 실력 가정)
- FGS (Future Game Simulation) 모델이 더 정확하지만 복잡함

### 6. 추가 참고 자료

#### 포커 전략 서적
- **Harrington on Hold'em** (Dan Harrington): 토너먼트 바이블
- **Applications of No-Limit Hold'em** (Matthew Janda): GTO 수학
- **The Mathematics of Poker** (Bill Chen, Jerrod Ankenman): 게임 이론
- **Modern Poker Theory** (Michael Acevedo): GTO 전략

#### 온라인 도구
- **PokerStove**: 에퀴티 계산기
- **Equilab**: 레인지 vs 레인지 에퀴티
- **Flopzilla**: 레인지 구성 분석
- **Hand2Note**: HUD 및 통계 분석

#### 유용한 웹사이트
- **Upswing Poker**: GTO 전략 학습
- **Run It Once**: 고급 전략 비디오
- **PokerNews**: 라이브 토너먼트 소식
- **2+2 Forums**: 포커 커뮤니티

---

**중요**: 이 섹션은 AI 모델이 포커 도메인을 정확히 이해하고, KAN 분석 및 핸드 데이터 처리 시 올바른 판단을 내릴 수 있도록 돕기 위한 참고 자료입니다. 실제 코드 작성 시 이 지식을 활용하여 타입 안전성, 데이터 정합성, 플랫폼별 특이사항을 준수해야 합니다.

### 5. Postmodern 디자인 시스템

**Phase 39-40 완료** (2025-11-16): 전체 28개 페이지 Postmodern 디자인 전환

#### 개요

- shadcn/ui 의존성 완전 제거
- 순수 HTML/CSS + Tailwind CSS 4
- Claude Code Skill 활용 (`.claude/skills/templar-postmodern/`)

#### 디자인 원칙

**Color Palette**:
- Gold: `oklch(0.68 0.16 85)` - Primary
- Black: `oklch(0 0 0)` - Background
- 5-level gold/black spectrum

**Typography**:
- Display: Geist Sans, 900 weight, UPPERCASE
- Mono: Geist Mono, 700 weight (statistics)

**Signature Elements**:
- 3D layered shadows (4px/8px/12px)
- Gold glow effects
- Sharp edges (border-radius: 0)
- Asymmetric grids (2:3, auto 1fr auto)
- Monospace for all data/numbers

#### 사용 방법

**globals.css 클래스**:
```css
.card-postmodern          /* Base card with 3D shadows */
.btn-primary              /* Gold gradient button */
.btn-secondary            /* Outlined button */
.input-postmodern         /* Sharp-edged input */
.text-heading             /* Uppercase heading */
.text-mono                /* Monospace for stats */
.gold-glow                /* Gold glow effect */
```

**Claude Code Skill**:
- 위치: `.claude/skills/templar-postmodern/`
- 사용: "Use templar-postmodern skill to create [component]"
- 예시 컴포넌트: `examples/` 디렉토리 참고

#### 금지 사항

❌ **절대 사용 금지**:
- Rounded corners (`border-radius > 0`)
- Purple gradients
- Glassmorphism
- shadcn/ui 컴포넌트 재도입
- `any` 타입

#### 관련 파일

- **디자인 시스템**: `app/globals.css` (line 6-500)
- **Skill 문서**: `.claude/skills/templar-postmodern/SKILL.md`
- **예시**: `.claude/skills/templar-postmodern/examples/*.tsx`

### 6. 타입 시스템

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

## Agent 시스템

프로젝트에는 특화된 Agent들이 `.claude/agents/` 디렉토리에 정의되어 있습니다.

### Supabase Expert Agent

**위치**: `.claude/agents/supabase-expert.md`

**전문 분야**:
- Supabase CLI 명령어 마스터
- 마이그레이션 관리 (생성, 적용, 롤백)
- RLS 정책 설계 및 디버깅
- 인덱스 최적화 (부분 인덱스, CONCURRENTLY)
- Realtime Publication 관리
- 성능 모니터링 및 쿼리 튜닝

**프로젝트 지식**:
- 26개 테이블 구조 완벽 이해
- day_id vs stream_id 컬럼 네이밍 이슈 파악
- RLS 정책 패턴 (admin/high_templar 권한)
- 인덱스 최적화 히스토리 (173개 인덱스)

**사용 예시**:
```
"supabase expert를 사용해서 hands 테이블의 인덱스를 최적화해줘"
"analysis_jobs 테이블에 Realtime을 활성화해줘"
"새 테이블을 추가하고 RLS 정책까지 설정해줘"
```

### Vercel Expert Agent

**위치**: `.claude/agents/vercel-expert.md`

**전문 분야**:
- Vercel CLI 명령어 마스터
- 배포 관리 (Production, Preview, Development)
- 환경 변수 설정 및 관리
- 도메인 및 DNS 설정
- 로그 모니터링 및 디버깅
- 프로젝트 설정 최적화

**프로젝트 지식**:
- templar-archives 프로젝트 구조 이해
- 주요 환경 변수 (KHALAI_ARCHIVE_NETWORK_URL, Supabase, API Keys)
- Next.js 16.0.1 배포 패턴
- Edge Functions 및 Middleware 설정

**사용 예시**:
```
"vercel expert를 사용해서 프로덕션 배포해줘"
"KHALAI_ARCHIVE_NETWORK_URL 환경 변수를 모든 환경에 추가해줘"
"최근 배포 로그를 확인하고 에러가 있는지 분석해줘"
"도메인 SSL 인증서 상태를 확인해줘"
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
- **KAN Prompts**: `lib/ai/prompts.ts`
- **KAN Actions**: `app/actions/kan-analysis.ts`

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

### Phase 39-40: Postmodern 디자인 시스템 전환 (2025-11-16)

**완료된 작업**:

1. **Claude Code Skill 생성**
   - `.claude/skills/templar-postmodern/` 디렉토리 생성
   - SKILL.md (487줄), README.md (294줄)
   - 4개 예시 컴포넌트 (tournament-card, player-card, hand-card, community-post)
   - 커밋: `47a63b5`

2. **전체 페이지 Postmodern 디자인 적용** (28개 파일)
   - 공통 컴포넌트 3개
   - Core Pages 2개 (홈, 검색)
   - Content/User/Reporter Pages 14개
   - Admin Pages 8개
   - Other Pages 2개 (About, Login)
   - 커밋: `424db39`, `8a1cdb5`, `faeaacc`, `161b330`, `7b3c030`, `020e042`

3. **shadcn/ui 완전 제거**
   - Button, Card, Dialog, Select, Table 등 → 순수 HTML/CSS
   - ~2,000줄 삭제, ~2,500줄 추가
   - 번들 크기 ~15KB 감소

4. **디자인 시스템 구현**
   - `app/globals.css`에 완전 구현 (500+줄)
   - CSS 변수, 유틸리티 클래스, 컴포넌트 스타일
   - Tailwind CSS 4 완전 호환

**성과**:
- ✅ 28개 페이지 100% 완료
- ✅ 빌드 성공 (49 routes)
- ✅ TypeScript 에러 0개
- ✅ 접근성 WCAG AA 유지
- ✅ Vercel 프로덕션 배포 완료

---

### Phase 35: 보안 & 안정성 강화 (2025-11-12)

**완료된 작업**:

1. **KAN 권한 체크 정상화**
   - 권한 우회 코드 제거 (app/actions/kan-analysis.ts)
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
   - 3개 주요 파일 수정 (kan-analysis, analyze-video-dialog, ArchiveMainPanel)
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
   - 해결: `users` 테이블로 변경 (app/actions/kan-analysis.ts:422-426)
   - 커밋: `e8d7d07`

**성과**:
- ✅ 보안 등급 A 유지
- ✅ 117줄 코드 감소
- ✅ TypeScript 타입 안전성 100%
- ✅ Next.js 16.0 완전 호환
- ✅ 프로덕션 로그 최적화

### Phase 34: KAN 데이터 저장 수정 (2025-11-12)

**문제**: KAN 분석 성공 후 hands 테이블에 데이터가 저장되지 않음

**원인 및 해결**:
1. **테이블 이름 불일치**: `days` → `streams`로 수정 (app/actions/kan-analysis.ts:598)
2. **컬럼 이름 불일치**: `hand_number` → `number`로 수정 (hands 테이블)
3. **"Unsorted Hands" 스트림**: 스크립트로 생성 완료 (scripts/create-unsorted-stream.mjs)

**유틸리티 스크립트**:
```bash
node scripts/check-db.mjs              # DB 상태 확인
node scripts/create-unsorted-stream.mjs # "Unsorted Hands" 스트림 생성
node scripts/fix_stuck_jobs.mjs        # 멈춘 작업 정리 (30분 타임아웃)
```

**중요**: KAN 분석 결과는 반드시 기존 stream에 저장되어야 합니다. 자동 스트림 생성은 제거되었습니다.

### Phase 36: KAN 분석 트러블슈팅 및 Agent 시스템 (2025-11-13)

**문제**: 프로덕션에서 KAN 분석 요청 시 백엔드에 도달하지 않음

**원인 및 해결**:
1. **환경 변수 설정**: `.env.local`의 `KAN_BACKEND_URL`이 localhost로 되어 있었음
   - 해결: Cloud Run 프로덕션 URL로 변경
   - Vercel 환경 변수는 이미 올바르게 설정됨 확인

2. **사용자 권한 부족**: `zed.lee@ggproduction.net`이 `user` 역할
   - KAN 분석은 `high_templar`, `reporter`, `admin` 권한 필요
   - 해결: `update-user-role.mjs` 스크립트로 `high_templar`로 변경

3. **STUCK 작업 정리**: 12분간 멈춘 분석 작업 정리

**새로운 디버깅 도구**:
```bash
# 분석 상태 및 권한 확인 (종합 대시보드)
node scripts/check-analysis-status.mjs

# 사용자 권한 변경
node scripts/update-user-role.mjs

# STUCK 작업 정리 (10분 이상 processing 상태)
node scripts/cleanup-stuck-job.mjs
```

**Supabase CLI 개선**:
- `supabase/config.toml`: `project_id` 수정 (ggvault → templar-archives)
- Node.js 스크립트로 Supabase 직접 쿼리 가능 (`.env.local` 활용)

**Agent 시스템 구축**:
- `.claude/agents/supabase-expert.md`: Supabase CLI 및 PostgreSQL 관리 전문가
  - 마이그레이션, RLS 정책, 인덱스 최적화, Realtime 관리
  - 26개 테이블 구조 및 프로젝트 특화 지식 포함
  - 안전한 마이그레이션 패턴 및 트러블슈팅 가이드

**커밋**:
- `93efb98`: Hand 타입 정의 DB 스키마와 일치
- `c7959a4`: KAN 분석 상태 확인 스크립트 3개 추가
- `f2c6366`: Supabase Expert agent 및 config 수정

---

### Phase 38: KAN UI 개선 및 Tournament 스키마 수정 (2025-11-13)

**문제**: `/admin/kan/new` 페이지에서 Tournament 드롭다운 로딩 실패 (400 에러)

**원인 및 해결**:
1. **tournaments.year 컬럼 없음**
   - 문제: 코드에서 `year` 컬럼 참조했지만 실제 DB에는 `start_date`만 존재
   - 해결: `year` → `start_date`로 변경, UI에서 년도 추출
   - 파일: `app/admin/kan/_components/AnalysisRequestForm.tsx`
   - 커밋: `a721c06`

2. **YouTube 플레이어 및 타임라인 추가**
   - YouTube URL 입력 시 VideoPlayerWithTimestamp 자동 표시
   - InteractiveTimeline으로 구간 선택 가능
   - 타임라인 선택과 수동 입력 모두 지원
   - 커밋: `471f046`

**성과**:
- ✅ Tournament 선택 드롭다운 정상 작동
- ✅ 영상을 보면서 분석 구간 선택 가능
- ✅ UX 대폭 개선

### Phase 39: DB 스키마 불일치 종합 해결 (2025-11-13)

**작업 범위**: 4개 에이전트 동원하여 전체 코드베이스 스키마 불일치 점검

**발견 및 해결된 문제**:

1. **streams 테이블 스키마**
   - 문제: `status` 컬럼 존재 여부 확인 필요
   - 해결: 프로덕션 DB 확인 후 `status: 'draft'` 복원
   - 파일: `app/actions/kan-analysis.ts:1108`
   - 커밋: `ff75ada`

2. **Player 타입 정의**
   - 추가: `normalized_name`, `aliases`, `bio`, `is_pro`
   - 제거: `name_lower` (DB에 없음)
   - 파일: `lib/types/archive.ts:161-180`

3. **Hand 타입 정의**
   - 추가: `ai_summary`, `board_flop/turn/river`, `video_timestamp_start/end`
   - 추가: `job_id`, `stakes`, `bookmarks_count`, `raw_data`
   - 파일: `lib/types/archive.ts:117-159`

4. **HandPlayer 타입 정의**
   - 추가: `poker_position`, `starting_stack`, `ending_stack`
   - 추가: `hole_cards`, `seat`, `final_amount`, `hand_description`, `is_winner`
   - 파일: `lib/types/archive.ts:182-208`

**검증 방법**:
- 프로덕션 DB API로 실제 스키마 확인
- 4개 에이전트 병렬 분석 (Debugger, Backend Architect, Frontend Developer, Code Reviewer)
- 빌드 테스트 및 TypeScript 컴파일 체크

**성과**:
- ✅ 모든 타입 정의가 DB 스키마와 일치
- ✅ KAN 분석 시스템 타입 안전성 강화
- ✅ 향후 스키마 변경 시 참고할 검증 프로세스 확립

**커밋**:
- `9159dc2`: Backend Architect - streams 테이블 수정
- `d8326f4`: Code Reviewer - 타입 정의 일괄 수정
- `ff75ada`: 최종 통합 및 status 복원

---

**마지막 업데이트**: 2025-11-13
**문서 버전**: 33.0
**현재 Phase**: 39 완료 (DB 스키마 불일치 종합 해결)
**보안 등급**: A
