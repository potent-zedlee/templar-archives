/**
 * Community React Query Hooks
 *
 * Community 페이지 (상세)의 데이터 페칭을 위한 React Query hooks (Firestore)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  increment,
  updateDoc,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  serverTimestamp,
  orderBy,
  limit as firestoreLimit,
} from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import type { FirestorePost, FirestoreComment, AuthorInfo } from '@/lib/firestore-types'

// ==================== Types ====================

export type PostCategory = 'analysis' | 'strategy' | 'hand-review' | 'general'

export type Post = {
  id: string
  title: string
  content: string
  category: PostCategory
  author: AuthorInfo
  stats: {
    likesCount: number
    commentsCount: number
  }
  tags?: string[]
  handId?: string
  hand?: {
    id: string
    number: string
    description: string
    timestamp: string
  }
  createdAt: string
  updatedAt: string
}

export type Comment = {
  id: string
  postId?: string
  handId?: string
  parentId?: string
  author: AuthorInfo
  content: string
  likesCount: number
  createdAt: string
  updatedAt: string
}

// ==================== Converters ====================

// Firestore Post with extended fields
interface FirestorePostExtended extends FirestorePost {
  category?: PostCategory
  handId?: string
}

const postConverter = {
  toFirestore(post: Partial<FirestorePostExtended>): DocumentData {
    return {
      ...post,
      createdAt: post.createdAt || serverTimestamp(),
      updatedAt: post.updatedAt || serverTimestamp(),
    }
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Post {
    const data = snapshot.data() as FirestorePostExtended
    return {
      id: snapshot.id,
      title: data.title,
      content: data.content,
      category: data.category || 'general',
      author: data.author,
      stats: {
        likesCount: data.stats?.likesCount || 0,
        commentsCount: data.stats?.commentsCount || 0,
      },
      tags: data.tags,
      handId: data.handId,
      createdAt: (data.createdAt as Timestamp)?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate?.()?.toISOString() || new Date().toISOString(),
    }
  }
}

const commentConverter = {
  toFirestore(comment: Partial<FirestoreComment>): DocumentData {
    return {
      ...comment,
      createdAt: comment.createdAt || serverTimestamp(),
      updatedAt: comment.updatedAt || serverTimestamp(),
    }
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Comment {
    const data = snapshot.data() as FirestoreComment & { likesCount?: number; postId?: string; handId?: string }
    return {
      id: snapshot.id,
      content: data.content,
      author: data.author,
      parentId: data.parentId,
      postId: data.postId,
      handId: data.handId,
      likesCount: data.likesCount || 0,
      createdAt: (data.createdAt as Timestamp)?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate?.()?.toISOString() || new Date().toISOString(),
    }
  }
}

// ==================== Query Keys ====================

export const communityKeys = {
  all: ['community'] as const,
  posts: () => [...communityKeys.all, 'posts'] as const,
  postsFiltered: (filters: FetchPostsOptions) => [...communityKeys.posts(), filters] as const,
  post: (postId: string) => [...communityKeys.posts(), postId] as const,
  comments: (postId: string) => [...communityKeys.all, 'comments', postId] as const,
  replies: (commentId: string) => [...communityKeys.all, 'replies', commentId] as const,
}

// ==================== Fetch Options ====================

export interface FetchPostsOptions {
  category?: PostCategory
  sortBy?: 'trending' | 'recent' | 'popular'
  limit?: number
  searchQuery?: string
  authorId?: string
  dateFrom?: string
  dateTo?: string
}

// ==================== Helper Functions ====================

/**
 * Fetch posts with filters
 */
export async function fetchPosts(options?: FetchPostsOptions): Promise<Post[]> {
  const postsRef = collection(firestore, 'posts')
  let q = query(postsRef)

  // Category filter
  if (options?.category) {
    q = query(q, where('category', '==', options.category))
  }

  // Author filter
  if (options?.authorId) {
    q = query(q, where('author.id', '==', options.authorId))
  }

  // Date range filter
  if (options?.dateFrom) {
    const fromDate = Timestamp.fromDate(new Date(options.dateFrom))
    q = query(q, where('createdAt', '>=', fromDate))
  }
  if (options?.dateTo) {
    const toDate = Timestamp.fromDate(new Date(options.dateTo + 'T23:59:59'))
    q = query(q, where('createdAt', '<=', toDate))
  }

  // Sorting
  if (options?.sortBy === 'trending') {
    q = query(q, orderBy('stats.likesCount', 'desc'))
  } else if (options?.sortBy === 'recent') {
    q = query(q, orderBy('createdAt', 'desc'))
  } else if (options?.sortBy === 'popular') {
    q = query(q, orderBy('stats.likesCount', 'desc'))
  } else {
    q = query(q, orderBy('createdAt', 'desc'))
  }

  // Limit
  if (options?.limit) {
    q = query(q, firestoreLimit(options.limit))
  }

  const snapshot = await getDocs(q)
  let posts = snapshot.docs.map(doc => postConverter.fromFirestore(doc))

  // Client-side search filtering (Firestore doesn't support full-text search natively)
  if (options?.searchQuery && options.searchQuery.trim()) {
    const searchLower = options.searchQuery.toLowerCase()
    posts = posts.filter(post =>
      post.title.toLowerCase().includes(searchLower) ||
      post.content.toLowerCase().includes(searchLower)
    )
  }

  return posts
}

/**
 * Fetch single post
 */
export async function fetchPost(postId: string): Promise<Post> {
  const postRef = doc(firestore, 'posts', postId)
  const postSnap = await getDoc(postRef)

  if (!postSnap.exists()) {
    throw new Error('Post not found')
  }

  return postConverter.fromFirestore(postSnap as QueryDocumentSnapshot)
}

/**
 * Create a new post
 */
export async function createPost(post: {
  title: string
  content: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  handId?: string
  category: PostCategory
}): Promise<Post> {
  const postsRef = collection(firestore, 'posts')

  const newPost = {
    title: post.title,
    content: post.content,
    category: post.category,
    author: {
      id: post.authorId,
      name: post.authorName,
      avatarUrl: post.authorAvatarUrl,
    },
    stats: {
      likesCount: 0,
      commentsCount: 0,
    },
    handId: post.handId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const docRef = await addDoc(postsRef, newPost)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    throw new Error('Failed to create post')
  }

  return postConverter.fromFirestore(snapshot as QueryDocumentSnapshot)
}

/**
 * Fetch comments for a post or hand (top-level only)
 */
export async function fetchComments(options: {
  postId?: string
  handId?: string
}): Promise<Comment[]> {
  let commentsRef
  if (options.postId) {
    commentsRef = collection(firestore, `posts/${options.postId}/comments`)
  } else if (options.handId) {
    commentsRef = collection(firestore, `hands/${options.handId}/comments`)
  } else {
    return []
  }

  // Top-level comments only (no parentId)
  const q = query(
    commentsRef,
    where('parentId', '==', null),
    orderBy('createdAt', 'asc')
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    ...commentConverter.fromFirestore(doc),
    postId: options.postId,
    handId: options.handId,
  }))
}

/**
 * Fetch replies for a comment
 */
export async function fetchReplies(commentId: string, postId?: string, handId?: string): Promise<Comment[]> {
  let commentsRef
  if (postId) {
    commentsRef = collection(firestore, `posts/${postId}/comments`)
  } else if (handId) {
    commentsRef = collection(firestore, `hands/${handId}/comments`)
  } else {
    return []
  }

  const q = query(
    commentsRef,
    where('parentId', '==', commentId),
    orderBy('createdAt', 'asc')
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    ...commentConverter.fromFirestore(doc),
    postId,
    handId,
  }))
}

/**
 * Create a new comment
 */
export async function createComment(comment: {
  postId?: string
  handId?: string
  parentId?: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  content: string
}): Promise<Comment> {
  let commentsRef
  if (comment.postId) {
    commentsRef = collection(firestore, `posts/${comment.postId}/comments`)
  } else if (comment.handId) {
    commentsRef = collection(firestore, `hands/${comment.handId}/comments`)
  } else {
    throw new Error('postId or handId is required')
  }

  const newComment = {
    content: comment.content,
    author: {
      id: comment.authorId,
      name: comment.authorName,
      avatarUrl: comment.authorAvatarUrl,
    },
    parentId: comment.parentId || null,
    postId: comment.postId,
    handId: comment.handId,
    likesCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const docRef = await addDoc(commentsRef, newComment)

  // Update comment count on post/hand
  if (comment.postId) {
    const postRef = doc(firestore, 'posts', comment.postId)
    await updateDoc(postRef, {
      'stats.commentsCount': increment(1),
    })
  }

  const snapshot = await getDoc(docRef)
  return {
    ...commentConverter.fromFirestore(snapshot as QueryDocumentSnapshot),
    postId: comment.postId,
    handId: comment.handId,
  }
}

/**
 * Toggle like on a comment
 */
export async function toggleCommentLike(
  commentId: string,
  userId: string,
  postId?: string,
  handId?: string
): Promise<boolean> {
  let likesPath
  let commentPath
  if (postId) {
    likesPath = `posts/${postId}/comments/${commentId}/likes`
    commentPath = `posts/${postId}/comments/${commentId}`
  } else if (handId) {
    likesPath = `hands/${handId}/comments/${commentId}/likes`
    commentPath = `hands/${handId}/comments/${commentId}`
  } else {
    throw new Error('postId or handId is required')
  }

  const likesRef = collection(firestore, likesPath)
  const likeQuery = query(likesRef, where('userId', '==', userId))
  const likeSnapshot = await getDocs(likeQuery)

  const commentRef = doc(firestore, commentPath)

  if (!likeSnapshot.empty) {
    // Unlike
    const likeDoc = likeSnapshot.docs[0]
    await deleteDoc(doc(firestore, `${likesPath}/${likeDoc.id}`))
    await updateDoc(commentRef, {
      likesCount: increment(-1),
    })
    return false
  } else {
    // Like
    await addDoc(likesRef, {
      userId,
      createdAt: serverTimestamp(),
    })
    await updateDoc(commentRef, {
      likesCount: increment(1),
    })
    return true
  }
}

/**
 * Toggle post like
 */
export async function togglePostLike(postId: string, userId: string): Promise<boolean> {
  const likesRef = collection(firestore, `posts/${postId}/likes`)
  const likeQuery = query(likesRef, where('userId', '==', userId))
  const likeSnapshot = await getDocs(likeQuery)

  const postRef = doc(firestore, 'posts', postId)

  if (!likeSnapshot.empty) {
    // Unlike: 삭제
    const likeDoc = likeSnapshot.docs[0]
    await deleteDoc(doc(firestore, `posts/${postId}/likes/${likeDoc.id}`))

    // 카운트 감소
    await updateDoc(postRef, {
      'stats.likesCount': increment(-1),
    })

    return false // Unliked
  } else {
    // Like: 추가
    await addDoc(likesRef, {
      userId,
      createdAt: serverTimestamp(),
    })

    // 카운트 증가
    await updateDoc(postRef, {
      'stats.likesCount': increment(1),
    })

    return true // Liked
  }
}

// ==================== Queries ====================

/**
 * Get single post detail
 */
export function usePostQuery(postId: string) {
  return useQuery({
    queryKey: communityKeys.post(postId),
    queryFn: async () => {
      return await fetchPost(postId)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: !!postId, // postId가 있을 때만 실행
  })
}

// ==================== Mutations ====================

/**
 * Toggle post like (Optimistic Update)
 */
export function useLikePostMutation(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      return await togglePostLike(postId, userId)
    },
    onMutate: async ({ postId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: communityKeys.post(postId) })

      // Snapshot the previous value
      const previousPost = queryClient.getQueryData<Post>(communityKeys.post(postId))

      // Optimistically update the cache
      if (previousPost) {
        queryClient.setQueryData<Post>(communityKeys.post(postId), {
          ...previousPost,
          stats: {
            ...previousPost.stats,
            likesCount: previousPost.stats.likesCount + 1, // 일단 증가로 가정
          },
        })
      }

      return { previousPost }
    },
    onSuccess: (liked, { postId }) => {
      // 실제 서버 응답으로 정확한 값 설정
      const previousPost = queryClient.getQueryData<Post>(communityKeys.post(postId))
      if (previousPost) {
        queryClient.setQueryData<Post>(communityKeys.post(postId), {
          ...previousPost,
          stats: {
            ...previousPost.stats,
            likesCount: previousPost.stats.likesCount + (liked ? 1 : -1),
          },
        })
      }
    },
    onError: (_err, { postId }, context) => {
      // Rollback on error
      if (context?.previousPost) {
        queryClient.setQueryData(communityKeys.post(postId), context.previousPost)
      }
    },
    onSettled: (_data, _error, { postId }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: communityKeys.post(postId) })
    },
  })
}
