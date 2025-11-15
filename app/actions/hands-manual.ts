'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { verifyArbiter } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ===========================
// Input Validation Schemas
// ===========================

const HandInputSchema = z.object({
  stream_id: z.string().uuid(),
  number: z.string().min(1).max(10),
  description: z.string().min(1).max(500),
  small_blind: z.number().int().positive(),
  big_blind: z.number().int().positive(),
  ante: z.number().int().nonnegative().optional(),
  pot_size: z.number().int().nonnegative().optional(),
  pot_preflop: z.number().int().nonnegative().optional(),
  pot_flop: z.number().int().nonnegative().optional(),
  pot_turn: z.number().int().nonnegative().optional(),
  pot_river: z.number().int().nonnegative().optional(),
  board_flop: z.array(z.string().max(3)).max(3).optional(),
  board_turn: z.string().max(3).optional(),
  board_river: z.string().max(3).optional(),
  video_timestamp_start: z.number().nonnegative().optional(),
  video_timestamp_end: z.number().nonnegative().optional(),
  ai_summary: z.string().max(1000).optional(),
})

const HandPlayerInputSchema = z.object({
  player_id: z.string().uuid(),
  poker_position: z.string().max(10),
  seat: z.number().int().min(1).max(10),
  starting_stack: z.number().int().nonnegative(),
  ending_stack: z.number().int().nonnegative(),
  hole_cards: z.array(z.string().max(3)).max(2).optional(),
  is_winner: z.boolean().optional(),
  final_amount: z.number().int().optional(),
  hand_description: z.string().max(200).optional(),
})

const HandActionInputSchema = z.object({
  player_id: z.string().uuid(),
  action_type: z.enum(['fold', 'check', 'call', 'bet', 'raise', 'all-in', 'show', 'muck', 'win']),
  street: z.enum(['preflop', 'flop', 'turn', 'river', 'showdown']),
  amount: z.number().int().nonnegative(),
  action_order: z.number().int().positive(),
  description: z.string().max(200).optional(),
})

// ===========================
// Type Exports
// ===========================

export type HandInput = z.infer<typeof HandInputSchema>
export type HandPlayerInput = z.infer<typeof HandPlayerInputSchema>
export type HandActionInput = z.infer<typeof HandActionInputSchema>

// ===========================
// CREATE Hand Manually
// ===========================

export async function createHandManually(input: {
  hand: HandInput
  players: HandPlayerInput[]
  actions: HandActionInput[]
}) {
  try {
    // 1. 입력 검증
    const handData = HandInputSchema.parse(input.hand)
    const playersData = input.players.map(p => HandPlayerInputSchema.parse(p))
    const actionsData = input.actions.map(a => HandActionInputSchema.parse(a))

    // 2. 인증 및 권한 검증
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    await verifyArbiter(supabase, user.id)

    // 3. Stream 존재 확인
    const { data: stream } = await supabase
      .from('streams')
      .select('id')
      .eq('id', handData.stream_id)
      .single()

    if (!stream) {
      return { success: false, error: 'Stream not found' }
    }

    // 4. RPC 함수를 사용하여 트랜잭션으로 hand + players + actions 삽입
    const { data: result, error } = await supabase.rpc('create_hand_with_details', {
      p_hand: handData,
      p_players: playersData,
      p_actions: actionsData,
    })

    if (error) {
      console.error('Error creating hand manually:', error)
      return { success: false, error: error.message }
    }

    // 5. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath(`/archive/stream/${handData.stream_id}`)

    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

// ===========================
// UPDATE Hand Manually
// ===========================

export async function updateHandManually(input: {
  hand_id: string
  hand?: Partial<HandInput>
  players?: { id: string; data: Partial<HandPlayerInput> }[]
  actions?: { id: string; data: Partial<HandActionInput> }[]
}) {
  try {
    // 1. 인증 및 권한 검증
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    await verifyArbiter(supabase, user.id)

    // 2. Hand 존재 확인
    const { data: existingHand } = await supabase
      .from('hands')
      .select('id, stream_id')
      .eq('id', input.hand_id)
      .single()

    if (!existingHand) {
      return { success: false, error: 'Hand not found' }
    }

    // 3. Hand 업데이트 (있으면)
    if (input.hand) {
      const handData = HandInputSchema.partial().parse(input.hand)

      const { error: handError } = await supabase
        .from('hands')
        .update(handData)
        .eq('id', input.hand_id)

      if (handError) {
        return { success: false, error: handError.message }
      }
    }

    // 4. Players 업데이트 (있으면)
    if (input.players && input.players.length > 0) {
      for (const player of input.players) {
        const playerData = HandPlayerInputSchema.partial().parse(player.data)

        const { error: playerError } = await supabase
          .from('hand_players')
          .update(playerData)
          .eq('id', player.id)

        if (playerError) {
          return { success: false, error: playerError.message }
        }
      }
    }

    // 5. Actions 업데이트 (있으면)
    if (input.actions && input.actions.length > 0) {
      for (const action of input.actions) {
        const actionData = HandActionInputSchema.partial().parse(action.data)

        const { error: actionError } = await supabase
          .from('hand_actions')
          .update(actionData)
          .eq('id', action.id)

        if (actionError) {
          return { success: false, error: actionError.message }
        }
      }
    }

    // 6. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath(`/archive/stream/${existingHand.stream_id}`)
    revalidatePath(`/archive/hand/${input.hand_id}`)

    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

// ===========================
// DELETE Hand Manually
// ===========================

export async function deleteHandManually(handId: string) {
  try {
    // 1. 인증 및 권한 검증
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    await verifyArbiter(supabase, user.id)

    // 2. Hand 존재 확인
    const { data: existingHand } = await supabase
      .from('hands')
      .select('id, stream_id')
      .eq('id', handId)
      .single()

    if (!existingHand) {
      return { success: false, error: 'Hand not found' }
    }

    // 3. Hand 삭제 (CASCADE로 players, actions도 자동 삭제)
    const { error } = await supabase
      .from('hands')
      .delete()
      .eq('id', handId)

    if (error) {
      return { success: false, error: error.message }
    }

    // 4. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath(`/archive/stream/${existingHand.stream_id}`)

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}
