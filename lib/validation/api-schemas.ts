/**
 * API 입력 검증 스키마 (Zod)
 *
 * 모든 API 엔드포인트의 입력 검증을 위한 Zod 스키마
 */

import { z } from "zod"

/**
 * 자연어 검색 API 스키마
 */
export const naturalSearchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "검색어를 입력해주세요")
    .max(200, "검색어는 최대 200자까지 입력 가능합니다")
    .regex(/^[a-zA-Z0-9가-힣\s.,!?'-]+$/, "허용되지 않는 특수문자가 포함되어 있습니다"),
})

/**
 * 핸드 Import API 스키마
 */
export const importHandsSchema = z.object({
  streamId: z.string().uuid("유효하지 않은 Stream ID입니다"),
  hands: z
    .array(
      z.object({
        number: z.string().min(1).max(10),
        description: z.string().min(1).max(500),
        timestamp: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "유효하지 않은 타임스탬프 형식입니다"),
        summary: z.string().max(200).optional(),
        potSize: z.number().min(0).max(1000000000).optional(),
        boardCards: z.array(z.string().length(2).or(z.string().length(3))).max(5).optional(),
      })
    )
    .min(1, "최소 1개의 핸드가 필요합니다")
    .max(100, "한 번에 최대 100개의 핸드만 Import 가능합니다"),
})

/**
 * Tournament 생성/수정 스키마
 */
export const tournamentSchema = z.object({
  name: z.string().trim().min(1, "토너먼트 이름을 입력해주세요").max(200),
  category: z.enum([
    "WSOP",
    "Triton",
    "EPT",
    "Hustler Casino Live",
    "APT",
    "APL",
    "WSOP Classic",
    "GGPOKER",
  ]),
  location: z.string().trim().min(1).max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "유효하지 않은 날짜 형식입니다"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "유효하지 않은 날짜 형식입니다"),
})

/**
 * SubEvent 생성/수정 스키마
 */
export const subEventSchema = z.object({
  tournamentId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalPrize: z.string().max(50).optional(),
  winner: z.string().max(100).optional(),
  buyIn: z.string().max(50).optional(),
  entryCount: z.number().int().min(0).max(100000).optional(),
  blindStructure: z.string().max(200).optional(),
  levelDuration: z.number().int().min(0).max(1000).optional(),
  startingStack: z.number().int().min(0).max(10000000).optional(),
  notes: z.string().max(1000).optional(),
})

/**
 * Day 생성/수정 스키마
 */
export const daySchema = z.object({
  subEventId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  videoSource: z.enum(["youtube", "upload"]),
  videoUrl: z.string().url().optional().or(z.literal("")),
  videoFile: z.string().optional(),
})

/**
 * 커뮤니티 포스트 생성 스키마
 */
export const createPostSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요").max(200),
  content: z.string().trim().min(1, "내용을 입력해주세요").max(10000),
  category: z.enum(["analysis", "strategy", "hand-review", "general"]),
  handId: z.string().uuid().optional(),
})

/**
 * 댓글 생성 스키마
 */
export const createCommentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().trim().min(1, "댓글 내용을 입력해주세요").max(2000),
  parentCommentId: z.string().uuid().optional(),
})

/**
 * Player Claim 스키마
 */
export const playerClaimSchema = z.object({
  playerId: z.string().uuid(),
  proofType: z.enum(["social_media", "email", "tournament_photo", "other"]),
  proofUrl: z.string().url().max(500).optional().or(z.literal("")),
  proofText: z.string().max(1000).optional(),
})

/**
 * Hand Edit Request 스키마
 */
export const handEditRequestSchema = z.object({
  handId: z.string().uuid(),
  editType: z.enum(["basic_info", "board", "players", "actions"]),
  oldValue: z.string().max(1000),
  newValue: z.string().max(1000),
  reason: z.string().trim().min(1).max(500),
})

/**
 * Content Report 스키마
 */
export const contentReportSchema = z.object({
  targetType: z.enum(["post", "comment"]),
  targetId: z.string().uuid(),
  reason: z.enum([
    "spam",
    "offensive",
    "misinformation",
    "inappropriate",
    "other",
  ]),
  details: z.string().max(500).optional(),
})

/**
 * 북마크 생성 스키마
 */
export const createBookmarkSchema = z.object({
  handId: z.string().uuid(),
  folderName: z.string().trim().min(1).max(50).optional(),
  notes: z.string().max(500).optional(),
})

/**
 * 유저 프로필 업데이트 스키마
 */
export const updateProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().max(500).optional(),
  socialLinks: z
    .object({
      twitter: z.string().url().optional(),
      twitch: z.string().url().optional(),
      youtube: z.string().url().optional(),
    })
    .optional(),
  visibility: z.enum(["public", "private", "friends"]).optional(),
})

/**
 * 검증 헬퍼 함수
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: z.ZodError
} {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}

/**
 * API 응답용 에러 포맷팅
 */
export function formatValidationErrors(errors: z.ZodError): string[] {
  return errors.errors.map((err) => {
    const field = err.path.join(".")
    return field ? `${field}: ${err.message}` : err.message
  })
}
