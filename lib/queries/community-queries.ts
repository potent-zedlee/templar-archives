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
} from 'firebase/firestore'
import { firestore, auth } from '@/lib/firebase'
import type { FirestorePost, AuthorInfo } from '@/lib/firestore-types'

// ==================== Types ====================

export type Post = {
  id: string
  title: string
  content: string
  author: AuthorInfo
  stats: {
    likesCount: number
    commentsCount: number
  }
  tags?: string[]
  createdAt: string
  updatedAt: string
}

// ==================== Converters ====================

const postConverter = {
  toFirestore(post: Partial<FirestorePost>): DocumentData {
    return {
      ...post,
      createdAt: post.createdAt || serverTimestamp(),
      updatedAt: post.updatedAt || serverTimestamp(),
    }
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Post {
    const data = snapshot.data() as FirestorePost
    return {
      id: snapshot.id,
      title: data.title,
      content: data.content,
      author: data.author,
      stats: {
        likesCount: data.stats.likesCount,
        commentsCount: data.stats.commentsCount,
      },
      tags: data.tags,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
    }
  }
}

// ==================== Query Keys ====================

export const communityKeys = {
  all: ['community'] as const,
  posts: () => [...communityKeys.all, 'posts'] as const,
  post: (postId: string) => [...communityKeys.posts(), postId] as const,
}

// ==================== Helper Functions ====================

/**
 * Fetch single post
 */
async function fetchPost(postId: string): Promise<Post> {
  const postRef = doc(firestore, 'posts', postId).withConverter(postConverter)
  const postSnap = await getDoc(postRef)

  if (!postSnap.exists()) {
    throw new Error('Post not found')
  }

  return postSnap.data()
}

/**
 * Toggle post like
 */
async function togglePostLike(postId: string, userId: string): Promise<boolean> {
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
    onError: (err, { postId }, context) => {
      // Rollback on error
      if (context?.previousPost) {
        queryClient.setQueryData(communityKeys.post(postId), context.previousPost)
      }
    },
    onSettled: (data, error, { postId }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: communityKeys.post(postId) })
    },
  })
}
