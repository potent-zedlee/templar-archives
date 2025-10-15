# 핸드 상세 페이지 (Hand Detail Page)

## 📄 페이지 정보

- **라우트**: `/hands/[id]`
- **파일**: `app/hands/[id]/page.tsx`
- **목적**: 개별 핸드의 상세 정보 및 포커 테이블 시각화
- **접근 권한**: 공개

---

## 🏗 UI 구조

```
HandDetailPage (/hands/[id])
├── Header
├── Back Button
│
└── 2-Column Layout (lg:grid-cols-3)
    ├── Main Content (lg:col-span-2)
    │   ├── Hand Info Card
    │   │   ├── Hand #{number}
    │   │   ├── Tournament - Day
    │   │   ├── Timestamp
    │   │   ├── Description
    │   │   └── Stats (Pot, Players, Video Clip)
    │   │
    │   └── Poker Table Card
    │       ├── Board Cards (if available)
    │       ├── Pot Display
    │       ├── Player Position (bottom)
    │       └── Controls (Previous/Play/Next street)
    │       └── Street Badges (Preflop/Flop/Turn/River)
    │
    └── Sidebar (lg:col-span-1)
        ├── Actions Card (if actions text exists)
        │   └── Actions Description
        │
        ├── Players Card
        │   └── Player List
        │       ├── Photo (if available)
        │       ├── Name (link to /players/{id})
        │       ├── Position
        │       └── Cards (if available)
        │
        └── Video Card (if videoUrl exists)
            ├── YouTube Link Button
            └── OR Video Player
```

---

## 🔄 데이터 로딩

```tsx
useEffect(() => {
  loadHand()
}, [params.id])

const loadHand = async () => {
  const handData = await fetchHandDetails(params.id)
  setHand(handData)
}
```

---

## 🎨 포커 테이블 시각화

```tsx
<Card className="bg-gradient-to-br from-green-700 to-green-800">
  {/* Board Cards */}
  {hand.board_cards && (
    <div className="flex gap-2">
      {hand.board_cards.split(',').map(card => (
        <div className="h-20 w-14 bg-white rounded-lg">
          {card.trim()}
        </div>
      ))}
    </div>
  )}

  {/* Pot */}
  <div className="bg-black/30 rounded-lg">
    Pot: ${hand.pot_size}
  </div>

  {/* Player Cards (if first player has cards) */}
  {hand.players[0]?.cards && (
    <div className="absolute bottom-4">
      <p>{hand.players[0].players.name} ({hand.players[0].position})</p>
      <div className="flex gap-1">
        {hand.players[0].cards.split(',').map(card => (
          <div className="h-12 w-9 border-2 border-primary">{card}</div>
        ))}
      </div>
    </div>
  )}
</Card>
```

---

## 📱 플레이어 카드

```tsx
<Card>
  <h2>Players</h2>
  {hand.players?.map(hp => (
    <Link href={`/players/${hp.players.id}`}>
      <div className="flex items-center gap-3 p-2 hover:bg-muted">
        <img src={hp.players.photo_url} className="h-10 w-10 rounded-full" />
        <div>
          <p>{hp.players.name}</p>
          <p className="text-caption">
            {hp.position}
            {hp.cards && ` • ${hp.cards}`}
          </p>
        </div>
      </div>
    </Link>
  ))}
</Card>
```

---

**라우트**: `/hands/[id]`
**마지막 업데이트**: 2025-10-05
