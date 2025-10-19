# Templar Archives 개발 로드맵

> 단계별 기능 구현 계획 및 우선순위

**마지막 업데이트**: 2025-10-19
**현재 Phase**: Phase 0-15 완료 🎉

---

## 🎯 전체 개요

Templar Archives는 포커 핸드 아카이브와 커뮤니티 플랫폼입니다. 이 로드맵은 핵심 기능부터 고급 기능까지 단계별로 구현 계획을 제시합니다.

---

## ✅ 완료된 Phase

### Phase 0: 인증 시스템 (2025-10-12)
**소요 시간**: 4시간
- Google OAuth 로그인, 로그아웃
- 전역 인증 상태 관리 (`useAuth` 훅)
- 로그인/비로그인 UI 분기, 보호된 액션

**핵심 파일**:
- `lib/auth.ts`, `components/auth-provider.tsx`
- `app/auth/login/page.tsx`, `app/auth/callback/page.tsx`

---

### Phase 1: 핸드 상호작용 (2025-10-15 확인)
**소요 시간**: 이미 구현됨

#### Phase 1.1: 핸드 좋아요/싫어요
- `hand_likes` 테이블, 자동 카운트 업데이트 트리거
- `lib/hand-likes.ts` (4개 함수)
- UI: `hand-history-detail.tsx`, `hand-list-accordion.tsx`
- Optimistic Update, 로그인 체크

#### Phase 1.2: 핸드 댓글 시스템
- `HandComments` 컴포넌트 (재귀적 대댓글)
- 댓글 작성 폼, 댓글 좋아요
- 실시간 댓글 개수 업데이트

**핵심 파일**:
- `components/hand-comments.tsx`
- `lib/supabase-community.ts`

---

### Phase 2: 커뮤니티 강화 (2025-10-15)
**소요 시간**: 5-6시간

#### Phase 2.1: 포럼 핸드 첨부 (3시간)
- 핸드 검색 모달 (Tournament → SubEvent → Day → Hand, 4단계)
- 선택된 핸드 미리보기 카드
- Archive 페이지로 이동 링크

#### Phase 2.2: 북마크 시스템 (2-3시간)
- `hand_bookmarks` 테이블, RLS 정책
- `lib/hand-bookmarks.ts` (9개 함수)
- 북마크 페이지 (`/bookmarks`), 폴더 기능

**핵심 파일**:
- `components/hand-search-dialog.tsx`, `components/bookmark-dialog.tsx`
- `app/bookmarks/page.tsx`

---

### Phase 3: 핸드 수정 요청 시스템 (2025-10-15) ✅
**소요 시간**: 완성

#### 완료 기능
- `hand_edit_requests` 테이블 (4가지 수정 유형: basic_info, board, players, actions)
- `lib/hand-edit-requests.ts` (8개 함수)
- 상태 관리 (pending, approved, rejected)
- 3단계 수정 제안 다이얼로그 (`EditRequestDialog`)
- 핸드 상세 페이지 "수정 제안" 버튼 통합
- 내 제안 목록 페이지 (`/my-edit-requests`)
- 관리자 승인 페이지 (`/admin/edit-requests`, Before/After 비교)

**핵심 파일**:
- `components/edit-request-dialog.tsx`
- `lib/hand-edit-requests.ts`
- `supabase/migrations/017_add_hand_edit_requests.sql`

---

### Phase 4: 관리자 시스템 (2025-10-15)
**소요 시간**: 완성

- 역할 관리 (user/moderator/admin), 밴 시스템
- `lib/admin.ts` (15개 함수)
- 관리자 페이지 5개 (dashboard, users, claims, edit-requests, content)

**핵심 파일**:
- `app/admin/dashboard/page.tsx`, `app/admin/users/page.tsx`
- `supabase/migrations/015_add_admin_system.sql`

---

### Phase 5: 콘텐츠 신고 시스템 (2025-10-15)
**소요 시간**: 완성

- `reports` 테이블 (5가지 신고 사유)
- `lib/content-moderation.ts` (10개 함수)
- 관리자 페이지 (`/admin/content`)

**핵심 파일**:
- `supabase/migrations/016_add_content_moderation.sql`

---

### Phase 6: 유저 프로필 고도화 (2025-10-15)
**소요 시간**: 완성

- 소셜 링크, 프로필 가시성 (public/private/friends)
- 통계 캐싱 (자동 업데이트 트리거 3개)
- `lib/user-profile.ts` (12개 함수)
- 프로필 페이지 2개 (`/profile`, `/profile/[id]`)

**핵심 파일**:
- `supabase/migrations/014_add_user_profile_fields.sql`
- `app/profile/page.tsx`

---

### Phase 7: 커뮤니티 검색 강화 (2025-10-15)
**소요 시간**: 완성

- Full-Text Search (tsvector, GIN 인덱스)
- 제목/내용 가중치 검색 (제목 우선)
- 자동 search_vector 업데이트 트리거

**핵심 파일**:
- `supabase/migrations/013_add_community_search.sql`

---

### Phase 8: Archive Folder Navigation (2025-10-16) ✅
- Google Drive 스타일 폴더 네비게이션
- ArchiveBreadcrumb, ArchiveFolderList 컴포넌트

---

### Phase 9: 코드 품질 및 아키텍처 개선 (2025-10-18) ✅
- Archive 페이지 리팩토링 (1,733줄 → 88줄, -95%)
- Zustand stores 도입 (780줄)
- 타입 시스템 구축 (114개 `any` 제거)

---

### Phase 10: 성능 최적화 (2025-10-18) ✅
- React 메모이제이션 (useCallback, React.memo)
- 번들 분석 도구 설정

---

### Phase 11: UX/UI 개선 (2025-10-18) ✅
- Error Boundary 시스템
- Toast 통합 유틸리티
- Loading 컴포넌트

---

### Phase 12: 테스팅 전략 수립 (2025-10-18) ✅
- E2E 테스트 (Playwright, 13개)
- 유닛 테스트 (Vitest, 40+개)
- CI/CD 파이프라인 (GitHub Actions)

---

### Phase 13: 보안 강화 (2025-10-18) ✅
- SQL/XSS 방지 유틸리티 (900+ 줄)
- Zod 입력 검증 시스템

---

### Phase 14: Archive UI Redesign (2025-10-19) ✅
- 수평 로고 바 (Netflix 스타일)
- 필터 버튼 중복 제거

---

### Phase 15: 로고 관리 시스템 (2025-10-19) ✅
- 실제 로고 12개 다운로드
- 자동 확장자 감지 시스템

---

## 📊 우선순위 요약

| Phase | 기능 | 우선순위 | 상태 | 완료일 |
|-------|------|----------|------|--------|
| Phase 0 | 인증 시스템 | ⭐⭐⭐⭐⭐ | ✅ | 2025-10-12 |
| Phase 1 | 핸드 상호작용 | ⭐⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 2 | 커뮤니티 강화 | ⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 3 | 핸드 수정 요청 | ⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 4 | 관리자 시스템 | ⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 5 | 콘텐츠 신고 | ⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 6 | 유저 프로필 | ⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 7 | 커뮤니티 검색 | ⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 8 | Folder Navigation | ⭐⭐⭐ | ✅ | 2025-10-16 |
| Phase 9 | 코드 품질 | ⭐⭐⭐⭐ | ✅ | 2025-10-18 |
| Phase 10 | 성능 최적화 | ⭐⭐⭐ | ✅ | 2025-10-18 |
| Phase 11 | UX/UI 개선 | ⭐⭐⭐ | ✅ | 2025-10-18 |
| Phase 12 | 테스팅 | ⭐⭐⭐⭐ | ✅ | 2025-10-18 |
| Phase 13 | 보안 강화 | ⭐⭐⭐⭐ | ✅ | 2025-10-18 |
| Phase 14 | Archive Redesign | ⭐⭐⭐ | ✅ | 2025-10-19 |
| Phase 15 | 로고 관리 | ⭐⭐ | ✅ | 2025-10-19 |

---

## 🎯 권장 구현 스케줄

### Week 1: 인증 & 핸드 상호작용 ✅
- Day 1-2: Phase 0 (인증)
- Day 3-5: Phase 1 (좋아요, 댓글)

### Week 2: 커뮤니티 강화 ✅
- Day 1-3: Phase 2 (핸드 첨부, 북마크)
- Day 4-5: 테스트 및 버그 수정

### Week 3-4: 고급 기능 ✅
- Day 1-10: Phase 3-7 완료

### Week 5+: 고급 기능 (완료) ✅
- Phase 8-15 완료 (폴더 네비게이션, 코드 품질, 성능, 테스팅, 보안, UI 개선)

---

## 📝 변경 이력

| 날짜 | 변경 내용 |
|------|-----------|
| 2025-10-12 | 로드맵 최초 작성, Phase 0 완료 |
| 2025-10-15 | Phase 1-7 완료, 문서 업데이트 |
| 2025-10-16 (세션 11) | 로드맵 최적화, Phase 8 완료 |
| 2025-10-16 (세션 12) | Phase 3 완료, 문서 정리 |
| 2025-10-18 | Phase 9-13 완료 (코드 품질, 성능, 테스팅, 보안) |
| 2025-10-19 | Phase 14-15 완료 (UI Redesign, 로고 관리) |

---

**다음 작업** (선택적):
- 알림 시스템 (댓글, 수정 제안 응답)
- 플레이어 통계 고도화 (VPIP, PFR, 포지션별 분석)
- 핸드 태그 시스템

**현재 상태**: 모든 핵심 기능 완성 🎉
**상세 정보**: `../CLAUDE.md` 참조
