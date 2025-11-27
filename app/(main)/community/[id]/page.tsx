"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, ThumbsUp, Share2, Link2 } from "lucide-react"
import Link from "next/link"
import { usePostQuery, useLikePostMutation, type PostCategory } from "@/lib/queries/community-queries"
import { toast } from "sonner"
import { CardSkeleton } from "@/components/ui/skeletons/CardSkeleton"
import { useAuth } from "@/components/layout/AuthProvider"
import { ReportButton } from "@/components/dialogs/ReportButton"
import { PostComments } from "@/components/features/community/PostComments"
import { Badge } from "@/components/ui/badge"

const categoryColors: Record<PostCategory, string> = {
  "analysis": "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
  "strategy": "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
  "hand-review": "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
  "general": "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const postId = params.id as string

  const [commentsCount, setCommentsCount] = useState(0)

  // React Query hooks
  const { data: post = null, isLoading: loading, error } = usePostQuery(postId)
  const likePostMutation = useLikePostMutation(user?.id || "")

  // Set initial comments count from post data
  if (post && commentsCount === 0 && post.stats.commentsCount > 0) {
    setCommentsCount(post.stats.commentsCount)
  }

  // Handle query error
  if (error) {
    toast.error('Failed to load post')
  }

  function handleLike() {
    if (!user) {
      toast.error('Login required')
      return
    }

    if (!post) return

    likePostMutation.mutate(
      { postId: post.id },
      {
        onError: (error) => {
          console.error('Error toggling like:', error)
          toast.error('Failed to toggle like')
        }
      }
    )
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container max-w-4xl mx-auto py-8 md:py-12 px-4 md:px-6">
          <CardSkeleton count={1} />
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container max-w-4xl mx-auto py-16 px-4 md:px-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Post not found</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              The post you're looking for doesn't exist or has been removed.
            </p>
            <button className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors" onClick={() => router.push('/community')}>
              <ArrowLeft className="mr-2 h-4 w-4 inline" />
              Back to community
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container max-w-4xl mx-auto py-8 md:py-12 px-4 md:px-6">
        {/* Back Button */}
        <div className="mb-6">
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded-md transition-colors" onClick={() => router.push('/community')}>
            <ArrowLeft className="h-4 w-4" />
            Back to community
          </button>
        </div>

        {/* Post Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="h-12 w-12 rounded-full">
              <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
              <AvatarFallback className="rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-semibold">
                {post.author.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {post.author.name}
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span>{new Date(post.createdAt).toLocaleDateString('en-US', {
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{post.title}</h1>

          {/* Content */}
          <div className="prose prose-sm max-w-none mb-6">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-normal">
              {post.content}
            </p>
          </div>

          {/* Attached Hand */}
          {post.hand && (
            <div className="mb-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">#{post.hand.number}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {post.hand.timestamp}
                    </span>
                  </div>
                  {post.hand.description && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">{post.hand.description}</p>
                  )}
                </div>
                <Link
                  href={`/archive?hand=${post.hand.id}`}
                  className="px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  View hand
                </Link>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-400"
            >
              <ThumbsUp className="h-5 w-5" />
              <span className="font-mono">{post.stats.likesCount}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-400"
            >
              <Share2 className="h-5 w-5" />
              <span>Share</span>
            </button>

            <div className="flex-1" />

            <ReportButton postId={post.id} variant="ghost" size="sm" />
          </div>
        </div>

        {/* Comments Section */}
        <PostComments
          postId={postId}
          onCommentsCountChange={setCommentsCount}
        />
      </div>
    </div>
  )
}
