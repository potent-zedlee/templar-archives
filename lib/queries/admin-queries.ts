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
    },
    onSuccess: () => {
      // Invalidate users queries
      queryClient.invalidateQueries({ queryKey: adminKeys.users() })
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() })
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() })
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
