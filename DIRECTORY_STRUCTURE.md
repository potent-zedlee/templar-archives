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
├── layout.tsx                         # 루트 레이아웃
├── globals.css                        # 전역 CSS
│
├── archive/page.tsx                   # 아카이브 (/archive)
├── search/page.tsx                    # 검색 (/search)
├── community/page.tsx                 # 커뮤니티 (/community)
├── bookmarks/page.tsx                 # 북마크 (/bookmarks) 🔐
├── my-edit-requests/page.tsx          # 내 수정 제안 (/my-edit-requests) 🔐
│
├── players/
│   ├── page.tsx                       # 플레이어 목록 (/players)
│   └── [id]/page.tsx                  # 플레이어 상세 (/players/[id])
│
├── profile/
│   ├── page.tsx                       # 내 프로필 (/profile) 🔐
│   └── [id]/page.tsx                  # 다른 유저 프로필 (/profile/[id])
│
├── auth/
│   ├── login/page.tsx                 # 로그인 (/auth/login)
│   └── callback/page.tsx              # OAuth 콜백 (/auth/callback)
│
├── admin/                             # 관리자 페이지 (관리자 권한 필수)
│   ├── dashboard/page.tsx             # 대시보드
│   ├── users/page.tsx                 # 사용자 관리
│   ├── claims/page.tsx                # 플레이어 클레임 승인
│   ├── edit-requests/page.tsx         # 핸드 수정 요청 관리
│   └── content/page.tsx               # 콘텐츠 신고 관리
│
└── api/
    ├── natural-search/route.ts        # Claude AI 자연어 검색
    ├── import-hands/route.ts          # 외부 핸드 Import
    ├── analyze-video/route.ts         # 영상 분석 (Claude Vision)
    └── extract-youtube-frames/route.ts # YouTube 프레임 추출
```

---

## 🎨 2. components/ - React 컴포넌트

```
components/
├── header.tsx                         # 네비게이션 바 (로그인 상태별 UI)
├── theme-provider.tsx                 # 다크/라이트 모드 Provider
├── auth-provider.tsx                  # 인증 상태 Provider (useAuth 훅)
│
├── video-player.tsx                   # 영상 플레이어 (YouTube/Upload/NAS)
├── hand-list-accordion.tsx            # 핸드 목록 (Accordion)
├── hand-history-detail.tsx            # 핸드 상세 정보 (좋아요, 댓글, 북마크 포함)
├── hand-comments.tsx                  # 핸드 댓글 시스템
├── filter-panel.tsx                   # 고급 검색 필터 패널
├── share-hand-dialog.tsx              # 핸드 공유 다이얼로그
├── bookmark-dialog.tsx                # 북마크 추가/수정 다이얼로그
├── claim-player-dialog.tsx            # 플레이어 클레임 다이얼로그
├── analyze-dialog.tsx                 # 영상 분석 다이얼로그
├── hand-search-dialog.tsx             # 커뮤니티 핸드 첨부 (4단계 선택)
│
├── archive-breadcrumb.tsx             # 아카이브 Breadcrumb 네비게이션
├── archive-folder-list.tsx            # 아카이브 폴더/파일 리스트 (Google Drive 스타일)
├── tournament-dialog.tsx              # Tournament 생성/수정 다이얼로그
│
├── hero-section.tsx                   # 홈 히어로 섹션
├── recent-analyses.tsx                # 최근 분석 섹션
├── most-used-videos.tsx               # 인기 영상 섹션
├── on-this-day.tsx                    # 오늘의 역사 섹션
│
├── player-charts.tsx                  # 플레이어 차트 (Recharts, 동적 임포트)
│
└── ui/                                # shadcn/ui 컴포넌트 라이브러리
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
    └── [50+ 컴포넌트]
```

---

## 📚 3. lib/ - 유틸리티 라이브러리

```
lib/
├── supabase.ts                        # Supabase 클라이언트 + 타입
├── auth.ts                            # 인증 함수 (signInWithGoogle, signOut, getUser)
├── supabase-community.ts              # 커뮤니티 관련 Supabase 함수
├── queries.ts                         # 복잡한 Supabase 쿼리
├── filter-store.ts                    # 고급 필터 상태 관리 (Zustand)
├── utils.ts                           # 공통 유틸리티 (cn, formatDate)
│
├── hand-likes.ts                      # 핸드 좋아요/싫어요 API
├── hand-bookmarks.ts                  # 북마크 API
├── player-claims.ts                   # 플레이어 클레임 API
├── hand-edit-requests.ts              # 핸드 수정 요청 API
├── admin.ts                           # 관리자 기능 API
├── content-moderation.ts              # 콘텐츠 신고 API
├── user-profile.ts                    # 유저 프로필 API
│
├── hand-boundary-detector.ts          # 핸드 경계 감지 (Claude Vision)
├── hand-sequence-analyzer.ts          # 핸드 시퀀스 분석 (Claude Vision)
│
└── types/
    └── hand-history.ts                # HandHistory 타입 정의
```

---

## 🪝 4. hooks/ - Custom React Hooks

```
hooks/
├── use-mobile.ts                      # 모바일 화면 감지
├── use-toast.ts                       # Toast 알림 훅
└── useArchiveState.ts                 # Archive 페이지 상태 관리 (네비게이션 포함)
```

---

## 📖 5. docs/ - 프로젝트 문서

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

## 🛠️ 6. scripts/ - 유틸리티 스크립트

```
scripts/
└── delete-all-data.ts                 # 전체 데이터 삭제 (개발/테스트용)
```

**실행 방법**:
```bash
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npx tsx scripts/delete-all-data.ts
```

---

## 🗄️ 7. supabase/ - 데이터베이스 마이그레이션

```
supabase/
├── config.toml                        # Supabase CLI 설정
└── migrations/
    ├── 000_init_migration_history.sql # 마이그레이션 히스토리 초기화
    ├── 20241001000001_init_schema.sql # 기본 스키마
    ├── 20241001000002_add_players.sql # 플레이어 시스템
    ├── 20241001000003_add_video_sources.sql # 영상 소스
    ├── 20241001000004_add_community.sql # 커뮤니티
    ├── 20241001000005_add_users_table.sql # Users 테이블
    ├── 20241001000006_add_hand_likes.sql # 핸드 좋아요/싫어요
    ├── 20241001000007_add_payouts_and_matching.sql
    ├── 20241001000008_add_subevent_details.sql
    ├── 20241001000009_add_hand_details.sql # POT, 보드 카드, 액션
    ├── 20241001000010_add_player_notes.sql
    ├── 20241001000011_add_player_claims.sql # 플레이어 클레임
    ├── 20241001000012_add_hand_bookmarks.sql # 북마크
    ├── 20251015000013_add_community_search.sql # Full-Text Search
    ├── 20251015000014_add_user_profile_fields.sql # 유저 프로필 확장
    ├── 20251015000015_add_admin_system.sql # 관리자 시스템
    ├── 20251015000016_add_content_moderation.sql # 콘텐츠 신고
    ├── 20251015000017_add_hand_edit_requests.sql # 핸드 수정 요청
    └── 20251016000018_fix_admin_permissions.sql # Admin RLS 정책
```

---

## 🌐 8. public/ - 정적 파일

```
public/
├── favicon.ico
├── icon.webp                          # 파비콘 (Protoss Carrier)
└── [이미지, 아이콘 등]
```

---

## ⚙️ 9. 설정 파일

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

## 📄 10. 프로젝트 문서 (루트)

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
| 아카이브 페이지 | `app/archive/page.tsx` |
| 검색 페이지 | `app/search/page.tsx` |
| 자연어 검색 API | `app/api/natural-search/route.ts` |
| 핸드 Import API | `app/api/import-hands/route.ts` |
| 영상 분석 API | `app/api/analyze-video/route.ts` |
| Supabase 클라이언트 | `lib/supabase.ts` |
| 인증 Provider | `components/auth-provider.tsx` |
| 핸드 목록 | `components/hand-list-accordion.tsx` |
| 핸드 상세 | `components/hand-history-detail.tsx` |
| 영상 플레이어 | `components/video-player.tsx` |
| 핸드 경계 감지 | `lib/hand-boundary-detector.ts` |
| 핸드 시퀀스 분석 | `lib/hand-sequence-analyzer.ts` |

---

**마지막 업데이트**: 2025-10-16
**버전**: 3.1
**상태**: Phase 0-8 완료 (Google Drive 스타일 폴더 네비게이션)
