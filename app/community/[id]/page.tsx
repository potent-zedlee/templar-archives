"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, ThumbsUp, Share2, Link2 } from "lucide-react"
import Link from "next/link"
import { fetchPost, togglePostLike, type Post } from "@/lib/supabase-community"
import { toast } from "sonner"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { PostComments } from "@/components/post-comments"
import { useAuth } from "@/components/auth-provider"
import { ReportButton } from "@/components/report-button"

const categoryColors: Record<Post['category'], string> = {
  "analysis": "bg-blue-500/10 text-blue-500",
  "strategy": "bg-green-500/10 text-green-500",
  "hand-review": "bg-purple-500/10 text-purple-500",
  "general": "bg-gray-500/10 text-gray-500"
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const postId = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentsCount, setCommentsCount] = useState(0)

  useEffect(() => {
    loadPost()
  }, [postId])

  async function loadPost() {
    setLoading(true)
    try {
      const data = await fetchPost(postId)
      setPost(data)
      setCommentsCount(data.comments_count)
    } catch (error) {
      console.error('Error loading post:', error)
      toast.error('Failed to load post')
    } finally {
      setLoading(false)
    }
  }

  async function handleLike() {
    if (!user) {
      toast.error('Login required')
      return
    }

    if (!post) return

    try {
      const liked = await togglePostLike(post.id, user.id)
      setPost({
        ...post,
        likes_count: post.likes_count + (liked ? 1 : -1)
      })
    } catch (error) {
      console.error('Error toggling like:', error)
      toast.error('Failed to toggle like')
    }
  }

  async function handleShare() {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch (error) {
      console.error('Failed to copy link:', error)
      toast.error('Failed to copy link')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container max-w-4xl mx-auto py-8 md:py-12 px-4 md:px-6">
          <CardSkeleton count={1} />
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container max-w-4xl mx-auto py-16 px-4 md:px-6">
          <Card className="p-12 text-center">
            <h2 className="text-title-lg mb-4">Post Not Found</h2>
            <p className="text-body text-muted-foreground mb-6">
              The post you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push('/community')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Community
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <div className="container max-w-4xl mx-auto py-8 md:py-12 px-4 md:px-6">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/community')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Community
          </Button>
        </div>

        {/* Post Card */}
        <Card className="p-6 md:p-8 mb-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="h-12 w-12">
              <AvatarImage src={post.author_avatar} alt={post.author_name} />
              <AvatarFallback>
                {post.author_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h3 className="text-body font-semibold mb-1">
                    {post.author_name}
                  </h3>
                  <div className="flex items-center gap-2 text-caption text-muted-foreground">
                    <span>{new Date(post.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </div>
                <Badge className={categoryColors[post.category]}>
                  {post.category.replace('-', ' ')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-title-lg mb-4">{post.title}</h1>

          {/* Content */}
          <div className="prose prose-sm max-w-none mb-6">
            <p className="text-body text-foreground whitespace-pre-wrap">
              {post.content}
            </p>
          </div>

          {/* Attached Hand */}
          {post.hand && (
            <Card className="p-4 mb-6 bg-muted/30">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary">#{post.hand.number}</Badge>
                    <span className="text-caption text-muted-foreground">
                      {post.hand.timestamp}
                    </span>
                  </div>
                  {post.hand.description && (
                    <p className="text-body">{post.hand.description}</p>
                  )}
                </div>
                <Link
                  href={`/archive?hand=${post.hand.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  View Hand
                </Link>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className="gap-1"
            >
              <ThumbsUp className="h-4 w-4" />
              <span>{post.likes_count}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="gap-1"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>

            <div className="flex-1" />

            <ReportButton postId={post.id} variant="ghost" size="sm" />
          </div>
        </Card>

        {/* Comments Section */}
        <PostComments
          postId={postId}
          onCommentsCountChange={setCommentsCount}
        />
      </div>
    </div>
  )
}
