/**
 * Security Event Logger
 *
 * Logs security events to Firestore for monitoring and auditing.
 *
 * Note: 보안 이벤트 컬렉션은 아직 Firestore에 완전히 구현되지 않았으므로
 * 로그 메시지만 출력합니다.
 */

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
  eventType: SecurityEventType
  severity: SecurityEventSeverity
  userId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  requestMethod?: string | null
  requestPath?: string | null
  requestBody?: Record<string, unknown> | null
  responseStatus?: number | null
  details?: Record<string, unknown> | null
}

/**
 * Log a security event
 * TODO: Firestore 보안 이벤트 컬렉션 구현 시 실제 저장 로직 추가
 *
 * @param eventData Security event data
 * @returns Promise<{ success: boolean; eventId?: string; error?: string }>
 */
export async function logSecurityEventToDb(
  eventData: SecurityEventData
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    // Log to console for now
    console.log('[security-logger] Security event:', {
      type: eventData.eventType,
      severity: eventData.severity,
      path: eventData.requestPath,
      timestamp: new Date().toISOString(),
    })

    // TODO: Firestore에 저장
    // const db = getAdminFirestore()
    // const docRef = await db.collection('securityEvents').add({
    //   ...eventData,
    //   createdAt: FieldValue.serverTimestamp(),
    // })
    // return { success: true, eventId: docRef.id }

    return { success: true, eventId: `stub-${Date.now()}` }
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
 * TODO: Firestore 구현 필요
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
}): Promise<{ data: unknown[]; count: number; error?: string }> {
  console.log('[security-logger] getSecurityEvents called with options:', options)
  // TODO: Firestore에서 조회
  return { data: [], count: 0 }
}

/**
 * Get security event statistics
 * TODO: Firestore 구현 필요
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
  // TODO: Firestore에서 통계 조회
  return {
    stats: {
      total: 0,
      by_type: {},
      by_severity: {},
      recent_24h: 0,
      recent_7d: 0,
    },
  }
}

/**
 * Cleanup old security events (older than 90 days)
 * TODO: Firestore 구현 필요
 *
 * @returns Promise<{ success: boolean; deletedCount?: number; error?: string }>
 */
export async function cleanupOldSecurityEvents(): Promise<{
  success: boolean
  deletedCount?: number
  error?: string
}> {
  // TODO: Firestore에서 오래된 이벤트 삭제
  console.log('[security-logger] cleanupOldSecurityEvents called')
  return { success: true, deletedCount: 0 }
}
