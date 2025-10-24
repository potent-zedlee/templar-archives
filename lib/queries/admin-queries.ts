/**
 * Admin React Query Hooks
 *
 * Admin 페이지의 데이터 페칭을 위한 React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getDashboardStats,
  getRecentActivity,
  getUsers,
  banUser,
  unbanUser,
  changeUserRole,
  deletePost,
  deleteComment,
  getRecentPosts,
  getRecentComments,
  type AdminRole,
  type DashboardStats,
  type AdminLog,
} from '@/lib/admin'
import {
  fetchAllPosts,
  fetchAllComments,
  fetchReports,
  approveReport,
  rejectReport,
  hideContent,
  unhideContent,
  deleteContent,
  type Report,
  type ReportStatus,
} from '@/lib/content-moderation'
import {
  getPendingClaims,
  getAllClaims,
  approvePlayerClaim,
  rejectPlayerClaim,
  type PlayerClaimWithDetails,
} from '@/lib/player-claims'
import {
  fetchEditRequests,
  approveEditRequest,
  rejectEditRequest,
  type HandEditRequest,
  type EditRequestStatus,
} from '@/lib/hand-edit-requests'
import {
  getAllDeletionRequests,
  getPendingDeletionRequests,
  approveDeletionRequest,
  rejectDeletionRequest,
  completeDeletionRequest,
  type DeletionRequestWithUser,
  type DeletionRequestStatus,
} from '@/lib/data-deletion-requests'

// ==================== Query Keys ====================

export const adminKeys = {
  all: ['admin'] as const,
  dashboardStats: () => [...adminKeys.all, 'dashboard-stats'] as const,
  activity: (limit?: number) => [...adminKeys.all, 'activity', limit] as const,
  users: (filters?: any) => [...adminKeys.all, 'users', filters] as const,
  claims: () => [...adminKeys.all, 'claims'] as const,
  pendingClaims: () => [...adminKeys.claims(), 'pending'] as const,
  allClaims: () => [...adminKeys.claims(), 'all'] as const,
  posts: (limit?: number) => [...adminKeys.all, 'posts', limit] as const,
  comments: (limit?: number) => [...adminKeys.all, 'comments', limit] as const,
  editRequests: (status?: EditRequestStatus) => [...adminKeys.all, 'edit-requests', status] as const,
  reports: (status?: ReportStatus) => [...adminKeys.all, 'reports', status] as const,
  allPosts: (includeHidden?: boolean) => [...adminKeys.all, 'all-posts', includeHidden] as const,
  allComments: (includeHidden?: boolean) => [...adminKeys.all, 'all-comments', includeHidden] as const,
  deletionRequests: () => [...adminKeys.all, 'deletion-requests'] as const,
  pendingDeletionRequests: () => [...adminKeys.deletionRequests(), 'pending'] as const,
  allDeletionRequests: () => [...adminKeys.deletionRequests(), 'all'] as const,
}

// ==================== Dashboard Queries ====================

/**
 * Get dashboard statistics
 */
export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: adminKeys.dashboardStats(),
    queryFn: async () => {
      return await getDashboardStats()
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * Get recent admin activity
 */
export function useRecentActivityQuery(limit: number = 20) {
  return useQuery({
    queryKey: adminKeys.activity(limit),
    queryFn: async () => {
      return await getRecentActivity(limit)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

// ==================== Users Queries & Mutations ====================

/**
 * Get users with pagination and filters
 */
export function useUsersQuery(options?: {
  page?: number
  limit?: number
  role?: AdminRole
  banned?: boolean
  search?: string
}) {
  return useQuery({
    queryKey: adminKeys.users(options),
    queryFn: async () => {
      return await getUsers(options)
    },
    staleTime: 3 * 60 * 1000, // 3분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Ban user (Optimistic Update)
 */
export function useBanUserMutation(adminId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      await banUser(userId, reason, adminId)
      return { userId, reason }
    },
    onMutate: async ({ userId, reason }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin', 'users'] })

      // Snapshot previous value
      const previousData = queryClient.getQueriesData({ queryKey: ['admin', 'users'] })

      // Optimistically update all user queries
      queryClient.setQueriesData<any>(
        { queryKey: ['admin', 'users'] },
        (old: any) => {
          if (!old?.users) return old
          return {
            ...old,
            users: old.users.map((user: any) =>
              user.id === userId ? { ...user, is_banned: true, ban_reason: reason } : user
            ),
          }
        }
      )

      return { previousData }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: () => {
      // Invalidate users queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}

/**
 * Unban user (Optimistic Update)
 */
export function useUnbanUserMutation(adminId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      await unbanUser(userId, adminId)
      return { userId }
    },
    onMutate: async (userId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin', 'users'] })

      // Snapshot previous value
      const previousData = queryClient.getQueriesData({ queryKey: ['admin', 'users'] })

      // Optimistically update all user queries
      queryClient.setQueriesData<any>(
        { queryKey: ['admin', 'users'] },
        (old: any) => {
          if (!old?.users) return old
          return {
            ...old,
            users: old.users.map((user: any) =>
              user.id === userId ? { ...user, is_banned: false, ban_reason: null } : user
            ),
          }
        }
      )

      return { previousData }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}

/**
 * Change user role (Optimistic Update)
 */
export function useChangeRoleMutation(adminId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AdminRole }) => {
      await changeUserRole(userId, role, adminId)
      return { userId, role }
    },
    onMutate: async ({ userId, role }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin', 'users'] })

      // Snapshot previous value
      const previousData = queryClient.getQueriesData({ queryKey: ['admin', 'users'] })

      // Optimistically update all user queries
      queryClient.setQueriesData<any>(
        { queryKey: ['admin', 'users'] },
        (old: any) => {
          if (!old?.users) return old
          return {
            ...old,
            users: old.users.map((user: any) =>
              user.id === userId ? { ...user, role } : user
            ),
          }
        }
      )

      return { previousData }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: () => {
      // Invalidate all user queries to ensure sync
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

// ==================== Claims Queries & Mutations ====================

/**
 * Get pending player claims
 */
export function usePendingClaimsQuery() {
  return useQuery({
    queryKey: adminKeys.pendingClaims(),
    queryFn: async () => {
      const result = await getPendingClaims()
      if (result.error) throw result.error
      return result.data
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Get all player claims
 */
export function useAllClaimsQuery() {
  return useQuery({
    queryKey: adminKeys.allClaims(),
    queryFn: async () => {
      const result = await getAllClaims()
      if (result.error) throw result.error
      return result.data
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * Approve player claim
 */
export function useApproveClaimMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      claimId,
      adminId,
      adminNotes,
    }: {
      claimId: string
      adminId: string
      adminNotes?: string
    }) => {
      const result = await approvePlayerClaim({ claimId, adminId, adminNotes })
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pendingClaims() })
      queryClient.invalidateQueries({ queryKey: adminKeys.allClaims() })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}

/**
 * Reject player claim
 */
export function useRejectClaimMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      claimId,
      adminId,
      rejectedReason,
      adminNotes,
    }: {
      claimId: string
      adminId: string
      rejectedReason: string
      adminNotes?: string
    }) => {
      const result = await rejectPlayerClaim({ claimId, adminId, rejectedReason, adminNotes })
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pendingClaims() })
      queryClient.invalidateQueries({ queryKey: adminKeys.allClaims() })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}

// ==================== Content Queries & Mutations ====================

/**
 * Get recent posts (for moderation)
 */
export function useRecentPostsQuery(limit: number = 50) {
  return useQuery({
    queryKey: adminKeys.posts(limit),
    queryFn: async () => {
      return await getRecentPosts(limit)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Get recent comments (for moderation)
 */
export function useRecentCommentsQuery(limit: number = 50) {
  return useQuery({
    queryKey: adminKeys.comments(limit),
    queryFn: async () => {
      return await getRecentComments(limit)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Delete post (admin)
 */
export function useDeletePostMutation(adminId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason: string }) => {
      await deletePost(postId, reason, adminId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.posts() })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}

/**
 * Delete comment (admin)
 */
export function useDeleteCommentMutation(adminId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId, reason }: { commentId: string; reason: string }) => {
      await deleteComment(commentId, reason, adminId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.comments() })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}

// ==================== Edit Requests Queries & Mutations ====================

/**
 * Get hand edit requests
 */
export function useEditRequestsQuery(status?: EditRequestStatus) {
  return useQuery({
    queryKey: adminKeys.editRequests(status),
    queryFn: async () => {
      const result = await fetchEditRequests({ status })
      return result.requests
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Approve edit request
 */
export function useApproveEditRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, adminId }: { requestId: string; adminId: string }) => {
      await approveEditRequest({ requestId, adminId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.editRequests() })
    },
  })
}

/**
 * Reject edit request
 */
export function useRejectEditRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      adminId,
      rejectedReason,
    }: {
      requestId: string
      adminId: string
      rejectedReason: string
    }) => {
      await rejectEditRequest({ requestId, adminId, rejectedReason })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.editRequests() })
    },
  })
}

// ==================== Content Moderation Queries & Mutations ====================

/**
 * Get all posts (including hidden)
 */
export function useAllPostsQuery(includeHidden: boolean = true) {
  return useQuery({
    queryKey: adminKeys.allPosts(includeHidden),
    queryFn: async () => {
      return await fetchAllPosts({ includeHidden })
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Get all comments (including hidden)
 */
export function useAllCommentsQuery(includeHidden: boolean = true) {
  return useQuery({
    queryKey: adminKeys.allComments(includeHidden),
    queryFn: async () => {
      return await fetchAllComments({ includeHidden })
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Get reports
 */
export function useReportsQuery(status?: ReportStatus) {
  return useQuery({
    queryKey: adminKeys.reports(status),
    queryFn: async () => {
      return await fetchReports({ status })
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Approve report (and hide content)
 */
export function useApproveReportMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      reportId,
      adminId,
      adminComment,
    }: {
      reportId: string
      adminId: string
      adminComment?: string
    }) => {
      await approveReport({ reportId, adminId, adminComment })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.reports() })
      queryClient.invalidateQueries({ queryKey: adminKeys.allPosts() })
      queryClient.invalidateQueries({ queryKey: adminKeys.allComments() })
    },
  })
}

/**
 * Reject report
 */
export function useRejectReportMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      reportId,
      adminId,
      adminComment,
    }: {
      reportId: string
      adminId: string
      adminComment?: string
    }) => {
      await rejectReport({ reportId, adminId, adminComment })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.reports() })
    },
  })
}

/**
 * Hide content (post or comment)
 */
export function useHideContentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      postId,
      commentId,
    }: {
      postId?: string
      commentId?: string
    }) => {
      await hideContent(postId ? { postId } : { commentId: commentId! })
    },
    onSuccess: () => {
      // Use prefix matching to invalidate all variants (with/without includeHidden)
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-posts'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-comments'] })
    },
  })
}

/**
 * Unhide content (post or comment)
 */
export function useUnhideContentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      postId,
      commentId,
    }: {
      postId?: string
      commentId?: string
    }) => {
      await unhideContent(postId ? { postId } : { commentId: commentId! })
    },
    onSuccess: () => {
      // Use prefix matching to invalidate all variants (with/without includeHidden)
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-posts'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-comments'] })
    },
  })
}

/**
 * Delete content (post or comment)
 */
export function useDeleteContentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      postId,
      commentId,
    }: {
      postId?: string
      commentId?: string
    }) => {
      await deleteContent(postId ? { postId } : { commentId: commentId! })
    },
    onSuccess: () => {
      // Use prefix matching to invalidate all variants (with/without includeHidden)
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-posts'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-comments'] })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}

// ==================== Data Deletion Requests Queries & Mutations ====================

/**
 * Get all deletion requests (admin)
 */
export function useAllDeletionRequestsQuery() {
  return useQuery({
    queryKey: adminKeys.allDeletionRequests(),
    queryFn: async () => {
      const result = await getAllDeletionRequests()
      if (result.error) throw result.error
      return result.data
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Get pending deletion requests (admin)
 */
export function usePendingDeletionRequestsQuery() {
  return useQuery({
    queryKey: adminKeys.pendingDeletionRequests(),
    queryFn: async () => {
      const result = await getPendingDeletionRequests()
      if (result.error) throw result.error
      return result.data
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Approve deletion request (admin)
 */
export function useApproveDeletionRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      adminId,
      adminNotes,
    }: {
      requestId: string
      adminId: string
      adminNotes?: string
    }) => {
      const result = await approveDeletionRequest({ requestId, adminId, adminNotes })
      if (result.error) throw result.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pendingDeletionRequests() })
      queryClient.invalidateQueries({ queryKey: adminKeys.allDeletionRequests() })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}

/**
 * Reject deletion request (admin)
 */
export function useRejectDeletionRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      adminId,
      rejectedReason,
      adminNotes,
    }: {
      requestId: string
      adminId: string
      rejectedReason: string
      adminNotes?: string
    }) => {
      const result = await rejectDeletionRequest({ requestId, adminId, rejectedReason, adminNotes })
      if (result.error) throw result.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pendingDeletionRequests() })
      queryClient.invalidateQueries({ queryKey: adminKeys.allDeletionRequests() })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}

/**
 * Complete deletion request (admin)
 */
export function useCompleteDeletionRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      adminId,
    }: {
      requestId: string
      adminId: string
    }) => {
      const result = await completeDeletionRequest({ requestId, adminId })
      if (result.error) throw result.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.allDeletionRequests() })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}
