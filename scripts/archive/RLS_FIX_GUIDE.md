# RLS SELECT 정책 수정 가이드

## 문제 상황

프로덕션 환경에서 `tournaments` 테이블 조회 시 **400 에러** 발생:

```
https://diopilmkehygiqpizvga.supabase.co/rest/v1/tournaments?select=id,name,year&order=year.desc&limit=50
Failed to load resource: the server responded with a status of 400 ()
```

**에러 원인**:
- RLS (Row Level Security) SELECT 정책에 `TO` 절이 명시되지 않음
- 기본값이 `authenticated`로 설정되어 익명 사용자(anon key) 접근 불가

## 해결 방법

### 옵션 1: Supabase Dashboard SQL Editor (권장)

1. **Supabase Dashboard 접속**:
   ```
   https://supabase.com/dashboard/project/diopilmkehygiqpizvga/sql/new
   ```

2. **SQL 파일 복사**:
   - 파일: `scripts/rls-fix-manual.sql`
   - 전체 내용을 복사하여 SQL Editor에 붙여넣기

3. **실행**:
   - "Run" 버튼 클릭
   - 모든 정책이 재생성됨

### 옵션 2: Supabase CLI (로컬 CLI 문제 시)

```bash
# 마이그레이션 적용 (dry-run 먼저)
supabase db push --dry-run

# 실제 적용
supabase db push
```

**주의**: 현재 로컬 Supabase CLI가 응답하지 않는 상태이므로 옵션 1 권장

## 적용되는 변경사항

### 수정 대상 테이블 (7개)

1. `tournaments`
2. `sub_events`
3. `streams`
4. `hands`
5. `players`
6. `hand_players`
7. `hand_actions`

### 각 테이블의 변경사항

**Before (기존 정책)**:
```sql
CREATE POLICY "Anyone can view tournaments"
  ON tournaments
  FOR SELECT
  USING (true);
-- ❌ TO 절 없음 → 기본값 authenticated
```

**After (수정된 정책)**:
```sql
CREATE POLICY "Public can read tournaments"
  ON tournaments
  FOR SELECT
  TO public  -- ✅ 명시적으로 public 권한 부여
  USING (true);
```

## 검증 방법

### 1. 스크립트로 확인

```bash
node scripts/check-rls-policies.mjs
```

**예상 출력**:
```
🔍 Checking RLS policies for core tables...

📋 tournaments:
   ✅ 정책 확인됨

🧪 Testing actual SELECT access (anonymous)...

✅ tournaments: SELECT works (1 rows)
✅ sub_events: SELECT works (1 rows)
```

### 2. 브라우저 콘솔에서 확인

프로덕션 사이트에서 Archive 페이지 접속:
```
https://templar-archives.vercel.app/archive
```

- ✅ 성공: Tournament 목록이 정상적으로 표시됨
- ❌ 실패: "Failed to load tournaments" 에러

### 3. REST API 직접 테스트

```bash
curl 'https://diopilmkehygiqpizvga.supabase.co/rest/v1/tournaments?select=id,name,year&limit=1' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

- ✅ 성공: JSON 데이터 반환
- ❌ 실패: 400 또는 401 에러

## 롤백 방법

만약 문제가 발생하면 이전 정책으로 복구:

```sql
-- 예시: tournaments 테이블만 복구
DROP POLICY IF EXISTS "Public can read tournaments" ON tournaments;

CREATE POLICY "Anyone can view tournaments"
  ON tournaments
  FOR SELECT
  USING (true);
```

## 추가 정보

### RLS 정책 구조

- **TO public**: 익명(`anon`) + 인증(`authenticated`) 모두 포함
- **TO authenticated**: 로그인 사용자만
- **TO anon**: 익명 사용자만 (거의 사용 안 함)

### 영향받는 페이지

1. **Archive 페이지** (`/archive`):
   - Tournament 목록
   - SubEvent 계층
   - Stream/Day 목록
   - Hand 목록

2. **Homepage** (`/`):
   - Featured tournaments

3. **Search** (`/search`):
   - Tournament 검색 결과

## 트러블슈팅

### Q1: "pg_policies 테이블을 찾을 수 없습니다"

A: 정상입니다. Supabase JS 클라이언트는 `pg_policies` 시스템 뷰에 접근할 수 없습니다. 대신 실제 SELECT 테스트 결과를 확인하세요.

### Q2: 여전히 400 에러가 발생합니다

A: 다음을 확인하세요:
1. 브라우저 캐시 삭제 (Cmd+Shift+R)
2. Vercel 캐시 재배포: `vercel --prod --force`
3. Supabase에서 정책이 실제로 적용되었는지 Dashboard 확인

### Q3: 다른 테이블도 같은 문제가 있나요?

A: 가능성 있습니다. 다음 명령으로 확인:
```bash
node scripts/check-rls-policies.mjs
```

### Q4: 프로덕션에 어떻게 적용하나요?

A:
1. Supabase Dashboard SQL Editor 사용 (가장 빠름)
2. 또는 `supabase db push` (로컬 CLI 정상 동작 시)
3. 적용 후 Vercel 재배포 불필요 (DB만 변경)

## 관련 파일

- **마이그레이션**: `supabase/migrations/20251113091025_fix_tournaments_rls_select.sql`
- **수동 적용 SQL**: `scripts/rls-fix-manual.sql`
- **검증 스크립트**: `scripts/check-rls-policies.mjs`
- **이 가이드**: `scripts/RLS_FIX_GUIDE.md`

## 연락처

문제가 지속되면 Supabase 대시보드에서 직접 정책을 확인하거나 로그를 확인하세요.
