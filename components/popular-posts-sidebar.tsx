"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, MessageSquare, ThumbsUp, Flame } from "lucide-react"
import Link from "next/link"
import {
  fetchWeeklyPopularPosts,
  fetchBestComments,
  fetchPopularCategories,
  type Post
} from "@/lib/supabase-community"

interface PopularPostsSidebarProps {
  onCategoryClick?: (category: Post['category']) => void
}

const categoryColors: Record<Post['category'], string> = {
  "analysis": "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  "strategy": "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  "hand-review": "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
  "general": "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
}

export function PopularPostsSidebar({ onCategoryClick }: PopularPostsSidebarProps) {
  const [weeklyPosts, setWeeklyPosts] = useState<any[]>([])
  const [bestComments, setBestComments] = useState<any[]>([])
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [posts, comments, cats] = await Promise.all([
        fetchWeeklyPopularPosts(5),
        fetchBestComments(3),
        fetchPopularCategories()
      ])
      setWeeklyPosts(posts)
      setBestComments(comments)
      setCategories(cats)
    } catch (error) {
      console.error('Error loading sidebar data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Weekly Popular Posts */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-5 w-5 text-orange-500" />
          <h3 className="text-title">주간 인기 포스트</h3>
        </div>
        <div className="space-y-3">
          {weeklyPosts.length === 0 ? (
            <p className="text-caption text-muted-foreground text-center py-4">
              아직 포스트가 없습니다
            </p>
          ) : (
            weeklyPosts.map((post, index) => (
              <Link key={post.id} href={`/community/${post.id}`}>
                <div className="p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-2">
                    <span className="text-caption font-bold text-muted-foreground min-w-[20px]">
                      #{index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium line-clamp-2 mb-1">
                        {post.title}
                      </p>
                      <div className="flex items-center gap-2 text-caption text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          <span>{post.likes_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>{post.comments_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </Card>

      {/* Best Comments Today */}
      {bestComments.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <h3 className="text-title">오늘의 베스트 댓글</h3>
          </div>
          <div className="space-y-3">
            {bestComments.map((comment) => (
              <Link key={comment.id} href={`/community/${comment.post_id}`}>
                <div className="p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                  <p className="text-caption line-clamp-2 mb-2">
                    "{comment.content}"
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-muted-foreground">
                      {comment.author_name}
                    </span>
                    <div className="flex items-center gap-1 text-caption text-muted-foreground">
                      <ThumbsUp className="h-3 w-3" />
                      <span>{comment.likes_count}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Popular Categories */}
      <Card className="p-6">
        <h3 className="text-title mb-4">인기 카테고리</h3>
        <div className="space-y-2">
          {categories.map(({ category, count }) => (
            <button
              key={category}
              onClick={() => onCategoryClick?.(category as Post['category'])}
              className={`
                w-full flex items-center justify-between p-2 rounded-md transition-colors text-left
                ${categoryColors[category as Post['category']] || 'hover:bg-muted/50'}
              `}
            >
              <span className="text-body capitalize">
                {category.replace('-', ' ')}
              </span>
              <Badge variant="secondary" className="text-caption">
                {count}
              </Badge>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
