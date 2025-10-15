import { createClientSupabaseClient } from './supabase-client'

export type HandLike = {
  id: string
  hand_id: string
  user_id: string
  vote_type: 'like' | 'dislike'
  created_at: string
  updated_at: string
}

export type HandLikeStatus = {
  userVote: 'like' | 'dislike' | null
  likesCount: number
  dislikesCount: number
}

/**
 * 핸드의 좋아요/싫어요 상태 조회
 */
export async function getHandLikeStatus(handId: string, userId?: string): Promise<HandLikeStatus> {
  const supabase = createClientSupabaseClient()

  // 핸드 정보 조회 (카운트)
  const { data: hand, error: handError } = await supabase
    .from('hands')
    .select('likes_count, dislikes_count')
    .eq('id', handId)
    .single()

  if (handError) {
    console.error('핸드 조회 실패:', handError)
    return { userVote: null, likesCount: 0, dislikesCount: 0 }
  }

  // 사용자 투표 상태 조회
  let userVote: 'like' | 'dislike' | null = null
  if (userId) {
    const { data: like, error: likeError } = await supabase
      .from('hand_likes')
      .select('vote_type')
      .eq('hand_id', handId)
      .eq('user_id', userId)
      .single()

    if (!likeError && like) {
      userVote = like.vote_type as 'like' | 'dislike'
    }
  }

  return {
    userVote,
    likesCount: hand.likes_count || 0,
    dislikesCount: hand.dislikes_count || 0,
  }
}

/**
 * 핸드 좋아요/싫어요 토글
 * @returns 새로운 투표 상태 ('like', 'dislike', null)
 */
export async function toggleHandLike(
  handId: string,
  userId: string,
  voteType: 'like' | 'dislike'
): Promise<'like' | 'dislike' | null> {
  const supabase = createClientSupabaseClient()

  // 기존 투표 확인
  const { data: existingVote, error: checkError } = await supabase
    .from('hand_likes')
    .select('*')
    .eq('hand_id', handId)
    .eq('user_id', userId)
    .single()

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 = no rows (투표 없음)
    console.error('기존 투표 확인 실패:', checkError)
    throw checkError
  }

  // 경우 1: 기존 투표 없음 → 새로 추가
  if (!existingVote) {
    const { error: insertError } = await supabase
      .from('hand_likes')
      .insert({
        hand_id: handId,
        user_id: userId,
        vote_type: voteType,
      })

    if (insertError) {
      console.error('투표 추가 실패:', insertError)
      throw insertError
    }

    return voteType
  }

  // 경우 2: 같은 투표 클릭 → 취소 (삭제)
  if (existingVote.vote_type === voteType) {
    const { error: deleteError } = await supabase
      .from('hand_likes')
      .delete()
      .eq('id', existingVote.id)

    if (deleteError) {
      console.error('투표 삭제 실패:', deleteError)
      throw deleteError
    }

    return null
  }

  // 경우 3: 다른 투표 클릭 → 변경 (업데이트)
  const { error: updateError } = await supabase
    .from('hand_likes')
    .update({ vote_type: voteType })
    .eq('id', existingVote.id)

  if (updateError) {
    console.error('투표 변경 실패:', updateError)
    throw updateError
  }

  return voteType
}

/**
 * 핸드 좋아요/싫어요 카운트만 조회 (빠른 조회)
 */
export async function getHandLikeCounts(handId: string): Promise<{
  likesCount: number
  dislikesCount: number
}> {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('hands')
    .select('likes_count, dislikes_count')
    .eq('id', handId)
    .single()

  if (error) {
    console.error('카운트 조회 실패:', error)
    return { likesCount: 0, dislikesCount: 0 }
  }

  return {
    likesCount: data.likes_count || 0,
    dislikesCount: data.dislikes_count || 0,
  }
}

/**
 * 여러 핸드의 좋아요 상태를 한 번에 조회 (리스트용)
 */
export async function getBatchHandLikeStatus(
  handIds: string[],
  userId?: string
): Promise<Map<string, HandLikeStatus>> {
  const supabase = createClientSupabaseClient()
  const result = new Map<string, HandLikeStatus>()

  // 핸드 카운트 조회
  const { data: hands, error: handsError } = await supabase
    .from('hands')
    .select('id, likes_count, dislikes_count')
    .in('id', handIds)

  if (handsError) {
    console.error('핸드 카운트 조회 실패:', handsError)
    return result
  }

  // 초기화
  hands?.forEach((hand) => {
    result.set(hand.id, {
      userVote: null,
      likesCount: hand.likes_count || 0,
      dislikesCount: hand.dislikes_count || 0,
    })
  })

  // 사용자 투표 상태 조회
  if (userId) {
    const { data: likes, error: likesError } = await supabase
      .from('hand_likes')
      .select('hand_id, vote_type')
      .in('hand_id', handIds)
      .eq('user_id', userId)

    if (!likesError && likes) {
      likes.forEach((like) => {
        const status = result.get(like.hand_id)
        if (status) {
          status.userVote = like.vote_type as 'like' | 'dislike'
        }
      })
    }
  }

  return result
}
