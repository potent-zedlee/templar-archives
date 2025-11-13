# Templar Archives - 환경 설정 가이드

이 문서는 KAN Backend 환경 분리 작업 후 **사용자가 직접 완료해야 하는 작업**을 안내합니다.

---

## ✅ 체크리스트

완료한 항목에 체크하세요:

- [ ] 1. Vercel 배포 URL 확인
- [ ] 2. Vercel 환경변수 설정
- [ ] 3. (선택) API Key 발급 및 설정
- [ ] 4. 로컬 백엔드 테스트
- [ ] 5. Vercel 재배포 및 확인

---

## 1. Vercel 배포 URL 확인

### 목적
KAN Backend의 CORS 설정에 실제 Vercel 도메인을 추가하기 위함

### 작업 절차

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard
   - 로그인

2. **Templar Archives 프로젝트 선택**
   - 프로젝트 목록에서 `templar-archives` 클릭

3. **Production 도메인 확인**
   - `Deployments` 탭 → `Production` 섹션
   - 도메인 형식: `templar-archives-xxxxx.vercel.app`
   - 또는 커스텀 도메인이 설정되어 있다면 그것 사용

4. **도메인 복사**
   ```
   예시: https://templar-archives-abc123.vercel.app
   ```
   - 전체 URL 복사 (https:// 포함)

### 확인된 도메인 기록

**프로덕션 URL**: `_____________________________________`

(위 빈 칸에 확인한 URL을 적어두세요)

---

## 2. Vercel 환경변수 설정

### 목적
Vercel 배포 시 KAN Backend Cloud Run URL을 사용하도록 설정

### 작업 절차

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard
   - `templar-archives` 프로젝트 선택

2. **Settings 메뉴 이동**
   - 상단 탭에서 `Settings` 클릭
   - 좌측 메뉴에서 `Environment Variables` 클릭

3. **KHALAI_ARCHIVE_NETWORK_URL 추가**

   **Variable Name (키)**:
   ```
   KHALAI_ARCHIVE_NETWORK_URL
   ```

   **Value (값)**:
   ```
   https://kan-backend-700566907563.us-central1.run.app
   ```

   **Environment (환경)**:
   - ✅ Production
   - ⬜ Preview (선택사항)
   - ⬜ Development

4. **Save 버튼 클릭**

### 스크린샷 참고

Vercel 환경변수 설정 화면 예시:
```
┌──────────────────────────────────────────────┐
│ Add Environment Variable                     │
├──────────────────────────────────────────────┤
│ Name:  KHALAI_ARCHIVE_NETWORK_URL           │
│ Value: https://kan-backend-700566907...     │
│                                              │
│ Environment:                                 │
│ ☑ Production                                │
│ ☐ Preview                                   │
│ ☐ Development                               │
│                                              │
│          [Cancel]  [Save]                   │
└──────────────────────────────────────────────┘
```

---

## 3. (선택사항) API Key 인증 추가

### 목적
KAN Backend에 무단 접근 방지 (보안 강화)

**현재는 선택사항입니다. 나중에 추가해도 됩니다.**

### 필요한 경우
- 외부에서 Cloud Run URL로 직접 접근하는 것을 막고 싶을 때
- API 사용량을 추적하고 싶을 때
- 비용 관리가 필요할 때

### 작업 절차 (추가 시)

#### Step 1: API Key 생성

**방법 1: 랜덤 생성기 사용**
```bash
# 터미널에서 실행
openssl rand -hex 32
```
출력 예시: `a3f5e8d2c1b4a6f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5`

**방법 2: 온라인 도구**
- https://randomkeygen.com/
- "Fort Knox Passwords" 섹션에서 하나 복사

#### Step 2: KAN Backend 환경변수 설정

```bash
# 터미널에서 실행
cd /Users/zed/Desktop/Archive/kan/backend

# .env 파일에 추가
echo "API_KEY=여기에_생성한_키_붙여넣기" >> .env
```

#### Step 3: Cloud Run 환경변수 업데이트

```bash
# 터미널에서 실행
gcloud run services update kan-backend \
  --set-env-vars API_KEY=여기에_생성한_키_붙여넣기 \
  --region us-central1
```

#### Step 4: Vercel 환경변수에 API Key 추가

- Vercel Dashboard → templar-archives → Settings → Environment Variables
- Variable Name: `KHALAI_ARCHIVE_NETWORK_API_KEY`
- Value: (위에서 생성한 API Key)
- Environment: Production

---

## 4. 로컬 백엔드 테스트

### 목적
로컬 개발 환경에서 KAN Backend가 제대로 작동하는지 확인

### 작업 절차

1. **로컬 백엔드 시작**
   ```bash
   # 터미널 1 - 백엔드 시작
   cd /Users/zed/Desktop/Archive/kan/backend
   source venv/bin/activate
   python main.py
   ```

   **확인**: `http://localhost:8000` 메시지가 출력되어야 함

2. **헬스 체크**
   ```bash
   # 터미널 2 - 테스트
   curl http://localhost:8000/health
   ```

   **정상 응답**:
   ```json
   {"status":"healthy","environment":"development","version":"1.0.0"}
   ```

3. **프론트엔드 테스트**
   - http://localhost:3000/test 접속
   - YouTube URL 입력 후 분석 실행
   - 진행 상황이 실시간으로 표시되는지 확인

---

## 5. Vercel 재배포 및 확인

### 목적
환경변수 설정 후 프로덕션에서 KAN 기능이 작동하는지 확인

### 작업 절차

#### Step 1: Git Push (자동 배포)

코드 변경사항이 이미 커밋되어 있으므로:
```bash
git push origin main
```

Vercel이 자동으로 감지하여 재배포합니다.

#### Step 2: 배포 완료 대기

- Vercel Dashboard → Deployments
- 최신 배포가 "Ready" 상태가 될 때까지 대기 (보통 1-2분)

#### Step 3: 프로덕션 테스트

1. **프로덕션 URL 접속**
   - https://templar-archives-xxxxx.vercel.app/test

2. **KAN 분석 테스트**
   - YouTube URL 입력
   - 플랫폼 선택 (EPT 또는 Triton)
   - "분석 시작" 클릭

3. **확인 사항**
   - ✅ 진행 상황 표시되는지
   - ✅ CORS 에러 없는지 (개발자 도구 콘솔 확인)
   - ✅ 분석 결과 정상 출력되는지

#### Step 4: 문제 발생 시

**CORS 에러가 발생한다면**:
```
Access to fetch at 'https://kan-backend-...' from origin 'https://templar-archives-...'
has been blocked by CORS policy
```

**해결 방법**:
1. 1단계에서 확인한 Vercel 도메인을 다시 확인
2. KAN Backend의 CORS 설정에 해당 도메인이 포함되었는지 확인
3. Claude Code에게 알려서 CORS 설정 업데이트

---

## 문제 해결

### Q1: Vercel 환경변수가 적용되지 않아요

**원인**: 환경변수 추가 후 재배포하지 않음

**해결**:
```bash
git commit --allow-empty -m "chore: trigger Vercel redeploy"
git push origin main
```

### Q2: 로컬에서 "Connection refused" 에러

**원인**: 로컬 백엔드가 실행되지 않음

**해결**:
```bash
cd /Users/zed/Desktop/Archive/kan/backend
source venv/bin/activate
python main.py
```

### Q3: Cloud Run에서 "quota exceeded" 에러

**원인**: Gemini API 무료 할당량 초과

**해결**:
- `GEMINI_UPGRADE_GUIDE.md` 참조
- Gemini API 유료 전환 필요

---

## 완료 확인

모든 체크리스트 항목을 완료하셨나요?

- [ ] ✅ Vercel 환경변수 설정 완료
- [ ] ✅ 로컬 백엔드 정상 작동 확인
- [ ] ✅ Vercel 프로덕션 배포 후 KAN 기능 테스트 완료
- [ ] ✅ CORS 에러 없음

**문제가 있다면 Claude Code에게 알려주세요!**

---

## 참고 문서

- **PRD.md**: 제품 전체 비전
- **GEMINI_UPGRADE_GUIDE.md**: Gemini API 유료 전환 가이드
- **.claude/CLAUDE.md**: 개발자 가이드

---

**작성일**: 2025-11-13
**대상**: KAN Backend 브랜딩 변경 (HAE → KAN)
