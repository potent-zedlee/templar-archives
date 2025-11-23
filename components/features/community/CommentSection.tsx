"use client"

import { PostComments } from "@/components/features/community/PostComments"

interface CommentSectionProps {
  entityType: 'post' | 'hand'
  entityId: string
}

/**
 * Unified comment section for both posts and hands
 * Supports Reddit-style nested comments and replies
 */
export function CommentSection({ entityType, entityId }: CommentSectionProps) {
  return (
    <PostComments
      {...(entityType === 'post' ? { postId: entityId } : { handId: entityId })}
    />
  )
}
