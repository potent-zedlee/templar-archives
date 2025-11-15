import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isAdmin, isHighTemplar, isArbiter, verifyArbiter } from '../auth-utils'
import type { SupabaseClient } from '@supabase/supabase-js'

// Mock Supabase client
const createMockSupabaseClient = () => {
  return {
    from: vi.fn(),
  } as unknown as SupabaseClient
}

describe('Auth Utils', () => {
  describe('isAdmin', () => {
    it('should return true for admin emails', () => {
      expect(isAdmin('jhng.mov@gmail.com')).toBe(true)
      expect(isAdmin('zed.lee@ggproduction.net')).toBe(true)
    })

    it('should be case insensitive', () => {
      expect(isAdmin('JHNG.MOV@GMAIL.COM')).toBe(true)
      expect(isAdmin('Zed.Lee@GGProduction.net')).toBe(true)
    })

    it('should return false for non-admin emails', () => {
      expect(isAdmin('user@example.com')).toBe(false)
      expect(isAdmin('test@test.com')).toBe(false)
    })

    it('should handle null and undefined', () => {
      expect(isAdmin(null)).toBe(false)
      expect(isAdmin(undefined)).toBe(false)
    })

    it('should handle empty string', () => {
      expect(isAdmin('')).toBe(false)
    })
  })

  describe('isHighTemplar', () => {
    let mockSupabase: SupabaseClient

    beforeEach(() => {
      mockSupabase = createMockSupabaseClient()
    })

    it('should return true for high_templar role', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'high_templar' },
              error: null,
            }),
          }),
        }),
      })
      mockSupabase.from = mockFrom

      const result = await isHighTemplar(mockSupabase, 'user-id')
      expect(result).toBe(true)
    })

    it('should return true for reporter role', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'reporter' },
              error: null,
            }),
          }),
        }),
      })
      mockSupabase.from = mockFrom

      const result = await isHighTemplar(mockSupabase, 'user-id')
      expect(result).toBe(true)
    })

    it('should return true for admin role', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      })
      mockSupabase.from = mockFrom

      const result = await isHighTemplar(mockSupabase, 'user-id')
      expect(result).toBe(true)
    })

    it('should return false for user role', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'user' },
              error: null,
            }),
          }),
        }),
      })
      mockSupabase.from = mockFrom

      const result = await isHighTemplar(mockSupabase, 'user-id')
      expect(result).toBe(false)
    })

    it('should return false when user not found', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })
      mockSupabase.from = mockFrom

      const result = await isHighTemplar(mockSupabase, 'user-id')
      expect(result).toBe(false)
    })

    it('should return false on database error', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      })
      mockSupabase.from = mockFrom

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const result = await isHighTemplar(mockSupabase, 'user-id')

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('isArbiter', () => {
    let mockSupabase: SupabaseClient

    beforeEach(() => {
      mockSupabase = createMockSupabaseClient()
    })

    it('should return true for arbiter role', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'arbiter', banned_at: null },
              error: null,
            }),
          }),
        }),
      })
      mockSupabase.from = mockFrom

      const result = await isArbiter(mockSupabase, 'user-id')
      expect(result).toBe(true)
    })

    it('should return true for high_templar role', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'high_templar', banned_at: null },
              error: null,
            }),
          }),
        }),
      })
      mockSupabase.from = mockFrom

      const result = await isArbiter(mockSupabase, 'user-id')
      expect(result).toBe(true)
    })

    it('should return false for banned users', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'arbiter', banned_at: '2024-01-01' },
              error: null,
            }),
          }),
        }),
      })
      mockSupabase.from = mockFrom

      const result = await isArbiter(mockSupabase, 'user-id')
      expect(result).toBe(false)
    })

    it('should return false for user role', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'user', banned_at: null },
              error: null,
            }),
          }),
        }),
      })
      mockSupabase.from = mockFrom

      const result = await isArbiter(mockSupabase, 'user-id')
      expect(result).toBe(false)
    })

    it('should return false when user not found', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })
      mockSupabase.from = mockFrom

      const result = await isArbiter(mockSupabase, 'user-id')
      expect(result).toBe(false)
    })

    it('should return false on database error', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      })
      mockSupabase.from = mockFrom

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const result = await isArbiter(mockSupabase, 'user-id')

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('verifyArbiter', () => {
    let mockSupabase: SupabaseClient

    beforeEach(() => {
      mockSupabase = createMockSupabaseClient()
    })

    it('should not throw for valid arbiter', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'arbiter', banned_at: null },
              error: null,
            }),
          }),
        }),
      })
      mockSupabase.from = mockFrom

      await expect(verifyArbiter(mockSupabase, 'user-id')).resolves.toBeUndefined()
    })

    it('should throw for non-arbiter user', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'user', banned_at: null },
              error: null,
            }),
          }),
        }),
      })
      mockSupabase.from = mockFrom

      await expect(verifyArbiter(mockSupabase, 'user-id')).rejects.toThrow(
        'Insufficient permissions: Arbiter role required'
      )
    })

    it('should throw for banned users', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'arbiter', banned_at: '2024-01-01' },
              error: null,
            }),
          }),
        }),
      })
      mockSupabase.from = mockFrom

      await expect(verifyArbiter(mockSupabase, 'user-id')).rejects.toThrow(
        'Insufficient permissions: Arbiter role required'
      )
    })
  })
})
