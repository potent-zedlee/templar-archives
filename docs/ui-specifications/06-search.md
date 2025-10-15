# 검색 페이지 (Search Page)

## 📄 페이지 정보

- **라우트**: `/search`
- **파일**: `app/search/page.tsx`
- **목적**: 고급 필터로 핸드 검색
- **접근 권한**: 공개

---

## 🎯 주요 기능

1. **자연어 검색** (Description, Player name)
2. **고급 필터 패널** (슬라이드인 형식)
   - 플레이어 검색
   - 카드 필터
   - 커뮤니티 카드
   - 액션 선택 (Fold/Call/Raise/All-in)
   - 포지션 선택 (Early/Middle/Late/SB/BB/BTN)
   - 팟 사이즈 범위
   - 스테이크 레벨
3. **기본 필터**
   - Tournament 선택
   - Player 선택
   - Favorites Only
   - Date Range
4. **검색 결과 테이블**

---

## 🏗 UI 구조

```
SearchPage (/search)
├── Header
├── FilterPanel (슬라이드인 오버레이)
│   ├── Overlay (backdrop-blur)
│   └── Panel (w-96, slide from left)
│       ├── Header ("고급 필터" + Close Button)
│       ├── ScrollArea
│       │   ├── 플레이어 섹션
│       │   ├── 카드 섹션
│       │   ├── 커뮤니티 카드 섹션
│       │   ├── 액션 섹션
│       │   ├── 포지션 섹션
│       │   ├── 팟 사이즈 섹션
│       │   └── 스테이크 섹션
│       └── Footer (초기화/적용 버튼)
│
├── Page Title
│
├── Search & Filters Card
│   ├── Search Input Row
│   │   ├── Filter Button (opens FilterPanel)
│   │   └── Search Input (with Sparkles icon)
│   │       └── Placeholder: "Try 'AA vs KK' or player name..."
│   │
│   ├── Filters Row (4 columns)
│   │   ├── Tournament Select
│   │   ├── Player Select
│   │   ├── Date From
│   │   └── Date To
│   │
│   └── Additional Filters
│       ├── Favorites Only Button (toggleable)
│       ├── Clear Filters Button
│       └── Search Button (primary)
│
└── Results Card
    ├── "{n} Hands Found"
    └── ScrollArea (h-600px)
        └── Table (same as Hands page)
```

---

## 🔄 검색 로직

```tsx
const searchHands = async () => {
  const { hands } = await fetchHandsWithDetails({
    limit: 100,
    favoriteOnly
  })

  // Client-side filtering
  let filtered = hands

  if (searchQuery.trim()) {
    filtered = filtered.filter(hand =>
      hand.description.toLowerCase().includes(searchQuery) ||
      hand.player_names?.some(name => name.toLowerCase().includes(searchQuery))
    )
  }

  if (selectedTournament !== 'all') {
    filtered = filtered.filter(hand =>
      hand.tournament_name?.includes(selectedTournament)
    )
  }

  if (selectedPlayer !== 'all') {
    filtered = filtered.filter(hand =>
      hand.player_names?.includes(selectedPlayer)
    )
  }

  setHands(filtered)
}
```

---

**라우트**: `/search`
**마지막 업데이트**: 2025-10-05
