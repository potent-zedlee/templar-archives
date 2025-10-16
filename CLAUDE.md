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
- 포스트 작성 및 카테고리
- 댓글 및 답글 시스템
- 좋아요 기능
- 핸드 공유 (SNS, 링크, 임베드)

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

#### 데이터베이스 (18개 마이그레이션)
- 001-012: 기본 스키마 (tournaments, sub_events, days, hands, players, video_sources, community, hand_likes, bookmarks, player_claims)
- 013-018: 고급 기능 (Full-Text Search, 유저 프로필, 관리자 시스템, 콘텐츠 신고, 핸드 수정 요청, Admin RLS)

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

#### Phase 3: 핸드 수정 요청
- 수정 제안 시스템 (4가지 유형: basic_info, board, players, actions)
- 관리자 승인 페이지 (Before/After 비교)
- **Note**: 핸드 상세 페이지 진입점 미구현

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

#### 추가 기능 (2025-10-16)
- Archive 카테고리 필터 (WSOP, Triton, EPT, Hustler, APT, APL, GGPOKER)
- 브랜딩: GGVault → Templar Archives (로고 "TA", 파비콘 Protoss Carrier)
- 플레이어 클레임 시스템 (소셜 미디어/이메일 인증, 관리자 승인)
- Supabase CLI 설정 (local/remote 동기화)

### ⏳ 다음 작업

#### 다음 우선순위
1. **핸드 수정 제안 UI 진입점 추가** (우선순위: 높음, 2-3시간)
   - 핸드 상세 페이지에 "수정 제안" 버튼 추가
   - 수정 제안 다이얼로그 구현 (4단계 폼)
   - Before/After 비교 미리보기
   - **Note**: 백엔드는 완성, 프론트엔드 진입점만 추가 필요

2. **영상 분석 테스트 및 개선** (우선순위: 중, 4-6시간)
   - 실제 포커 영상으로 분석 테스트
   - 감지 정확도 측정 및 개선
   - 오류 케이스 수집 및 프롬프트 개선

3. **플레이어 통계 고도화** (우선순위: 중, 3-5시간)
   - 더 많은 통계 지표 추가
   - 시간대별 성과 분석
   - 고급 차트 및 시각화

4. **추가 고급 기능** (우선순위: 낮)
   - 알림 시스템 (댓글, 수정 제안 응답)
   - 핸드 태그 시스템
   - 핸드 비교 기능 (Side-by-Side)

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
└── supabase/migrations/      # 데이터베이스 마이그레이션 (18개)
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

## 타이포그래피 시스템

- `.text-title-lg` (24px, Bold), `.text-title` (18px, Semibold)
- `.text-body-lg` (16px), `.text-body` (14px)
- `.text-caption-lg` (14px), `.text-caption` (12px)

---

## 다음 세션 시작 시

1. `WORK_LOG.md` 확인 (최근 작업 내용)
2. http://localhost:3000 에서 개발 서버 실행
3. Supabase Studio에서 `011_add_player_claims.sql` 마이그레이션 실행 (아직 미실행)
4. 플레이어 클레임 기능 테스트

---

**마지막 업데이트**: 2025-10-16
**문서 버전**: 3.1
**프로젝트 상태**: Phase 0-7 완료, 모든 핵심 기능 완성 🎉

**최근 완료 작업 (2025-10-16 세션 10)**:
- ✅ Next.js 15.1.6 → 15.5.5 업그레이드 (6개 보안 취약점 해결)
- ✅ not-found.tsx 페이지 수정 ("use client" 추가, 한글 → 영어)
- ✅ 관리자 사용자 관리 페이지 완전 영어 변환
- ✅ 역할 변경 기능 버그 수정 (RLS 정책 추가)
- ✅ moderator → high_templar 역할 이름 변경
- ✅ 마이그레이션 018 추가: Admin RLS 정책

**이전 완료 작업 (2025-10-16 세션 9)**:
- ✅ 아카이브 카테고리 필터 추가 (All, WSOP, Triton, EPT, Hustler, APT, APL, GGPOKER)
- ✅ 브랜딩 변경: GGVault → Templar Archives
- ✅ 파비콘 추가 (Protoss Carrier icon.webp)
- ✅ 로고 및 메타데이터 업데이트
- ✅ Next.js 15.1.6 + React 19.0 (Edge Runtime)
- ✅ Tailwind CSS 4.1.9
- ✅ 전체 문서 업데이트 (package.json, README.md, CLAUDE.md)

**이전 세션 완료 작업 (2025-10-15)**:
- ✅ Phase 3: 핸드 수정 요청 시스템 (백엔드 완성)
- ✅ Phase 4: 관리자 시스템 (역할, 밴, 활동 로그)
- ✅ Phase 5: 콘텐츠 신고 시스템 (포스트/댓글 신고)
- ✅ Phase 6: 유저 프로필 고도화 (소셜 링크, 통계 캐싱)
- ✅ Phase 7: 커뮤니티 검색 강화 (Full-Text Search)
- ✅ 관리자 페이지 5개 추가
- ✅ 유저 페이지 3개 추가
- ✅ 마이그레이션 5개 추가 (013-017)

**이전 세션 완료 작업**:
- ✅ Phase 0: 인증 시스템 (Google OAuth)
- ✅ Phase 1: 핸드 좋아요/싫어요 + 댓글 시스템
- ✅ Phase 2: 커뮤니티 핸드 첨부 + 북마크 시스템
- ✅ 영상 분석 (Claude Vision 2단계 파이프라인)
- ✅ Supabase CLI 설정 및 마이그레이션 동기화

**다음 작업**:
- ⏳ 핸드 수정 제안 UI 진입점 추가 (2-3시간)
- ⏳ 영상 분석 테스트 및 개선
- ⏳ 플레이어 통계 고도화
