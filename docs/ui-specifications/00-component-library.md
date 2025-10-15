# Component Library - GGVault

GGVault 프로젝트에서 사용하는 모든 UI 컴포넌트에 대한 종합 가이드입니다.

## 📦 UI 라이브러리

- **기반**: [shadcn/ui](https://ui.shadcn.com/)
- **스타일링**: Tailwind CSS
- **아이콘**: Lucide React
- **알림**: Sonner (Toast)

---

## 🎨 주요 컴포넌트

### 1. 레이아웃 컴포넌트

#### Card
```tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
```
- **사용처**: 모든 페이지에서 콘텐츠 그룹핑
- **변형**: 기본, hover 효과, 보더 강조
- **예시**:
  ```tsx
  <Card className="p-6">
    <CardHeader>
      <CardTitle>Title</CardTitle>
    </CardHeader>
    <CardContent>Content here</CardContent>
  </Card>
  ```

#### Resizable Panel
```tsx
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
```
- **사용처**: Archive 페이지 (트리뷰 + 영상)
- **기능**: 사용자가 패널 크기 조절 가능

#### Scroll Area
```tsx
import { ScrollArea } from "@/components/ui/scroll-area"
```
- **사용처**: 긴 목록 (Hands, Players)
- **기능**: 커스텀 스크롤바 제공

### 2. 폼 컴포넌트

#### Input
```tsx
import { Input } from "@/components/ui/input"
```
- **사용처**: 검색, URL 입력, 필터
- **변형**: 기본, 아이콘 포함 (left/right)
- **예시**:
  ```tsx
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
    <Input className="pl-10" placeholder="Search..." />
  </div>
  ```

#### Select
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
```
- **사용처**: 필터 (토너먼트, 플레이어 선택)
- **기능**: 드롭다운 선택

#### Checkbox
```tsx
import { Checkbox } from "@/components/ui/checkbox"
```
- **사용처**: 다중 선택 (Archive, Players)

### 3. 네비게이션 컴포넌트

#### Button
```tsx
import { Button } from "@/components/ui/button"
```
- **변형**:
  - `default`: 기본 버튼
  - `outline`: 아웃라인 버튼
  - `ghost`: 배경 없는 버튼
  - `destructive`: 삭제/경고 버튼
- **크기**: `sm`, `default`, `lg`
- **예시**:
  ```tsx
  <Button variant="outline" size="sm">
    <Plus className="mr-2 h-4 w-4" />
    Add
  </Button>
  ```

#### Tabs
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
```
- **사용처**: Community (Trending/Recent/Popular)
- **기능**: 탭 네비게이션

### 4. 데이터 표시 컴포넌트

#### Table
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
```
- **사용처**: Hands, Search 페이지
- **기능**: 데이터 테이블 표시

#### Badge
```tsx
import { Badge } from "@/components/ui/badge"
```
- **변형**: `default`, `secondary`, `outline`, `destructive`
- **사용처**: 카테고리, 플레이어 수, 상태 표시

#### Avatar
```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
```
- **사용처**: Players, Community
- **기능**: 프로필 사진 표시 (fallback 지원)

#### Progress
```tsx
import { Progress } from "@/components/ui/progress"
```
- **사용처**: Analyze 페이지
- **기능**: 진행률 표시 (0-100%)

### 5. 모달/오버레이 컴포넌트

#### Dialog
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
```
- **사용처**: Archive (Tournament/SubEvent/Day 추가)
- **기능**: 모달 다이얼로그

#### Toast (Sonner)
```tsx
import { toast } from "sonner"
```
- **사용처**: 모든 페이지 (성공/에러 알림)
- **기능**:
  ```tsx
  toast.success("Success message")
  toast.error("Error message")
  toast.info("Info message")
  ```

### 6. 특수 컴포넌트

#### Separator
```tsx
import { Separator } from "@/components/ui/separator"
```
- **기능**: 수평/수직 구분선

---

## 🎭 커스텀 컴포넌트

### Header
```tsx
import { Header } from "@/components/header"
```
- **위치**: 모든 페이지 상단
- **기능**: 네비게이션, 로고
- **사용 페이지**: 전체

### VideoPlayer
```tsx
import { VideoPlayer } from "@/components/video-player"
```
- **위치**: Archive 페이지
- **기능**: YouTube/Upload/NAS 비디오 재생
- **Props**: `day` (비디오 소스 정보)

### HeroSection
```tsx
import { HeroSection } from "@/components/hero-section"
```
- **위치**: Home 페이지
- **기능**: 영상 분석 시작 UI
- **포함**: URL 입력, 포커 사이트 선택, CTA 버튼

### MostUsedVideos
```tsx
import { MostUsedVideos } from "@/components/most-used-videos"
```
- **위치**: Home 페이지
- **기능**: 인기 영상 표시

### OnThisDay
```tsx
import { OnThisDay } from "@/components/on-this-day"
```
- **위치**: Home 페이지
- **기능**: 역사적 포커 이벤트 표시

### RecentAnalyses
```tsx
import { RecentAnalyses } from "@/components/recent-analyses"
```
- **위치**: Home 페이지
- **기능**: 최근 분석 결과 카드

---

## 🎨 타이포그래피 시스템

### 제목 클래스
- `text-title-lg`: 32-48px (페이지 메인 제목)
- `text-title`: 24px (섹션 제목)
- `text-body-lg`: 18px (큰 본문)
- `text-body`: 16px (기본 본문)
- `text-caption-lg`: 15px (큰 캡션)
- `text-caption`: 14px (작은 텍스트)

### 색상 클래스
- `text-foreground`: 기본 텍스트
- `text-muted-foreground`: 보조 텍스트
- `text-primary`: 브랜드 컬러 텍스트
- `text-destructive`: 에러/삭제 텍스트

---

## 🔄 상태 관리 패턴

### 로딩 상태
```tsx
{loading ? (
  <div className="text-center py-12">
    <p className="text-body text-muted-foreground">Loading...</p>
  </div>
) : (
  // 콘텐츠
)}
```

### 에러 상태
```tsx
try {
  // API 호출
} catch (error) {
  console.error('Error:', error)
  toast.error('Failed to load data')
}
```

### 빈 상태
```tsx
{items.length === 0 && (
  <div className="text-center py-12">
    <p className="text-body text-muted-foreground">No items found</p>
  </div>
)}
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

// 1열 → 4열
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
```

### 플렉스 패턴
```tsx
// 세로 → 가로
<div className="flex flex-col md:flex-row gap-4">
```

---

## 🎨 색상 팔레트

### Primary Colors
- `bg-primary`: 브랜드 메인 컬러
- `bg-primary/10`: 10% 투명도
- `bg-gradient-to-r from-primary to-purple-600`: 그라데이션

### Background Colors
- `bg-background`: 메인 배경
- `bg-card`: 카드 배경
- `bg-muted`: 비활성 배경
- `bg-muted/30`: 30% 투명도

### Border Colors
- `border-border`: 기본 보더
- `border-primary`: 강조 보더
- `border-primary/50`: 50% 투명도

---

## 📱 아이콘 사용 가이드

### 자주 사용되는 아이콘
```tsx
import {
  Search,      // 검색
  Star,        // 즐겨찾기
  Play,        // 재생
  Plus,        // 추가
  ArrowLeft,   // 뒤로가기
  Loader2,     // 로딩 (animate-spin)
  CheckCircle2,// 성공
  Users,       // 사용자
  Clock,       // 시간
  TrendingUp,  // 상승
} from "lucide-react"
```

### 아이콘 크기
- `h-3 w-3`: 12px (작은 아이콘)
- `h-4 w-4`: 16px (기본)
- `h-5 w-5`: 20px (중간)
- `h-6 w-6`: 24px (큰 아이콘)

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

**마지막 업데이트**: 2025-10-05
