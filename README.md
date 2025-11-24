# Templar Archives

> 포커 영상을 자동으로 핸드 히스토리로 변환하고 분석하는 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black)](https://templar-archives.vercel.app)

**프로덕션**: https://templar-archives.vercel.app

---

## Quick Start

```bash
# 1. 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env.local
# .env.local 편집

# 3. 개발 서버
npm run dev

# 4. Trigger.dev 로컬 (영상 분석 테스트 시)
npx trigger.dev@latest dev --port 3001
```

---

## 기술 스택

| 카테고리 | 기술 |
|----------|------|
| Framework | Next.js 16, React 19, TypeScript 5.9 |
| Styling | Tailwind CSS 4.1 |
| State | React Query 5, Zustand 5 |
| Database | Supabase (PostgreSQL) |
| AI | Gemini 2.5 Flash |
| Background Jobs | Trigger.dev v3 |
| Video | @distube/ytdl-core, fluent-ffmpeg |

**Node.js**: >=22.0.0
**패키지 매니저**: npm

---

## 프로젝트 구조

```
templar-archives/
├── app/                       # Next.js App Router
│   ├── archive/               # Archive 페이지 (핵심)
│   ├── search/                # AI 검색
│   ├── community/             # 커뮤니티
│   ├── players/               # 플레이어
│   ├── admin/                 # 관리자 패널
│   ├── api/                   # API Routes
│   └── actions/               # Server Actions
│
├── components/                # React 컴포넌트
│   ├── features/              # 비즈니스 로직 단위
│   ├── common/                # 공용 컴포넌트
│   ├── layout/                # 레이아웃
│   ├── dialogs/               # 다이얼로그
│   └── ui/                    # shadcn/ui
│
├── lib/                       # 유틸리티
│   ├── queries/               # React Query 훅
│   ├── video/                 # 영상 처리 모듈
│   ├── ai/                    # AI 프롬프트
│   └── types/                 # TypeScript 타입
│
├── stores/                    # Zustand 상태 관리
├── trigger/                   # Trigger.dev Tasks
└── supabase/migrations/       # DB 마이그레이션
```

---

## 핵심 기능

### 1. Archive (영상 아카이브)

**4단계 계층 구조**:
```
Tournament → Event → Stream → Hand
                              ├── HandPlayers
                              └── HandActions
```

- YouTube 영상 플레이어
- Quick Upload (URL 자동 파싱)
- 핸드 히스토리 상세 보기

### 2. KAN (영상 분석 파이프라인)

```
사용자 → Server Action → Trigger.dev v3
                            ↓
         YouTube → FFmpeg 추출 → Gemini 분석 → DB 저장
```

**핵심 특징**:
- Gemini 2.5 Flash 기반 AI 분석
- 인메모리 처리 (디스크 I/O 없음)
- 1시간 초과 영상 자동 30분 분할
- 5회 재시도, Exponential Backoff
- 실시간 진행률 표시 (2초 폴링)

### 3. Search (AI 검색)

- Gemini 기반 자연어 검색
- 30+ 고급 필터
- Full-Text Search (PostgreSQL)

### 4. Community

- Reddit 스타일 포스트/댓글 (무한 중첩)
- 좋아요/싫어요, 북마크
- 핸드 공유

### 5. Players

- 플레이어 통계 (VPIP, PFR, 3Bet, Win Rate)
- 통계 캐싱 시스템
- 플레이어 클레임

---

## 개발 명령어

```bash
# 개발
npm run dev                               # 개발 서버
npx trigger.dev@latest dev --port 3001    # Trigger.dev 로컬

# 빌드 & 린트
npm run build
npm run lint
npx tsc --noEmit                          # TypeScript 체크

# 테스트
npm run test                              # Vitest 전체
npm run test lib/filter-utils.test.ts     # 단일 파일
npm run test:e2e                          # Playwright E2E

# 데이터베이스
supabase db push                          # 프로덕션 적용
supabase db reset                         # 로컬 리셋
supabase migration new migration_name     # 새 마이그레이션

# 배포
npx trigger.dev@latest deploy             # Trigger.dev 배포
npm run analyze                           # 번들 분석

# Admin CLI
npm run admin -- --action=diagnose        # 시스템 진단
npm run admin -- --action=check-jobs      # KAN 작업 상태
```

---

## 환경 변수

```bash
# 필수
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_API_KEY=your-key              # Gemini AI
TRIGGER_SECRET_KEY=your-key          # Trigger.dev v3

# 선택
ANTHROPIC_API_KEY=sk-ant-...         # Claude
UPSTASH_REDIS_REST_URL=your-url      # Rate Limiting
YTDL_COOKIE=VISITOR_INFO1_LIVE=xxx;__Secure-3PSID=xxx
YTDL_USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15"
YTDL_ACCEPT_LANGUAGE=en-US,en;q=0.9
```

---

## 데이터베이스

### 핵심 테이블 (28개)

**Archive**: tournaments, sub_events, streams, hands, hand_players, hand_actions
**Players**: players, player_stats_cache, player_claims
**Community**: posts, comments, likes, hand_bookmarks
**System**: users, notifications, analysis_jobs, security_events, audit_logs

### ERD (간소화)

```
tournaments → sub_events → streams → hands
                                      │
                                      ├── hand_players ─── players
                                      │                      └── player_stats_cache
                                      └── hand_actions

analysis_jobs → streams (KAN 작업 추적)
```

---

## 문서

| 문서 | 설명 |
|------|------|
| `CLAUDE.md` | Claude Code 가이드 (핵심) |
| `docs/POKER_DOMAIN.md` | 포커 도메인 지식 |
| `docs/DATABASE_SCHEMA.md` | DB 스키마 상세 |
| `docs/REACT_QUERY_GUIDE.md` | 데이터 페칭 패턴 |
| `docs/DEPLOYMENT.md` | 배포 가이드 |
| `docs/DESIGN_SYSTEM.md` | 디자인 시스템 |

---

## 배포

```
Git Push (main) → Vercel Build → Production Deploy
                                  ↓
                  https://templar-archives.vercel.app
```

**배포 전 체크리스트**:
- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 에러 없음
- [ ] Vercel 환경 변수 등록
- [ ] Supabase 마이그레이션 적용
- [ ] Trigger.dev 배포 (`npx trigger.dev@latest deploy`)

---

**마지막 업데이트**: 2025-11-24
**프로젝트**: Templar Archives
