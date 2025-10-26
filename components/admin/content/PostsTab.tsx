/**
 * Posts Tab Component
 *
 * Displays posts table with hide/unhide/delete actions
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

type Post = {
  id: string
  title: string
  author_name: string
  category: string
  is_hidden: boolean
  created_at: string
}

type Props = {
  posts: Post[]
  onHide: (postId: string) => void
  onUnhide: (postId: string) => void
  onDelete: (postId: string) => void
}

export function PostsTab({ posts, onHide, onUnhide, onDelete }: Props) {
  return (
    <Card className="p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => (
            <TableRow key={post.id}>
              <TableCell className="max-w-sm truncate">{post.title}</TableCell>
              <TableCell>{post.author_name}</TableCell>
              <TableCell>
                <Badge variant="outline">{post.category}</Badge>
              </TableCell>
              <TableCell>
                {post.is_hidden ? (
                  <Badge variant="destructive">Hidden</Badge>
                ) : (
                  <Badge variant="default">Public</Badge>
                )}
              </TableCell>
              <TableCell>
                {new Date(post.created_at).toLocaleDateString('ko-KR')}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {post.is_hidden ? (
                    <Button size="sm" variant="outline" onClick={() => onUnhide(post.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => onHide(post.id)}>
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => onDelete(post.id)}>
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
