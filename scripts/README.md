# Scripts

유틸리티 스크립트 모음

## Gemini YouTube URL 검증 테스트

### 목적

Gemini API가 YouTube URL을 파일 다운로드 없이 직접 분석할 수 있는지 검증합니다.

### 사용법

```bash
# 1. 가상 환경 생성 (선택 사항)
python3 -m venv venv
source venv/bin/activate

# 2. Python 패키지 설치
pip install google-genai

# 3. 환경 변수 설정
export GOOGLE_API_KEY='your-gemini-api-key'

# 4. 테스트 실행
python3 scripts/test-gemini-youtube.py
```

### 테스트 내용

1. **YouTube URL 직접 분석**
   - 공개 YouTube 영상 사용
   - videoMetadata (startOffset, endOffset) 테스트
   - 응답 시간 측정

2. **JSON 응답 형식**
   - response_mime_type: 'application/json' 테스트
   - 포커 핸드 분석 시뮬레이션

3. **에러 핸들링**
   - 잘못된 YouTube URL 처리
   - 404, 403 에러 감지

### 예상 결과

```
🧪 Gemini YouTube URL 직접 분석 검증 테스트
================================================================================

✅ GOOGLE_API_KEY: AIzaSy...
✅ Gemini 클라이언트 초기화 성공

📹 테스트 영상 정보:
   URL: https://www.youtube.com/watch?v=9hE5-98ZeCg
   세그먼트: 40s - 80s (40초)

테스트 1: YouTube URL 직접 분석 (videoMetadata 포함)
--------------------------------------------------------------------------------
✅ 분석 성공! (소요 시간: 3.45초)

📊 응답 내용:
--------------------------------------------------------------------------------
This video shows...
--------------------------------------------------------------------------------

✅ 모든 테스트 통과!
```

### 문제 해결

**GOOGLE_API_KEY 없음:**
```bash
export GOOGLE_API_KEY='your-api-key-here'
```

**google-genai 패키지 없음:**
```bash
pip install google-genai
```

**Python 버전 오류:**
- Python 3.10 이상 필요
- `python3 --version` 으로 확인
