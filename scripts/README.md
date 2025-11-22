# Scripts

Templar Archives 유틸리티 스크립트 모음

## 폴더 구조

```
scripts/
├── admin-cli.ts              # 통합 관리 CLI (핵심)
├── logo-management.ts        # 로고 관리
├── generate-hand-thumbnails.ts  # 썸네일 생성
├── README.md
│
├── operations/              # 자주 사용하는 운영 스크립트 (27개)
│   ├── check-*.mjs          # 상태 확인 스크립트
│   ├── cleanup-*.mjs        # 정리 스크립트
│   ├── import-*.mjs         # 데이터 Import 스크립트
│   └── update-*.mjs         # 업데이트 스크립트
│
└── archive/                 # 일회성 완료된 스크립트 (52개)
    ├── apply-*.ts           # 마이그레이션 적용
    ├── delete-*.ts          # 데이터 삭제
    ├── organize-*.ts        # 데이터 정리
    ├── test-*.mjs           # 테스트 스크립트
    └── *.sql                # SQL 스크립트
```

## Admin CLI (통합 관리 도구)

가장 자주 사용하는 운영 작업을 하나의 CLI로 통합했습니다.

### 사용법

```bash
# 도움말
npm run admin -- --action=help

# KAN 분석 작업 상태 확인
npm run admin -- --action=check-jobs

# STUCK 상태 작업 정리 (10분 초과)
npm run admin -- --action=cleanup-jobs

# RLS 정책 점검
npm run admin -- --action=check-rls

# DB 상태 확인 (테이블별 레코드 수, 최근 사용자)
npm run admin -- --action=check-db
```

### 예시 출력

```
📊 KAN 분석 작업 상태 확인
════════════════════════════════════════════════════════════════════════════════

✅ 최근 분석 작업 (5개):

  1. 🟢 RUNNING
     ID: abc123...
     Status: processing
     Progress: 45%
     Hands Found: 3
     Elapsed: 120s

  2. ✅ SUCCESS
     ID: def456...
     Status: success
     Progress: 100%
     Hands Found: 12
```

## NPM Scripts

### 운영 (ops:*)

```bash
# KAN 작업 상태 확인
npm run ops:check-jobs

# STUCK 작업 정리
npm run ops:cleanup-jobs

# DB 상태 확인
npm run ops:check-db

# RLS 정책 확인
npm run ops:check-rls

# Hendonmob 플레이어 Import
npm run ops:import-players

# 사용자 역할 변경
npm run ops:update-role
```

### 로고 관리 (logo:*)

```bash
npm run logo:fetch     # 로고 다운로드
npm run logo:upload    # Supabase Storage 업로드
npm run logo:delete    # 로고 삭제
npm run logo:validate  # 로고 검증
```

### 썸네일 (thumbnails:*)

```bash
npm run thumbnails:generate              # 전체 생성
npm run thumbnails:generate:day --day-id=<uuid>  # 특정 Day만
```

## Operations 폴더 (자주 사용)

| 스크립트 | 설명 |
|---------|------|
| `check-analysis-status.mjs` | KAN 분석 작업 상태 확인 |
| `check-db.mjs` | DB 연결 및 테이블 상태 확인 |
| `check-rls-policies.mjs` | RLS 정책 점검 |
| `cleanup-stuck-job.mjs` | STUCK 상태 작업 정리 |
| `cleanup-all-stuck-jobs.mjs` | 모든 STUCK 작업 일괄 정리 |
| `import-hendonmob-players.mjs` | Hendonmob 플레이어 데이터 Import |
| `update-female-players.mjs` | 여성 플레이어 gender 업데이트 |
| `update-user-role.mjs` | 사용자 역할 변경 |
| `generate-thumbnails.mjs` | 핸드 썸네일 생성 |
| `create-unsorted-stream.mjs` | Unsorted 스트림 생성 |

### 직접 실행

```bash
# Operations 폴더 스크립트 직접 실행
node scripts/operations/check-analysis-status.mjs
node scripts/operations/cleanup-stuck-job.mjs
```

## Archive 폴더 (완료된 스크립트)

일회성으로 실행 완료된 스크립트들입니다. 참고용으로 보관합니다.

| 분류 | 파일 수 | 설명 |
|-----|--------|------|
| 마이그레이션 | 10개 | DB 스키마 변경, 데이터 마이그레이션 |
| 삭제 | 5개 | 테스트 데이터, 중복 데이터 삭제 |
| 정리 | 8개 | 토너먼트, 스트림 데이터 정리 |
| 테스트 | 12개 | API, 연결 테스트 |
| SQL | 4개 | DB 유지보수 SQL |

## 환경 변수

스크립트 실행에 필요한 환경 변수 (`.env.local`):

```bash
# 필수
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# KAN 분석용
GOOGLE_API_KEY=AIzaSy...
```

## 문제 해결

### 권한 오류

```bash
# 실행 권한 부여
chmod +x scripts/operations/*.mjs
```

### Node.js 버전

```bash
# Node.js 22+ 필요
node --version
# v22.0.0 이상 확인
```

### 환경 변수 로딩 오류

```bash
# dotenv 설치 확인
npm install dotenv
```

---

**마지막 업데이트**: 2025-11-22
**Phase 1**: 기반 시설 대청소 완료
