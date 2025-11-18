# Flowbite UI 컴포넌트 라이브러리 가이드

> Templar Archives에서 Flowbite 활용하기

---

## 개요

**Flowbite**는 Tailwind CSS 기반의 UI 컴포넌트 라이브러리로, 50+ 개의 사전 제작된 컴포넌트를 제공합니다.

- **공식 문서**: https://flowbite.com/docs/getting-started/quickstart/
- **GitHub**: https://github.com/themesberg/flowbite
- **현재 버전**: 4.0.1
- **Tailwind CSS 호환**: v2, v3, v4 (v4 권장)

---

## 프로젝트 통합

### 현재 프로젝트 상태

- **Next.js**: 16.0.1
- **React**: 19.2.0
- **Tailwind CSS**: 4.1.16 ✅
- **기존 UI**: shadcn/ui 제거됨 (Phase 39-40)

### 설치 방법

#### 1. NPM 설치 (권장)

```bash
npm install flowbite
```

#### 2. Tailwind CSS 설정

`app/globals.css`에 추가:

```css
@import "flowbite/src/themes/default";

@tailwind base;
@tailwind components;
@tailwind utilities;

@plugin "flowbite/plugin";
@source "../node_modules/flowbite";
```

#### 3. JavaScript 초기화

`app/layout.tsx`에 추가:

```typescript
import { useEffect } from 'react'

export default function RootLayout({ children }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('flowbite')
    }
  }, [])

  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

또는 직접 import:

```typescript
import 'flowbite'
```

#### 4. CDN 사용 (빠른 테스트용)

`app/layout.tsx`:

```typescript
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/flowbite@4.0.1/dist/flowbite.min.css"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <script src="https://cdn.jsdelivr.net/npm/flowbite@4.0.1/dist/flowbite.min.js"></script>
      </body>
    </html>
  )
}
```

---

## 주요 컴포넌트 (50+)

### Navigation

- **Navbar**: 반응형 네비게이션 바
- **Sidebar**: 접을 수 있는 사이드바
- **Breadcrumb**: 경로 표시
- **Tabs**: 탭 UI
- **Pagination**: 페이지네이션

### Forms

- **Input**: 텍스트 입력
- **Textarea**: 여러 줄 입력
- **Select**: 드롭다운 선택
- **Checkbox**: 체크박스
- **Radio**: 라디오 버튼
- **Toggle**: 토글 스위치
- **File Upload**: 파일 업로드
- **Search**: 검색 입력

### Content

- **Card**: 카드 레이아웃
- **List**: 리스트 그룹
- **Table**: 테이블
- **Timeline**: 타임라인
- **Badge**: 배지
- **Avatar**: 아바타
- **Rating**: 별점

### Overlays

- **Modal**: 모달 다이얼로그
- **Drawer**: 슬라이드 패널
- **Popover**: 팝오버
- **Tooltip**: 툴팁
- **Dropdown**: 드롭다운 메뉴
- **Mega Menu**: 메가 메뉴

### Data Display

- **Accordion**: 아코디언
- **Carousel**: 캐러셀
- **Gallery**: 갤러리
- **Chart**: 차트 (ApexCharts 통합)
- **Progress**: 진행 바
- **Skeleton**: 스켈레톤 로딩

### Feedback

- **Alert**: 알림
- **Toast**: 토스트 알림
- **Spinner**: 로딩 스피너
- **Banner**: 배너

### Buttons

- **Button**: 일반 버튼
- **Button Group**: 버튼 그룹
- **Floating Action Button**: FAB

---

## 사용 방법

### 1. Data Attributes 방식 (HTML 기반)

가장 간단한 방법:

```tsx
// Modal 예시
export function MyModal() {
  return (
    <>
      {/* 트리거 버튼 */}
      <button
        data-modal-target="default-modal"
        data-modal-toggle="default-modal"
        className="btn-primary"
      >
        모달 열기
      </button>

      {/* 모달 */}
      <div
        id="default-modal"
        tabIndex={-1}
        className="hidden fixed inset-0 z-50 overflow-y-auto"
      >
        <div className="relative p-4 w-full max-w-2xl">
          <div className="relative bg-white rounded-lg shadow">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-semibold">모달 제목</h3>
              <button
                data-modal-hide="default-modal"
                className="text-gray-400 hover:bg-gray-200 rounded-lg"
              >
                ✕
              </button>
            </div>
            {/* 바디 */}
            <div className="p-4">
              <p>모달 내용</p>
            </div>
            {/* 푸터 */}
            <div className="flex items-center p-4 border-t">
              <button data-modal-hide="default-modal" className="btn-primary">
                확인
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
```

### 2. JavaScript API 방식 (프로그래매틱)

더 많은 제어가 필요할 때:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import type { ModalOptions, ModalInterface } from 'flowbite'

export function ProgrammaticModal() {
  const modalRef = useRef<ModalInterface | null>(null)

  useEffect(() => {
    const { Modal } = require('flowbite')

    const modalElement = document.getElementById('my-modal')
    const options: ModalOptions = {
      placement: 'center',
      backdrop: 'dynamic',
      closable: true,
      onHide: () => console.log('Modal hidden'),
      onShow: () => console.log('Modal shown'),
    }

    modalRef.current = new Modal(modalElement, options)
  }, [])

  const openModal = () => {
    modalRef.current?.show()
  }

  const closeModal = () => {
    modalRef.current?.hide()
  }

  return (
    <>
      <button onClick={openModal} className="btn-primary">
        모달 열기
      </button>

      <div id="my-modal" className="hidden">
        {/* 모달 내용 */}
        <button onClick={closeModal}>닫기</button>
      </div>
    </>
  )
}
```

### 3. TypeScript 지원

```typescript
import type {
  ModalOptions,
  ModalInterface,
  DropdownOptions,
  DropdownInterface,
  TooltipOptions,
  TooltipInterface
} from 'flowbite'

const modal: ModalInterface = new Modal(element, options)
```

---

## Templar Archives 통합 예시

### 1. Modal → Archive Dialog

기존 Archive Dialog를 Flowbite Modal로 교체:

```tsx
// Before: 커스텀 Dialog
export function ArchiveDialog({ children }) {
  return (
    <div className="fixed inset-0 z-50">
      {/* 커스텀 구현 */}
    </div>
  )
}

// After: Flowbite Modal
export function ArchiveDialog({ title, children, onClose }) {
  return (
    <div
      id="archive-modal"
      tabIndex={-1}
      className="hidden fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="relative p-4 w-full max-w-4xl">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-xl font-semibold">{title}</h3>
            <button data-modal-hide="archive-modal">✕</button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
```

### 2. Dropdown → User Menu

```tsx
export function UserMenu({ user }) {
  return (
    <div className="relative">
      <button
        id="user-menu-button"
        data-dropdown-toggle="user-menu"
        className="flex items-center gap-2"
      >
        <img src={user.avatar} className="w-8 h-8 rounded-full" />
        <span>{user.name}</span>
      </button>

      <div
        id="user-menu"
        className="hidden z-10 bg-white divide-y divide-gray-100 rounded-lg shadow w-44"
      >
        <ul>
          <li>
            <a href="/profile" className="block px-4 py-2 hover:bg-gray-100">
              프로필
            </a>
          </li>
          <li>
            <a href="/settings" className="block px-4 py-2 hover:bg-gray-100">
              설정
            </a>
          </li>
          <li>
            <button onClick={handleSignOut} className="block w-full text-left px-4 py-2 hover:bg-gray-100">
              로그아웃
            </button>
          </li>
        </ul>
      </div>
    </div>
  )
}
```

### 3. Toast → Notification

```tsx
'use client'

import { useEffect } from 'react'

export function NotificationToast({ message, type = 'success' }) {
  useEffect(() => {
    const showToast = async () => {
      const { Toast } = await import('flowbite')

      const toast = new Toast(document.getElementById('toast'), {
        position: 'top-right',
        duration: 3000,
      })

      toast.show()
    }

    showToast()
  }, [message])

  return (
    <div
      id="toast"
      className="hidden fixed top-4 right-4 z-50 flex items-center p-4 bg-white rounded-lg shadow"
    >
      <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${
        type === 'success' ? 'text-green-500 bg-green-100' : 'text-red-500 bg-red-100'
      }`}>
        {type === 'success' ? '✓' : '✕'}
      </div>
      <div className="ml-3 text-sm font-normal">{message}</div>
    </div>
  )
}
```

### 4. Accordion → Tournament List

```tsx
export function TournamentAccordion({ tournaments }) {
  return (
    <div id="accordion-collapse" data-accordion="collapse">
      {tournaments.map((tournament, index) => (
        <div key={tournament.id}>
          <h2 id={`accordion-heading-${index}`}>
            <button
              type="button"
              data-accordion-target={`#accordion-body-${index}`}
              className="flex items-center justify-between w-full p-5 font-medium text-gray-500 border border-b-0 border-gray-200 rounded-t-xl focus:ring-4 focus:ring-gray-200"
            >
              <span>{tournament.name}</span>
              <svg className="w-3 h-3 rotate-180 shrink-0" fill="none" viewBox="0 0 10 6">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5 5 1 1 5"/>
              </svg>
            </button>
          </h2>
          <div
            id={`accordion-body-${index}`}
            className="hidden"
            aria-labelledby={`accordion-heading-${index}`}
          >
            <div className="p-5 border border-b-0 border-gray-200">
              {/* Tournament details */}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## 커스터마이징

### Tailwind CSS 클래스 오버라이드

Flowbite 컴포넌트는 Tailwind 클래스를 직접 수정 가능:

```tsx
// 기본 버튼
<button className="text-white bg-blue-700 hover:bg-blue-800 rounded-lg px-5 py-2.5">
  기본 버튼
</button>

// 커스텀 (Templar Archives 스타일)
<button className="text-white bg-gray-900 hover:bg-gray-800 border-2 border-gold-500 rounded-lg px-6 py-3 font-semibold uppercase">
  Templar 버튼
</button>
```

### 다크모드

Flowbite는 다크모드를 기본 지원:

```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
  {/* 자동으로 다크모드 적용 */}
</div>
```

---

## 프로젝트별 고려사항

### Templar Archives에서 활용 가능한 컴포넌트

#### 우선순위 높음
- **Modal**: AnalyzeDialog, EditDialog
- **Dropdown**: UserMenu, FilterMenu
- **Accordion**: TournamentList, HandHistory
- **Toast**: 성공/에러 알림
- **Table**: HandList, PlayerStats
- **Pagination**: 검색 결과, 핸드 목록

#### 우선순위 중간
- **Tabs**: Archive 카테고리 (Tournament, Cash Game)
- **Tooltip**: 포커 용어 설명
- **Card**: Player Card, Hand Card
- **Badge**: Role Badge, Status Badge
- **Avatar**: User Avatar

#### 우선순위 낮음
- **Carousel**: 이미지 갤러리
- **Timeline**: 토너먼트 일정
- **Chart**: 통계 차트 (ApexCharts 필요)

---

## 주의사항

### 1. Next.js App Router 호환성

- Server Components에서는 `'use client'` 필요
- `useEffect`로 동적 import

```typescript
'use client'

useEffect(() => {
  if (typeof window !== 'undefined') {
    import('flowbite').then((flowbite) => {
      flowbite.initFlowbite()
    })
  }
}, [])
```

### 2. Hydration 에러 방지

```typescript
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)
}, [])

if (!mounted) return null
```

### 3. TypeScript 타입 에러

```typescript
// flowbite 타입이 없을 경우
declare module 'flowbite' {
  export function initFlowbite(): void
  export class Modal {
    constructor(element: HTMLElement, options?: any)
    show(): void
    hide(): void
  }
  // ... 기타 클래스
}
```

---

## 참고 자료

- **공식 문서**: https://flowbite.com/docs/
- **컴포넌트 목록**: https://flowbite.com/docs/components/
- **Next.js 가이드**: https://flowbite.com/docs/getting-started/next-js/
- **React 가이드**: https://flowbite.com/docs/getting-started/react/
- **TypeScript 가이드**: https://flowbite.com/docs/getting-started/typescript/
- **GitHub**: https://github.com/themesberg/flowbite
- **NPM**: https://www.npmjs.com/package/flowbite

---

**작성일**: 2025-11-18
**문서 버전**: 1.0
**Flowbite 버전**: 4.0.1
**프로젝트**: Templar Archives Index
