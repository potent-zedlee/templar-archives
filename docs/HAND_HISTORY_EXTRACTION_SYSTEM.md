# Hand History Automatic Extraction System

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [아키텍처](#아키텍처)
3. [기술 스택](#기술-스택)
4. [구현 완료 Phase](#구현-완료-phase)
5. [API 명세](#api-명세)
6. [사용 가이드](#사용-가이드)
7. [비용 및 성능](#비용-및-성능)

---

## 시스템 개요

### 목적
사용자가 입력한 타임코드 정보를 기반으로 YouTube 영상에서 자동으로 핸드 히스토리를 추출하는 완전 자동화 시스템

### 핵심 기능
- ✅ **OCR 영역 설정**: 비디오 플레이어에서 2개 영역(플레이어 카드, 보드+팟) 드래그 지정
- ✅ **프레임 추출**: YouTube 영상에서 2초 간격 프레임 추출 (FFmpeg, 1280x720)
- ✅ **OCR 처리**: Tesseract.js로 텍스트 추출 (무료)
- ✅ **Vision AI 분석**: Claude Vision Batch API로 핸드 시퀀스 분석 (50% 할인)
- ✅ **실시간 진행 상황**: Server-Sent Events로 6단계 진행률 표시
- ✅ **에러 처리**: 재시도 로직, 리소스 정리, 구조화된 로깅
- ✅ **관리자 UI**: Progress Dialog, Batch Status 확인

### 워크플로우
```
1. 사용자 타임코드 제출 (SingleHandInputPanel)
   ↓
2. 관리자 승인 (pending → approved)
   ↓
3. OCR 영역 설정 (VideoPlayerOcrOverlay)
   - 2개 영역 드래그 (player, board)
   - Percent-based 좌표 저장
   ↓
4. AI 자동 추출 시작 (SSE Progress Dialog)
   Step 1: YouTube 스트림 URL 획득 (ytdl-core)
   Step 2: 프레임 추출 (FFmpeg, 2초 간격)
   Step 3: OCR 영역 크롭 (Sharp)
   Step 4: OCR 텍스트 추출 (Tesseract.js)
   Step 5: Batch 요청 생성 (18프레임/배치)
   Step 6: Claude Vision API 제출
   ↓
5. Batch 처리 대기 (10-24시간)
   - 30초마다 자동 상태 확인
   - BatchStatusDialog로 진행 상황 표시
   ↓
6. Batch 완료 후 결과 다운로드
   - VisionBatchResult[] 파싱
   - HandHistory 객체 생성
   - timecode_submissions.ai_extracted_data 저장
   ↓
7. 관리자 검수 (review → completed)
   - HandHistory 시각화
   - hands 테이블 생성
```

---

## 아키텍처

### 시스템 다이어그램

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                         │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  [Admin: Timecode Submissions Page]                           │
│    ├─ OCR Setup Dialog (VideoPlayerOcrOverlay)                │
│    ├─ Extraction Progress Dialog (SSE 실시간)                 │
│    └─ Batch Status Dialog (자동 새로고침)                     │
│                                                                │
└──────────────────────────────────────────────────────────────┘
                              │
                              ↓ API 호출
┌──────────────────────────────────────────────────────────────┐
│                    Backend (API Routes)                        │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  POST /api/extract-hand-stream (SSE)                          │
│    - ReadableStream으로 실시간 진행 상황 전송                 │
│    - 6단계 progress 이벤트                                    │
│    - CleanupContext로 리소스 관리                             │
│    - 재시도 로직 (FFmpeg 2회, OCR 2회, Claude 3회)            │
│                                                                │
│  POST /api/extract-hand-full                                  │
│    - 동일한 파이프라인, 일반 HTTP 응답                        │
│                                                                │
│  GET /api/vision-batch-status                                 │
│    - Batch 상태 조회                                          │
│                                                                │
│  POST /api/vision-batch-status                                │
│    - Batch 결과 다운로드 및 HandHistory 생성                  │
│                                                                │
└──────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                    Core Libraries                              │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  lib/youtube-downloader.ts (177줄)                            │
│    - getVideoStreamUrl(): YouTube 메타데이터 및 스트림 URL    │
│    - selectBestFormat(): 1280x720 포맷 선택                   │
│                                                                │
│  lib/frame-extractor.ts (202줄)                               │
│    - extractFrames(): FFmpeg 프레임 추출 (2초 간격)           │
│    - CleanupContext 지원                                      │
│                                                                │
│  lib/frame-cropper.ts (172줄)                                 │
│    - cropFrames(): Sharp 이미지 크롭                          │
│    - regionToPixels(): Percent → Pixel 좌표 변환              │
│                                                                │
│  lib/ocr-extractor.ts (248줄)                                 │
│    - extractOcrDataFromFrames(): Tesseract.js OCR             │
│    - parsePlayerCards(), parseStackSize(): 텍스트 파싱        │
│    - calculateOcrAccuracy(): 정확도 계산                      │
│                                                                │
│  lib/vision-batch.ts (288줄)                                  │
│    - createAllBatchRequests(): 18프레임씩 배치 분할           │
│    - submitBatchRequest(): Anthropic Batch API 제출           │
│    - downloadBatchResults(): 결과 다운로드                    │
│    - getBatchStatus(): 상태 확인                              │
│                                                                │
│  lib/hand-history-builder.ts (229줄)                          │
│    - buildHandHistory(): VisionBatchResult → HandHistory      │
│    - mergeVisionBatchResults(): 배치 결과 병합                │
│    - calculateVisionCost(): 비용 계산                         │
│                                                                │
│  lib/cleanup-utils.ts (183줄)                                 │
│    - CleanupContext: 리소스 추적 및 자동 정리                 │
│    - withCleanup(): try-finally 패턴 헬퍼                     │
│    - cleanupOldTempFiles(): 오래된 임시 파일 정리             │
│                                                                │
│  lib/retry-utils.ts (268줄)                                   │
│    - withFfmpegRetry(): FFmpeg 재시도 (최대 2회)              │
│    - withOcrRetry(): OCR 재시도 (최대 2회)                    │
│    - withClaudeRetry(): Claude API 재시도 (최대 3회, 지수 백오프) │
│    - rollbackSubmissionStatus(): DB 롤백                      │
│                                                                │
│  lib/error-logger.ts (267줄)                                  │
│    - logError(): 구조화된 에러 로깅                           │
│    - detectErrorCategory(): 자동 카테고리 감지                │
│    - logPipelineStep(): 파이프라인 단계별 로깅                │
│                                                                │
└──────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                External Services                               │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  YouTube API (ytdl-core)                                       │
│    - 비디오 메타데이터 조회                                   │
│    - 스트림 URL 획득 (mp4, 1280x720)                          │
│                                                                │
│  Claude Vision Batch API (Anthropic)                          │
│    - Batch 제출 (18프레임/배치, 최대 20 images/request)       │
│    - 처리 시간: 10-24시간                                     │
│    - 비용: 50% 할인 ($1.5/MTok input, $7.5/MTok output)       │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

---

## 기술 스택

### Frontend
- **Next.js 15.5.5** (App Router, React 19)
- **React Query** (@tanstack/react-query) - 서버 상태 관리
- **shadcn/ui** - UI 컴포넌트
- **react-rnd** - 드래그 가능한 OCR 영역 선택
- **EventSource** - SSE 연결

### Backend (Node.js Runtime)
- **ytdl-core / @distube/ytdl-core** - YouTube 비디오 정보 추출
- **fluent-ffmpeg** - 프레임 추출 (2초 간격, 1280x720)
- **@ffmpeg-installer/ffmpeg** - FFmpeg 바이너리
- **sharp** - 이미지 크롭 및 처리
- **tesseract.js** - OCR 텍스트 추출
- **@anthropic-ai/sdk** - Claude Vision Batch API

### Database
- **Supabase PostgreSQL** - timecode_submissions 테이블
  - `ocr_regions JSONB` - OCR 영역 저장
  - `ai_extracted_data JSONB` - 추출 결과 저장

---

## 구현 완료 Phase

### ✅ Phase 34: OCR Region Setup UI (2025-10-29)
- DB 마이그레이션: `ocr_regions JSONB` 컬럼 추가
- `lib/types/ocr.ts`: 432줄 타입 정의
- `VideoPlayerOcrOverlay`: 399줄 드래그 가능한 영역 선택
- `OcrSetupDialog`: 197줄 VideoPlayer 통합
- Admin UI 통합: OCR 영역 설정 버튼

**커밋**: `c0b74df`

### ✅ Phase 35: YouTube Frame Extraction (2025-10-29)
- `lib/youtube-downloader.ts`: 177줄 (ytdl-core)
- `lib/frame-extractor.ts`: 199줄 (FFmpeg 프레임 추출)
- `lib/frame-cropper.ts`: 172줄 (Sharp 크롭)
- `app/api/extract-frames/route.ts`: 161줄
- FFmpeg webpack externals 설정

**커밋**: `87a1c5e`

### ✅ Phase 36: Tesseract OCR Integration (2025-10-29)
- `lib/ocr-extractor.ts`: 239줄
  - parsePlayerCards(), parseStackSize(), parseBoardCards()
  - extractOcrDataFromFrames()
- `app/api/extract-ocr/route.ts`: 176줄
- PSM mode 6 설정

**커밋**: `c04ae0e`

### ✅ Phase 37: Claude Vision Batch API (2025-10-29)
- `lib/vision-batch.ts`: 280줄
  - 18프레임/배치 분할
  - Batch API 제출/상태/다운로드
- `lib/hand-history-builder.ts`: 229줄
  - buildHandHistory(), calculateVisionCost()
- `app/api/analyze-vision/route.ts`: 176줄
- `app/api/vision-batch-status/route.ts`: 181줄

**커밋**: `5300220`

### ✅ Phase 38: API Integration & Error Handling (2025-10-29)

#### 38.1: 통합 파이프라인 API
- `app/api/extract-hand-full/route.ts`: 259줄
- `app/api/extract-hand-stream/route.ts`: 281줄 (SSE)
- 6단계 완전 자동화 파이프라인

#### 38.2: SSE 진행 상황 스트리밍
- `sendSSE()` 헬퍼 함수
- 6단계 이벤트: start, progress, step_complete, complete, error
- ReadableStream 구현

#### 38.3: 에러 처리 및 롤백
- `lib/cleanup-utils.ts`: 183줄 (리소스 정리)
- `lib/retry-utils.ts`: 268줄 (재시도 로직)
- `lib/error-logger.ts`: 267줄 (구조화된 로깅)
- CleanupContext, withCleanup 패턴

#### 38.4: 관리자 UI 통합
- `ExtractionProgressDialog`: 317줄 (SSE 진행 상황)
- `BatchStatusDialog`: 279줄 (Batch 상태 확인)
- Admin 페이지 통합

#### 38.5: 최종 테스트 및 검증
- 문서 업데이트
- 환경 변수 체크리스트
- 사용 가이드

**커밋**: `c0f6a7f`, `cbc9658`

---

## API 명세

### POST /api/extract-hand-stream

**SSE를 통한 실시간 진행 상황 스트리밍**

#### Request
```json
{
  "submissionId": "uuid"
}
```

#### Response (SSE)
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: start
data: {"submissionId":"...","duration":180,"estimatedTime":"60 seconds"}

event: progress
data: {"step":1,"total":6,"message":"Getting video stream URL..."}

event: step_complete
data: {"step":1,"message":"Video: Example Title"}

...

event: complete
data: {
  "submissionId":"...",
  "batchId":"...",
  "frameCount":90,
  "ocrAccuracy":"85.5%",
  "estimatedCost":"$0.22",
  "processingTime":"45.2s",
  "message":"Pipeline completed. Vision batch processing will take ~24 hours."
}
```

### POST /api/extract-hand-full

**일반 HTTP 응답 (SSE 없음)**

동일한 파이프라인, 최종 결과만 반환

### GET /api/vision-batch-status

**Batch 상태 확인**

#### Query Parameters
- `submissionId` or `batchId`

#### Response
```json
{
  "batchId": "...",
  "status": "in_progress", // in_progress, ended, errored, canceled
  "requestCounts": {
    "processing": 3,
    "succeeded": 2,
    "errored": 0,
    "canceled": 0,
    "expired": 0
  },
  "isComplete": false,
  "isFailed": false
}
```

### POST /api/vision-batch-status

**Batch 결과 다운로드 및 HandHistory 생성**

#### Request
```json
{
  "submissionId": "uuid"
}
```

#### Response
```json
{
  "success": true,
  "batchId": "...",
  "handHistory": {
    "handNumber": "#123",
    "description": "...",
    "potSize": 1500,
    "boardCards": { "flop": ["Ah","Kh","Qh"], "turn": [...], "river": [...] },
    "players": [...],
    "actions": [...],
    "metadata": {...}
  },
  "batchResults": 5,
  "cost": {
    "inputTokens": 144000,
    "outputTokens": 20000,
    "totalCost": "$0.22",
    "costPerFrame": "$0.0024"
  }
}
```

---

## 사용 가이드

### 1. 환경 변수 설정

`.env.local` 파일:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Claude API
ANTHROPIC_API_KEY=sk-ant-xxx...
```

### 2. 관리자 워크플로우

#### Step 1: 타임코드 승인
1. `/admin/timecode-submissions` 페이지 접속
2. `pending` 상태 제출 확인
3. "승인" 버튼 클릭

#### Step 2: OCR 영역 설정
1. `approved` 상태에서 "OCR 영역 설정" 버튼 클릭
2. OcrSetupDialog 열림
   - 비디오 플레이어 로드
   - 2개 영역 드래그 (player, board)
   - "Save OCR Regions" 클릭

#### Step 3: AI 추출 시작
1. "AI 추출 시작" 버튼 클릭
2. ExtractionProgressDialog 열림
   - Step 1/6: Getting video stream URL...
   - Step 2/6: Extracting frames (2s interval)...
   - Step 3/6: Cropping OCR regions...
   - Step 4/6: Running OCR on frames...
   - Step 5/6: Creating vision batch requests...
   - Step 6/6: Submitting to Claude Vision API...
3. 완료 시 Batch ID 및 비용 표시

#### Step 4: Batch 상태 확인
1. `ai_processing` 상태에서 "Batch 상태 확인" 버튼 클릭
2. BatchStatusDialog 열림
   - 30초마다 자동 새로고침
   - Progress bar 및 request counts 표시
3. 상태가 `ended`가 되면 "Download Results" 버튼 활성화

#### Step 5: 결과 다운로드
1. "Download Results" 버튼 클릭
2. HandHistory 생성 및 `ai_extracted_data` 저장
3. 상태 자동 변경: `ai_processing` → `review`

#### Step 6: 검수 및 완료
1. `review` 상태에서 "검수하기" 버튼 클릭
2. TimecodeReviewDialog에서 HandHistory 확인
3. "Approve & Create Hand" 클릭
4. hands 테이블에 핸드 생성
5. 상태 변경: `review` → `completed`

---

## 비용 및 성능

### 비용 계산

**3분 비디오 (90프레임) 기준:**

- Input: 90 frames × 1,600 tokens = 144,000 tokens = 0.144 MTok
- Output: 5 batches × 4,000 tokens = 20,000 tokens = 0.02 MTok

**정가:**
- Input: 0.144 MTok × $3/MTok = $0.432
- Output: 0.02 MTok × $15/MTok = $0.30
- **Total: $0.732**

**Batch API (50% 할인):**
- Input: 0.144 MTok × $1.5/MTok = $0.216
- Output: 0.02 MTok × $7.5/MTok = $0.15
- **Total: $0.366**

**절감액: $0.366** (50%)

### 성능 지표

- **프레임 추출**: ~10-15초 (90프레임)
- **OCR 처리**: ~30-40초 (90프레임)
- **Batch 제출**: ~5초
- **전체 파이프라인**: 45-60초 (Batch 처리 제외)
- **Batch 처리**: 10-24시간 (Anthropic 처리 시간)

### 재시도 정책

- **FFmpeg**: 최대 2회, 2초 간격
- **OCR**: 최대 2회, 1초 간격
- **Claude API**: 최대 3회, 지수 백오프 (2초, 4초, 8초)

### 리소스 관리

- **임시 파일**: 자동 정리 (CleanupContext)
- **OCR Worker**: 자동 종료
- **오래된 temp 파일**: 1시간 이상 자동 삭제

---

## 트러블슈팅

### 문제 1: FFmpeg 에러
**증상**: "FFmpeg error: Connection timed out"
**해결**: 재시도 로직이 자동으로 2회 재시도합니다. 3회 실패 시 에러 상태로 전환.

### 문제 2: OCR 정확도 낮음
**증상**: ocrAccuracy < 50%
**원인**: OCR 영역이 잘못 설정됨
**해결**: OCR 영역을 다시 설정하고 재시도

### 문제 3: Batch 처리 오래 걸림
**증상**: 24시간 이상 `in_progress` 상태
**해결**: BatchStatusDialog에서 상태 확인. `errored` 상태면 다시 제출.

### 문제 4: 메모리 부족
**증상**: "Out of memory" 에러
**원인**: 프레임이 너무 많음 (3분 초과)
**해결**: 비디오 길이를 3분 이하로 제한 (API에서 자동 체크)

---

## 향후 개선 사항

1. **병렬 처리**: 여러 submission 동시 처리
2. **진행률 저장**: 중간 단계 저장 및 재개
3. **비디오 소스 확장**: Twitch, 로컬 파일 지원
4. **OCR 개선**: Google Cloud Vision API 통합
5. **Batch 우선순위**: 긴급 처리 옵션
6. **통계 대시보드**: 처리 통계 시각화
