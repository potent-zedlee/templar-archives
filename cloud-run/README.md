# Cloud Run 영상 분석 서비스

Google Cloud Run 기반 영상 분석 파이프라인입니다.

## 아키텍처

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Frontend      │────▶│  Orchestrator   │────▶│  Cloud Tasks    │
│   (Next.js)     │     │  (Cloud Run)    │     │                 │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                              │                         │
                              │                         ▼
                              │                ┌─────────────────┐
                              │                │                 │
                              ▼                │ Segment Analyzer│
                       ┌─────────────────┐     │  (Cloud Run)    │
                       │                 │     │                 │
                       │   Firestore     │◀────│  - FFmpeg       │
                       │   (상태 저장)    │     │  - Vertex AI    │
                       │                 │     │  - Firestore    │
                       └─────────────────┘     └─────────────────┘
```

## 서비스 구성

### 1. Orchestrator (`/orchestrator`)

분석 요청을 받아 세그먼트로 분할하고 Cloud Tasks에 큐잉하는 서비스입니다.

**엔드포인트:**
- `POST /analyze` - 분석 시작
- `GET /status/:jobId` - 작업 상태 조회

**환경 변수:**
```bash
GOOGLE_CLOUD_PROJECT=your-project-id
FIRESTORE_COLLECTION=analysisJobs
CLOUD_TASKS_LOCATION=asia-northeast3
CLOUD_TASKS_QUEUE=video-analysis-queue
SEGMENT_ANALYZER_URL=https://segment-analyzer-xxx.run.app
```

### 2. Segment Analyzer (`/segment-analyzer`)

개별 세그먼트를 분석하는 서비스입니다.

**기능:**
- FFmpeg로 세그먼트 추출
- Vertex AI Gemini로 영상 분석
- Firestore에 핸드 저장
- Firestore 진행 상황 업데이트

**환경 변수:**
```bash
GOOGLE_CLOUD_PROJECT=your-project-id
GCP_PROJECT_ID=your-project-id
FIRESTORE_COLLECTION=analysisJobs
GCS_BUCKET_NAME=templar-archives-videos
VERTEX_AI_LOCATION=global
GOOGLE_API_KEY=your-google-api-key
```

### 3. Shared (`/shared`)

공통 타입 및 유틸리티입니다.

## 배포

### 사전 요구사항

1. Google Cloud CLI 설치 및 인증
2. Docker 설치
3. GCP 프로젝트 생성 및 API 활성화:
   - Cloud Run API
   - Cloud Tasks API
   - Firestore API
   - Cloud Storage API
   - Vertex AI API

### 배포 명령

```bash
# 전체 배포
cd cloud-run
chmod +x deploy.sh
./deploy.sh all

# 개별 배포
./deploy.sh orchestrator
./deploy.sh segment-analyzer
```

### 환경 변수 설정

배포 후 다음 환경 변수를 Next.js 앱에 추가:

```bash
# .env.local
CLOUD_RUN_ORCHESTRATOR_URL=https://video-orchestrator-xxx.run.app
```

## 로컬 개발

```bash
# Orchestrator
cd orchestrator
npm install
npm run dev

# Segment Analyzer
cd segment-analyzer
npm install
npm run dev
```

## 비용 최적화

### Cloud Run 설정

- Orchestrator: 낮은 메모리 (512Mi), 짧은 타임아웃 (60s)
- Segment Analyzer: 높은 메모리 (2Gi), 긴 타임아웃 (3600s)

### Cloud Tasks 설정

- 동시 실행 제한: 10개
- 세그먼트 간 지연: 2초
- 최대 재시도: 3회

## 문제 해결

### 세그먼트 분석 실패

1. Cloud Run 로그 확인:
   ```bash
   gcloud run services logs read segment-analyzer --region=asia-northeast3
   ```

2. Firestore에서 작업 상태 확인

3. GCS 권한 확인

### Vertex AI 에러

1. 서비스 계정 권한 확인 (Vertex AI User)
2. 리전 설정 확인 (global 권장)
3. 모델 할당량 확인

## 관련 문서

- [Google Cloud Run](https://cloud.google.com/run)
- [Google Cloud Tasks](https://cloud.google.com/tasks)
- [Vertex AI Gemini](https://cloud.google.com/vertex-ai/docs/generative-ai)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
