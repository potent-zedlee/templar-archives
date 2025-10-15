import { supabase } from './supabase'

export type HandBookmark = {
  id: string
  hand_id: string
  user_id: string
  folder_name?: string
  notes?: string
  created_at: string
}

export type HandBookmarkWithDetails = HandBookmark & {
  hand?: {
    id: string
    number: string
    description: string
    timestamp: string
    day?: {
      id: string
      name: string
      sub_event?: {
        id: string
        name: string
        tournament?: {
          id: string
          name: string
          category: string
        }
      }
    }
  }
}

/**
 * 핸드 북마크 추가
 */
export async function addHandBookmark(
  handId: string,
  userId: string,
  folderName?: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase.from('hand_bookmarks').insert({
    hand_id: handId,
    user_id: userId,
    folder_name: folderName || null,
    notes: notes || null,
  })

  if (error) {
    console.error('북마크 추가 실패:', error)
    throw error
  }
}

/**
 * 핸드 북마크 삭제
 */
export async function removeHandBookmark(handId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('hand_bookmarks')
    .delete()
    .eq('hand_id', handId)
    .eq('user_id', userId)

  if (error) {
    console.error('북마크 삭제 실패:', error)
    throw error
  }
}

/**
 * 핸드 북마크 토글 (추가 또는 삭제)
 */
export async function toggleHandBookmark(
  handId: string,
  userId: string,
  folderName?: string,
  notes?: string
): Promise<boolean> {
  // 기존 북마크 확인
  const { data: existingBookmark, error: checkError } = await supabase
    .from('hand_bookmarks')
    .select('id')
    .eq('hand_id', handId)
    .eq('user_id', userId)
    .single()

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 = no rows (북마크 없음)
    console.error('북마크 확인 실패:', checkError)
    throw checkError
  }

  // 북마크가 있으면 삭제, 없으면 추가
  if (existingBookmark) {
    await removeHandBookmark(handId, userId)
    return false // 삭제됨
  } else {
    await addHandBookmark(handId, userId, folderName, notes)
    return true // 추가됨
  }
}

/**
 * 사용자가 특정 핸드를 북마크했는지 확인
 */
export async function isHandBookmarked(handId: string, userId?: string): Promise<boolean> {
  if (!userId) return false

  const { data, error } = await supabase
    .from('hand_bookmarks')
    .select('id')
    .eq('hand_id', handId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('북마크 상태 확인 실패:', error)
    return false
  }

  return !!data
}

/**
 * 사용자의 모든 북마크 조회
 */
export async function getUserBookmarks(userId: string): Promise<HandBookmarkWithDetails[]> {
  const { data, error } = await supabase
    .from('hand_bookmarks')
    .select(
      `
      *,
      hand:hands!inner (
        id,
        number,
        description,
        timestamp,
        day:days!inner (
          id,
          name,
          sub_event:sub_events!inner (
            id,
            name,
            tournament:tournaments!inner (
              id,
              name,
              category
            )
          )
        )
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('북마크 목록 조회 실패:', error)
    throw error
  }

  return (data as any[]) || []
}

/**
 * 사용자의 북마크를 폴더별로 조회
 */
export async function getUserBookmarksByFolder(
  userId: string
): Promise<Map<string, HandBookmarkWithDetails[]>> {
  const bookmarks = await getUserBookmarks(userId)
  const folderMap = new Map<string, HandBookmarkWithDetails[]>()

  bookmarks.forEach((bookmark) => {
    const folderName = bookmark.folder_name || '기본'
    if (!folderMap.has(folderName)) {
      folderMap.set(folderName, [])
    }
    folderMap.get(folderName)!.push(bookmark)
  })

  return folderMap
}

/**
 * 사용자의 북마크 폴더 목록 조회
 */
export async function getUserBookmarkFolders(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('hand_bookmarks')
    .select('folder_name')
    .eq('user_id', userId)
    .not('folder_name', 'is', null)

  if (error) {
    console.error('폴더 목록 조회 실패:', error)
    return []
  }

  // 중복 제거 및 정렬
  const folders = [...new Set(data.map((item) => item.folder_name).filter(Boolean))]
  return folders.sort()
}

/**
 * 북마크 메모 업데이트
 */
export async function updateBookmarkNotes(
  handId: string,
  userId: string,
  notes: string
): Promise<void> {
  const { error } = await supabase
    .from('hand_bookmarks')
    .update({ notes })
    .eq('hand_id', handId)
    .eq('user_id', userId)

  if (error) {
    console.error('북마크 메모 업데이트 실패:', error)
    throw error
  }
}

/**
 * 북마크 폴더 변경
 */
export async function updateBookmarkFolder(
  handId: string,
  userId: string,
  folderName: string | null
): Promise<void> {
  const { error } = await supabase
    .from('hand_bookmarks')
    .update({ folder_name: folderName })
    .eq('hand_id', handId)
    .eq('user_id', userId)

  if (error) {
    console.error('북마크 폴더 변경 실패:', error)
    throw error
  }
}

/**
 * 여러 핸드의 북마크 상태를 한 번에 조회 (리스트용)
 */
export async function getBatchHandBookmarkStatus(
  handIds: string[],
  userId?: string
): Promise<Set<string>> {
  if (!userId) return new Set()

  const { data, error } = await supabase
    .from('hand_bookmarks')
    .select('hand_id')
    .in('hand_id', handIds)
    .eq('user_id', userId)

  if (error) {
    console.error('북마크 상태 일괄 조회 실패:', error)
    return new Set()
  }

  return new Set(data.map((item) => item.hand_id))
}
