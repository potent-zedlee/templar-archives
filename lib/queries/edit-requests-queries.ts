/**
 * Edit Requests React Query Hooks
 *
 * 핸드 수정 제안 관련 데이터 페칭을 위한 React Query hooks
 */

import { useQuery } from '@tanstack/react-query'
import {
  fetchUserEditRequests,
  type EditRequestStatus,
} from '@/lib/hand-edit-requests'

// ==================== Query Keys ====================

export const editRequestsKeys = {
  all: ['editRequests'] as const,
  lists: () => [...editRequestsKeys.all, 'list'] as const,
  list: (userId: string, status?: EditRequestStatus) => [...editRequestsKeys.lists(), userId, status] as const,
}

// ==================== Queries ====================

/**
 * Get user's edit requests
 */
export function useUserEditRequestsQuery(
  userId: string,
  status?: EditRequestStatus,
  limit: number = 20
) {
  return useQuery({
    queryKey: editRequestsKeys.list(userId, status),
    queryFn: async () => {
      return await fetchUserEditRequests({ userId, status, limit })
    },
    staleTime: 1 * 60 * 1000, // 1분 (수정 제안은 자주 변경될 수 있음)
    gcTime: 3 * 60 * 1000, // 3분
    enabled: !!userId,
  })
}
