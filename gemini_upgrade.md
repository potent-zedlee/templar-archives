Templar Archives Index 2.1: 품질 안정화 및 표준화 (Quality & Standardization)

작성일: 2025년 11월 23일

목표: 테스트 통과율 100% 달성, UI 컴포넌트 표준화, 운영 자동화 완성

1. 최우선 과제: 테스트 정상화 (Test Repair)

현황: 리팩토링 후 test-results에 실패 로그가 다수 존재함.
위험: 버그가 있는 상태로 배포될 가능성 높음.

Action Item 1: Playwright 테스트 수정

e2e/home.spec.ts, e2e/archive.spec.ts 실패 원인 분석 (주로 UI 변경으로 인한 선택자 불일치 예상).

test-failed 스크린샷을 기반으로 UI 요소의 data-testid 속성 재확인 및 수정.

목표: npm run test:e2e 실행 시 모든 테스트 Pass(초록불) 만들기.

2. 코드베이스 표준화 (Standardization)

현황: components 폴더 내 파일 네이밍 규칙 혼재 (PascalCase vs kebab-case).

Action Item 2: 컴포넌트 네이밍 통일

규칙 확립: 모든 React 컴포넌트 파일명은 PascalCase로 통일 (예: add-players-dialog.tsx -> AddPlayersDialog.tsx).

구조 정리: components/ 루트에 있는 컴포넌트들을 성격에 맞는 폴더(components/common, components/features/player 등)로 이동.

이동 후 import 경로 자동 업데이트 확인.

Action Item 3: 로고 관리 동적화

scripts/logo-url-mapping.json 의존성 제거.

DB의 tournament_categories 또는 tournaments 테이블에 logo_url 컬럼이 올바르게 작동하는지 확인.

프론트엔드에서 JSON 대신 DB 데이터를 우선 참조하도록 로직 변경 (lib/logo-utils.ts 수정).

3. 운영 자동화 완성 (Ops Automation)

현황: admin-cli.ts가 생성되었으나, 여전히 개별 스크립트 실행 빈도가 높음.

Action Item 4: Admin CLI 기능 확충

check-*.mjs 류의 진단 스크립트 로직을 admin-cli.ts의 서브 커맨드로 이식.

예: npm run admin diagnose -- --target=db

이식이 완료된 scripts/operations/ 내의 .mjs 파일들은 과감히 삭제(scripts/archive/로 이동 아님, 완전 삭제).

Action Item 5: KAN 분석 파이프라인 모니터링

새로 추가된 retry_count가 실제 Job 실패 시 증가하는지 테스트.

3회 이상 실패 시 status를 failed로 확정 짓고 관리자에게 알림(Slack/Email 또는 DB 로그)을 남기는지 검증.

4. 주간 일정표 (Estimated Timeline)

주차

주요 활동

세부 내용

Week 1

테스트 복구

Playwright 에러 수정, CI 파이프라인(Github Actions) 통과 확인

Week 2

컴포넌트 정리

파일명 변경(PascalCase), 폴더 구조 재배치, 불필요한 코드 삭제

Week 3

로고 시스템

JSON 하드코딩 제거, Supabase Storage 및 DB 연동 강화

Week 4

CLI 통합

잔존 스크립트 완전 통합 및 삭제, 문서(README.md) 업데이트

5. 비즈니스 연계 (For PotEnt)

안정성이 곧 수익: 토너먼트 생중계 중 사이트가 터지거나 데이터가 안 보이면 브랜드 신뢰도가 하락합니다. 이번 **테스트 복구(Week 1)**가 가장 중요한 비즈니스 활동입니다.

데이터 자산 보호: DB 정리 작업은 잘 되었습니다. 이제 audit_logs 테이블(최근 추가됨)을 활용하여 누가 데이터를 수정했는지 추적하는 대시보드 기능을 구상해 보세요.