"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { StaggerContainer, StaggerItem } from "@/components/page-transition"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { MessageSquare, TrendingUp, Clock, Star, ThumbsUp, Link2, X } from "lucide-react"
import Link from "next/link"
import { fetchPosts, togglePostLike, type Post } from "@/lib/supabase-community"
import { toast } from "sonner"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { ErrorBoundary } from "@/components/error-boundary"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPost } from "@/lib/supabase-community"
import { CommunitySearchBar } from "@/components/community-search-bar"
import { CommunityFilters } from "@/components/community-filters"
import { useAuth } from "@/components/auth-provider"
import { ReportButton } from "@/components/report-button"

// Dynamic imports for heavy components
const PopularPostsSidebar = dynamic(
  () => import("@/components/popular-posts-sidebar").then(mod => ({ default: mod.PopularPostsSidebar })),
  {
    ssr: false,
    loading: () => <CardSkeleton count={3} variant="compact" />
  }
)

const HandSearchDialog = dynamic(
  () => import("@/components/hand-search-dialog").then(mod => ({ default: mod.HandSearchDialog })),
  {
    ssr: false
  }
)

const categoryColors: Record<Post['category'], string> = {
  "analysis": "bg-blue-500/10 text-blue-500",
  "strategy": "bg-green-500/10 text-green-500",
  "hand-review": "bg-purple-500/10 text-purple-500",
  "general": "bg-gray-500/10 text-gray-500"
}

export default function communityClient() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"trending" | "recent" | "popular">("trending")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // New post form
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newCategory, setNewCategory] = useState<Post['category']>("general")

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

  // React Query: Fetch posts
  const { data: posts = [], isLoading: loading } = useQuery({
    queryKey: ['posts', activeTab, searchQuery, filterCategory, dateFrom, dateTo],
    queryFn: () => fetchPosts({
      sortBy: activeTab,
      searchQuery: searchQuery || undefined,
      category: filterCategory,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined
    }),
    staleTime: 30 * 1000, // 30초
  })

  const handleResetFilters = useCallback(() => {
    setSearchQuery("")
    setFilterCategory(undefined)
    setDateFrom("")
    setDateTo("")
  }, [])

  const handleCategoryClick = useCallback((category: Post['category']) => {
    setFilterCategory(category)
    setShowFilters(true)
  }, [])

  // React Query: Toggle like mutation
  const likeMutation = useMutation({
    mutationFn: ({ postId, userId }: { postId: string; userId: string }) =>
      togglePostLike(postId, userId),
    onMutate: async ({ postId }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['posts'] })
      const previousPosts = queryClient.getQueryData(['posts', activeTab, searchQuery, filterCategory, dateFrom, dateTo])

      queryClient.setQueryData(
        ['posts', activeTab, searchQuery, filterCategory, dateFrom, dateTo],
        (old: Post[] = []) =>
          old.map(p =>
            p.id === postId
              ? { ...p, likes_count: p.likes_count + 1 }
              : p
          )
      )

      return { previousPosts }
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(
        ['posts', activeTab, searchQuery, filterCategory, dateFrom, dateTo],
        context?.previousPosts
      )
      toast.error('Failed to toggle like')
    },
  })

  const handleLike = useCallback((postId: string) => {
    if (!user) {
      toast.error('Login required')
      return
    }
    likeMutation.mutate({ postId, userId: user.id })
  }, [user, likeMutation])

  // React Query: Create post mutation
  const createPostMutation = useMutation({
    mutationFn: createPost,
    onSuccess: (newPost) => {
      queryClient.setQueryData(
        ['posts', activeTab, searchQuery, filterCategory, dateFrom, dateTo],
        (old: Post[] = []) => [newPost, ...old]
      )
      toast.success('Post created successfully!')
      setIsDialogOpen(false)
      setNewTitle("")
      setNewContent("")
      setNewCategory("general")
      setSelectedHand(null)
    },
    onError: () => {
      toast.error('Failed to create post')
    },
  })

  const handleCreatePost = useCallback(() => {
    if (!user) {
      toast.error('Login required')
      return
    }

    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    createPostMutation.mutate({
      title: newTitle,
      content: newContent,
      category: newCategory,
      author_id: user.id,
      hand_id: selectedHand?.id
    })
  }, [user, newTitle, newContent, newCategory, selectedHand, createPostMutation])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main id="main-content" role="main">
        <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
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
            <Card className="p-4 dark:bg-gray-800 dark:border-gray-700">
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                if (!user && open) {
                  toast.error('Login required')
                  return
                }
                setIsDialogOpen(open)
              }}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="lg">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Create new post
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-gray-100">Create new post</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4 bg-white dark:bg-gray-900">
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
                      <Label className="text-gray-900 dark:text-gray-100">Attach hand (optional)</Label>
                      {selectedHand ? (
                        <Card className="p-3 relative bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-900 dark:text-gray-100"
                            onClick={() => setSelectedHand(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div className="pr-8">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">#{selectedHand.number}</Badge>
                              <Link2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {selectedHand.tournament} &gt; {selectedHand.day}
                            </p>
                            {selectedHand.description && (
                              <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 line-clamp-1">{selectedHand.description}</p>
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
                          Attach hand
                        </Button>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={createPostMutation.isPending}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreatePost} disabled={createPostMutation.isPending}>
                        {createPostMutation.isPending ? 'Creating...' : 'Create post'}
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

            {/* Tabs: 모바일 스크롤 */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('trending')}
                  className={`px-6 py-3 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                    activeTab === 'trending'
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <TrendingUp className="inline-block h-4 w-4 mr-2" />
                  Trending
                </button>
                <button
                  onClick={() => setActiveTab('recent')}
                  className={`px-6 py-3 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                    activeTab === 'recent'
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Clock className="inline-block h-4 w-4 mr-2" />
                  Recent
                </button>
                <button
                  onClick={() => setActiveTab('popular')}
                  className={`px-6 py-3 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                    activeTab === 'popular'
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Star className="inline-block h-4 w-4 mr-2" />
                  Popular
                </button>
              </div>

              <TabsContent value={activeTab} className="mt-6 space-y-4">
                {loading ? (
                  <CardSkeleton count={5} variant="compact" />
                ) : posts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex justify-center mb-4">
                      <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <MessageSquare className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No posts yet</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Be the first to create a post in the community!
                    </p>
                    <Button onClick={() => setIsDialogOpen(true)}>
                      Create first post
                    </Button>
                  </div>
                ) : (
                  <StaggerContainer staggerDelay={0.1}>
                    {posts.map((post) => (
                      <StaggerItem key={post.id}>
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200">
                          <div className="flex gap-4">
                        <Avatar className="h-12 w-12 rounded-full">
                          <AvatarImage src={post.author_avatar} alt={post.author_name} />
                          <AvatarFallback className="rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-semibold">
                            {post.author_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                {post.title}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <span>{post.author_name}</span>
                                <span>•</span>
                                <span>{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                            </div>
                            <Badge className={categoryColors[post.category]}>
                              {post.category.replace('-', ' ')}
                            </Badge>
                          </div>

                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-4">
                            {post.content}
                          </p>

                          {/* Attached Hand */}
                          {post.hand && (
                            <div className="mb-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">#{post.hand.number}</span>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">{post.hand.timestamp}</span>
                                  </div>
                                  {post.hand.description && (
                                    <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1">{post.hand.description}</p>
                                  )}
                                </div>
                                <Link
                                  href={`/archive?hand=${post.hand.id}`}
                                  className="px-3 py-1 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                  View
                                </Link>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() => handleLike(post.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-400"
                            >
                              <ThumbsUp className="w-4 h-4" />
                              <span className="font-mono">{post.likes_count}</span>
                            </button>

                            <Link href={`/community/${post.id}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-400">
                              <MessageSquare className="w-4 h-4" />
                              <span className="font-mono">{post.comments_count}</span>
                            </Link>

                            <div className="ml-auto">
                              <ReportButton postId={post.id} variant="ghost" size="sm" />
                            </div>
                          </div>
                        </div>
                      </div>
                        </div>
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Hidden on mobile */}
          <div className="hidden lg:block">
            <PopularPostsSidebar onCategoryClick={handleCategoryClick} />
          </div>
        </div>
        </div>
      </main>
    </div>
    </ErrorBoundary>
  )
}
