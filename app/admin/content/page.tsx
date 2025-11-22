"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
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

  // Tabs state
  const [activeTab, setActiveTab] = useState<"reports" | "news" | "live-reports" | "posts" | "comments">("reports")

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

  const pendingReportsCount = reports.filter((r) => r.status === "pending").length

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-title-lg mb-2">Content Management</h1>
        <p className="text-body text-muted-foreground">
          Manage posts, comments and reports
        </p>
      </div>

      {/* Custom Tabs */}
      <div className="space-y-6">
        {/* Tab List */}
        <div className="border-b border-border">
          <nav className="flex gap-6 -mb-px" aria-label="Content tabs">
            <button
              onClick={() => setActiveTab("reports")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "reports"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              aria-current={activeTab === "reports" ? "page" : undefined}
            >
              Report Management
              {pendingReportsCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-destructive text-destructive-foreground">
                  {pendingReportsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("news")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "news"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              aria-current={activeTab === "news" ? "page" : undefined}
            >
              News Approval
              {pendingNews.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-destructive text-destructive-foreground">
                  {pendingNews.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("live-reports")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "live-reports"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              aria-current={activeTab === "live-reports" ? "page" : undefined}
            >
              Live Reports Approval
              {pendingLiveReports.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-destructive text-destructive-foreground">
                  {pendingLiveReports.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("posts")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "posts"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              aria-current={activeTab === "posts" ? "page" : undefined}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab("comments")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "comments"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              aria-current={activeTab === "comments" ? "page" : undefined}
            >
              Comment
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "reports" && (
          <ReportsTab reports={reports} onReview={setSelectedReport} />
        )}

        {activeTab === "news" && (
          <NewsApprovalTab pendingNews={pendingNews} onReview={setSelectedNews} />
        )}

        {activeTab === "live-reports" && (
          <LiveReportsApprovalTab
            pendingLiveReports={pendingLiveReports}
            onReview={setSelectedLiveReport}
          />
        )}

        {activeTab === "posts" && (
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
        )}

        {activeTab === "comments" && (
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
        )}
      </div>

      <ReportDetailDialog
        report={selectedReport}
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        onApprove={handleApproveReport}
        onReject={handleRejectReport}
      />

      {/* Content Action Dialog */}
      {actionDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setActionDialog(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="action-dialog-title"
        >
          <div
            className="bg-background rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="action-dialog-title" className="text-xl font-semibold mb-2">
              {actionDialog.type === "delete" ? "Delete Confirmation" : "Action Confirmation"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {actionDialog.type === "delete"
                ? "This action cannot be undone."
                : "Change the status of selected content."}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setActionDialog(null)}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContentAction}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  actionDialog.type === "delete"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {actionDialog.type === "hide" && "Hide"}
                {actionDialog.type === "unhide" && "Show"}
                {actionDialog.type === "delete" && "Delete"}
              </button>
            </div>
          </div>
        </div>
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
