# Templar Archives - Claude Project Context

## 프로젝트 개요
Templar Archives는 YouTube/Twitch 영상에서 포커 핸드를 자동으로 추출하고, 체계적으로 보관하며, 지능적으로 검색할 수 있는 **웹 기반 통합 플랫폼**입니다.

**기술**: Next.js 15.5.5, React 19, Supabase, Claude Vision API
**배포**: Vercel + Supabase
**개발 서버**: http://localhost:3000
**프로덕션**: https://templar-archives.vercel.app

---

## 핵심 기능

### 1. 영상 분석 ✅ (Phase 1-4 완료)
- **YouTube URL** 또는 **로컬 파일 업로드**
- **Claude Vision 2단계 파이프라인**:
  - 핸드 경계 감지 (CHECK_INTERVAL=2, 6초 간격)
  - 핸드 시퀀스 분석 (8개 키프레임)
- **성능**: 처리 15분/37분 영상, 비용 $2.75, 정확도 95%+
- **실시간 진행률** (SSE 스트리밍)

### 2. 데이터 관리 ✅
- 핸드 히스토리 + 영상 클립 동기화 저장
- 3가지 영상 소스 (YouTube, 로컬 파일, NAS)
- Archive 이벤트 관리 (Tournament/SubEvent/Day CRUD)

### 3. 검색 및 분석 ✅
- 30+ 검색 조건 필터링
- **AI 자연어 검색** (Claude 3.5 Sonnet)
- 통계 대시보드

### 4. 커뮤니티 ✅
- 포스트 작성 및 카테고리 (Analysis, Strategy, Hand Review, General)
- **Reddit 스타일 댓글/답글 시스템** (무한 중첩, 시각적 계층)
- 좋아요 기능 (포스트, 댓글)
- 핸드 공유 (SNS, 링크, 임베드)
- 북마크 시스템
- 포스트 상세 페이지 (`/community/[id]`)

### 5. 인증 ✅ (Phase 0 완료)
- Google OAuth 로그인
- Row Level Security (RLS)

### 6. 플레이어 프로필 클레임 ✅ (2025-10-14 완료)
- 유저가 자신의 플레이어 프로필 클레임 요청
- 소셜 미디어, 이메일 등 다양한 인증 방법
- 관리자 승인/거절 워크플로우
- 클레임 상태 배지 표시

---

## 현재 개발 상태 (2025-10-16)

### ✅ 완료된 Phase

#### Phase 0: 인증 시스템
- Google OAuth 로그인, 전역 인증 상태 관리 (`useAuth` 훅), RLS

#### 프론트엔드 UI (100%)
- 메인, Archive, Search, Players, Community 페이지
- Tournament 트리, 영상 플레이어, 핸드 목록 (Accordion)

#### 데이터베이스 (25개 마이그레이션)
- 001-012: 기본 스키마 (tournaments, sub_events, days, hands, players, video_sources, community, hand_likes, bookmarks, player_claims)
- 013-022: 고급 기능 (Full-Text Search, 유저 프로필, 관리자 시스템, 콘텐츠 신고, 핸드 수정 요청, Admin RLS, 커뮤니티 RLS, Unsorted Videos)
- 023-024: 데이터베이스 최적화 (미사용 테이블/컬럼 정리, 커뮤니티 Foreign Key 수정)
- 025: 성능 최적화 인덱스 (pg_trgm, 20+ 인덱스)

#### 영상 분석 (Claude Vision)
- **Phase 1-4**: 핸드 경계 감지, Accordion UI, 정확도 개선 (CHECK_INTERVAL=2, summary 필드)
- **성능**: 15분/37분 영상, 비용 $2.75, 정확도 95%+
- **핵심 파일**: `lib/hand-boundary-detector.ts`, `lib/hand-sequence-analyzer.ts`, `app/api/analyze-video/route.ts`

#### Phase 1: 핸드 상호작용
- 좋아요/싫어요 (hand_likes 테이블, Optimistic Update)
- 댓글 시스템 (재귀적 대댓글, `hand-comments.tsx`)

#### Phase 2: 커뮤니티 강화
- 핸드 첨부 (Tournament → SubEvent → Day → Hand 4단계 선택)
- 북마크 시스템 (폴더, 노트, `bookmark-dialog.tsx`)

#### Phase 3: 핸드 수정 요청 ✅
- 수정 제안 시스템 (4가지 유형: basic_info, board, players, actions)
- 3단계 수정 제안 다이얼로그 (EditRequestDialog)
- 핸드 상세 페이지 "수정 제안" 버튼 통합 완료
- 관리자 승인 페이지 (Before/After 비교)
- 내 수정 제안 페이지 (`/my-edit-requests`)

#### Phase 4: 관리자 시스템
- 역할 관리 (user/high_templar/admin), 밴 시스템, 활동 로그
- 관리자 페이지 5개 (dashboard, users, claims, edit-requests, content)
- Admin RLS 정책 (역할 변경, 사용자 관리 권한)

#### Phase 5: 콘텐츠 신고
- 포스트/댓글 신고, 5가지 신고 사유
- 관리자 승인/거부 워크플로우

#### Phase 6: 유저 프로필 고도화
- 소셜 링크, 프로필 가시성 (public/private/friends)
- 통계 캐싱 (자동 업데이트 트리거)

#### Phase 7: 커뮤니티 검색
- Full-Text Search (tsvector, GIN 인덱스, 제목/내용 가중치 검색)

#### Phase 8: Archive 폴더 네비게이션 (2025-10-16)
- Google Drive 스타일 폴더 네비게이션 (4단계 계층)
- ArchiveBreadcrumb 컴포넌트 (계층적 경로 표시)
- ArchiveFolderList 컴포넌트 (통합 폴더/파일 리스트)
- Unsorted Videos → Unorganized 폴더로 전환
- TournamentDialog 컴포넌트 분리 (코드 구조 개선)

#### 추가 기능 (2025-10-16)
- Archive 카테고리 필터 (WSOP, Triton, EPT, Hustler, APT, APL, GGPOKER)
- 브랜딩: GGVault → Templar Archives (로고 "TA", 파비콘 Protoss Carrier)
- 플레이어 클레임 시스템 (소셜 미디어/이메일 인증, 관리자 승인)
- Supabase CLI 설정 (local/remote 동기화)

### ⏳ 다음 작업

#### 다음 우선순위
1. **플레이어 통계 고도화** (우선순위: 높음, 3-5시간)
   - 더 많은 통계 지표 추가 (VPIP, PFR, 3-Bet %, C-Bet %)
   - 포지션별 성과 분석
   - 시간대별 성과 차트 (월별, 연도별)
   - 토너먼트 카테고리별 통계

2. **알림 시스템** (우선순위: 중, 5-6시간)
   - 댓글/답글 알림
   - 좋아요 알림
   - 핸드 수정 제안 응답 알림
   - 플레이어 클레임 승인/거부 알림
   - 헤더 알림 벨 아이콘

3. **추가 고급 기능** (우선순위: 낮)
   - 핸드 태그 시스템
   - 핸드 비교 기능 (Side-by-Side)
   - 에러 추적 시스템 (Sentry 연동)

---

## 기술 스택

### 프론트엔드
- **프레임워크**: Next.js 15.5.5 (App Router, Edge Runtime)
- **UI 라이브러리**: shadcn/ui (50+ 컴포넌트)
- **스타일링**: Tailwind CSS 4.1.9
- **React**: 19.0.0
- **상태 관리**: Zustand (`filter-store.ts`)
- **영상 처리**: FFmpeg.wasm (브라우저 내 프레임 추출)
- **차트**: Recharts

### 백엔드 (완전 서버리스)
- **플랫폼**: Supabase
  - PostgreSQL (데이터베이스)
  - Storage (영상 파일)
  - Realtime (실시간 진행률)
  - Auth (Google OAuth)
- **API**: REST (Next.js API Routes)

### AI/ML
- **영상 분석**: Claude Vision API (Anthropic)
  - 핸드 경계 감지
  - 핸드 시퀀스 분석
- **자연어 검색**: Claude 3.5 Sonnet

---

## 디렉토리 구조

**자세한 내용**: `DIRECTORY_STRUCTURE.md` 참조

```
templar-archives/
├── app/                      # Next.js 페이지 및 API
├── components/               # React 컴포넌트 (50+ 개)
├── lib/                      # 유틸리티 라이브러리
├── hooks/                    # Custom React Hooks
├── docs/                     # 프로젝트 문서
├── scripts/                  # 유틸리티 스크립트
├── public/                   # 정적 파일
└── supabase/migrations/      # 데이터베이스 마이그레이션 (25개)
```

---

## 참고 문서

### 프로젝트 문서
- **개발 로드맵**: `ROADMAP.md` (Phase 0-4 계획)
- **페이지 구조**: `PAGES_STRUCTURE.md` (모든 페이지 설명)
- **디렉토리 구조**: `DIRECTORY_STRUCTURE.md` (파일 구조 상세)
- **작업 로그**: `WORK_LOG.md` (일별 작업 기록)

### 설정 가이드
- **환경 설정**: `../SETUP.md` (Supabase, Claude API 설정)

### API 문서
- **핸드 Import API**: `docs/HAND_IMPORT_API.md`
- **영상 소스 가이드**: `docs/VIDEO_SOURCES.md`

---

## 다음 세션 시작 시

1. `WORK_LOG.md` 확인 (최근 작업 내용)
2. http://localhost:3000 에서 개발 서버 실행
3. Supabase Studio에서 `011_add_player_claims.sql` 마이그레이션 실행 (아직 미실행)
4. 플레이어 클레임 기능 테스트

---

**마지막 업데이트**: 2025-10-17
**문서 버전**: 3.6
**프로젝트 상태**: Phase 0-8 완료, 모든 핵심 기능 완성 🎉

**최근 완료 (2025-10-17)**:
- Archive 성능 최적화 (커스텀 훅 3개, 동적 임포트 13개, DB 인덱스 20+개)
- Archive UI 현대화 (글래스모피즘, 필터 섹션 개선)

**이전 완료 (2025-10-16)**:
- Google Drive 스타일 폴더 네비게이션 (Phase 8)
- Reddit 스타일 댓글/답글 시스템
- DB 최적화 (미사용 테이블/컬럼 정리)
- YouTube 라이브 우선순위 시스템
- 브랜딩 변경 (GGVault → Templar Archives)
- Phase 3-7 완료 (핸드 수정, 관리자, 신고, 프로필, 검색)

**다음 작업**:
- ⏳ 플레이어 통계 고도화 (VPIP, PFR, 포지션별 분석)
- ⏳ 알림 시스템 구현
- ⏳ 핸드 태그 및 비교 기능
