import { createClientSupabaseClient } from './supabase-client'

export type Post = {
  id: string
  title: string
  content: string
  author_id: string
  author_name: string
  author_avatar?: string
  hand_id?: string
  category: 'analysis' | 'strategy' | 'hand-review' | 'general'
  likes_count: number
  comments_count: number
  created_at: string
  updated_at: string
  // users 테이블 조인 (선택적)
  users?: {
    nickname: string
    avatar_url?: string
  }
  // hand 테이블 조인 (선택적)
  hand?: {
    id: string
    number: string
    description: string
    timestamp: string
  }
}

export type Comment = {
  id: string
  post_id?: string
  hand_id?: string
  parent_comment_id?: string
  author_id: string
  author_name: string
  author_avatar?: string
  content: string
  likes_count: number
  created_at: string
  updated_at: string
  // users 테이블 조인 (선택적)
  users?: {
    nickname: string
    avatar_url?: string
  }
}

export type Like = {
  id: string
  user_id: string
  post_id?: string
  comment_id?: string
  created_at: string
}

// Fetch all posts with optional filters
export async function fetchPosts(options?: {
  category?: Post['category']
  sortBy?: 'trending' | 'recent' | 'popular'
  limit?: number
  searchQuery?: string
  authorId?: string
  dateFrom?: string
  dateTo?: string
}) {
  const supabase = createClientSupabaseClient()

  let query = supabase
    .from('posts')
    .select(`
      *,
      users:author_id (nickname, avatar_url),
      hand:hand_id (id, number, description, timestamp)
    `)

  // Category filter
  if (options?.category) {
    query = query.eq('category', options.category)
  }

  // Full-text search
  if (options?.searchQuery && options.searchQuery.trim()) {
    // Use PostgreSQL full-text search with to_tsquery
    query = query.textSearch('search_vector', options.searchQuery.trim(), {
      type: 'websearch',
      config: 'english'
    })
  }

  // Author filter
  if (options?.authorId) {
    query = query.eq('author_id', options.authorId)
  }

  // Date range filter
  if (options?.dateFrom) {
    query = query.gte('created_at', options.dateFrom)
  }
  if (options?.dateTo) {
    query = query.lte('created_at', options.dateTo)
  }

  // Sorting
  if (options?.sortBy === 'trending') {
    query = query.order('likes_count', { ascending: false })
           .order('comments_count', { ascending: false })
  } else if (options?.sortBy === 'recent') {
    query = query.order('created_at', { ascending: false })
  } else if (options?.sortBy === 'popular') {
    query = query.order('likes_count', { ascending: false })
  }

  // Limit
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) throw error

  // users 테이블에서 가져온 정보를 author_name, author_avatar에 반영
  return (data as any[]).map((post) => ({
    ...post,
    author_name: post.users?.nickname || post.author_name,
    author_avatar: post.users?.avatar_url || post.author_avatar,
  })) as Post[]
}

// Fetch single post
export async function fetchPost(id: string) {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      users:author_id (nickname, avatar_url)
    `)
    .eq('id', id)
    .single()

  if (error) throw error

  // users 테이블에서 가져온 정보를 author_name, author_avatar에 반영
  const post = data as any
  return {
    ...post,
    author_name: post.users?.nickname || post.author_name,
    author_avatar: post.users?.avatar_url || post.author_avatar,
  } as Post
}

// Fetch comments for a post or hand
export async function fetchComments(options: {
  postId?: string
  handId?: string
}) {
  const supabase = createClientSupabaseClient()

  let query = supabase
    .from('comments')
    .select(`
      *,
      users:author_id (nickname, avatar_url)
    `)
    .is('parent_comment_id', null) // Top-level comments only
    .order('created_at', { ascending: true })

  if (options.postId) {
    query = query.eq('post_id', options.postId)
  } else if (options.handId) {
    query = query.eq('hand_id', options.handId)
  }

  const { data, error } = await query

  if (error) throw error

  // users 테이블에서 가져온 정보를 author_name, author_avatar에 반영
  return (data as any[]).map((comment) => ({
    ...comment,
    author_name: comment.users?.nickname || comment.author_name,
    author_avatar: comment.users?.avatar_url || comment.author_avatar,
  })) as Comment[]
}

// Fetch replies to a comment
export async function fetchReplies(commentId: string) {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      users:author_id (nickname, avatar_url)
    `)
    .eq('parent_comment_id', commentId)
    .order('created_at', { ascending: true })

  if (error) throw error

  // users 테이블에서 가져온 정보를 author_name, author_avatar에 반영
  return (data as any[]).map((comment) => ({
    ...comment,
    author_name: comment.users?.nickname || comment.author_name,
    author_avatar: comment.users?.avatar_url || comment.author_avatar,
  })) as Comment[]
}

// Create a new post
export async function createPost(post: {
  title: string
  content: string
  author_id: string
  hand_id?: string
  category: Post['category']
}) {
  const supabase = createClientSupabaseClient()

  // author_id에서 사용자 정보를 가져와서 함께 저장
  const { data: user } = await supabase
    .from('users')
    .select('nickname, avatar_url')
    .eq('id', post.author_id)
    .single()

  const { data, error } = await supabase
    .from('posts')
    .insert({
      ...post,
      author_name: user?.nickname || '',
      author_avatar: user?.avatar_url,
    })
    .select()
    .single()

  if (error) throw error
  return data as Post
}

// Create a new comment
export async function createComment(comment: {
  post_id?: string
  hand_id?: string
  parent_comment_id?: string
  author_id: string
  content: string
}) {
  const supabase = createClientSupabaseClient()

  // author_id에서 사용자 정보를 가져와서 함께 저장
  const { data: user } = await supabase
    .from('users')
    .select('nickname, avatar_url')
    .eq('id', comment.author_id)
    .single()

  const { data, error } = await supabase
    .from('comments')
    .insert({
      ...comment,
      author_name: user?.nickname || '',
      author_avatar: user?.avatar_url,
    })
    .select()
    .single()

  if (error) throw error
  return data as Comment
}

// Toggle like on a post
export async function togglePostLike(postId: string, userId: string) {
  const supabase = createClientSupabaseClient()

  // Check if already liked
  const { data: existingLike } = await supabase
    .from('likes')
    .select('*')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .single()

  if (existingLike) {
    // Unlike
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('id', existingLike.id)

    if (error) throw error
    return false // Unliked
  } else {
    // Like
    const { error } = await supabase
      .from('likes')
      .insert({
        user_id: userId,
        post_id: postId
      })

    if (error) throw error
    return true // Liked
  }
}

// Toggle like on a comment
export async function toggleCommentLike(commentId: string, userId: string) {
  const supabase = createClientSupabaseClient()

  // Check if already liked
  const { data: existingLike } = await supabase
    .from('likes')
    .select('*')
    .eq('user_id', userId)
    .eq('comment_id', commentId)
    .single()

  if (existingLike) {
    // Unlike
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('id', existingLike.id)

    if (error) throw error
    return false // Unliked
  } else {
    // Like
    const { error } = await supabase
      .from('likes')
      .insert({
        user_id: userId,
        comment_id: commentId
      })

    if (error) throw error
    return true // Liked
  }
}

// Check if user has liked a post
export async function hasLikedPost(postId: string, userId: string) {
  const supabase = createClientSupabaseClient()

  const { data } = await supabase
    .from('likes')
    .select('*')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .single()

  return !!data
}

// Check if user has liked a comment
export async function hasLikedComment(commentId: string, userId: string) {
  const supabase = createClientSupabaseClient()

  const { data } = await supabase
    .from('likes')
    .select('*')
    .eq('user_id', userId)
    .eq('comment_id', commentId)
    .single()

  return !!data
}

// Fetch weekly popular posts (last 7 days, sorted by engagement)
export async function fetchWeeklyPopularPosts(limit: number = 5) {
  const supabase = createClientSupabaseClient()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      author_name,
      author_avatar,
      category,
      likes_count,
      comments_count,
      created_at,
      users:author_id (nickname, avatar_url)
    `)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('likes_count', { ascending: false })
    .order('comments_count', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data as any[]).map((post) => ({
    ...post,
    author_name: post.users?.nickname || post.author_name,
    author_avatar: post.users?.avatar_url || post.author_avatar,
  }))
}

// Fetch best comments of the day (today, sorted by likes)
export async function fetchBestComments(limit: number = 3) {
  const supabase = createClientSupabaseClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      author_name,
      author_avatar,
      likes_count,
      created_at,
      post_id,
      users:author_id (nickname, avatar_url),
      posts:post_id (id, title)
    `)
    .gte('created_at', today.toISOString())
    .order('likes_count', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data as any[]).map((comment) => ({
    ...comment,
    author_name: comment.users?.nickname || comment.author_name,
    author_avatar: comment.users?.avatar_url || comment.author_avatar,
    post_title: comment.posts?.title || '',
  }))
}

// Fetch popular categories with post counts
export async function fetchPopularCategories() {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('posts')
    .select('category')

  if (error) throw error

  // Count posts per category
  const categoryCounts: Record<string, number> = {}
  data.forEach((post: any) => {
    categoryCounts[post.category] = (categoryCounts[post.category] || 0) + 1
  })

  // Sort by count descending
  return Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
}
