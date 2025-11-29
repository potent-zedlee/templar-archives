/**
 * Comments Tab Component (Hand Comments Only)
 *
 * Displays hand comments table with hide/unhide/delete actions
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
import Link from 'next/link'

type Comment = {
  id: string
  content: string
  author_name: string
  hand_id?: string
  is_hidden: boolean
  created_at: string
}

type Props = {
  comments: Comment[]
  onHide: (commentId: string, handId: string) => void
  onUnhide: (commentId: string, handId: string) => void
  onDelete: (commentId: string, handId: string) => void
}

export function CommentsTab({ comments, onHide, onUnhide, onDelete }: Props) {
  return (
    <Card className="p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Comment</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Hand</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No comments found
              </TableCell>
            </TableRow>
          ) : (
            comments.map((comment) => (
              <TableRow key={comment.id}>
                <TableCell className="max-w-md truncate">{comment.content}</TableCell>
                <TableCell>{comment.author_name}</TableCell>
                <TableCell>
                  {comment.hand_id ? (
                    <Link
                      href={`/hand/${comment.hand_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View Hand
                    </Link>
                  ) : (
                    '-'
                  )}
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
                    {comment.hand_id && (
                      <>
                        {comment.is_hidden ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUnhide(comment.id, comment.hand_id!)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onHide(comment.id, comment.hand_id!)}
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDelete(comment.id, comment.hand_id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}
