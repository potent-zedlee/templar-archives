"use client"

/**
 * Reporter Live Reports Management Page
 *
 * Reporter가 라이브 리포팅을 작성/관리하는 페이지
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
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
        <Header />
        <div className="container max-w-7xl mx-auto py-8 px-4">
          <CardSkeleton count={3} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <main className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-title-lg mb-2">My Live Reports</h1>
            <p className="text-body text-muted-foreground">
              Manage your live reporting articles
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Live Report
          </Button>
        </div>

        {isLoading ? (
          <CardSkeleton count={3} />
        ) : myReports.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No live reports yet</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Live Report
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {myReports.map((report) => (
              <Card key={report.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{report.title}</h3>
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Category: {report.category}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {report.tags.length > 0 && `Tags: ${report.tags.join(', ')}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Created: {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {report.status === 'published' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/live-reporting/${report.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {report.status !== 'published' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(report)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {report.status !== 'published' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(report.id)}
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
                {editingReport ? 'Edit Live Report' : 'Create Live Report'}
              </DialogTitle>
            </DialogHeader>
            <ContentEditor
              type="live_report"
              initialData={editingReport || undefined}
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
