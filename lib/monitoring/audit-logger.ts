/**
 * Audit Logger
 *
 * Logs user and admin actions for auditing purposes.
 */

import { createClient } from '@supabase/supabase-js'

// Service role client (bypasses RLS)
const getServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRole) {
    console.error('Missing Supabase credentials for audit logger')
    return null
  }

  return createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export interface AuditLogData {
  user_id: string | null
  action: string
  resource_type?: string | null
  resource_id?: string | null
  old_value?: Record<string, any> | null
  new_value?: Record<string, any> | null
  ip_address?: string | null
  user_agent?: string | null
  metadata?: Record<string, any> | null
}

/**
 * Log an audit event
 *
 * @param data Audit log data
 * @returns Promise<{ success: boolean; logId?: string; error?: string }>
 */
export async function logAuditEvent(
  data: AuditLogData
): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const supabase = getServiceRoleClient()

    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' }
    }

    const { data: logData, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: data.user_id,
        action: data.action,
        resource_type: data.resource_type,
        resource_id: data.resource_id,
        old_value: data.old_value,
        new_value: data.new_value,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        metadata: data.metadata,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to log audit event:', error)
      return { success: false, error: error.message }
    }

    return { success: true, logId: logData.id }
  } catch (error) {
    console.error('Error logging audit event:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get audit logs with pagination
 *
 * @param options Query options
 * @returns Promise<{ data: any[]; count: number; error?: string }>
 */
export async function getAuditLogs(options: {
  page?: number
  limit?: number
  user_id?: string
  action?: string
  resource_type?: string
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

    let query = supabase
      .from('audit_logs')
      .select('*, users(id, email, name)', { count: 'exact' })

    // Apply filters
    if (options.user_id) {
      query = query.eq('user_id', options.user_id)
    }

    if (options.action) {
      query = query.eq('action', options.action)
    }

    if (options.resource_type) {
      query = query.eq('resource_type', options.resource_type)
    }

    if (options.from_date) {
      query = query.gte('created_at', options.from_date)
    }

    if (options.to_date) {
      query = query.lte('created_at', options.to_date)
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Failed to fetch audit logs:', error)
      return { data: [], count: 0, error: error.message }
    }

    return { data: data || [], count: count || 0 }
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return {
      data: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
