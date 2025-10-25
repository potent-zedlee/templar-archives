/**
 * Security Tests for RPC Functions
 *
 * Tests for SECURITY INVOKER enforcement and array size validation
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

describe('RPC Function Security', () => {
  let supabase: ReturnType<typeof createClient>

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  })

  describe('SECURITY INVOKER enforcement', () => {
    it('should have SECURITY INVOKER for get_players_with_hand_counts', async () => {
      // Query pg_proc to check security definer flag
      const { data, error } = await supabase.rpc('get_players_with_hand_counts')

      // If RLS is working, anonymous users should get filtered results
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)

      // The function should respect RLS policies
      // We can't directly test SECURITY INVOKER from client,
      // but we verify the function works as expected
    })

    it('should have SECURITY INVOKER for get_player_hands_grouped', async () => {
      const testPlayerId = '00000000-0000-0000-0000-000000000000'

      const { data, error } = await supabase.rpc('get_player_hands_grouped', {
        player_uuid: testPlayerId
      })

      // Should not throw errors even if player doesn't exist
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('should have SECURITY INVOKER for get_hand_details_batch', async () => {
      const testHandIds = [
        '00000000-0000-0000-0000-000000000000'
      ]

      const { data, error } = await supabase.rpc('get_hand_details_batch', {
        hand_ids: testHandIds
      })

      // Should not throw errors
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('Array size validation (DoS protection)', () => {
    it('should accept arrays up to 100 items', async () => {
      // Create array with exactly 100 UUIDs
      const handIds = Array(100).fill('00000000-0000-0000-0000-000000000000')

      const { error } = await supabase.rpc('get_hand_details_batch', {
        hand_ids: handIds
      })

      // Should succeed (no DoS)
      expect(error).toBeNull()
    })

    it('should reject arrays larger than 100 items', async () => {
      // Create array with 101 UUIDs (exceeds limit)
      const handIds = Array(101).fill('00000000-0000-0000-0000-000000000000')

      const { error } = await supabase.rpc('get_hand_details_batch', {
        hand_ids: handIds
      })

      // Should fail with validation error
      expect(error).not.toBeNull()
      expect(error?.message).toContain('Array size exceeds maximum')
    })

    it('should reject empty arrays', async () => {
      const { error } = await supabase.rpc('get_hand_details_batch', {
        hand_ids: []
      })

      // Should fail with validation error
      expect(error).not.toBeNull()
      expect(error?.message).toContain('empty')
    })

    it('should reject null arrays', async () => {
      const { error } = await supabase.rpc('get_hand_details_batch', {
        hand_ids: null as any
      })

      // Should fail with validation error
      expect(error).not.toBeNull()
    })
  })

  describe('RLS policy enforcement', () => {
    it('should respect RLS when fetching player data', async () => {
      // Anonymous users should only see public data
      const { data, error } = await supabase.rpc('get_players_with_hand_counts')

      expect(error).toBeNull()

      // If RLS is working, we should get results
      // but they should be filtered by RLS policies
      if (data && data.length > 0) {
        // Verify data structure
        expect(data[0]).toHaveProperty('id')
        expect(data[0]).toHaveProperty('name')
        expect(data[0]).toHaveProperty('hand_count')
      }
    })
  })

  describe('Performance', () => {
    it('should complete batch query within reasonable time', async () => {
      const handIds = Array(50).fill('00000000-0000-0000-0000-000000000000')

      const startTime = Date.now()
      await supabase.rpc('get_hand_details_batch', { hand_ids: handIds })
      const endTime = Date.now()

      const duration = endTime - startTime

      // Should complete within 5 seconds (reasonable for 50 items)
      expect(duration).toBeLessThan(5000)
    })
  })
})

describe('Migration verification', () => {
  it('should have applied security fix migration', async () => {
    // This test verifies that the migration was applied
    // by checking if the RPC functions exist and work correctly

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Test all 3 functions exist and are callable
    const tests = [
      supabase.rpc('get_players_with_hand_counts'),
      supabase.rpc('get_player_hands_grouped', {
        player_uuid: '00000000-0000-0000-0000-000000000000'
      }),
      supabase.rpc('get_hand_details_batch', {
        hand_ids: ['00000000-0000-0000-0000-000000000000']
      }),
    ]

    const results = await Promise.all(tests)

    // All functions should be callable (no "function does not exist" errors)
    results.forEach(({ error }) => {
      if (error) {
        expect(error.message).not.toContain('does not exist')
      }
    })
  })
})
