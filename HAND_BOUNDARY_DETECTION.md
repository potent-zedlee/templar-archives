# Automatic Hand Boundary Detection System

## 🎯 목표
포커 토너먼트 영상에서 AI가 자동으로 핸드 경계를 인식하여 타임코드를 생성하는 시스템 구현

## 📍 현재 상태 (2025-10-29)

### ✅ Phase 1 완료 (MVP - UI & Workflow)
- **UI 완성**: Auto Detect Dialog 구현
- **API 엔드포인트**: `/api/streams/detect-boundaries` 생성
- **워크플로우**: 감지 → 결과 검토 → 수정 → 일괄 제출
- **플레이스홀더 구현**: 균일한 간격으로 핸드 경계 생성 (실제 영상 분석 X)

### ✅ Phase 1.5 완료 (Real Video Analysis)
- **FFmpeg 프레임 추출**: `lib/video-frame-extractor.ts` (158줄)
  - fluent-ffmpeg 기반 서버 사이드 처리
  - 지정 간격으로 프레임 추출 (기본 10초)
  - Base64 인코딩 및 임시 파일 관리
- **Claude Vision API 통합**: `lib/claude-vision-analyzer.ts` (198줄)
  - 프레임별 핸드 경계 감지
  - 핸드 번호 추출 (OCR 대체)
  - 배치 처리 (최대 3개 병렬)
- **실제 분석 로직**: `lib/scene-change-detector.ts` (238줄 업데이트)
  - 5단계 파이프라인 (추출 → 분석 → 필터링 → 핸드 번호 → Duration 필터)
  - 신뢰도 기반 필터링 (기본 70% 이상)
  - 핸드 길이 검증 (30초 ~ 10분)
- **API & UI 업데이트**:
  - Detection Method 선택: Claude Vision / Scene Detection
  - useRealAnalysis 플래그로 전환 가능
  - 비용 제한: 최대 30개 프레임

### 🎯 다음 단계 (Phase 2 - Production Optimization)
- **성능 최적화**: 프레임 추출 속도 개선
- **비용 최적화**: 프레임 샘플링 전략 개선
- **정확도 개선**: Hybrid 방식 (Scene Detection + Claude Vision)
- **Production 인프라**: Supabase Edge Functions 또는 별도 워커 서비스

## 이전 목표 상태
- **수동 방식**: 사용자가 직접 각 핸드의 start_time, end_time, hand_number를 입력
- **문제점**: 긴 스트림 영상에서 모든 핸드를 수동으로 찾아야 함 (시간 소모, 누락 가능)

## 최종 목표 상태
- **자동 방식**: AI가 영상을 분석하여 핸드 경계 자동 감지 및 타임코드 생성
- **장점**: 빠른 처리, 정확성, 사용자는 검토만 하면 됨

---

## ⚠️ MVP 플레이스홀더 구현 (현재)

현재 구현은 **UI 및 워크플로우 테스트 목적**의 플레이스홀더입니다:
- 실제 영상 분석을 하지 않음
- 균일한 간격 (2분)으로 핸드 경계 생성
- 약간의 랜덤성 (±20초) 추가
- 신뢰도: 0.75-0.95 (랜덤)

**목적**:
1. UI 워크플로우 완성 및 테스트
2. 일괄 제출 기능 검증
3. 사용자 피드백 수집
4. 실제 분석 구현 전 프로토타입 완성

---

## Phase 1: Scene Change Detection (기본 구현)

### 1.1 기술 스택
- **PySceneDetect**: 영상의 장면 전환 감지
- **FFmpeg**: 프레임 추출 및 영상 처리
- **Threshold 기반 필터링**: 최소 핸드 길이 검증 (30초 이상)

### 1.2 구현 파일
```
lib/
  hand-boundary-detector.ts         (기존) - Claude Vision 기반 분석
  scene-detector.ts                 (신규) - PySceneDetect 래퍼
  hand-segment-filter.ts            (신규) - 룰 기반 필터링

app/api/
  streams/detect-boundaries/
    route.ts                        (신규) - 자동 경계 감지 API
  analyze-video/
    route.ts                        (수정) - 통합 파이프라인
```

### 1.3 API 구조
**Endpoint**: `POST /api/streams/detect-boundaries`

**Request**:
```json
{
  "streamId": "uuid",
  "videoUrl": "https://...",
  "videoDuration": 7200,
  "method": "scene_detection" | "ocr" | "hybrid"
}
```

**Response**:
```json
{
  "success": true,
  "detectedHands": [
    {
      "handNumber": 1,
      "startTime": "00:05:30",
      "endTime": "00:08:15",
      "confidence": 0.85
    },
    {
      "handNumber": 2,
      "startTime": "00:08:20",
      "endTime": "00:11:45",
      "confidence": 0.92
    }
  ],
  "totalDetected": 2,
  "processingTime": 45.2
}
```

---

## Phase 2: OCR Enhancement (정확도 개선)

### 2.1 핸드 번호 텍스트 인식
- **OCR 영역 설정**: 핸드 번호가 표시되는 화면 영역 지정
- **텍스트 패턴 매칭**: "Hand #123", "핸드 #45" 등 패턴 인식
- **연속성 검증**: 핸드 번호가 순차적으로 증가하는지 확인

### 2.2 구현
```
lib/
  ocr-hand-detector.ts              (신규) - Tesseract.js 기반 OCR
  hand-number-parser.ts             (신규) - 핸드 번호 추출 로직
```

### 2.3 Hybrid Approach
1. PySceneDetect로 후보 구간 추출
2. OCR로 핸드 번호 확인
3. 룰 기반 필터링으로 최종 검증

---

## Phase 3: UI Integration

### 3.1 Automatic Detection UI
**위치**: `components/archive/auto-detect-dialog.tsx`

**기능**:
- 스트림 선택
- 감지 방법 선택 (Scene Detection, OCR, Hybrid)
- 진행률 표시 (SSE 스트리밍)
- 결과 미리보기 (타임라인)
- 수정/확인 후 일괄 제출

### 3.2 Workflow
```
1. [Auto Detect] 버튼 클릭
2. 스트림 선택 (Day 선택)
3. 감지 시작 → 진행률 표시
4. 감지 완료 → 결과 테이블 표시
   - Hand Number | Start Time | End Time | Confidence | Actions
   - [Edit] [Delete] 버튼
5. [Submit All] 버튼 클릭
6. Batch 타임코드 제출 (/api/timecodes/batch-submit)
```

### 3.3 기존 UI 통합
- Single Hand Input Panel에 "Auto Detect" 버튼 추가
- Batch Input Panel에 "Auto Detect" 탭 추가
- Archive 페이지에서 Day 선택 → "Detect Hands" 컨텍스트 메뉴

---

## Phase 4: Advanced Features (선택 사항)

### 4.1 Player Recognition
- 얼굴 인식으로 플레이어 자동 매칭
- Name plate OCR로 플레이어 이름 추출

### 4.2 Action Recognition
- 칩 움직임 감지로 액션 타입 추론
- 베팅 금액 OCR로 추출

### 4.3 Deep Learning Enhancement
- YOLO 기반 객체 감지 (카드, 칩, 플레이어)
- 3D CNN으로 영상 시퀀스 분석

---

## Implementation Roadmap

### Week 1-2: Phase 1 (Scene Detection)
- [ ] PySceneDetect 설치 및 테스트
- [ ] scene-detector.ts 구현
- [ ] hand-segment-filter.ts 구현
- [ ] /api/streams/detect-boundaries 구현
- [ ] 단위 테스트 작성

### Week 3-4: Phase 2 (OCR Enhancement)
- [ ] Tesseract.js 설치 및 테스트
- [ ] ocr-hand-detector.ts 구현
- [ ] hand-number-parser.ts 구현
- [ ] Hybrid 방식 통합
- [ ] 정확도 검증 (5개 샘플 영상)

### Week 5-6: Phase 3 (UI Integration)
- [ ] auto-detect-dialog.tsx 구현
- [ ] SSE 진행률 스트리밍
- [ ] 결과 미리보기 테이블
- [ ] Batch 제출 통합
- [ ] E2E 테스트

### Week 7+: Phase 4 (Advanced Features)
- [ ] Player Recognition (선택)
- [ ] Action Recognition (선택)
- [ ] Deep Learning 모델 (선택)

---

## Performance Expectations

### Scene Detection Method
- **속도**: ~5-10초 / 1시간 영상
- **정확도**: 70-80% (장면 전환 기반)
- **비용**: 무료 (로컬 처리)

### OCR Enhancement
- **속도**: ~30초 / 1시간 영상
- **정확도**: 85-92% (핸드 번호 검증)
- **비용**: 무료 (Tesseract.js)

### Hybrid Approach
- **속도**: ~40초 / 1시간 영상
- **정확도**: 90-95% (두 방법 결합)
- **비용**: 무료

### Claude Vision (기존)
- **속도**: ~15분 / 37분 영상
- **정확도**: 95%+
- **비용**: $2.75 / 37분 영상

---

## Success Criteria

1. **정확도**: 90% 이상의 핸드 경계 감지 정확도
2. **속도**: 1시간 영상을 1분 이내 처리
3. **사용성**: 사용자가 3클릭 이내로 자동 감지 실행
4. **검증**: 사용자가 결과를 검토하고 수정 가능
5. **통합**: 기존 타임코드 제출 워크플로우와 완전 통합

---

## Risk Mitigation

### Risk 1: 낮은 정확도
- **대응**: Hybrid 방식 (Scene + OCR) 사용
- **대응**: 사용자 수정 UI 제공
- **대응**: Confidence score로 의심 구간 표시

### Risk 2: 긴 처리 시간
- **대응**: 백그라운드 Job 처리 (Supabase Functions)
- **대응**: 진행률 표시 (SSE)
- **대응**: 캐싱 전략 (동일 영상 재처리 방지)

### Risk 3: 다양한 영상 포맷
- **대응**: FFmpeg로 표준 포맷 변환
- **대응**: 영상별 OCR 영역 설정 기능
- **대응**: 감지 방법 선택 옵션 제공

---

## Next Steps

**Immediate**: Phase 1 구현 시작
1. PySceneDetect 환경 설정
2. scene-detector.ts 기본 구현
3. API 엔드포인트 생성
4. 테스트 영상으로 검증

**After Approval**: 본격적인 개발 진행
