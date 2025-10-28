# Hand History Automatic Extraction System

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [아키텍처](#아키텍처)
3. [기술 스택](#기술-스택)
4. [데이터베이스 스키마](#데이터베이스-스키마)
5. [구현 Phase](#구현-phase)
6. [API 명세](#api-명세)
7. [비용 및 성능](#비용-및-성능)
8. [구현 체크리스트](#구현-체크리스트)

---

## 시스템 개요

### 목적
사용자가 입력한 타임코드 정보(핸드 번호, 시작/종료 시간, 플레이어 이름)를 기반으로 YouTube 영상에서 자동으로 핸드 히스토리를 추출하는 시스템

### 핵심 기능
- ✅ 비디오 플레이어에서 OCR 영역 지정 (2개: 플레이어 카드, 보드+팟)
- ✅ YouTube 영상에서 2초 간격 프레임 추출 (1280x720)
- ✅ Tesseract.js로 각 프레임의 텍스트 추출 (무료)
- ✅ Claude Vision API로 90개 프레임 전체 분석 (Batch API 50% 할인)
- ✅ 구조화된 핸드 히스토리 생성 (players, actions, boardCards, potSize)
- ✅ 관리자 검수 워크플로우 (기존 시스템 활용)

### 워크플로우
```
1. 사용자 타임코드 제출 (SingleHandInputPanel)
   ↓
2. 관리자 승인 (pending → approved)
   ↓
3. OCR 영역 설정 (2개 영역 드래그)
   ↓
4. AI 자동 추출 시작 (approved → ai_processing)
   - 프레임 추출 (2초 간격, 1280x720)
   - OCR 처리 (Tesseract.js)
   - Claude Vision Batch API (90프레임 전체)
   ↓
5. AI 추출 완료 (ai_processing → review)
   ↓
6. 관리자 검수 (review → completed)
   - ai_extracted_data 확인
   - hands 테이블 생성
   ↓
7. Archive에 핸드 추가 완료
```

---

## 아키텍처

### 시스템 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Admin: Timecode Submissions Page]                          │
│    ├─ OCR 영역 설정 버튼                                     │
│    ├─ VideoPlayerOcrOverlay (2개 영역 드래그)                │
│    └─ AI 추출 시작 버튼                                      │
│                                                               │
│  [Admin: Timecode Review Dialog]                             │
│    └─ ai_extracted_data 시각화 및 승인/거부                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓ API 호출
┌─────────────────────────────────────────────────────────────┐
│                    Backend (API Routes)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  POST /api/timecodes/extract-hand-vision                      │
│    1. Submission 조회 (ocr_regions 확인)                     │
│    2. 상태 업데이트 (ai_processing)                          │
│    3. extractYouTubeFrames() 호출                            │
│    4. processOCRForFrames() 호출                             │
│    5. analyzeHandWithBatchAPI() 호출                         │
│    6. 결과 저장 (ai_extracted_data)                          │
│    7. 상태 업데이트 (review)                                 │
│    8. 알림 발송 (관리자에게)                                 │
│                                                               │
│  POST /api/timecodes/review (기존)                           │
│    - ai_extracted_data → hands 테이블 변환                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Core Libraries                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  lib/youtube-frame-extractor.ts                              │
│    - extractYouTubeFrames()                                  │
│    - yt-dlp + FFmpeg 사용                                    │
│    - 2초 간격, 1280x720 해상도                               │
│                                                               │
│  lib/ocr-processor.ts                                        │
│    - processOCRForFrames()                                   │
│    - Tesseract.js 사용                                       │
│    - 영역별 텍스트 추출 (player, board)                     │
│    - 패턴 매칭 (cards, pot, stack)                          │
│                                                               │
│  lib/claude-vision-batch.ts                                  │
│    - analyzeHandWithBatchAPI()                               │
│    - 90프레임 → 5개 배치 (각 18개)                          │
│    - Batch API 비동기 처리                                   │
│    - 결과 병합 로직                                          │
│                                                               │
│  lib/image-utils.ts                                          │
│    - cropRegion() (sharp 사용)                               │
│    - 좌표 기반 이미지 크롭                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    External Services                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  YouTube (yt-dlp)                                             │
│    - 영상 Direct URL 추출                                    │
│    - 메타데이터 조회                                         │
│                                                               │
│  FFmpeg (ffmpeg-static)                                      │
│    - 프레임 추출 (fps=0.5, scale=1280x720)                   │
│    - JPEG 인코딩 (quality 80%)                               │
│                                                               │
│  Tesseract.js                                                │
│    - OCR 텍스트 인식                                         │
│    - 영역별 처리 (player, board)                             │
│                                                               │
│  Claude API (Anthropic)                                      │
│    - Message Batches API                                     │
│    - claude-3-5-sonnet-20241022                              │
│    - 50% 할인 (24시간 내 처리)                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 데이터 흐름

```
YouTube Video URL
    │
    ↓ yt-dlp (Direct URL)
Direct Stream URL
    │
    ↓ FFmpeg (2초 간격, 1280x720)
Frame[] (90개 Buffer)
    │
    ├──→ cropRegion(player) ──→ Tesseract OCR ──→ player.cards, player.stack
    │
    └──→ cropRegion(board) ──→ Tesseract OCR ──→ board.cards, board.pot
    │
    ↓ Combine (frames + ocrData)
Claude Vision Batch API Input
    │
    ↓ 5개 배치 요청 (각 18프레임)
    │   - Batch 1: frames 1-18
    │   - Batch 2: frames 19-36
    │   - Batch 3: frames 37-54
    │   - Batch 4: frames 55-72
    │   - Batch 5: frames 73-90
    │
    ↓ 24시간 내 비동기 처리
5개 배치 결과
    │
    ↓ mergeVisionResults()
HandHistory (ai_extracted_data)
    │
    ├─ handNumber: "001"
    ├─ potSize: 7000
    ├─ boardCards: { flop: [...], turn: [...], river: [...] }
    ├─ players: [{ name, position, holeCards, stackSize, isWinner }]
    └─ actions: [{ playerName, street, actionType, amount, sequenceNumber }]
    │
    ↓ 관리자 검수
hands, hand_players, hand_actions 테이블
```

---

## 기술 스택

### 프론트엔드
- **React 19** - UI 컴포넌트
- **Next.js 15.5.5** - 프레임워크
- **Tailwind CSS 4** - 스타일링
- **Framer Motion** - 애니메이션
- **Zustand** - 상태 관리

### 백엔드
- **Next.js API Routes** (Node.js Runtime)
- **Supabase** - PostgreSQL 데이터베이스
- **FFmpeg** (ffmpeg-static) - 프레임 추출
- **yt-dlp** (youtube-dl-exec) - YouTube URL 처리

### AI/ML
- **Claude 3.5 Sonnet** (Anthropic)
  - Message Batches API
  - Vision 분석
- **Tesseract.js** - OCR (무료)

### 이미지 처리
- **sharp** - 이미지 크롭 및 변환
- **canvas** - 프레임 버퍼 처리

### 의존성 패키지
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "fluent-ffmpeg": "^2.1.2",
    "ffmpeg-static": "^5.2.0",
    "youtube-dl-exec": "^2.4.0",
    "tesseract.js": "^5.0.0",
    "sharp": "^0.33.0"
  }
}
```

---

## 데이터베이스 스키마

### 1. timecode_submissions 테이블 수정

#### 신규 컬럼 추가
```sql
-- Migration: 20251029000001_add_ocr_regions_to_timecode_submissions.sql

ALTER TABLE timecode_submissions
ADD COLUMN ocr_regions JSONB DEFAULT NULL;

COMMENT ON COLUMN timecode_submissions.ocr_regions IS 'OCR 영역 좌표 (player, board)';
```

#### ocr_regions JSONB 구조
```json
{
  "player": {
    "x": 100,
    "y": 200,
    "width": 300,
    "height": 100,
    "x_percent": 7.8,
    "y_percent": 27.8,
    "width_percent": 23.4,
    "height_percent": 13.9
  },
  "board": {
    "x": 400,
    "y": 100,
    "width": 400,
    "height": 150,
    "x_percent": 31.25,
    "y_percent": 13.9,
    "width_percent": 31.25,
    "height_percent": 20.8
  }
}
```

### 2. ai_extracted_data JSONB 구조 (기존)

```json
{
  "handNumber": "001",
  "description": "Alice raises preflop, Bob 3-bets, Alice calls",
  "potSize": 7000,
  "boardCards": {
    "flop": ["Ah", "Kh", "Qh"],
    "turn": ["Jh"],
    "river": ["Th"]
  },
  "players": [
    {
      "name": "Alice",
      "position": "BTN",
      "stackSize": 10500,
      "holeCards": "As Ad",
      "isWinner": true,
      "winAmount": 7000
    },
    {
      "name": "Bob",
      "position": "BB",
      "stackSize": 8200,
      "holeCards": "Ks Kd",
      "isWinner": false,
      "winAmount": 0
    }
  ],
  "actions": [
    {
      "playerName": "Alice",
      "street": "preflop",
      "actionType": "raise",
      "amount": 500,
      "sequenceNumber": 1,
      "timestamp": "00:05:15"
    },
    {
      "playerName": "Bob",
      "street": "preflop",
      "actionType": "raise",
      "amount": 1500,
      "sequenceNumber": 2,
      "timestamp": "00:05:20"
    }
  ],
  "metadata": {
    "frameCount": 90,
    "ocrAccuracy": 0.92,
    "visionBatches": 5,
    "extractionDuration": 85000,
    "totalCost": 0.216
  }
}
```

---

## 구현 Phase

### Phase 34: OCR 영역 지정 UI (3-4시간)

#### 34.1 VideoPlayerOcrOverlay 컴포넌트
**파일**: `components/video-player-ocr-overlay.tsx`

**Props**:
```typescript
interface VideoPlayerOcrOverlayProps {
  videoWidth: number        // 1280
  videoHeight: number       // 720
  initialRegions?: OcrRegions
  onRegionsSet: (regions: OcrRegions) => void
  onCancel: () => void
}

interface OcrRegions {
  player: Region
  board: Region
}

interface Region {
  x: number
  y: number
  width: number
  height: number
  x_percent: number
  y_percent: number
  width_percent: number
  height_percent: number
}
```

**기능**:
- ✅ 비디오 플레이어 위 반투명 오버레이
- ✅ 드래그로 영역 지정 (react-draggable + resizable)
- ✅ 2개 영역 색상 구분 (player: 빨강, board: 파랑)
- ✅ 좌표 자동 계산 (픽셀 + 퍼센트)
- ✅ 미리보기 모드 (선택 영역 하이라이트)
- ✅ 리셋 버튼

**UI 플로우**:
```
1. "OCR 영역 설정" 버튼 클릭
2. 비디오 일시정지
3. 오버레이 모드 활성화
4. "영역 1: 플레이어 카드" 드래그
5. "영역 2: 보드 + 팟" 드래그
6. "저장" 버튼 → ocr_regions 저장
7. 오버레이 닫기
```

#### 34.2 관리자 UI 통합
**파일**: `app/admin/timecode-submissions/page.tsx`

**변경사항**:
- "OCR 영역 설정" 버튼 추가 (approved 상태만)
- OcrSetupDialog 컴포넌트 생성
- VideoPlayer + OcrOverlay 통합
- 저장 시 `ocr_regions` 업데이트

#### 34.3 DB 마이그레이션
**파일**: `supabase/migrations/20251029000001_add_ocr_regions_to_timecode_submissions.sql`

```sql
-- Add ocr_regions column
ALTER TABLE timecode_submissions
ADD COLUMN ocr_regions JSONB DEFAULT NULL;

-- Add index for faster queries
CREATE INDEX idx_timecode_submissions_ocr_regions
ON timecode_submissions USING GIN (ocr_regions);

-- Add comment
COMMENT ON COLUMN timecode_submissions.ocr_regions
IS 'OCR 영역 좌표 (player: 플레이어 카드, board: 보드카드+팟크기)';
```

---

### Phase 35: YouTube 프레임 추출 시스템 (3-4시간)

#### 35.1 youtube-frame-extractor.ts
**파일**: `lib/youtube-frame-extractor.ts`

**핵심 함수**:
```typescript
export interface Frame {
  number: number          // 1, 2, 3, ...
  timestamp: string       // "00:05:11"
  timestampSeconds: number // 311
  buffer: Buffer         // JPEG 이미지 데이터
  width: number          // 1280
  height: number         // 720
}

export async function extractYouTubeFrames(
  videoUrl: string,
  startTime: string,      // "00:05:11"
  endTime: string,        // "00:08:23"
  interval: number = 2    // 2초 간격
): Promise<Frame[]>

export async function extractFramesWithFFmpeg(options: {
  videoUrl: string
  startSeconds: number
  endSeconds: number
  interval: number
  resolution: string      // "1280x720"
}): Promise<Frame[]>
```

**의존성**:
```bash
npm install fluent-ffmpeg ffmpeg-static youtube-dl-exec
```

**FFmpeg 명령어**:
```bash
# 예시: 5:11부터 8:23까지, 2초 간격 (0.5 fps)
ffmpeg \
  -ss 311 \                    # 시작 시간 (초)
  -i "DIRECT_URL" \            # 입력 (yt-dlp에서 가져온 URL)
  -t 192 \                     # 길이 (초)
  -vf "fps=0.5,scale=1280:720" \ # 0.5 fps = 2초 간격
  -f image2pipe \              # 출력 형식: 파이프
  -vcodec mjpeg \              # JPEG 인코딩
  pipe:1                       # stdout으로 출력
```

#### 35.2 Vercel 환경 설정
**파일**: `app/api/timecodes/extract-frames/route.ts`

```typescript
// Node.js Runtime (FFmpeg 바이너리 실행 가능)
export const runtime = 'nodejs'
export const maxDuration = 60  // 60초 타임아웃
export const dynamic = 'force-dynamic'
```

**환경 변수** (`.env.local`):
```env
FFMPEG_PATH=/var/task/node_modules/ffmpeg-static/ffmpeg
```

#### 35.3 에러 처리
```typescript
try {
  const frames = await extractYouTubeFrames(...)
} catch (error) {
  if (error.message.includes('Video unavailable')) {
    throw new Error('YouTube 영상을 찾을 수 없습니다')
  }
  if (error.message.includes('403')) {
    throw new Error('YouTube 접근 권한 오류 (지역 제한 또는 비공개)')
  }
  if (error.message.includes('timeout')) {
    throw new Error('프레임 추출 시간 초과 (영상이 너무 깁니다)')
  }
  throw error
}
```

---

### Phase 36: Tesseract OCR 통합 (2-3시간)

#### 36.1 ocr-processor.ts
**파일**: `lib/ocr-processor.ts`

**핵심 함수**:
```typescript
export interface OcrData {
  frameNumber: number
  timestamp: string
  player: {
    raw: string           // OCR 원본 텍스트
    cards: string[]       // ["As", "Ah"]
    stack: number         // 10500
  }
  board: {
    raw: string
    cards: string[]       // ["Ah", "Kh", "Qh"]
    pot: number           // 7000
  }
}

export async function processOCRForFrames(
  frames: Frame[],
  regions: OcrRegions
): Promise<OcrData[]>

export function extractCards(text: string): string[]
export function extractStack(text: string): number
export function extractPotSize(text: string): number
export function extractBoardCards(text: string): string[]
```

**Tesseract 설정**:
```typescript
const worker = await Tesseract.createWorker('eng', 1, {
  logger: (m) => console.log(m),
  errorHandler: (err) => console.error(err)
})

await worker.setParameters({
  tessedit_char_whitelist: 'AKQJT0-9♠♥♦♣shdc,:$',  // 허용 문자
  tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT  // 희소 텍스트 모드
})
```

**패턴 매칭**:
```typescript
// 카드: "As Ah" 또는 "A♠ A♥"
const cardPattern = /([AKQJT2-9][♠♥♦♣shdc])/gi

// 팟 크기: "Pot: 1,250" 또는 "1250"
const potPattern = /pot[:\s]*(\d+[,\d]*)/i

// 스택: "10,500" 또는 "10500"
const stackPattern = /(\d+[,\d]*)/
```

#### 36.2 image-utils.ts
**파일**: `lib/image-utils.ts`

```typescript
import sharp from 'sharp'

export async function cropRegion(
  imageBuffer: Buffer,
  region: Region
): Promise<Buffer> {
  return await sharp(imageBuffer)
    .extract({
      left: Math.round(region.x),
      top: Math.round(region.y),
      width: Math.round(region.width),
      height: Math.round(region.height)
    })
    .jpeg({ quality: 90 })  // OCR을 위해 높은 품질 유지
    .toBuffer()
}

export async function resizeImage(
  buffer: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  return await sharp(buffer)
    .resize(width, height, { fit: 'contain' })
    .toBuffer()
}
```

---

### Phase 37: Claude Vision Batch API (3-4시간)

#### 37.1 claude-vision-batch.ts
**파일**: `lib/claude-vision-batch.ts`

**핵심 함수**:
```typescript
export async function analyzeHandWithBatchAPI(
  frames: Frame[],
  ocrData: OcrData[],
  submission: TimecodeSubmission
): Promise<HandHistory>

export async function createBatchRequests(
  frames: Frame[],
  ocrData: OcrData[]
): Promise<BatchRequest[]>

export async function waitForBatchCompletion(
  batchId: string,
  onProgress?: (progress: BatchProgress) => void
): Promise<BatchResult>

export function mergeVisionResults(
  results: VisionBatchResult[]
): HandHistory
```

**Batch API 플로우**:
```typescript
// 1. 90프레임을 5개 배치로 분할
const batches = chunk(frames, 18)  // [18, 18, 18, 18, 18]

// 2. 각 배치에 대한 요청 생성
const batchRequests = batches.map((batch, i) => ({
  custom_id: `batch_${i}`,
  params: {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: buildPrompt(i, ocrData) },
        ...batch.map(frame => ({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: frame.buffer.toString('base64')
          }
        }))
      ]
    }]
  }
}))

// 3. Batch 생성
const batch = await anthropic.batches.messages.create({
  requests: batchRequests
})

// 4. 완료 대기 (polling, 5초마다)
while (batch.processing_status !== 'ended') {
  await sleep(5000)
  batch = await anthropic.batches.messages.retrieve(batch.id)
  onProgress?.({
    processed: batch.request_counts.processed,
    total: batch.request_counts.total
  })
}

// 5. 결과 가져오기
const results = await anthropic.batches.messages.results(batch.id)

// 6. 병합
const handHistory = mergeVisionResults(results)
```

**프롬프트 구조**:
```typescript
function buildPrompt(batchIndex: number, ocrData: OcrData[]): string {
  return `당신은 포커 영상 분석 전문가입니다.

[배치 정보]
- 배치 번호: ${batchIndex + 1}/5
- 프레임 개수: ${ocrData.length}개
- 프레임 범위: ${batchIndex * 18 + 1}-${(batchIndex + 1) * 18}

[OCR 추출 정보]
${ocrData.map((ocr, i) => `
프레임 ${i + 1} (${ocr.timestamp}):
  플레이어 영역:
    - 카드: ${ocr.player.cards.join(' ') || '없음'}
    - 스택: ${ocr.player.stack || '없음'}

  보드 영역:
    - 카드: ${ocr.board.cards.join(' ') || '없음'}
    - 팟: ${ocr.board.pot || '없음'}
`).join('\n')}

[작업]
각 프레임을 시간 순서대로 분석하여 다음을 추출해주세요:

1. **플레이어 액션**
   - 액션 타입: fold, check, call, bet, raise, all-in
   - 액션 금액 (있는 경우)
   - 정확한 프레임 번호 및 타임스탬프
   - Street (preflop, flop, turn, river)

2. **보드 카드 변화**
   - Flop: 처음 3장이 오픈되는 프레임
   - Turn: 4번째 카드가 추가되는 프레임
   - River: 5번째 카드가 추가되는 프레임
   - OCR 데이터와 비교하여 정확성 확인

3. **플레이어 홀카드**
   - 화면에 홀카드가 표시된 경우만 기록
   - 쇼다운 시점 확인

4. **승자 판정**
   - 칩이 이동하는 방향 관찰
   - 최종 팟을 가져가는 플레이어

[중요 규칙]
- OCR 데이터는 참고용이며, 영상을 우선 분석하세요
- OCR 오류가 있을 수 있으므로 시각적으로 확인하세요
- 액션이 없는 프레임은 건너뛰세요
- 의심스러운 경우 "uncertain" 플래그를 추가하세요

[응답 형식]
다음 JSON 형식으로 응답해주세요:

{
  "batchNumber": ${batchIndex},
  "actions": [
    {
      "frameNumber": 5,
      "playerName": "Alice",
      "street": "preflop",
      "actionType": "raise",
      "amount": 500,
      "timestamp": "00:05:15",
      "confidence": 0.95
    }
  ],
  "boardCards": {
    "flop": {
      "cards": ["Ah", "Kh", "Qh"],
      "frameNumber": 12,
      "timestamp": "00:05:35"
    },
    "turn": {
      "cards": ["Jh"],
      "frameNumber": 45,
      "timestamp": "00:06:55"
    },
    "river": {
      "cards": ["Th"],
      "frameNumber": 78,
      "timestamp": "00:08:05"
    }
  },
  "holeCards": [
    {
      "playerName": "Alice",
      "cards": ["As", "Ad"],
      "frameNumber": 85,
      "showdownFrame": true
    }
  ],
  "winner": {
    "playerName": "Alice",
    "winAmount": 7000,
    "frameNumber": 88
  },
  "observations": "프레임 12에서 Flop 오픈. Alice가 프레임 15에서 컨티뉴에이션 벳. Bob이 프레임 18에서 폴드."
}`
}
```

#### 37.2 결과 병합 로직
```typescript
function mergeVisionResults(results: VisionBatchResult[]): HandHistory {
  // 1. 모든 배치의 액션 수집
  const allActions = results.flatMap(result => {
    const json = JSON.parse(result.result.message.content[0].text)
    return json.actions
  })

  // 2. 타임스탬프 기준 정렬 (중복 제거)
  const uniqueActions = deduplicateActions(allActions)
  const sortedActions = uniqueActions.sort((a, b) =>
    parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp)
  )

  // 3. sequenceNumber 재부여
  const numberedActions = sortedActions.map((action, i) => ({
    ...action,
    sequenceNumber: i + 1
  }))

  // 4. 보드 카드 병합 (마지막 배치가 가장 완전함)
  const boardCards = results.reduce((acc, result) => {
    const json = JSON.parse(result.result.message.content[0].text)
    return {
      flop: json.boardCards.flop?.cards || acc.flop,
      turn: json.boardCards.turn?.cards || acc.turn,
      river: json.boardCards.river?.cards || acc.river
    }
  }, { flop: [], turn: [], river: [] })

  // 5. 홀카드 수집
  const holeCards = results.flatMap(result => {
    const json = JSON.parse(result.result.message.content[0].text)
    return json.holeCards || []
  })

  // 6. 승자 결정 (마지막 배치)
  const winner = results[results.length - 1].winner

  // 7. 플레이어 정보 병합
  const players = mergePlayerInfo(holeCards, numberedActions, winner)

  return {
    handNumber: submission.hand_number,
    description: generateDescription(numberedActions),
    potSize: winner.winAmount,
    boardCards: {
      flop: boardCards.flop,
      turn: boardCards.turn,
      river: boardCards.river
    },
    players,
    actions: numberedActions,
    metadata: {
      frameCount: frames.length,
      ocrAccuracy: calculateOcrAccuracy(ocrData),
      visionBatches: results.length,
      extractionDuration: Date.now() - startTime,
      totalCost: calculateCost(frames.length)
    }
  }
}

function deduplicateActions(actions: Action[]): Action[] {
  // 같은 타임스탬프, 플레이어, 액션 타입이면 중복으로 간주
  const seen = new Set<string>()
  return actions.filter(action => {
    const key = `${action.timestamp}-${action.playerName}-${action.actionType}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
```

---

### Phase 38: API 통합 및 테스트 (2시간)

#### 38.1 새 API 라우트
**파일**: `app/api/timecodes/extract-hand-vision/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { extractYouTubeFrames } from '@/lib/youtube-frame-extractor'
import { processOCRForFrames } from '@/lib/ocr-processor'
import { analyzeHandWithBatchAPI } from '@/lib/claude-vision-batch'
import { updateSubmissionStatus, updateSubmission } from '@/lib/timecode-submissions'
import { createNotification } from '@/lib/notifications'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { submissionId } = await request.json()

    // 1. Submission 조회
    const submission = await getSubmission(submissionId)

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    if (!submission.ocr_regions) {
      return NextResponse.json(
        { error: 'OCR regions not set. Please set OCR regions first.' },
        { status: 400 }
      )
    }

    // 2. 상태 업데이트: ai_processing
    await updateSubmissionStatus(submissionId, 'ai_processing')

    // 3. 프레임 추출 (YouTube, 2초 간격, 1280x720)
    const frames = await extractYouTubeFrames(
      submission.stream.video_url!,
      submission.start_time,
      submission.end_time || submission.start_time,
      2  // 2초 간격
    )

    console.log(`Extracted ${frames.length} frames`)

    // 4. OCR 처리
    const ocrData = await processOCRForFrames(
      frames,
      submission.ocr_regions
    )

    console.log(`OCR processed ${ocrData.length} frames`)

    // 5. Claude Vision Batch API 실행
    const handHistory = await analyzeHandWithBatchAPI(
      frames,
      ocrData,
      submission
    )

    console.log('Vision analysis complete')

    // 6. 결과 저장
    await updateSubmission(submissionId, {
      status: 'review',
      ai_extracted_data: handHistory,
      ai_processed_at: new Date()
    })

    // 7. 관리자에게 알림
    await createNotification({
      userId: submission.submitter_id,  // 제출자에게도 알림
      type: 'ai_extraction_complete',
      message: `핸드 #${submission.hand_number} AI 추출 완료`,
      link: `/admin/timecode-submissions?id=${submissionId}`
    })

    return NextResponse.json({
      success: true,
      data: handHistory,
      frameCount: frames.length,
      ocrData: ocrData.length
    })

  } catch (error) {
    console.error('Extract hand vision error:', error)

    // 상태 업데이트: ai_processing_error
    await updateSubmission(submissionId, {
      status: 'pending',  // 재시도 가능하도록 pending으로 되돌림
      ai_processing_error: error.message
    })

    return NextResponse.json(
      {
        error: 'Failed to extract hand',
        message: error.message
      },
      { status: 500 }
    )
  }
}
```

#### 38.2 관리자 UI 통합
**파일**: `app/admin/timecode-submissions/page.tsx`

**변경사항**:
```typescript
// AI 추출 시작 버튼 (approved 상태에만 표시)
{submission.status === 'approved' && (
  <Button
    onClick={async () => {
      if (!submission.ocr_regions) {
        toast.error('OCR 영역을 먼저 설정해주세요')
        return
      }

      setIsExtracting(true)
      try {
        const response = await fetch('/api/timecodes/extract-hand-vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId: submission.id })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message)
        }

        const result = await response.json()
        toast.success(`AI 추출 완료: ${result.frameCount}개 프레임 분석`)

        // 목록 새로고침
        refetch()
      } catch (error) {
        toast.error(`AI 추출 실패: ${error.message}`)
      } finally {
        setIsExtracting(false)
      }
    }}
    disabled={isExtracting}
  >
    {isExtracting ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        AI 추출 중...
      </>
    ) : (
      <>
        <Sparkles className="mr-2 h-4 w-4" />
        AI 추출 시작
      </>
    )}
  </Button>
)}
```

---

## API 명세

### POST /api/timecodes/extract-hand-vision

#### Request
```json
{
  "submissionId": "uuid"
}
```

#### Response (성공)
```json
{
  "success": true,
  "data": {
    "handNumber": "001",
    "potSize": 7000,
    "boardCards": {
      "flop": ["Ah", "Kh", "Qh"],
      "turn": ["Jh"],
      "river": ["Th"]
    },
    "players": [...],
    "actions": [...],
    "metadata": {
      "frameCount": 90,
      "ocrAccuracy": 0.92,
      "visionBatches": 5,
      "extractionDuration": 85000,
      "totalCost": 0.216
    }
  },
  "frameCount": 90,
  "ocrData": 90
}
```

#### Response (에러)
```json
{
  "error": "Failed to extract hand",
  "message": "YouTube video not found"
}
```

#### Status Codes
- `200` - 성공
- `400` - Bad Request (OCR regions 미설정)
- `404` - Submission not found
- `500` - Internal Server Error

---

## 비용 및 성능

### 비용 분석

#### 단일 핸드 비용

| 핸드 길이 | 프레임 수 | Claude Batch | Tesseract | 총 비용 |
|----------|----------|--------------|-----------|---------|
| 30초 | 15 | $0.036 | $0 | **$0.036** (48원) |
| 1분 | 30 | $0.072 | $0 | **$0.072** (96원) |
| 2분 | 60 | $0.144 | $0 | **$0.144** (192원) |
| 3분 | 90 | $0.216 | $0 | **$0.216** (288원) |
| 5분 | 150 | $0.360 | $0 | **$0.360** (480원) |

**평균 핸드 (2분)**: $0.144 (192원)

#### 월간 비용 예측

| 월간 핸드 수 | 총 비용 (USD) | 총 비용 (KRW) |
|-------------|--------------|--------------|
| 10개 | $1.44 | 1,920원 |
| 50개 | $7.20 | 9,600원 |
| 100개 | $14.40 | 19,200원 |
| 500개 | $72.00 | 96,000원 |
| 1,000개 | $144.00 | 192,000원 |

### 처리 시간

#### 3분 핸드 (90프레임) 기준

| 단계 | 시간 | 누적 |
|------|------|------|
| 1. YouTube URL 추출 | 2-3초 | 2-3초 |
| 2. 프레임 추출 (FFmpeg) | 10-15초 | 12-18초 |
| 3. OCR 처리 (Tesseract) | 15-20초 | 27-38초 |
| 4. Batch API 제출 | 1-2초 | 28-40초 |
| 5. **Batch 처리 대기** | **24시간 이내** | - |
| 6. 결과 병합 및 저장 | 2-5초 | 30-45초 |

**즉시 처리 (Batch 제외)**: 30-45초
**전체 처리 (Batch 포함)**: 24시간 이내

#### Vercel 제약
- **Function 타임아웃**: 60초
- **메모리**: 512MB (프레임 처리에 충분)
- **Batch API**: 비동기 처리로 타임아웃 회피

### 정확도 목표

| 항목 | 목표 정확도 | 근거 |
|------|-----------|------|
| OCR (Tesseract) | 90%+ | 숫자, 카드 기호 인식에 최적화 |
| Vision (Claude) | 95%+ | 기존 시스템에서 검증됨 |
| 전체 시스템 | **90%+** | 관리자 검수로 100% 보정 |

---

## 구현 체크리스트

### Phase 34: OCR 영역 지정 UI ⬜

- [ ] `components/video-player-ocr-overlay.tsx` 생성
  - [ ] 드래그 가능한 영역 2개 구현
  - [ ] 좌표 계산 (픽셀 + 퍼센트)
  - [ ] 색상 구분 (player: 빨강, board: 파랑)
  - [ ] 리셋 기능
  - [ ] 미리보기 모드
- [ ] `components/admin/ocr-setup-dialog.tsx` 생성
  - [ ] VideoPlayer 통합
  - [ ] OcrOverlay 통합
  - [ ] 저장 로직
- [ ] DB 마이그레이션
  - [ ] `20251029000001_add_ocr_regions_to_timecode_submissions.sql`
  - [ ] 로컬 테스트
  - [ ] 프로덕션 배포
- [ ] 관리자 UI 업데이트
  - [ ] "OCR 영역 설정" 버튼 추가
  - [ ] Dialog 열기/닫기 로직
  - [ ] 저장 성공/실패 피드백

### Phase 35: YouTube 프레임 추출 시스템 ⬜

- [ ] 의존성 설치
  - [ ] `npm install fluent-ffmpeg ffmpeg-static youtube-dl-exec`
- [ ] `lib/youtube-frame-extractor.ts` 생성
  - [ ] `extractYouTubeFrames()` 함수
  - [ ] `extractFramesWithFFmpeg()` 함수
  - [ ] 에러 처리 (Video unavailable, 403, timeout)
  - [ ] 진행률 로깅
- [ ] `app/api/timecodes/extract-frames/route.ts` 생성
  - [ ] Node.js Runtime 설정
  - [ ] 60초 타임아웃 설정
  - [ ] FFmpeg 경로 환경 변수
- [ ] 로컬 테스트
  - [ ] 30초 영상 테스트
  - [ ] 3분 영상 테스트
  - [ ] 5분 영상 테스트 (제한 확인)
- [ ] Vercel 배포 테스트
  - [ ] FFmpeg 바이너리 작동 확인
  - [ ] 타임아웃 문제 확인

### Phase 36: Tesseract OCR 통합 ⬜

- [ ] 의존성 설치
  - [ ] `npm install tesseract.js sharp`
- [ ] `lib/ocr-processor.ts` 생성
  - [ ] `processOCRForFrames()` 함수
  - [ ] `extractCards()` 패턴 매칭
  - [ ] `extractStack()` 패턴 매칭
  - [ ] `extractPotSize()` 패턴 매칭
  - [ ] Tesseract Worker 관리
- [ ] `lib/image-utils.ts` 생성
  - [ ] `cropRegion()` 함수
  - [ ] `resizeImage()` 함수
- [ ] 단위 테스트
  - [ ] 카드 패턴 매칭 테스트
  - [ ] 팟 크기 추출 테스트
  - [ ] 스택 크기 추출 테스트
  - [ ] 이미지 크롭 테스트
- [ ] 통합 테스트
  - [ ] 실제 프레임으로 OCR 테스트
  - [ ] 정확도 측정

### Phase 37: Claude Vision Batch API ⬜

- [ ] `lib/claude-vision-batch.ts` 생성
  - [ ] `analyzeHandWithBatchAPI()` 함수
  - [ ] `createBatchRequests()` 함수
  - [ ] `waitForBatchCompletion()` 함수
  - [ ] `mergeVisionResults()` 함수
  - [ ] 프롬프트 구조 최적화
- [ ] 결과 병합 로직
  - [ ] 액션 중복 제거
  - [ ] 타임스탬프 정렬
  - [ ] sequenceNumber 재부여
  - [ ] 보드 카드 병합
  - [ ] 플레이어 정보 병합
- [ ] 진행률 추적
  - [ ] Polling 로직 (5초마다)
  - [ ] 진행률 콜백
- [ ] 에러 처리
  - [ ] Batch 실패 시 재시도
  - [ ] JSON 파싱 실패 처리
  - [ ] 타임아웃 처리
- [ ] 단위 테스트
  - [ ] 배치 분할 테스트
  - [ ] 결과 병합 테스트
  - [ ] 중복 제거 테스트

### Phase 38: API 통합 및 테스트 ⬜

- [ ] `app/api/timecodes/extract-hand-vision/route.ts` 생성
  - [ ] 전체 파이프라인 통합
  - [ ] 에러 처리 및 로깅
  - [ ] 상태 업데이트 로직
  - [ ] 알림 발송
- [ ] 관리자 UI 업데이트
  - [ ] "AI 추출 시작" 버튼 추가
  - [ ] 진행 상태 표시
  - [ ] 성공/실패 피드백
  - [ ] 재시도 로직
- [ ] E2E 테스트
  - [ ] 전체 플로우 테스트 (30초 핸드)
  - [ ] 전체 플로우 테스트 (3분 핸드)
  - [ ] OCR 영역 미설정 에러 테스트
  - [ ] YouTube 영상 없음 에러 테스트
- [ ] 파일럿 테스트
  - [ ] 10개 실제 핸드 테스트
  - [ ] 정확도 측정
  - [ ] 비용 추적
  - [ ] 처리 시간 측정
- [ ] 문서 업데이트
  - [ ] API 명세 최종 확인
  - [ ] 사용자 가이드 작성
  - [ ] 트러블슈팅 가이드

### 프로덕션 배포 ⬜

- [ ] 환경 변수 설정
  - [ ] `ANTHROPIC_API_KEY`
  - [ ] `FFMPEG_PATH`
- [ ] Vercel 배포
  - [ ] Node.js Runtime 확인
  - [ ] 60초 타임아웃 확인
  - [ ] 메모리 제한 확인
- [ ] 모니터링 설정
  - [ ] Sentry 에러 트래킹
  - [ ] 비용 모니터링 (Claude API)
  - [ ] 처리 시간 로깅
- [ ] 사용자 공지
  - [ ] 새 기능 안내
  - [ ] OCR 영역 설정 가이드
  - [ ] 예상 처리 시간 안내

---

## 트러블슈팅

### 문제 1: FFmpeg 실행 실패
**증상**: `Error: spawn ffmpeg ENOENT`
**원인**: FFmpeg 바이너리를 찾을 수 없음
**해결**:
```bash
# ffmpeg-static 설치 확인
npm install ffmpeg-static

# 환경 변수 설정
export FFMPEG_PATH=/path/to/ffmpeg
```

### 문제 2: OCR 정확도 낮음
**증상**: 카드, 팟 크기 인식 실패
**원인**: 이미지 품질 낮음, 영역 설정 잘못됨
**해결**:
1. OCR 영역 재설정 (정확한 영역 지정)
2. 이미지 해상도 확인 (1280x720)
3. Tesseract 파라미터 조정 (whitelist, pageseg_mode)

### 문제 3: Batch API 타임아웃
**증상**: 24시간 지나도 결과 없음
**원인**: Anthropic 서버 문제 또는 네트워크 오류
**해결**:
1. Batch 상태 확인 (`batches.messages.retrieve`)
2. 에러 메시지 확인
3. 재시도 (새 Batch 생성)

### 문제 4: YouTube 영상 다운로드 실패
**증상**: `Video unavailable` 또는 `403 Forbidden`
**원인**: 지역 제한, 비공개 영상, YouTube API 차단
**해결**:
1. 영상 URL 확인 (공개 여부)
2. yt-dlp 업데이트 (`npm update youtube-dl-exec`)
3. Proxy 사용 고려

### 문제 5: Vercel 메모리 초과
**증상**: `Error: Process exited before completing request`
**원인**: 90개 프레임을 메모리에 로드하여 512MB 초과
**해결**:
1. 프레임 스트리밍 처리 (한 번에 하나씩)
2. 프레임 압축 (JPEG 품질 낮추기)
3. Vercel Pro 플랜 (1GB 메모리)

---

## 참고 자료

### 공식 문서
- [Claude Vision API](https://docs.anthropic.com/en/docs/vision)
- [Claude Message Batches API](https://docs.anthropic.com/en/docs/build-with-claude/message-batches)
- [Tesseract.js](https://tesseract.projectnaptha.com/)
- [FFmpeg](https://ffmpeg.org/documentation.html)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [Sharp](https://sharp.pixelplumbing.com/)

### 내부 문서
- [현재 타임코드 시스템](./TIMECODE_SUBMISSION_SYSTEM.md)
- [핸드 Import API](./HAND_IMPORT_API.md)
- [Video Sources 가이드](./VIDEO_SOURCES.md)

---

**문서 버전**: 1.0
**작성일**: 2025-01-29
**마지막 업데이트**: 2025-01-29
**작성자**: Claude Code
