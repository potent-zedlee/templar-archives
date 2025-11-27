/**
 * News Preview Dialog Component
 *
 * Displays full news article preview with approve/reject actions
 */

'use client'

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
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle } from 'lucide-react'
import type { News } from '@/lib/queries/news-queries'

type Props = {
  news: News | null
  open: boolean
  onClose: () => void
  onApprove: () => void
  onReject: () => void
}

export function NewsPreviewDialog({ news, open, onClose, onApprove, onReject }: Props) {
  if (!news) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review News Article</DialogTitle>
          <DialogDescription>
            Review the news article and approve or reject it
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <p className="mt-1 font-semibold">{news.title}</p>
          </div>

          <div>
            <Label>Category</Label>
            <Badge variant="outline" className="mt-1">
              {news.category}
            </Badge>
          </div>

          {news.tags.length > 0 && (
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {news.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {news.thumbnailUrl && (
            <div>
              <Label>Thumbnail</Label>
              <img
                src={news.thumbnailUrl}
                alt="Thumbnail"
                className="mt-1 rounded-lg max-h-48 object-cover"
              />
            </div>
          )}

          <div>
            <Label>Content</Label>
            <div className="mt-1 p-4 border rounded-lg bg-muted/50 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm">{news.content}</pre>
            </div>
          </div>

          {news.externalLink && (
            <div>
              <Label>External Link</Label>
              <a
                href={news.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 text-sm text-blue-500 hover:underline block"
              >
                {news.externalLink}
              </a>
            </div>
          )}

          <div>
            <Label>Author</Label>
            <p className="mt-1 text-sm">{news.author?.nickname || 'Unknown'}</p>
          </div>

          <div>
            <Label>Created</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(news.createdAt).toLocaleString('ko-KR')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onReject}>
            <XCircle className="mr-2 h-4 w-4" />
            Reject (Back to Draft)
          </Button>
          <Button variant="default" onClick={onApprove}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve & Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
