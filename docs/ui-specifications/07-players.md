# 플레이어 목록 페이지 (Players List Page)

## 📄 페이지 정보

- **라우트**: `/players`
- **파일**: `app/players/page.tsx`
- **목적**: 프로 포커 플레이어 목록 표시
- **접근 권한**: 공개

---

## 🏗 UI 구조

```
PlayersPage (/players)
├── Header
├── Page Title
│
├── Search Card
│   └── Search Input (icon left)
│
└── Players Grid (3 columns)
    └── Player Card (link to /players/{id})
        ├── Avatar (h-16 w-16)
        ├── Name
        ├── Country Badge
        └── Stats
            ├── Total Winnings (with TrendingUp icon)
            └── {n} hands in archive
```

---

## 🔄 데이터 로딩 (최적화)

```tsx
const loadPlayers = async () => {
  const playersData = await fetchPlayersWithHandCount()
  setPlayers(playersData)
}
```

---

## 📱 반응형

- **모바일**: 1열 (`grid-cols-1`)
- **태블릿**: 2열 (`md:grid-cols-2`)
- **데스크톱**: 3열 (`lg:grid-cols-3`)

---

**라우트**: `/players`
**마지막 업데이트**: 2025-10-05
