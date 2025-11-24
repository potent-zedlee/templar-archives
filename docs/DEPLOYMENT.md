# Templar Archives 배포 가이드

이 가이드는 Templar Archives를 Vercel을 통해 배포하는 방법을 단계별로 설명합니다.

**마지막 업데이트**: 2025-11-23
**프로덕션 URL**: https://templar-archives.vercel.app

---

## 📋 배포 전 체크리스트

- [ ] GitHub 계정 (https://github.com)
- [ ] Vercel 계정 (https://vercel.com)
- [ ] Supabase 프로젝트 (https://supabase.com)
- [ ] Google API Key (Gemini AI용)
- [ ] Trigger.dev 계정 (영상 분석용, https://cloud.trigger.dev)
- [ ] (선택) Anthropic API Key (자연어 검색용)
- [ ] (선택) Upstash Redis (Rate Limiting용)

---

## 1단계: 환경 변수 준비

### 필수 환경 변수

| 변수명 | 설명 | 발급처 |
|--------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 역할 키 | Supabase Dashboard → Settings → API |
| `GOOGLE_API_KEY` | Gemini AI API 키 | https://aistudio.google.com/app/apikey |
| `TRIGGER_SECRET_KEY` | Trigger.dev 시크릿 키 | https://cloud.trigger.dev → Settings → API Keys |

### 선택 환경 변수

| 변수명 | 설명 | 발급처 |
|--------|------|--------|
| `ANTHROPIC_API_KEY` | Claude API (자연어 검색) | https://console.anthropic.com |
| `UPSTASH_REDIS_REST_URL` | Rate Limiting | https://console.upstash.com |
| `UPSTASH_REDIS_REST_TOKEN` | Rate Limiting | https://console.upstash.com |
| `YOUTUBE_API_KEY` | YouTube Data API | Google Cloud Console |
| `YTDL_COOKIE` | YouTube Bot 차단 우회를 위한 쿠키 문자열 | 브라우저 개발자도구 → Network |
| `YTDL_USER_AGENT` | YouTube 요청에 사용할 User-Agent | 동일 |
| `YTDL_ACCEPT_LANGUAGE` | YouTube Accept-Language 헤더 | 기본: `en-US,en;q=0.9` |
| `CSRF_SECRET` | CSRF 보호용 시크릿 | 랜덤 문자열 생성 |

---

## 2단계: Trigger.dev 설정 (영상 분석 필수)

### 2.1 Trigger.dev 계정 생성

1. https://cloud.trigger.dev/ 접속
2. GitHub 계정으로 가입
3. 새 프로젝트 생성

### 2.2 API Key 발급

1. Trigger.dev Dashboard → Settings → API Keys
2. Secret Key 복사 (형식: `tr_prod_xxx...`)

### 2.3 로컬 개발 설정

```bash
# Trigger.dev CLI로 로컬 개발
npx trigger.dev@latest dev --port 3001
```

### 2.4 프로덕션 배포

Vercel에 push하면 자동으로 Trigger.dev Task가 배포됩니다.

---

## 3단계: Vercel 배포

### 3.1 프로젝트 Import

1. https://vercel.com 접속 및 로그인
2. `Add New...` → `Project` 클릭
3. GitHub repository 선택 → `Import`

### 3.2 환경 변수 설정

**Configure Project** 화면에서 Environment Variables 추가:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
GOOGLE_API_KEY=AIzaxxx...
TRIGGER_SECRET_KEY=tr_prod_xxx...
ANTHROPIC_API_KEY=sk-ant-xxx... (선택)
```

### 3.3 배포 시작

1. `Deploy` 버튼 클릭
2. 배포 완료까지 2-3분 대기
3. 생성된 URL 확인

---

## 4단계: 자동 배포

GitHub main 브랜치에 push하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "feat: 새 기능 추가"
git push origin main
# Vercel이 자동으로 감지하여 2-3분 내 재배포
```

---

## 5단계: 배포 확인

### 확인 항목

- [ ] 홈페이지 로딩
- [ ] Supabase 연결 (Archive 페이지 데이터 표시)
- [ ] 사용자 인증 (로그인/회원가입)
- [ ] 영상 분석 (Trigger.dev 작동)
- [ ] 자연어 검색 (Claude API, 선택)

### 로그 확인

- **Vercel 로그**: Vercel Dashboard → Deployments → Logs
- **Trigger.dev 로그**: https://cloud.trigger.dev → Runs

---

## 🐛 트러블슈팅

### 빌드 실패

```bash
# 로컬에서 빌드 테스트
npm run build
```

### 환경 변수 오류

1. Vercel Dashboard → Settings → Environment Variables
2. 변수 확인 및 수정
3. Redeploy 실행

### Trigger.dev 연결 실패

1. `TRIGGER_SECRET_KEY` 환경 변수 확인
2. Trigger.dev Dashboard에서 프로젝트 연결 상태 확인
3. 필요시 `npx trigger.dev@latest deploy` 수동 실행

### Supabase RLS 에러

- Supabase Dashboard → Table Editor에서 RLS 정책 확인
- Service Role Key로 관리자 작업 수행

---

## 📚 참고 문서

- [Vercel 문서](https://vercel.com/docs)
- [Next.js 문서](https://nextjs.org/docs)
- [Supabase 문서](https://supabase.com/docs)
- [Trigger.dev 문서](https://trigger.dev/docs)
- [CLAUDE.md](../CLAUDE.md) - 프로젝트 개발 가이드
