'use server'

/**
 * Supabase 레거시 사용자 데이터 정리
 *
 * 동일 이메일로 중복된 사용자 문서를 Firebase UID로 병합하고
 * Supabase UUID 형식의 문서를 삭제합니다.
 *
 * @module app/actions/migrate-users
 */

import { adminFirestore, adminAuth } from '@/lib/firebase-admin'
import { COLLECTION_PATHS } from '@/lib/firestore-types'
import { FieldValue } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'

/**
 * UUID 형식인지 확인 (Supabase 형식)
 * 예: fc388dbc-57ab-4290-9241-b523f2b45920
 */
function isUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Firebase UID 형식인지 확인
 * 예: nTMBdBmPH7fI9PyrFPzj9Rux9hM2 (28자, alphanumeric)
 */
function isFirebaseUID(id: string): boolean {
  // Firebase UID는 UUID 형식이 아니고, 일반적으로 20-28자의 alphanumeric
  return !isUUID(id) && /^[A-Za-z0-9]{20,}$/.test(id)
}

interface DuplicateUser {
  email: string
  documents: Array<{
    id: string
    type: 'firebase' | 'supabase' | 'unknown'
    role: string
    createdAt: Date | null
  }>
}

interface MergeResult {
  success: boolean
  message: string
  duplicatesFound: number
  merged: number
  deleted: number
  details: Array<{
    email: string
    action: string
    keptDocId: string
    deletedDocIds: string[]
  }>
  errors: string[]
}

/**
 * 중복 사용자 조회 (DRY RUN)
 *
 * 데이터를 수정하지 않고 중복 사용자 목록만 반환합니다.
 */
export async function findDuplicateUsers(): Promise<{
  success: boolean
  duplicates: DuplicateUser[]
  error?: string
}> {
  try {
    // 관리자 확인 (임시로 제거 - 개발 모드)
    const usersRef = adminFirestore.collection(COLLECTION_PATHS.USERS)
    const snapshot = await usersRef.get()

    // 이메일별로 그룹화
    const emailGroups = new Map<
      string,
      Array<{
        id: string
        data: FirebaseFirestore.DocumentData
      }>
    >()

    for (const doc of snapshot.docs) {
      const data = doc.data()
      const email = data.email as string | undefined
      if (email) {
        const existing = emailGroups.get(email) || []
        existing.push({ id: doc.id, data })
        emailGroups.set(email, existing)
      }
    }

    // 중복된 것만 필터링
    const duplicates: DuplicateUser[] = []
    for (const [email, docs] of emailGroups) {
      if (docs.length > 1) {
        duplicates.push({
          email,
          documents: docs.map((d) => ({
            id: d.id,
            type: isFirebaseUID(d.id) ? 'firebase' : isUUID(d.id) ? 'supabase' : 'unknown',
            role: d.data.role || 'user',
            createdAt: d.data.createdAt?.toDate?.() || null,
          })),
        })
      }
    }

    return {
      success: true,
      duplicates,
    }
  } catch (error) {
    console.error('[findDuplicateUsers] Error:', error)
    return {
      success: false,
      duplicates: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 중복 사용자 병합 실행
 *
 * 동일 이메일에 대해:
 * 1. Firebase UID 문서를 유지
 * 2. Supabase UUID 문서의 데이터를 Firebase 문서로 병합 (필요시)
 * 3. Supabase UUID 문서 삭제
 */
export async function mergeDuplicateUsers(): Promise<MergeResult> {
  const result: MergeResult = {
    success: false,
    message: '',
    duplicatesFound: 0,
    merged: 0,
    deleted: 0,
    details: [],
    errors: [],
  }

  try {
    // 중복 사용자 찾기
    const { success, duplicates, error } = await findDuplicateUsers()
    if (!success || error) {
      result.message = error || 'Failed to find duplicate users'
      return result
    }

    result.duplicatesFound = duplicates.length

    if (duplicates.length === 0) {
      result.success = true
      result.message = '중복 사용자가 없습니다.'
      return result
    }

    const usersRef = adminFirestore.collection(COLLECTION_PATHS.USERS)

    // 각 중복 그룹 처리
    for (const duplicate of duplicates) {
      try {
        const { email, documents } = duplicate

        // Firebase UID 문서 찾기
        const firebaseDoc = documents.find((d) => d.type === 'firebase')
        const supabaseDocs = documents.filter((d) => d.type === 'supabase')

        if (!firebaseDoc) {
          // Firebase UID가 없는 경우 - 가장 높은 권한의 문서 유지
          const roleOrder = ['admin', 'high_templar', 'arbiter', 'reporter', 'user']
          const sorted = [...documents].sort((a, b) => {
            const aIndex = roleOrder.indexOf(a.role) ?? 999
            const bIndex = roleOrder.indexOf(b.role) ?? 999
            return aIndex - bIndex
          })

          const keepDoc = sorted[0]
          const deleteDocs = sorted.slice(1)

          // 삭제
          for (const doc of deleteDocs) {
            await usersRef.doc(doc.id).delete()
            result.deleted++
          }

          result.details.push({
            email,
            action: 'kept_highest_role',
            keptDocId: keepDoc.id,
            deletedDocIds: deleteDocs.map((d) => d.id),
          })
          result.merged++
          continue
        }

        // Firebase UID 문서가 있는 경우
        if (supabaseDocs.length === 0) {
          // Supabase 문서가 없으면 스킵
          continue
        }

        // Firebase 문서의 role이 user이고 Supabase 문서 중 admin이 있으면 role 업데이트
        const firebaseDocRef = usersRef.doc(firebaseDoc.id)
        const firebaseDocSnapshot = await firebaseDocRef.get()
        const firebaseData = firebaseDocSnapshot.data()

        const supabaseAdmin = supabaseDocs.find((d) => d.role === 'admin')
        if (supabaseAdmin && firebaseData?.role === 'user') {
          await firebaseDocRef.update({
            role: 'admin',
            updatedAt: FieldValue.serverTimestamp(),
          })
        }

        // Supabase 문서 삭제
        const deletedIds: string[] = []
        for (const supabaseDoc of supabaseDocs) {
          await usersRef.doc(supabaseDoc.id).delete()
          deletedIds.push(supabaseDoc.id)
          result.deleted++
        }

        result.details.push({
          email,
          action: 'merged_to_firebase',
          keptDocId: firebaseDoc.id,
          deletedDocIds: deletedIds,
        })
        result.merged++
      } catch (docError) {
        const errorMsg =
          docError instanceof Error ? docError.message : `Error processing ${duplicate.email}`
        result.errors.push(errorMsg)
      }
    }

    result.success = result.errors.length === 0
    result.message = `${result.merged}개 중복 처리 완료, ${result.deleted}개 문서 삭제`

    console.log('[mergeDuplicateUsers] Result:', result)
    return result
  } catch (error) {
    console.error('[mergeDuplicateUsers] Error:', error)
    result.message = error instanceof Error ? error.message : 'Unknown error'
    return result
  }
}

/**
 * 단일 사용자의 Supabase UUID 문서 삭제
 *
 * 특정 이메일의 Supabase UUID 문서만 삭제합니다.
 */
export async function deleteSupabaseUserDoc(email: string): Promise<{
  success: boolean
  deletedId?: string
  error?: string
}> {
  try {
    const usersRef = adminFirestore.collection(COLLECTION_PATHS.USERS)
    const snapshot = await usersRef.where('email', '==', email).get()

    if (snapshot.empty) {
      return { success: false, error: 'User not found' }
    }

    // Supabase UUID 문서 찾기
    const supabaseDoc = snapshot.docs.find((doc) => isUUID(doc.id))
    if (!supabaseDoc) {
      return { success: true, error: 'No Supabase UUID document found' }
    }

    await supabaseDoc.ref.delete()

    return {
      success: true,
      deletedId: supabaseDoc.id,
    }
  } catch (error) {
    console.error('[deleteSupabaseUserDoc] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
