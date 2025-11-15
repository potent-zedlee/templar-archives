# Arbiter 역할 및 핸드 수동 입력 시스템 아키텍처 설계

**작성일**: 2025-11-16
**버전**: 1.0
**목적**: Arbiter 역할 추가 및 핸드 수동 입력 시스템 데이터베이스 스키마 설계

---

## 1. 개요

### 1.1 목적

포커 핸드 히스토리를 수동으로 기록하고 관리하는 전문 역할(Arbiter)을 추가하여, KAN AI 분석 외에도 수동으로 정확한 핸드 데이터를 입력할 수 있는 시스템을 구축합니다.

### 1.2 현재 사용자 역할 시스템

```sql
-- 기존 role enum (20251016000001_rename_moderator_to_high_templar.sql)
CHECK (role IN ('user', 'high_templar', 'admin'))
```

**역할별 권한**:
- `user`: 일반 사용자 (읽기, 커뮤니티 참여)
- `high_templar`: 고급 권한 (Tournament/SubEvent/Stream CRUD, KAN 분석)
- `admin`: 전체 관리자 (사용자 관리, 모든 CRUD)

### 1.3 Arbiter 역할 정의

**권한**:
- ✅ Hands 테이블 CRUD (수동 입력/수정/삭제)
- ✅ HandPlayers 테이블 CRUD (플레이어별 액션)
- ✅ HandActions 테이블 CRUD (시퀀스별 액션)
- ✅ Archive 읽기 (Tournament/SubEvent/Stream 조회)
- ✅ 다른 Arbiter가 작성한 핸드 수정 가능 (검토 및 보완)
- ✅ 핸드 수정 요청 검토 및 승인 (향후 기능)

**제약**:
- ❌ Tournament/SubEvent/Stream CRUD 불가 (admin, high_templar 전용)
- ❌ 커뮤니티 관리 권한 없음 (templar 전용)
- ❌ 사용자 관리 권한 없음 (admin 전용)

**권한 상속 관계**:
```
admin > high_templar > arbiter > user
```
- `admin`과 `high_templar`는 Arbiter 권한을 모두 포함 (상위 호환)

---

## 2. 데이터베이스 스키마 설계

### 2.1 사용자 역할 업데이트

**마이그레이션 파일**: `20251116000001_add_arbiter_role.sql`

```sql
-- ===========================
-- 001: Arbiter 역할 추가
-- ===========================

-- Step 1: role enum에 'arbiter' 추가
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'templar', 'arbiter', 'high_templar', 'admin'));

-- Step 2: 주석 업데이트
COMMENT ON COLUMN public.users.role IS 'User role: user, templar, arbiter, high_templar, admin';

-- Step 3: role 인덱스 재생성 (성능 최적화)
DROP INDEX IF EXISTS users_role_idx;
CREATE INDEX users_role_idx ON public.users(role) WHERE role IN ('arbiter', 'high_templar', 'admin');
```

**권한 계층 순서**: `user` < `templar` < `arbiter` < `high_templar` < `admin`

### 2.2 RLS 정책 업데이트

#### 2.2.1 hands 테이블

```sql
-- ===========================
-- 002: hands 테이블 RLS 정책 업데이트
-- ===========================

-- 기존 정책 삭제 (20251024000001_fix_rls_admin_only.sql에서 생성됨)
DROP POLICY IF EXISTS "Admins can insert hands" ON hands;
DROP POLICY IF EXISTS "Admins can update hands" ON hands;
DROP POLICY IF EXISTS "Admins can delete hands" ON hands;

-- 새 정책: Arbiter 포함
CREATE POLICY "Arbiters can insert hands"
  ON hands
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Arbiters can update hands"
  ON hands
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Arbiters can delete hands"
  ON hands
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

-- 주석
COMMENT ON POLICY "Arbiters can insert hands" ON hands
  IS 'Security: Admins, high_templars, and arbiters can create hands';

COMMENT ON POLICY "Arbiters can update hands" ON hands
  IS 'Security: Admins, high_templars, and arbiters can modify hands';

COMMENT ON POLICY "Arbiters can delete hands" ON hands
  IS 'Security: Admins, high_templars, and arbiters can delete hands';
```

#### 2.2.2 hand_players 테이블

```sql
-- ===========================
-- 003: hand_players 테이블 RLS 정책 업데이트
-- ===========================

DROP POLICY IF EXISTS "Admins can insert hand_players" ON hand_players;
DROP POLICY IF EXISTS "Admins can update hand_players" ON hand_players;
DROP POLICY IF EXISTS "Admins can delete hand_players" ON hand_players;

CREATE POLICY "Arbiters can insert hand_players"
  ON hand_players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Arbiters can update hand_players"
  ON hand_players
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Arbiters can delete hand_players"
  ON hand_players
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

COMMENT ON POLICY "Arbiters can insert hand_players" ON hand_players
  IS 'Security: Admins, high_templars, and arbiters can create hand_players';

COMMENT ON POLICY "Arbiters can update hand_players" ON hand_players
  IS 'Security: Admins, high_templars, and arbiters can modify hand_players';

COMMENT ON POLICY "Arbiters can delete hand_players" ON hand_players
  IS 'Security: Admins, high_templars, and arbiters can delete hand_players';
```

#### 2.2.3 hand_actions 테이블

```sql
-- ===========================
-- 004: hand_actions 테이블 RLS 정책 생성
-- ===========================

-- RLS 활성화 (아직 활성화 안 되어 있을 경우)
ALTER TABLE hand_actions ENABLE ROW LEVEL SECURITY;

-- 읽기 권한: 모든 사용자
CREATE POLICY "Anyone can view hand_actions"
  ON hand_actions
  FOR SELECT
  USING (true);

-- 쓰기 권한: Arbiter 이상
CREATE POLICY "Arbiters can insert hand_actions"
  ON hand_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Arbiters can update hand_actions"
  ON hand_actions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

CREATE POLICY "Arbiters can delete hand_actions"
  ON hand_actions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
      AND users.banned_at IS NULL
    )
  );

COMMENT ON POLICY "Anyone can view hand_actions" ON hand_actions
  IS 'Public read access to all hand actions';

COMMENT ON POLICY "Arbiters can insert hand_actions" ON hand_actions
  IS 'Security: Admins, high_templars, and arbiters can create hand actions';

COMMENT ON POLICY "Arbiters can update hand_actions" ON hand_actions
  IS 'Security: Admins, high_templars, and arbiters can modify hand actions';

COMMENT ON POLICY "Arbiters can delete hand_actions" ON hand_actions
  IS 'Security: Admins, high_templars, and arbiters can delete hand actions';
```

#### 2.2.4 tournaments, sub_events, streams 테이블

**변경 없음** - 기존 정책 유지 (admin, high_templar만 허용)

```sql
-- 확인: tournaments 정책 (Arbiter 제외)
-- 20251024000001_fix_rls_admin_only.sql 참조
-- role IN ('admin', 'high_templar') 유지
```

### 2.3 핸드 수정 이력 추적 (선택)

**목적**: 누가 언제 어떤 핸드를 수정했는지 감사 로그 제공

**마이그레이션 파일**: `20251116000002_add_hand_edit_history.sql`

```sql
-- ===========================
-- 005: 핸드 수정 이력 테이블 추가
-- ===========================

CREATE TABLE IF NOT EXISTS public.hand_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  editor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  edit_type TEXT NOT NULL CHECK (edit_type IN ('create', 'update', 'delete')),
  changed_fields JSONB,  -- 변경된 필드 목록 (예: {"description": "old -> new"})
  previous_data JSONB,   -- 변경 전 데이터 (전체 또는 일부)
  new_data JSONB,        -- 변경 후 데이터 (전체 또는 일부)
  reason TEXT,           -- 변경 사유 (선택)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX hand_edit_history_hand_id_idx ON public.hand_edit_history(hand_id);
CREATE INDEX hand_edit_history_editor_id_idx ON public.hand_edit_history(editor_id);
CREATE INDEX hand_edit_history_created_at_idx ON public.hand_edit_history(created_at DESC);

-- RLS 활성화
ALTER TABLE public.hand_edit_history ENABLE ROW LEVEL SECURITY;

-- 읽기 권한: Arbiter 이상
CREATE POLICY "Arbiters can view edit history"
  ON hand_edit_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
    )
  );

-- 쓰기 권한: 트리거로만 삽입 (수동 삽입 방지)
CREATE POLICY "System can insert edit history"
  ON hand_edit_history
  FOR INSERT
  WITH CHECK (false);  -- 트리거만 허용, 수동 삽입 금지

-- 주석
COMMENT ON TABLE public.hand_edit_history IS 'Audit log for hand modifications (Arbiter system)';
COMMENT ON COLUMN public.hand_edit_history.edit_type IS 'Type of edit: create, update, delete';
COMMENT ON COLUMN public.hand_edit_history.changed_fields IS 'Changed fields summary (JSON)';
COMMENT ON COLUMN public.hand_edit_history.previous_data IS 'Previous data (JSON)';
COMMENT ON COLUMN public.hand_edit_history.new_data IS 'New data (JSON)';
```

**자동 로깅 트리거**:

```sql
-- ===========================
-- 006: hands 테이블 자동 로깅 트리거
-- ===========================

CREATE OR REPLACE FUNCTION log_hand_edit()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT 작업
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.hand_edit_history (
      hand_id,
      editor_id,
      edit_type,
      new_data
    ) VALUES (
      NEW.id,
      auth.uid(),
      'create',
      to_jsonb(NEW)
    );
    RETURN NEW;

  -- UPDATE 작업
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.hand_edit_history (
      hand_id,
      editor_id,
      edit_type,
      previous_data,
      new_data,
      changed_fields
    ) VALUES (
      NEW.id,
      auth.uid(),
      'update',
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object(
        'description', CASE WHEN OLD.description != NEW.description THEN format('%s -> %s', OLD.description, NEW.description) ELSE NULL END,
        'small_blind', CASE WHEN OLD.small_blind != NEW.small_blind THEN format('%s -> %s', OLD.small_blind, NEW.small_blind) ELSE NULL END,
        'big_blind', CASE WHEN OLD.big_blind != NEW.big_blind THEN format('%s -> %s', OLD.big_blind, NEW.big_blind) ELSE NULL END,
        'pot_size', CASE WHEN OLD.pot_size != NEW.pot_size THEN format('%s -> %s', OLD.pot_size, NEW.pot_size) ELSE NULL END
      ) - NULL  -- NULL 값 제거
    );
    RETURN NEW;

  -- DELETE 작업
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.hand_edit_history (
      hand_id,
      editor_id,
      edit_type,
      previous_data
    ) VALUES (
      OLD.id,
      auth.uid(),
      'delete',
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS hands_edit_log_trigger ON hands;
CREATE TRIGGER hands_edit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON hands
  FOR EACH ROW
  EXECUTE FUNCTION log_hand_edit();

COMMENT ON FUNCTION log_hand_edit() IS 'Automatically log hand edits to hand_edit_history';
```

### 2.4 핸드 수정 요청 시스템 업데이트 (선택)

**기존 테이블**: `hand_edit_requests` (20251015000017_add_hand_edit_requests.sql)

**변경 사항**: Arbiter도 수정 요청 검토 가능하도록 정책 수정

```sql
-- ===========================
-- 007: hand_edit_requests 정책 업데이트
-- ===========================

-- 기존 Admins can view all edit requests 정책 삭제
DROP POLICY IF EXISTS "Admins can view all edit requests" ON hand_edit_requests;
DROP POLICY IF EXISTS "Admins can update edit requests" ON hand_edit_requests;

-- Arbiter도 검토 가능하도록 정책 수정
CREATE POLICY "Arbiters can view all edit requests"
  ON hand_edit_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = requester_id  -- 본인 요청
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
    )
  );

CREATE POLICY "Arbiters can update edit requests"
  ON hand_edit_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar', 'arbiter')
    )
  );

COMMENT ON POLICY "Arbiters can view all edit requests" ON hand_edit_requests
  IS 'Users can view their own requests, arbiters+ can view all';

COMMENT ON POLICY "Arbiters can update edit requests" ON hand_edit_requests
  IS 'Arbiters, high_templars, and admins can approve/reject requests';
```

---

## 3. 보안 고려사항

### 3.1 Arbiter 권한 검증

**Server Actions에서 사용**:

```typescript
// lib/auth-utils.ts - 새 함수 추가

/**
 * Check if the user has Arbiter role or higher
 * (arbiter, high_templar, admin)
 */
export async function isArbiter(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('role, banned_at')
      .eq('id', userId)
      .single()

    if (!user) return false
    if (user.banned_at) return false  // 차단된 사용자 제외

    const arbiterRoles = ['arbiter', 'high_templar', 'admin']
    return arbiterRoles.includes(user.role)
  } catch (error) {
    console.error('Error checking Arbiter status:', error)
    return false
  }
}

/**
 * Verify user is Arbiter or higher (throws error if not)
 */
export async function verifyArbiter(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const isValid = await isArbiter(supabase, userId)
  if (!isValid) {
    throw new Error('Insufficient permissions: Arbiter role required')
  }
}
```

### 3.2 RLS 정책 테스트 시나리오

**테스트 케이스**:

1. **Arbiter 사용자**:
   - ✅ hands INSERT/UPDATE/DELETE 성공
   - ✅ hand_players INSERT/UPDATE/DELETE 성공
   - ✅ hand_actions INSERT/UPDATE/DELETE 성공
   - ❌ tournaments INSERT/UPDATE/DELETE 실패 (403 Forbidden)
   - ❌ sub_events INSERT/UPDATE/DELETE 실패
   - ❌ streams INSERT/UPDATE/DELETE 실패

2. **일반 사용자 (user)**:
   - ❌ hands INSERT/UPDATE/DELETE 실패
   - ✅ hands SELECT 성공

3. **차단된 Arbiter (banned_at IS NOT NULL)**:
   - ❌ 모든 write 작업 실패

**테스트 SQL**:

```sql
-- Arbiter 사용자로 hands INSERT 테스트
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "arbiter-user-id"}';

INSERT INTO hands (stream_id, number, description, small_blind, big_blind)
VALUES ('stream-uuid', '001', 'Test Hand', 100, 200);
-- Expected: SUCCESS

-- 일반 사용자로 hands INSERT 테스트
SET LOCAL request.jwt.claims TO '{"sub": "regular-user-id"}';

INSERT INTO hands (stream_id, number, description, small_blind, big_blind)
VALUES ('stream-uuid', '002', 'Test Hand 2', 100, 200);
-- Expected: ERROR - new row violates row-level security policy
```

### 3.3 권한 상승 방지 전략

1. **역할 변경 제한**:
   - `users.role` 컬럼은 admin만 수정 가능
   - RLS 정책으로 일반 사용자의 role 변경 차단

```sql
-- users 테이블 UPDATE 정책 (기존)
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM users WHERE id = auth.uid())  -- role 변경 금지
  );
```

2. **banned_at 체크**:
   - 모든 RLS 정책에 `banned_at IS NULL` 조건 포함
   - 차단된 사용자는 즉시 모든 write 권한 상실

3. **Audit Logging**:
   - `hand_edit_history` 테이블로 모든 수정 추적
   - 의심스러운 활동 모니터링 가능

---

## 4. API 설계

### 4.1 Server Actions 인터페이스

**파일 위치**: `app/actions/hands-manual.ts` (신규 생성)

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { verifyArbiter } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ===========================
// Input Validation Schemas
// ===========================

const HandInputSchema = z.object({
  stream_id: z.string().uuid(),
  number: z.string().min(1).max(10),
  description: z.string().min(1).max(500),
  small_blind: z.number().int().positive(),
  big_blind: z.number().int().positive(),
  ante: z.number().int().nonnegative().optional(),
  pot_size: z.number().int().nonnegative().optional(),
  pot_preflop: z.number().int().nonnegative().optional(),
  pot_flop: z.number().int().nonnegative().optional(),
  pot_turn: z.number().int().nonnegative().optional(),
  pot_river: z.number().int().nonnegative().optional(),
  board_flop: z.string().max(10).optional(),
  board_turn: z.string().max(10).optional(),
  board_river: z.string().max(10).optional(),
  video_timestamp_start: z.string().max(20).optional(),
  video_timestamp_end: z.string().max(20).optional(),
  ai_summary: z.string().max(1000).optional(),
})

const HandPlayerInputSchema = z.object({
  player_id: z.string().uuid(),
  poker_position: z.string().max(10),
  seat: z.number().int().min(1).max(10),
  starting_stack: z.number().int().nonnegative(),
  ending_stack: z.number().int().nonnegative(),
  hole_cards: z.string().max(10).optional(),
  is_winner: z.boolean().optional(),
  final_amount: z.number().int().optional(),
  hand_description: z.string().max(200).optional(),
})

const HandActionInputSchema = z.object({
  player_id: z.string().uuid(),
  action_type: z.enum(['fold', 'check', 'call', 'bet', 'raise', 'all-in', 'show', 'muck', 'win']),
  street: z.enum(['preflop', 'flop', 'turn', 'river', 'showdown']),
  amount: z.number().int().nonnegative(),
  action_order: z.number().int().positive(),
  description: z.string().max(200).optional(),
})

// ===========================
// CREATE Hand Manually
// ===========================

export async function createHandManually(input: {
  hand: z.infer<typeof HandInputSchema>
  players: z.infer<typeof HandPlayerInputSchema>[]
  actions: z.infer<typeof HandActionInputSchema>[]
}) {
  try {
    // 1. 입력 검증
    const handData = HandInputSchema.parse(input.hand)
    const playersData = input.players.map(p => HandPlayerInputSchema.parse(p))
    const actionsData = input.actions.map(a => HandActionInputSchema.parse(a))

    // 2. 인증 및 권한 검증
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    await verifyArbiter(supabase, user.id)

    // 3. Stream 존재 확인
    const { data: stream } = await supabase
      .from('streams')
      .select('id')
      .eq('id', handData.stream_id)
      .single()

    if (!stream) {
      return { success: false, error: 'Stream not found' }
    }

    // 4. 트랜잭션으로 hand + players + actions 삽입
    // (Supabase는 직접 트랜잭션 지원 안 함, RPC 함수 사용)
    const { data: result, error } = await supabase.rpc('create_hand_with_details', {
      p_hand: handData,
      p_players: playersData,
      p_actions: actionsData,
    })

    if (error) {
      console.error('Error creating hand manually:', error)
      return { success: false, error: error.message }
    }

    // 5. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath(`/archive/stream/${handData.stream_id}`)

    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

// ===========================
// UPDATE Hand Manually
// ===========================

export async function updateHandManually(input: {
  hand_id: string
  hand?: Partial<z.infer<typeof HandInputSchema>>
  players?: { id: string; data: Partial<z.infer<typeof HandPlayerInputSchema>> }[]
  actions?: { id: string; data: Partial<z.infer<typeof HandActionInputSchema>> }[]
}) {
  try {
    // 1. 인증 및 권한 검증
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    await verifyArbiter(supabase, user.id)

    // 2. Hand 존재 확인
    const { data: existingHand } = await supabase
      .from('hands')
      .select('id, stream_id')
      .eq('id', input.hand_id)
      .single()

    if (!existingHand) {
      return { success: false, error: 'Hand not found' }
    }

    // 3. Hand 업데이트 (있으면)
    if (input.hand) {
      const handData = HandInputSchema.partial().parse(input.hand)

      const { error: handError } = await supabase
        .from('hands')
        .update(handData)
        .eq('id', input.hand_id)

      if (handError) {
        return { success: false, error: handError.message }
      }
    }

    // 4. Players 업데이트 (있으면)
    if (input.players && input.players.length > 0) {
      for (const player of input.players) {
        const playerData = HandPlayerInputSchema.partial().parse(player.data)

        const { error: playerError } = await supabase
          .from('hand_players')
          .update(playerData)
          .eq('id', player.id)

        if (playerError) {
          return { success: false, error: playerError.message }
        }
      }
    }

    // 5. Actions 업데이트 (있으면)
    if (input.actions && input.actions.length > 0) {
      for (const action of input.actions) {
        const actionData = HandActionInputSchema.partial().parse(action.data)

        const { error: actionError } = await supabase
          .from('hand_actions')
          .update(actionData)
          .eq('id', action.id)

        if (actionError) {
          return { success: false, error: actionError.message }
        }
      }
    }

    // 6. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath(`/archive/stream/${existingHand.stream_id}`)
    revalidatePath(`/archive/hand/${input.hand_id}`)

    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

// ===========================
// DELETE Hand Manually
// ===========================

export async function deleteHandManually(handId: string) {
  try {
    // 1. 인증 및 권한 검증
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    await verifyArbiter(supabase, user.id)

    // 2. Hand 존재 확인
    const { data: existingHand } = await supabase
      .from('hands')
      .select('id, stream_id')
      .eq('id', handId)
      .single()

    if (!existingHand) {
      return { success: false, error: 'Hand not found' }
    }

    // 3. Hand 삭제 (CASCADE로 players, actions도 자동 삭제)
    const { error } = await supabase
      .from('hands')
      .delete()
      .eq('id', handId)

    if (error) {
      return { success: false, error: error.message }
    }

    // 4. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath(`/archive/stream/${existingHand.stream_id}`)

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}
```

### 4.2 Database RPC 함수 (트랜잭션)

**마이그레이션 파일**: `20251116000003_add_hand_rpc_functions.sql`

```sql
-- ===========================
-- 008: 핸드 생성 RPC 함수 (트랜잭션)
-- ===========================

CREATE OR REPLACE FUNCTION create_hand_with_details(
  p_hand JSONB,
  p_players JSONB,
  p_actions JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_hand_id UUID;
  v_player JSONB;
  v_action JSONB;
  v_hand_player_id UUID;
BEGIN
  -- 1. Hand 생성
  INSERT INTO hands (
    stream_id, number, description, small_blind, big_blind, ante,
    pot_size, pot_preflop, pot_flop, pot_turn, pot_river,
    board_flop, board_turn, board_river,
    video_timestamp_start, video_timestamp_end, ai_summary
  )
  VALUES (
    (p_hand->>'stream_id')::UUID,
    p_hand->>'number',
    p_hand->>'description',
    (p_hand->>'small_blind')::BIGINT,
    (p_hand->>'big_blind')::BIGINT,
    (p_hand->>'ante')::BIGINT,
    (p_hand->>'pot_size')::BIGINT,
    (p_hand->>'pot_preflop')::BIGINT,
    (p_hand->>'pot_flop')::BIGINT,
    (p_hand->>'pot_turn')::BIGINT,
    (p_hand->>'pot_river')::BIGINT,
    p_hand->>'board_flop',
    p_hand->>'board_turn',
    p_hand->>'board_river',
    p_hand->>'video_timestamp_start',
    p_hand->>'video_timestamp_end',
    p_hand->>'ai_summary'
  )
  RETURNING id INTO v_hand_id;

  -- 2. Hand Players 생성
  FOR v_player IN SELECT * FROM jsonb_array_elements(p_players)
  LOOP
    INSERT INTO hand_players (
      hand_id, player_id, poker_position, seat, starting_stack, ending_stack,
      hole_cards, is_winner, final_amount, hand_description
    )
    VALUES (
      v_hand_id,
      (v_player->>'player_id')::UUID,
      v_player->>'poker_position',
      (v_player->>'seat')::INTEGER,
      (v_player->>'starting_stack')::BIGINT,
      (v_player->>'ending_stack')::BIGINT,
      v_player->>'hole_cards',
      (v_player->>'is_winner')::BOOLEAN,
      (v_player->>'final_amount')::BIGINT,
      v_player->>'hand_description'
    );
  END LOOP;

  -- 3. Hand Actions 생성
  FOR v_action IN SELECT * FROM jsonb_array_elements(p_actions)
  LOOP
    INSERT INTO hand_actions (
      hand_id, player_id, action_type, street, amount, action_order, description
    )
    VALUES (
      v_hand_id,
      (v_action->>'player_id')::UUID,
      v_action->>'action_type',
      v_action->>'street',
      (v_action->>'amount')::BIGINT,
      (v_action->>'action_order')::INTEGER,
      v_action->>'description'
    );
  END LOOP;

  -- 4. 생성된 Hand 반환
  RETURN jsonb_build_object(
    'hand_id', v_hand_id,
    'success', true
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating hand: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_hand_with_details(JSONB, JSONB, JSONB)
  IS 'Create hand with players and actions in a single transaction (Arbiter system)';
```

### 4.3 에러 핸들링 전략

**에러 타입별 처리**:

1. **인증 에러** (401):
   - 사용자가 로그인하지 않음
   - 응답: `{ success: false, error: 'Unauthorized' }`

2. **권한 에러** (403):
   - 사용자가 Arbiter 역할이 아님
   - 응답: `{ success: false, error: 'Insufficient permissions: Arbiter role required' }`

3. **입력 검증 에러** (400):
   - Zod 스키마 검증 실패
   - 응답: `{ success: false, error: 'Invalid input: field X is required' }`

4. **데이터베이스 에러** (500):
   - RLS 정책 위반
   - 외래 키 제약 위반 (player_id 없음 등)
   - 응답: `{ success: false, error: error.message }`

**프론트엔드 에러 표시**:

```typescript
// 예시: 핸드 생성 폼
const handleSubmit = async (data: HandFormData) => {
  const result = await createHandManually(data)

  if (!result.success) {
    if (result.error === 'Unauthorized') {
      toast.error('로그인이 필요합니다')
      router.push('/login')
    } else if (result.error.includes('Insufficient permissions')) {
      toast.error('Arbiter 권한이 필요합니다')
    } else {
      toast.error(`핸드 생성 실패: ${result.error}`)
    }
    return
  }

  toast.success('핸드가 성공적으로 생성되었습니다')
  router.push(`/archive/hand/${result.data.hand_id}`)
}
```

---

## 5. 성능 최적화

### 5.1 인덱스 전략

**기존 인덱스** (유지):

```sql
-- hands 테이블
CREATE INDEX idx_hands_stream_id ON hands(stream_id);
CREATE INDEX idx_hands_number ON hands(number);
CREATE INDEX idx_hands_created_at ON hands(created_at DESC);

-- hand_players 테이블
CREATE INDEX idx_hand_players_hand_id ON hand_players(hand_id);
CREATE INDEX idx_hand_players_player_id ON hand_players(player_id);

-- hand_actions 테이블
CREATE INDEX idx_hand_actions_hand_id ON hand_actions(hand_id);
CREATE INDEX idx_hand_actions_player_id ON hand_actions(player_id);
CREATE INDEX idx_hand_actions_hand_order ON hand_actions(hand_id, action_order);
```

**새 인덱스** (추가 권장):

```sql
-- ===========================
-- 009: 성능 최적화 인덱스
-- ===========================

-- Arbiter 쿼리 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active
  ON users(role)
  WHERE role IN ('arbiter', 'high_templar', 'admin')
  AND banned_at IS NULL;

-- hand_edit_history 조회 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hand_edit_history_composite
  ON hand_edit_history(hand_id, created_at DESC);

-- hand_edit_requests Arbiter 대시보드 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hand_edit_requests_pending
  ON hand_edit_requests(status, created_at DESC)
  WHERE status = 'pending';
```

**인덱스 크기 모니터링**:

```sql
-- 인덱스 크기 확인
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 5.2 쿼리 최적화 제안

**1. Arbiter 권한 체크 쿼리**:

```sql
-- 기존 (N+1 쿼리)
SELECT role FROM users WHERE id = auth.uid();

-- 최적화 (인덱스 활용)
SELECT role FROM users
WHERE id = auth.uid()
  AND banned_at IS NULL
  AND role IN ('arbiter', 'high_templar', 'admin');
```

**2. Hand 조회 시 JOIN 최적화**:

```sql
-- 기존 (3개 쿼리)
SELECT * FROM hands WHERE stream_id = $1;
SELECT * FROM hand_players WHERE hand_id IN (hand_ids);
SELECT * FROM hand_actions WHERE hand_id IN (hand_ids);

-- 최적화 (1개 쿼리)
SELECT
  h.*,
  jsonb_agg(DISTINCT hp.*) AS players,
  jsonb_agg(DISTINCT ha.* ORDER BY ha.action_order) AS actions
FROM hands h
LEFT JOIN hand_players hp ON h.id = hp.hand_id
LEFT JOIN hand_actions ha ON h.id = ha.hand_id
WHERE h.stream_id = $1
GROUP BY h.id;
```

**3. Arbiter 활동 통계 쿼리**:

```sql
-- Arbiter별 핸드 생성 통계
SELECT
  u.nickname,
  COUNT(DISTINCT heh.hand_id) AS hands_created,
  COUNT(*) FILTER (WHERE heh.edit_type = 'update') AS hands_updated,
  MAX(heh.created_at) AS last_activity
FROM hand_edit_history heh
JOIN users u ON heh.editor_id = u.id
WHERE u.role = 'arbiter'
  AND heh.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.nickname
ORDER BY hands_created DESC;
```

---

## 6. 마이그레이션 순서

### 6.1 마이그레이션 파일 목록

**실행 순서**:

1. `20251116000001_add_arbiter_role.sql` - Arbiter 역할 추가
2. `20251116000002_add_hand_edit_history.sql` - 수정 이력 테이블 + 트리거
3. `20251116000003_add_hand_rpc_functions.sql` - RPC 함수 (트랜잭션)
4. `20251116000004_update_hand_edit_requests.sql` - 수정 요청 정책 업데이트

### 6.2 단계별 실행 계획

**로컬 환경 테스트**:

```bash
# 1. 로컬 DB 리셋 (전체 마이그레이션 재적용)
cd templar-archives
supabase db reset

# 2. 빌드 테스트
npm run build

# 3. TypeScript 타입 체크
npx tsc --noEmit

# 4. RLS 정책 테스트
node scripts/test-arbiter-rls.mjs
```

**프로덕션 배포**:

```bash
# 1. Dry-run 먼저 실행
supabase db push --dry-run

# 2. 실제 적용
supabase db push

# 3. 검증
node scripts/check-db.mjs
```

### 6.3 롤백 전략

**각 마이그레이션별 롤백 SQL**:

```sql
-- ===========================
-- ROLLBACK: 20251116000001_add_arbiter_role.sql
-- ===========================

-- Arbiter 역할 제거
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'high_templar', 'admin'));

-- 기존 Arbiter 사용자를 user로 강등
UPDATE public.users SET role = 'user' WHERE role = 'arbiter';

-- RLS 정책 복원 (hands 예시)
DROP POLICY IF EXISTS "Arbiters can insert hands" ON hands;
CREATE POLICY "Admins can insert hands"
  ON hands FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
      AND users.banned_at IS NULL
    )
  );

-- ===========================
-- ROLLBACK: 20251116000002_add_hand_edit_history.sql
-- ===========================

DROP TRIGGER IF EXISTS hands_edit_log_trigger ON hands;
DROP FUNCTION IF EXISTS log_hand_edit();
DROP TABLE IF EXISTS hand_edit_history;

-- ===========================
-- ROLLBACK: 20251116000003_add_hand_rpc_functions.sql
-- ===========================

DROP FUNCTION IF EXISTS create_hand_with_details(JSONB, JSONB, JSONB);
```

**롤백 실행 방법**:

```bash
# 1. 롤백 마이그레이션 생성
supabase migration new rollback_arbiter_system

# 2. 위 롤백 SQL을 파일에 복사

# 3. 로컬 테스트
supabase db reset

# 4. 프로덕션 적용
supabase db push
```

---

## 7. 테스트 계획

### 7.1 단위 테스트 (RLS 정책)

**파일 위치**: `scripts/test-arbiter-rls.mjs`

```javascript
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testArbiterRLS() {
  console.log('Testing Arbiter RLS Policies...\n')

  // 1. 테스트 사용자 생성
  const { data: arbiterUser } = await supabase
    .from('users')
    .insert({
      email: 'arbiter-test@example.com',
      nickname: 'arbiter-test',
      role: 'arbiter',
    })
    .select()
    .single()

  const { data: regularUser } = await supabase
    .from('users')
    .insert({
      email: 'user-test@example.com',
      nickname: 'user-test',
      role: 'user',
    })
    .select()
    .single()

  // 2. Arbiter: hands INSERT 테스트
  const arbiterClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${arbiterUser.access_token}`,
        },
      },
    }
  )

  const { data: hand, error: handError } = await arbiterClient
    .from('hands')
    .insert({
      stream_id: 'test-stream-id',
      number: '001',
      description: 'Test Hand by Arbiter',
      small_blind: 100,
      big_blind: 200,
    })
    .select()
    .single()

  console.log('✅ Arbiter INSERT hands:', hand ? 'SUCCESS' : 'FAILED')
  if (handError) console.error('Error:', handError.message)

  // 3. 일반 사용자: hands INSERT 테스트 (실패 예상)
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${regularUser.access_token}`,
        },
      },
    }
  )

  const { data: handFail, error: handFailError } = await userClient
    .from('hands')
    .insert({
      stream_id: 'test-stream-id',
      number: '002',
      description: 'Test Hand by User (should fail)',
      small_blind: 100,
      big_blind: 200,
    })
    .select()
    .single()

  console.log('✅ User INSERT hands:', handFail ? 'FAILED (unexpected)' : 'BLOCKED (expected)')
  if (handFailError) console.log('Expected error:', handFailError.message)

  // 4. Arbiter: tournaments INSERT 테스트 (실패 예상)
  const { error: tournamentError } = await arbiterClient
    .from('tournaments')
    .insert({
      name: 'Test Tournament',
      category: 'EPT',
      location: 'Test Location',
      start_date: '2025-01-01',
      end_date: '2025-01-10',
    })
    .select()
    .single()

  console.log('✅ Arbiter INSERT tournaments:', tournamentError ? 'BLOCKED (expected)' : 'SUCCESS (unexpected)')
  if (tournamentError) console.log('Expected error:', tournamentError.message)

  // 5. 정리
  await supabase.from('hands').delete().eq('id', hand.id)
  await supabase.from('users').delete().eq('id', arbiterUser.id)
  await supabase.from('users').delete().eq('id', regularUser.id)

  console.log('\n✅ All tests completed!')
}

testArbiterRLS().catch(console.error)
```

### 7.2 통합 테스트 (Server Actions)

**파일 위치**: `e2e/arbiter-hands.spec.ts` (Playwright)

```typescript
import { test, expect } from '@playwright/test'

test.describe('Arbiter Hand Management', () => {
  test.beforeEach(async ({ page }) => {
    // Arbiter 사용자로 로그인
    await page.goto('/login')
    await page.fill('input[name="email"]', 'arbiter@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/archive')
  })

  test('Arbiter can create hand manually', async ({ page }) => {
    await page.goto('/archive/stream/test-stream-id')
    await page.click('button:has-text("Add Hand Manually")')

    // 폼 입력
    await page.fill('input[name="number"]', '001')
    await page.fill('textarea[name="description"]', 'Test Hand')
    await page.fill('input[name="small_blind"]', '100')
    await page.fill('input[name="big_blind"]', '200')

    // 플레이어 추가
    await page.click('button:has-text("Add Player")')
    // ... (플레이어 입력)

    // 제출
    await page.click('button[type="submit"]')

    // 성공 메시지 확인
    await expect(page.locator('text=핸드가 성공적으로 생성되었습니다')).toBeVisible()
  })

  test('Arbiter cannot create tournament', async ({ page }) => {
    await page.goto('/admin/tournaments/new')

    // 403 에러 또는 권한 없음 메시지
    await expect(page.locator('text=권한이 없습니다')).toBeVisible()
  })

  test('Arbiter can view hand edit history', async ({ page }) => {
    await page.goto('/archive/hand/test-hand-id')
    await page.click('button:has-text("Edit History")')

    // 수정 이력 표시 확인
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('td:has-text("create")')).toBeVisible()
  })
})
```

---

## 8. 모니터링 및 운영

### 8.1 Arbiter 활동 대시보드

**SQL 쿼리**:

```sql
-- Arbiter별 활동 요약 (최근 30일)
SELECT
  u.id,
  u.nickname,
  u.email,
  COUNT(DISTINCT heh.hand_id) FILTER (WHERE heh.edit_type = 'create') AS hands_created,
  COUNT(DISTINCT heh.hand_id) FILTER (WHERE heh.edit_type = 'update') AS hands_updated,
  COUNT(DISTINCT heh.hand_id) FILTER (WHERE heh.edit_type = 'delete') AS hands_deleted,
  COUNT(DISTINCT her.id) FILTER (WHERE her.status = 'approved') AS requests_approved,
  COUNT(DISTINCT her.id) FILTER (WHERE her.status = 'rejected') AS requests_rejected,
  MAX(heh.created_at) AS last_activity,
  u.created_at AS arbiter_since
FROM users u
LEFT JOIN hand_edit_history heh ON u.id = heh.editor_id
  AND heh.created_at > NOW() - INTERVAL '30 days'
LEFT JOIN hand_edit_requests her ON u.id = her.reviewed_by
  AND her.reviewed_at > NOW() - INTERVAL '30 days'
WHERE u.role = 'arbiter'
  AND u.banned_at IS NULL
GROUP BY u.id, u.nickname, u.email, u.created_at
ORDER BY hands_created DESC;
```

### 8.2 이상 활동 감지

**알림 트리거**:

```sql
-- 1시간에 100개 이상 핸드 생성 (비정상 활동)
SELECT
  editor_id,
  COUNT(*) AS hands_count,
  MIN(created_at) AS first_edit,
  MAX(created_at) AS last_edit
FROM hand_edit_history
WHERE edit_type = 'create'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY editor_id
HAVING COUNT(*) > 100;

-- 동일 핸드 10회 이상 수정 (의심스러운 활동)
SELECT
  hand_id,
  editor_id,
  COUNT(*) AS edit_count
FROM hand_edit_history
WHERE edit_type = 'update'
  AND created_at > NOW() - INTERVAL '1 day'
GROUP BY hand_id, editor_id
HAVING COUNT(*) > 10;
```

### 8.3 성능 모니터링

**Supabase Dashboard**:

1. **쿼리 성능**:
   - `hands` 테이블 INSERT/UPDATE 평균 응답 시간
   - RLS 정책 평가 시간

2. **인덱스 사용률**:
   - `idx_users_role_active` 사용 빈도
   - `idx_hand_edit_history_composite` 효과

3. **트랜잭션 성공률**:
   - `create_hand_with_details` RPC 함수 성공률

---

## 9. 문서 업데이트

### 9.1 수정 필요 문서

**1. CLAUDE.md**:
- 사용자 역할 목록에 `arbiter` 추가
- RLS 정책 예시 업데이트

**2. lib/auth-utils.ts**:
- `isArbiter()` 함수 추가
- `verifyArbiter()` 함수 추가
- `isHighTemplar()`에 `arbiter` 포함 여부 결정 (현재는 제외)

**3. README.md**:
- 역할 시스템 섹션에 Arbiter 설명 추가

**4. WORK_LOG.md**:
- Phase 40: Arbiter 역할 시스템 구축 기록

---

## 10. 향후 확장 계획

### 10.1 Arbiter 전용 UI

**페이지**: `/arbiter/dashboard`

**기능**:
- 핸드 수동 입력 폼
- 내가 작성한 핸드 목록
- 수정 요청 검토 대시보드
- 활동 통계 (핸드 생성/수정 수)

### 10.2 Arbiter 교육 시스템

**기능**:
- 핸드 입력 가이드라인
- 예제 핸드 템플릿
- 자주 묻는 질문 (FAQ)
- 신입 Arbiter 온보딩 체크리스트

### 10.3 품질 관리 시스템

**기능**:
- Arbiter 간 핸드 교차 검증
- AI 분석 결과와 수동 입력 비교
- 정확도 점수 시스템
- 월간 Arbiter 평가

---

## 11. 부록

### 11.1 전체 마이그레이션 파일

마이그레이션 파일들은 다음 섹션에서 제공됩니다:
- `20251116000001_add_arbiter_role.sql`
- `20251116000002_add_hand_edit_history.sql`
- `20251116000003_add_hand_rpc_functions.sql`
- `20251116000004_update_hand_edit_requests.sql`

### 11.2 타입 정의 업데이트

**lib/types/users.ts** (신규 또는 수정):

```typescript
export type UserRole = 'user' | 'templar' | 'arbiter' | 'high_templar' | 'admin'

export interface User {
  id: string
  email: string
  nickname: string
  role: UserRole
  banned_at: string | null
  // ... 기타 필드
}

// 권한 체크 헬퍼
export function hasArbiterPermission(role: UserRole): boolean {
  return ['arbiter', 'high_templar', 'admin'].includes(role)
}

export function hasHighTemplarPermission(role: UserRole): boolean {
  return ['high_templar', 'admin'].includes(role)
}

export function hasAdminPermission(role: UserRole): boolean {
  return role === 'admin'
}
```

### 11.3 참고 자료

1. **Supabase RLS 공식 문서**: https://supabase.com/docs/guides/auth/row-level-security
2. **PostgreSQL 트리거**: https://www.postgresql.org/docs/current/triggers.html
3. **Zod 검증 라이브러리**: https://zod.dev/
4. **Next.js Server Actions**: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions

---

**끝**: 이 문서는 Arbiter 역할 시스템의 전체 아키텍처를 정의하며, 실제 구현 시 참고 자료로 사용됩니다.
