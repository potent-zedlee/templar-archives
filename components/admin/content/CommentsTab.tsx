/**
 * Comments Tab Component
 *
 * Displays comments table with hide/unhide/delete actions
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
import { Eye, EyeOff, Trash2 } from 'lucide-react'

type Comment = {
  id: string
  content: string
  author_name: string
  is_hidden: boolean
  created_at: string
}

type Props = {
  comments: (Comment & { post?: { title: string } })[]
  onHide: (commentId: string) => void
  onUnhide: (commentId: string) => void
  onDelete: (commentId: string) => void
}

export function CommentsTab({ comments, onHide, onUnhide, onDelete }: Props) {
  return (
    <Card className="p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Comment</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Posts</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comments.map((comment) => (
            <TableRow key={comment.id}>
              <TableCell className="max-w-md truncate">{comment.content}</TableCell>
              <TableCell>{comment.author_name}</TableCell>
              <TableCell className="max-w-xs truncate">
                {(comment as any).post?.title || '-'}
              </TableCell>
              <TableCell>
                {comment.is_hidden ? (
                  <Badge variant="destructive">Hidden</Badge>
                ) : (
                  <Badge variant="default">Public</Badge>
                )}
              </TableCell>
              <TableCell>
                {new Date(comment.created_at).toLocaleDateString('ko-KR')}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {comment.is_hidden ? (
                    <Button size="sm" variant="outline" onClick={() => onUnhide(comment.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => onHide(comment.id)}>
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(comment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
