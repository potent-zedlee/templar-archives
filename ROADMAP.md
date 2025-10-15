# Templar Archives 개발 로드맵

> 단계별 기능 구현 계획 및 우선순위

**마지막 업데이트**: 2025-10-16
**현재 Phase**: Phase 0-7 완료 🎉

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

### Phase 3: 핸드 수정 요청 시스템 (2025-10-15)
**소요 시간**: 백엔드 완성

#### Phase 3.1: 백엔드 ✅
- `hand_edit_requests` 테이블 (4가지 수정 유형)
- `lib/hand-edit-requests.ts` (8개 함수)
- 상태 관리 (pending, approved, rejected)

#### Phase 3.2: 프론트엔드 (부분 완성)
- [x] 내 제안 목록 페이지 (`/my-edit-requests`)
- [x] 관리자 승인 페이지 (`/admin/edit-requests`)
- [ ] 핸드 상세 "수정 제안" 버튼 (미완)

**Note**: 백엔드 완성, 진입점 UI 미완

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

## 🚀 Phase 8: 추가 기능 (선택)

**상태**: ⏳ 대기 중
**우선순위**: ⭐⭐⭐
**예상 시간**: 20-30시간

### Phase 8.1: 알림 시스템 (5-6시간)
- [ ] `notifications` 테이블 생성
- [ ] 댓글/답글 알림
- [ ] 수정 제안 승인/거부 알림
- [ ] 알림 벨 아이콘 (헤더)

### Phase 8.2: 핸드 통계 대시보드 (6-8시간)
- [ ] 핸드별 통계 (조회수, 좋아요)
- [ ] 플레이어별 통계 (승률, 평균 POT)
- [ ] 차트 라이브러리 통합 (Recharts)

### Phase 8.3: 핸드 태그 시스템 (3-4시간)
- [ ] `hand_tags` 테이블 생성
- [ ] 핸드 태그 추가/제거 UI
- [ ] 태그별 필터링

### Phase 8.4: 핸드 공유 강화 (3-4시간)
- [ ] 핸드 임베드 코드 (iframe)
- [ ] SNS 공유 (Twitter, Facebook, Reddit)
- [ ] 핸드 이미지 생성 (og:image)

### Phase 8.5: 핸드 비교 기능 (4-5시간)
- [ ] 2개 핸드 Side-by-Side 비교
- [ ] 액션 차이 하이라이트
- [ ] POT/승률 비교 차트

---

## 📊 우선순위 요약

| Phase | 기능 | 우선순위 | 상태 | 완료일 |
|-------|------|----------|------|--------|
| Phase 0 | 인증 시스템 | ⭐⭐⭐⭐⭐ | ✅ | 2025-10-12 |
| Phase 1 | 핸드 상호작용 | ⭐⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 2 | 커뮤니티 강화 | ⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 3 | 핸드 수정 요청 | ⭐⭐⭐⭐ | ✅ (백엔드) | 2025-10-15 |
| Phase 4 | 관리자 시스템 | ⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 5 | 콘텐츠 신고 | ⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 6 | 유저 프로필 | ⭐⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 7 | 커뮤니티 검색 | ⭐⭐⭐ | ✅ | 2025-10-15 |
| Phase 8 | 추가 기능 | ⭐⭐⭐ | ⏳ | - |

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

### Week 5+: 추가 기능 (선택) ⏳
- Phase 8 기능들 순차적 구현

---

## 📝 변경 이력

| 날짜 | 변경 내용 |
|------|-----------|
| 2025-10-12 | 로드맵 최초 작성, Phase 0 완료 |
| 2025-10-15 | Phase 1-7 완료, 문서 업데이트 |
| 2025-10-16 | 로드맵 최적화 (상세 내용 축약) |

---

**다음 작업**:
- 핸드 수정 제안 UI 진입점 추가 (2-3시간)
- 영상 분석 테스트 및 개선
- Phase 8 추가 기능 선택적 구현

**상세 정보**: `CLAUDE.md` 참조
