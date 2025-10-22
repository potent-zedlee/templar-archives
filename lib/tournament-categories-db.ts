/**
 * Tournament Categories Database Operations
 *
 * 토너먼트 카테고리 CRUD 및 로고 업로드 함수
 */

import { createClientSupabaseClient } from './supabase-client'

export interface TournamentCategory {
  id: string
  name: string
  display_name: string
  short_name?: string | null
  aliases: string[]
  logo_url?: string | null
  region: 'premier' | 'regional' | 'online' | 'specialty'
  priority: number
  website?: string | null
  is_active: boolean
  theme_gradient?: string | null
  theme_text?: string | null
  theme_shadow?: string | null
  created_at: string
  updated_at: string
}

export interface CategoryInput {
  id: string
  name: string
  display_name: string
  short_name?: string
  aliases?: string[]
  logo_url?: string
  region: 'premier' | 'regional' | 'online' | 'specialty'
  priority?: number
  website?: string
  is_active?: boolean
  theme_gradient?: string
  theme_text?: string
  theme_shadow?: string
}

export interface CategoryUpdateInput extends Partial<Omit<CategoryInput, 'id'>> {}

/**
 * 모든 카테고리 조회 (Admin용)
 */
export async function getAllCategories(includeInactive = false): Promise<TournamentCategory[]> {
  const supabase = createClientSupabaseClient()

  let query = supabase
    .from('tournament_categories')
    .select('*')
    .order('priority', { ascending: true })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`)
  }

  return data || []
}

/**
 * 활성화된 카테고리만 조회 (Public)
 */
export async function getActiveCategories(): Promise<TournamentCategory[]> {
  return getAllCategories(false)
}

/**
 * Region별 카테고리 조회
 */
export async function getCategoriesByRegion(
  region: 'premier' | 'regional' | 'online' | 'specialty'
): Promise<TournamentCategory[]> {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_categories')
    .select('*')
    .eq('region', region)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch categories by region: ${error.message}`)
  }

  return data || []
}

/**
 * ID로 카테고리 조회
 */
export async function getCategoryById(id: string): Promise<TournamentCategory | null> {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch category: ${error.message}`)
  }

  return data
}

/**
 * 별칭으로 카테고리 조회
 */
export async function getCategoryByAlias(alias: string): Promise<TournamentCategory | null> {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_categories')
    .select('*')
    .contains('aliases', [alias])
    .eq('is_active', true)
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch category by alias: ${error.message}`)
  }

  return data
}

/**
 * 카테고리 생성
 */
export async function createCategory(input: CategoryInput): Promise<TournamentCategory> {
  const supabase = createClientSupabaseClient()

  // ID 중복 확인
  const existing = await getCategoryById(input.id)
  if (existing) {
    throw new Error(`Category with ID "${input.id}" already exists`)
  }

  const { data, error } = await supabase
    .from('tournament_categories')
    .insert({
      id: input.id,
      name: input.name,
      display_name: input.display_name,
      short_name: input.short_name || null,
      aliases: input.aliases || [],
      logo_url: input.logo_url || null,
      region: input.region,
      priority: input.priority ?? 50,
      website: input.website || null,
      is_active: input.is_active ?? true,
      theme_gradient: input.theme_gradient || null,
      theme_text: input.theme_text || null,
      theme_shadow: input.theme_shadow || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create category: ${error.message}`)
  }

  return data
}

/**
 * 카테고리 수정
 */
export async function updateCategory(
  id: string,
  input: CategoryUpdateInput
): Promise<TournamentCategory> {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_categories')
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.display_name !== undefined && { display_name: input.display_name }),
      ...(input.short_name !== undefined && { short_name: input.short_name || null }),
      ...(input.aliases !== undefined && { aliases: input.aliases }),
      ...(input.logo_url !== undefined && { logo_url: input.logo_url || null }),
      ...(input.region !== undefined && { region: input.region }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.website !== undefined && { website: input.website || null }),
      ...(input.is_active !== undefined && { is_active: input.is_active }),
      ...(input.theme_gradient !== undefined && { theme_gradient: input.theme_gradient || null }),
      ...(input.theme_text !== undefined && { theme_text: input.theme_text || null }),
      ...(input.theme_shadow !== undefined && { theme_shadow: input.theme_shadow || null }),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update category: ${error.message}`)
  }

  return data
}

/**
 * 카테고리 삭제
 * (사용 중인 토너먼트가 있으면 트리거에서 에러 발생)
 */
export async function deleteCategory(id: string): Promise<void> {
  const supabase = createClientSupabaseClient()

  // 사용 여부 확인
  const usageCount = await getCategoryUsageCount(id)
  if (usageCount > 0) {
    throw new Error(
      `Cannot delete category because it is used by ${usageCount} tournament(s). ` +
      `Please reassign or delete those tournaments first.`
    )
  }

  const { error } = await supabase
    .from('tournament_categories')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete category: ${error.message}`)
  }
}

/**
 * 카테고리 사용 개수 확인
 */
export async function getCategoryUsageCount(categoryId: string): Promise<number> {
  const supabase = createClientSupabaseClient()

  const { count, error } = await supabase
    .from('tournaments')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)

  if (error) {
    throw new Error(`Failed to get category usage count: ${error.message}`)
  }

  return count || 0
}

/**
 * 카테고리 활성화/비활성화 토글
 */
export async function toggleCategoryActive(id: string): Promise<TournamentCategory> {
  const supabase = createClientSupabaseClient()

  // 현재 상태 조회
  const category = await getCategoryById(id)
  if (!category) {
    throw new Error(`Category with ID "${id}" not found`)
  }

  // 토글
  return updateCategory(id, { is_active: !category.is_active })
}

/**
 * 카테고리 우선순위 일괄 업데이트
 */
export async function reorderCategories(
  categoryIds: string[]
): Promise<TournamentCategory[]> {
  const supabase = createClientSupabaseClient()

  // 각 카테고리의 priority를 순서대로 업데이트
  const updates = categoryIds.map((id, index) =>
    supabase
      .from('tournament_categories')
      .update({ priority: index + 1 })
      .eq('id', id)
  )

  await Promise.all(updates)

  // 업데이트된 카테고리 목록 반환
  return getAllCategories(true)
}

/**
 * 로고 업로드
 */
export async function uploadCategoryLogo(
  categoryId: string,
  file: File
): Promise<string> {
  const supabase = createClientSupabaseClient()

  // 파일 크기 확인 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB')
  }

  // 파일 타입 확인
  const allowedTypes = ['image/svg+xml', 'image/png', 'image/jpeg']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('File must be SVG, PNG, or JPEG')
  }

  // 파일 확장자
  const fileExt = file.name.split('.').pop()
  const fileName = `${categoryId}.${fileExt}`
  const filePath = `${fileName}`

  // 기존 로고 삭제 (있으면)
  const category = await getCategoryById(categoryId)
  if (category?.logo_url && category.logo_url.includes('tournament-logos')) {
    const oldFileName = category.logo_url.split('/').pop()
    if (oldFileName) {
      await supabase.storage
        .from('tournament-logos')
        .remove([oldFileName])
    }
  }

  // 새 로고 업로드
  const { error: uploadError } = await supabase.storage
    .from('tournament-logos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true, // 같은 이름이면 덮어쓰기
    })

  if (uploadError) {
    throw new Error(`Failed to upload logo: ${uploadError.message}`)
  }

  // Public URL 가져오기
  const { data: { publicUrl } } = supabase.storage
    .from('tournament-logos')
    .getPublicUrl(filePath)

  // 카테고리의 logo_url 업데이트
  await updateCategory(categoryId, { logo_url: publicUrl })

  return publicUrl
}

/**
 * 로고 삭제
 */
export async function deleteCategoryLogo(categoryId: string): Promise<void> {
  const supabase = createClientSupabaseClient()

  const category = await getCategoryById(categoryId)
  if (!category || !category.logo_url) {
    return // 로고가 없으면 아무것도 하지 않음
  }

  // Storage에서 삭제 (Supabase Storage URL인 경우만)
  if (category.logo_url.includes('tournament-logos')) {
    const fileName = category.logo_url.split('/').pop()
    if (fileName) {
      await supabase.storage
        .from('tournament-logos')
        .remove([fileName])
    }
  }

  // 카테고리의 logo_url NULL로 설정
  await updateCategory(categoryId, { logo_url: null })
}

/**
 * 검색 (이름, display_name, aliases로 검색)
 */
export async function searchCategories(query: string): Promise<TournamentCategory[]> {
  const supabase = createClientSupabaseClient()

  const lowerQuery = query.toLowerCase()

  // 모든 카테고리를 가져와서 클라이언트에서 필터링
  // (Postgres의 배열 검색이 복잡하므로)
  const { data, error } = await supabase
    .from('tournament_categories')
    .select('*')
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to search categories: ${error.message}`)
  }

  // 클라이언트에서 필터링
  return (data || []).filter((cat) =>
    cat.name.toLowerCase().includes(lowerQuery) ||
    cat.display_name.toLowerCase().includes(lowerQuery) ||
    cat.short_name?.toLowerCase().includes(lowerQuery) ||
    cat.aliases.some((alias) => alias.toLowerCase().includes(lowerQuery))
  )
}
