/**
 * User Profile Service (Firestore)
 *
 * 사용자 프로필 관련 Firestore 작업 함수들
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { firestore, auth } from '@/lib/firebase'
import type { FirestoreUser } from '@/lib/firestore-types'
import { COLLECTION_PATHS } from '@/lib/firestore-types'
import { isAdminEmail } from '@/lib/auth-utils'

/**
 * UserProfile 타입 (API 응답용)
 *
 * Firestore 타입과 별도로 관리하여 API 호환성 유지
 */
export type UserProfile = {
  id: string
  email: string
  nickname: string
  role: 'user' | 'high_templar' | 'arbiter' | 'admin'
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
 * Firestore 문서를 UserProfile로 변환
 */
function firestoreUserToProfile(id: string, data: FirestoreUser): UserProfile {
  return {
    id,
    email: data.email,
    nickname: data.nickname || `user${id.substring(0, 6)}`,
    role: data.role,
    avatar_url: data.avatarUrl,
    bio: data.bio,
    poker_experience: data.pokerExperience,
    location: data.location,
    website: data.website,
    twitter_handle: data.twitterHandle,
    instagram_handle: data.instagramHandle,
    profile_visibility: data.profileVisibility || 'public',
    posts_count: data.stats.postsCount,
    comments_count: data.stats.commentsCount,
    likes_received: data.likesReceived || 0,
    created_at: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    updated_at: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
  }
}

/**
 * 사용자 프로필 조회
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(firestore, COLLECTION_PATHS.USERS, userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return null
    }

    return firestoreUserToProfile(userSnap.id, userSnap.data() as FirestoreUser)
  } catch (error) {
    console.error('프로필 조회 실패:', error)
    return null
  }
}

/**
 * 신규 사용자 프로필 생성
 * Firebase Auth 정보를 기반으로 Firestore에 사용자 문서 생성
 */
export async function createProfile(user: {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}): Promise<UserProfile | null> {
  try {
    const userRef = doc(firestore, COLLECTION_PATHS.USERS, user.uid)

    // 이미 존재하는지 확인
    const existing = await getDoc(userRef)
    if (existing.exists()) {
      return firestoreUserToProfile(existing.id, existing.data() as FirestoreUser)
    }

    // Google displayName이 있으면 사용, 없으면 임시 닉네임 생성
    const tempNickname = user.displayName || `user${Math.random().toString(36).substring(2, 8)}`

    // 관리자 이메일인 경우 admin 역할 부여
    const userRole = isAdminEmail(user.email) ? 'admin' : 'user'

    const newUser: FirestoreUser = {
      email: user.email || '',
      nickname: tempNickname,
      avatarUrl: user.photoURL || undefined,
      role: userRole,
      emailVerified: true,
      stats: {
        postsCount: 0,
        commentsCount: 0,
      },
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    }

    await setDoc(userRef, newUser)

    // 생성된 프로필 반환
    return {
      id: user.uid,
      email: newUser.email,
      nickname: tempNickname,
      role: userRole,
      avatar_url: newUser.avatarUrl,
      posts_count: 0,
      comments_count: 0,
      likes_received: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error('프로필 생성 실패:', error)
    return null
  }
}

/**
 * 현재 로그인한 사용자의 프로필 조회
 *
 * Firebase Auth UID로 Firestore에서 프로필 조회
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = auth.currentUser

  if (!user) {
    return null
  }

  return await getProfile(user.uid)
}

/**
 * 프로필 수정
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile,
    'nickname' | 'avatar_url' | 'bio' | 'poker_experience' |
    'location' | 'website' | 'twitter_handle' | 'instagram_handle' | 'profile_visibility'
  >>
): Promise<UserProfile | null> {
  try {
    const userRef = doc(firestore, COLLECTION_PATHS.USERS, userId)

    // UserProfile 필드를 FirestoreUser 필드로 매핑
    const firestoreUpdates: Partial<FirestoreUser> = {
      updatedAt: serverTimestamp() as Timestamp,
    }

    if (updates.nickname !== undefined) {
      firestoreUpdates.nickname = updates.nickname
    }

    if (updates.avatar_url !== undefined) {
      firestoreUpdates.avatarUrl = updates.avatar_url
    }

    if (updates.bio !== undefined) {
      firestoreUpdates.bio = updates.bio
    }

    if (updates.poker_experience !== undefined) {
      firestoreUpdates.pokerExperience = updates.poker_experience
    }

    if (updates.location !== undefined) {
      firestoreUpdates.location = updates.location
    }

    if (updates.website !== undefined) {
      firestoreUpdates.website = updates.website
    }

    if (updates.twitter_handle !== undefined) {
      firestoreUpdates.twitterHandle = updates.twitter_handle
    }

    if (updates.instagram_handle !== undefined) {
      firestoreUpdates.instagramHandle = updates.instagram_handle
    }

    if (updates.profile_visibility !== undefined) {
      firestoreUpdates.profileVisibility = updates.profile_visibility
    }

    await updateDoc(userRef, firestoreUpdates as Record<string, unknown>)

    // 업데이트된 프로필 조회
    const updatedProfile = await getProfile(userId)
    return updatedProfile
  } catch (error) {
    console.error('프로필 수정 실패:', error)
    throw error
  }
}

/**
 * 닉네임 중복 체크
 * @returns true = 사용 가능, false = 이미 사용 중
 */
export async function checkNicknameAvailable(nickname: string, currentUserId?: string): Promise<boolean> {
  try {
    const usersRef = collection(firestore, COLLECTION_PATHS.USERS)
    const q = query(usersRef, where('nickname', '==', nickname), firestoreLimit(1))

    const querySnapshot = await getDocs(q)

    // 결과가 없으면 사용 가능
    if (querySnapshot.empty) {
      return true
    }

    // 현재 사용자의 닉네임이면 사용 가능
    if (currentUserId) {
      const existingUser = querySnapshot.docs[0]
      if (existingUser.id === currentUserId) {
        return true
      }
    }

    // 다른 사용자가 사용 중
    return false
  } catch (error) {
    console.error('닉네임 중복 체크 실패:', error)
    return false
  }
}

/**
 * 닉네임으로 사용자 조회
 */
export async function getUserByNickname(nickname: string): Promise<UserProfile | null> {
  try {
    const usersRef = collection(firestore, COLLECTION_PATHS.USERS)
    const q = query(usersRef, where('nickname', '==', nickname), firestoreLimit(1))

    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.error('사용자를 찾을 수 없습니다:', nickname)
      return null
    }

    const userDoc = querySnapshot.docs[0]
    return firestoreUserToProfile(userDoc.id, userDoc.data() as FirestoreUser)
  } catch (error) {
    console.error('사용자 조회 실패:', error)
    return null
  }
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
 * UserPost 타입 (API 응답용)
 */
export type UserPost = {
  id: string
  title: string
  content: string
  category: string
  likesCount: number
  commentsCount: number
  createdAt: string
}

/**
 * 사용자의 포스트 목록 조회
 */
export async function fetchUserPosts(userId: string, limit: number = 10): Promise<UserPost[]> {
  try {
    const postsRef = collection(firestore, COLLECTION_PATHS.POSTS)
    const q = query(
      postsRef,
      where('author.id', '==', userId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    )

    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || '',
        content: data.content || '',
        category: data.category || '',
        likesCount: data.stats?.likesCount || 0,
        commentsCount: data.stats?.commentsCount || 0,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : new Date().toISOString(),
      }
    })
  } catch (error) {
    console.error('사용자 포스트 조회 실패:', error)
    throw error
  }
}

/**
 * UserComment 타입 (API 응답용)
 */
export type UserComment = {
  id: string
  content: string
  likesCount: number
  createdAt: string
  post?: {
    id: string
    title: string
  }
}

/**
 * 사용자의 댓글 목록 조회
 */
export async function fetchUserComments(_userId: string, _limit: number = 10): Promise<UserComment[]> {
  try {
    // Firestore는 컬렉션 그룹 쿼리 필요
    // 모든 posts/{postId}/comments를 검색
    // TODO: collectionGroup 사용 필요
    // const q = query(
    //   collectionGroup(firestore, 'comments'),
    //   where('author.id', '==', userId),
    //   orderBy('createdAt', 'desc'),
    //   firestoreLimit(limit)
    // )

    // 임시: 빈 배열 반환 (collectionGroup 구현 필요)
    console.warn('fetchUserComments: collectionGroup 구현 필요')
    return [] as UserComment[]
  } catch (error) {
    console.error('사용자 댓글 조회 실패:', error)
    throw error
  }
}

/**
 * UserBookmark 타입 (API 응답용)
 */
export type UserBookmark = {
  id: string
  notes?: string
  folderName?: string
  createdAt: string
  hand?: {
    id: string
    number: string
    description?: string
  }
}

/**
 * 사용자의 북마크 목록 조회
 */
export async function fetchUserBookmarks(userId: string, limit: number = 20): Promise<UserBookmark[]> {
  try {
    const bookmarksRef = collection(firestore, COLLECTION_PATHS.USER_BOOKMARKS(userId))
    const q = query(bookmarksRef, orderBy('createdAt', 'desc'), firestoreLimit(limit))

    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        notes: data.notes,
        folderName: data.folderName,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : new Date().toISOString(),
        hand: data.handId ? {
          id: data.handId,
          number: data.handNumber || '',
          description: data.handDescription,
        } : undefined,
      }
    })
  } catch (error) {
    console.error('사용자 북마크 조회 실패:', error)
    throw error
  }
}

/**
 * 사용자의 전체 활동 요약 조회
 */
export async function fetchUserActivity(userId: string) {
  const [posts, comments, bookmarks] = await Promise.all([
    fetchUserPosts(userId, 5),
    fetchUserComments(userId, 5),
    fetchUserBookmarks(userId, 5),
  ])

  return {
    posts,
    comments,
    bookmarks,
  }
}

/**
 * 아바타 이미지 업로드
 *
 * TODO: Firebase Storage로 변경 필요
 * 현재는 임시로 에러 반환
 */
export async function uploadAvatar(_userId: string, file: File): Promise<string> {
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

  // TODO: Firebase Storage 업로드 구현
  throw new Error('아바타 업로드 기능은 Firebase Storage 마이그레이션 후 사용 가능합니다.')

  // const fileName = `${userId}-${Date.now()}.${fileExt}`
  // const filePath = `avatars/${fileName}`
  //
  // // Firebase Storage 업로드 코드
  // import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
  // const storage = getStorage()
  // const storageRef = ref(storage, filePath)
  // await uploadBytes(storageRef, file)
  // const downloadURL = await getDownloadURL(storageRef)
  //
  // return downloadURL
}
