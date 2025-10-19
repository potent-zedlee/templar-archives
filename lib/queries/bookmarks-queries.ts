/**
 * Bookmarks React Query Hooks
 *
 * 북마크 관련 데이터 페칭을 위한 React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUserBookmarks,
  removeHandBookmark,
  updateBookmarkFolder,
  updateBookmarkNotes,
  type HandBookmarkWithDetails,
} from '@/lib/hand-bookmarks'

// ==================== Query Keys ====================

export const bookmarksKeys = {
  all: ['bookmarks'] as const,
  lists: () => [...bookmarksKeys.all, 'list'] as const,
  list: (userId: string) => [...bookmarksKeys.lists(), userId] as const,
}

// ==================== Queries ====================

/**
 * Get user's bookmarks
 */
export function useBookmarksQuery(userId: string) {
  return useQuery({
    queryKey: bookmarksKeys.list(userId),
    queryFn: async () => {
      return await getUserBookmarks(userId)
    },
    staleTime: 1 * 60 * 1000, // 1분 (북마크는 자주 변경됨)
    gcTime: 3 * 60 * 1000, // 3분
    enabled: !!userId,
  })
}

// ==================== Mutations ====================

/**
 * Remove bookmark
 */
export function useRemoveBookmarkMutation(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (handId: string) => {
      await removeHandBookmark(handId, userId)
    },
    onSuccess: () => {
      // Invalidate bookmarks list
      queryClient.invalidateQueries({ queryKey: bookmarksKeys.list(userId) })
    },
  })
}

/**
 * Update bookmark (folder and notes)
 */
export function useUpdateBookmarkMutation(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      handId,
      folderName,
      notes,
    }: {
      handId: string
      folderName: string | null
      notes: string
    }) => {
      // Update both folder and notes
      await updateBookmarkFolder(handId, userId, folderName)
      await updateBookmarkNotes(handId, userId, notes)
    },
    onSuccess: () => {
      // Invalidate bookmarks list
      queryClient.invalidateQueries({ queryKey: bookmarksKeys.list(userId) })
    },
  })
}
