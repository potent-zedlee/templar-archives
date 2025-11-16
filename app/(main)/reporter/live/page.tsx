"use client"

/**
 * Reporter Live Reports Management Page
 *
 * Reporter가 라이브 리포팅을 작성/관리하는 페이지
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Edit, Trash2, Eye } from "lucide-react"
import { useMyLiveReportsQuery, useCreateLiveReportMutation, useUpdateLiveReportMutation, useDeleteLiveReportMutation, type LiveReport } from "@/lib/queries/live-reports-queries"
import { ContentEditor } from "@/components/reporter/content-editor"
import { toast } from "sonner"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { isReporterOrAdmin } from "@/lib/admin"
import { useAuth } from "@/components/auth-provider"

export default function ReporterLivePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingReport, setEditingReport] = useState<LiveReport | null>(null)

  const { data: myReports = [], isLoading } = useMyLiveReportsQuery()
  const createMutation = useCreateLiveReportMutation()
  const updateMutation = useUpdateLiveReportMutation()
  const deleteMutation = useDeleteLiveReportMutation()

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
    setEditingReport(null)
    setIsEditorOpen(true)
  }

  const handleEdit = (report: LiveReport) => {
    setEditingReport(report)
    setIsEditorOpen(true)
  }

  const handleSave = async (data: any) => {
    try {
      if (editingReport) {
        await updateMutation.mutateAsync({ id: editingReport.id, ...data })
        toast.success('Live report updated successfully')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('Live report created successfully')
      }
      setIsEditorOpen(false)
      setEditingReport(null)
    } catch (error) {
      console.error('Error saving live report:', error)
      toast.error('Failed to save live report')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this live report?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Live report deleted successfully')
    } catch (error) {
      console.error('Error deleting live report:', error)
      toast.error('Failed to delete live report')
    }
  }

  const getStatusBadge = (status: LiveReport['status']) => {
    switch (status) {
      case 'draft':
        return <span className="px-2 py-1 border border-black-400 text-xs uppercase">Draft</span>
      case 'pending':
        return <span className="px-2 py-1 border border-gold-600 bg-gold-700/20 text-xs uppercase">Pending Approval</span>
      case 'published':
        return (
          <span className="px-2 py-1 border border-gold-500 bg-gold-500/20 text-xs uppercase flex items-center gap-1">
            <span className="w-2 h-2 bg-gold-400 rounded-full animate-pulse"></span>
            LIVE
          </span>
        )
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
            <h1 className="text-heading text-2xl mb-2">MY LIVE REPORTS</h1>
            <p className="text-black-600">
              Manage your live reporting articles
            </p>
          </div>
          <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Live Report
          </button>
        </div>

        {isLoading ? (
          <CardSkeleton count={3} />
        ) : myReports.length === 0 ? (
          <div className="card-postmodern p-12 text-center">
            <p className="text-black-600 mb-4">No live reports yet</p>
            <button onClick={handleCreate} className="btn-primary inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Live Report
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {myReports.map((report) => (
              <div key={report.id} className="card-postmodern p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{report.title}</h3>
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-sm text-black-600 mb-2">
                      Category: {report.category}
                    </p>
                    <p className="text-sm text-black-600">
                      {report.tags.length > 0 && `Tags: ${report.tags.join(', ')}`}
                    </p>
                    <p className="text-xs text-black-600 mt-2 font-mono">
                      Created: {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {report.status === 'published' && (
                      <button
                        onClick={() => router.push(`/live-reporting/${report.id}`)}
                        className="btn-ghost"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {report.status !== 'published' && (
                      <button
                        onClick={() => handleEdit(report)}
                        className="btn-ghost"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {report.status !== 'published' && (
                      <button
                        onClick={() => handleDelete(report.id)}
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
                  {editingReport ? 'EDIT LIVE REPORT' : 'CREATE LIVE REPORT'}
                </h2>
              </div>
              <div className="p-6">
                <ContentEditor
                  type="live_report"
                  initialData={editingReport || undefined}
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
