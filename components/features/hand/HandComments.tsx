"use client"

/**
 * Hand Comments Component
 *
 * 핸드에 대한 댓글 표시 및 작성
 * Firestore 버전으로 마이그레이션됨
 *
 * Note: 댓글 기능은 아직 Firestore에 완전히 구현되지 않았으므로
 * 임시로 빈 상태를 표시합니다.
 */

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThumbsUp, MessageCircle, Send } from "lucide-react"
import { useAuth } from "@/components/layout/AuthProvider"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

// Comment type for display
type Comment = {
  id: string
  content: string
  authorId: string
  authorName: string
  authorAvatar?: string
  likesCount: number
  createdAt: string
  parentCommentId?: string
}

type HandCommentsProps = {
  handId: string
  onCommentsCountChange?: (count: number) => void
}

type CommentWithReplies = Comment & {
  replies?: Comment[]
  isLoadingReplies?: boolean
  hasLiked?: boolean
}

export function HandComments({ handId, onCommentsCountChange }: HandCommentsProps) {
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
  }, [handId])

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

  // TODO: Firestore 댓글 컬렉션 구현 필요
  // 현재는 스텁으로 빈 배열 반환
  const loadComments = async () => {
    setLoading(true)
    try {
      // Firestore 댓글 로드 (아직 미구현)
      // const commentsRef = collection(firestore, `hands/${handId}/comments`)
      // const snapshot = await getDocs(query(commentsRef, orderBy('createdAt', 'desc')))
      setComments([])
    } catch (error) {
      console.error('댓글 로드 실패:', error)
      toast.error('댓글을 불러오는데 실패했습니다.')
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
      // Firestore 답글 로드 (아직 미구현)
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, replies: [], isLoadingReplies: false }
            : c
        )
      )
    } catch (error) {
      console.error('답글 로드 실패:', error)
      toast.error('답글을 불러오는데 실패했습니다.')
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, isLoadingReplies: false } : c
        )
      )
    }
  }

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      router.push('/auth/login')
      return
    }

    if (!newComment.trim()) {
      toast.error('댓글 내용을 입력해주세요.')
      return
    }

    setSubmitting(true)
    try {
      // TODO: Firestore 댓글 생성 구현
      // const commentsRef = collection(firestore, `hands/${handId}/comments`)
      // await addDoc(commentsRef, { ... })
      toast.info('댓글 기능은 준비 중입니다.')
      setNewComment("")
    } catch (error) {
      console.error('댓글 작성 실패:', error)
      toast.error('댓글 작성에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      router.push('/auth/login')
      return
    }

    const content = replyContent[parentCommentId]
    if (!content?.trim()) {
      toast.error('답글 내용을 입력해주세요.')
      return
    }

    setSubmitting(true)
    try {
      // TODO: Firestore 답글 생성 구현
      toast.info('답글 기능은 준비 중입니다.')
      setReplyContent((prev) => ({ ...prev, [parentCommentId]: "" }))
      setReplyingTo(null)
    } catch (error) {
      console.error('답글 작성 실패:', error)
      toast.error('답글 작성에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      router.push('/auth/login')
      return
    }

    try {
      // TODO: Firestore 좋아요 토글 구현
      toast.info('좋아요 기능은 준비 중입니다.')
    } catch (error) {
      console.error('좋아요 처리 실패:', error)
      toast.error('좋아요 처리에 실패했습니다.')
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
            <AvatarImage src={comment.authorAvatar} alt={comment.authorName} />
            <AvatarFallback>
              {comment.authorName.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-body font-medium">{comment.authorName}</span>
              <span className="text-caption text-muted-foreground">
                {new Date(comment.createdAt).toLocaleDateString("ko-KR", {
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
                <span>{comment.likesCount}</span>
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
                  <span>답글</span>
                  {showReplies && <span>({comment.replies?.length || 0})</span>}
                </Button>
              )}
            </div>

            {/* 답글 작성 폼 */}
            {replyingTo === comment.id && (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="답글을 입력하세요..."
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
                    취소
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={submitting || !replyContent[comment.id]?.trim()}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    답글 작성
                  </Button>
                </div>
              </div>
            )}

            {/* 답글 목록 */}
            {showReplies && (
              <div className="mt-3 space-y-3">
                {comment.replies?.map((reply) => renderComment(reply, true))}
              </div>
            )}

            {/* 답글 로딩 중 */}
            {comment.isLoadingReplies && (
              <div className="mt-3 text-caption text-muted-foreground">
                답글 로딩 중...
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
        댓글 ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
      </h4>

      {/* 댓글 작성 폼 */}
      <div className="space-y-3">
        <Textarea
          placeholder={
            user
              ? "댓글을 입력하세요..."
              : "로그인 후 댓글을 작성할 수 있습니다."
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
            댓글 작성
          </Button>
        </div>
      </div>

      {/* 댓글 목록 */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center text-caption text-muted-foreground py-8">
            댓글 로딩 중...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-caption text-muted-foreground py-8">
            첫 댓글을 작성해보세요!
          </div>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>
    </Card>
  )
}
