/**
 * Admin Security Logs Page
 *
 * View and monitor security events logged by the system.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Shield, AlertTriangle, Info, XCircle, ChevronLeft, ChevronRight, RefreshCw, Download } from 'lucide-react'
import { toast } from 'sonner'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { isAdmin } from '@/lib/auth-utils'
import { exportSecurityLogs } from '@/lib/export-utils'

type SecurityEvent = {
  id: string
  event_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  user_id: string | null
  ip_address: string | null
  user_agent: string | null
  request_method: string | null
  request_path: string | null
  response_status: number | null
  details: Record<string, any> | null
  created_at: string
  users: {
    id: string
    email: string
    name: string | null
  } | null
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  sql_injection: 'SQL Injection',
  xss_attempt: 'XSS Attempt',
  csrf_violation: 'CSRF Violation',
  rate_limit_exceeded: 'Rate Limit',
  suspicious_file_upload: 'Suspicious File',
  permission_violation: 'Permission Denied',
  failed_login_attempt: 'Failed Login',
  admin_action: 'Admin Action',
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

const SEVERITY_ICONS: Record<string, any> = {
  low: Info,
  medium: AlertTriangle,
  high: AlertTriangle,
  critical: XCircle,
}

export default function SecurityLogsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Stats
  const [stats, setStats] = useState<{
    total: number
    by_severity: Record<string, number>
    recent_24h: number
    recent_7d: number
  } | null>(null)

  // Check admin access
  useEffect(() => {
    const checkAccess = async () => {
      const supabase = createBrowserSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: dbUser } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single()

      if (!dbUser || !isAdmin(dbUser.email)) {
        router.push('/')
        toast.error('관리자 권한이 필요합니다')
        return
      }

      loadSecurityEvents()
      loadStats()
    }

    checkAccess()
  }, [router, currentPage, eventTypeFilter, severityFilter])

  const loadSecurityEvents = async () => {
    setLoading(true)
    try {
      const supabase = createBrowserSupabaseClient()

      let query = supabase
        .from('security_events')
        .select('*, users(id, email, name)', { count: 'exact' })

      // Apply filters
      if (eventTypeFilter !== 'all') {
        query = query.eq('event_type', eventTypeFilter)
      }

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter)
      }

      // Order and paginate
      const offset = (currentPage - 1) * pageSize
      query = query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1)

      const { data, error, count } = await query

      if (error) throw error

      setEvents(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Failed to load security events:', error)
      toast.error('보안 이벤트를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const supabase = createBrowserSupabaseClient()

      // Get total count
      const { count: total } = await supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })

      // Get count by severity
      const { data: allEvents } = await supabase.from('security_events').select('severity')

      const bySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 }
      allEvents?.forEach((event: any) => {
        bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1
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

      setStats({
        total: total || 0,
        by_severity: bySeverity,
        recent_24h: recent24h || 0,
        recent_7d: recent7d || 0,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const getSeverityIcon = (severity: string) => {
    const Icon = SEVERITY_ICONS[severity] || Info
    return <Icon className="w-4 h-4" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Security Logs</h1>
          <p className="text-muted-foreground">모니터링 및 보안 이벤트 추적</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Events</div>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Last 24 Hours</div>
            <div className="text-2xl font-bold">{stats.recent_24h.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Last 7 Days</div>
            <div className="text-2xl font-bold">{stats.recent_7d.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Critical Events</div>
            <div className="text-2xl font-bold text-red-600">
              {stats.by_severity.critical || 0}
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadSecurityEvents()
              loadStats()
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (events.length === 0) {
                  toast.error('내보낼 데이터가 없습니다')
                  return
                }
                exportSecurityLogs(events as any, 'csv')
                toast.success('CSV 파일이 다운로드되었습니다')
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (events.length === 0) {
                  toast.error('내보낼 데이터가 없습니다')
                  return
                }
                exportSecurityLogs(events as any, 'json')
                toast.success('JSON 파일이 다운로드되었습니다')
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>
      </Card>

      {/* Events Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>User</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  보안 이벤트가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-mono text-xs">
                    {formatDate(event.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(event.severity)}
                      <Badge className={SEVERITY_COLORS[event.severity]}>
                        {event.severity.toUpperCase()}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {event.users ? (
                      <div className="text-sm">
                        <div className="font-medium">{event.users.name || 'Unknown'}</div>
                        <div className="text-muted-foreground">{event.users.email}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Anonymous</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {event.ip_address || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {event.request_method} {event.request_path || '-'}
                  </TableCell>
                  <TableCell>
                    {event.details && (
                      <details>
                        <summary className="cursor-pointer text-sm text-primary hover:underline">
                          View Details
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-w-md">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} ({totalCount} total events)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
