/**
 * Live Reports Approval Tab Component
 *
 * Displays pending live reports table
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
import type { LiveReport } from '@/lib/queries/live-reports-queries'

type Props = {
  pendingLiveReports: LiveReport[]
  onReview: (report: LiveReport) => void
}

export function LiveReportsApprovalTab({ pendingLiveReports, onReview }: Props) {
  return (
    <Card className="p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingLiveReports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No pending live reports
              </TableCell>
            </TableRow>
          ) : (
            pendingLiveReports.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="max-w-sm truncate">{report.title}</TableCell>
                <TableCell>{report.author?.name || 'Unknown'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{report.category}</Badge>
                </TableCell>
                <TableCell>
                  {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => onReview(report)}>
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}
