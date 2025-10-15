# 플레이어 상세 페이지 (Player Detail Page)

## 📄 페이지 정보

- **라우트**: `/players/[id]`
- **파일**: `app/players/[id]/page.tsx`
- **목적**: 개별 플레이어 정보 및 관련 핸드 목록
- **접근 권한**: 공개

---

## 🏗 UI 구조

```
PlayerDetailPage (/players/[id])
├── Header
├── Back Button
│
├── Player Info Card
│   ├── Avatar (h-24 w-24)
│   ├── Name
│   ├── Country Badge
│   └── Stats (2 columns)
│       ├── Total Winnings (with icon)
│       └── {n} Hands in Archive
│
└── Hands List Card
    └── Hand Items (clickable → /hands/{id})
        ├── Checkbox
        ├── Star (favorite toggle with Optimistic Updates)
        ├── Hand Number
        ├── Description
        └── Timestamp
```

---

## 🔄 Optimistic Updates

```tsx
const toggleFavorite = async (handId) => {
  const hand = hands.find(h => h.id === handId)

  // UI 즉시 업데이트
  setHands(prev => prev.map(h =>
    h.id === handId ? { ...h, favorite: !h.favorite } : h
  ))

  try {
    await supabase.from('hands').update({ favorite: !hand.favorite })
    toast.success(hand.favorite ? 'Removed' : 'Added to favorites')
  } catch (error) {
    // 롤백
    setHands(prev => prev.map(h =>
      h.id === handId ? { ...h, favorite: hand.favorite } : h
    ))
    toast.error('Failed')
  }
}
```

---

**라우트**: `/players/[id]`
**마지막 업데이트**: 2025-10-05
