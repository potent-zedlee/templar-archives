/**
 * Admin Audit Logs Page
 *
 * View and monitor all user and admin actions for auditing.
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { FileText, ChevronLeft, ChevronRight, RefreshCw, Download, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { isAdmin } from '@/lib/auth-utils'
import { exportAuditLogs } from '@/lib/export-utils'

type AuditLog = {
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
  users: {
    id: string
    email: string
    name: string | null
  } | null
}

const ACTION_LABELS: Record<string, string> = {
  create_tournament: 'Create Tournament',
  update_tournament: 'Update Tournament',
  delete_tournament: 'Delete Tournament',
  create_subevent: 'Create SubEvent',
  update_subevent: 'Update SubEvent',
  delete_subevent: 'Delete SubEvent',
  create_day: 'Create Day',
  update_day: 'Update Day',
  delete_day: 'Delete Day',
  ban_user: 'Ban User',
  unban_user: 'Unban User',
  change_role: 'Change Role',
  approve_claim: 'Approve Claim',
  reject_claim: 'Reject Claim',
  delete_post: 'Delete Post',
  delete_comment: 'Delete Comment',
}

const RESOURCE_TYPE_COLORS: Record<string, string> = {
  tournament: 'bg-blue-100 text-blue-800',
  subevent: 'bg-green-100 text-green-800',
  day: 'bg-yellow-100 text-yellow-800',
  user: 'bg-purple-100 text-purple-800',
  post: 'bg-pink-100 text-pink-800',
  hand: 'bg-orange-100 text-orange-800',
}

export default function AuditLogsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all')

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Stats
  const [stats, setStats] = useState<{
    total: number
    recent_24h: number
    recent_7d: number
    by_resource_type: Record<string, number>
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

      loadAuditLogs()
      loadStats()
    }

    checkAccess()
  }, [router, currentPage, actionFilter, resourceTypeFilter])

  const loadAuditLogs = async () => {
    setLoading(true)
    try {
      const supabase = createBrowserSupabaseClient()

      let query = supabase
        .from('audit_logs')
        .select('*, users(id, email, name)', { count: 'exact' })

      // Apply filters
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter)
      }

      if (resourceTypeFilter !== 'all') {
        query = query.eq('resource_type', resourceTypeFilter)
      }

      // Order and paginate
      const offset = (currentPage - 1) * pageSize
      query = query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1)

      const { data, error, count } = await query

      if (error) throw error

      setLogs(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Failed to load audit logs:', error)
      toast.error('Audit 로그를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const supabase = createBrowserSupabaseClient()

      // Get total count
      const { count: total } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })

      // Get count in last 24 hours
      const { count: recent24h } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      // Get count in last 7 days
      const { count: recent7d } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      // Get count by resource type
      const { data: allLogs } = await supabase.from('audit_logs').select('resource_type')

      const byResourceType: Record<string, number> = {}
      allLogs?.forEach((log: any) => {
        if (log.resource_type) {
          byResourceType[log.resource_type] = (byResourceType[log.resource_type] || 0) + 1
        }
      })

      setStats({
        total: total || 0,
        recent_24h: recent24h || 0,
        recent_7d: recent7d || 0,
        by_resource_type: byResourceType,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.error('내보낼 데이터가 없습니다')
      return
    }
    exportAuditLogs(logs as any, 'csv')
    toast.success('CSV 파일이 다운로드되었습니다')
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <FileText className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Audit Logs</h1>
            <p className="text-muted-foreground">사용자 및 관리자 액션 감사 추적</p>
          </div>
        </div>
        <Button onClick={handleExportCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Actions</div>
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
            <div className="text-sm text-muted-foreground">Resource Types</div>
            <div className="text-2xl font-bold">
              {Object.keys(stats.by_resource_type).length}
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Resource Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="tournament">Tournament</SelectItem>
              <SelectItem value="subevent">SubEvent</SelectItem>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="post">Post</SelectItem>
              <SelectItem value="hand">Hand</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadAuditLogs()
              loadStats()
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Logs Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Audit 로그가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">
                    {formatDate(log.created_at)}
                  </TableCell>
                  <TableCell>
                    {log.users ? (
                      <div className="text-sm">
                        <div className="font-medium">{log.users.name || 'Unknown'}</div>
                        <div className="text-muted-foreground">{log.users.email}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">System</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ACTION_LABELS[log.action] || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.resource_type && (
                      <div className="flex items-center gap-2">
                        <Badge className={RESOURCE_TYPE_COLORS[log.resource_type] || ''}>
                          {log.resource_type}
                        </Badge>
                        {log.resource_id && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {log.resource_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedLog(log)
                        setDetailModalOpen(true)
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
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
            Page {currentPage} of {totalPages} ({totalCount} total actions)
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

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog && formatDate(selectedLog.created_at)}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* User Info */}
              <div>
                <h3 className="font-semibold mb-2">User</h3>
                {selectedLog.users ? (
                  <div>
                    <div>{selectedLog.users.name || 'Unknown'}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedLog.users.email}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">System</span>
                )}
              </div>

              {/* Action Info */}
              <div>
                <h3 className="font-semibold mb-2">Action</h3>
                <Badge>{ACTION_LABELS[selectedLog.action] || selectedLog.action}</Badge>
              </div>

              {/* Resource Info */}
              {selectedLog.resource_type && (
                <div>
                  <h3 className="font-semibold mb-2">Resource</h3>
                  <div className="flex items-center gap-2">
                    <Badge className={RESOURCE_TYPE_COLORS[selectedLog.resource_type] || ''}>
                      {selectedLog.resource_type}
                    </Badge>
                    {selectedLog.resource_id && (
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {selectedLog.resource_id}
                      </code>
                    )}
                  </div>
                </div>
              )}

              {/* Old Value */}
              {selectedLog.old_value && (
                <div>
                  <h3 className="font-semibold mb-2">Before</h3>
                  <pre className="p-4 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(selectedLog.old_value, null, 2)}
                  </pre>
                </div>
              )}

              {/* New Value */}
              {selectedLog.new_value && (
                <div>
                  <h3 className="font-semibold mb-2">After</h3>
                  <pre className="p-4 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(selectedLog.new_value, null, 2)}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && (
                <div>
                  <h3 className="font-semibold mb-2">Metadata</h3>
                  <pre className="p-4 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Technical Info */}
              <div>
                <h3 className="font-semibold mb-2">Technical Info</h3>
                <div className="space-y-1 text-sm">
                  {selectedLog.ip_address && (
                    <div>
                      <span className="text-muted-foreground">IP: </span>
                      <code className="text-xs">{selectedLog.ip_address}</code>
                    </div>
                  )}
                  {selectedLog.user_agent && (
                    <div>
                      <span className="text-muted-foreground">User Agent: </span>
                      <code className="text-xs">{selectedLog.user_agent}</code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
