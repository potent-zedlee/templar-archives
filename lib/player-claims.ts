import { createClientSupabaseClient } from "./supabase-client"

export type ClaimStatus = "pending" | "approved" | "rejected"
export type VerificationMethod = "social_media" | "email" | "admin" | "other"

export type PlayerClaim = {
  id: string
  user_id: string
  player_id: string
  status: ClaimStatus
  verification_method: VerificationMethod
  verification_data?: any
  admin_notes?: string
  claimed_at: string
  verified_at?: string
  verified_by?: string
  rejected_reason?: string
  created_at: string
  updated_at: string
}

export type PlayerClaimWithDetails = PlayerClaim & {
  user: {
    nickname: string
    email: string
    avatar_url?: string
  }
  player: {
    name: string
    photo_url?: string
  }
  verified_by_user?: {
    nickname: string
  }
}

/**
 * 플레이어 클레임 요청 생성
 */
export async function requestPlayerClaim({
  userId,
  playerId,
  verificationMethod,
  verificationData,
}: {
  userId: string
  playerId: string
  verificationMethod: VerificationMethod
  verificationData?: any
}): Promise<{ data: PlayerClaim | null; error: any }> {
  const supabase = createClientSupabaseClient()

  try {
    // 이미 클레임 요청이 있는지 확인
    const { data: existingClaim, error: checkError } = await supabase
      .from("player_claims")
      .select("*")
      .eq("user_id", userId)
      .eq("player_id", playerId)
      .in("status", ["pending", "approved"])
      .single()

    if (existingClaim) {
      return {
        data: null,
        error: new Error(
          existingClaim.status === "approved"
            ? "이미 승인된 클레임이 있습니다."
            : "이미 대기 중인 클레임 요청이 있습니다."
        ),
      }
    }

    // 클레임 요청 생성
    const { data, error } = await supabase
      .from("player_claims")
      .insert({
        user_id: userId,
        player_id: playerId,
        verification_method: verificationMethod,
        verification_data: verificationData,
        status: "pending",
      })
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * 플레이어의 클레임 정보 조회
 */
export async function getPlayerClaimInfo(
  playerId: string
): Promise<{
  claimed: boolean
  claim?: PlayerClaimWithDetails
}> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("player_claims")
      .select(
        `
        *,
        user:users!player_claims_user_id_fkey(nickname, email, avatar_url),
        player:players!player_claims_player_id_fkey(name, photo_url)
      `
      )
      .eq("player_id", playerId)
      .eq("status", "approved")
      .single()

    if (error || !data) {
      return { claimed: false }
    }

    return {
      claimed: true,
      claim: data as unknown as PlayerClaimWithDetails,
    }
  } catch (error) {
    return { claimed: false }
  }
}

/**
 * 유저의 클레임 정보 조회 (자신이 클레임한 플레이어)
 */
export async function getUserClaimedPlayer(userId: string): Promise<{
  data: PlayerClaimWithDetails | null
  error: any
}> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("player_claims")
      .select(
        `
        *,
        user:users!player_claims_user_id_fkey(nickname, email, avatar_url),
        player:players!player_claims_player_id_fkey(name, photo_url)
      `
      )
      .eq("user_id", userId)
      .eq("status", "approved")
      .single()

    return { data: data as unknown as PlayerClaimWithDetails | null, error }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * 유저의 모든 클레임 요청 조회
 */
export async function getUserClaims(userId: string): Promise<{
  data: PlayerClaimWithDetails[]
  error: any
}> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("player_claims")
      .select(
        `
        *,
        user:users!player_claims_user_id_fkey(nickname, email, avatar_url),
        player:players!player_claims_player_id_fkey(name, photo_url)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    return { data: (data as unknown as PlayerClaimWithDetails[]) || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

/**
 * 모든 대기 중인 클레임 요청 조회 (관리자용)
 */
export async function getPendingClaims(): Promise<{
  data: PlayerClaimWithDetails[]
  error: any
}> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("player_claims")
      .select(
        `
        *,
        user:users!player_claims_user_id_fkey(nickname, email, avatar_url),
        player:players!player_claims_player_id_fkey(name, photo_url)
      `
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    return { data: (data as unknown as PlayerClaimWithDetails[]) || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

/**
 * 모든 클레임 요청 조회 (관리자용)
 */
export async function getAllClaims(): Promise<{
  data: PlayerClaimWithDetails[]
  error: any
}> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("player_claims")
      .select(
        `
        *,
        user:users!player_claims_user_id_fkey(nickname, email, avatar_url),
        player:players!player_claims_player_id_fkey(name, photo_url),
        verified_by_user:users!player_claims_verified_by_fkey(nickname)
      `
      )
      .order("created_at", { ascending: false })

    return { data: (data as unknown as PlayerClaimWithDetails[]) || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

/**
 * 클레임 승인 (관리자용)
 */
export async function approvePlayerClaim({
  claimId,
  adminId,
  adminNotes,
}: {
  claimId: string
  adminId: string
  adminNotes?: string
}): Promise<{ data: PlayerClaim | null; error: any }> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("player_claims")
      .update({
        status: "approved",
        verified_at: new Date().toISOString(),
        verified_by: adminId,
        admin_notes: adminNotes,
      })
      .eq("id", claimId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * 클레임 거절 (관리자용)
 */
export async function rejectPlayerClaim({
  claimId,
  adminId,
  rejectedReason,
  adminNotes,
}: {
  claimId: string
  adminId: string
  rejectedReason: string
  adminNotes?: string
}): Promise<{ data: PlayerClaim | null; error: any }> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("player_claims")
      .update({
        status: "rejected",
        verified_at: new Date().toISOString(),
        verified_by: adminId,
        rejected_reason: rejectedReason,
        admin_notes: adminNotes,
      })
      .eq("id", claimId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * 클레임 취소 (본인만 가능, pending 상태만)
 */
export async function cancelPlayerClaim(
  claimId: string,
  userId: string
): Promise<{ error: any }> {
  const supabase = createClientSupabaseClient()

  try {
    const { error } = await supabase
      .from("player_claims")
      .delete()
      .eq("id", claimId)
      .eq("user_id", userId)
      .eq("status", "pending")

    return { error }
  } catch (error) {
    return { error }
  }
}

/**
 * 특정 유저가 특정 플레이어를 클레임했는지 확인
 */
export async function checkUserPlayerClaim(
  userId: string,
  playerId: string
): Promise<{
  hasClaim: boolean
  claim?: PlayerClaim
}> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("player_claims")
      .select("*")
      .eq("user_id", userId)
      .eq("player_id", playerId)
      .in("status", ["pending", "approved"])
      .single()

    if (error || !data) {
      return { hasClaim: false }
    }

    return { hasClaim: true, claim: data }
  } catch (error) {
    return { hasClaim: false }
  }
}
