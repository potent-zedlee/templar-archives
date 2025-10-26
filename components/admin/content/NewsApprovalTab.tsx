/**
 * News Approval Tab Component
 *
 * Displays pending news articles table
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
import type { News } from '@/lib/queries/news-queries'

type Props = {
  pendingNews: News[]
  onReview: (news: News) => void
}

export function NewsApprovalTab({ pendingNews, onReview }: Props) {
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
          {pendingNews.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No pending news articles
              </TableCell>
            </TableRow>
          ) : (
            pendingNews.map((news) => (
              <TableRow key={news.id}>
                <TableCell className="max-w-sm truncate">{news.title}</TableCell>
                <TableCell>{news.author?.nickname || 'Unknown'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{news.category}</Badge>
                </TableCell>
                <TableCell>
                  {new Date(news.created_at).toLocaleDateString('ko-KR')}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => onReview(news)}>
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
