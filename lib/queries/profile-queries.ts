/**
 * Profile React Query Hooks
 *
 * 사용자 프로필 관련 데이터 페칭을 위한 React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProfile,
  getCurrentUserProfile,
  checkNicknameAvailable,
  updateProfile,
  uploadAvatar,
  fetchUserPosts,
  fetchUserComments,
  fetchUserBookmarks,
  type UserProfile,
} from '@/lib/user-profile'

// ==================== Query Keys ====================

export const profileKeys = {
  all: ['profiles'] as const,
  lists: () => [...profileKeys.all, 'list'] as const,
  details: () => [...profileKeys.all, 'detail'] as const,
  detail: (userId: string) => [...profileKeys.details(), userId] as const,
  current: () => [...profileKeys.all, 'current'] as const,
  nickname: (nickname: string, userId?: string) => [...profileKeys.all, 'nickname', nickname, userId] as const,
  posts: (userId: string) => [...profileKeys.detail(userId), 'posts'] as const,
  comments: (userId: string) => [...profileKeys.detail(userId), 'comments'] as const,
  bookmarks: (userId: string) => [...profileKeys.detail(userId), 'bookmarks'] as const,
}

// ==================== Queries ====================

/**
 * Get user profile by ID
 */
export function useProfileQuery(userId: string) {
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: async () => {
      return await getProfile(userId)
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    enabled: !!userId,
  })
}

/**
 * Get current logged-in user's profile
 */
export function useCurrentUserProfileQuery() {
  return useQuery({
    queryKey: profileKeys.current(),
    queryFn: async () => {
      return await getCurrentUserProfile()
    },
    staleTime: 3 * 60 * 1000, // 3분 (자주 변경될 수 있음)
    gcTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * Check nickname availability
 * NOTE: Use debouncing in component to avoid too many requests
 */
export function useCheckNicknameQuery(nickname: string, currentUserId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: profileKeys.nickname(nickname, currentUserId),
    queryFn: async () => {
      return await checkNicknameAvailable(nickname, currentUserId)
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    enabled: enabled && !!nickname && nickname.length >= 3,
  })
}

/**
 * Get user's posts
 */
export function useUserPostsQuery(userId: string, limit: number = 10) {
  return useQuery({
    queryKey: profileKeys.posts(userId),
    queryFn: async () => {
      return await fetchUserPosts(userId, limit)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: !!userId,
  })
}

/**
 * Get user's comments
 */
export function useUserCommentsQuery(userId: string, limit: number = 10) {
  return useQuery({
    queryKey: profileKeys.comments(userId),
    queryFn: async () => {
      return await fetchUserComments(userId, limit)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: !!userId,
  })
}

/**
 * Get user's bookmarks
 */
export function useUserBookmarksQuery(userId: string, limit: number = 20) {
  return useQuery({
    queryKey: profileKeys.bookmarks(userId),
    queryFn: async () => {
      return await fetchUserBookmarks(userId, limit)
    },
    staleTime: 1 * 60 * 1000, // 1분 (북마크는 자주 변경됨)
    gcTime: 3 * 60 * 1000, // 3분
    enabled: !!userId,
  })
}

// ==================== Mutations ====================

/**
 * Update user profile
 */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string
      updates: Partial<Pick<UserProfile, 'nickname' | 'avatar_url' | 'bio' | 'poker_experience'>>
    }) => {
      return await updateProfile(userId, updates)
    },
    onSuccess: (data, variables) => {
      // Invalidate current user profile
      queryClient.invalidateQueries({ queryKey: profileKeys.current() })
      // Invalidate specific user profile
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(variables.userId) })
      // Invalidate nickname check if nickname was changed
      if (variables.updates.nickname) {
        queryClient.invalidateQueries({ queryKey: profileKeys.nickname(variables.updates.nickname, variables.userId) })
      }
    },
  })
}

/**
 * Upload avatar image
 */
export function useUploadAvatarMutation(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      return await uploadAvatar(userId, file)
    },
    onSuccess: (avatarUrl) => {
      // Update profile with new avatar URL
      queryClient.invalidateQueries({ queryKey: profileKeys.current() })
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) })
    },
  })
}
