"use client"

import { PostComments } from "@/components/features/community/PostComments"

interface CommentSectionProps {
  handId: string
}

/**
 * Hand 댓글 섹션
 * Reddit 스타일 중첩 댓글 지원
 */
export function CommentSection({ handId }: CommentSectionProps) {
  return <PostComments handId={handId} />
}
