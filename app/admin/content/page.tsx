"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/components/auth-provider"
import { isAdmin } from "@/lib/admin"
import { type Report } from "@/lib/content-moderation"
import {
  useAllPostsQuery,
  useAllCommentsQuery,
  useReportsQuery,
  useApproveReportMutation,
  useRejectReportMutation,
  useHideContentMutation,
  useUnhideContentMutation,
  useDeleteContentMutation,
} from "@/lib/queries/admin-queries"
import {
  usePendingNewsQuery,
  useApproveNewsMutation,
  useRejectNewsMutation,
  type News,
} from "@/lib/queries/news-queries"
import {
  usePendingLiveReportsQuery,
  useApproveLiveReportMutation,
  useRejectLiveReportMutation,
  type LiveReport,
} from "@/lib/queries/live-reports-queries"
import { ReportsTab } from "@/components/admin/content/ReportsTab"
import { NewsApprovalTab } from "@/components/admin/content/NewsApprovalTab"
import { LiveReportsApprovalTab } from "@/components/admin/content/LiveReportsApprovalTab"
import { PostsTab } from "@/components/admin/content/PostsTab"
import { CommentsTab } from "@/components/admin/content/CommentsTab"
import { ReportDetailDialog } from "@/components/admin/content/ReportDetailDialog"
import { NewsPreviewDialog } from "@/components/admin/content/NewsPreviewDialog"
import { LiveReportPreviewDialog } from "@/components/admin/content/LiveReportPreviewDialog"

export default function ContentPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [selectedNews, setSelectedNews] = useState<News | null>(null)
  const [selectedLiveReport, setSelectedLiveReport] = useState<LiveReport | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: "hide" | "unhide" | "delete"
    targetId: string
    targetType: "post" | "comment"
  } | null>(null)

  // React Query hooks
  const { data: posts = [], isLoading: postsLoading } = useAllPostsQuery(true)
  const { data: comments = [], isLoading: commentsLoading } = useAllCommentsQuery(true)
  const { data: reports = [], isLoading: reportsLoading } = useReportsQuery()
  const { data: pendingNews = [], isLoading: newsLoading } = usePendingNewsQuery()
  const { data: pendingLiveReports = [], isLoading: liveReportsLoading } =
    usePendingLiveReportsQuery()

  const approveReportMutation = useApproveReportMutation()
  const rejectReportMutation = useRejectReportMutation()
  const hideContentMutation = useHideContentMutation()
  const unhideContentMutation = useUnhideContentMutation()
  const deleteContentMutation = useDeleteContentMutation()
  const approveNewsMutation = useApproveNewsMutation()
  const rejectNewsMutation = useRejectNewsMutation()
  const approveLiveReportMutation = useApproveLiveReportMutation()
  const rejectLiveReportMutation = useRejectLiveReportMutation()

  const loading =
    postsLoading || commentsLoading || reportsLoading || newsLoading || liveReportsLoading

  useEffect(() => {
    async function checkAdminAccess() {
      if (authLoading) return

      if (!user) {
        router.push("/auth/login")
        return
      }

      const adminStatus = await isAdmin(user.id)
      if (!adminStatus) {
        router.push("/")
        return
      }
    }

    checkAdminAccess()
  }, [user, authLoading, router])

  // Handler functions
  function handleApproveReport(comment: string) {
    if (!selectedReport || !user) return

    approveReportMutation.mutate(
      { reportId: selectedReport.id, adminId: user.id, adminComment: comment },
      {
        onSuccess: () => setSelectedReport(null),
        onError: (error) => console.error("Error approving report:", error),
      }
    )
  }

  function handleRejectReport(comment: string) {
    if (!selectedReport || !user) return

    rejectReportMutation.mutate(
      { reportId: selectedReport.id, adminId: user.id, adminComment: comment },
      {
        onSuccess: () => setSelectedReport(null),
        onError: (error) => console.error("Error rejecting report:", error),
      }
    )
  }

  function handleApproveNews() {
    if (!selectedNews) return

    approveNewsMutation.mutate(selectedNews.id, {
      onSuccess: () => setSelectedNews(null),
      onError: (error) => console.error("Error approving news:", error),
    })
  }

  function handleRejectNews() {
    if (!selectedNews) return

    rejectNewsMutation.mutate(selectedNews.id, {
      onSuccess: () => setSelectedNews(null),
      onError: (error) => console.error("Error rejecting news:", error),
    })
  }

  function handleApproveLiveReport() {
    if (!selectedLiveReport) return

    approveLiveReportMutation.mutate(selectedLiveReport.id, {
      onSuccess: () => setSelectedLiveReport(null),
      onError: (error) => console.error("Error approving live report:", error),
    })
  }

  function handleRejectLiveReport() {
    if (!selectedLiveReport) return

    rejectLiveReportMutation.mutate(selectedLiveReport.id, {
      onSuccess: () => setSelectedLiveReport(null),
      onError: (error) => console.error("Error rejecting live report:", error),
    })
  }

  function handleContentAction() {
    if (!actionDialog) return

    const { type, targetId, targetType } = actionDialog
    const params = targetType === "post" ? { postId: targetId } : { commentId: targetId }

    if (type === "hide") {
      hideContentMutation.mutate(params, {
        onSuccess: () => setActionDialog(null),
        onError: (error) => console.error("Error hiding content:", error),
      })
    } else if (type === "unhide") {
      unhideContentMutation.mutate(params, {
        onSuccess: () => setActionDialog(null),
        onError: (error) => console.error("Error unhiding content:", error),
      })
    } else if (type === "delete") {
      deleteContentMutation.mutate(params, {
        onSuccess: () => setActionDialog(null),
        onError: (error) => console.error("Error deleting content:", error),
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-title-lg mb-2">Content Management</h1>
        <p className="text-body text-muted-foreground">
          Manage posts, comments and reports
        </p>
      </div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reports">
            Report Management
            {reports.filter((r) => r.status === "pending").length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {reports.filter((r) => r.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="news">
            News Approval
            {pendingNews.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingNews.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="live-reports">
            Live Reports Approval
            {pendingLiveReports.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingLiveReports.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="comments">Comment</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <ReportsTab reports={reports} onReview={setSelectedReport} />
        </TabsContent>

        <TabsContent value="news">
          <NewsApprovalTab pendingNews={pendingNews} onReview={setSelectedNews} />
        </TabsContent>

        <TabsContent value="live-reports">
          <LiveReportsApprovalTab
            pendingLiveReports={pendingLiveReports}
            onReview={setSelectedLiveReport}
          />
        </TabsContent>

        <TabsContent value="posts">
          <PostsTab
            posts={posts as any}
            onHide={(postId) =>
              setActionDialog({ open: true, type: "hide", targetId: postId, targetType: "post" })
            }
            onUnhide={(postId) =>
              setActionDialog({
                open: true,
                type: "unhide",
                targetId: postId,
                targetType: "post",
              })
            }
            onDelete={(postId) =>
              setActionDialog({
                open: true,
                type: "delete",
                targetId: postId,
                targetType: "post",
              })
            }
          />
        </TabsContent>

        <TabsContent value="comments">
          <CommentsTab
            comments={comments as any}
            onHide={(commentId) =>
              setActionDialog({
                open: true,
                type: "hide",
                targetId: commentId,
                targetType: "comment",
              })
            }
            onUnhide={(commentId) =>
              setActionDialog({
                open: true,
                type: "unhide",
                targetId: commentId,
                targetType: "comment",
              })
            }
            onDelete={(commentId) =>
              setActionDialog({
                open: true,
                type: "delete",
                targetId: commentId,
                targetType: "comment",
              })
            }
          />
        </TabsContent>
      </Tabs>

      <ReportDetailDialog
        report={selectedReport}
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        onApprove={handleApproveReport}
        onReject={handleRejectReport}
      />

      {/* Content Action Dialog */}
      {actionDialog && (
        <Dialog open={actionDialog.open} onOpenChange={() => setActionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog.type === "delete" ? "Delete Confirmation" : "Action Confirmation"}
              </DialogTitle>
              <DialogDescription>
                {actionDialog.type === "delete"
                  ? "This action cannot be undone."
                  : "Change the status of selected content."}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog(null)}>
                Cancel
              </Button>
              <Button
                variant={actionDialog.type === "delete" ? "destructive" : "default"}
                onClick={handleContentAction}
              >
                {actionDialog.type === "hide" && "Hide"}
                {actionDialog.type === "unhide" && "Show"}
                {actionDialog.type === "delete" && "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <NewsPreviewDialog
        news={selectedNews}
        open={!!selectedNews}
        onClose={() => setSelectedNews(null)}
        onApprove={handleApproveNews}
        onReject={handleRejectNews}
      />

      <LiveReportPreviewDialog
        liveReport={selectedLiveReport}
        open={!!selectedLiveReport}
        onClose={() => setSelectedLiveReport(null)}
        onApprove={handleApproveLiveReport}
        onReject={handleRejectLiveReport}
      />
    </div>
  )
}
