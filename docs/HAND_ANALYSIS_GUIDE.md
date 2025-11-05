# Hand History Analysis Guide

이 가이드는 Gemini AI를 사용하여 포커 영상에서 자동으로 핸드 히스토리를 추출하는 방법을 설명합니다.

## 목차

1. [시스템 개요](#시스템-개요)
2. [설정](#설정)
3. [API 사용법](#api-사용법)
4. [플랫폼별 프롬프트](#플랫폼별-프롬프트)
5. [테스트 예제](#테스트-예제)
6. [문제 해결](#문제-해결)

---

## 시스템 개요

### 구성 요소

1. **Gemini 1.5 Pro** - Google의 멀티모달 AI 모델
   - Video Understanding 기능
   - Long Context (2M tokens)
   - Structured Output (JSON)

2. **플랫폼별 프롬프트**
   - Triton Poker
   - PokerStars (EPT, APPT, UKIPT)
   - WSOP
   - Hustler Casino Live

3. **/api/analyze** - 분석 API 엔드포인트
4. **/api/import-hands** - 핸드 히스토리 저장 API

### 작동 방식

```
YouTube URL → Gemini AI → Structured JSON → Database
                ↑
         Platform Prompts
```

---

## 설정

### 1. Gemini API Key 발급

1. [Google AI Studio](https://aistudio.google.com/app/apikey)에 접속
2. "Get API Key" 클릭
3. 프로젝트 선택 또는 새 프로젝트 생성
4. API Key 복사

### 2. 환경변수 설정

`.env.local` 파일에 API Key 추가:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. 할당량 확인

- **무료**: 60 requests/minute
- **Gemini 1.5 Pro**: Video Understanding 지원
- **Long Context**: 최대 2M tokens (약 1시간 영상)

---

## API 사용법

### 기본 사용법

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=xxxxxxxxxx",
    "platform": "triton"
  }'
```

### 플레이어 리스트 포함

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=xxxxxxxxxx",
    "platform": "pokerstars",
    "players": [
      {"name": "Daniel Negreanu", "position": "BTN"},
      {"name": "Igor Kurganov", "position": "BB"}
    ]
  }'
```

### 자동 DB 저장

`dayId`를 포함하면 자동으로 `/api/import-hands`를 호출하여 DB에 저장합니다:

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=xxxxxxxxxx",
    "platform": "wsop",
    "dayId": "your-day-id-here"
  }'
```

### 응답 형식

```json
{
  "success": true,
  "platform": "triton",
  "model": "gemini-2.5-pro",
  "handsExtracted": 12,
  "hands": [
    {
      "number": "#1",
      "description": "Phil Ivey raises UTG, Tom Dwan calls",
      "summary": "Phil Ivey opens to 2.5 BB from UTG...",
      "timestamp": "05:30-07:45",
      "pot_size": 18.5,
      "board_cards": ["Ah", "Kh", "7d"],
      "players": [...],
      "streets": {...}
    },
    ...
  ],
  "dayId": "day-123",
  "imported": true
}
```

---

## 플랫폼별 프롬프트

### Triton Poker (`triton`)

- **특징**: 고액 토너먼트, 프로페셔널 방송
- **플레이어**: Phil Ivey, Tom Dwan, Tony G, Fedor Holz 등
- **스테이크**: 25K/50K, 50K/100K 이상

**프롬프트**: `prompts/triton.md`

### PokerStars (`pokerstars`)

- **시리즈**: EPT, APPT, UKIPT, PSPC
- **특징**: 토너먼트 칩 표시, BB Ante
- **플레이어**: Daniel Negreanu, Liv Boeree, Steve O'Dwyer 등

**프롬프트**: `prompts/pokerstars.md`

### WSOP (`wsop`)

- **이벤트**: Main Event, High Roller, Bracelet Events
- **특징**: BB Ante 구조, 브레이슬릿 카운트 표시
- **플레이어**: Phil Hellmuth, Doyle Brunson, Johnny Chan 등

**프롬프트**: `prompts/wsop.md`

### Hustler Casino Live (`hustler`)

- **형식**: 캐시 게임 (토너먼트 아님)
- **특징**: 모든 홀 카드 표시 (RFID), 스트래들 빈번, Bomb Pots
- **플레이어**: Garrett Adelstein, Andy Stacks, Nik Airball 등
- **스테이크**: $100/$200 이상

**프롬프트**: `prompts/hustler.md`

---

## 테스트 예제

### 1. 간단한 테스트

**Node.js**:

```javascript
const response = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoUrl: 'https://www.youtube.com/watch?v=your-video-id',
    platform: 'triton'
  })
})

const result = await response.json()
console.log(`Extracted ${result.handsExtracted} hands`)
console.log(result.hands)
```

### 2. 프론트엔드 예제

```typescript
import { useState } from 'react'

function AnalyzeVideo() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: 'https://www.youtube.com/watch?v=...',
          platform: 'pokerstars',
          dayId: 'day-123'
        })
      })
      const data = await res.json()
      setResult(data)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? '분석 중...' : '핸드 히스토리 추출'}
      </button>

      {result && (
        <div>
          <p>{result.handsExtracted}개의 핸드가 추출되었습니다</p>
          {result.imported && <p>데이터베이스에 저장 완료</p>}
        </div>
      )}
    </div>
  )
}
```

### 3. 수동 DB 저장

분석만 하고 나중에 수동으로 저장:

```javascript
// Step 1: 분석만 수행
const analyzeRes = await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoUrl: 'https://www.youtube.com/watch?v=...',
    platform: 'wsop'
    // dayId 생략
  })
})
const { hands } = await analyzeRes.json()

// Step 2: 핸드 히스토리 검토/수정 후 저장
const importRes = await fetch('/api/import-hands', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dayId: 'day-123',
    hands: hands // 수정된 핸드 히스토리
  })
})
```

---

## 문제 해결

### Error: "GEMINI_API_KEY not configured"

**해결**:
1. `.env.local` 파일 확인
2. `GEMINI_API_KEY=your_key_here` 추가
3. 개발 서버 재시작: `npm run dev`

### Error: "Rate limit exceeded"

**해결**:
- 무료: 60 requests/minute 제한
- 1분 기다린 후 다시 시도
- 또는 유료 플랜 업그레이드

### Error: "Failed to parse Gemini response"

**원인**: Gemini가 JSON 형식으로 응답하지 않음

**해결**:
1. 영상 길이 확인 (1시간 이내 권장)
2. 영상 화질 확인 (480p 이상)
3. 플랫폼 타입이 올바른지 확인
4. 프롬프트 수정 필요 시 `prompts/` 디렉토리 확인

### 추출된 핸드 개수가 적음

**원인**:
- 영상에 게임플레이 외 콘텐츠가 많음 (인터뷰, 광고 등)
- 카드가 명확하게 보이지 않음

**해결**:
1. 플레이어 리스트를 제공하여 정확도 향상
2. 프롬프트에서 "Skip interview segments" 확인
3. 영상 품질 확인

### 플레이어 이름이 잘못 추출됨

**해결**:
1. `players` 파라미터에 예상 플레이어 리스트 제공:

```json
{
  "players": [
    {"name": "Phil Ivey"},
    {"name": "Tom Dwan"},
    {"name": "Tony G"}
  ]
}
```

2. Fuzzy Matching이 자동으로 적용됩니다

---

## 다음 단계

### UI 추가 (예정)

- Archive 페이지에 "분석" 버튼 추가
- 플랫폼 선택 UI
- 플레이어 입력 폼
- 진행 상태 표시
- 결과 미리보기

### 고급 기능 (예정)

- 영상 세그먼트 수동 편집
- 배치 분석 (여러 영상 동시 처리)
- 분석 결과 검증 및 수정
- 분석 통계 대시보드

---

## 참고 문서

- [Gemini API - Video Understanding](https://ai.google.dev/gemini-api/docs/video-understanding)
- [Hand Import API Guide](./HAND_IMPORT_API.md)
- [Archive Structure](../DIRECTORY_STRUCTURE.md)
- [Development Roadmap](../ROADMAP.md)

---

**마지막 업데이트**: 2025-11-05
**버전**: 1.0.0
