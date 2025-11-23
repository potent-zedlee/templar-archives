"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThumbsUp, MessageCircle, Send } from "lucide-react"
import { useAuth } from "@/components/layout/AuthProvider"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  fetchComments,
  fetchReplies,
  createComment,
  toggleCommentLike,
  type Comment,
} from "@/lib/supabase-community"

type PostCommentsProps = {
  postId?: string
  handId?: string
  onCommentsCountChange?: (count: number) => void
}

type CommentWithReplies = Comment & {
  replies?: Comment[]
  isLoadingReplies?: boolean
  hasLiked?: boolean
}

export function PostComments({ postId, handId, onCommentsCountChange }: PostCommentsProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [comments, setComments] = useState<CommentWithReplies[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadComments()
  }, [postId, handId])

  useEffect(() => {
    // 댓글 개수 변경 알림
    if (onCommentsCountChange) {
      const totalCount = comments.reduce(
        (acc, comment) => acc + 1 + (comment.replies?.length || 0),
        0
      )
      onCommentsCountChange(totalCount)
    }
  }, [comments, onCommentsCountChange])

  const loadComments = async () => {
    setLoading(true)
    try {
      const data = await fetchComments({ postId, handId })
      setComments(data)
    } catch (error) {
      console.error('댓글 로드 실패:', error)
      toast.error('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const loadReplies = async (commentId: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, isLoadingReplies: true } : c
      )
    )

    try {
      const replies = await fetchReplies(commentId)
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, replies, isLoadingReplies: false }
            : c
        )
      )
    } catch (error) {
      console.error('답글 로드 실패:', error)
      toast.error('Failed to load replies')
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, isLoadingReplies: false } : c
        )
      )
    }
  }

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error('Login required')
      router.push('/auth/login')
      return
    }

    if (!newComment.trim()) {
      toast.error('Please enter a comment')
      return
    }

    setSubmitting(true)
    try {
      await createComment({
        post_id: postId,
        hand_id: handId,
        author_id: user.id,
        content: newComment.trim(),
      })

      toast.success('Comment posted successfully')
      setNewComment("")
      loadComments()
    } catch (error) {
      console.error('댓글 작성 실패:', error)
      toast.error('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!user) {
      toast.error('Login required')
      router.push('/auth/login')
      return
    }

    const content = replyContent[parentCommentId]
    if (!content?.trim()) {
      toast.error('Please enter a reply')
      return
    }

    setSubmitting(true)
    try {
      await createComment({
        post_id: postId,
        hand_id: handId,
        parent_comment_id: parentCommentId,
        author_id: user.id,
        content: content.trim(),
      })

      toast.success('Reply posted successfully')
      setReplyContent((prev) => ({ ...prev, [parentCommentId]: "" }))
      setReplyingTo(null)
      loadReplies(parentCommentId)
    } catch (error) {
      console.error('답글 작성 실패:', error)
      toast.error('Failed to post reply')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      toast.error('Login required')
      router.push('/auth/login')
      return
    }

    try {
      const liked = await toggleCommentLike(commentId, user.id)

      // Optimistic UI update
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              likes_count: c.likes_count + (liked ? 1 : -1),
              hasLiked: liked,
            }
          }
          // Update replies too
          if (c.replies) {
            const updatedReplies = c.replies.map((r) =>
              r.id === commentId
                ? {
                    ...r,
                    likes_count: r.likes_count + (liked ? 1 : -1),
                    hasLiked: liked,
                  }
                : r
            )
            return { ...c, replies: updatedReplies }
          }
          return c
        })
      )
    } catch (error) {
      console.error('좋아요 처리 실패:', error)
      toast.error('Failed to toggle like')
    }
  }

  const renderComment = (comment: CommentWithReplies, isReply = false) => {
    const showReplies = comment.replies && comment.replies.length > 0

    return (
      <div
        key={comment.id}
        className={`${isReply ? "ml-6 md:ml-10 pl-3 md:pl-4 border-l-2 border-gray-200 dark:border-gray-700" : ""}`}
      >
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 rounded-full">
            <AvatarImage src={comment.author_avatar} alt={comment.author_name} />
            <AvatarFallback className="rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-semibold">
              {comment.author_name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{comment.author_name}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {new Date(comment.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-3 leading-normal">
              {comment.content}
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleLikeComment(comment.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-400"
              >
                <ThumbsUp className="h-3 w-3" />
                <span className="font-mono">{comment.likes_count}</span>
              </button>

              {!isReply && (
                <button
                  onClick={() => {
                    if (replyingTo === comment.id) {
                      setReplyingTo(null)
                    } else {
                      setReplyingTo(comment.id)
                      if (!comment.replies) {
                        loadReplies(comment.id)
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-400"
                >
                  <MessageCircle className="h-3 w-3" />
                  <span>Reply</span>
                  {showReplies && <span className="font-mono">({comment.replies?.length || 0})</span>}
                </button>
              )}
            </div>

            {/* Reply form */}
            {replyingTo === comment.id && (
              <div className="mt-4 space-y-2">
                <Textarea
                  placeholder="답글을 작성하세요..."
                  value={replyContent[comment.id] || ""}
                  onChange={(e) =>
                    setReplyContent((prev) => ({
                      ...prev,
                      [comment.id]: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full resize-none rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="px-3 py-1 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={submitting || !replyContent[comment.id]?.trim()}
                    className="px-3 py-1 text-xs font-medium bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <Send className="h-3 w-3" />
                    Reply
                  </button>
                </div>
              </div>
            )}

            {/* Replies list */}
            {showReplies && (
              <div className="mt-3 space-y-3">
                {comment.replies?.map((reply) => renderComment(reply, true))}
              </div>
            )}

            {/* Loading replies */}
            {comment.isLoadingReplies && (
              <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                Loading replies...
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-6">
        <MessageCircle className="h-5 w-5" />
        <span className="font-mono">
          Comments ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
        </span>
      </h4>

      {/* Comment form */}
      <div className="mb-6">
        <Textarea
          placeholder={
            user
              ? "댓글을 작성하세요..."
              : "로그인 후 댓글을 작성할 수 있습니다"
          }
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          disabled={!user}
          className="w-full resize-none mb-2 rounded-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSubmitComment}
            disabled={!user || submitting || !newComment.trim()}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            댓글 작성
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 py-8">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 py-8">
            첫 댓글을 작성해보세요!
          </div>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>
    </div>
  )
}
