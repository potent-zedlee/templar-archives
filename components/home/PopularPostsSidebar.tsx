"use client"

/**
 * Popular Posts Sidebar
 *
 * 인기 포스트, 베스트 댓글, 인기 카테고리 표시
 * Firestore 버전으로 마이그레이션됨
 */

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, MessageSquare, ThumbsUp, Flame } from "lucide-react"
import Link from "next/link"
import { firestore } from "@/lib/firebase"
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  where,
  Timestamp,
} from "firebase/firestore"
import { COLLECTION_PATHS } from "@/lib/firestore-types"
import type { FirestorePost } from "@/lib/firestore-types"
import type { PostCategory } from "@/lib/queries/community-queries"

interface PopularPostsSidebarProps {
  onCategoryClick?: (category: PostCategory) => void
}

const categoryColors: Record<string, string> = {
  "analysis": "bg-blue-100 text-blue-700 hover:bg-blue-200",
  "strategy": "bg-green-100 text-green-700 hover:bg-green-200",
  "hand-review": "bg-purple-100 text-purple-700 hover:bg-purple-200",
  "general": "bg-gray-100 text-gray-700 hover:bg-gray-200"
}

type DisplayPost = {
  id: string
  title: string
  likesCount: number
  commentsCount: number
}

type DisplayComment = {
  id: string
  postId: string
  content: string
  authorName: string
  likesCount: number
}

export function PopularPostsSidebar({ onCategoryClick }: PopularPostsSidebarProps) {
  const [weeklyPosts, setWeeklyPosts] = useState<DisplayPost[]>([])
  const [bestComments, setBestComments] = useState<DisplayComment[]>([])
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // 주간 인기 포스트 조회
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      const postsRef = collection(firestore, COLLECTION_PATHS.POSTS)
      const postsQuery = query(
        postsRef,
        where('createdAt', '>=', Timestamp.fromDate(oneWeekAgo)),
        orderBy('createdAt', 'desc'),
        limit(5)
      )
      const postsSnap = await getDocs(postsQuery)

      const posts = postsSnap.docs.map((doc) => {
        const data = doc.data() as FirestorePost
        return {
          id: doc.id,
          title: data.title,
          likesCount: data.stats?.likesCount || 0,
          commentsCount: data.stats?.commentsCount || 0,
        }
      })
      // 좋아요 수로 정렬
      posts.sort((a, b) => b.likesCount - a.likesCount)
      setWeeklyPosts(posts.slice(0, 5))

      // 베스트 댓글 (Firestore에서는 서브컬렉션이라 복잡 - 일단 빈 배열)
      // TODO: 별도의 댓글 통계 컬렉션 필요
      setBestComments([])

      // 카테고리별 포스트 수 계산
      const allPostsSnap = await getDocs(collection(firestore, COLLECTION_PATHS.POSTS))
      const categoryCounts: Record<string, number> = {}
      allPostsSnap.docs.forEach((doc) => {
        const data = doc.data()
        const tags = data.tags || []
        tags.forEach((tag: string) => {
          categoryCounts[tag] = (categoryCounts[tag] || 0) + 1
        })
      })
      const categoryList = Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4)
      setCategories(categoryList)
    } catch (error) {
      console.error('Error loading sidebar data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6 rounded-lg border-gray-200">
          <Skeleton className="h-6 w-32 mb-4 rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Weekly Popular Posts */}
      <Card className="p-6 rounded-lg border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-5 w-5 text-orange-500" />
          <h3 className="text-base font-semibold text-gray-900">주간 인기 포스트</h3>
        </div>
        <div className="space-y-3">
          {weeklyPosts.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-4">
              아직 포스트가 없습니다
            </p>
          ) : (
            weeklyPosts.map((post, index) => (
              <Link key={post.id} href={`/community/${post.id}`}>
                <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-gray-600 min-w-[20px]">
                      #{index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                        {post.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          <span>{post.likesCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>{post.commentsCount}</span>
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
        <Card className="p-6 rounded-lg border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <h3 className="text-base font-semibold text-gray-900">오늘의 베스트 댓글</h3>
          </div>
          <div className="space-y-3">
            {bestComments.map((comment) => (
              <Link key={comment.id} href={`/community/${comment.postId}`}>
                <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <p className="text-xs text-gray-700 line-clamp-2 mb-2">
                    "{comment.content}"
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {comment.authorName}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <ThumbsUp className="h-3 w-3" />
                      <span>{comment.likesCount}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Popular Categories */}
      <Card className="p-6 rounded-lg border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-4">인기 카테고리</h3>
        <div className="space-y-2">
          {categories.map(({ category, count }) => (
            <button
              key={category}
              onClick={() => onCategoryClick?.(category as PostCategory)}
              className={`
                w-full flex items-center justify-between p-2 rounded-lg transition-colors text-left
                ${categoryColors[category] || 'hover:bg-gray-50'}
              `}
            >
              <span className="text-sm capitalize text-gray-900">
                {category.replace('-', ' ')}
              </span>
              <Badge variant="secondary" className="text-xs">
                {count}
              </Badge>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
