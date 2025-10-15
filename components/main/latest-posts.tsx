"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { buttonVariants } from "@/components/ui/button"
import { MessageSquare, ThumbsUp, ArrowRight } from "lucide-react"

interface LatestPostsProps {
  posts: any[]
}

const categoryColors: Record<string, string> = {
  "analysis": "bg-blue-500/10 text-blue-500",
  "strategy": "bg-green-500/10 text-green-500",
  "hand-review": "bg-purple-500/10 text-purple-500",
  "general": "bg-gray-500/10 text-gray-500"
}

export function LatestPosts({ posts }: LatestPostsProps) {
  if (posts.length === 0) {
    return null
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title-lg mb-2">최신 커뮤니티 포스트</h2>
          <p className="text-body text-muted-foreground">
            커뮤니티에서 활발하게 논의되고 있는 주제들
          </p>
        </div>
        <Link
          href="/community"
          className={buttonVariants({ variant: "outline" })}
        >
          View All Posts
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {posts.map((post) => (
          <Link key={post.id} href={`/community/${post.id}`}>
            <Card className="p-4 hover:shadow-lg transition-shadow h-full">
              <div className="space-y-3">
                {/* Author */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={post.author?.avatar_url} />
                    <AvatarFallback>
                      {post.author?.nickname?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {post.author?.nickname || '익명'}
                      </span>
                      <Badge className={categoryColors[post.category] || categoryColors.general}>
                        {post.category.replace('-', ' ')}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-body font-semibold mb-2 line-clamp-1">
                    {post.title}
                  </h3>
                  <p className="text-caption text-muted-foreground line-clamp-2">
                    {post.content}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-caption text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {post.likes_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {post.comments_count}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
