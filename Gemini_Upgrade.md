Templar Archives Index: 구조적 무결성 확보 및 표준화 계획 (Final)

작성일: 2025년 11월 23일
작성자: AI Lead Architect
목표: 파일 중복 제거(De-duplication), 네이밍 표준화, FSD(Feature-Sliced Design) 아키텍처 확립

1. [CRITICAL] 유령 파일 제거 (Ghost Busting)

상황: CardSelector.tsx와 card-selector.tsx가 공존하는 등 파일 시스템 오염 발생.
조치: 하나의 스타일로 통일하고 나머지는 즉시 삭제해야 함.

✅ 결정된 표준: PascalCase

React 컴포넌트는 PascalCase (MyComponent.tsx)를 표준으로 합니다. (단, components/ui/ 내부의 shadcn 라이브러리 파일은 kebab-case 유지)

실행 가이드

components/ 루트에 있는 모든 .tsx 파일 삭제. (폴더는 유지)

중복된 파일 중 PascalCase인 것만 남기고 kebab-case는 삭제.

삭제: components/card-selector.tsx, components/poker-table.tsx 등

유지/이동: components/features/hand/CardSelector.tsx

2. 디렉토리 구조 재편 (FSD Lite 패턴)

Next.js 15 App Router에 최적화된 "기능 중심(Feature-First)" 구조로 완전 이주합니다.

2.1. components 폴더 최종 구조안

/components
├── /ui             # (유지) Shadcn UI 컴포넌트 (button.tsx, card.tsx...)
├── /layout         # (이동) Header, Footer, Sidebar, PageTransition
├── /common         # (이동) 앱 전역에서 쓰이는 재사용 컴포넌트 (CardSelector, LogoPicker)
└── /features       # (핵심) 비즈니스 로직 단위로 그룹화
    ├── /hand       # HandCard, HandList, ActionEditor...
    ├── /player     # PlayerCard, PlayerStats, Profile...
    ├── /tournament # TournamentCard, Bracket...
    ├── /community  # CommentSection, PostList...
    ├── /poker      # PokerTable, PlayingCard (시각화 전용)
    └── /video      # VideoPlayer, Timeline...


2.2. scripts 폴더 최종 구조안

/scripts
├── admin-cli.ts        # (유일한 진입점) 모든 관리 기능의 시작점
├── /operations         # (모듈) 실제 로직을 담은 TS 파일들
│   ├── db-check.ts
│   ├── job-manager.ts
│   └── ...
└── /legacy             # (창고) 더 이상 안 쓰지만 지우기 아까운 .mjs 파일들


3. 코드 및 설정 표준화 (Modernization)

3.1. 배럴 파일(Barrel Files) 전략 수정

Next.js 15의 Tree-shaking 성능을 위해, 무분별한 index.ts 사용을 자제하고 명시적 경로를 사용합니다.

Bad: import { HandCard } from "@/components/features/hand" (index.ts가 모든걸 export 할 경우)

Good: import HandCard from "@/components/features/hand/HandCard"

3.2. TypeScript Strict Mode 강화

tsconfig.json에서 엄격한 규칙을 적용하여 런타임 에러를 방지합니다.

{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "forceConsistentCasingInFileNames": true  // <--- 이 옵션이 대소문자 충돌 방지에 필수
  }
}


4. 단계별 실행 스크립트 (Action Steps)

AI 에이전트에게 다음 순서대로 지시하여 휴먼 에러를 방지하세요.

Step 1: 중복 및 루트 파일 정리

"components 폴더 루트에 있는 모든 .tsx 파일을 분석해줘. 만약 하위 폴더(features, common 등)에 같은 역할의 파일이 있다면 루트에 있는 파일은 삭제해. 그리고 PascalCase와 kebab-case가 중복된 경우 PascalCase만 남기고 삭제해."

Step 2: 잔존 폴더 이동

"아직 루트에 있는 components/poker, components/video 등의 폴더를 components/features/ 하위로 이동시키고, 내부 파일명을 모두 PascalCase로 변경해줘."

Step 3: Import 경로 수리

"파일 이동으로 인해 깨진 import 경로를 프로젝트 전체에서 스캔하여 수정해줘. npm run build가 성공할 수 있도록."

Step 4: 스크립트 폴더 마무리

"scripts 폴더 루트에 있는 모든 .mjs 파일을 scripts/legacy로 이동시켜. admin-cli.ts만 루트에 남겨둬."

5. 결론

지금 상태는 **"이사 가려고 짐은 쌌는데, 옛날 집 열쇠와 새 집 열쇠가 섞여 있는 상태"**입니다.
이 [중복 제거] 작업을 오늘 끝내야만, 내일부터 마음 편하게 KAN 분석 기능을 고도화하거나 수익화 기능을 붙일 수 있습니다.