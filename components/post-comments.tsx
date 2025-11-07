"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThumbsUp, MessageCircle, Send } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
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
        className={`space-y-3 ${isReply ? "ml-8 border-l-2 border-muted pl-4" : ""}`}
      >
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.author_avatar} alt={comment.author_name} />
            <AvatarFallback>
              {comment.author_name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-body font-medium">{comment.author_name}</span>
              <span className="text-caption text-muted-foreground">
                {new Date(comment.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <p className="text-body text-foreground whitespace-pre-wrap mb-2">
              {comment.content}
            </p>

            <div className="flex items-center gap-3 text-caption">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1 hover:text-primary"
                onClick={() => handleLikeComment(comment.id)}
              >
                <ThumbsUp className="h-3 w-3" />
                <span>{comment.likes_count}</span>
              </Button>

              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1 hover:text-primary"
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
                >
                  <MessageCircle className="h-3 w-3" />
                  <span>Reply</span>
                  {showReplies && <span>({comment.replies?.length || 0})</span>}
                </Button>
              )}
            </div>

            {/* Reply form */}
            {replyingTo === comment.id && (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyContent[comment.id] || ""}
                  onChange={(e) =>
                    setReplyContent((prev) => ({
                      ...prev,
                      [comment.id]: e.target.value,
                    }))
                  }
                  rows={2}
                  className="text-body"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReplyingTo(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={submitting || !replyContent[comment.id]?.trim()}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
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
              <div className="mt-3 text-caption text-muted-foreground">
                Loading replies...
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="p-6 space-y-6">
      <h4 className="text-title font-semibold flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        Comments ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
      </h4>

      {/* Comment form */}
      <div className="space-y-3">
        <Textarea
          placeholder={
            user
              ? "Write a comment..."
              : "Login to comment"
          }
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          disabled={!user}
          className="text-body"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmitComment}
            disabled={!user || submitting || !newComment.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            Post Comment
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center text-caption text-muted-foreground py-8">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-caption text-muted-foreground py-8">
            Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>
    </Card>
  )
}
