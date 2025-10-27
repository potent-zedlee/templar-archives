/**
 * Tournament Categories React Query Hooks
 *
 * 토너먼트 카테고리 관리를 위한 React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAllCategories,
  getCategoryById,
  getActiveCategories,
  getCategoriesByRegion,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryLogo,
  deleteCategoryLogo,
  reorderCategories,
  toggleCategoryActive,
  searchCategories,
  getCategoryUsageCount,
  getAllCategoryUsageCounts,
  type TournamentCategory,
  type CategoryInput,
  type CategoryUpdateInput,
} from '@/lib/tournament-categories'
import { toast } from 'sonner'

// ==================== Query Keys ====================

export const categoryKeys = {
  all: ['tournament-categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters?: { includeInactive?: boolean; region?: string }) =>
    [...categoryKeys.lists(), filters] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (categoryId: string) => [...categoryKeys.details(), categoryId] as const,
  usage: (categoryId: string) => [...categoryKeys.detail(categoryId), 'usage'] as const,
  active: () => [...categoryKeys.all, 'active'] as const,
  byRegion: (region: string) => [...categoryKeys.all, 'region', region] as const,
  search: (query: string) => [...categoryKeys.all, 'search', query] as const,
}

// ==================== Queries ====================

/**
 * Get all categories (with optional inactive)
 */
export function useCategoriesQuery(includeInactive = false) {
  return useQuery({
    queryKey: categoryKeys.list({ includeInactive }),
    queryFn: async () => {
      return await getAllCategories(includeInactive)
    },
    staleTime: 5 * 60 * 1000, // 5분 (카테고리는 자주 변경되지 않음)
    gcTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * Get active categories only
 */
export function useActiveCategoriesQuery() {
  return useQuery({
    queryKey: categoryKeys.active(),
    queryFn: async () => {
      return await getActiveCategories()
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * Get categories by region
 */
export function useCategoriesByRegionQuery(region: 'premier' | 'regional' | 'online' | 'specialty') {
  return useQuery({
    queryKey: categoryKeys.byRegion(region),
    queryFn: async () => {
      return await getCategoriesByRegion(region)
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    enabled: !!region,
  })
}

/**
 * Get single category by ID
 */
export function useCategoryByIdQuery(categoryId: string) {
  return useQuery({
    queryKey: categoryKeys.detail(categoryId),
    queryFn: async () => {
      return await getCategoryById(categoryId)
    },
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
    enabled: !!categoryId,
  })
}

/**
 * Get category usage count (how many tournaments use this category)
 */
export function useCategoryUsageQuery(categoryId: string) {
  return useQuery({
    queryKey: categoryKeys.usage(categoryId),
    queryFn: async () => {
      return await getCategoryUsageCount(categoryId)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: !!categoryId,
  })
}

/**
 * Get all category usage counts at once (prevents N+1 queries)
 */
export function useAllCategoryUsageQuery() {
  return useQuery({
    queryKey: [...categoryKeys.all, 'usage', 'all'] as const,
    queryFn: async () => {
      return await getAllCategoryUsageCounts()
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Search categories by name/alias
 */
export function useSearchCategoriesQuery(query: string) {
  return useQuery({
    queryKey: categoryKeys.search(query),
    queryFn: async () => {
      if (!query.trim()) return []
      return await searchCategories(query)
    },
    staleTime: 3 * 60 * 1000, // 3분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: query.trim().length > 0,
  })
}

// ==================== Mutations ====================

/**
 * Create new category
 */
export function useCreateCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CategoryInput) => {
      return await createCategory(input)
    },
    onMutate: async (newCategory) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: categoryKeys.lists() })

      // Snapshot previous value
      const previousCategories = queryClient.getQueryData<TournamentCategory[]>(
        categoryKeys.list({ includeInactive: false })
      )

      // Optimistically update cache
      if (previousCategories) {
        const optimisticCategory: TournamentCategory = {
          id: newCategory.id,
          name: newCategory.name,
          display_name: newCategory.display_name,
          short_name: newCategory.short_name || null,
          aliases: newCategory.aliases || [],
          logo_url: newCategory.logo_url || null,
          is_active: newCategory.is_active ?? true,
          game_type: newCategory.game_type || 'both',
          parent_id: newCategory.parent_id || null,
          theme_gradient: newCategory.theme_gradient || null,
          theme_text: newCategory.theme_text || null,
          theme_shadow: newCategory.theme_shadow || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        queryClient.setQueryData<TournamentCategory[]>(
          categoryKeys.list({ includeInactive: false }),
          [...previousCategories, optimisticCategory]
        )
      }

      return { previousCategories }
    },
    onSuccess: (newCategory) => {
      toast.success(`카테고리 "${newCategory.display_name}"이 생성되었습니다.`)
    },
    onError: (error, newCategory, context) => {
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(
          categoryKeys.list({ includeInactive: false }),
          context.previousCategories
        )
      }
      toast.error(`카테고리 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.refetchQueries({ queryKey: categoryKeys.lists() })
      queryClient.refetchQueries({ queryKey: categoryKeys.active() })
    },
  })
}

/**
 * Update existing category
 */
export function useUpdateCategoryMutation(categoryId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CategoryUpdateInput) => {
      return await updateCategory(categoryId, input)
    },
    onMutate: async (updatedFields) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: categoryKeys.detail(categoryId) })

      // Snapshot previous value
      const previousCategory = queryClient.getQueryData<TournamentCategory>(
        categoryKeys.detail(categoryId)
      )

      // Optimistically update cache
      if (previousCategory) {
        queryClient.setQueryData<TournamentCategory>(categoryKeys.detail(categoryId), {
          ...previousCategory,
          ...updatedFields,
          updated_at: new Date().toISOString(),
        })
      }

      return { previousCategory }
    },
    onSuccess: (updatedCategory) => {
      toast.success(`카테고리 "${updatedCategory.display_name}"이 수정되었습니다.`)
    },
    onError: (error, updatedFields, context) => {
      // Rollback on error
      if (context?.previousCategory) {
        queryClient.setQueryData(categoryKeys.detail(categoryId), context.previousCategory)
      }
      toast.error(`카테고리 수정 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(categoryId) })
      queryClient.refetchQueries({ queryKey: categoryKeys.lists() })
      queryClient.refetchQueries({ queryKey: categoryKeys.active() })
    },
  })
}

/**
 * Delete category
 */
export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (categoryId: string) => {
      await deleteCategory(categoryId)
      return categoryId
    },
    onMutate: async (categoryId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: categoryKeys.lists() })

      // Snapshot previous value
      const previousCategories = queryClient.getQueryData<TournamentCategory[]>(
        categoryKeys.list({ includeInactive: false })
      )

      // Optimistically remove from cache
      if (previousCategories) {
        queryClient.setQueryData<TournamentCategory[]>(
          categoryKeys.list({ includeInactive: false }),
          previousCategories.filter((cat) => cat.id !== categoryId)
        )
      }

      return { previousCategories }
    },
    onSuccess: () => {
      toast.success('카테고리가 삭제되었습니다.')
    },
    onError: (error, categoryId, context) => {
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(
          categoryKeys.list({ includeInactive: false }),
          context.previousCategories
        )
      }
      toast.error(`카테고리 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.refetchQueries({ queryKey: categoryKeys.lists() })
      queryClient.refetchQueries({ queryKey: categoryKeys.active() })
    },
  })
}

/**
 * Upload category logo
 */
export function useUploadLogoMutation(categoryId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      return await uploadCategoryLogo(categoryId, file)
    },
    onSuccess: (publicUrl) => {
      toast.success('로고가 업로드되었습니다.')
      // Update category detail cache
      const previousCategory = queryClient.getQueryData<TournamentCategory>(
        categoryKeys.detail(categoryId)
      )
      if (previousCategory) {
        queryClient.setQueryData<TournamentCategory>(categoryKeys.detail(categoryId), {
          ...previousCategory,
          logo_url: publicUrl,
        })
      }
    },
    onError: (error) => {
      toast.error(`로고 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(categoryId) })
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: categoryKeys.active() })
    },
  })
}

/**
 * Delete category logo
 */
export function useDeleteLogoMutation(categoryId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await deleteCategoryLogo(categoryId)
    },
    onSuccess: () => {
      toast.success('로고가 삭제되었습니다.')
      // Update category detail cache
      const previousCategory = queryClient.getQueryData<TournamentCategory>(
        categoryKeys.detail(categoryId)
      )
      if (previousCategory) {
        queryClient.setQueryData<TournamentCategory>(categoryKeys.detail(categoryId), {
          ...previousCategory,
          logo_url: null,
        })
      }
    },
    onError: (error) => {
      toast.error(`로고 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(categoryId) })
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: categoryKeys.active() })
    },
  })
}

/**
 * Reorder categories (bulk priority update)
 */
export function useReorderCategoriesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (categoryIds: string[]) => {
      return await reorderCategories(categoryIds)
    },
    onSuccess: () => {
      toast.success('카테고리 순서가 변경되었습니다.')
    },
    onError: (error) => {
      toast.error(`순서 변경 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    },
    onSettled: () => {
      // Refetch all category lists
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: categoryKeys.active() })
    },
  })
}

/**
 * Toggle category active status
 */
export function useToggleActiveMutation(categoryId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return await toggleCategoryActive(categoryId)
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: categoryKeys.detail(categoryId) })

      // Snapshot previous value
      const previousCategory = queryClient.getQueryData<TournamentCategory>(
        categoryKeys.detail(categoryId)
      )

      // Optimistically toggle active status
      if (previousCategory) {
        queryClient.setQueryData<TournamentCategory>(categoryKeys.detail(categoryId), {
          ...previousCategory,
          is_active: !previousCategory.is_active,
        })
      }

      return { previousCategory }
    },
    onSuccess: (updatedCategory) => {
      toast.success(
        `카테고리 "${updatedCategory.display_name}"이 ${updatedCategory.is_active ? '활성화' : '비활성화'}되었습니다.`
      )
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousCategory) {
        queryClient.setQueryData(categoryKeys.detail(categoryId), context.previousCategory)
      }
      toast.error(`활성화 토글 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(categoryId) })
      queryClient.refetchQueries({ queryKey: categoryKeys.lists() })
      queryClient.refetchQueries({ queryKey: categoryKeys.active() })
    },
  })
}
