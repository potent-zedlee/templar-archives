# AI 분석 프로세스 전체 흐름 분석

**작성일**: 2025-11-11
**버전**: 1.0
**목적**: 프론트엔드에서 AI 분석 요청부터 결과 저장까지의 전체 데이터 흐름 분석

---

## 📋 목차

1. [개요](#개요)
2. [전체 프로세스 플로우차트](#전체-프로세스-플로우차트)
3. [단계별 상세 분석](#단계별-상세-분석)
4. [데이터 변환 과정](#데이터-변환-과정)
5. [에러 처리](#에러-처리)
6. [주요 함수 및 컴포넌트](#주요-함수-및-컴포넌트)
7. [잠재적 문제점 및 개선 제안](#잠재적-문제점-및-개선-제안)

---

## 개요

Templar Archives의 AI 분석 시스템은 포커 영상에서 핸드 히스토리를 자동으로 추출하는 기능입니다. 이 문서는 사용자가 Archive 페이지에서 "AI 분석" 버튼을 클릭한 후, Gemini AI가 영상을 분석하여 데이터베이스에 핸드 데이터를 저장하기까지의 전체 과정을 상세히 분석합니다.

### 주요 기술 스택
- **프론트엔드**: Next.js 16.0.1, React 19.2, TypeScript 5.9.3
- **백엔드**: Python FastAPI (HAE-MVP)
- **AI**: Google Gemini 1.5 Pro
- **데이터베이스**: Supabase (PostgreSQL)
- **통신**: Server-Sent Events (SSE) for real-time progress

---

## 전체 프로세스 플로우차트

```
┌─────────────────────────────────────────────────────────────────────┐
│                     1. USER INTERACTION                             │
│  Archive Page → Select Day → Click "AI 분석" Button                 │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  2. DIALOG OPENING (UI Layer)                       │
│  ArchiveMainPanel.tsx                                               │
│  - openAnalyzeDialog(selectedDayData)                               │
│  - Zustand Store: useArchiveUIStore                                 │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              3. ANALYZE VIDEO DIALOG (Input Layer)                  │
│  AnalyzeVideoDialog.tsx                                             │
│  - Video Player + Interactive Timeline                              │
│  - Platform Selection (EPT, Triton, PokerStars, WSOP, Hustler)    │
│  - Optional: Player Names                                           │
│  - VideoSegment[] → segments (gameplay only)                        │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              4. DATA PREPARATION (Frontend)                         │
│  AnalyzeVideoDialog.handleAnalyze()                                 │
│  - Filter valid players (non-empty names)                           │
│  - Convert VideoSegment[] → TimeSegment[]                           │
│    VideoSegment: { startTime: "HH:MM:SS", endTime: "HH:MM:SS" }   │
│    TimeSegment:  { start: number, end: number } (seconds)          │
│  - Status: idle → analyzing                                         │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│            5. SERVER ACTION (Next.js Server)                        │
│  app/actions/hae-analysis.ts                                        │
│  startHaeAnalysis({ videoUrl, segments, players, streamId })       │
│                                                                     │
│  Steps:                                                             │
│  1. Extract YouTube video ID                                        │
│  2. Filter gameplay segments only                                   │
│  3. Create/Get video record (videos table)                         │
│  4. Create analysis_jobs record (status: pending)                  │
│  5. Start background processing: processHaeJob()                   │
│  6. Return { success: true, jobId }                                │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│           6. BACKGROUND PROCESSING (Server-Side)                    │
│  processHaeJob() - Async Function                                   │
│                                                                     │
│  For each segment:                                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. Update job status: pending → processing                   │  │
│  │ 2. Call Python Backend (HAE-MVP)                             │  │
│  │    POST http://localhost:8000/api/analyze-video              │  │
│  │    Body: { youtubeUrl, startTime, endTime, platform }        │  │
│  │ 3. Stream SSE events (progress, complete, error)             │  │
│  │ 4. Parse SSE stream and extract hands                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│           7. PYTHON BACKEND (HAE-MVP FastAPI)                       │
│  Location: /hae-mvp/backend/routes/analyze.py                      │
│                                                                     │
│  Steps:                                                             │
│  1. Validate request (video ID, time range, platform)              │
│  2. Create AnalysisOrchestrator                                    │
│  3. Return EventSourceResponse (SSE stream)                        │
│                                                                     │
│  AnalysisOrchestrator.run():                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. Initialize Gemini client                                  │  │
│  │ 2. Upload video segment to Gemini                            │  │
│  │ 3. Send analysis prompt (EPT or Triton)                      │  │
│  │ 4. Stream progress events (0% → 100%)                        │  │
│  │ 5. Parse Gemini response (JSON)                              │  │
│  │ 6. Emit 'complete' event with hands data                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│           8. DATA STORAGE (Supabase PostgreSQL)                     │
│  processHaeJob() continues...                                       │
│                                                                     │
│  For each hand in segmentResult.hands:                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. INSERT INTO hands                                         │  │
│  │    - day_id, job_id, number, description, timestamp          │  │
│  │    - board_flop, board_turn, board_river, pot_size          │  │
│  │    - raw_data (full JSON)                                    │  │
│  │                                                              │  │
│  │ 2. For each player:                                          │  │
│  │    a. findOrCreatePlayer() → player_id                       │  │
│  │    b. INSERT INTO hand_players                               │  │
│  │       - hand_id, player_id, seat, position                   │  │
│  │       - hole_cards, starting_stack, is_winner               │  │
│  │                                                              │  │
│  │ 3. For each action:                                          │  │
│  │    a. INSERT INTO hand_actions                               │  │
│  │       - hand_id, player_id, action_order                     │  │
│  │       - street, action_type, amount                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  4. Update job status: processing → completed (progress: 100%)     │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│            9. UI UPDATE (React Query Invalidation)                  │
│  AnalyzeVideoDialog                                                 │
│  - Status: analyzing → success                                      │
│  - Display success message                                          │
│  - Show job ID                                                      │
│  - onSuccess callback                                               │
│                                                                     │
│  ArchiveDialogs.handleAnalyzeSuccess()                              │
│  - queryClient.invalidateQueries(archiveKeys.hands(dayId))        │
│  - Automatically refetch hands for the selected day                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 단계별 상세 분석

### 1. User Interaction (사용자 인터랙션)

**위치**: `app/(main)/archive/_components/ArchiveMainPanel.tsx`

#### 시작점
```tsx
// Line 158-168
<Button
  variant="default"
  size="lg"
  onClick={() => selectedDayData.video_url && openAnalyzeDialog(selectedDayData)}
  disabled={!selectedDayData.video_url}
  className="bg-gradient-to-r from-purple-500 to-pink-500..."
>
  <Sparkles className="h-5 w-5 mr-2" />
  AI 분석
</Button>
```

#### 조건
- `selectedDayData.video_url`이 존재해야 함 (YouTube URL)
- Day가 선택되어 있어야 함

#### 상태 관리
- **Zustand Store**: `useArchiveUIStore`
- **Action**: `openAnalyzeDialog(selectedDayData)`

---

### 2. Dialog Opening (다이얼로그 열기)

**위치**: `stores/archive-ui-store.ts`

#### Zustand Action
```typescript
openAnalyzeDialog: (day: Stream) => {
  set({
    analyzeDialog: { isOpen: true },
    analyzeDayForDialog: day
  })
}
```

#### Dialog 렌더링
**위치**: `app/(main)/archive/_components/ArchiveDialogs.tsx`

```tsx
// Line 342-347
<AnalyzeVideoDialog
  isOpen={analyzeDialog.isOpen}
  onOpenChange={closeAnalyzeDialog}
  day={analyzeDayForDialog}
  onSuccess={handleAnalyzeSuccess}
/>
```

---

### 3. Analyze Video Dialog (입력 UI)

**위치**: `components/archive-dialogs/analyze-video-dialog.tsx`

#### 주요 UI 구성 요소

1. **Video Player** (좌측)
   - `VideoPlayerWithTimestamp` 컴포넌트
   - YouTube 영상 재생 및 현재 시간 추적
   - 영상 길이 (duration) 제공

2. **Interactive Timeline** (좌측 하단)
   - `InteractiveTimeline` 컴포넌트
   - 영상 구간 설정 (VideoSegment[])
   - 드래그 앤 드롭으로 시작/종료 시간 조절
   - 세그먼트 타입: countdown, opening, **gameplay**, break, ending

3. **Form Inputs** (우측)
   - **플랫폼 선택**: EPT (기본값), Triton, PokerStars, WSOP, Hustler
   - **플레이어 입력** (선택 사항): 이름 매칭 정확도 향상

#### 상태 (State)
```typescript
const [platform, setPlatform] = useState<Platform>("ept")  // 기본값: EPT
const [players, setPlayers] = useState<PlayerInput[]>([])
const [segments, setSegments] = useState<VideoSegment[]>([])
const [status, setStatus] = useState<AnalysisStatus>("idle")
const [progress, setProgress] = useState("")
const [jobId, setJobId] = useState<string | null>(null)
```

#### 플랫폼 매핑
```typescript
// hae-analysis.ts
const ANALYSIS_PLATFORM_MAP: Record<HaePlatform, 'ept' | 'triton'> = {
  ept: 'ept',
  pokerstars: 'ept',    // PokerStars → EPT 프롬프트
  wsop: 'ept',          // WSOP → EPT 프롬프트
  triton: 'triton',
  hustler: 'triton',    // Hustler → Triton 프롬프트
}
```

---

### 4. Data Preparation (데이터 준비)

**위치**: `components/archive-dialogs/analyze-video-dialog.tsx` (Line 94-144)

#### handleAnalyze() 함수

```typescript
const handleAnalyze = async () => {
  // 1. 검증
  if (!day?.video_url) {
    setError("영상 URL이 없습니다")
    return
  }

  // 2. 상태 업데이트
  setStatus("analyzing")
  setProgress("Gemini AI가 영상을 분석하고 있습니다...")

  try {
    // 3. 플레이어 필터링 (빈 문자열 제거)
    const validPlayers = players
      .filter(p => p.name.trim())
      .map(p => p.name)

    // 4. VideoSegment[] → TimeSegment[] 변환
    const timeSegments: TimeSegment[] = segments.map(seg => ({
      id: seg.id,
      type: seg.type,
      start: timeStringToSeconds(seg.startTime),  // "HH:MM:SS" → 초
      end: timeStringToSeconds(seg.endTime),
      label: seg.type
    }))

    // 5. 서버 액션 호출
    const result = await startHaeAnalysis({
      videoUrl: day.video_url,
      segments: timeSegments,
      players: validPlayers.length > 0 ? validPlayers : undefined,
      streamId: day.id,
      platform
    })

    // 6. 결과 처리
    if (!result.success) {
      throw new Error(result.error || "분석에 실패했습니다")
    }

    setJobId(result.jobId ?? null)
    setStatus("success")
    setProgress("분석 작업이 접수되었습니다.")
    toast.success("분석 요청이 접수되었습니다.")
  } catch (err) {
    setStatus("error")
    setError(err instanceof Error ? err.message : "분석 중 오류")
  }
}
```

#### 데이터 변환 예시
```typescript
// Input: VideoSegment
{
  id: "1",
  type: "gameplay",
  startTime: "03:25",      // MM:SS
  endTime: "45:30"
}

// Output: TimeSegment
{
  id: "1",
  type: "gameplay",
  start: 205,              // 3분 25초 → 205초
  end: 2730,               // 45분 30초 → 2730초
  label: "gameplay"
}
```

---

### 5. Server Action (Next.js 서버 액션)

**위치**: `app/actions/hae-analysis.ts`

#### startHaeAnalysis() 함수

```typescript
export async function startHaeAnalysis(
  input: HaeStartInput
): Promise<HaeStartResult> {
  try {
    const supabase = await createServerSupabaseClient()

    // 1. 플랫폼 매핑
    const selectedPlatform = input.platform || DEFAULT_PLATFORM  // 기본값: 'ept'
    const dbPlatform = DB_PLATFORM_MAP[selectedPlatform]
    const analysisPlatform = ANALYSIS_PLATFORM_MAP[selectedPlatform]

    // 2. YouTube 비디오 ID 추출
    const videoId = extractVideoId(input.videoUrl)
    if (!videoId) {
      return { success: false, error: 'Invalid YouTube URL' }
    }

    // 3. gameplay 세그먼트만 필터링
    const gameplaySegments = input.segments.filter((s) => s.type === 'gameplay')
    if (gameplaySegments.length === 0) {
      return { success: false, error: 'No gameplay segments provided' }
    }

    // 4. videos 테이블에 레코드 생성/조회
    let dbVideoId: string
    const { data: existingVideo } = await supabase
      .from('videos')
      .select('id')
      .eq('youtube_id', videoId)
      .single()

    if (!existingVideo) {
      const { data: newVideo } = await supabase
        .from('videos')
        .insert({
          url: input.videoUrl,
          youtube_id: videoId,
          platform: 'youtube'
        })
        .select('id')
        .single()
      dbVideoId = newVideo.id
    } else {
      dbVideoId = existingVideo.id
    }

    // 5. analysis_jobs 테이블에 작업 생성
    const { data: job } = await supabase
      .from('analysis_jobs')
      .insert({
        video_id: dbVideoId,
        stream_id: input.streamId || null,
        platform: dbPlatform,
        status: 'pending',
        segments: gameplaySegments,
        progress: 0,
        ai_provider: 'gemini',
        submitted_players: input.players || null,
      })
      .select('id')
      .single()

    // 6. 백그라운드 프로세싱 시작 (비동기)
    processHaeJob(job.id, videoId, gameplaySegments, input.streamId, selectedPlatform)
      .catch(console.error)

    return {
      success: true,
      jobId: job.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
```

#### 주요 작업
1. ✅ YouTube URL 검증 및 비디오 ID 추출
2. ✅ gameplay 세그먼트만 필터링
3. ✅ `videos` 테이블에 레코드 생성/조회
4. ✅ `analysis_jobs` 테이블에 작업 생성 (status: pending)
5. ✅ 백그라운드 프로세싱 시작 (`processHaeJob()`)
6. ✅ 즉시 응답 반환 (jobId)

---

### 6. Background Processing (백그라운드 처리)

**위치**: `app/actions/hae-analysis.ts` (Line 222-513)

#### processHaeJob() 함수 (비동기)

```typescript
async function processHaeJob(
  jobId: string,
  youtubeId: string,
  segments: TimeSegment[],
  streamId?: string,
  platform: HaePlatform = DEFAULT_PLATFORM
) {
  const supabase = getServiceSupabaseClient()

  try {
    // 1. 작업 상태 업데이트: pending → processing
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    // 2. streamId 확보 (없으면 "Unsorted Hands" 생성)
    let finalStreamId = streamId || await createDefaultStream()

    const fullYoutubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`
    const analysisPlatform = ANALYSIS_PLATFORM_MAP[platform]
    let totalHands = 0

    // 3. 각 세그먼트 처리 (순차적)
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]

      // 진행률 업데이트
      const progressPercent = Math.round((i / segments.length) * 100)
      await supabase
        .from('analysis_jobs')
        .update({ progress: progressPercent })
        .eq('id', jobId)

      // 4. Python 백엔드 호출
      const backendUrl = process.env.HAE_BACKEND_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/api/analyze-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeUrl: fullYoutubeUrl,
          startTime: segment.start,
          endTime: segment.end,
          platform: analysisPlatform,
        }),
      })

      // 5. SSE 스트림 파싱
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let segmentResult: any = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const event of events) {
          const lines = event.split('\n')
          let eventType = ''
          let data = ''

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.substring(6).trim()
            } else if (line.startsWith('data:')) {
              data = line.substring(5).trim()
            }
          }

          if (eventType && data) {
            const parsed = JSON.parse(data)

            if (eventType === 'progress') {
              // 진행률 업데이트
              const overallProgress = progressPercent +
                Math.round((parsed.percent / 100) * (100 / segments.length))
              await supabase
                .from('analysis_jobs')
                .update({ progress: Math.min(overallProgress, 99) })
                .eq('id', jobId)

            } else if (eventType === 'complete') {
              segmentResult = parsed
              console.log(`Segment ${i} complete: ${parsed.hands?.length || 0} hands`)

            } else if (eventType === 'error') {
              console.error(`Segment ${i} error:`, parsed.error)
            }
          }
        }
      }

      // 6. 핸드 데이터 저장
      if (segmentResult && segmentResult.hands && segmentResult.hands.length > 0) {
        for (const handData of segmentResult.hands) {
          // 6a. hands 테이블에 삽입
          const { data: hand } = await supabase
            .from('hands')
            .insert({
              day_id: finalStreamId,
              job_id: jobId,
              number: String(handData.handNumber || ++totalHands),
              description: handData.description,
              timestamp: formatTimestamp(segment.start),
              video_timestamp_start: segment.start,
              video_timestamp_end: segment.end,
              stakes: handData.stakes,
              board_flop: handData.board?.flop || [],
              board_turn: handData.board?.turn || null,
              board_river: handData.board?.river || null,
              pot_size: handData.pot || 0,
              raw_data: handData,
            })
            .select('id')
            .single()

          // 6b. 각 플레이어 처리
          if (handData.players) {
            for (const playerData of handData.players) {
              const playerId = await findOrCreatePlayer(supabase, playerData.name)

              // hand_players 삽입
              const { data: handPlayer } = await supabase
                .from('hand_players')
                .insert({
                  hand_id: hand.id,
                  player_id: playerId,
                  seat: playerData.seat,
                  poker_position: playerData.position,
                  starting_stack: playerData.stackSize,
                  hole_cards: parseHoleCards(playerData.holeCards),
                  is_winner: !!winners.find(w => w.name === playerData.name),
                })
                .select('id')
                .single()

              // 6c. 각 액션 처리
              if (handData.actions) {
                const playerActions = handData.actions.filter(
                  (a: any) => a.player === playerData.name
                )

                for (let idx = 0; idx < playerActions.length; idx++) {
                  const action = playerActions[idx]

                  // hand_actions 삽입
                  await supabase.from('hand_actions').insert({
                    hand_id: hand.id,
                    player_id: playerId,
                    action_order: idx + 1,
                    street: action.street.toLowerCase(),
                    action_type: action.action.toLowerCase(),
                    amount: action.amount || 0,
                  })
                }
              }
            }
          }
        }
      }
    }

    // 7. 작업 완료
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

  } catch (error) {
    // 8. 에러 처리
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }
}
```

#### 주요 작업
1. ✅ 작업 상태 업데이트 (pending → processing)
2. ✅ 각 gameplay 세그먼트를 Python 백엔드로 전송
3. ✅ SSE 스트림 파싱 (progress, complete, error 이벤트)
4. ✅ 핸드 데이터 저장 (hands, hand_players, hand_actions)
5. ✅ 작업 완료/실패 상태 업데이트

---

### 7. Python Backend (HAE-MVP)

**위치**: `/hae-mvp/backend/routes/analyze.py`

#### API Endpoint
```
POST /api/analyze-video
```

#### Request Body
```typescript
{
  youtubeUrl: string,      // "https://www.youtube.com/watch?v=..."
  startTime: number,       // 시작 시간 (초)
  endTime: number,         // 종료 시간 (초)
  platform: "ept" | "triton"
}
```

#### Rate Limiting
- **제한**: 5 requests/minute per IP
- **라이브러리**: slowapi

#### 처리 흐름
```python
@router.post("/api/analyze-video")
@limiter.limit("5/minute")
async def analyze_video(request: Request, body: AnalyzeRequest):
    # 1. 요청 검증
    video_id = _validate_request(body)

    # 2. 안전한 YouTube URL 생성
    safe_youtube_url = f"https://www.youtube.com/watch?v={video_id}"

    # 3. Orchestrator 생성
    orchestrator = AnalysisOrchestrator(
        youtube_url=safe_youtube_url,
        request_body=body,
        api_key=settings.GOOGLE_API_KEY
    )

    # 4. SSE 스트림 반환
    return EventSourceResponse(orchestrator.run())
```

#### SSE Events
```typescript
// 1. Progress Event (진행률)
event: progress
data: { percent: 25, message: "Uploading video..." }

event: progress
data: { percent: 50, message: "Analyzing with Gemini..." }

// 2. Complete Event (완료)
event: complete
data: {
  hands: [
    {
      handNumber: 1,
      description: "Tom Dwan wins with a flush",
      stakes: "100/200/400",
      pot: 45000,
      board: {
        flop: ["A♠", "K♠", "Q♠"],
        turn: "J♠",
        river: "10♠"
      },
      players: [...],
      actions: [...],
      winners: [...]
    }
  ]
}

// 3. Error Event (에러)
event: error
data: { error: "Failed to analyze video" }
```

#### AnalysisOrchestrator 주요 작업
1. ✅ Gemini AI 클라이언트 초기화
2. ✅ YouTube 영상 업로드 (Gemini File API)
3. ✅ 플랫폼별 프롬프트 전송 (EPT or Triton)
4. ✅ Gemini 응답 파싱 (JSON)
5. ✅ SSE 이벤트 스트리밍
6. ✅ 에러 핸들링

---

### 8. Data Storage (데이터 저장)

#### Database Schema

##### 1. `hands` 테이블
```sql
hands (
  id UUID PRIMARY KEY,
  day_id UUID REFERENCES days(id),
  job_id UUID REFERENCES analysis_jobs(id),
  number TEXT,
  description TEXT,
  summary TEXT,
  timestamp TEXT,                     -- "MM:SS" 형식
  video_timestamp_start INT,          -- 초 단위
  video_timestamp_end INT,
  stakes TEXT,
  board_flop TEXT[],                  -- ["A♠", "K♥", "Q♦"]
  board_turn TEXT,
  board_river TEXT,
  pot_size NUMERIC,
  raw_data JSONB,                     -- 전체 Gemini 응답
  created_at TIMESTAMP
)
```

##### 2. `hand_players` 테이블
```sql
hand_players (
  id UUID PRIMARY KEY,
  hand_id UUID REFERENCES hands(id),
  player_id UUID REFERENCES players(id),
  seat INT,
  poker_position TEXT,                -- "BTN", "SB", "BB", etc.
  starting_stack NUMERIC,
  ending_stack NUMERIC,
  hole_cards TEXT[],                  -- ["A♠", "K♠"]
  cards TEXT,                         -- "A♠ K♠"
  final_amount NUMERIC,
  is_winner BOOLEAN,
  hand_description TEXT,              -- "Flush", "Straight", etc.
  created_at TIMESTAMP
)
```

##### 3. `hand_actions` 테이블
```sql
hand_actions (
  id UUID PRIMARY KEY,
  hand_id UUID REFERENCES hands(id),
  player_id UUID REFERENCES players(id),
  action_order INT,
  street TEXT,                        -- "preflop", "flop", "turn", "river"
  action_type TEXT,                   -- "bet", "call", "raise", "fold", "check"
  amount NUMERIC,
  created_at TIMESTAMP
)
```

##### 4. `players` 테이블
```sql
players (
  id UUID PRIMARY KEY,
  name TEXT,
  normalized_name TEXT,               -- 소문자, 특수문자 제거
  photo_url TEXT,
  country TEXT,
  total_winnings NUMERIC,
  created_at TIMESTAMP
)
```

##### 5. `analysis_jobs` 테이블
```sql
analysis_jobs (
  id UUID PRIMARY KEY,
  video_id UUID REFERENCES videos(id),
  stream_id UUID REFERENCES days(id),
  platform TEXT,                      -- "ept", "triton", "pokerstars", etc.
  status TEXT,                        -- "pending", "processing", "completed", "failed"
  segments JSONB,                     -- TimeSegment[]
  progress INT,                       -- 0-100
  ai_provider TEXT,                   -- "gemini"
  submitted_players TEXT[],
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP
)
```

---

### 9. UI Update (React Query Invalidation)

#### 성공 처리 (Frontend)

**위치**: `app/(main)/archive/_components/ArchiveDialogs.tsx` (Line 152-158)

```typescript
const handleAnalyzeSuccess = () => {
  // Invalidate hands query to show newly extracted hands
  if (analyzeDayForDialog?.id) {
    queryClient.invalidateQueries({
      queryKey: archiveKeys.hands(analyzeDayForDialog.id)
    })
  }
  closeAnalyzeDialog()
}
```

#### React Query 자동 리페칭

**위치**: `lib/queries/archive-queries.ts`

```typescript
export function useHandsQuery(dayId: string | null) {
  return useQuery({
    queryKey: archiveKeys.hands(dayId),
    queryFn: () => fetchHands(dayId),
    enabled: !!dayId,
    staleTime: 30000,  // 30초
  })
}
```

#### 자동 UI 갱신
1. ✅ `handleAnalyzeSuccess()` 호출
2. ✅ `invalidateQueries()` → hands 데이터 무효화
3. ✅ React Query가 자동으로 `fetchHands()` 재실행
4. ✅ `ArchiveHandHistory` 컴포넌트 자동 업데이트
5. ✅ 새로 추출된 핸드가 목록에 표시

---

## 데이터 변환 과정

### 1. VideoSegment → TimeSegment

**위치**: `components/archive-dialogs/analyze-video-dialog.tsx` (Line 112-118)

```typescript
// Input: VideoSegment (사용자 입력)
interface VideoSegment {
  id: string
  type: SegmentType
  startTime: string    // "HH:MM:SS" or "MM:SS"
  endTime: string
}

// Conversion
const timeSegments: TimeSegment[] = segments.map(seg => ({
  id: seg.id,
  type: seg.type,
  start: timeStringToSeconds(seg.startTime),  // 초로 변환
  end: timeStringToSeconds(seg.endTime),
  label: seg.type
}))

// Output: TimeSegment (서버로 전송)
interface TimeSegment {
  id: string
  type: SegmentType
  start: number        // 초 단위
  end: number
  label?: string
}
```

#### 변환 함수: `timeStringToSeconds()`
```typescript
// lib/types/video-segments.ts
export function timeStringToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map((p) => parseInt(p, 10))

  if (parts.length === 3) {
    // HH:MM:SS
    const [hours, minutes, seconds] = parts
    return hours * 3600 + minutes * 60 + seconds
  } else if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts
    return minutes * 60 + seconds
  }

  return 0
}
```

#### 예시
```typescript
// Input
{
  id: "1",
  type: "gameplay",
  startTime: "01:23:45",   // 1시간 23분 45초
  endTime: "02:15:30"      // 2시간 15분 30초
}

// Conversion
timeStringToSeconds("01:23:45")  // → 5025
timeStringToSeconds("02:15:30")  // → 8130

// Output
{
  id: "1",
  type: "gameplay",
  start: 5025,
  end: 8130,
  label: "gameplay"
}
```

---

### 2. Platform Mapping

#### Frontend → Database
**위치**: `app/actions/hae-analysis.ts` (Line 12-18)

```typescript
const DB_PLATFORM_MAP: Record<HaePlatform, 'triton' | 'pokerstars' | 'wsop' | 'hustler'> = {
  ept: 'pokerstars',       // EPT → pokerstars (DB)
  triton: 'triton',
  pokerstars: 'pokerstars',
  wsop: 'wsop',
  hustler: 'hustler',
}
```

#### Frontend → Python Backend (AI Analysis)
**위치**: `app/actions/hae-analysis.ts` (Line 20-26)

```typescript
const ANALYSIS_PLATFORM_MAP: Record<HaePlatform, 'ept' | 'triton'> = {
  ept: 'ept',              // EPT 프롬프트
  pokerstars: 'ept',       // PokerStars → EPT 프롬프트
  wsop: 'ept',             // WSOP → EPT 프롬프트
  triton: 'triton',        // Triton 프롬프트
  hustler: 'triton',       // Hustler → Triton 프롬프트
}
```

#### 이유
- **Python 백엔드**에는 2가지 프롬프트만 존재 (EPT, Triton)
- **데이터베이스**에는 실제 플랫폼 이름 저장
- 유사한 방송 형식은 같은 프롬프트 사용 (예: Hustler → Triton)

---

### 3. Hole Cards Parsing

**위치**: `app/actions/hae-analysis.ts` (Line 431-438)

```typescript
let holeCardsArray: string[] | null = null
if (playerData.holeCards) {
  if (Array.isArray(playerData.holeCards)) {
    holeCardsArray = playerData.holeCards
  } else if (typeof playerData.holeCards === 'string') {
    holeCardsArray = playerData.holeCards.split(/[\s,]+/).filter(Boolean)
  }
}
```

#### 예시
```typescript
// Case 1: Array (이미 파싱됨)
playerData.holeCards = ["A♠", "K♠"]
→ holeCardsArray = ["A♠", "K♠"]

// Case 2: String (공백 또는 쉼표로 구분)
playerData.holeCards = "A♠ K♠"
→ holeCardsArray = ["A♠", "K♠"]

playerData.holeCards = "A♠,K♠"
→ holeCardsArray = ["A♠", "K♠"]
```

---

## 에러 처리

### 1. Frontend Validation (프론트엔드 검증)

#### 위치: `components/archive-dialogs/analyze-video-dialog.tsx`

```typescript
const handleAnalyze = async () => {
  // 1. 영상 URL 확인
  if (!day?.video_url) {
    setError("영상 URL이 없습니다")
    return
  }

  // 2. 플레이어 필터링
  const validPlayers = players
    .filter(p => p.name.trim())  // 빈 문자열 제거
    .map(p => p.name)

  // 3. 세그먼트 변환
  const timeSegments: TimeSegment[] = segments.map(seg => ({
    id: seg.id,
    type: seg.type,
    start: timeStringToSeconds(seg.startTime),
    end: timeStringToSeconds(seg.endTime),
    label: seg.type
  }))

  // 4. 서버 액션 호출
  const result = await startHaeAnalysis({...})

  // 5. 결과 확인
  if (!result.success) {
    throw new Error(result.error || "분석에 실패했습니다")
  }

  // 6. 에러 처리
  catch (err) {
    setStatus("error")
    setError(err instanceof Error ? err.message : "분석 중 오류")
    toast.error(err instanceof Error ? err.message : "분석 중 오류")
  }
}
```

---

### 2. Server Action Validation (서버 액션 검증)

#### 위치: `app/actions/hae-analysis.ts`

```typescript
export async function startHaeAnalysis(
  input: HaeStartInput
): Promise<HaeStartResult> {
  try {
    // 1. YouTube URL 검증
    const videoId = extractVideoId(input.videoUrl)
    if (!videoId) {
      return {
        success: false,
        error: 'Invalid YouTube URL',
      }
    }

    // 2. 세그먼트 검증
    const gameplaySegments = input.segments.filter((s) => s.type === 'gameplay')
    if (gameplaySegments.length === 0) {
      return {
        success: false,
        error: 'No gameplay segments provided',
      }
    }

    // 3. 데이터베이스 작업
    const { data: newVideo, error: videoError } = await supabase
      .from('videos')
      .insert({...})

    if (videoError || !newVideo) {
      return {
        success: false,
        error: `Failed to create video record: ${videoError?.message}`,
      }
    }

    // 4. 작업 생성
    const { data: job, error: jobError } = await supabase
      .from('analysis_jobs')
      .insert({...})

    if (jobError) {
      return {
        success: false,
        error: `Failed to create analysis job: ${jobError.message}`,
      }
    }

    return {
      success: true,
      jobId: job.id,
    }

  } catch (error) {
    console.error('Start HAE error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
```

---

### 3. Background Processing Errors (백그라운드 에러)

#### 위치: `app/actions/hae-analysis.ts`

```typescript
async function processHaeJob(...) {
  const supabase = getServiceSupabaseClient()

  try {
    // 작업 진행...

  } catch (error) {
    console.error('HAE job processing error:', error)

    // 작업 상태를 'failed'로 업데이트
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }
}
```

#### 세그먼트별 에러 처리
```typescript
for (let i = 0; i < segments.length; i++) {
  const segment = segments[i]

  try {
    // 세그먼트 처리...

  } catch (segmentError) {
    console.error(`[HAE] Error processing segment ${i}:`, segmentError)
    // 다음 세그먼트 계속 진행 (부분 실패 허용)
  }
}
```

---

### 4. Python Backend Validation (백엔드 검증)

#### 위치: `/hae-mvp/backend/routes/analyze.py`

```python
def _validate_request(request: AnalyzeRequest) -> str:
    """
    Validate request parameters
    """
    # 1. YouTube URL 검증
    try:
        video_id = _extract_video_id(request.youtubeUrl)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 2. 시간 범위 검증
    if request.startTime < 0:
        raise HTTPException(status_code=400, detail="Start time must be >= 0")

    if request.endTime <= request.startTime:
        raise HTTPException(status_code=400, detail="End time must be > start time")

    # 3. 영상 길이 제한
    duration = request.endTime - request.startTime
    if duration > settings.MAX_VIDEO_DURATION:
        raise HTTPException(
            status_code=400,
            detail=f"Duration too long: {duration}s (max: {settings.MAX_VIDEO_DURATION}s)"
        )

    # 4. 플랫폼 검증
    if request.platform not in ["ept", "triton"]:
        raise HTTPException(status_code=400, detail="Invalid platform")

    return video_id
```

---

### 5. Rate Limiting (속도 제한)

#### Python Backend
```python
@router.post("/api/analyze-video")
@limiter.limit("5/minute")  # IP당 분당 5회
async def analyze_video(request: Request, body: AnalyzeRequest):
    ...
```

#### 제한 초과 시
```json
{
  "error": "Rate limit exceeded",
  "detail": "5 per 1 minute"
}
```

---

### 6. Network Errors (네트워크 에러)

#### Frontend (fetch 실패)
```typescript
// processHaeJob()
const response = await fetch(`${backendUrl}/api/analyze-video`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({...}),
})

if (!response.ok) {
  console.error(`[HAE] Backend error for segment ${i}:`, response.statusText)
  continue  // 다음 세그먼트 계속 진행
}
```

#### Timeout 처리 (현재 미구현)
```typescript
// TODO: 타임아웃 추가
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 300000)  // 5분

try {
  const response = await fetch(url, {
    signal: controller.signal,
    ...
  })
} finally {
  clearTimeout(timeoutId)
}
```

---

### 7. SSE Stream Errors (스트림 에러)

#### Python Backend
```python
# AnalysisOrchestrator.run()
try:
    # 분석 진행...
    yield {
        "event": "complete",
        "data": json.dumps({"hands": hands})
    }
except Exception as e:
    logger.error(f"Analysis failed: {str(e)}")
    yield {
        "event": "error",
        "data": json.dumps({"error": str(e)})
    }
```

#### Frontend (SSE 파싱)
```typescript
if (eventType === 'error') {
  console.error(`[HAE] Segment ${i} error:`, parsed.error)
  // 에러 로깅 후 계속 진행
}
```

---

## 주요 함수 및 컴포넌트

### Frontend Components

| 컴포넌트 | 위치 | 역할 |
|---------|------|------|
| `ArchivePageLayout` | `app/(main)/archive/_components/` | Archive 페이지 레이아웃 |
| `ArchiveMainPanel` | `app/(main)/archive/_components/` | Day 정보 및 AI 분석 버튼 |
| `ArchiveDialogs` | `app/(main)/archive/_components/` | 모든 다이얼로그 통합 관리 |
| `AnalyzeVideoDialog` | `components/archive-dialogs/` | AI 분석 입력 UI |
| `InteractiveTimeline` | `components/` | 영상 구간 설정 타임라인 |
| `VideoPlayerWithTimestamp` | `components/` | YouTube 영상 플레이어 |

### Frontend Functions

| 함수 | 위치 | 역할 |
|------|------|------|
| `openAnalyzeDialog()` | `stores/archive-ui-store.ts` | 다이얼로그 열기 |
| `handleAnalyze()` | `analyze-video-dialog.tsx` | 분석 시작 |
| `timeStringToSeconds()` | `lib/types/video-segments.ts` | 시간 변환 |
| `startHaeAnalysis()` | `app/actions/hae-analysis.ts` | 서버 액션 (작업 생성) |
| `processHaeJob()` | `app/actions/hae-analysis.ts` | 백그라운드 처리 |
| `findOrCreatePlayer()` | `app/actions/hae-analysis.ts` | 플레이어 생성/조회 |

### Backend Functions

| 함수 | 위치 | 역할 |
|------|------|------|
| `analyze_video()` | `backend/routes/analyze.py` | API 엔드포인트 |
| `_validate_request()` | `backend/routes/analyze.py` | 요청 검증 |
| `_extract_video_id()` | `backend/routes/analyze.py` | YouTube ID 추출 |
| `AnalysisOrchestrator.run()` | `backend/services/analysis_orchestrator.py` | Gemini AI 분석 |

---

## 잠재적 문제점 및 개선 제안

### 1. ⚠️ Timeout 미구현

**문제**:
- `processHaeJob()`에서 Python 백엔드 호출 시 타임아웃 설정 없음
- 영상이 길거나 Gemini API가 느릴 경우 무한 대기 가능

**개선 제안**:
```typescript
// app/actions/hae-analysis.ts
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 300000)  // 5분

try {
  const response = await fetch(`${backendUrl}/api/analyze-video`, {
    method: 'POST',
    signal: controller.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({...}),
  })
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('[HAE] Request timeout')
  }
} finally {
  clearTimeout(timeoutId)
}
```

---

### 2. ⚠️ 에러 복구 메커니즘 부족

**문제**:
- 세그먼트 분석 실패 시 다음 세그먼트는 계속 진행하지만 사용자에게 알림 없음
- 부분 실패 (일부 세그먼트만 성공) 케이스 처리 미흡

**개선 제안**:
```typescript
// 부분 성공 추적
let successCount = 0
let failCount = 0
const failedSegments: number[] = []

for (let i = 0; i < segments.length; i++) {
  try {
    // 세그먼트 처리...
    successCount++
  } catch (error) {
    failCount++
    failedSegments.push(i)
  }
}

// 작업 완료 시 메타데이터 저장
await supabase
  .from('analysis_jobs')
  .update({
    status: failCount === segments.length ? 'failed' : 'completed',
    progress: 100,
    metadata: {
      successCount,
      failCount,
      failedSegments,
      totalSegments: segments.length
    }
  })
  .eq('id', jobId)
```

---

### 3. ⚠️ 진행률 업데이트 동기화 문제

**문제**:
- SSE 스트림에서 progress 이벤트를 받지만 프론트엔드에 실시간 반영 안 됨
- 다이얼로그는 "분석 진행 중..." 메시지만 표시

**개선 제안**:
```typescript
// AnalyzeVideoDialog에서 Supabase Realtime 구독
useEffect(() => {
  if (!jobId) return

  const channel = supabase
    .channel(`job:${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'analysis_jobs',
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        const updatedJob = payload.new as any
        setProgress(`진행률: ${updatedJob.progress}%`)

        if (updatedJob.status === 'completed') {
          setStatus('success')
        } else if (updatedJob.status === 'failed') {
          setStatus('error')
          setError(updatedJob.error_message)
        }
      }
    )
    .subscribe()

  return () => {
    channel.unsubscribe()
  }
}, [jobId])
```

---

### 4. ⚠️ 중복 분석 방지 미흡

**문제**:
- 같은 영상 + 같은 세그먼트를 여러 번 분석 가능
- 중복 데이터 생성 가능성

**개선 제안**:
```typescript
// startHaeAnalysis()
// 1. 기존 작업 확인
const { data: existingJobs } = await supabase
  .from('analysis_jobs')
  .select('*')
  .eq('video_id', dbVideoId)
  .eq('status', 'processing')
  .or('status.eq.completed')

// 2. 세그먼트 비교
const isDuplicate = existingJobs?.some(job => {
  return JSON.stringify(job.segments) === JSON.stringify(gameplaySegments)
})

if (isDuplicate) {
  return {
    success: false,
    error: '이미 분석 중이거나 완료된 작업입니다.',
  }
}
```

---

### 5. ⚠️ 플레이어 이름 매칭 정확도

**문제**:
- `normalizePlayerName()` 함수가 너무 단순 (소문자 + 특수문자 제거)
- "Tom Dwan", "TomDwan", "tom-dwan" 등을 구분 못함

**개선 제안**:
```typescript
// Levenshtein Distance 사용
import { distance } from 'fastest-levenshtein'

function findBestPlayerMatch(name: string, existingPlayers: Player[]): Player | null {
  const normalized = normalizePlayerName(name)

  let bestMatch: Player | null = null
  let bestScore = Infinity

  for (const player of existingPlayers) {
    const score = distance(normalized, player.normalized_name)
    if (score < bestScore && score <= 3) {  // 최대 3자 차이 허용
      bestScore = score
      bestMatch = player
    }
  }

  return bestMatch
}
```

---

### 6. ⚠️ 데이터 일관성 문제

**문제**:
- `processHaeJob()`에서 트랜잭션 미사용
- 중간에 실패 시 일부 데이터만 저장될 수 있음

**개선 제안**:
```typescript
// 트랜잭션 사용
try {
  // BEGIN TRANSACTION (Supabase에서는 RPC 함수 사용)
  await supabase.rpc('begin_transaction')

  // hands, hand_players, hand_actions 삽입
  // ...

  // COMMIT
  await supabase.rpc('commit_transaction')
} catch (error) {
  // ROLLBACK
  await supabase.rpc('rollback_transaction')
  throw error
}
```

---

### 7. ✅ 보안 문제 (이미 해결됨)

**해결됨**:
- Python 백엔드에서 YouTube URL 검증
- SQL Injection 방지 (Supabase ORM 사용)
- Rate Limiting (5 req/min)
- CORS 설정

---

### 8. 📈 성능 최적화 제안

#### 1) Batch Insert
**현재**: 각 핸드/플레이어/액션을 개별 INSERT
**개선**: 배치 INSERT로 DB 호출 횟수 감소

```typescript
// 현재
for (const handData of segmentResult.hands) {
  await supabase.from('hands').insert({...})

  for (const playerData of handData.players) {
    await supabase.from('hand_players').insert({...})

    for (const action of playerActions) {
      await supabase.from('hand_actions').insert({...})
    }
  }
}

// 개선
const handsToInsert = []
const playersToInsert = []
const actionsToInsert = []

for (const handData of segmentResult.hands) {
  handsToInsert.push({...})

  for (const playerData of handData.players) {
    playersToInsert.push({...})

    for (const action of playerActions) {
      actionsToInsert.push({...})
    }
  }
}

// 배치 INSERT
await supabase.from('hands').insert(handsToInsert)
await supabase.from('hand_players').insert(playersToInsert)
await supabase.from('hand_actions').insert(actionsToInsert)
```

#### 2) 병렬 처리
**현재**: 세그먼트를 순차적으로 처리
**개선**: 여러 세그먼트를 병렬로 처리 (최대 3개 동시)

```typescript
// 병렬 처리 (최대 3개 동시)
const CONCURRENCY = 3

for (let i = 0; i < segments.length; i += CONCURRENCY) {
  const batch = segments.slice(i, i + CONCURRENCY)

  await Promise.all(
    batch.map(segment => processSegment(segment))
  )
}
```

---

### 9. 📊 모니터링 개선

**추가 제안**:
1. **로깅**: 각 단계별 상세 로그 (시작/종료 시간, 소요 시간)
2. **메트릭**: Prometheus/Grafana 연동
3. **알림**: 실패 시 Slack/Discord 알림
4. **대시보드**: 관리자 페이지에서 작업 상태 모니터링

```typescript
// 로깅 예시
console.log('[HAE] Job started:', {
  jobId,
  videoId,
  segmentCount: segments.length,
  platform,
  startTime: new Date().toISOString()
})

console.log('[HAE] Segment processed:', {
  jobId,
  segmentIndex: i,
  handsExtracted: segmentResult.hands.length,
  duration: Date.now() - startTime
})

console.log('[HAE] Job completed:', {
  jobId,
  totalHands,
  totalDuration: Date.now() - jobStartTime
})
```

---

## 요약

### 전체 프로세스 요약

1. **사용자 인터랙션**: Archive 페이지에서 Day 선택 → "AI 분석" 버튼 클릭
2. **다이얼로그 열기**: 플랫폼 선택, 영상 구간 설정, 플레이어 입력
3. **데이터 준비**: VideoSegment → TimeSegment 변환
4. **서버 액션**: 작업 생성 (analysis_jobs) 및 백그라운드 처리 시작
5. **Python 백엔드**: Gemini AI로 영상 분석 (SSE 스트리밍)
6. **데이터 저장**: hands, hand_players, hand_actions 테이블에 저장
7. **UI 업데이트**: React Query invalidation으로 자동 갱신

### 주요 특징

- ✅ **비동기 처리**: 사용자는 즉시 응답 받음 (jobId)
- ✅ **실시간 진행률**: SSE를 통한 progress 이벤트
- ✅ **플랫폼별 프롬프트**: EPT, Triton 2가지 최적화된 프롬프트
- ✅ **자동 플레이어 생성**: 없으면 생성, 있으면 재사용
- ✅ **부분 실패 허용**: 한 세그먼트 실패해도 다음 세그먼트 계속 진행
- ✅ **React Query 통합**: 자동 캐싱 및 갱신

### 개선 필요 사항

- ⚠️ **Timeout 추가**: 무한 대기 방지
- ⚠️ **진행률 실시간 반영**: Supabase Realtime 구독
- ⚠️ **중복 분석 방지**: 기존 작업 확인
- ⚠️ **트랜잭션 사용**: 데이터 일관성 보장
- 📈 **성능 최적화**: 배치 INSERT, 병렬 처리
- 📊 **모니터링 강화**: 로깅, 메트릭, 알림

---

**마지막 업데이트**: 2025-11-11
**문서 버전**: 1.0
