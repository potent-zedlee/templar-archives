/**
 * Community React Query Hooks
 *
 * Community 페이지 (상세)의 데이터 페칭을 위한 React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPost, togglePostLike, type Post } from '@/lib/supabase-community'

// ==================== Query Keys ====================

export const communityKeys = {
  all: ['community'] as const,
  posts: () => [...communityKeys.all, 'posts'] as const,
  post: (postId: string) => [...communityKeys.posts(), postId] as const,
}

// ==================== Queries ====================

/**
 * Get single post detail
 */
export function usePostQuery(postId: string) {
  return useQuery({
    queryKey: communityKeys.post(postId),
    queryFn: async () => {
      return await fetchPost(postId)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: !!postId, // postId가 있을 때만 실행
  })
}

// ==================== Mutations ====================

/**
 * Toggle post like (Optimistic Update)
 */
export function useLikePostMutation(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      return await togglePostLike(postId, userId)
    },
    onMutate: async ({ postId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: communityKeys.post(postId) })

      // Snapshot the previous value
      const previousPost = queryClient.getQueryData<Post>(communityKeys.post(postId))

      // Optimistically update the cache
      if (previousPost) {
        queryClient.setQueryData<Post>(communityKeys.post(postId), {
          ...previousPost,
          likes_count: previousPost.likes_count + 1, // 일단 증가로 가정
        })
      }

      return { previousPost }
    },
    onSuccess: (liked, { postId }) => {
      // 실제 서버 응답으로 정확한 값 설정
      const previousPost = queryClient.getQueryData<Post>(communityKeys.post(postId))
      if (previousPost) {
        queryClient.setQueryData<Post>(communityKeys.post(postId), {
          ...previousPost,
          likes_count: previousPost.likes_count + (liked ? 1 : -1),
        })
      }
    },
    onError: (err, { postId }, context) => {
      // Rollback on error
      if (context?.previousPost) {
        queryClient.setQueryData(communityKeys.post(postId), context.previousPost)
      }
    },
    onSettled: (data, error, { postId }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: communityKeys.post(postId) })
    },
  })
}
