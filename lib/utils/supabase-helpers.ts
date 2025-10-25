/**
 * Common Supabase Query Helpers
 *
 * Reusable utility functions for Supabase queries
 * Reduces code duplication across the codebase
 */

import { createClientSupabaseClient } from '@/lib/supabase-client'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

/**
 * Standard Supabase query result
 */
export interface QueryResult<T> {
  data: T | null
  error: Error | null
}

/**
 * Execute query and handle errors consistently
 *
 * @example
 * const result = await executeQuery(
 *   supabase.from('players').select('*').eq('id', playerId).single()
 * )
 */
export async function executeQuery<T>(
  query: Promise<{ data: T | null; error: any }>
): Promise<QueryResult<T>> {
  try {
    const { data, error } = await query

    if (error) {
      logger.error('Supabase query error', {
        error: error.message,
        code: error.code,
        details: error.details,
      })
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error('Unexpected query error', { error: error.message })
    return { data: null, error }
  }
}

/**
 * Fetch single record by ID
 *
 * @example
 * const player = await fetchById('players', playerId)
 */
export async function fetchById<T>(
  table: string,
  id: string,
  columns: string = '*'
): Promise<QueryResult<T>> {
  const supabase = createClientSupabaseClient()

  const query = supabase
    .from(table)
    .select(columns)
    .eq('id', id)
    .single()

  return executeQuery<T>(query)
}

/**
 * Fetch multiple records with filters
 *
 * @example
 * const players = await fetchMany('players', {
 *   filters: { country: 'USA' },
 *   orderBy: 'total_winnings',
 *   ascending: false,
 *   limit: 10
 * })
 */
export async function fetchMany<T>(
  table: string,
  options: {
    columns?: string
    filters?: Record<string, unknown>
    orderBy?: string
    ascending?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<QueryResult<T[]>> {
  const supabase = createClientSupabaseClient()

  let query = supabase
    .from(table)
    .select(options.columns || '*')

  // Apply filters
  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
  }

  // Apply ordering
  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending ?? true })
  }

  // Apply pagination
  if (options.limit) {
    query = query.limit(options.limit)
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
  }

  return executeQuery<T[]>(query)
}

/**
 * Insert single record
 *
 * @example
 * const newPlayer = await insertOne('players', {
 *   name: 'John Doe',
 *   country: 'USA'
 * })
 */
export async function insertOne<T>(
  table: string,
  data: Record<string, unknown>
): Promise<QueryResult<T>> {
  const supabase = createClientSupabaseClient()

  const query = supabase
    .from(table)
    .insert(data)
    .select()
    .single()

  return executeQuery<T>(query)
}

/**
 * Update record by ID
 *
 * @example
 * const updated = await updateById('players', playerId, {
 *   total_winnings: 1000000
 * })
 */
export async function updateById<T>(
  table: string,
  id: string,
  data: Record<string, unknown>
): Promise<QueryResult<T>> {
  const supabase = createClientSupabaseClient()

  const query = supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single()

  return executeQuery<T>(query)
}

/**
 * Delete record by ID
 *
 * @example
 * const result = await deleteById('players', playerId)
 */
export async function deleteById(
  table: string,
  id: string
): Promise<QueryResult<void>> {
  const supabase = createClientSupabaseClient()

  const query = supabase
    .from(table)
    .delete()
    .eq('id', id)

  return executeQuery<void>(query)
}

/**
 * Count records with filters
 *
 * @example
 * const count = await countRecords('players', { country: 'USA' })
 */
export async function countRecords(
  table: string,
  filters?: Record<string, unknown>
): Promise<QueryResult<number>> {
  const supabase = createClientSupabaseClient()

  let query = supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  // Apply filters
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
  }

  try {
    const { count, error } = await query

    if (error) {
      logger.error('Count query error', { error: error.message })
      return { data: null, error: new Error(error.message) }
    }

    return { data: count || 0, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error('Unexpected count error', { error: error.message })
    return { data: null, error }
  }
}

/**
 * Check if record exists
 *
 * @example
 * const exists = await recordExists('players', { name: 'John Doe' })
 */
export async function recordExists(
  table: string,
  filters: Record<string, unknown>
): Promise<boolean> {
  const result = await countRecords(table, filters)
  return (result.data || 0) > 0
}

/**
 * Batch insert records
 *
 * @example
 * const inserted = await insertMany('players', [
 *   { name: 'Player 1', country: 'USA' },
 *   { name: 'Player 2', country: 'UK' }
 * ])
 */
export async function insertMany<T>(
  table: string,
  data: Record<string, unknown>[]
): Promise<QueryResult<T[]>> {
  const supabase = createClientSupabaseClient()

  const query = supabase
    .from(table)
    .insert(data)
    .select()

  return executeQuery<T[]>(query)
}

/**
 * Server-side query helpers
 * Use these in Server Components and Server Actions
 */
export const serverHelpers = {
  /**
   * Execute query on server with server client
   */
  async executeQuery<T>(
    query: Promise<{ data: T | null; error: any }>
  ): Promise<QueryResult<T>> {
    return executeQuery(query)
  },

  /**
   * Fetch by ID on server
   */
  async fetchById<T>(
    table: string,
    id: string,
    columns: string = '*'
  ): Promise<QueryResult<T>> {
    const supabase = await createServerSupabaseClient()

    const query = supabase
      .from(table)
      .select(columns)
      .eq('id', id)
      .single()

    return executeQuery<T>(query)
  },

  /**
   * Check authentication on server
   */
  async requireAuth(): Promise<QueryResult<{ userId: string; email: string }>> {
    const supabase = await createServerSupabaseClient()

    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        return {
          data: null,
          error: new Error('Authentication required')
        }
      }

      return {
        data: {
          userId: user.id,
          email: user.email || ''
        },
        error: null
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      return { data: null, error }
    }
  },
}
