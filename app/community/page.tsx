"use client"
import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, TrendingUp, Clock, Star, Users, Award, ThumbsUp, Link2, X } from "lucide-react"
import Link from "next/link"
import { fetchPosts, togglePostLike, type Post } from "@/lib/supabase-community"
import { toast } from "sonner"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { EmptyState } from "@/components/empty-state"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPost } from "@/lib/supabase-community"
import { HandSearchDialog } from "@/components/hand-search-dialog"
import { CommunitySearchBar } from "@/components/community-search-bar"
import { CommunityFilters } from "@/components/community-filters"
import { PopularPostsSidebar } from "@/components/popular-posts-sidebar"
import { useAuth } from "@/components/auth-provider"
import { ReportButton } from "@/components/report-button"

const categoryColors: Record<Post['category'], string> = {
  "analysis": "bg-blue-500/10 text-blue-500",
  "strategy": "bg-green-500/10 text-green-500",
  "hand-review": "bg-purple-500/10 text-purple-500",
  "general": "bg-gray-500/10 text-gray-500"
}

export default function communityClient() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<"trending" | "recent" | "popular">("trending")
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // New post form
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newCategory, setNewCategory] = useState<Post['category']>("general")
  const [newAuthorName, setNewAuthorName] = useState("")
  const [creating, setCreating] = useState(false)

  // Hand attachment
  const [selectedHand, setSelectedHand] = useState<{
    id: string
    number: string
    description: string
    tournament: string
    day: string
  } | null>(null)
  const [isHandSearchOpen, setIsHandSearchOpen] = useState(false)

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filterCategory, setFilterCategory] = useState<Post['category'] | undefined>(undefined)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  useEffect(() => {
    loadPosts()
  }, [activeTab, searchQuery, filterCategory, dateFrom, dateTo])

  async function loadPosts() {
    setLoading(true)
    try {
      const data = await fetchPosts({
        sortBy: activeTab,
        searchQuery: searchQuery || undefined,
        category: filterCategory,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      })
      setPosts(data)
    } catch (error) {
      console.error('Error loading posts:', error)
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  function handleResetFilters() {
    setSearchQuery("")
    setFilterCategory(undefined)
    setDateFrom("")
    setDateTo("")
  }

  function handleCategoryClick(category: Post['category']) {
    setFilterCategory(category)
    setShowFilters(true)
  }

  async function handleLike(postId: string) {
    if (!user) {
      toast.error('로그인이 필요합니다')
      return
    }

    try {
      const liked = await togglePostLike(postId, user.id)
      // Update local state
      setPosts(posts.map(p =>
        p.id === postId
          ? { ...p, likes_count: p.likes_count + (liked ? 1 : -1) }
          : p
      ))
    } catch (error) {
      console.error('Error toggling like:', error)
      toast.error('Failed to toggle like')
    }
  }

  async function handleCreatePost() {
    if (!user) {
      toast.error('Login이 필요합니다')
      return
    }

    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setCreating(true)
    try {
      await createPost({
        title: newTitle,
        content: newContent,
        category: newCategory,
        author_id: user.id,
        hand_id: selectedHand?.id
      })

      toast.success('Post created successfully!')
      setIsDialogOpen(false)
      setNewTitle("")
      setNewContent("")
      setNewAuthorName("")
      setNewCategory("general")
      setSelectedHand(null)
      loadPosts()
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Failed to create post')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="mb-8">
          <h1 className="text-title-lg mb-2">Community Forum</h1>
          <p className="text-body-lg text-muted-foreground">
            Discuss hands, share strategies, and learn from the community
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search Bar */}
            <CommunitySearchBar
              onSearch={setSearchQuery}
              onToggleFilters={() => setShowFilters(!showFilters)}
              showFilters={showFilters}
              initialValue={searchQuery}
            />

            {/* Filters */}
            {showFilters && (
              <CommunityFilters
                selectedCategory={filterCategory}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onCategoryChange={setFilterCategory}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                onReset={handleResetFilters}
              />
            )}

            {/* Create Post Button */}
            <Card className="p-4">
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                if (!user && open) {
                  toast.error('Login이 필요합니다')
                  return
                }
                setIsDialogOpen(open)
              }}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="lg">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Create New Post
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Post</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        placeholder="Enter post title"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={newCategory} onValueChange={(v) => setNewCategory(v as Post['category'])}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="analysis">Analysis</SelectItem>
                          <SelectItem value="strategy">Strategy</SelectItem>
                          <SelectItem value="hand-review">Hand Review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        placeholder="Write your post content..."
                        rows={8}
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                      />
                    </div>

                    {/* Hand Attachment */}
                    <div className="space-y-2">
                      <Label>Attach Hand (Optional)</Label>
                      {selectedHand ? (
                        <Card className="p-3 relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 h-6 w-6 p-0"
                            onClick={() => setSelectedHand(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div className="pr-8">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge>#{selectedHand.number}</Badge>
                              <Link2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-caption text-muted-foreground">
                              {selectedHand.tournament} &gt; {selectedHand.day}
                            </p>
                            {selectedHand.description && (
                              <p className="text-body mt-1 line-clamp-1">{selectedHand.description}</p>
                            )}
                          </div>
                        </Card>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => setIsHandSearchOpen(true)}
                          className="w-full"
                          type="button"
                        >
                          <Link2 className="mr-2 h-4 w-4" />
                          Attach Hand
                        </Button>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={creating}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreatePost} disabled={creating}>
                        {creating ? 'Creating...' : 'Create Post'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Hand Search Dialog */}
              <HandSearchDialog
                open={isHandSearchOpen}
                onOpenChange={setIsHandSearchOpen}
                onSelect={(hand) => {
                  setSelectedHand(hand)
                  setIsHandSearchOpen(false)
                }}
              />
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="trending" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Trending
                </TabsTrigger>
                <TabsTrigger value="recent" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Recent
                </TabsTrigger>
                <TabsTrigger value="popular" className="gap-2">
                  <Star className="h-4 w-4" />
                  Popular
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6 space-y-4">
                {loading ? (
                  <CardSkeleton count={5} variant="compact" />
                ) : posts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex justify-center mb-4">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <MessageSquare className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </div>
                    <h3 className="text-title mb-2">아직 포스트가 없습니다</h3>
                    <p className="text-body text-muted-foreground mb-6">
                      Community의 첫 번째 포스트를 작성해보세요!
                    </p>
                    <Button onClick={() => setIsDialogOpen(true)}>
                      첫 포스트 작성하기
                    </Button>
                  </div>
                ) : (
                  posts.map((post) => (
                    <Card key={post.id} className="p-6 hover:bg-muted/30 transition-colors">
                      <div className="flex gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={post.author_avatar} alt={post.author_name} />
                          <AvatarFallback>{post.author_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              <h3 className="text-body font-semibold mb-1">
                                {post.title}
                              </h3>
                              <div className="flex items-center gap-2 text-caption text-muted-foreground">
                                <span>{post.author_name}</span>
                                <span>•</span>
                                <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                              </div>
                            </div>
                            <Badge className={categoryColors[post.category]}>
                              {post.category.replace('-', ' ')}
                            </Badge>
                          </div>

                          <p className="text-body text-muted-foreground line-clamp-2 mb-3">
                            {post.content}
                          </p>

                          {/* Attached Hand */}
                          {post.hand && (
                            <Card className="p-3 mb-3 bg-muted/30">
                              <div className="flex items-center gap-2">
                                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary">#{post.hand.number}</Badge>
                                    <span className="text-caption text-muted-foreground">{post.hand.timestamp}</span>
                                  </div>
                                  {post.hand.description && (
                                    <p className="text-caption line-clamp-1">{post.hand.description}</p>
                                  )}
                                </div>
                                <Link
                                  href={`/archive?hand=${post.hand.id}`}
                                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                                >
                                  View
                                </Link>
                              </div>
                            </Card>
                          )}

                          <div className="flex items-center gap-4 text-caption text-muted-foreground">
                            <button
                              onClick={() => handleLike(post.id)}
                              className="flex items-center gap-1 hover:text-primary transition-colors"
                            >
                              <ThumbsUp className="h-4 w-4" />
                              <span>{post.likes_count}</span>
                            </button>
                            <Link href={`/community/${post.id}`}>
                              <button className="flex items-center gap-1 hover:text-primary transition-colors">
                                <MessageSquare className="h-4 w-4" />
                                <span>{post.comments_count}</span>
                              </button>
                            </Link>
                            <ReportButton postId={post.id} variant="ghost" size="sm" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <PopularPostsSidebar onCategoryClick={handleCategoryClick} />
        </div>
      </div>
    </div>
  )
}
