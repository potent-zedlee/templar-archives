# Templar Archives 디렉토리 구조

## 📁 프로젝트 루트 구조

```
templar-archives/
├── app/                    # Next.js 15 App Router (페이지 + API)
├── components/             # React 컴포넌트
├── lib/                    # 유틸리티 라이브러리
├── hooks/                  # Custom React Hooks
├── docs/                   # 프로젝트 문서
├── scripts/                # 유틸리티 스크립트
├── public/                 # 정적 파일
├── supabase/               # 데이터베이스 마이그레이션
└── [설정 파일들]
```

---

## 📂 1. app/ - Next.js 페이지 및 API

```
app/
├── page.tsx                           # 홈 (/)
├── layout.tsx                         # 루트 레이아웃 (SEO metadata, Phase 28)
├── globals.css                        # 전역 CSS
├── sitemap.ts                         # 자동 sitemap.xml 생성 (Phase 28)
├── robots.ts                          # 자동 robots.txt 생성 (Phase 28)
│
├── archive/
│   ├── page.tsx                       # 아카이브 리다이렉트 (→ /archive/tournament)
│   ├── tournament/page.tsx            # 토너먼트 아카이브 (Phase 23)
│   ├── cash-game/page.tsx             # 캐시 게임 아카이브 (Phase 23)
│   └── _components/                   # Archive 전용 컴포넌트
│       ├── ArchiveProviders.tsx       # DnD + 키보드 단축키 Provider
│       ├── ArchiveToolbar.tsx         # 검색/필터/뷰모드 툴바
│       ├── ArchiveEventsList.tsx      # 이벤트 리스트
│       ├── ArchiveHandHistory.tsx     # 핸드 히스토리 섹션
│       └── ArchiveDialogs.tsx         # 모든 다이얼로그 통합 (동적 임포트, Phase 28)
│
├── search/page.tsx                    # 검색 (/search)
├── community/
│   ├── page.tsx                       # 커뮤니티 목록 (/community)
│   └── [id]/page.tsx                  # 포스트 상세
├── bookmarks/page.tsx                 # 북마크 (/bookmarks) 🔐
├── notifications/page.tsx             # 알림 (/notifications) 🔐 (Phase 20)
├── my-edit-requests/page.tsx          # 내 수정 제안 (/my-edit-requests) 🔐
│
├── news/                              # 뉴스 (Phase 22)
│   ├── page.tsx                       # 뉴스 목록
│   └── [id]/page.tsx                  # 뉴스 상세
│
├── live-reporting/                    # 라이브 리포팅 (Phase 22)
│   ├── page.tsx                       # 라이브 리포트 목록
│   └── [id]/page.tsx                  # 라이브 리포트 상세
│
├── players/
│   ├── page.tsx                       # 플레이어 목록 (/players)
│   └── [id]/page.tsx                  # 플레이어 상세 (동적 임포트, Phase 28)
│
├── profile/
│   ├── page.tsx                       # 내 프로필 (/profile) 🔐
│   └── [id]/page.tsx                  # 다른 유저 프로필 (/profile/[id])
│
├── auth/
│   ├── login/page.tsx                 # 로그인 (/auth/login)
│   └── callback/page.tsx              # OAuth 콜백 (/auth/callback)
│
├── reporter/                          # Reporter 페이지 (Phase 22) 🔐
│   ├── news/page.tsx                  # 뉴스 관리
│   └── live/page.tsx                  # 라이브 리포팅 관리
│
├── admin/                             # 관리자 페이지 🔐
│   ├── dashboard/page.tsx             # 대시보드
│   ├── users/page.tsx                 # 사용자 관리 (Last Sign-in, Phase 25)
│   ├── claims/page.tsx                # 플레이어 클레임 승인
│   ├── edit-requests/page.tsx         # 핸드 수정 요청 관리
│   ├── content/page.tsx               # 콘텐츠 신고/뉴스 승인 (Phase 22)
│   ├── archive/page.tsx               # 아카이브 관리 (Phase 31)
│   └── hands/[id]/
│       └── edit-actions/page.tsx      # 핸드 액션 수동 입력 (Phase 18)
│
├── actions/                           # Server Actions (Phase 31)
│   └── archive.ts                     # Archive CRUD Server Actions (670줄)
│
└── api/
    ├── natural-search/route.ts        # Claude AI 자연어 검색 (JSON 필터, Phase 32)
    ├── import-hands/route.ts          # 외부 핸드 Import (CSRF 보호, Phase 32)
    ├── analyze-video/route.ts         # 영상 분석 (Claude Vision)
    └── youtube/
        └── channel-streams/route.ts   # YouTube 채널 스트림 (Phase 27)
```

---

## 🎨 2. components/ - React 컴포넌트

```
components/
├── header.tsx                         # 네비게이션 바 (Phase 23 구조 변경)
├── theme-provider.tsx                 # 다크/라이트 모드 Provider
├── auth-provider.tsx                  # 인증 상태 Provider
├── providers.tsx                      # React Query Provider (Phase 16)
│
├── video-player.tsx                   # 영상 플레이어 (YouTube/Upload/NAS)
├── hand-list-accordion.tsx            # 핸드 목록 (Accordion)
├── hand-history-detail.tsx            # 핸드 상세 정보
├── hand-comments.tsx                  # 핸드 댓글 시스템 (Reddit 스타일)
├── filter-panel.tsx                   # 고급 검색 필터 패널
├── share-hand-dialog.tsx              # 핸드 공유 다이얼로그
├── bookmark-dialog.tsx                # 북마크 추가/수정 다이얼로그
├── claim-player-dialog.tsx            # 플레이어 클레임 다이얼로그
├── analyze-dialog.tsx                 # 영상 분석 다이얼로그
├── hand-search-dialog.tsx             # 커뮤니티 핸드 첨부
├── card-selector.tsx                  # 카드 선택기 (52-card deck, Phase 24)
├── archive-info-dialog.tsx            # Archive 상세 정보 (Phase 24)
│
├── archive-breadcrumb.tsx             # 아카이브 Breadcrumb
├── archive-folder-list.tsx            # 아카이브 폴더/파일 리스트
├── tournament-dialog.tsx              # Tournament 생성/수정
├── quick-upload-dialog.tsx            # Quick Upload (Phase 27)
│
├── notification-bell.tsx              # 헤더 알림 벨 (Phase 20, 245줄)
│
├── hand-actions/                      # 핸드 액션 컴포넌트 (Phase 18)
│   ├── ActionInput.tsx                # 액션 입력 폼 (178줄)
│   ├── ActionList.tsx                 # 액션 목록 (141줄)
│   ├── StreetTabs.tsx                 # Street 탭 (42줄)
│   └── ActionEditor.tsx               # 메인 에디터 (230줄)
│
├── player-stats/                      # 플레이어 통계 컴포넌트 (Phase 21)
│   ├── AdvancedStatsCard.tsx          # 고급 통계 (VPIP, PFR, 3-Bet)
│   ├── PositionalStatsCard.tsx        # 포지션별 통계
│   └── PerformanceChartCard.tsx       # 성과 차트 (Recharts)
│
├── reporter/                          # Reporter 컴포넌트 (Phase 22)
│   └── content-editor.tsx             # 콘텐츠 에디터 (Markdown, 293줄)
│
├── admin/                             # 관리자 컴포넌트
│   └── CategoryDialog.tsx             # 카테고리 다이얼로그 (로고 업로드, Phase 29)
│
├── hero-section.tsx                   # 홈 히어로 섹션
├── recent-analyses.tsx                # 최근 분석 섹션
├── most-used-videos.tsx               # 인기 영상 섹션
├── on-this-day.tsx                    # 오늘의 역사 섹션
│
└── ui/                                # shadcn/ui 컴포넌트 라이브러리 (50+ 컴포넌트)
    ├── button.tsx
    ├── card.tsx
    ├── dialog.tsx
    ├── input.tsx
    ├── select.tsx
    ├── table.tsx
    ├── accordion.tsx
    ├── badge.tsx
    ├── tabs.tsx
    ├── resizable.tsx
    ├── avatar.tsx
    ├── progress.tsx
    ├── scroll-area.tsx
    ├── calendar.tsx
    └── [40+ more...]
```

---

## 📚 3. lib/ - 유틸리티 라이브러리

```
lib/
├── supabase.ts                        # Supabase 클라이언트 + 타입
├── auth.ts                            # 인증 함수
├── auth-utils.ts                      # 인증 유틸리티 (isAdmin 등)
├── supabase-community.ts              # 커뮤니티 관련 Supabase 함수
├── queries.ts                         # 복잡한 Supabase 쿼리
├── filter-store.ts                    # 고급 필터 상태 관리 (Zustand)
├── utils.ts                           # 공통 유틸리티 (cn, formatDate)
│
├── hand-likes.ts                      # 핸드 좋아요/싫어요 API
├── hand-bookmarks.ts                  # 북마크 API
├── hand-actions.ts                    # 핸드 액션 CRUD (Phase 18, 297줄)
├── player-claims.ts                   # 플레이어 클레임 API
├── player-stats.ts                    # 플레이어 통계 계산 (Phase 21, 446줄)
├── hand-edit-requests.ts              # 핸드 수정 요청 API
├── admin.ts                           # 관리자 기능 API (LIKE 패턴 이스케이프, Phase 32)
├── content-moderation.ts              # 콘텐츠 신고 API
├── user-profile.ts                    # 유저 프로필 API
├── notifications.ts                   # 알림 API (Phase 20, 253줄)
├── tournament-categories-db.ts        # 토너먼트 카테고리 DB (로고 업로드)
│
├── hand-boundary-detector.ts          # 핸드 경계 감지 (Claude Vision)
├── hand-sequence-analyzer.ts          # 핸드 시퀀스 분석 (Claude Vision)
├── natural-search-filter.ts           # 자연어 검색 필터 (Phase 32, 277줄)
├── file-upload-validator.ts           # 파일 업로드 검증 (Phase 32, 212줄)
├── env.ts                             # 환경 변수 중앙 관리 (Phase 32, 125줄)
├── rate-limit.ts                      # Rate Limiting (User ID 기반, Phase 32)
│
├── security/                          # 보안 유틸리티 (Phase 13)
│   ├── sql-sanitizer.ts               # SQL Injection 방지 (188줄)
│   ├── xss-sanitizer.ts               # XSS 방지 (262줄)
│   ├── csrf.ts                        # CSRF 보호 (224줄)
│   └── index.ts                       # 통합 보안 모듈 (227줄)
│
├── validation/                        # 입력 검증 (Phase 13)
│   └── api-schemas.ts                 # Zod 스키마 (15개)
│
├── queries/                           # React Query 훅 (Phase 16, 총 650줄) ⭐
│   ├── community-queries.ts           # 포스트 상세, 좋아요 (89줄)
│   ├── search-queries.ts              # 핸드 검색, 필터 옵션 (68줄)
│   ├── players-queries.ts             # 플레이어 리스트, 상세 (203줄)
│   ├── profile-queries.ts             # 프로필, 아바타 (163줄)
│   ├── bookmarks-queries.ts           # 북마크 CRUD (79줄)
│   ├── edit-requests-queries.ts       # 수정 제안 목록 (38줄)
│   ├── hand-actions-queries.ts        # 핸드 액션 (Phase 18, 218줄)
│   ├── notification-queries.ts        # 알림 (Phase 20, 244줄)
│   ├── player-stats-queries.ts        # 플레이어 통계 (Phase 21, 218줄)
│   ├── news-queries.ts                # 뉴스 (Phase 22, 313줄)
│   └── live-reports-queries.ts        # 라이브 리포트 (Phase 22, 313줄)
│
└── types/                             # 타입 정의 (Phase 9) ⭐
    ├── hand-history.ts                # HandHistory 타입
    └── archive.ts                     # Archive 전용 타입 (350줄, 20+ 타입)
```

---

## 🗄️ 4. stores/ - Zustand 상태 관리 (Phase 9 신규) ⭐

```
stores/
├── archive-data-store.ts              # 데이터 관리 (tournaments, hands, 230줄)
├── archive-ui-store.ts                # UI 상태 (dialogs, navigation, 350줄)
└── archive-form-store.ts              # 폼 데이터 (tournament, subevent, day, 200줄)
```

**총 780줄의 체계적인 상태 관리 시스템**

---

## 🪝 5. hooks/ - Custom React Hooks

```
hooks/
├── use-mobile.ts                      # 모바일 화면 감지
├── use-toast.ts                       # Toast 알림 훅
├── useArchiveState.ts                 # Archive 페이지 상태 (⚠️ Deprecated, stores로 이동)
├── useArchiveData.ts                  # Archive 데이터 로딩 훅
└── useArchiveKeyboard.ts              # Archive 키보드 단축키 훅
```

---

## 📖 6. docs/ - 프로젝트 문서

```
docs/
├── HAND_IMPORT_API.md                 # 핸드 Import API 문서
├── VIDEO_SOURCES.md                   # 영상 소스 가이드
│
└── ui-specifications/                 # UI 스펙 문서 (10개)
    ├── README.md
    ├── 00-component-library.md
    ├── 01-home.md
    ├── 03-archive.md
    ├── 04-hands.md
    ├── 05-hand-detail.md
    ├── 06-search.md
    ├── 07-players.md
    ├── 08-player-detail.md
    └── 09-community.md
```

---

## 🛠️ 7. scripts/ - 유틸리티 스크립트

```
scripts/
├── delete-all-data.ts                 # 전체 데이터 삭제 (개발/테스트용)
├── update-logo-extensions.ts          # 로고 확장자 자동 감지 (Phase 15, 132줄)
└── download-pokernews-logos.ts        # 로고 다운로드 (Phase 15, 145줄)
```

---

## 🗄️ 8. supabase/ - 데이터베이스 마이그레이션

```
supabase/
├── config.toml                        # Supabase CLI 설정
└── migrations/                        # DB 마이그레이션 (총 41개)
    ├── 000_init_migration_history.sql
    ├── 20241001000001_init_schema.sql
    ├── ... (기존 마이그레이션 생략)
    ├── 20251018000026_add_notifications_system.sql # 알림 시스템 (Phase 20, 434줄)
    ├── 20251020000030_add_hand_notification_triggers.sql # 핸드 알림 트리거 (Phase 20, 246줄)
    ├── 20251021000032_add_last_sign_in_tracking.sql # 로그인 추적 (Phase 25)
    ├── 20251022000001_add_game_type_to_tournaments.sql # game_type 필드 (Phase 23)
    ├── 20251022000002_add_news_and_live_reports.sql # 뉴스/라이브 리포팅 (Phase 22)
    ├── 20251023000001_create_tournament_logos_storage.sql # 로고 Storage (Phase 29)
    ├── 20251024000001_add_event_number_to_sub_events.sql # event_number 필드 (Phase 30)
    ├── 20251024000001_fix_rls_admin_only.sql # RLS 강화 (Phase 32, 357줄)
    └── 20251024000002_remove_dangerous_rpc.sql # execute_search_query 삭제 (Phase 32)
```

---

## 🌐 9. public/ - 정적 파일

```
public/
├── favicon.ico
├── icon.webp                          # 파비콘 (Protoss Carrier)
└── logos/                             # 토너먼트 로고 (36개)
    ├── wsop.png                       # 실제 로고 (21 KB)
    ├── triton.png                     # 실제 로고 (26 KB)
    ├── ept.png                        # 실제 로고 (8 KB)
    └── [30+ more logos...]
```

---

## ⚙️ 10. 설정 파일

### 9.1 Next.js 설정
- `package.json` - 프로젝트 메타데이터, 의존성, 스크립트
- `next.config.js` - Next.js 설정, 이미지 도메인 허용
- `tsconfig.json` - TypeScript 설정, 경로 별칭 (`@/*`)

### 9.2 Tailwind CSS 설정
- `tailwind.config.ts` - Tailwind CSS 설정 (4.1.9)
- `postcss.config.js` - PostCSS 플러그인

### 9.3 shadcn/ui 설정
- `components.json` - shadcn/ui 컴포넌트 설정

### 9.4 환경 변수
- `.env.local` (Git 무시) - Supabase URL, Anon Key, Anthropic API Key
- `.env.example` - 환경 변수 템플릿

### 9.5 Git
- `.gitignore` - `.next/`, `node_modules/`, `.env.local` 제외

---

## 📄 11. 프로젝트 문서 (루트)

```
templar-archives/
├── README.md                          # 프로젝트 소개
├── CLAUDE.md                          # 프로젝트 컨텍스트 (전체 개요)
├── WORK_LOG.md                        # 작업 로그 (세션별)
├── ROADMAP.md                         # 개발 로드맵 (Phase 0-7)
├── PAGES_STRUCTURE.md                 # 페이지 구조 및 기능
├── DIRECTORY_STRUCTURE.md             # 이 문서
└── DEPLOYMENT.md                      # Vercel 배포 가이드
```

---

## 🎯 핵심 파일 Quick Reference

| 기능 | 파일 경로 |
|------|-----------|
| **Archive 페이지** | `app/archive/tournament/page.tsx` ⭐ |
| Archive 데이터 Store | `stores/archive-data-store.ts` ⭐ |
| Archive UI Store | `stores/archive-ui-store.ts` ⭐ |
| Archive 타입 정의 | `lib/types/archive.ts` ⭐ |
| **Archive Server Actions** | `app/actions/archive.ts` (Phase 31, 670줄) |
| 검색 페이지 | `app/search/page.tsx` |
| **자연어 검색 API** | `app/api/natural-search/route.ts` (Phase 32 재설계) |
| **자연어 검색 필터** | `lib/natural-search-filter.ts` (Phase 32, 277줄) |
| 핸드 Import API | `app/api/import-hands/route.ts` (CSRF 보호) |
| 영상 분석 API | `app/api/analyze-video/route.ts` |
| Supabase 클라이언트 | `lib/supabase.ts` |
| **React Query Provider** | `components/providers.tsx` (Phase 16) |
| 인증 Provider | `components/auth-provider.tsx` |
| **알림 시스템** | `lib/notifications.ts` (Phase 20, 253줄) |
| **알림 벨** | `components/notification-bell.tsx` (Phase 20, 245줄) |
| **핸드 액션 CRUD** | `lib/hand-actions.ts` (Phase 18, 297줄) |
| **핸드 액션 에디터** | `components/hand-actions/ActionEditor.tsx` (230줄) |
| **플레이어 통계** | `lib/player-stats.ts` (Phase 21, 446줄) |
| 핸드 목록 | `components/hand-list-accordion.tsx` |
| 핸드 상세 | `components/hand-history-detail.tsx` |
| 영상 플레이어 | `components/video-player.tsx` |
| 핸드 경계 감지 | `lib/hand-boundary-detector.ts` |
| 핸드 시퀀스 분석 | `lib/hand-sequence-analyzer.ts` |
| **보안 모듈** | `lib/security/index.ts` (Phase 13, 227줄) |
| **파일 검증** | `lib/file-upload-validator.ts` (Phase 32, 212줄) |
| **환경 변수 관리** | `lib/env.ts` (Phase 32, 125줄) |

---

**마지막 업데이트**: 2025-10-24
**버전**: 7.0
**상태**: Phase 0-32 완료 (모든 핵심 기능 + 보안 강화)
**주요 변경**:
- **Phase 32**: Comprehensive Security Enhancement (8가지 보안 개선, 보안 등급 A)
- **Phase 31**: Archive Security & Admin Management Page (Server Actions)
- **Phase 30**: Archive Event Management Enhancement
- **Phase 22**: News & Live Reporting System (Reporter 역할)
- **Phase 20**: Notification System (8가지 알림 타입)
- **Phase 18**: Manual Hand Action Input System
- **Phase 16**: React Query Migration (6개 query 파일, 650줄)
- **Phase 9**: Archive 페이지 리팩토링 (1,733줄 → 88줄, -95%)
