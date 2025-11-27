# 데이터베이스 스키마 문서

> **Templar Archives** 데이터베이스 구조 및 설계 가이드

**마지막 업데이트**: 2025-11-23
**데이터베이스**: PostgreSQL 15 (Supabase)
**총 테이블 수**: 28개

---

## 📋 목차

1. [데이터베이스 개요](#데이터베이스-개요)
2. [테이블 카테고리](#테이블-카테고리)
3. [핵심 관계도](#핵심-관계도)
4. [테이블 상세](#테이블-상세)
5. [인덱스 전략](#인덱스-전략)
6. [RLS 보안 정책](#rls-보안-정책)

---

## 데이터베이스 개요

Templar Archives는 포커 핸드 데이터를 체계적으로 관리하고 분석하는 시스템입니다.

### 핵심 엔티티
- **Archive (Tournament → Event → Stream → Hand)**: 4단계 계층 구조
- **Player**: 플레이어 정보 및 통계
- **Community**: 포스트, 댓글, 좋아요
- **System**: 사용자, 알림, 보안

### 데이터베이스 설계 원칙
1. **정규화**: 3NF (제3정규형) 준수, 데이터 중복 최소화
2. **캐싱**: 통계 데이터 캐시 테이블 (player_stats_cache)
3. **계층 구조**: Tournament → Event → Stream → Hand (4단계)
4. **보안 우선**: Row Level Security (RLS) 전면 적용

---

## 테이블 카테고리

### 1. Archive 시스템 (5개)
핸드 데이터의 계층적 관리

| 테이블명 | 역할 | 레벨 |
|---------|------|------|
| `tournaments` | 토너먼트 메인 | Level 1 |
| `sub_events` | Events (이벤트) - 테이블명 유지 | Level 2 |
| `streams` | 비디오 스트림 | Level 3 |
| `hands` | 핸드 데이터 | Level 4 |
| `tournament_categories` | 카테고리 정보 (36개) | Reference |

### 2. 핸드 관련 (6개)
핸드의 상세 정보 및 인터랙션

| 테이블명 | 역할 |
|---------|------|
| `hand_players` | 핸드-플레이어 연결 (N:M) |
| `hand_actions` | 핸드 액션 상세 (Street별) |
| `hand_likes` | 핸드 좋아요/싫어요 |
| `hand_bookmarks` | 핸드 북마크 (폴더 지원) |
| `hand_edit_requests` | 핸드 수정 제안 |
| `hand_comments` | 핸드 댓글 (미구현 예정) |

### 3. 플레이어 (3개)
플레이어 정보 및 통계

| 테이블명 | 역할 |
|---------|------|
| `players` | 플레이어 메인 |
| `player_claims` | 플레이어 프로필 클레임 |
| `player_stats_cache` | 플레이어 통계 캐시 ⭐ 신규 |

### 4. 커뮤니티 (4개)
포스트 및 소셜 기능

| 테이블명 | 역할 |
|---------|------|
| `posts` | 포스트 메인 |
| `comments` | 댓글/답글 (무한 중첩) |
| `likes` | 포스트/댓글 좋아요 |
| `reports` | 콘텐츠 신고 |

### 5. 시스템 (6개)
사용자, 알림, 보안

| 테이블명 | 역할 |
|---------|------|
| `users` | 사용자 프로필 |
| `notifications` | 알림 시스템 |
| `data_deletion_requests` | GDPR 준수 |
| `security_events` | 보안 이벤트 로그 |
| `audit_logs` | 감사 로그 |
| `unsorted_videos` | 미분류 비디오 (임시) |
| `analysis_jobs` | KAN 영상 분석 작업 (Cloud Run) ⭐ 신규 |

---

## 핵심 관계도

### Archive 계층 구조
```
tournaments (1)
   ↓
sub_events (N)
   ↓
streams (N)
   ↓
hands (N)
   ↓
hand_players (N) ← players (N)
   ↓
hand_actions (N)
```

### 커뮤니티 관계
```
users (1) → posts (N)
           → comments (N) → comments (N) [재귀, 무한 중첩]
           → likes (N)
           → reports (N)
```

### 통계 캐싱
```
players (1)
   ↓
hand_players (N) ← hands (N)
   ↓
hand_actions (N)
   ↓ (자동 계산)
player_stats_cache (1) [캐시]
```

---

## 테이블 상세

### 1. tournaments
**목적**: 토너먼트 메인 테이블

**주요 컬럼**:
- `id` (UUID, PK)
- `name` (TEXT) - 토너먼트명
- `category` (TEXT) - 카테고리 (WSOP, Triton 등)
- `game_type` (TEXT) - 'tournament' | 'cash-game'
- `location` (TEXT) - 위치
- `start_date`, `end_date` (DATE)
- `total_prize` (TEXT)

**관계**:
- 1:N → `sub_events`

**인덱스**:
- `idx_tournaments_category` (category)
- `idx_tournaments_game_type` (game_type)
- `idx_tournaments_start_date` (start_date DESC)

---

### 2. sub_events (Events)
**목적**: Events (이벤트) - 토너먼트 내 개별 이벤트 (예: Event #1: $10K Main Event)

**참고**: 테이블명은 `sub_events`로 유지되지만, 개념적으로는 "Event"를 의미합니다.

**주요 컬럼**:
- `id` (UUID, PK)
- `tournament_id` (UUID, FK → tournaments)
- `name` (TEXT) - 이벤트명
- `event_number` (TEXT) - 이벤트 번호 (#1, 1A 등)
- `date` (DATE)
- `buy_in`, `entry_count`, `total_prize` (통계 정보)

**관계**:
- N:1 → `tournaments`
- 1:N → `streams`

**인덱스**:
- `idx_sub_events_tournament_id` (tournament_id)
- `idx_sub_events_date` (date DESC)

---

### 3. streams
**목적**: Streams (스트림) - 비디오 영상 (YouTube, 로컬 파일, NAS)

**설명**: 각 Event 내의 개별 영상/스트림을 의미합니다 (예: Day 1A, Final Table).

**주요 컬럼**:
- `id` (UUID, PK)
- `sub_event_id` (UUID, FK → sub_events, Event를 의미)
- `name` (TEXT) - 스트림명
- `video_url`, `video_file`, `video_nas_path` (3가지 소스)
- `video_source` (TEXT) - 'youtube' | 'upload' | 'nas'
- `published_at` (TIMESTAMPTZ)
- `is_organized` (BOOLEAN) - 정리 여부

**관계**:
- N:1 → `sub_events` (Events)
- 1:N → `hands`

**인덱스**:
- `idx_streams_sub_event_id` (sub_event_id)
- `idx_streams_is_organized` (is_organized) WHERE is_organized = FALSE

---

### 4. hands
**목적**: 핸드 메인 데이터

**주요 컬럼**:
- `id` (UUID, PK)
- `stream_id` (UUID, FK → streams)
- `number` (TEXT) - 핸드 번호
- `description` (TEXT) - 핸드 설명
- `summary` (TEXT) - 요약
- `timestamp` (TEXT) - 영상 타임코드 (MM:SS)
- `board_cards` (TEXT[]) - 보드 카드 배열
- `pot_size` (BIGINT)
- `confidence` (FLOAT) - AI 신뢰도
- `analyzed_by` (TEXT) - 'manual' | 'auto'
- `analysis_metadata` (JSONB) - 분석 메타데이터 ⭐ 신규
- `likes_count`, `dislikes_count`, `bookmarks_count` (INTEGER) - 캐시

**관계**:
- N:1 → `streams`
- 1:N → `hand_players`
- 1:N → `hand_actions`
- 1:N → `hand_likes`

**인덱스**:
- `idx_hands_stream_id` (stream_id)
- `idx_hands_number` (number)
- `idx_hands_timestamp` (timestamp)
- `idx_hands_analyzed_by` (analyzed_by)

---

### 5. hand_players
**목적**: 핸드-플레이어 연결 (N:M 관계)

**주요 컬럼**:
- `id` (UUID, PK)
- `hand_id` (UUID, FK → hands)
- `player_id` (UUID, FK → players)
- `position` (TEXT) - 포지션 (BTN, CO, SB 등)
- `cards` (TEXT) - 홀 카드
- `starting_stack`, `ending_stack` (BIGINT) - 스택 정보

**관계**:
- N:1 → `hands`
- N:1 → `players`

**인덱스**:
- `idx_hand_players_hand_id` (hand_id)
- `idx_hand_players_player_id` (player_id)
- `idx_hand_players_position` (position)

**고유 제약조건**:
- UNIQUE(hand_id, player_id) - 같은 핸드에 같은 플레이어 중복 방지

---

### 6. hand_actions
**목적**: 핸드 액션 상세 (Street별)

**주요 컬럼**:
- `id` (UUID, PK)
- `hand_id` (UUID, FK → hands)
- `player_id` (UUID, FK → players)
- `street` (TEXT) - 'preflop' | 'flop' | 'turn' | 'river'
- `action_type` (TEXT) - 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'
- `amount` (BIGINT) - 액션 금액
- `sequence` (INTEGER) - 순서

**관계**:
- N:1 → `hands`
- N:1 → `players`

**인덱스**:
- `idx_hand_actions_hand_id` (hand_id)
- `idx_hand_actions_player_id` (player_id)
- `idx_hand_actions_hand_player` (hand_id, player_id, sequence)

**트리거**:
- `trigger_invalidate_stats_on_hand_actions` - player_stats_cache 무효화

---

### 7. players
**목적**: 플레이어 메인 테이블

**주요 컬럼**:
- `id` (UUID, PK)
- `name` (TEXT, UNIQUE) - 플레이어명
- `photo_url` (TEXT)
- `country` (TEXT)
- `total_winnings` (BIGINT)

**관계**:
- 1:N → `hand_players`
- 1:N → `hand_actions`
- 1:1 → `player_stats_cache`

**인덱스**:
- `idx_players_name` (name)
- `idx_players_name_lower` (LOWER(name)) - 대소문자 무시 검색

---

### 8. player_stats_cache ⭐ 신규
**목적**: 플레이어 통계 캐시 (성능 최적화)

**주요 컬럼**:
- `player_id` (UUID, PK, FK → players)
- `vpip`, `pfr`, `three_bet`, `ats` (FLOAT) - 주요 통계
- `win_rate`, `showdown_win_rate` (FLOAT)
- `avg_pot_size` (BIGINT)
- `total_hands`, `hands_won` (INTEGER)
- `positional_stats` (JSONB) - 포지션별 통계
- `play_style` (TEXT) - 플레이 스타일 분류
- `last_updated` (TIMESTAMPTZ)

**캐싱 전략**:
1. 최초 조회 시 실시간 계산 후 캐시 저장
2. hand_actions/hand_players 변경 시 자동 무효화
3. 재조회 시 재계산 후 캐시 갱신

**성능 개선**:
- 플레이어 통계 조회: 2-3초 → 500ms (50-70% 개선)
- 데이터베이스 부하 감소: 70%

**인덱스**:
- `idx_player_stats_cache_updated` (last_updated DESC)
- `idx_player_stats_cache_style` (play_style)
- `idx_player_stats_cache_hands` (total_hands DESC)

---

### 9. posts
**목적**: 커뮤니티 포스트

**주요 컬럼**:
- `id` (UUID, PK)
- `author_id` (UUID, FK → users)
- `title` (TEXT)
- `content` (TEXT)
- `category` (TEXT) - 'Analysis' | 'Strategy' | 'Hand Review' | 'General'
- `likes_count`, `comments_count` (INTEGER) - 캐시

**관계**:
- N:1 → `users`
- 1:N → `comments`
- 1:N → `likes`

**인덱스**:
- `idx_posts_author_id` (author_id)
- `idx_posts_category` (category)
- `idx_posts_created_at` (created_at DESC)

---

### 10. comments
**목적**: 댓글/답글 (무한 중첩 지원)

**주요 컬럼**:
- `id` (UUID, PK)
- `post_id` (UUID, FK → posts, NULLABLE)
- `parent_id` (UUID, FK → comments, NULLABLE) - 재귀 관계
- `author_id` (UUID, FK → users)
- `content` (TEXT)
- `likes_count` (INTEGER) - 캐시

**재귀 구조**:
- 포스트 댓글: `post_id` 있음, `parent_id` NULL
- 답글: `post_id` NULL, `parent_id` 있음 (부모 댓글 참조)

**관계**:
- N:1 → `posts`
- N:1 → `comments` (self-reference)
- N:1 → `users`

**인덱스**:
- `idx_comments_post_id` (post_id)
- `idx_comments_parent_id` (parent_id)
- `idx_comments_author_id` (author_id)

---

### 11. users
**목적**: 사용자 프로필 (Supabase Auth 연동)

**주요 컬럼**:
- `id` (UUID, PK, FK → auth.users)
- `email` (TEXT, UNIQUE)
- `nickname` (TEXT)
- `avatar_url` (TEXT)
- `role` (TEXT) - 'user' | 'high_templar' | 'reporter' | 'admin'
- `banned_at` (TIMESTAMPTZ) - 밴 여부
- `last_sign_in_at` (TIMESTAMPTZ) - 마지막 로그인

**관계**:
- 1:1 → `auth.users` (Supabase Auth)
- 1:N → `posts`, `comments`, `likes`, `notifications`

**인덱스**:
- `idx_users_email` (email)
- `idx_users_nickname` (nickname)
- `idx_users_role` (role)
- `idx_users_last_sign_in` (last_sign_in_at DESC)

---

### 12. analysis_jobs ⭐ 신규
**목적**: KAN 영상 분석 작업 추적 (Cloud Run)

**주요 컬럼**:
- `id` (UUID, PK)
- `stream_id` (UUID, FK → streams)
- `status` (TEXT) - 'pending' | 'processing' | 'completed' | 'failed'
- `progress` (INTEGER) - 진행률 (0-100)
- `error` (TEXT) - 에러 메시지
- `trigger_run_id` (TEXT) - Trigger.dev 실행 ID
- `platform` (TEXT) - 'ept' | 'triton' | 'wsop' | 'pokerstars' | 'hustler'
- `segment_start` (INTEGER) - 세그먼트 시작 시간 (초)
- `segment_end` (INTEGER) - 세그먼트 종료 시간 (초)
- `result` (JSONB) - 분석 결과 (핸드 데이터)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**관계**:
- N:1 → `streams`

**인덱스**:
- `idx_analysis_jobs_stream_id` (stream_id)
- `idx_analysis_jobs_status` (status)
- `idx_analysis_jobs_trigger_run_id` (trigger_run_id)

**사용 패턴**:
1. Server Action에서 작업 생성
2. Trigger.dev Task에서 진행률/상태 업데이트
3. React Query 폴링 (2초 간격)으로 UI 업데이트

---

### 13. notifications
**목적**: 실시간 알림 시스템

**주요 컬럼**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `type` (TEXT) - 8가지 타입
- `content` (TEXT)
- `link` (TEXT)
- `read_at` (TIMESTAMPTZ)

**알림 타입**:
- `comment`, `reply`, `like_post`, `like_comment`
- `edit_approved`, `edit_rejected`, `claim_approved`, `claim_rejected`

**자동 생성**:
- 9개 트리거가 자동으로 알림 생성

**인덱스**:
- `idx_notifications_user_id` (user_id)
- `idx_notifications_unread` (user_id, read_at)
- `idx_notifications_created_at` (created_at DESC)

---

## 인덱스 전략

### 1. 기본 인덱스
- **Primary Key**: 자동 B-Tree 인덱스
- **Foreign Key**: 조인 성능을 위한 인덱스

### 2. 복합 인덱스
효율적인 다중 컬럼 검색

| 테이블 | 인덱스 | 용도 |
|--------|--------|------|
| `hand_actions` | (hand_id, player_id, sequence) | 핸드별 플레이어 액션 조회 |
| `hand_players` | (hand_id, player_id) | 핸드별 플레이어 조회 |
| `notifications` | (user_id, read_at) | 읽지 않은 알림 조회 |

### 3. Partial 인덱스
조건부 인덱스로 크기 절감

| 테이블 | 인덱스 | 조건 |
|--------|--------|------|
| `streams` | (is_organized) | WHERE is_organized = FALSE |
| `player_stats_cache` | (play_style) | WHERE play_style IS NOT NULL |
| `player_stats_cache` | (total_hands) | WHERE total_hands > 0 |

### 4. GIN 인덱스
Full-Text Search 및 배열 검색

| 테이블 | 인덱스 | 용도 |
|--------|--------|------|
| `posts` | to_tsvector('english', title \|\| ' ' \|\| content) | 포스트 전문 검색 |
| `hands` | board_cards | 보드 카드 배열 검색 |

---

## RLS 보안 정책

### 원칙
1. **기본 거부**: 모든 테이블은 RLS 활성화 후 명시적 정책 설정
2. **역할 기반**: user, high_templar, reporter, admin 4단계
3. **소유권 검증**: 사용자는 자신의 데이터만 수정 가능
4. **Admin 전용**: 핵심 테이블은 Admin만 write 가능

### 주요 정책

#### 1. Archive 테이블 (tournaments, sub_events (Events), streams, hands)
- **SELECT**: 모든 인증된 사용자
- **INSERT/UPDATE/DELETE**: Admin 전용

#### 2. 커뮤니티 (posts, comments, likes)
- **SELECT**: 모든 인증된 사용자
- **INSERT**: 인증된 사용자
- **UPDATE/DELETE**: 작성자 본인 또는 Admin

#### 3. 플레이어 (players, player_stats_cache)
- **SELECT**: 모든 인증된 사용자
- **INSERT/UPDATE**: Admin 전용
- **DELETE**: Admin 전용

#### 4. 시스템 (users, notifications)
- **SELECT**: 본인 또는 Admin
- **UPDATE**: 본인 (특정 필드) 또는 Admin (모든 필드)

### 함수 기반 정책

#### `is_admin_user(user_email TEXT)`
- 이메일로 관리자 여부 확인
- `users.role = 'admin'`

#### `is_banned(user_id UUID)`
- 밴 상태 확인
- `users.banned_at IS NOT NULL`

#### `is_author(user_id UUID, content_author_id UUID)`
- 작성자 본인 확인
- `user_id = content_author_id`

---

## 데이터 무결성

### Foreign Key Cascades

| 테이블 | FK | ON DELETE |
|--------|------|-----------|
| `sub_events` | tournament_id | CASCADE |
| `streams` | sub_event_id | CASCADE |
| `hands` | stream_id | CASCADE |
| `hand_players` | hand_id | CASCADE |
| `hand_players` | player_id | CASCADE |
| `hand_actions` | hand_id | CASCADE |

**효과**: Tournament 삭제 시 모든 하위 데이터 자동 삭제

### CHECK 제약조건

| 테이블 | 제약조건 | 조건 |
|--------|----------|------|
| `likes` | 대상 존재 | post_id IS NOT NULL OR comment_id IS NOT NULL |
| `likes` | 중복 방지 | (post_id IS NULL) != (comment_id IS NULL) |
| `tournaments` | 날짜 검증 | end_date >= start_date |
| `hands` | 신뢰도 범위 | confidence BETWEEN 0 AND 1 |

---

## 트리거 및 자동화

### 1. 통계 캐시 무효화
- **trigger_invalidate_stats_on_hand_actions**
  - hand_actions INSERT/UPDATE/DELETE → player_stats_cache 삭제
- **trigger_invalidate_stats_on_hand_players**
  - hand_players starting_stack/ending_stack 변경 → player_stats_cache 삭제

### 2. 자동 카운터 업데이트
- **update_hand_likes_count** - hands.likes_count, hands.dislikes_count
- **update_hand_bookmarks_count** - hands.bookmarks_count
- **update_post_likes_count** - posts.likes_count
- **update_post_comments_count** - posts.comments_count
- **update_comment_likes_count** - comments.likes_count

### 3. 알림 자동 생성
- 9개 트리거가 커뮤니티 액션에 따라 알림 자동 생성

---

## 성능 최적화 권장사항

### 1. 쿼리 최적화
- JOIN 시 인덱스 활용 확인 (`EXPLAIN ANALYZE`)
- SELECT 시 필요한 컬럼만 조회
- 복잡한 통계 쿼리는 캐시 활용

### 2. 정기 유지보수
```sql
-- 통계 업데이트
ANALYZE;

-- 인덱스 재생성 (필요 시)
REINDEX TABLE player_stats_cache;

-- 오래된 로그 삭제 (자동 함수 존재)
SELECT cleanup_old_security_events(); -- 90일 이상
SELECT cleanup_old_audit_logs(); -- 180일 이상
```

### 3. 모니터링
- `pg_stat_user_tables` - 테이블 사용 통계
- `pg_stat_user_indexes` - 인덱스 사용 통계
- Slow Query Log 분석

---

## 확장성

### 수평 확장 (Read Replicas)
- Supabase는 읽기 복제본 지원
- 통계 조회, 검색 쿼리는 복제본 사용

### 수직 확장 (Scale Up)
- player_stats_cache로 계산 부하 감소
- 필요 시 DB 인스턴스 업그레이드

### 파티셔닝 (미래)
- `hands` 테이블이 100만 건 이상 시 날짜별 파티셔닝 고려

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-11-23 | 1.2 | analysis_jobs 테이블 추가 (Trigger.dev KAN 작업 추적) |
| 2025-11-19 | 1.1 | SubEvent → Event 용어 통일, 테이블 설명 개선 |
| 2025-11-02 | 1.0 | 초기 문서 생성, player_stats_cache 추가 |
| 2024-10-30 | 0.9 | hands 테이블 analysis_metadata 추가 |
| 2024-10-25 | 0.8 | days → streams 테이블 리네임 |
| 2024-10-24 | 0.7 | RLS 정책 강화 (Phase 32) |

---

**문서 관리자**: Claude (Anthropic AI)
**연락처**: 프로젝트 관리자에게 문의
