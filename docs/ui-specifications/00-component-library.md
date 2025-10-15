# Component Library - Templar Archives

Templar Archives 프로젝트에서 사용하는 모든 UI 컴포넌트에 대한 종합 가이드입니다.

## 📦 UI 라이브러리

- **기반**: [shadcn/ui](https://ui.shadcn.com/)
- **스타일링**: Tailwind CSS 4.1.9
- **아이콘**: Lucide React
- **알림**: Sonner (Toast)

---

## 🎨 shadcn/ui 주요 컴포넌트

### 1. 레이아웃 컴포넌트
- **Card**: `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`
  - 사용처: 모든 페이지 콘텐츠 그룹핑
- **Resizable Panel**: `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`
  - 사용처: Archive 페이지 (트리뷰 + 영상)
- **Scroll Area**: `ScrollArea`
  - 사용처: 긴 목록 (Hands, Players)

### 2. 폼 컴포넌트
- **Input**: 검색, URL 입력, 필터
  - 변형: 기본, 아이콘 포함 (left/right)
- **Select**: `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
  - 사용처: 토너먼트, 플레이어 선택
- **Checkbox**: 다중 선택 (Archive, Players)

### 3. 네비게이션 컴포넌트
- **Button**: 변형 (default, outline, ghost, destructive), 크기 (sm, default, lg)
- **Tabs**: `TabsContent`, `TabsList`, `TabsTrigger`
  - 사용처: Community (Trending/Recent/Popular)

### 4. 데이터 표시 컴포넌트
- **Table**: `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`
  - 사용처: Hands, Search 페이지
- **Badge**: 변형 (default, secondary, outline, destructive)
  - 사용처: 카테고리, 플레이어 수, 상태
- **Avatar**: `AvatarFallback`, `AvatarImage`
  - 사용처: Players, Community
- **Progress**: 진행률 표시 (0-100%)
  - 사용처: Analyze 페이지

### 5. 모달/오버레이 컴포넌트
- **Dialog**: `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogTrigger`
  - 사용처: Archive (Tournament/SubEvent/Day 추가)
- **Toast (Sonner)**: `toast.success()`, `toast.error()`, `toast.info()`
  - 사용처: 모든 페이지 (성공/에러 알림)

### 6. 기타
- **Separator**: 수평/수직 구분선

---

## 🎭 커스텀 컴포넌트

### 메인 컴포넌트
- **Header**: 네비게이션, 로고 (모든 페이지 상단)
- **VideoPlayer**: YouTube/Upload/NAS 비디오 재생 (Archive 페이지)
- **HandListAccordion**: 핸드 목록 Accordion
- **HandHistoryDetail**: 핸드 상세 정보 (좋아요, 댓글, 북마크)
- **FilterPanel**: 고급 검색 필터 패널 (Search 페이지)

### 홈페이지 컴포넌트
- **HeroSection**: 영상 분석 시작 UI
- **RecentAnalyses**: 최근 분석 결과 카드
- **MostUsedVideos**: 인기 영상 표시
- **OnThisDay**: 역사적 포커 이벤트

### 다이얼로그 컴포넌트
- **AnalyzeDialog**: 영상 분석 다이얼로그
- **BookmarkDialog**: 북마크 추가/수정
- **ClaimPlayerDialog**: 플레이어 클레임
- **HandSearchDialog**: 커뮤니티 핸드 첨부 (4단계 선택)
- **ShareHandDialog**: 핸드 공유 (SNS, 링크, 임베드)

### 기타 컴포넌트
- **PlayerCharts**: 플레이어 차트 (Recharts, 동적 임포트)
- **HandComments**: 핸드 댓글 시스템 (재귀적 답글)

---

## 🎨 타이포그래피 시스템

### 제목 클래스
- `.text-title-lg` (24px, Bold) - 페이지 메인 제목
- `.text-title` (18px, Semibold) - 섹션 제목

### 본문 클래스
- `.text-body-lg` (16px) - 큰 본문
- `.text-body` (14px) - 기본 본문

### 캡션 클래스
- `.text-caption-lg` (14px) - 큰 캡션
- `.text-caption` (12px) - 작은 텍스트

### 색상 클래스
- `.text-foreground` - 기본 텍스트
- `.text-muted-foreground` - 보조 텍스트
- `.text-primary` - 브랜드 컬러 텍스트
- `.text-destructive` - 에러/삭제 텍스트

---

## 🔄 상태 관리 패턴

### 로딩 상태
```tsx
{loading ? <p className="text-body text-muted-foreground">Loading...</p> : <Content />}
```

### 에러 상태
```tsx
toast.error('Failed to load data')
```

### 빈 상태
```tsx
{items.length === 0 && <p className="text-body text-muted-foreground">No items found</p>}
```

---

## 🎯 반응형 디자인

### 브레이크포인트
- **모바일**: `< 768px`
- **태블릿**: `768px - 1024px` (md:)
- **데스크톱**: `> 1024px` (lg:)

### 그리드 패턴
```tsx
// 1열 → 2열 → 3열
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### 플렉스 패턴
```tsx
// 세로 → 가로
<div className="flex flex-col md:flex-row gap-4">
```

---

## 🎨 색상 팔레트

### Primary Colors
- `bg-primary` - 브랜드 메인 컬러
- `bg-primary/10` - 10% 투명도
- `bg-gradient-to-r from-primary to-purple-600` - 그라데이션

### Background Colors
- `bg-background` - 메인 배경
- `bg-card` - 카드 배경
- `bg-muted` - 비활성 배경

### Border Colors
- `border-border` - 기본 보더
- `border-primary` - 강조 보더

---

## 📱 아이콘 사용 가이드

### 자주 사용되는 아이콘 (Lucide React)
- `Search`, `Star`, `Play`, `Plus`, `ArrowLeft`
- `Loader2` (animate-spin), `CheckCircle2`, `Users`, `Clock`, `TrendingUp`

### 아이콘 크기
- `h-3 w-3` (12px), `h-4 w-4` (16px), `h-5 w-5` (20px), `h-6 w-6` (24px)

---

## 🔧 개발 팁

### 1. 컴포넌트 재사용
동일한 UI 패턴이 반복되면 커스텀 컴포넌트로 분리

### 2. 일관성 유지
- 동일한 용도에는 동일한 컴포넌트 사용
- 색상, 간격, 크기는 Tailwind 클래스 재사용

### 3. 접근성
- 버튼에 적절한 aria-label 추가
- 폼 요소에 Label 연결
- 키보드 네비게이션 지원

### 4. 성능 최적화
- 큰 목록은 ScrollArea 사용
- 이미지는 Next.js Image 컴포넌트 사용
- 무거운 컴포넌트는 lazy loading

---

**마지막 업데이트**: 2025-10-16
