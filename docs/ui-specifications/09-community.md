# 커뮤니티 페이지 (Community Page)

## 📄 페이지 정보

- **라우트**: `/community`
- **파일**: `app/community/page.tsx`
- **목적**: 포커 핸드 토론 및 커뮤니티
- **접근 권한**: 공개

---

## 🏗 UI 구조

```
CommunityPage (/community)
├── Header
├── Page Title
│
└── 2-Column Layout (lg:grid-cols-4)
    ├── Main Content (lg:col-span-3)
    │   ├── Create Post Button
    │   │
    │   ├── Tabs (Trending/Recent/Popular)
    │   │
    │   └── Post List
    │       └── Post Card
    │           ├── Avatar
    │           ├── Author & Date
    │           ├── Category Badge
    │           ├── Title (link to /community/{id})
    │           ├── Content Preview (line-clamp-2)
    │           ├── Hand Badge (if handId)
    │           └── Interaction Stats
    │               ├── Likes (TrendingUp icon)
    │               └── Comments (MessageSquare icon)
    │
    └── Sidebar (lg:col-span-1)
        ├── Community Stats Card
        │   ├── Members
        │   ├── Posts
        │   └── Expert Reviews
        │
        ├── Categories Card
        │   ├── Analysis
        │   ├── Strategy
        │   ├── Hand Review
        │   └── General
        │
        └── Top Contributors Card
            └── User List (with rank)
```

---

## 🎨 Post Card 구조

```tsx
<Card className="hover:bg-muted/30">
  <div className="flex gap-4">
    <Avatar className="h-12 w-12">
      <AvatarImage src={post.authorAvatar} />
    </Avatar>

    <div className="flex-1">
      <Link href={`/community/${post.id}`}>
        <h3 className="hover:text-primary">{post.title}</h3>
      </Link>

      <div className="flex items-center gap-2">
        <span>{post.author}</span>
        <span>•</span>
        <span>{post.createdAt}</span>
      </div>

      <p className="line-clamp-2">{post.content}</p>

      {/* Hand Badge */}
      {post.handId && (
        <Link href={`/hands/${post.handId}`}>
          <Badge><Star /> {post.handDescription}</Badge>
        </Link>
      )}

      {/* Stats */}
      <div className="flex gap-4">
        <button><TrendingUp /> {post.likes}</button>
        <button><MessageSquare /> {post.comments}</button>
      </div>
    </div>

    <Badge className={categoryColors[post.category]}>
      {post.category}
    </Badge>
  </div>
</Card>
```

---

## 🔄 Tabs 정렬

```tsx
const sortedPosts = [...mockPosts].sort((a, b) => {
  if (activeTab === "trending") {
    return (b.likes + b.comments) - (a.likes + a.comments)
  } else if (activeTab === "recent") {
    return new Date(b.createdAt) - new Date(a.createdAt)
  } else { // popular
    return b.likes - a.likes
  }
})
```

---

## 📊 Mock 데이터

```tsx
const mockPosts = [
  {
    id: "1",
    title: "Amazing Bluff with AA - What Would You Do?",
    content: "...",
    author: "Daniel Negreanu",
    handId: "001",
    handDescription: "Daniel Negreanu AA / Phil Ivey KK",
    likes: 45,
    comments: 12,
    createdAt: "2024-10-03",
    category: "hand-review"
  },
  // ...
]
```

---

**라우트**: `/community`
**마지막 업데이트**: 2025-10-05
