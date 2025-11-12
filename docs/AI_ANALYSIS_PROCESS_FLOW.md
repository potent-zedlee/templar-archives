# AI 분석 프로세스 흐름

**작성일**: 2025-11-11
**버전**: 2.0 (압축)
**목적**: AI 영상 분석 요청부터 결과 저장까지의 전체 흐름

---

## 📋 목차

1. [개요](#개요)
2. [전체 프로세스](#전체-프로세스)
3. [주요 컴포넌트](#주요-컴포넌트)
4. [데이터 흐름](#데이터-흐름)
5. [에러 처리](#에러-처리)

---

## 개요

포커 영상에서 핸드 히스토리를 자동으로 추출하는 AI 분석 시스템입니다.

### 기술 스택
- **프론트엔드**: Next.js 16.0.1, React 19.2, TypeScript
- **백엔드**: Next.js Server Actions + Python FastAPI (HAE-MVP)
- **AI**: Google Gemini 2.0 Flash
- **데이터베이스**: Supabase (PostgreSQL)
- **통신**: Server-Sent Events (SSE)

---

## 전체 프로세스

### 1. 사용자 인터랙션
```
Archive Page → Day 선택 → "AI 분석" 버튼 클릭
└─> AnalyzeVideoDialog 열림
```

### 2. 입력 설정
**AnalyzeVideoDialog.tsx**
- YouTube Player로 영상 미리보기
- 플랫폼 선택 (EPT, Triton, PokerStars, WSOP, Hustler)
- 게임플레이 구간 선택 (VideoSegment[])
- 선택적: 플레이어 이름 입력

**VideoSegment 구조**:
```typescript
interface VideoSegment {
  startTime: string  // "HH:MM:SS"
  endTime: string    // "HH:MM:SS"
  type: 'gameplay' | 'break'  // gameplay만 분석
}
```

### 3. 데이터 준비
```typescript
// VideoSegment → TimeSegment 변환
const timeSegments: TimeSegment[] = videoSegments
  .filter(s => s.type === 'gameplay')
  .map(convertToTimeSegment)

// TimeSegment: { start: number, end: number } (초 단위)
```

### 4. Server Action 호출
**app/actions/hae-analysis.ts: startHaeAnalysis()**

**단계**:
1. YouTube video ID 추출
2. 게임플레이 세그먼트 필터링
3. `videos` 테이블에 레코드 생성/조회
4. `analysis_jobs` 테이블에 작업 생성 (status: pending)
5. 백그라운드 처리 시작: `processHaeJob()`
6. jobId 반환

### 5. 백그라운드 처리
**processHaeJob() - 비동기**

각 세그먼트마다:
1. 작업 상태 업데이트: `pending` → `processing`
2. Python 백엔드 호출 (HAE-MVP)
   ```
   POST http://localhost:8000/api/analyze-video
   Body: { youtubeUrl, startTime, endTime, platform }
   ```
3. SSE 스트림 수신 (progress, complete, error)
4. 핸드 데이터 파싱

### 6. Python 백엔드 (HAE-MVP)
**backend/main.py: /api/analyze-video**

**파이프라인**:
1. **Download** (0-25%): yt-dlp로 영상 다운로드
2. **Upload** (25-50%): Gemini File API에 업로드
3. **Processing** (50-75%): Gemini 영상 처리
4. **Analysis** (75-100%): AI 핸드 추출

**응답 (SSE)**:
```typescript
{
  event: 'progress',
  data: { step, message, percent }
}
{
  event: 'complete',
  data: { hands: [...], rawResponse, fileUri }
}
```

### 7. 데이터 저장
**parseAndSaveHands() 함수**

**저장 순서**:
1. `hands` 테이블: 핸드 기본 정보
2. `hand_players` 테이블: 플레이어별 정보
3. `hand_actions` 테이블: 액션 시퀀스
4. `analysis_jobs` 업데이트: `complete` | `failed`

### 8. 결과 표시
**프론트엔드**:
- SSE 이벤트 수신하여 실시간 진행률 표시
- 완료 시 성공 메시지 및 결과 통계
- Archive 페이지 자동 새로고침

---

## 주요 컴포넌트

### 프론트엔드

#### AnalyzeVideoDialog.tsx
**역할**: 분석 설정 UI
- YouTube Player 통합
- 세그먼트 타임라인 편집
- 플랫폼 및 플레이어 설정
- 분석 시작 및 진행률 표시

**주요 상태**:
```typescript
{
  status: 'idle' | 'analyzing' | 'complete' | 'error'
  progress: number  // 0-100
  logs: AnalysisLog[]
  detectedHands: HandPreview[]
}
```

#### ArchiveMainPanel.tsx
**역할**: Archive 메인 UI
- Day 목록 표시
- "AI 분석" 버튼 (High Templar 이상)
- Dialog 열기: `useArchiveUIStore().openAnalyzeDialog()`

### 백엔드

#### app/actions/hae-analysis.ts
**startHaeAnalysis()**: Server Action 엔트리포인트
- 입력 검증 (Zod)
- 권한 체크 (High Templar)
- 작업 생성 및 백그라운드 처리

**processHaeJob()**: 비동기 백그라운드 처리
- Python 백엔드 호출
- SSE 스트림 파싱
- 핸드 데이터 저장

#### backend/main.py (HAE-MVP)
**POST /api/analyze-video**: 영상 분석 API
- yt-dlp로 다운로드
- Gemini File API 업로드
- AI 분석 실행
- SSE로 진행률 스트리밍

---

## 데이터 흐름

### 타입 변환

**1. VideoSegment → TimeSegment**
```typescript
// Frontend input
VideoSegment: { startTime: "00:05:30", endTime: "00:10:15" }

// Converted to
TimeSegment: { start: 330, end: 615 }  // seconds
```

**2. Gemini Response → Database**
```typescript
// Gemini AI output
{
  hands: [{
    handNumber: 1,
    timestamp: "00:01:23",
    players: [{ name: "PLAYER", cards: ["Ah", "Ks"] }],
    actions: [{ player: "PLAYER", action: "raise" }]
  }]
}

// Saved to database
hands: { number, timestamp_seconds, pot, board, ... }
hand_players: { hand_id, player_id, hole_cards, ... }
hand_actions: { hand_id, sequence, street, action, ... }
```

### 데이터베이스 스키마

**videos**:
```sql
id UUID, youtube_video_id TEXT, title TEXT, duration INTEGER
```

**analysis_jobs**:
```sql
id UUID, video_id UUID, stream_id UUID, status TEXT,
segments JSONB, players JSONB, results JSONB
```

**hands**:
```sql
id UUID, stream_id UUID, number INTEGER, timestamp_seconds INTEGER,
pot BIGINT, board JSONB, analyzed_by TEXT, analysis_confidence NUMERIC
```

**hand_players**:
```sql
id UUID, hand_id UUID, player_name TEXT, position TEXT,
stack_size BIGINT, hole_cards TEXT[], final_stack BIGINT
```

**hand_actions**:
```sql
id UUID, hand_id UUID, sequence INTEGER, player_name TEXT,
street TEXT, action TEXT, amount BIGINT
```

---

## 에러 처리

### 프론트엔드

**입력 검증**:
- YouTube URL 형식
- 세그먼트 시간 순서
- 플랫폼 선택 필수

**에러 표시**:
- Toast 알림
- Dialog 내 에러 메시지
- 상세 로그 표시

### 백엔드

**Server Action 에러**:
```typescript
try {
  // 분석 처리
} catch (error) {
  // 1. analysis_jobs 상태 업데이트: failed
  // 2. 에러 메시지 기록
  // 3. 클라이언트에 에러 반환
}
```

**Python 백엔드 에러**:
- yt-dlp 실패: 다운로드 재시도 (최대 3회)
- Gemini API 에러: 에러 메시지 SSE로 전송
- 타임아웃: 900초 제한 (Cloud Run)

**복구 전략**:
1. 임시 파일 정리 (`/tmp/*.mp4`)
2. 작업 상태 롤백
3. 재시도 메커니즘 (다운로드만)

---

## 주요 함수

### startHaeAnalysis()
**위치**: `app/actions/hae-analysis.ts`
**역할**: Server Action 엔트리포인트

```typescript
export async function startHaeAnalysis(
  videoUrl: string,
  segments: TimeSegment[],
  players: PlayerInput[],
  streamId: string,
  platform: Platform
): Promise<{ success: boolean; jobId?: string; error?: string }>
```

### processHaeJob()
**위치**: `app/actions/hae-analysis.ts`
**역할**: 비동기 백그라운드 처리

```typescript
async function processHaeJob(
  jobId: string,
  videoUrl: string,
  segments: TimeSegment[],
  players: PlayerInput[],
  streamId: string,
  platform: Platform
): Promise<void>
```

### parseAndSaveHands()
**위치**: `app/actions/hae-analysis.ts`
**역할**: Gemini 응답을 데이터베이스에 저장

```typescript
async function parseAndSaveHands(
  geminiResponse: string,
  streamId: string,
  players: PlayerInput[]
): Promise<{ saved: number; failed: number }>
```

### analyzeVideo() (Python)
**위치**: `backend/routes/analyze.py`
**역할**: 영상 분석 API 엔드포인트 (SSE)

```python
async def analyze_video(request: AnalysisRequest):
    # 1. Download video
    # 2. Upload to Gemini
    # 3. Analyze with AI
    # 4. Stream progress via SSE
    yield SSEEvent(event='progress', data={...})
    yield SSEEvent(event='complete', data={...})
```

---

## 성능 최적화

### 프론트엔드
- SSE 연결 재사용
- 진행률 업데이트 디바운싱
- 대용량 로그 가상 스크롤

### 백엔드
- 세그먼트별 병렬 처리 (향후)
- 임시 파일 즉시 삭제
- 데이터베이스 트랜잭션 배치

---

## 제약 사항

### Gemini API (2025년 1월 기준)
- **영상 길이**: 1시간/세그먼트 (기본 해상도)
- **무료 계층**: 15 RPM, 일일 1,500 요청
- **YouTube 다운로드**: 8시간/일 (무료)

### 시스템
- **분석 타임아웃**: 900초 (Cloud Run)
- **메모리**: 2GB RAM
- **동시 처리**: 1개 작업 (순차 처리)

---

## 문제 해결

### 일반적인 문제

**1. "YouTube video not found"**
- 원인: 비공개/삭제된 영상
- 해결: 공개 영상 URL 사용

**2. "Analysis timeout"**
- 원인: 영상이 너무 길거나 복잡
- 해결: 세그먼트를 짧게 분할 (< 30분)

**3. "No hands detected"**
- 원인: 게임플레이가 아닌 구간 포함
- 해결: 게임플레이 구간만 정확히 선택

**4. "Gemini API quota exceeded"**
- 원인: 무료 계층 한도 초과
- 해결: 유료 계층으로 업그레이드

### 디버깅

**로그 위치**:
- 프론트엔드: Browser Console
- Server Action: Vercel 로그
- Python 백엔드: Cloud Run 로그

**확인 사항**:
1. `analysis_jobs` 테이블 상태
2. `videos` 테이블 레코드 존재
3. Gemini API 키 유효성
4. Cloud Run 서비스 상태

---

## 참고 문서

- **HAE MVP CLAUDE.md**: Python 백엔드 상세
- **GEMINI_UPGRADE_GUIDE.md**: API 제한 및 가격
- **CLAUDE.md**: 전체 아키텍처
- **PRD.md**: 제품 요구사항

---

**마지막 업데이트**: 2025-11-12
**버전**: 2.0 (압축 버전 - 1692줄 → 400줄)
