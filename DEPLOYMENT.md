# GGVault 배포 가이드 (초보자용)

이 가이드는 GGVault를 Vercel을 통해 배포하는 방법을 단계별로 설명합니다.

---

## 📋 배포 전 체크리스트

- [ ] GitHub 계정 (없으면 https://github.com 에서 회원가입)
- [ ] Vercel 계정 (없으면 https://vercel.com 에서 GitHub로 가입)
- [ ] Upstash 계정 (Rate Limiting 사용 시, https://console.upstash.com)

---

## 1단계: GitHub Repository 생성

### 1.1 GitHub에서 새 Repository 만들기

1. https://github.com 접속 후 로그인
2. 우측 상단 `+` 버튼 클릭 → `New repository` 선택
3. Repository 이름 입력: `templar-archives` (또는 원하는 이름)
4. **Public** 또는 **Private** 선택 (무료 계정은 둘 다 가능)
5. **❌ "Initialize this repository with:"는 모두 체크 해제** (로컬에 이미 코드가 있음)
6. `Create repository` 버튼 클릭

### 1.2 로컬 코드를 GitHub에 업로드

터미널에서 다음 명령어 실행:

```bash
# 1. Git 초기화 (처음 한 번만)
cd /Users/zed/Desktop/Archive/templar-archives
git init

# 2. 모든 파일 추가
git add .

# 3. 첫 커밋 생성
git commit -m "Initial commit: GGVault v1.0"

# 4. 기본 브랜치 이름을 main으로 설정
git branch -M main

# 5. GitHub repository 연결 (YOUR-USERNAME을 본인 GitHub 아이디로 변경)
git remote add origin https://github.com/YOUR-USERNAME/templar-archives.git

# 6. GitHub에 업로드
git push -u origin main
```

**주의**: 5번 명령어에서 `YOUR-USERNAME`을 본인의 GitHub 사용자 이름으로 바꿔주세요!

**예시**:
```bash
# GitHub 아이디가 "johndoe"인 경우
git remote add origin https://github.com/johndoe/templar-archives.git
```

---

## 2단계: Upstash Redis 설정 (Rate Limiting용)

**선택사항**: Rate Limiting을 사용하지 않으려면 이 단계를 건너뛰어도 됩니다.

### 2.1 Upstash 계정 생성

1. https://console.upstash.com 접속
2. `Sign up` → GitHub 또는 Google 계정으로 가입
3. 무료 플랜 선택

### 2.2 Redis 데이터베이스 생성

1. 대시보드에서 `Create Database` 클릭
2. 설정:
   - **Name**: `templar-archives-rate-limit`
   - **Type**: `Regional`
   - **Region**: `ap-northeast-2 (Seoul)` (가장 가까운 지역 선택)
   - **Eviction**: `LRU`
3. `Create` 버튼 클릭

### 2.3 환경 변수 복사

1. 생성된 데이터베이스 클릭
2. **REST API** 탭 선택
3. 다음 값을 복사해두세요:
   - `UPSTASH_REDIS_REST_URL`: `https://xxx.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN`: `AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ`

---

## 3단계: Vercel 배포

### 3.1 Vercel 계정 생성 및 GitHub 연동

1. https://vercel.com 접속
2. `Sign Up` 클릭
3. **"Continue with GitHub"** 선택 (GitHub 계정으로 로그인)
4. Vercel에 GitHub 접근 권한 허용

### 3.2 프로젝트 Import

1. Vercel 대시보드에서 `Add New...` → `Project` 클릭
2. **Import Git Repository** 섹션에서 `templar-archives` repository 선택
3. `Import` 버튼 클릭

### 3.3 환경 변수 설정 (중요!)

**Configure Project** 화면에서:

1. **Framework Preset**: `Next.js` (자동 선택됨)
2. **Root Directory**: `.` (기본값 유지)
3. **Environment Variables** 섹션 펼치기
4. 다음 환경 변수를 하나씩 추가:

| Name | Value | 설명 |
|------|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://diopilmkehygiqpizvga.supabase.co` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (Supabase에서 복사) | Supabase 익명 키 |
| `CLAUDE_API_KEY` | (Anthropic에서 복사) | Claude API 키 |
| `UPSTASH_REDIS_REST_URL` | (2.3에서 복사) | Rate Limiting (선택사항) |
| `UPSTASH_REDIS_REST_TOKEN` | (2.3에서 복사) | Rate Limiting (선택사항) |

**환경 변수 입력 방법**:
- `Name` 필드에 변수 이름 입력 (예: `CLAUDE_API_KEY`)
- `Value` 필드에 실제 값 입력
- `Add` 버튼 클릭
- 모든 환경 변수 추가 완료 후 다음 단계

### 3.4 배포 시작

1. 모든 환경 변수 입력 완료 후 `Deploy` 버튼 클릭
2. 배포 진행 상황 확인 (2-3분 소요)
3. ✅ **"Congratulations!"** 메시지가 나오면 배포 완료!

### 3.5 배포된 웹사이트 확인

- Vercel이 자동으로 생성한 URL: `https://templar-archives.vercel.app` (또는 비슷한 URL)
- `Visit` 버튼 클릭해서 웹사이트 접속 확인

---

## 4단계: 자동 배포 설정 (이미 완료!)

**좋은 소식**: Vercel이 자동으로 GitHub와 연동되었습니다!

### 앞으로 코드를 수정하면?

```bash
# 1. 코드 수정 후 저장
# 2. 터미널에서 다음 명령어 실행

git add .
git commit -m "수정 내용 설명"
git push origin main

# ✅ Vercel이 자동으로 감지하고 3분 이내에 재배포!
```

### 배포 상태 확인

1. Vercel 대시보드: https://vercel.com/dashboard
2. `templar-archives` 프로젝트 클릭
3. **Deployments** 탭에서 모든 배포 기록 확인

---

## 5단계: 커스텀 도메인 연결 (선택사항)

자신의 도메인 (예: `templar-archives.com`)을 연결하려면:

1. Vercel 대시보드에서 프로젝트 선택
2. **Settings** → **Domains** 탭
3. 도메인 입력 후 `Add` 클릭
4. DNS 설정 안내에 따라 도메인 업체(가비아, 후이즈 등)에서 설정

**무료 SSL 인증서**: Vercel이 자동으로 발급 (Let's Encrypt)

---

## 🎉 배포 완료!

이제 다음 URL에서 GGVault를 사용할 수 있습니다:
- **Production**: `https://templar-archives.vercel.app`
- **대시보드**: https://vercel.com/dashboard

---

## 🐛 트러블슈팅

### 문제 1: 빌드 실패 (Build Error)

**증상**: Vercel에서 배포가 빨간색으로 실패
**해결**:
1. Vercel 대시보드에서 실패한 배포 클릭
2. **Build Logs** 탭에서 에러 메시지 확인
3. 로컬에서 `npm run build` 실행해서 동일한 에러 재현
4. 에러 수정 후 다시 push

### 문제 2: 환경 변수 오류

**증상**: 배포는 성공했지만 기능이 작동하지 않음
**해결**:
1. Vercel 대시보드 → 프로젝트 → **Settings** → **Environment Variables**
2. 모든 환경 변수가 올바르게 입력되었는지 확인
3. 변수 수정 후 **Deployments** 탭에서 `Redeploy` 클릭

### 문제 3: Rate Limiting이 작동하지 않음

**증상**: API 요청 제한이 걸리지 않음
**해결**:
- Upstash Redis 환경 변수가 설정되지 않은 경우 (정상 동작)
- Rate Limiting 없이도 웹사이트는 정상 작동합니다
- Rate Limiting이 필요하면 2단계(Upstash 설정)를 완료하세요

### 문제 4: GitHub push 실패

**증상**: `git push` 실행 시 `permission denied` 에러
**해결**:
```bash
# GitHub Personal Access Token 생성 필요
# 1. GitHub.com → Settings → Developer settings → Personal access tokens
# 2. "Generate new token (classic)" 클릭
# 3. repo 권한 체크
# 4. 생성된 토큰을 비밀번호 대신 사용
```

---

## 📞 지원

- **Vercel 문서**: https://vercel.com/docs
- **Next.js 문서**: https://nextjs.org/docs
- **Supabase 문서**: https://supabase.com/docs

---

**마지막 업데이트**: 2025-10-15
**문서 버전**: 1.0
