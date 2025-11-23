데이터베이스 관리 전략: Baseline & Increment (2025)

작성일: 2025년 11월 23일

전략: Baseline Pattern (베이스라인 패턴)
도구: Supabase CLI

1. 핵심 철학

"DB 스키마는 역사가 아니라, 현재의 상태(State)가 중요하다."
수십 개의 자잘한 수정 파일은 배포 속도를 늦추고 에러 추적을 어렵게 합니다. 우리는 주기적으로 역사를 압축(Squash)하여 관리합니다.

2. 적용 프로세스

Step 1: 베이스라인(Baseline) 수립

현재 시점의 완벽한 DB 스냅샷을 단 하나의 SQL 파일로 만듭니다. 이것이 우리의 '창세기(Genesis)'가 됩니다.

파일명: 20251123000000_release_v1_baseline.sql

내용: users, tournaments, hands 등 모든 테이블과 RLS 정책 생성 구문.

기존 파일: supabase/migrations/archive/ 폴더로 이동하여 참조용으로만 보관 (실행 X).

Step 2: 이후 변경사항은 "증분(Incremental)" 관리

베이스라인 생성 이후의 변경 사항은 다시 새로운 파일로 관리합니다.

예: 핸드 분석 기능에 새 컬럼이 필요하다면?

20251201000000_add_ai_confidence_score.sql 생성.

이렇게 파일이 또 10~20개 쌓이면? -> 다시 Step 1을 수행하여 "v2 Baseline"을 만듭니다.

Step 3: 데이터 시딩(Seeding) 분리 (중요!)

마이그레이션 파일에는 **"구조(Schema)"**만 남기고, **"초기 데이터(Data)"**는 분리해야 합니다.
현재 seed-tournament-categories.ts 같은 스크립트가 있는데, 이를 supabase/seed.sql 또는 전용 시딩 스크립트로 명확히 분리합니다.

Migration (.sql): CREATE TABLE categories ...

Seed (seed.sql): INSERT INTO categories VALUES ('WSOP', ...)

3. 실행 가이드 (Action Plan)

로컬 DB 동기화: 현재 로컬 DB가 운영 서버와 동일한지 확인합니다.

덤프(Dump) 실행: npx supabase db dump --local > supabase/migrations/20251123000000_v1_baseline.sql

기존 파일 이동: 2024...sql ~ 20251122...sql 파일들을 archive 폴더로 이동.

운영 서버 마킹 (Production Repair):

운영 서버 배포 시, Supabase가 "이 v1_baseline 파일은 실행된 셈 치자"라고 인식하게 만듭니다.

npx supabase migration repair --status applied 20251123000000_v1_baseline.sql

4. 왜 이 방법이 최고인가요?

CI/CD 속도: GitHub Actions에서 테스트 DB를 띄울 때 60번 파일을 실행하는 것보다 1번 파일을 실행하는 것이 20배 이상 빠릅니다.

협업 용이성: 나중에 다른 개발자가 합류했을 때, v1_baseline.sql 하나만 보면 DB 구조를 한눈에 이해할 수 있습니다.

AI 친화적: Claude나 Gemini에게 DB 구조를 설명할 때, 60개 파일을 주는 것보다 잘 정리된 1개 파일을 주는 것이 훨씬 정확한 답변을 줍니다.

결론: 리팩토링의 마무리는 **"복잡함의 제거"**입니다. 하나로 합치세요.