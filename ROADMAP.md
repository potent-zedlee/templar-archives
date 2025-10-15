# GGVault 개발 로드맵

> 단계별 기능 구현 계획 및 우선순위

**마지막 업데이트**: 2025-10-15
**현재 Phase**: 모든 핵심 Phase 완료 (Phase 0-7) 🎉

---

## 🎯 전체 개요

GGVault는 포커 핸드 아카이브와 커뮤니티 플랫폼입니다. 이 로드맵은 핵심 기능부터 고급 기능까지 단계별로 구현 계획을 제시합니다.

---

## 📋 Phase 0: 인증 시스템 (최우선) 🔐

**상태**: ✅ 완료
**우선순위**: ⭐⭐⭐⭐⭐
**실제 소요 시간**: 4시간

### 목표
모든 소셜 기능의 기반이 되는 사용자 인증 시스템 구축

### 주요 기능
- [x] Google OAuth 로그인
- [x] 로그아웃
- [x] 전역 인증 상태 관리
- [x] 로그인/비로그인 UI 분기
- [x] 보호된 액션 (댓글, 좋아요 등)

### 구현 내용
1. **Supabase Auth 설정** ✅
   - Google OAuth Provider 활성화 필요 (수동)
   - 리디렉션 URL 설정 필요 (수동)

2. **인증 라이브러리** ✅
   - `lib/auth.ts` 생성
   - `signInWithGoogle()`, `signOut()`, `getUser()` 함수

3. **인증 Provider** ✅
   - `components/auth-provider.tsx` 생성
   - `useAuth()` 훅 제공
   - 전역 인증 상태 관리

4. **로그인 UI** ✅
   - `app/auth/login/page.tsx` - 로그인 페이지
   - `app/auth/callback/page.tsx` - OAuth 콜백
   - 헤더에 로그인/프로필 메뉴

5. **기존 코드 마이그레이션** ✅
   - `lib/supabase-community.ts` 수정
   - 임시 `author_id` 제거
   - 실제 사용자 ID 사용

### 완료 기준
- ✅ Google 계정으로 로그인 가능
- ✅ 로그아웃 가능
- ✅ 헤더에 프로필 사진 표시
- ✅ 로그인 상태에 따라 버튼 활성화/비활성화
- ✅ 포스트/댓글 작성 시 실제 사용자 ID 사용

### 완료일
2025-10-12

---

## 🎮 Phase 1: 핸드 상호작용 기본 기능

**상태**: ✅ 완료
**우선순위**: ⭐⭐⭐⭐⭐
**실제 소요 시간**: 0시간 (이미 구현됨)
**완료일**: 2025-10-15 (확인)

### Phase 1.1: 핸드 좋아요/싫어요 시스템 ✅
**상태**: 이미 구현되어 있었음

#### 백엔드
- [x] `hand_likes` 테이블 생성 (`006_add_hand_likes.sql`)
  - `hand_id`, `user_id`, `vote_type` ('like' | 'dislike')
  - 중복 방지 UNIQUE 제약
- [x] `hands` 테이블에 `likes_count`, `dislikes_count` 컬럼 추가
- [x] 자동 카운트 업데이트 트리거 생성
- [x] 좋아요/싫어요 API 함수 구현 (`lib/hand-likes.ts`)

#### 프론트엔드
- [x] `hand-history-detail.tsx`에 좋아요/싫어요 버튼 추가
- [x] `hand-list-accordion.tsx`에 카운트 표시
- [x] Optimistic Update (즉시 UI 반영)
- [x] 로그인 체크 (비로그인 시 로그인 페이지 이동)

#### 핵심 파일
- `supabase/migrations/20241001000006_add_hand_likes.sql`
- `lib/hand-likes.ts` (4개 함수)
- `components/hand-history-detail.tsx` (line 239-259)
- `components/hand-list-accordion.tsx` (line 137-148)

### Phase 1.2: 핸드 댓글 시스템 ✅
**상태**: 이미 구현되어 있었음

#### 프론트엔드
- [x] 핸드 상세 하단에 댓글 섹션 추가 (`HandComments` 컴포넌트)
- [x] 댓글 목록 표시 (재귀적 답글)
- [x] 댓글 작성 폼 (로그인 사용자만)
- [x] 답글 기능 (대댓글)
- [x] 댓글 좋아요 버튼
- [x] 실시간 댓글 개수 업데이트

#### 백엔드 (이미 구현됨)
- ✅ `comments` 테이블 `hand_id` 필드
- ✅ `fetchComments({ handId })` 함수
- ✅ `createComment({ hand_id })` 함수
- ✅ `toggleCommentLike()` 함수

#### 핵심 파일
- `components/hand-comments.tsx` (완전한 댓글 시스템)
- `lib/supabase-community.ts` (댓글 API 함수)
- `components/hand-history-detail.tsx` (line 469-489, 통합됨)

---

## 🌐 Phase 2: 커뮤니티 강화

**상태**: ✅ 완료
**우선순위**: ⭐⭐⭐⭐
**실제 소요 시간**: 5-6시간
**완료일**: 2025-10-15

### Phase 2.1: 포럼 핸드 첨부 기능 ✅
**실제 소요 시간**: 3시간

#### 프론트엔드
- [x] 포스트 작성 다이얼로그에 "핸드 첨부" 버튼
- [x] 핸드 검색 모달 (Tournament → SubEvent → Day → Hand, 4단계)
- [x] 선택된 핸드 미리보기 카드
- [x] 포스트 목록에서 첨부 핸드 표시 (임베드)
- [x] 핸드 클릭 시 Archive 페이지로 이동

#### 백엔드 (이미 구현됨)
- ✅ `posts` 테이블 `hand_id` 필드

#### 핵심 파일
- `components/hand-search-dialog.tsx` - 4단계 선택 다이얼로그
- `app/community/page.tsx` - 핸드 첨부 UI

### Phase 2.2: 북마크 시스템 ✅
**실제 소요 시간**: 2-3시간

#### 백엔드
- [x] `hand_bookmarks` 테이블 생성 (`012_add_hand_bookmarks.sql`)
  - `hand_id`, `user_id`, `folder_name`, `notes`
  - 중복 방지 UNIQUE 제약
  - RLS 정책 및 트리거

#### 프론트엔드
- [x] 핸드 상세에 북마크 버튼 추가
- [x] 북마크 페이지 (`/bookmarks`)
- [x] 북마크 폴더 기능 (탭 필터링)
- [x] 북마크 삭제 기능

#### 핵심 파일
- `supabase/migrations/012_add_hand_bookmarks.sql`
- `lib/hand-bookmarks.ts` - API 함수 (9개)
- `app/bookmarks/page.tsx` - 북마크 페이지

---

## ✏️ Phase 3: 핸드 수정 요청 시스템

**상태**: ✅ 완료
**우선순위**: ⭐⭐⭐⭐
**실제 소요 시간**: 백엔드 완성 (프론트엔드 진입점 미완)
**완료일**: 2025-10-15

### Phase 3.1: 백엔드 - 수정 요청 시스템 ✅
**실제 소요 시간**: 완성

#### 데이터베이스
- [x] `hand_edit_requests` 테이블 생성 (`017_add_hand_edit_requests.sql`)
- [x] 4가지 수정 유형 (basic_info, board, players, actions)
- [x] 상태 관리 (pending, approved, rejected)
- [x] RLS 정책 (사용자/관리자 권한)

#### API 함수 (`lib/hand-edit-requests.ts`)
- [x] `createEditRequest()` - 수정 요청 생성
- [x] `fetchEditRequests()` - 수정 요청 목록 조회 (관리자)
- [x] `fetchUserEditRequests()` - 사용자별 요청 조회
- [x] `approveEditRequest()` - 수정 승인 및 핸드 데이터 적용
- [x] `rejectEditRequest()` - 수정 거부
- [x] `applyEditToHand()` - 핸드 데이터에 수정사항 적용
- [x] `getHandDataForEdit()` - 핸드 데이터 가져오기

### Phase 3.2: 프론트엔드 - 수정 요청 UI ✅ (부분 완성)

#### 사용자용
- [ ] 핸드 상세에 "수정 제안" 버튼 (미완)
- [ ] 수정 제안 다이얼로그 (미완)
- [x] 내 제안 목록 페이지 (`/my-edit-requests`)
- [x] 상태별 필터링 (전체/대기 중/승인됨/거부됨)
- [x] 관리자 코멘트 표시

#### 관리자용
- [x] 관리자 대시보드 (`/admin/edit-requests`)
- [x] 수정 요청 목록 (상태별 필터)
- [x] 요청 상세 및 승인/거부 UI
- [x] Before/After 비교 UI

**Note**: 백엔드는 완전히 완성되었으나, 핸드 상세 페이지의 "수정 제안" 버튼과 다이얼로그는 아직 미구현

---

## 👮 Phase 4: 관리자 시스템

**상태**: ✅ 완료
**우선순위**: ⭐⭐⭐⭐
**실제 소요 시간**: 완성
**완료일**: 2025-10-15

### Phase 4.1: 권한 및 역할 관리 ✅

#### 데이터베이스 (`015_add_admin_system.sql`)
- [x] `users.role` 컬럼 (user/moderator/admin)
- [x] 밴 시스템 (is_banned, ban_reason, banned_at, banned_by)
- [x] `admin_logs` 테이블 (관리자 활동 로그)
- [x] RLS 정책 (관리자만 로그 조회)
- [x] 헬퍼 함수 (is_admin, log_admin_action)

#### API 함수 (`lib/admin.ts` - 15개 함수)
- [x] `isAdmin()` - 관리자 권한 체크
- [x] `getDashboardStats()` - 대시보드 통계
- [x] `getRecentActivity()` - 최근 관리자 활동
- [x] `getUsers()` - 사용자 목록 (페이지네이션, 검색)
- [x] `banUser()`, `unbanUser()` - 사용자 밴/언밴
- [x] `changeUserRole()` - 역할 변경
- [x] `deletePost()`, `deleteComment()` - 콘텐츠 삭제
- [x] `logAdminAction()` - 관리자 활동 로그
- [x] `getRecentPosts()`, `getRecentComments()` - 최근 콘텐츠 조회

### Phase 4.2: 관리자 페이지 ✅

#### 프론트엔드
- [x] `app/admin/dashboard/page.tsx` - 대시보드 (통계 요약)
- [x] `app/admin/users/page.tsx` - 사용자 관리 (검색, 밴, 역할 변경)
- [x] `app/admin/claims/page.tsx` - 플레이어 클레임 승인
- [x] `app/admin/edit-requests/page.tsx` - 핸드 수정 요청 관리
- [x] `app/admin/content/page.tsx` - 콘텐츠 신고 관리

---

## 🚨 Phase 5: 콘텐츠 신고 시스템

**상태**: ✅ 완료
**우선순위**: ⭐⭐⭐⭐
**실제 소요 시간**: 완성
**완료일**: 2025-10-15

### Phase 5.1: 신고 시스템 ✅

#### 데이터베이스 (`016_add_content_moderation.sql`)
- [x] `reports` 테이블 (포스트/댓글 신고)
- [x] 신고 사유 (spam, harassment, inappropriate, misinformation, other)
- [x] 상태 관리 (pending, approved, rejected)
- [x] `posts.is_hidden`, `comments.is_hidden` 컬럼
- [x] RLS 정책 (사용자/관리자 권한)

#### API 함수 (`lib/content-moderation.ts` - 10개 함수)
- [x] `createReport()` - 신고 생성
- [x] `fetchReports()` - 신고 목록 조회 (관리자)
- [x] `approveReport()` - 신고 승인 (콘텐츠 숨김)
- [x] `rejectReport()` - 신고 거부
- [x] `hideContent()`, `unhideContent()` - 콘텐츠 숨김/표시
- [x] `deleteContent()` - 콘텐츠 삭제
- [x] `fetchAllPosts()`, `fetchAllComments()` - 전체 콘텐츠 조회

### Phase 5.2: 신고 UI ✅
- [x] 관리자 페이지 (`/admin/content`) - 신고 관리
- [x] 신고 목록 (상태별 필터)
- [x] 신고 승인/거부 UI
- [x] 콘텐츠 숨김/삭제 기능

---

## 👤 Phase 6: 유저 프로필 고도화

**상태**: ✅ 완료
**우선순위**: ⭐⭐⭐⭐
**실제 소요 시간**: 완성
**완료일**: 2025-10-15

### Phase 6.1: 프로필 확장 ✅

#### 데이터베이스 (`014_add_user_profile_fields.sql`)
- [x] 소셜 링크 (location, website, twitter_handle, instagram_handle)
- [x] 프로필 가시성 (public/private/friends)
- [x] 통계 캐싱 (posts_count, comments_count, likes_received)
- [x] 자동 통계 업데이트 트리거 (3개)

#### API 함수 (`lib/user-profile.ts` - 12개 함수)
- [x] `getProfile()`, `getCurrentUserProfile()` - 프로필 조회
- [x] `updateProfile()` - 프로필 수정
- [x] `checkNicknameAvailable()` - 닉네임 중복 체크
- [x] `getUserByNickname()` - 닉네임으로 조회
- [x] `hasCompletedProfile()` - 프로필 완성 여부 체크
- [x] `fetchUserPosts()`, `fetchUserComments()`, `fetchUserBookmarks()` - 활동 조회
- [x] `fetchUserActivity()` - 전체 활동 요약
- [x] `uploadAvatar()` - 아바타 업로드

### Phase 6.2: 프로필 페이지 ✅
- [x] `app/profile/page.tsx` - 내 프로필 페이지
- [x] `app/profile/[id]/page.tsx` - 다른 유저 프로필 페이지
- [x] 활동 요약 (포스트, 댓글, 북마크)
- [x] 소셜 링크 표시
- [x] 통계 표시 (posts_count, comments_count, likes_received)

---

## 🔍 Phase 7: 커뮤니티 검색 강화

**상태**: ✅ 완료
**우선순위**: ⭐⭐⭐
**실제 소요 시간**: 완성
**완료일**: 2025-10-15

### Phase 7.1: Full-Text Search ✅

#### 데이터베이스 (`013_add_community_search.sql`)
- [x] `posts.search_vector` 컬럼 (tsvector)
- [x] GIN 인덱스 (성능 최적화)
- [x] 자동 search_vector 업데이트 트리거
- [x] 제목/내용 가중치 검색 (제목 우선)
- [x] 작성자/날짜/카테고리 인덱스

---

## 🚀 Phase 8: 추가 기능 (선택)

**상태**: ⏳ 대기 중
**우선순위**: ⭐⭐⭐
**예상 시간**: 20-30시간

### Phase 8.1: 알림 시스템
**예상 시간**: 5-6시간

- [ ] `notifications` 테이블 생성
- [ ] 댓글/답글 알림
- [ ] 수정 제안 승인/거부 알림
- [ ] 알림 벨 아이콘 (헤더)
- [ ] 알림 목록 페이지

### Phase 8.2: 핸드 통계 대시보드
**예상 시간**: 6-8시간

- [ ] 핸드별 통계 (조회수, 좋아요)
- [ ] 플레이어별 통계 (승률, 평균 POT)
- [ ] 차트 라이브러리 통합 (Recharts)
- [ ] 통계 페이지 (`/stats`)

### Phase 8.3: 핸드 태그 시스템
**예상 시간**: 3-4시간

- [ ] `hand_tags` 테이블 생성
- [ ] 핸드 태그 추가/제거 UI
- [ ] 태그별 필터링
- [ ] 인기 태그 클라우드

### Phase 8.4: 핸드 공유 기능 강화
**예상 시간**: 3-4시간

- [ ] 핸드 임베드 코드 생성 (iframe)
- [ ] SNS 공유 (Twitter, Facebook, Reddit)
- [ ] 핸드 이미지 생성 (og:image)
- [ ] 핸드 단축 URL

### Phase 8.5: 핸드 비교 기능
**예상 시간**: 4-5시간

- [ ] 2개 핸드 Side-by-Side 비교
- [ ] 액션 차이 하이라이트
- [ ] POT/승률 비교 차트

### Phase 8.6: 핸드 검색 개선
**예상 시간**: 3-4시간

- [ ] 전체 텍스트 검색 (PostgreSQL FTS)
- [ ] 액션별 검색
- [ ] 검색 결과 하이라이트

---

## 📊 우선순위 요약

| Phase | 기능 | 우선순위 | 예상/실제 시간 | 상태 |
|-------|------|----------|----------------|------|
| **Phase 0** | 인증 시스템 | ⭐⭐⭐⭐⭐ | 4시간 | ✅ 2025-10-12 |
| **Phase 1.1** | 핸드 좋아요/싫어요 | ⭐⭐⭐⭐⭐ | 이미 구현됨 | ✅ 2025-10-15 확인 |
| **Phase 1.2** | 핸드 댓글 시스템 | ⭐⭐⭐⭐⭐ | 이미 구현됨 | ✅ 2025-10-15 확인 |
| **Phase 2.1** | 포럼 핸드 첨부 | ⭐⭐⭐⭐ | 3시간 | ✅ 2025-10-15 |
| **Phase 2.2** | 북마크 시스템 | ⭐⭐⭐⭐ | 2-3시간 | ✅ 2025-10-15 |
| **Phase 3** | 핸드 수정 요청 | ⭐⭐⭐⭐ | 백엔드 완성 | ✅ 2025-10-15 |
| **Phase 4** | 관리자 시스템 | ⭐⭐⭐⭐ | 완성 | ✅ 2025-10-15 |
| **Phase 5** | 콘텐츠 신고 시스템 | ⭐⭐⭐⭐ | 완성 | ✅ 2025-10-15 |
| **Phase 6** | 유저 프로필 고도화 | ⭐⭐⭐⭐ | 완성 | ✅ 2025-10-15 |
| **Phase 7** | 커뮤니티 검색 강화 | ⭐⭐⭐ | 완성 | ✅ 2025-10-15 |
| **Phase 8.x** | 추가 기능들 | ⭐⭐⭐ | 20-30시간 | ⏳ 대기 중 |

---

## 🎯 권장 구현 스케줄

### Week 1: 인증 & 핸드 상호작용
- Day 1-2: Phase 0 (인증 시스템)
- Day 3: Phase 1.1 (좋아요/싫어요)
- Day 4-5: Phase 1.2 (댓글 시스템)

### Week 2: 커뮤니티 강화
- Day 1-2: Phase 2.1 (핸드 첨부)
- Day 3: Phase 2.2 (북마크)
- Day 4-5: 테스트 및 버그 수정

### Week 3-4: 데이터 품질
- Day 1-5: Phase 3.1-3.2 (수정 요청 시스템)
- Day 6-10: 테스트, 피드백 반영

### Week 5+: 고급 기능 (선택)
- Phase 4.x 기능들 순차적 구현

---

## 📝 변경 이력

| 날짜 | 변경 내용 | 담당자 |
|------|-----------|--------|
| 2025-10-12 | 로드맵 최초 작성 | GGVault Team |
| 2025-10-12 | Phase 0 인증 시스템 시작 | GGVault Team |
| 2025-10-12 | Phase 0 인증 시스템 완료 | GGVault Team |
| 2025-10-15 | Phase 2.1 포럼 핸드 첨부 완료 | GGVault Team |
| 2025-10-15 | Phase 2.2 북마크 시스템 완료 | GGVault Team |
| 2025-10-15 | Phase 1.1 핸드 좋아요/싫어요 확인 (이미 구현됨) | GGVault Team |
| 2025-10-15 | Phase 1.2 핸드 댓글 시스템 확인 (이미 구현됨) | GGVault Team |
| 2025-10-15 | Phase 3 핸드 수정 요청 시스템 완료 (백엔드) | GGVault Team |
| 2025-10-15 | Phase 4 관리자 시스템 완료 | GGVault Team |
| 2025-10-15 | Phase 5 콘텐츠 신고 시스템 완료 | GGVault Team |
| 2025-10-15 | Phase 6 유저 프로필 고도화 완료 | GGVault Team |
| 2025-10-15 | Phase 7 커뮤니티 검색 강화 완료 | GGVault Team |
| 2025-10-15 | 문서 업데이트 (CLAUDE.md, WORK_LOG.md, ROADMAP.md) | GGVault Team |

---

**다음 업데이트**: 새 기능 추가 시
**현재 작업**: Phase 0-7 완료 🎉
**다음 작업**:
- 핸드 수정 제안 UI 진입점 추가 (2-3시간)
- 영상 분석 테스트 및 개선
- Phase 8 추가 기능 선택적 구현
**문의**: 각 Phase별 상세 내용은 CLAUDE.md 참조
