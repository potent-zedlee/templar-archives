/**
 * Export Utilities
 *
 * Provides CSV and JSON export functionality for admin pages.
 */

/**
 * Convert data to CSV format
 *
 * @param data Array of objects to convert
 * @param columns Optional array of column keys to include (default: all keys from first row)
 * @returns CSV string
 */
export function convertToCSV(
  data: Record<string, any>[],
  columns?: string[]
): string {
  if (data.length === 0) {
    return ''
  }

  // Use provided columns or extract from first row
  const headers = columns || Object.keys(data[0])

  // CSV header row
  const headerRow = headers.map((header) => escapeCSVValue(header)).join(',')

  // CSV data rows
  const dataRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header]
        return escapeCSVValue(formatValueForCSV(value))
      })
      .join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 *
 * @param value Value to escape
 * @returns Escaped value
 */
function escapeCSVValue(value: string): string {
  if (value == null) {
    return ''
  }

  const stringValue = String(value)

  // If value contains comma, quote, or newline, wrap in quotes
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    // Escape quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * Format value for CSV export
 *
 * @param value Value to format
 * @returns Formatted string
 */
function formatValueForCSV(value: any): string {
  if (value == null) {
    return ''
  }

  // Handle Date objects
  if (value instanceof Date) {
    return value.toISOString()
  }

  // Handle objects/arrays (stringify as JSON)
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  return String(value)
}

/**
 * Download data as CSV file
 *
 * @param data Array of objects to export
 * @param filename Filename without extension (e.g., "security-logs")
 * @param columns Optional array of column keys to include
 */
export function downloadCSV(
  data: Record<string, any>[],
  filename: string,
  columns?: string[]
): void {
  const csv = convertToCSV(data, columns)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `${filename}.csv`)
}

/**
 * Download data as JSON file
 *
 * @param data Data to export (can be object or array)
 * @param filename Filename without extension (e.g., "audit-logs")
 */
export function downloadJSON(data: any, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
  triggerDownload(blob, `${filename}.json`)
}

/**
 * Trigger browser download
 *
 * @param blob Blob to download
 * @param filename Filename with extension
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Export Security Logs
 *
 * @param logs Security logs data
 * @param format Export format ('csv' or 'json')
 */
export function exportSecurityLogs(
  logs: Array<{
    id: string
    event_type: string
    severity: string
    user_id: string | null
    ip_address: string | null
    user_agent: string | null
    method: string | null
    path: string | null
    details: Record<string, any> | null
    created_at: string
  }>,
  format: 'csv' | 'json' = 'csv'
): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `security-logs-${timestamp}`

  if (format === 'csv') {
    // Flatten data for CSV
    const flattenedLogs = logs.map((log) => ({
      id: log.id,
      event_type: log.event_type,
      severity: log.severity,
      user_id: log.user_id || '',
      ip_address: log.ip_address || '',
      user_agent: log.user_agent || '',
      method: log.method || '',
      path: log.path || '',
      details: log.details ? JSON.stringify(log.details) : '',
      created_at: log.created_at,
    }))

    downloadCSV(flattenedLogs, filename, [
      'id',
      'created_at',
      'event_type',
      'severity',
      'user_id',
      'ip_address',
      'method',
      'path',
      'details',
    ])
  } else {
    downloadJSON(logs, filename)
  }
}

/**
 * Export Audit Logs
 *
 * @param logs Audit logs data
 * @param format Export format ('csv' or 'json')
 */
export function exportAuditLogs(
  logs: Array<{
    id: string
    user_id: string | null
    action: string
    resource_type: string | null
    resource_id: string | null
    old_value: Record<string, any> | null
    new_value: Record<string, any> | null
    ip_address: string | null
    user_agent: string | null
    metadata: Record<string, any> | null
    created_at: string
    users?: { email: string; name: string | null } | null
  }>,
  format: 'csv' | 'json' = 'csv'
): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `audit-logs-${timestamp}`

  if (format === 'csv') {
    // Flatten data for CSV
    const flattenedLogs = logs.map((log) => ({
      id: log.id,
      created_at: log.created_at,
      user_email: log.users?.email || '',
      user_name: log.users?.name || '',
      action: log.action,
      resource_type: log.resource_type || '',
      resource_id: log.resource_id || '',
      old_value: log.old_value ? JSON.stringify(log.old_value) : '',
      new_value: log.new_value ? JSON.stringify(log.new_value) : '',
      ip_address: log.ip_address || '',
      user_agent: log.user_agent || '',
      metadata: log.metadata ? JSON.stringify(log.metadata) : '',
    }))

    downloadCSV(flattenedLogs, filename, [
      'id',
      'created_at',
      'user_email',
      'user_name',
      'action',
      'resource_type',
      'resource_id',
      'old_value',
      'new_value',
      'ip_address',
    ])
  } else {
    downloadJSON(logs, filename)
  }
}

/**
 * Export Users
 *
 * @param users Users data
 * @param format Export format ('csv' or 'json')
 */
export function exportUsers(
  users: Array<{
    id: string
    email: string
    name: string | null
    role: string
    created_at: string
    last_sign_in_at: string | null
    banned_at: string | null
  }>,
  format: 'csv' | 'json' = 'csv'
): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `users-${timestamp}`

  if (format === 'csv') {
    downloadCSV(users, filename, [
      'id',
      'email',
      'name',
      'role',
      'created_at',
      'last_sign_in_at',
      'banned_at',
    ])
  } else {
    downloadJSON(users, filename)
  }
}

/**
 * Export Hand Edit Requests
 *
 * @param requests Hand edit requests data
 * @param format Export format ('csv' or 'json')
 */
export function exportHandEditRequests(
  requests: Array<{
    id: string
    hand_id: string
    requester_id: string
    edit_type: string
    status: string
    suggested_changes: Record<string, any>
    reason: string | null
    created_at: string
    reviewed_at: string | null
  }>,
  format: 'csv' | 'json' = 'csv'
): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `hand-edit-requests-${timestamp}`

  if (format === 'csv') {
    // Flatten data for CSV
    const flattenedRequests = requests.map((request) => ({
      id: request.id,
      hand_id: request.hand_id,
      requester_id: request.requester_id,
      edit_type: request.edit_type,
      status: request.status,
      suggested_changes: JSON.stringify(request.suggested_changes),
      reason: request.reason || '',
      created_at: request.created_at,
      reviewed_at: request.reviewed_at || '',
    }))

    downloadCSV(flattenedRequests, filename, [
      'id',
      'created_at',
      'hand_id',
      'requester_id',
      'edit_type',
      'status',
      'suggested_changes',
      'reason',
      'reviewed_at',
    ])
  } else {
    downloadJSON(requests, filename)
  }
}

/**
 * Export Content Reports
 *
 * @param reports Content reports data
 * @param format Export format ('csv' or 'json')
 */
export function exportContentReports(
  reports: Array<{
    id: string
    reported_item_type: string
    reported_item_id: string
    reporter_id: string
    reason: string
    description: string | null
    status: string
    created_at: string
    reviewed_at: string | null
  }>,
  format: 'csv' | 'json' = 'csv'
): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `content-reports-${timestamp}`

  if (format === 'csv') {
    downloadCSV(reports, filename, [
      'id',
      'created_at',
      'reported_item_type',
      'reported_item_id',
      'reporter_id',
      'reason',
      'description',
      'status',
      'reviewed_at',
    ])
  } else {
    downloadJSON(reports, filename)
  }
}
