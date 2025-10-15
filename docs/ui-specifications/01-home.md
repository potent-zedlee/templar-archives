# 홈페이지 (Home Page)

## 📄 페이지 정보

- **라우트**: `/`
- **파일**: `app/page.tsx`
- **목적**: 사용자를 환영하고 영상 분석을 시작할 수 있는 메인 페이지
- **접근 권한**: 공개 (인증 불필요)

---

## 🎯 사용자 시나리오

### 주요 시나리오
1. **아카이브 탐색**
   - "아카이브 탐색" 버튼 클릭 → `/archive` 페이지로 이동
   - 토너먼트 영상 및 핸드 히스토리 탐색

2. **핸드 검색**
   - "핸드 검색" 버튼 클릭 → `/search` 페이지로 이동
   - 고급 필터를 사용한 핸드 검색

3. **최근 분석 결과 확인**
   - 커뮤니티의 최근 분석 카드 탐색

4. **인기 영상 탐색**
   - 가장 많이 사용된 영상 확인

---

## 🏗 UI 컴포넌트 구조

### 컴포넌트 트리
```
HomePage (/)
├── Header
│   ├── Logo
│   └── Navigation Links
│       ├── Archive
│       ├── Hands
│       ├── Search
│       ├── Players
│       └── Community
│
├── HeroSection (메인 영역)
│   ├── 제목 & 설명
│   └── Action Buttons
│       ├── "아카이브 탐색" (Primary CTA)
│       └── "핸드 검색" (Secondary CTA)
│
├── RecentAnalyses (최근 분석)
│   ├── Section Title
│   └── Card Grid (3 columns)
│       └── Analysis Card
│           ├── Thumbnail
│           ├── Badges (핸드 수, 승률)
│           ├── Title
│           └── Date
│
├── MostUsedVideos (인기 영상)
│   ├── Section Title
│   └── Video Cards
│
└── OnThisDay (역사)
    ├── Section Title
    └── Historical Events
```

---

## 🎨 레이아웃 상세

### 1. HeroSection (상단 히어로)
- **배경**: 그라데이션 (primary → purple) + radial gradient
- **패딩**: `py-20 md:py-28`
- **최대 너비**: `max-w-3xl` (중앙 정렬)

#### UI 요소
```tsx
// 제목
<h1 className="text-4xl sm:text-5xl md:text-6xl font-bold">
  YouTube 포커 영상을 <span className="gradient-text">핸드 히스토리로</span>
</h1>

// CTA 버튼
<Button
  onClick={() => router.push("/archive")}
  className="h-12 bg-gradient-to-r from-primary to-purple-600"
>
  <Play className="mr-2 h-4 w-4" />
  아카이브 탐색
</Button>

<Button
  onClick={() => router.push("/search")}
  variant="outline"
  className="h-12"
>
  핸드 검색
</Button>
```

### 2. RecentAnalyses (최근 분석)
- **레이아웃**: 3-column grid
- **반응형**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **간격**: `gap-6`

#### Analysis Card 구조
```tsx
<Card className="group hover:border-primary/50 hover:shadow-lg">
  {/* 썸네일 */}
  <div className="relative aspect-video">
    <Image src={thumbnail} fill className="object-cover" />
    <div className="absolute bottom-3 left-3 flex gap-2">
      <Badge>{hands} 핸드</Badge>
      <Badge className="bg-green-500">
        <TrendingUp /> {winRate}
      </Badge>
    </div>
  </div>

  {/* 콘텐츠 */}
  <CardContent className="p-4">
    <h3>{title}</h3>
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4" />
      <span>{date}</span>
    </div>
  </CardContent>
</Card>
```

### 3. MostUsedVideos (인기 영상)
- **위치**: RecentAnalyses 아래
- **기능**: 가장 많이 분석된 영상 표시

### 4. OnThisDay (역사)
- **위치**: 페이지 하단
- **기능**: 포커 역사상 오늘 일어난 주요 이벤트

---

## 🔄 인터랙션

### 1. 네비게이션
- **아카이브 탐색** → `/archive`
- **핸드 검색** → `/search`
- **Analysis Card 클릭** → 해당 분석 결과 페이지 (미구현)

### 2. Hover 효과
```tsx
// Card hover
className="group hover:border-primary/50 hover:shadow-lg transition-all"

// 이미지 zoom
className="transition-transform group-hover:scale-105"
```

---

## 📊 데이터

### RecentAnalyses Mock 데이터
```tsx
const recentAnalyses = [
  {
    id: 1,
    title: "WSOP 2024 Main Event - Final Table Analysis",
    thumbnail: "/poker-tournament-final-table.jpg",
    date: "2024년 3월 15일",
    hands: 47,
    winRate: "+12.5%",
  },
  // ...
]
```

### 미래 구현 (Supabase)
```tsx
// 최근 분석된 영상 목록
const { data } = await supabase
  .from('analysis_history')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(3)
```

---

## 📱 반응형 디자인

### 모바일 (< 768px)
- 버튼: 세로 배치 (`flex-col`), 전체 너비
- RecentAnalyses: 1열 (`grid-cols-1`)

### 태블릿 (768px - 1024px)
- 버튼: 가로 배치 (`sm:flex-row`)
- RecentAnalyses: 2열 (`md:grid-cols-2`)

### 데스크톱 (> 1024px)
- HeroSection: `max-w-3xl` 중앙 정렬
- RecentAnalyses: 3열 (`lg:grid-cols-3`)

---

## 🎨 스타일 상세

### 그라데이션 배경
```tsx
<div className="relative">
  {/* 기본 그라데이션 */}
  <div className="absolute inset-0 bg-gradient-to-b from-background to-background/80" />

  {/* 오버레이 그라데이션 */}
  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-600/10" />

  {/* Radial 그라데이션 */}
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
</div>
```

### 타이포그래피
- **메인 제목**: `text-4xl sm:text-5xl md:text-6xl font-bold`
- **서브 제목**: `text-body-lg text-muted-foreground`
- **캡션**: `text-caption text-muted-foreground`

### 색상
- **Primary CTA**: `bg-gradient-to-r from-primary to-purple-600`
- **Secondary CTA**: `variant="outline"`
- **Accent**: `text-primary`

---

## ✅ 접근성

- ✅ 모든 인터랙티브 요소에 키보드 접근 가능
- ✅ Enter 키로 분석 시작 가능
- ✅ 버튼 비활성 상태 명확 (disabled)
- ✅ 충분한 색상 대비
- ✅ 의미있는 placeholder 텍스트

---

## 🔍 SEO 최적화

```tsx
// metadata (app/page.tsx)
export const metadata = {
  title: "GGVault - AI 기반 포커 영상 분석",
  description: "YouTube 포커 영상을 핸드 히스토리로 자동 변환. GPT-4 Vision 기반 분석.",
  keywords: ["포커", "핸드 히스토리", "영상 분석", "GGPoker", "PokerStars"]
}
```

---

## 🚀 성능 최적화

1. **이미지 최적화**: Next.js Image 컴포넌트 사용
2. **lazy loading**: RecentAnalyses 카드 이미지
3. **코드 스플리팅**: 각 컴포넌트 분리 (HeroSection, RecentAnalyses 등)

---

## 📝 개선 예정

- [ ] 실제 분석 이력 데이터 연동 (Supabase)
- [ ] 로그인 사용자별 맞춤 추천
- [ ] 분석 통계 대시보드 추가
- [ ] 애니메이션 효과 (Framer Motion)

---

**라우트**: `/`
**마지막 업데이트**: 2025-10-05
