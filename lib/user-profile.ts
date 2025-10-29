import { createClientSupabaseClient } from './supabase-client'

export type UserProfile = {
  id: string
  email: string
  nickname: string
  role: 'user' | 'high_templar' | 'reporter' | 'admin'
  avatar_url?: string
  bio?: string
  poker_experience?: string
  location?: string
  website?: string
  twitter_handle?: string
  instagram_handle?: string
  profile_visibility?: 'public' | 'private' | 'friends'
  posts_count: number
  comments_count: number
  likes_received: number
  created_at: string
  updated_at: string
}

/**
 * 사용자 프로필 조회
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('프로필 조회 실패:', error)
    return null
  }

  return data as UserProfile
}

/**
 * 현재 로그인한 사용자의 프로필 조회
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = createClientSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  return getProfile(user.id)
}

/**
 * 프로필 수정
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'nickname' | 'avatar_url' | 'bio' | 'poker_experience'>>
): Promise<UserProfile | null> {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('프로필 수정 실패:', error)
    throw error
  }

  return data as UserProfile
}

/**
 * 닉네임 중복 체크
 * @returns true = 사용 가능, false = 이미 사용 중
 */
export async function checkNicknameAvailable(nickname: string, currentUserId?: string): Promise<boolean> {
  const supabase = createClientSupabaseClient()
  let query = supabase
    .from('users')
    .select('id')
    .eq('nickname', nickname)

  // 현재 사용자 ID가 있으면 제외 (자신의 닉네임은 OK)
  if (currentUserId) {
    query = query.neq('id', currentUserId)
  }

  const { data, error } = await query.single()

  // 에러가 있고, 에러 코드가 PGRST116 (no rows)이면 사용 가능
  if (error && error.code === 'PGRST116') {
    return true
  }

  // 데이터가 있으면 이미 사용 중
  return !data
}

/**
 * 닉네임으로 사용자 조회
 */
export async function getUserByNickname(nickname: string): Promise<UserProfile | null> {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('nickname', nickname)
    .single()

  if (error) {
    console.error('사용자 조회 실패:', error)
    return null
  }

  return data as UserProfile
}

/**
 * 사용자가 프로필 설정을 완료했는지 확인
 * (닉네임이 임시 닉네임 형식이 아닌지 체크)
 */
export async function hasCompletedProfile(userId: string): Promise<boolean> {
  const profile = await getProfile(userId)

  if (!profile) {
    return false
  }

  // 임시 닉네임 형식 체크: user123456 같은 형식
  const isTempNickname = /^[a-z]+\d{6}$/.test(profile.nickname)

  // 임시 닉네임이 아니면 프로필 설정 완료로 간주
  return !isTempNickname
}

/**
 * 사용자의 포스트 목록 조회
 */
export async function fetchUserPosts(userId: string, limit: number = 10) {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      content,
      category,
      likes_count,
      comments_count,
      created_at,
      hand:hand_id (id, number, description, timestamp)
    `)
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

/**
 * 사용자의 댓글 목록 조회
 */
export async function fetchUserComments(userId: string, limit: number = 10) {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      likes_count,
      created_at,
      post:post_id (id, title),
      hand:hand_id (id, number, description, timestamp)
    `)
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

/**
 * 사용자의 북마크 목록 조회
 */
export async function fetchUserBookmarks(userId: string, limit: number = 20) {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase
    .from('hand_bookmarks')
    .select(`
      id,
      folder_name,
      notes,
      created_at,
      hand:hand_id (
        id,
        number,
        description,
        timestamp,
        pot,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

/**
 * 사용자의 전체 활동 요약 조회
 */
export async function fetchUserActivity(userId: string) {
  const [posts, comments, bookmarks] = await Promise.all([
    fetchUserPosts(userId, 5),
    fetchUserComments(userId, 5),
    fetchUserBookmarks(userId, 5)
  ])

  return {
    posts,
    comments,
    bookmarks
  }
}

/**
 * 아바타 이미지 업로드
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = createClientSupabaseClient()

  // File size validation (max 5MB)
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기는 5MB를 초과할 수 없습니다.')
  }

  // MIME type validation
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('허용되지 않는 파일 형식입니다. JPG, PNG, GIF, WEBP 파일만 업로드 가능합니다.')
  }

  // File extension validation (whitelist)
  const fileExt = file.name.split('.').pop()?.toLowerCase()
  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
    throw new Error('허용되지 않는 파일 확장자입니다.')
  }

  const fileName = `${userId}-${Date.now()}.${fileExt}`
  const filePath = `avatars/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('user-uploads')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from('user-uploads')
    .getPublicUrl(filePath)

  return data.publicUrl
}
