# E2E 테스트 가이드

## KAN AI 분석 기능 테스트

### 테스트 파일
- `kan-analysis.spec.ts`: KAN AI 분석 기능의 전체 E2E 테스트

### 테스트 범위

#### 1. UI 흐름 테스트
- AI 분석 버튼 표시 확인 (YouTube URL이 있는 경우)
- AI 분석 버튼 비활성화 확인 (비디오 URL이 없는 경우)
- 다이얼로그 열기/닫기
- 다이얼로그 내 모든 요소 표시 확인

#### 2. 폼 입력 테스트
- 플랫폼 선택 (EPT, Triton, PokerStars, WSOP, Hustler)
- 플레이어 추가/제거
- 타임라인 세그먼트 선택
- 전체 영상 분석 (세그먼트 없이)

#### 3. 권한 테스트
- 인증 필요 확인
- High Templar 이상 권한 필요 확인

#### 4. 에러 처리 테스트
- 네트워크 에러 처리
- 백엔드 에러 메시지 표시
- 타임아웃 처리

#### 5. 프로세스 흐름 테스트 (Mock)
- 분석 시작 후 상태 변화
- 진행률 업데이트 (Realtime)
- 성공 시 자동 닫기
- 핸드 목록 갱신

### 테스트 실행

```bash
# 모든 KAN 테스트 실행
npx playwright test e2e/kan-analysis.spec.ts

# UI 모드로 실행 (디버깅)
npx playwright test e2e/kan-analysis.spec.ts --ui

# 특정 브라우저만 실행
npx playwright test e2e/kan-analysis.spec.ts --project=chromium

# 헤드풀 모드 (브라우저 표시)
npx playwright test e2e/kan-analysis.spec.ts --headed

# 특정 테스트만 실행
npx playwright test e2e/kan-analysis.spec.ts -g "should display AI Analysis button"
```

### 테스트 요구사항

#### 데이터 요구사항
- 최소 1개 이상의 Tournament가 DB에 존재해야 함
- 최소 1개 이상의 SubEvent가 존재해야 함
- 최소 1개 이상의 Day(Stream)가 YouTube URL을 가지고 있어야 함

#### 인증 요구사항
- 테스트 계정이 High Templar, Reporter, 또는 Admin 권한을 가지고 있어야 함
- 현재는 자동 로그인 가정 (실제 로그인 플로우 구현 필요)

#### 환경 변수
- `KHALAI_ARCHIVE_NETWORK_URL`: KAN 백엔드 URL 설정 필요
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key

### 테스트 제한사항

#### 현재 스킵되는 테스트
- Realtime 업데이트 테스트 (Supabase Realtime Mock 필요)
- 실제 AI 분석 완료까지의 전체 플로우 (시간 소요)
- 권한 기반 테스트 (로그인 플로우 구현 필요)

#### Mock 필요 항목
- Supabase Realtime 구독
- KAN 백엔드 API 응답
- 분석 진행 상태 업데이트

### 테스트 개선 사항

#### 단기
1. 실제 로그인 플로우 구현
2. 테스트 데이터 Fixture 추가
3. API Mock 개선

#### 중기
1. Supabase Realtime Mock 구현
2. E2E 테스트 자동화 (CI/CD)
3. 스크린샷 비교 테스트

#### 장기
1. 실제 AI 분석 통합 테스트 (Staging 환경)
2. 성능 테스트 (분석 속도, 메모리 사용)
3. 크로스 브라우저 호환성 테스트

### 트러블슈팅

#### "No day with YouTube URL found" 에러
- DB에 YouTube URL을 가진 Day가 없음
- `/archive/tournament` 페이지에서 수동으로 Day를 추가하거나
- 테스트 데이터를 DB에 추가

#### 타임아웃 에러
- `test.setTimeout(60000)` 추가하여 타임아웃 시간 연장
- 또는 `test.slow()` 사용

#### 권한 에러
- 테스트 계정의 역할 확인: `node scripts/check-analysis-status.mjs`
- 역할 변경: `node scripts/update-user-role.mjs`

### 참고 자료
- Playwright 문서: https://playwright.dev/
- Templar Archives 문서: `/docs/`
- KAN 분석 프로세스: `/docs/AI_ANALYSIS_PROCESS_FLOW.md`
