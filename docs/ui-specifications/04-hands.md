# 핸드 목록 페이지 (Hands List Page)

## 📄 페이지 정보

- **라우트**: `/hands`
- **파일**: `app/hands/page.tsx`
- **목적**: 모든 핸드 목록을 테이블 형식으로 표시 및 필터링
- **접근 권한**: 공개

---

## 🎯 주요 기능

1. **핸드 목록 표시** (Table)
2. **검색** (Description, Tournament 검색)
3. **필터** (All Hands / Favorites)
4. **페이지네이션** (20개씩)
5. **즐겨찾기 토글** (Optimistic Updates)

---

## 🏗 UI 구조

```
HandsPage (/hands)
├── Header
├── Page Title & Description
│
├── Filters Card
│   ├── Search Input (with icon)
│   └── Filter Buttons
│       ├── All Hands
│       └── Favorites (with Star icon)
│
└── Results Card
    ├── Title ("{n} Hands Found")
    │
    ├── Table
    │   ├── TableHeader
    │   │   ├── [Star column]
    │   │   ├── Hand #
    │   │   ├── Description
    │   │   ├── Tournament
    │   │   ├── Day
    │   │   ├── Players
    │   │   ├── Time
    │   │   └── Actions
    │   │
    │   └── TableBody
    │       └── Row (hover effect)
    │           ├── Star Button (toggle)
    │           ├── Hand Number
    │           ├── Description (line-clamp-1)
    │           ├── Tournament + Day
    │           ├── Player Count Badge
    │           ├── Timestamp
    │           └── View Button (Link to /hands/{id})
    │
    └── Pagination (if > 1 page)
        ├── "Page {n} of {total}"
        └── Previous / Next Buttons
```

---

## 🔄 주요 로직

### 데이터 로딩 (최적화)
```tsx
const loadHands = async () => {
  const { hands: handsData, count } = await fetchHandsWithDetails({
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
    favoriteOnly: filter === 'favorites'
  })

  setTotalPages(Math.ceil(count / ITEMS_PER_PAGE))
  setHands(handsData)
}

useEffect(() => {
  loadHands()
}, [filter, page])
```

### Optimistic Updates (즐겨찾기)
```tsx
const toggleFavorite = async (handId) => {
  const hand = hands.find(h => h.id === handId)

  // 즉시 UI 업데이트
  setHands(prev => prev.map(h =>
    h.id === handId ? { ...h, favorite: !h.favorite } : h
  ))

  try {
    await supabase
      .from('hands')
      .update({ favorite: !hand.favorite })
      .eq('id', handId)

    toast.success(hand.favorite ? 'Removed' : 'Added to favorites')
  } catch (error) {
    // 에러 시 롤백
    setHands(prev => prev.map(h =>
      h.id === handId ? { ...h, favorite: hand.favorite } : h
    ))
    toast.error('Failed to update')
  }
}
```

### 검색 필터
```tsx
const filteredHands = searchQuery.trim()
  ? hands.filter(hand =>
      hand.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hand.tournament_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  : hands
```

---

## 📊 Table 구조

### TableRow 상세
```tsx
<TableRow className="cursor-pointer hover:bg-muted/50">
  <TableCell>
    <button onClick={() => toggleFavorite(hand.id)}>
      <Star className={hand.favorite
        ? "fill-yellow-400 text-yellow-400"
        : "text-muted-foreground hover:text-yellow-400"
      } />
    </button>
  </TableCell>
  <TableCell className="font-medium">{hand.number}</TableCell>
  <TableCell className="max-w-xs">
    <span className="line-clamp-1">{hand.description}</span>
  </TableCell>
  <TableCell>
    <span className="text-caption">{hand.tournament_name || '-'}</span>
  </TableCell>
  <TableCell>
    <span className="text-caption">{hand.day_name || '-'}</span>
  </TableCell>
  <TableCell>
    <Badge variant="secondary">{hand.player_count || 0}</Badge>
  </TableCell>
  <TableCell className="text-caption text-muted-foreground">
    {hand.timestamp}
  </TableCell>
  <TableCell className="text-right">
    <Link href={`/hands/${hand.id}`}>
      <Button variant="ghost" size="sm">
        <Play className="h-4 w-4 mr-1" />
        View
      </Button>
    </Link>
  </TableCell>
</TableRow>
```

---

## 📱 반응형

- **모바일**: 스크롤 가능한 테이블 (`overflow-x-auto`)
- **Description**: `max-w-xs` + `line-clamp-1`로 텍스트 제한

---

## 🎨 상태별 UI

### 로딩
```tsx
{loading && (
  <div className="text-center py-12">
    <p className="text-body text-muted-foreground">Loading hands...</p>
  </div>
)}
```

### 빈 상태
```tsx
{filteredHands.length === 0 && (
  <div className="text-center py-12">
    <p className="text-body text-muted-foreground">
      No hands found. Try adjusting your filters.
    </p>
  </div>
)}
```

---

**라우트**: `/hands`
**마지막 업데이트**: 2025-10-05
