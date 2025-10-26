/**
 * Security Event Logger
 *
 * Logs security events to database for monitoring and auditing.
 * This module uses Supabase service role to bypass RLS.
 */

import { createClient } from '@supabase/supabase-js'

// Service role client (bypasses RLS)
const getServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRole) {
    console.error('Missing Supabase credentials for security logger')
    return null
  }

  return createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export type SecurityEventType =
  | 'sql_injection'
  | 'xss_attempt'
  | 'csrf_violation'
  | 'rate_limit_exceeded'
  | 'suspicious_file_upload'
  | 'permission_violation'
  | 'failed_login_attempt'
  | 'admin_action'

export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SecurityEventData {
  event_type: SecurityEventType
  severity: SecurityEventSeverity
  user_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  request_method?: string | null
  request_path?: string | null
  request_body?: Record<string, any> | null
  response_status?: number | null
  details?: Record<string, any> | null
}

/**
 * Log a security event to the database
 *
 * @param eventData Security event data
 * @returns Promise<{ success: boolean; eventId?: string; error?: string }>
 */
export async function logSecurityEventToDb(
  eventData: SecurityEventData
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const supabase = getServiceRoleClient()

    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' }
    }

    // Insert security event
    const { data, error } = await supabase
      .from('security_events')
      .insert({
        event_type: eventData.event_type,
        severity: eventData.severity,
        user_id: eventData.user_id,
        ip_address: eventData.ip_address,
        user_agent: eventData.user_agent,
        request_method: eventData.request_method,
        request_path: eventData.request_path,
        request_body: eventData.request_body,
        response_status: eventData.response_status,
        details: eventData.details,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to log security event:', error)
      return { success: false, error: error.message }
    }

    return { success: true, eventId: data.id }
  } catch (error) {
    console.error('Error logging security event:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get security events with pagination and filtering
 *
 * @param options Query options
 * @returns Promise<{ data: any[]; count: number; error?: string }>
 */
export async function getSecurityEvents(options: {
  page?: number
  limit?: number
  event_type?: SecurityEventType
  severity?: SecurityEventSeverity
  user_id?: string
  from_date?: string
  to_date?: string
}): Promise<{ data: any[]; count: number; error?: string }> {
  try {
    const supabase = getServiceRoleClient()

    if (!supabase) {
      return { data: [], count: 0, error: 'Supabase client not initialized' }
    }

    const page = options.page || 1
    const limit = options.limit || 50
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('security_events')
      .select('*, users(id, email, name)', { count: 'exact' })

    // Apply filters
    if (options.event_type) {
      query = query.eq('event_type', options.event_type)
    }

    if (options.severity) {
      query = query.eq('severity', options.severity)
    }

    if (options.user_id) {
      query = query.eq('user_id', options.user_id)
    }

    if (options.from_date) {
      query = query.gte('created_at', options.from_date)
    }

    if (options.to_date) {
      query = query.lte('created_at', options.to_date)
    }

    // Order and paginate
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Failed to fetch security events:', error)
      return { data: [], count: 0, error: error.message }
    }

    return { data: data || [], count: count || 0 }
  } catch (error) {
    console.error('Error fetching security events:', error)
    return {
      data: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get security event statistics
 *
 * @returns Promise<{ stats: any; error?: string }>
 */
export async function getSecurityEventStats(): Promise<{
  stats: {
    total: number
    by_type: Record<string, number>
    by_severity: Record<string, number>
    recent_24h: number
    recent_7d: number
  } | null
  error?: string
}> {
  try {
    const supabase = getServiceRoleClient()

    if (!supabase) {
      return { stats: null, error: 'Supabase client not initialized' }
    }

    // Get total count
    const { count: total } = await supabase
      .from('security_events')
      .select('*', { count: 'exact', head: true })

    // Get count by type
    const { data: byType } = await supabase
      .from('security_events')
      .select('event_type')
      .then((result) => {
        if (!result.data) return { data: [] }
        const counts: Record<string, number> = {}
        result.data.forEach((row: any) => {
          counts[row.event_type] = (counts[row.event_type] || 0) + 1
        })
        return { data: counts }
      })

    // Get count by severity
    const { data: bySeverity } = await supabase
      .from('security_events')
      .select('severity')
      .then((result) => {
        if (!result.data) return { data: [] }
        const counts: Record<string, number> = {}
        result.data.forEach((row: any) => {
          counts[row.severity] = (counts[row.severity] || 0) + 1
        })
        return { data: counts }
      })

    // Get count in last 24 hours
    const { count: recent24h } = await supabase
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    // Get count in last 7 days
    const { count: recent7d } = await supabase
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    return {
      stats: {
        total: total || 0,
        by_type: byType || {},
        by_severity: bySeverity || {},
        recent_24h: recent24h || 0,
        recent_7d: recent7d || 0,
      },
    }
  } catch (error) {
    console.error('Error fetching security event stats:', error)
    return {
      stats: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Cleanup old security events (older than 90 days)
 *
 * @returns Promise<{ success: boolean; deletedCount?: number; error?: string }>
 */
export async function cleanupOldSecurityEvents(): Promise<{
  success: boolean
  deletedCount?: number
  error?: string
}> {
  try {
    const supabase = getServiceRoleClient()

    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' }
    }

    const { error } = await supabase.rpc('cleanup_old_security_events')

    if (error) {
      console.error('Failed to cleanup old security events:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error cleaning up old security events:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
