# Templar Archives Monitoring Guide

## 개요

Templar Archives는 프로덕션 환경의 안정성과 관찰성(Observability)을 위해 포괄적인 모니터링 시스템을 구축했습니다.

**구현 완료일**: 2025-10-26
**Phase**: 34

---

## 🎯 모니터링 시스템 구성

### 1. **Sentry - 에러 트래킹 & 성능 모니터링**

#### 설정 파일
- `instrumentation.ts` - Next.js 15 Instrumentation Hook
- `sentry.client.config.ts` - 클라이언트 사이드 설정
- `sentry.server.config.ts` - 서버 사이드 설정
- `sentry.edge.config.ts` - Edge Runtime 설정
- `lib/sentry-utils.ts` - 커스텀 유틸리티 함수

#### 기능
- ✅ 자동 에러 캡처 (클라이언트 + 서버)
- ✅ 성능 트랜잭션 추적 (API, DB 쿼리)
- ✅ Source Maps 업로드 (디버깅 용이)
- ✅ Release 추적 및 배포 알림
- ✅ User Context 연동 (userId, email)
- ✅ Breadcrumbs 자동 수집
- ✅ Session Replay (10% sampling)

#### 환경 변수
```bash
# Sentry DSN
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
SENTRY_DSN=your_sentry_dsn_here

# Sentry 프로젝트 정보 (Source Maps 업로드용)
SENTRY_ORG=your_sentry_organization_slug_here
SENTRY_PROJECT=your_sentry_project_slug_here
SENTRY_AUTH_TOKEN=your_sentry_auth_token_here

# 환경 설정
NEXT_PUBLIC_ENVIRONMENT=production  # or staging, development
```

#### Sentry 프로젝트 설정 (무료 플랜)
1. https://sentry.io/signup/ 에서 회원가입
2. 새 프로젝트 생성 (Next.js 선택)
3. DSN 복사하여 환경 변수에 추가
4. Auth Token 생성 (Settings → Auth Tokens)
5. Organization Slug와 Project Slug 확인

#### 사용 예시
```typescript
import { captureSentryException, addSentryBreadcrumb } from '@/lib/sentry-utils'

// 에러 캡처
try {
  // ... some code
} catch (error) {
  captureSentryException(error, {
    tags: { feature: 'hand-analysis' },
    extra: { handId: '123' },
    level: 'error',
  })
}

// Breadcrumb 추가
addSentryBreadcrumb('User clicked analyze button', 'ui', 'info', { handId: '123' })
```

---

### 2. **보안 이벤트 로깅 시스템**

#### 데이터베이스
- `security_events` 테이블 (마이그레이션: `20251026000001_add_security_events_table.sql`)
- 8가지 이벤트 타입: SQL Injection, XSS, CSRF, Rate Limit, 파일 업로드, 권한 위반, 로그인 실패, 관리자 액션
- 4가지 심각도: low, medium, high, critical
- 자동 정리: 90일 이상 된 로그 삭제 (`cleanup_old_security_events()`)

#### 라이브러리
- `lib/monitoring/security-logger.ts` - 보안 이벤트 저장 및 조회
- `lib/security/index.ts` - 보안 이벤트 자동 로깅 (Sentry + DB)

#### Admin 페이지
- `/admin/security-logs` - 보안 이벤트 모니터링 대시보드
- 필터링: 이벤트 타입, 심각도, 날짜 범위
- 통계: 총 이벤트 수, 최근 24시간/7일, Critical 이벤트

#### 사용 예시
```typescript
import { logSecurityEvent } from '@/lib/security'

// 자동으로 Sentry + DB에 로깅됨
logSecurityEvent('sql_injection', {
  userId: user.id,
  ipAddress: req.headers.get('x-forwarded-for'),
  userAgent: req.headers.get('user-agent'),
  method: 'POST',
  path: '/api/search',
  query: sanitizedQuery,
})
```

---

### 3. **성능 모니터링 (Vercel Analytics + Web Vitals)**

#### 설정 완료
- `@vercel/analytics` - Vercel Analytics (이미 설치됨)
- `@vercel/speed-insights` - Speed Insights (이미 설치됨)
- `components/analytics/web-vitals.tsx` - Web Vitals Reporter

#### Core Web Vitals 추적
- **CLS** (Cumulative Layout Shift) - 레이아웃 안정성
- **FCP** (First Contentful Paint) - 첫 콘텐츠 표시 시간
- **LCP** (Largest Contentful Paint) - 최대 콘텐츠 표시 시간
- **FID** (First Input Delay) - 첫 입력 지연
- **TTFB** (Time To First Byte) - 첫 바이트까지 시간

#### Vercel Dashboard
1. Vercel 대시보드 → 프로젝트 선택 → Analytics 탭
2. Speed Insights 활성화
3. 실시간 성능 메트릭 확인

---

### 4. **사용자 활동 로깅 (Audit Log)**

#### 데이터베이스
- `audit_logs` 테이블 (마이그레이션: `20251026000002_add_audit_logs_table.sql`)
- 중요 액션 추적: create, update, delete, ban, role_change 등
- Old/New Value 저장 (변경 이력 추적)
- 자동 정리: 180일 (6개월) 이상 된 로그 삭제

#### 라이브러리
- `lib/monitoring/audit-logger.ts` - Audit Log 저장 및 조회

#### 사용 예시
```typescript
import { logAuditEvent } from '@/lib/monitoring/audit-logger'

// 관리자 액션 로깅
await logAuditEvent({
  user_id: admin.id,
  action: 'ban_user',
  resource_type: 'user',
  resource_id: targetUser.id,
  old_value: { banned_at: null },
  new_value: { banned_at: new Date().toISOString(), reason: 'spam' },
  ip_address: req.headers.get('x-forwarded-for'),
  user_agent: req.headers.get('user-agent'),
})
```

---

## 📊 모니터링 대시보드

### Admin Dashboard 통합
관리자는 다음 페이지에서 모니터링 데이터를 확인할 수 있습니다:

1. **Security Logs** (`/admin/security-logs`)
   - 보안 이벤트 실시간 모니터링
   - 통계 및 필터링

2. **Performance** (`/admin/performance`)
   - 성능 메트릭 확인 (기존 페이지 활용)

3. **Sentry Dashboard** (외부 링크)
   - https://sentry.io 에서 에러 및 성능 상세 분석

---

## 🚨 Alert 시스템 (선택 사항)

### Sentry Alerts
Sentry에서 자동 알림 설정 가능:
1. Sentry → Alerts → Create Alert Rule
2. 조건 설정 (예: Error rate > 10% in 5 minutes)
3. 알림 채널: Email, Slack, PagerDuty 등

### Slack Webhook (향후 구현)
```typescript
// lib/monitoring/alert-manager.ts (예정)
export async function sendSlackAlert(message: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  })
}
```

---

## 🔍 Uptime 모니터링 (선택 사항)

### BetterStack (추천)
1. https://betterstack.com/uptime 회원가입 (무료 플랜)
2. Monitor 추가:
   - URL: `https://templar-archives.vercel.app`
   - 체크 간격: 1분
   - Alert 설정: downtime > 1분
3. Status Page 생성 (공개 상태 페이지)

### Checkly (대안)
1. https://www.checklyhq.com/ 회원가입
2. API Check 추가:
   - GET `https://templar-archives.vercel.app/api/health`
   - 주기: 1분
   - 지역: Global (3개 이상)
3. Alert Rule 설정

---

## 📈 성능 최적화 체크리스트

### 모니터링 기반 최적화
1. **Sentry Performance**
   - Slow transactions 확인 (> 2초)
   - N+1 쿼리 식별
   - 번들 크기 분석

2. **Web Vitals**
   - LCP < 2.5초
   - FID < 100ms
   - CLS < 0.1

3. **Security Events**
   - Rate limit violations 패턴 분석
   - SQL injection attempts 출처 차단
   - Failed login attempts IP 차단

---

## 🛠️ 유지보수 가이드

### 정기 작업 (월 1회)
1. Sentry 이슈 검토 및 수정
2. Security Events 통계 분석
3. Audit Logs 검토 (관리자 액션 감사)
4. 오래된 로그 정리 확인

### 로그 정리 (자동)
```sql
-- 90일 이상 된 Security Events 삭제
SELECT cleanup_old_security_events();

-- 180일 이상 된 Audit Logs 삭제
SELECT cleanup_old_audit_logs();
```

### 문제 해결
1. **Sentry 이벤트가 전송되지 않음**
   - `NEXT_PUBLIC_SENTRY_DSN` 환경 변수 확인
   - `NEXT_PUBLIC_ENVIRONMENT` 값 확인 (development가 아닌지)

2. **Security Events가 저장되지 않음**
   - `SUPABASE_SERVICE_ROLE_KEY` 환경 변수 확인
   - RLS 정책 확인

3. **성능 저하**
   - Sentry tracesSampleRate 낮추기 (0.1 → 0.05)
   - Web Vitals sampling 조정

---

## 📚 관련 문서
- [Sentry Next.js 가이드](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Vercel Analytics](https://vercel.com/docs/analytics)
- [Web Vitals](https://web.dev/vitals/)

---

**마지막 업데이트**: 2025-10-26
**작성자**: Templar Archives Team
