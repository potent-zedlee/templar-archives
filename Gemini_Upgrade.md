Templar Archives Index 2.2: 구조적 완결성 및 모던 스택 최적화

작성일: 2025년 11월 23일
작성자: AI Backend Architect (for Zed Lee)
목표: FSD(Feature-Sliced Design) 아키텍처 완성, React 19 컴파일러 도입, 테스트 신뢰성 회복

1. 아키텍처 완결 (Architecture Finalization)

현재 components/ 폴더 정리가 80% 진행되었습니다. 남은 20%를 정리하여 구조적 부채를 완전히 없앱니다.

1.1. 잔존 컴포넌트 재배치

다음 폴더들을 기능별(features) 또는 공통(common) 폴더로 이동하여 루트를 비웁니다.

components/poker/ -> components/features/poker/ (게임 로직 관련 시각화)

components/video/ -> components/features/video/ (영상 재생 및 타임라인)

components/upload/ -> components/features/admin/upload/ (관리자 기능의 일부로 편입)

components/player-stats/ -> components/features/player/stats/ (플레이어 기능의 하위 도메인)

components/skeletons/ -> components/ui/skeletons/ (UI 라이브러리의 일부로 간주)

1.2. 배럴 파일(Barrel Files) 도입

각 폴더에 index.ts를 생성하여 Import 경로를 깔끔하게 만듭니다.

Before:

import HandCard from "@/components/features/hand/HandCard";
import HandList from "@/components/features/hand/HandList";


After:

// components/features/hand/index.ts 생성 후
import { HandCard, HandList } from "@/components/features/hand";


2. 최신 기술 스택 적용 (Modernization)

2025년 11월 기준 최신 표준인 **Next.js 15 (Stable)**와 React 19의 이점을 극대화합니다.

2.1. React Compiler 활성화

개요: React 19의 핵심인 자동 메모이제이션 컴파일러를 활성화하여 useMemo, useCallback 코드를 제거합니다.

작업: next.config.mjs에서 experimental: { reactCompiler: true } 설정 확인 및 적용.

효과: 렌더링 성능 자동 최적화 및 코드 간결화.

2.2. nuqs (Next Use Query State) 도입

현황: 현재 검색/필터링 로직(useArchiveState 등)이 다소 복잡함.

제안: URL Search Params 관리를 위해 2025년 표준 라이브러리인 nuqs를 도입.

효과: 서버 컴포넌트와 클라이언트 컴포넌트 간의 필터 상태 동기화 문제(Hydration Error 등) 원천 차단.

3. 테스트 및 안정성 (Reliability)

구조 변경으로 인해 깨진 테스트를 복구하고, CI 파이프라인을 강화합니다.

3.1. Playwright 설정 업데이트 (playwright.config.ts)

변경된 디렉토리 구조에 맞춰 테스트 파일 경로 패턴을 업데이트합니다.

e2e/archive.spec.ts 등의 테스트 코드가 새로운 컴포넌트 경로의 data-testid를 올바르게 찾는지 점검합니다.

3.2. Typed Supabase Queries

현재 일부 쿼리(lib/queries/*.ts)에서 any 타입이 사용될 가능성이 있음.

Supabase CLI로 생성된 database.types.ts를 엄격하게 적용하여 DB 스키마 변경 시 컴파일 에러가 나도록(Fail Fast) 조치.

4. 실행 계획 (Action Plan)

Day 1 (구조 마무리): 섹션 1.1의 잔존 폴더 이동 및 Import 경로 일괄 수정. (가장 시급)

Day 2 (설정 최적화): React Compiler 활성화 및 빌드 테스트.

Day 3 (테스트 복구): npm run test:e2e 실행 후 실패하는 테스트 케이스 하나씩 수정.

결론:
집 정리는 거의 끝났습니다. 남은 자재들을 창고(하위 폴더)에 넣고, 최신 스마트 홈 시스템(React Compiler)을 켜기만 하면 됩니다.