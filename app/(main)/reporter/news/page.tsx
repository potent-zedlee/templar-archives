"use client"

/**
 * Reporter News Management Page
 *
 * Reporter가 뉴스를 작성/관리하는 페이지
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Eye } from "lucide-react"
import { useMyNewsQuery, useCreateNewsMutation, useUpdateNewsMutation, useDeleteNewsMutation, type News } from "@/lib/queries/news-queries"
import { ContentEditor } from "@/components/reporter/content-editor"
import { toast } from "sonner"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { isReporterOrAdmin } from "@/lib/admin"
import { useAuth } from "@/components/auth-provider"

export default function ReporterNewsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingNews, setEditingNews] = useState<News | null>(null)

  const { data: myNews = [], isLoading } = useMyNewsQuery()
  const createMutation = useCreateNewsMutation()
  const updateMutation = useUpdateNewsMutation()
  const deleteMutation = useDeleteNewsMutation()

  useEffect(() => {
    checkAccess()
  }, [user])

  async function checkAccess() {
    if (!user) {
      router.push("/auth/login")
      return
    }

    const access = await isReporterOrAdmin(user.id)
    if (!access) {
      toast.error("Reporter access required")
      router.push("/")
      return
    }

    setHasAccess(true)
  }

  const handleCreate = () => {
    setEditingNews(null)
    setIsEditorOpen(true)
  }

  const handleEdit = (news: News) => {
    setEditingNews(news)
    setIsEditorOpen(true)
  }

  const handleSave = async (data: any) => {
    try {
      if (editingNews) {
        await updateMutation.mutateAsync({ id: editingNews.id, ...data })
        toast.success('News updated successfully')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('News created successfully')
      }
      setIsEditorOpen(false)
      setEditingNews(null)
    } catch (error) {
      console.error('Error saving news:', error)
      toast.error('Failed to save news')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('News deleted successfully')
    } catch (error) {
      console.error('Error deleting news:', error)
      toast.error('Failed to delete news')
    }
  }

  const getStatusBadge = (status: News['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500">Pending Approval</Badge>
      case 'published':
        return <Badge className="bg-green-500">Published</Badge>
    }
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container max-w-7xl mx-auto py-8 px-4">
          <CardSkeleton count={3} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <main className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-title-lg mb-2">My News</h1>
            <p className="text-body text-muted-foreground">
              Manage your news articles
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create News
          </Button>
        </div>

        {isLoading ? (
          <CardSkeleton count={3} />
        ) : myNews.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No news articles yet</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First News
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {myNews.map((news) => (
              <Card key={news.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{news.title}</h3>
                      {getStatusBadge(news.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Category: {news.category}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {news.tags.length > 0 && `Tags: ${news.tags.join(', ')}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Created: {new Date(news.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {news.status === 'published' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/news/${news.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {news.status !== 'published' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(news)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {news.status !== 'published' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(news.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Editor Dialog */}
        <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingNews ? 'Edit News' : 'Create News'}
              </DialogTitle>
            </DialogHeader>
            <ContentEditor
              type="news"
              initialData={editingNews || undefined}
              onSave={handleSave}
              onCancel={() => setIsEditorOpen(false)}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
