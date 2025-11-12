# HAE 백엔드 안정성 강화 보고서

**작업 일자**: 2025-11-12
**커밋**: 88544ef
**작업 파일**:
- `app/actions/hae-analysis.ts` (688줄 → 849줄, +161줄)
- `supabase/migrations/20251112000001_add_hand_transaction_functions.sql` (신규)

---

## 목차
1. [개요](#개요)
2. [구현 내용](#구현-내용)
3. [코드 변경 상세](#코드-변경-상세)
4. [테스트 방법](#테스트-방법)
5. [남은 개선 과제](#남은-개선-과제)

---

## 개요

AI 분석 시스템(`hae-analysis.ts`)의 백엔드 안정성을 강화하기 위해 3가지 핵심 기능을 구현했습니다:

1. **중복 분석 방지** - 같은 비디오 + 세그먼트 조합 재분석 차단
2. **에러 복구 메커니즘** - 세그먼트별 성공/실패 추적 및 부분 실패 허용
3. **트랜잭션 처리** - 핸드 데이터 저장 시 원자성 보장

---

## 구현 내용

### 1. 중복 분석 방지 (소요 시간: 1시간)

#### 구현 방법
- PostgreSQL RPC 함수 `check_duplicate_analysis` 생성
- `startHaeAnalysis()` 함수에서 분석 시작 전 중복 체크 수행

#### 작동 원리
```sql
-- 같은 video_id에 대해 pending/processing/completed 상태의
-- 기존 작업 중 세그먼트가 겹치는 것이 있는지 확인
SELECT aj.id, aj.status, aj.segments
FROM analysis_jobs aj
WHERE aj.video_id = p_video_id
  AND aj.status IN ('pending', 'processing', 'completed')
  AND EXISTS (
    -- JSONB 배열에서 start/end가 동일한 세그먼트 찾기
    SELECT 1
    FROM jsonb_array_elements(aj.segments) AS existing_seg,
         jsonb_array_elements(p_segments) AS new_seg
    WHERE (existing_seg->>'start')::int = (new_seg->>'start')::int
      AND (existing_seg->>'end')::int = (new_seg->>'end')::int
  );
```

#### TypeScript 코드
```typescript
async function checkDuplicateAnalysis(
  videoId: string,
  segments: TimeSegment[],
  supabase: TypedSupabaseClient
): Promise<{ isDuplicate: boolean; error?: string; existingJobId?: string }> {
  const { data, error } = await supabase.rpc('check_duplicate_analysis', {
    p_video_id: videoId,
    p_segments: segments,
  })

  if (data && data.length > 0) {
    const existingJob = data[0]
    return {
      isDuplicate: true,
      existingJobId: existingJob.job_id,
      error: `이미 ${existingJob.status === 'completed' ? '완료된' : '분석 중인'}
              세그먼트가 포함되어 있습니다. (Job ID: ${existingJob.job_id})`
    }
  }

  return { isDuplicate: false }
}
```

#### 에러 메시지 예시
```
"이미 완료된 세그먼트가 포함되어 있습니다. (Job ID: abc-123)"
"이미 분석 중인 세그먼트가 포함되어 있습니다. (Job ID: def-456)"
```

---

### 2. 에러 복구 메커니즘 (소요 시간: 1.5시간)

#### 구현 방법
- 세그먼트별 결과 추적을 위한 `SegmentResult` 타입 정의
- `processHaeJob()` 함수 전체 리팩토링
- `analysis_jobs.result` JSONB 필드에 상세 결과 저장

#### 새로운 타입 정의
```typescript
interface SegmentResult {
  segment_id: string          // 예: "seg_0_30_900"
  segment_index: number       // 0-based index
  status: 'success' | 'failed'
  hands_found?: number        // 성공한 핸드 수
  error?: string              // 실패 원인
  processing_time?: number    // 처리 시간 (초)
}

interface JobResult {
  success: boolean             // 전체 성공 여부
  segments_processed: number   // 성공한 세그먼트 수
  segments_failed: number      // 실패한 세그먼트 수
  segment_results: SegmentResult[]  // 각 세그먼트 상세 결과
  total_hands: number          // 저장된 총 핸드 수
  errors: string[]             // 모든 에러 메시지 배열
}
```

#### Before: 세그먼트 처리 (기존 코드)
```typescript
// 세그먼트 하나 실패하면 전체 중단
for (const segment of segments) {
  await processSegment(segment)  // 여기서 에러 발생 시 전체 중단
}
```

#### After: 세그먼트 처리 (개선 코드)
```typescript
const segmentResults: SegmentResult[] = []
const globalErrors: string[] = []

for (let i = 0; i < segments.length; i++) {
  const segment = segments[i]
  const segmentStartTime = Date.now()

  const segmentResult: SegmentResult = {
    segment_id: `seg_${i}_${segment.start}_${segment.end}`,
    segment_index: i,
    status: 'failed',  // 기본값은 실패
  }

  try {
    // 세그먼트 처리
    const analysisResult = await processSegment(segment)

    // 성공 시 결과 저장
    segmentResult.status = 'success'
    segmentResult.hands_found = analysisResult.hands.length
    segmentResult.processing_time = Math.round((Date.now() - segmentStartTime) / 1000)

  } catch (segmentError) {
    // 실패해도 다음 세그먼트 계속 진행
    segmentResult.status = 'failed'
    segmentResult.error = segmentError.message
    segmentResult.processing_time = Math.round((Date.now() - segmentStartTime) / 1000)
    globalErrors.push(`Segment ${i}: ${segmentResult.error}`)
  }

  segmentResults.push(segmentResult)
}

// 최종 결과 계산
const segmentsProcessed = segmentResults.filter(r => r.status === 'success').length
const segmentsFailed = segmentResults.filter(r => r.status === 'failed').length

// DB에 저장
await supabase
  .from('analysis_jobs')
  .update({
    status: segmentsFailed === segments.length ? 'failed' : 'completed',
    result: { success, segments_processed, segments_failed, segment_results, total_hands, errors }
  })
```

#### 결과 예시 (analysis_jobs.result 필드)
```json
{
  "success": false,
  "segments_processed": 3,
  "segments_failed": 1,
  "total_hands": 45,
  "errors": [
    "Segment 2: 백엔드 요청 타임아웃 (5분 초과)"
  ],
  "segment_results": [
    {
      "segment_id": "seg_0_30_900",
      "segment_index": 0,
      "status": "success",
      "hands_found": 15,
      "processing_time": 180
    },
    {
      "segment_id": "seg_1_900_1800",
      "segment_index": 1,
      "status": "success",
      "hands_found": 20,
      "processing_time": 195
    },
    {
      "segment_id": "seg_2_1800_2700",
      "segment_index": 2,
      "status": "failed",
      "error": "백엔드 요청 타임아웃 (5분 초과)",
      "processing_time": 300
    },
    {
      "segment_id": "seg_3_2700_3600",
      "segment_index": 3,
      "status": "success",
      "hands_found": 10,
      "processing_time": 150
    }
  ]
}
```

---

### 3. 트랜잭션 처리 (소요 시간: 1.5시간)

#### 구현 방법
- PostgreSQL RPC 함수 `save_hand_with_players_actions` 생성
- `storeHandsFromSegment()` 함수를 RPC 호출 방식으로 변경

#### Before: 비트랜잭션 방식 (기존 코드)
```typescript
// 3단계로 나뉘어 있어 중간에 실패하면 불완전한 데이터 남음
async function storeHandsFromSegment(...): Promise<void> {
  for (const handData of hands) {
    // 1. Hand 저장
    const { data: hand } = await supabase.from('hands').insert({...})

    // ❌ 여기서 실패하면 hand는 저장되었지만 player 없음

    // 2. Hand Players 저장
    for (const player of handData.players) {
      await supabase.from('hand_players').insert({...})

      // ❌ 여기서 실패하면 actions는 저장 안됨

      // 3. Hand Actions 저장
      for (const action of handData.actions) {
        await supabase.from('hand_actions').insert({...})
      }
    }
  }
}
```

#### After: 트랜잭션 방식 (개선 코드)
```typescript
async function storeHandsFromSegment(...)
  : Promise<{ success: number; failed: number; errors: string[] }> {

  let successCount = 0
  let failedCount = 0
  const errors: string[] = []

  for (const handData of hands) {
    try {
      // 플레이어 ID 미리 확보
      const playerIdMap = new Map<string, string>()
      for (const player of handData.players) {
        const playerId = await findOrCreatePlayer(supabase, player.name)
        playerIdMap.set(player.name, playerId)
      }

      // 데이터 준비
      const playersData = preparePlayersData(handData, playerIdMap)
      const actionsData = prepareActionsData(handData, playerIdMap)

      // ✅ RPC로 한 번에 저장 (원자적)
      const { data: newHandId, error } = await supabase.rpc(
        'save_hand_with_players_actions',
        {
          p_day_id: streamId,
          p_job_id: jobId,
          p_number: String(handData.handNumber),
          p_description: handData.description,
          // ... 모든 hand 데이터
          p_players: playersData,   // JSONB 배열
          p_actions: actionsData,   // JSONB 배열
        }
      )

      if (error) throw new Error(error.message)

      successCount++

    } catch (error) {
      // 실패해도 다른 핸드는 계속 저장
      failedCount++
      errors.push(`Hand ${handData.handNumber}: ${error.message}`)
    }
  }

  return { success: successCount, failed: failedCount, errors }
}
```

#### PostgreSQL RPC 함수
```sql
CREATE OR REPLACE FUNCTION save_hand_with_players_actions(
  -- 모든 파라미터...
  p_players JSONB,
  p_actions JSONB
) RETURNS UUID AS $$
DECLARE
  v_hand_id UUID;
BEGIN
  -- 1. Hand INSERT
  INSERT INTO hands (...) VALUES (...) RETURNING id INTO v_hand_id;

  -- 2. Players INSERT (루프)
  FOR v_player IN SELECT * FROM jsonb_array_elements(p_players)
  LOOP
    INSERT INTO hand_players (...) VALUES (...);
  END LOOP;

  -- 3. Actions INSERT (루프)
  FOR v_action IN SELECT * FROM jsonb_array_elements(p_actions)
  LOOP
    INSERT INTO hand_actions (...) VALUES (...);
  END LOOP;

  RETURN v_hand_id;

EXCEPTION
  WHEN OTHERS THEN
    -- ✅ 자동 롤백 (PostgreSQL 함수 특성)
    RAISE EXCEPTION 'Failed to save hand: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 장점
1. **원자성**: 3개 테이블 저장이 모두 성공하거나 모두 실패 (불완전한 데이터 없음)
2. **성능**: 네트워크 왕복 감소 (3N번 → 1번)
3. **에러 추적**: 핸드별 성공/실패 기록

---

## 코드 변경 상세

### 파일 1: `supabase/migrations/20251112000001_add_hand_transaction_functions.sql`

#### 1.1 analysis_jobs 테이블 확장
```sql
-- created_by 컬럼 추가 (사용자 추적)
ALTER TABLE analysis_jobs ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- result 컬럼 추가 (상세 결과 저장)
ALTER TABLE analysis_jobs ADD COLUMN result JSONB;

-- 인덱스 추가 (Rate Limiting 성능 향상)
CREATE INDEX idx_analysis_jobs_created_by_created_at
  ON analysis_jobs(created_by, created_at DESC);
```

#### 1.2 중복 체크 RPC 함수
```sql
CREATE FUNCTION check_duplicate_analysis(
  p_video_id UUID,
  p_segments JSONB
) RETURNS TABLE(job_id UUID, status TEXT, segments JSONB)
```

#### 1.3 트랜잭션 RPC 함수
```sql
CREATE FUNCTION save_hand_with_players_actions(
  -- 13개 hand 필드
  -- p_players JSONB 배열
  -- p_actions JSONB 배열
) RETURNS UUID
```

### 파일 2: `app/actions/hae-analysis.ts`

#### 2.1 새로운 타입 (3개)
```typescript
interface SegmentResult { ... }
interface JobResult { ... }
// (HaeStartInput, HaeStartResult는 기존 유지)
```

#### 2.2 새로운 함수 (1개)
```typescript
async function checkDuplicateAnalysis(
  videoId: string,
  segments: TimeSegment[],
  supabase: TypedSupabaseClient
): Promise<{ isDuplicate: boolean; error?: string; existingJobId?: string }>
```

#### 2.3 수정된 함수 (3개)

**storeHandsFromSegment**
- 반환 타입: `Promise<void>` → `Promise<{ success: number; failed: number; errors: string[] }>`
- 로직: 직접 INSERT → RPC 호출
- 에러 처리: throw → try-catch + continue

**startHaeAnalysis**
- 중복 체크 추가
- `created_by` 필드 추가

**processHaeJob**
- 세그먼트 결과 추적 추가
- 부분 실패 허용
- `result` JSONB 저장
- `hands_found`, `processing_time` 자동 업데이트

---

## 테스트 방법

### 1. 중복 분석 방지 테스트

#### 테스트 1: 동일 세그먼트 재분석 차단
```typescript
// 1단계: 첫 번째 분석 요청
const result1 = await startHaeAnalysis({
  videoUrl: 'https://youtube.com/watch?v=TEST123',
  segments: [{ start: 0, end: 900, type: 'gameplay' }],
  platform: 'ept'
})
// 예상: { success: true, jobId: 'abc-123' }

// 2단계: 동일 세그먼트 재분석 시도
const result2 = await startHaeAnalysis({
  videoUrl: 'https://youtube.com/watch?v=TEST123',
  segments: [{ start: 0, end: 900, type: 'gameplay' }],
  platform: 'ept'
})
// 예상: { success: false, error: '이미 분석 중인 세그먼트가 포함...' }
```

#### 테스트 2: 다른 세그먼트는 허용
```typescript
const result3 = await startHaeAnalysis({
  videoUrl: 'https://youtube.com/watch?v=TEST123',
  segments: [{ start: 900, end: 1800, type: 'gameplay' }],  // 다른 세그먼트
  platform: 'ept'
})
// 예상: { success: true, jobId: 'def-456' }
```

### 2. 에러 복구 메커니즘 테스트

#### 테스트 3: Python 백엔드 일부 세그먼트 타임아웃
```bash
# Python 백엔드 중단하여 타임아웃 유발
docker stop hae-backend

# 분석 요청 (4개 세그먼트)
# 예상: 일부는 성공, 일부는 타임아웃 실패
```

#### 테스트 4: 결과 확인
```sql
-- analysis_jobs 테이블 확인
SELECT
  id,
  status,  -- 'completed' (부분 성공) 또는 'failed' (전체 실패)
  hands_found,
  result->>'segments_processed' as processed,
  result->>'segments_failed' as failed,
  result->'segment_results' as details
FROM analysis_jobs
WHERE id = 'job-id';
```

예상 결과:
```json
{
  "id": "job-id",
  "status": "completed",
  "hands_found": 30,
  "processed": "3",
  "failed": "1",
  "details": [
    { "segment_index": 0, "status": "success", "hands_found": 10 },
    { "segment_index": 1, "status": "success", "hands_found": 12 },
    { "segment_index": 2, "status": "failed", "error": "타임아웃" },
    { "segment_index": 3, "status": "success", "hands_found": 8 }
  ]
}
```

### 3. 트랜잭션 처리 테스트

#### 테스트 5: 핸드 저장 중 에러 주입
```sql
-- 테스트용: hand_actions 테이블에 제약 조건 추가
ALTER TABLE hand_actions ADD CONSTRAINT test_constraint
  CHECK (amount >= 0 AND amount < 999999999);

-- 이제 amount가 범위를 벗어나면 전체 핸드가 저장 안됨 (롤백)
```

#### 테스트 6: 원자성 확인
```sql
-- 분석 실행 후 확인
SELECT
  h.id as hand_id,
  COUNT(DISTINCT hp.id) as players_count,
  COUNT(DISTINCT ha.id) as actions_count
FROM hands h
LEFT JOIN hand_players hp ON h.id = hp.hand_id
LEFT JOIN hand_actions ha ON h.id = ha.hand_id
WHERE h.job_id = 'test-job-id'
GROUP BY h.id
HAVING COUNT(DISTINCT hp.id) = 0 OR COUNT(DISTINCT ha.id) = 0;

-- 예상: 결과 없음 (모든 핸드가 완전하게 저장됨)
```

### 4. 통합 테스트

#### 테스트 7: 실제 분석 워크플로우
```typescript
// 1. 중복 없는 새 분석 시작
const result = await startHaeAnalysis({
  videoUrl: 'https://youtube.com/watch?v=EPT_2025',
  segments: [
    { start: 0, end: 900, type: 'gameplay' },
    { start: 1200, end: 2100, type: 'gameplay' },
    { start: 2400, end: 3300, type: 'gameplay' }
  ],
  platform: 'ept'
})

// 2. Job 상태 폴링
const job = await getHaeJob(result.jobId)
console.log(job.status, job.progress, job.hands_found)

// 3. 완료 후 결과 확인
console.log(job.result)
```

예상 출력:
```
status: completed
progress: 100
hands_found: 42
result: {
  success: true,
  segments_processed: 3,
  segments_failed: 0,
  total_hands: 42,
  segment_results: [...]
}
```

### 5. 성능 테스트

#### 테스트 8: 대량 핸드 저장 성능
```bash
# Before (비트랜잭션): 100 핸드 × (1 + 8×2 + 20×3) = 7700 쿼리
# After (트랜잭션): 100 핸드 × 1 RPC = 100 호출

# 시간 측정
time curl -X POST http://localhost:3000/api/analyze ...

# 예상 성능 향상: 3-5배
```

---

## 남은 개선 과제

### 1. 재시도 메커니즘 (우선순위: 중)
**현재 상태**: 세그먼트 실패 시 1회만 시도
**개선안**:
- 실패한 세그먼트만 재분석하는 기능
- `analysis_jobs` 테이블에 `retry_count` 필드 추가
- UI에서 "실패한 세그먼트만 재시도" 버튼 제공

```typescript
async function retryFailedSegments(jobId: string): Promise<HaeStartResult> {
  const job = await getHaeJob(jobId)
  const failedSegments = job.result.segment_results
    .filter(r => r.status === 'failed')
    .map(r => job.segments[r.segment_index])

  // 실패한 세그먼트만 재분석
  return startHaeAnalysis({
    videoUrl: job.video.url,
    segments: failedSegments,
    platform: job.platform
  })
}
```

### 2. 우선순위 큐 (우선순위: 낮)
**현재 상태**: 먼저 요청한 순서대로 처리
**개선안**:
- 관리자 요청은 우선 처리
- `analysis_jobs` 테이블에 `priority` 필드 추가 (1-10)
- Python 백엔드에서 우선순위 기반 처리

### 3. 예상 시간 표시 (우선순위: 낮)
**현재 상태**: 진행률만 표시 (0-100%)
**개선안**:
- 과거 데이터 기반 예상 소요 시간 계산
- UI에 "약 5분 남음" 표시

```typescript
// 평균 처리 시간 계산
const avgTimePerSegment = await supabase
  .from('analysis_jobs')
  .select('processing_time, segments')
  .eq('status', 'completed')
  .limit(100)

const avgTime = avgTimePerSegment.reduce((acc, job) =>
  acc + job.processing_time / job.segments.length, 0
) / 100

const estimatedTime = remainingSegments * avgTime
```

### 4. 캐싱 (우선순위: 중)
**현재 상태**: 동일 세그먼트 재분석 불가 (중복 방지)
**개선안**:
- Python 백엔드에서 AI 응답 캐싱
- Redis 사용 시 동일 세그먼트 재요청 시 즉시 응답
- `analysis_jobs` 테이블에 `cache_hit` 필드 추가

### 5. 모니터링 및 알림 (우선순위: 중)
**현재 상태**: 콘솔 로그만
**개선안**:
- Sentry 또는 LogRocket 통합
- 실패율 높을 때 관리자 이메일 알림
- Slack/Discord 웹훅

```typescript
if (job.result.segments_failed / job.segments.length > 0.5) {
  await sendAlert({
    type: 'high_failure_rate',
    jobId: job.id,
    failureRate: job.result.segments_failed / job.segments.length
  })
}
```

### 6. 상세 로그 저장 (우선순위: 낮)
**현재 상태**: `result` JSONB에 요약만
**개선안**:
- `analysis_logs` 테이블 신규 생성
- 각 세그먼트의 Python 백엔드 요청/응답 전체 저장
- 디버깅 및 품질 개선에 활용

```sql
CREATE TABLE analysis_logs (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES analysis_jobs(id),
  segment_index INTEGER,
  request_body JSONB,
  response_body JSONB,
  error_stack TEXT,
  created_at TIMESTAMPTZ
);
```

---

## 결론

3가지 핵심 기능이 성공적으로 구현되었습니다:

1. ✅ **중복 분석 방지**: RPC 함수로 세그먼트 겹침 검사
2. ✅ **에러 복구 메커니즘**: 부분 실패 허용 + 상세 결과 추적
3. ✅ **트랜잭션 처리**: RPC 함수로 원자적 핸드 저장

**개선 효과**:
- 데이터 일관성 보장 (트랜잭션)
- 사용자 경험 향상 (부분 실패 허용)
- 비용 절감 (중복 분석 방지)
- 디버깅 편의성 (상세 로그)

**기존 기능 유지**:
- Rate Limiting (5/hour)
- Authorization (High Templar+)
- Timeout (5분/10분)
- 타입 안전성
- 메모리 누수 방지

**빌드 상태**: ✅ 성공 (46 페이지 생성)
**마이그레이션**: ✅ 적용 완료
**커밋**: 88544ef

---

**작성자**: Claude Code (Sonnet 4.5)
**검토자**: [검토 필요]
**승인자**: [승인 필요]
