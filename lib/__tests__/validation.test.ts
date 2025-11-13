import { describe, it, expect } from 'vitest'
import {
  naturalSearchSchema,
  importHandsSchema,
  tournamentSchema,
  createPostSchema,
  createCommentSchema,
  playerClaimSchema,
  handEditRequestSchema,
  contentReportSchema,
  createBookmarkSchema,
  updateProfileSchema,
  validateInput,
  formatValidationErrors,
} from '../validation/api-schemas'

describe('Validation Utilities', () => {
  describe('naturalSearchSchema', () => {
    it('should validate correct search queries', () => {
      const valid = {
        query: 'pocket aces preflop',
      }
      const result = naturalSearchSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject empty queries', () => {
      const invalid = { query: '   ' }
      const result = naturalSearchSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject too long queries', () => {
      const invalid = { query: 'a'.repeat(201) }
      const result = naturalSearchSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject queries with special characters', () => {
      const invalid = { query: 'DROP TABLE users; --' }
      const result = naturalSearchSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('importHandsSchema', () => {
    it('should validate correct hand import data', () => {
      const valid = {
        streamId: '123e4567-e89b-42d3-a456-426614174000',
        hands: [
          {
            number: '1',
            description: 'Preflop raise with AK',
            timestamp: '00:15:30',
            summary: 'Hero wins with top pair',
            pot_size: 1000,
            board_cards: ['As', 'Kh', '7c', '3d', 'Qh'],
          },
        ],
      }
      const result = importHandsSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      const invalid = {
        streamId: 'not-a-uuid',
        hands: [
          {
            number: '1',
            description: 'Test',
            timestamp: '00:15:30',
          },
        ],
      }
      const result = importHandsSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject too many hands', () => {
      const invalid = {
        streamId: '123e4567-e89b-42d3-a456-426614174000',
        hands: Array(101).fill({
          number: '1',
          description: 'Test',
          timestamp: '00:15:30',
        }),
      }
      const result = importHandsSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('tournamentSchema', () => {
    it('should validate correct tournament data', () => {
      const valid = {
        name: 'WSOP 2024 Main Event',
        category: 'WSOP',
        location: 'Las Vegas',
        start_date: '2024-07-01',
        end_date: '2024-07-15',
      }
      const result = tournamentSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject invalid category', () => {
      const invalid = {
        name: 'Test Tournament',
        category: 'InvalidCategory',
        location: 'Test',
        start_date: '2024-07-01',
        end_date: '2024-07-15',
      }
      const result = tournamentSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject invalid date format', () => {
      const invalid = {
        name: 'Test Tournament',
        category: 'WSOP',
        location: 'Test',
        start_date: '07/01/2024',
        end_date: '2024-07-15',
      }
      const result = tournamentSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('createPostSchema', () => {
    it('should validate correct post data', () => {
      const valid = {
        title: 'Amazing Hand Analysis',
        content: 'This is a detailed analysis of a poker hand...',
        category: 'analysis',
        hand_id: '123e4567-e89b-42d3-a456-426614174000',
      }
      const result = createPostSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject empty title', () => {
      const invalid = {
        title: '   ',
        content: 'Content',
        category: 'analysis',
      }
      const result = createPostSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject too long content', () => {
      const invalid = {
        title: 'Title',
        content: 'a'.repeat(10001),
        category: 'analysis',
      }
      const result = createPostSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('createCommentSchema', () => {
    it('should validate correct comment data', () => {
      const valid = {
        post_id: '123e4567-e89b-42d3-a456-426614174000',
        content: 'Great analysis! I agree with your decision.',
        parent_comment_id: '550e8400-e29b-41d4-a716-446655440000',
      }
      const result = createCommentSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject empty comment', () => {
      const invalid = {
        post_id: '123e4567-e89b-42d3-a456-426614174000',
        content: '   ',
      }
      const result = createCommentSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('playerClaimSchema', () => {
    it('should validate correct claim data', () => {
      const valid = {
        player_id: '123e4567-e89b-42d3-a456-426614174000',
        proof_type: 'social_media',
        proof_url: 'https://twitter.com/player/status/123',
        proof_text: 'Additional verification details',
      }
      const result = playerClaimSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject invalid proof_type', () => {
      const invalid = {
        player_id: '123e4567-e89b-42d3-a456-426614174000',
        proof_type: 'invalid_type',
        proof_url: 'https://twitter.com/player',
      }
      const result = playerClaimSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('handEditRequestSchema', () => {
    it('should validate correct edit request', () => {
      const valid = {
        hand_id: '123e4567-e89b-42d3-a456-426614174000',
        edit_type: 'board',
        old_value: 'As Kh 7c 3d Qh',
        new_value: 'As Kh 7c 3d 9h',
        reason: 'The river card was misidentified',
      }
      const result = handEditRequestSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject empty reason', () => {
      const invalid = {
        hand_id: '123e4567-e89b-42d3-a456-426614174000',
        edit_type: 'board',
        old_value: 'As Kh 7c',
        new_value: 'As Kh 8c',
        reason: '   ',
      }
      const result = handEditRequestSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('contentReportSchema', () => {
    it('should validate correct report data', () => {
      const valid = {
        target_type: 'post',
        target_id: '123e4567-e89b-42d3-a456-426614174000',
        reason: 'spam',
        details: 'This post is promotional spam',
      }
      const result = contentReportSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject invalid target_type', () => {
      const invalid = {
        target_type: 'user',
        target_id: '123e4567-e89b-42d3-a456-426614174000',
        reason: 'spam',
      }
      const result = contentReportSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('createBookmarkSchema', () => {
    it('should validate correct bookmark data', () => {
      const valid = {
        hand_id: '123e4567-e89b-42d3-a456-426614174000',
        folder_name: 'Amazing Bluffs',
        notes: 'This hand shows excellent bluffing technique',
      }
      const result = createBookmarkSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should allow bookmark without folder or notes', () => {
      const valid = {
        hand_id: '123e4567-e89b-42d3-a456-426614174000',
      }
      const result = createBookmarkSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })
  })

  describe('updateProfileSchema', () => {
    it('should validate correct profile data', () => {
      const valid = {
        nickname: 'PokerPro123',
        bio: 'Professional poker player',
        avatar_url: 'https://example.com/avatar.jpg',
        social_links: {
          twitter: 'https://twitter.com/pokerpro',
          twitch: 'https://twitch.tv/pokerpro',
          youtube: 'https://youtube.com/pokerpro',
        },
        visibility: 'public',
      }
      const result = updateProfileSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject invalid visibility', () => {
      const invalid = {
        nickname: 'PokerPro',
        visibility: 'secret',
      }
      const result = updateProfileSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('validateInput', () => {
    it('should return success for valid data', () => {
      const result = validateInput(naturalSearchSchema, { query: 'test' })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ query: 'test' })
      expect(result.errors).toBeUndefined()
    })

    it('should return errors for invalid data', () => {
      const result = validateInput(naturalSearchSchema, { query: '' })
      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.errors).toBeDefined()
    })
  })

  describe('formatValidationErrors', () => {
    it('should format validation errors correctly', () => {
      const result = naturalSearchSchema.safeParse({ query: '' })
      if (!result.success) {
        const formatted = formatValidationErrors(result.error)
        expect(formatted.length).toBeGreaterThan(0)
        expect(formatted[0]).toContain('query')
      }
    })
  })
})
