# HAE (Hand Analysis Engine) - 핸드 분석 프로세스

HAE는 포커 영상을 자동으로 분석하여 핸드 히스토리를 추출하는 엔진입니다.

## 분석 프로세스

1. 분석버튼 클릭
2. 분석 제출 모드로 레이아웃 변경
3. 플랫폼 설정
4. 영상에서 전체 구분 설정
- 카운트다운
- 오프닝시퀀스
- 게임플레이
- 브레이크
- 게임플레이
- 브레이크
- 엔딩시퀀스
5. 영상 내 참가 플레이어 입력
- 미등록된 플레이어일 경우 바로 생성/등록
6. 분석 버튼 클릭


## HAE 분석 과정

1. 플랫폼에 맞는 프롬프트 준비
- Triton
- Pokerstars(EPT, APPT, UKIPT, etc.)
- WSOP
- Hustler

2. 분석모델 참고 (Gemini)
- https://ai.google.dev/gemini-api/docs/video-understanding
- https://ai.google.dev/gemini-api/docs/audio
- https://ai.google.dev/gemini-api/docs/thinking
- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/gemini-api/docs/long-context

3. 영상 전체 타임라인에서 "게임플레이" 부분만 분석
- Gemini Youtube 영상 바로분석 활용
- 게임플레이 구간에서 각 핸드 구분
- 각 핸드 핸드 히스토리 추출
- 핸드 히스토리 추출 시 분석 제출모드에 제출된 이름에 가장 근접한 이름으로 매칭 및 작성
- Hand History Dialog 양식에 맞게 핸드 히스토리 및 DB 제출

## 출력

1. Hand History Dialog 형태
- 포커 테이블 레이아웃에 맞춰서 배치
- 분석이 안된 영상은 동영상 플레이어만 준비, 핸드 히스토리 확장패널 펼침버튼 비활성화
