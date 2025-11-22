"use client"

/**
 * Reporter News Management Page
 *
 * Reporter가 뉴스를 작성/관리하는 페이지
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Edit, Trash2, Eye } from "lucide-react"
import { useMyNewsQuery, useCreateNewsMutation, useUpdateNewsMutation, useDeleteNewsMutation, type News } from "@/lib/queries/news-queries"
import { ContentEditor } from "@/components/reporter/ContentEditor"
import { toast } from "sonner"
import { CardSkeleton } from "@/components/skeletons/CardSkeleton"
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
        return <span className="px-2 py-1 border border-black-400 text-xs uppercase">Draft</span>
      case 'pending':
        return <span className="px-2 py-1 border border-gold-600 bg-gold-700/20 text-xs uppercase">Pending Approval</span>
      case 'published':
        return <span className="px-2 py-1 border border-gold-500 bg-gold-500/20 text-xs uppercase">Published</span>
    }
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-black-100">
        <div className="container max-w-7xl mx-auto py-8 px-4">
          <CardSkeleton count={3} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black-100">
      <main className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-heading text-2xl mb-2">MY NEWS</h1>
            <p className="text-black-600">
              Manage your news articles
            </p>
          </div>
          <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create News
          </button>
        </div>

        {isLoading ? (
          <CardSkeleton count={3} />
        ) : myNews.length === 0 ? (
          <div className="card-postmodern p-12 text-center">
            <p className="text-black-600 mb-4">No news articles yet</p>
            <button onClick={handleCreate} className="btn-primary inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Your First News
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {myNews.map((news) => (
              <div key={news.id} className="card-postmodern p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{news.title}</h3>
                      {getStatusBadge(news.status)}
                    </div>
                    <p className="text-sm text-black-600 mb-2">
                      Category: {news.category}
                    </p>
                    <p className="text-sm text-black-600">
                      {news.tags.length > 0 && `Tags: ${news.tags.join(', ')}`}
                    </p>
                    <p className="text-xs text-black-600 mt-2 font-mono">
                      Created: {new Date(news.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {news.status === 'published' && (
                      <button
                        onClick={() => router.push(`/news/${news.id}`)}
                        className="btn-ghost"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {news.status !== 'published' && (
                      <button
                        onClick={() => handleEdit(news)}
                        className="btn-ghost"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {news.status !== 'published' && (
                      <button
                        onClick={() => handleDelete(news.id)}
                        className="btn-ghost text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Editor Dialog - keeping shadcn Dialog for complex modal */}
        {isEditorOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="card-postmodern max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b-2 border-black-300">
                <h2 className="text-heading text-xl">
                  {editingNews ? 'EDIT NEWS' : 'CREATE NEWS'}
                </h2>
              </div>
              <div className="p-6">
                <ContentEditor
                  type="news"
                  initialData={editingNews || undefined}
                  onSave={handleSave}
                  onCancel={() => setIsEditorOpen(false)}
                  isLoading={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
