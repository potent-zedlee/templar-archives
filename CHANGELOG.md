# Changelog

Templar Archives 프로젝트의 버전별 변경사항입니다.

---

## [v3.0] - 2025-11-27

### Changed
- **인프라 전면 마이그레이션**: Supabase → Firebase Firestore
- **배포 시스템**: Vercel → Firebase Hosting + GitHub Actions CI/CD
- **영상 분석**: Cloud Run + Cloud Tasks (primary system)

### Removed
- Supabase 완전 제거 (PostgreSQL → Firestore NoSQL)
- Trigger.dev 완전 제거 (Cloud Run으로 대체)
- Vercel 배포 제거 (Firebase Hosting으로 대체)

### Added
- Firebase Admin SDK 통합
- Firestore Security Rules
- GitHub Actions CI/CD 파이프라인
- Cloud Build 설정

---

## [v2.5] - 2025-11-23

### Added
- Admin CLI v2.0: `check-players`, `diagnose` action 추가
- 문서 구조 개선: POKER_DOMAIN.md, CHANGELOG.md 분리

### Changed
- 컴포넌트 리네임: archive-dialogs 폴더 PascalCase 완료
- 스크립트 정리: 13개 중복 check-*.mjs 스크립트 삭제

---

## [v2.4] - 2025-11-22

### Added
- 프로젝트 구조 섹션 추가: 디렉토리 구조 시각화
- Trigger.dev 개발/배포 가이드 추가: 로컬 개발 및 프로덕션 배포 절차

### Fixed
- 디버깅 섹션 강화: Trigger.dev 문제 해결 가이드
- 테스트 명령어 정확화: Vitest 단일 파일 실행 명령 수정
- 환경 변수 가이드 개선: Trigger.dev 설정 단계별 안내

---

## [v2.3] - 2025-11-21

### Changed
- **KAN 전면 재설계**: Python → TypeScript + Trigger.dev v3 전환
- 영상 분석 파이프라인 완전 재작성 (단일 스택)
- 인메모리 처리 (디스크 I/O 제거)
- 무제한 실행 시간 (Trigger.dev maxDuration: 3600s)

### Added
- 새 의존성: @trigger.dev/sdk, @distube/ytdl-core, fluent-ffmpeg
- 실시간 진행률 모니터링 (React Query 폴링)

### Removed
- Python 백엔드 완전 제거 (kan/backend 삭제)

---

## [v2.2] - 2025-11-19

### Added
- Phase 44 완료
- 3-Column 레이아웃 최적화
- 플레이어 통계 캐시 시스템

---

## [v2.1] - 2025-11-15

### Added
- Search 페이지 21개 필터
- HoleCardDialog, HandValueDialog 컴포넌트

### Fixed
- 필터 로직 최적화

---

## [v2.0] - 2025-11-10

### Changed
- Archive 3-Column 레이아웃으로 전환
- React Query 전체 적용

### Added
- Zustand stores 4개 생성
- 타입 시스템 구축 (lib/types/)

---

## [v1.0] - 2025-10-30

### Added
- 초기 릴리스
- Phase 1-33 완료
- 49개 페이지 구현
- Supabase 인증/DB 통합

---

## 버전 규칙

- **Major (X.0.0)**: 대규모 아키텍처 변경
- **Minor (0.X.0)**: 새로운 기능 추가
- **Patch (0.0.X)**: 버그 수정, 문서 업데이트

---

**참고 문서**
- `work-logs/`: 상세 개발 로그
- `ROADMAP.md`: 개발 로드맵
- `CLAUDE.md`: 프로젝트 가이드
