/**
 * Report Detail Dialog Component
 *
 * Displays report details and approve/reject actions
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle } from 'lucide-react'
import type { Report } from '@/lib/content-moderation'

type Props = {
  report: Report | null
  open: boolean
  onClose: () => void
  onApprove: (comment: string) => void
  onReject: (comment: string) => void
}

export function ReportDetailDialog({ report, open, onClose, onApprove, onReject }: Props) {
  const [adminComment, setAdminComment] = useState('')

  function handleClose() {
    setAdminComment('')
    onClose()
  }

  function handleApprove() {
    onApprove(adminComment)
    setAdminComment('')
  }

  function handleReject() {
    onReject(adminComment)
    setAdminComment('')
  }

  if (!report) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Report</DialogTitle>
          <DialogDescription>
            Review the report and approve or reject it
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Type</Label>
            <Badge variant="outline" className="mt-1">
              {report.post_id ? 'Posts' : 'Comment'}
            </Badge>
          </div>

          <div>
            <Label>Content</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              {report.post_id
                ? (report as any).post?.title
                : (report as any).comment?.content}
            </p>
          </div>

          <div>
            <Label>Report Reason</Label>
            <Badge variant="secondary" className="mt-1">
              {report.reason}
            </Badge>
          </div>

          {report.description && (
            <div>
              <Label>Description</Label>
              <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
            </div>
          )}

          <div>
            <Label>Reporter</Label>
            <p className="mt-1 text-sm">{report.reporter_name}</p>
          </div>

          <div>
            <Label htmlFor="admin-comment">Admin Comment (Optional)</Label>
            <Textarea
              id="admin-comment"
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder="Comments on the review..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleApprove}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve (Content Hidden)
          </Button>
          <Button variant="secondary" onClick={handleReject}>
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
