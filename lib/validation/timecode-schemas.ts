/**
 * Timecode Validation Schemas
 *
 * Zod 스키마를 사용한 타임코드 제출 데이터 검증
 */

import { z } from 'zod'
import { validateTimecode } from '@/lib/timecode-utils'

/**
 * 타임코드 문자열 스키마
 * MM:SS or H:MM:SS or HH:MM:SS 형식
 */
export const timecodeSchema = z
  .string()
  .min(4, '타임코드는 최소 4자 이상이어야 합니다 (예: 00:00)')
  .max(8, '타임코드는 최대 8자 이하여야 합니다 (예: 10:00:00)')
  .refine((val) => validateTimecode(val), {
    message: '유효하지 않은 타임코드 형식입니다 (예: 05:11 또는 1:05:11)',
  })

/**
 * 타임코드 제출 스키마
 */
export const timecodeSubmissionSchema = z.object({
  streamId: z.string().uuid('유효하지 않은 스트림 ID입니다'),
  startTime: timecodeSchema,
  endTime: timecodeSchema.optional().nullable(),
  handNumber: z
    .string()
    .max(50, '핸드 번호는 최대 50자까지 입력 가능합니다')
    .optional()
    .nullable(),
  description: z
    .string()
    .max(500, '설명은 최대 500자까지 입력 가능합니다')
    .optional()
    .nullable(),
})

export type TimecodeSubmissionInput = z.infer<typeof timecodeSubmissionSchema>

/**
 * 타임코드 승인 스키마 (관리자)
 */
export const approveTimecodeSchema = z.object({
  submissionId: z.string().uuid('유효하지 않은 제출 ID입니다'),
})

export type ApproveTimecodeInput = z.infer<typeof approveTimecodeSchema>

/**
 * 타임코드 거부 스키마 (관리자)
 */
export const rejectTimecodeSchema = z.object({
  submissionId: z.string().uuid('유효하지 않은 제출 ID입니다'),
  adminComment: z
    .string()
    .min(10, '거부 사유는 최소 10자 이상이어야 합니다')
    .max(1000, '거부 사유는 최대 1000자까지 입력 가능합니다'),
})

export type RejectTimecodeInput = z.infer<typeof rejectTimecodeSchema>

/**
 * AI 추출 트리거 스키마 (관리자)
 */
export const triggerAIExtractionSchema = z.object({
  submissionId: z.string().uuid('유효하지 않은 제출 ID입니다'),
})

export type TriggerAIExtractionInput = z.infer<typeof triggerAIExtractionSchema>

/**
 * 핸드 히스토리 검수 승인 스키마 (관리자)
 */
export const reviewHandSchema = z.object({
  submissionId: z.string().uuid('유효하지 않은 제출 ID입니다'),
  handData: z.object({
    // 기본 정보
    number: z.string().optional().nullable(),
    description: z.string().max(1000).optional().nullable(),
    potSize: z.number().int().positive('팟 크기는 양수여야 합니다').optional().nullable(),
    boardCards: z.string().max(20).optional().nullable(),

    // 플레이어 정보
    players: z
      .array(
        z.object({
          playerId: z.string().uuid('유효하지 않은 플레이어 ID입니다'),
          position: z.string().max(10, '포지션은 최대 10자까지 입력 가능합니다'),
          stackSize: z.number().int().positive('스택 크기는 양수여야 합니다'),
          holeCards: z.string().max(10).optional().nullable(),
          isWinner: z.boolean().default(false),
          winAmount: z.number().int().optional().nullable(),
        })
      )
      .min(2, '최소 2명 이상의 플레이어가 필요합니다')
      .max(10, '최대 10명까지 참여 가능합니다'),

    // 액션 정보
    actions: z
      .array(
        z.object({
          playerId: z.string().uuid('유효하지 않은 플레이어 ID입니다'),
          street: z.enum(['preflop', 'flop', 'turn', 'river']),
          actionType: z.enum(['fold', 'check', 'call', 'bet', 'raise', 'all-in']),
          amount: z.number().int().nonnegative('액션 금액은 0 이상이어야 합니다').optional().nullable(),
          sequenceNumber: z.number().int().positive('시퀀스 번호는 양수여야 합니다'),
        })
      )
      .optional(),
  }),
  adminComment: z.string().max(1000).optional().nullable(),
})

export type ReviewHandInput = z.infer<typeof reviewHandSchema>
