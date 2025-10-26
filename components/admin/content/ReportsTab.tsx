/**
 * Reports Tab Component
 *
 * Displays content reports table with export functionality
 */

'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Download } from 'lucide-react'
import { exportContentReports } from '@/lib/export-utils'
import { toast } from 'sonner'
import type { Report } from '@/lib/content-moderation'

type Props = {
  reports: Report[]
  onReview: (report: Report) => void
}

export function ReportsTab({ reports, onReview }: Props) {
  function handleExport() {
    if (reports.length === 0) {
      toast.error('내보낼 데이터가 없습니다')
      return
    }

    const exportData = reports.map((r: any) => ({
      id: r.id,
      reported_item_type: r.post_id ? 'post' : 'comment',
      reported_item_id: r.post_id || r.comment_id,
      reporter_id: r.reporter_id,
      reason: r.reason,
      description: r.description,
      status: r.status,
      created_at: r.created_at,
      reviewed_at: r.reviewed_at,
    }))

    exportContentReports(exportData as any, 'csv')
    toast.success('CSV 파일이 다운로드되었습니다')
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Report Reason</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell>
                  <Badge variant="outline">
                    {report.post_id ? 'Posts' : 'Comment'}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {report.post_id
                    ? (report as any).post?.title
                    : (report as any).comment?.content}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{report.reason}</Badge>
                </TableCell>
                <TableCell>{report.reporter_name}</TableCell>
                <TableCell>
                  {report.status === 'pending' && (
                    <Badge variant="outline">Pending</Badge>
                  )}
                  {report.status === 'approved' && (
                    <Badge variant="destructive">Approved</Badge>
                  )}
                  {report.status === 'rejected' && (
                    <Badge variant="secondary">Rejected</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(report.created_at).toLocaleDateString('ko-KR')}
                </TableCell>
                <TableCell>
                  {report.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReview(report)}
                    >
                      Review
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
