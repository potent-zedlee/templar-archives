"use client"


import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
import { Eye, EyeOff, Trash2, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function contentClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [selectedNews, setSelectedNews] = useState<News | null>(null)
  const [selectedLiveReport, setSelectedLiveReport] = useState<LiveReport | null>(null)
  const [adminComment, setAdminComment] = useState("")
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: "approve" | "reject" | "hide" | "unhide" | "delete"
    targetId: string
    targetType: "post" | "comment" | "report"
  } | null>(null)

  // React Query hooks
  const { data: posts = [], isLoading: postsLoading } = useAllPostsQuery(true)
  const { data: comments = [], isLoading: commentsLoading } = useAllCommentsQuery(true)
  const { data: reports = [], isLoading: reportsLoading } = useReportsQuery()
  const { data: pendingNews = [], isLoading: newsLoading } = usePendingNewsQuery()
  const { data: pendingLiveReports = [], isLoading: liveReportsLoading } = usePendingLiveReportsQuery()

  const approveReportMutation = useApproveReportMutation()
  const rejectReportMutation = useRejectReportMutation()
  const hideContentMutation = useHideContentMutation()
  const unhideContentMutation = useUnhideContentMutation()
  const deleteContentMutation = useDeleteContentMutation()
  const approveNewsMutation = useApproveNewsMutation()
  const rejectNewsMutation = useRejectNewsMutation()
  const approveLiveReportMutation = useApproveLiveReportMutation()
  const rejectLiveReportMutation = useRejectLiveReportMutation()

  const loading = postsLoading || commentsLoading || reportsLoading || newsLoading || liveReportsLoading

  useEffect(() => {
    async function checkAdminAccess() {
      // Wait for auth loading to complete
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

  function handleApproveReport() {
    if (!selectedReport || !user) return

    approveReportMutation.mutate(
      {
        reportId: selectedReport.id,
        adminId: user.id,
        adminComment,
      },
      {
        onSuccess: () => {
          setSelectedReport(null)
          setAdminComment("")
        },
        onError: (error) => {
          console.error("Error approving report:", error)
        },
      }
    )
  }

  function handleRejectReport() {
    if (!selectedReport || !user) return

    rejectReportMutation.mutate(
      {
        reportId: selectedReport.id,
        adminId: user.id,
        adminComment,
      },
      {
        onSuccess: () => {
          setSelectedReport(null)
          setAdminComment("")
        },
        onError: (error) => {
          console.error("Error rejecting report:", error)
        },
      }
    )
  }

  function handleContentAction() {
    if (!actionDialog) return

    const { type, targetId, targetType } = actionDialog
    const params = targetType === "post" ? { postId: targetId } : { commentId: targetId }

    if (type === "hide") {
      hideContentMutation.mutate(params, {
        onSuccess: () => {
          setActionDialog(null)
        },
        onError: (error) => {
          console.error("Error hiding content:", error)
        },
      })
    } else if (type === "unhide") {
      unhideContentMutation.mutate(params, {
        onSuccess: () => {
          setActionDialog(null)
        },
        onError: (error) => {
          console.error("Error unhiding content:", error)
        },
      })
    } else if (type === "delete") {
      deleteContentMutation.mutate(params, {
        onSuccess: () => {
          setActionDialog(null)
        },
        onError: (error) => {
          console.error("Error deleting content:", error)
        },
      })
    }
  }

  function handleApproveNews() {
    if (!selectedNews || !user) return

    approveNewsMutation.mutate(selectedNews.id, {
      onSuccess: () => {
        setSelectedNews(null)
      },
      onError: (error) => {
        console.error("Error approving news:", error)
      },
    })
  }

  function handleRejectNews() {
    if (!selectedNews || !user) return

    rejectNewsMutation.mutate(selectedNews.id, {
      onSuccess: () => {
        setSelectedNews(null)
      },
      onError: (error) => {
        console.error("Error rejecting news:", error)
      },
    })
  }

  function handleApproveLiveReport() {
    if (!selectedLiveReport || !user) return

    approveLiveReportMutation.mutate(selectedLiveReport.id, {
      onSuccess: () => {
        setSelectedLiveReport(null)
      },
      onError: (error) => {
        console.error("Error approving live report:", error)
      },
    })
  }

  function handleRejectLiveReport() {
    if (!selectedLiveReport || !user) return

    rejectLiveReportMutation.mutate(selectedLiveReport.id, {
      onSuccess: () => {
        setSelectedLiveReport(null)
      },
      onError: (error) => {
        console.error("Error rejecting live report:", error)
      },
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header />
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
            {reports.filter(r => r.status === "pending").length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {reports.filter(r => r.status === "pending").length}
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

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Report Reason</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {report.post_id ? "Posts" : "Comment"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {report.post_id
                        ? (report as any).post?.title
                        : (report as any).comment?.content}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{report.reason}</Badge>
                    </TableCell>
                    <TableCell>{report.reporter_name}</TableCell>
                    <TableCell>
                      {report.status === "pending" && (
                        <Badge variant="outline">Pending</Badge>
                      )}
                      {report.status === "approved" && (
                        <Badge variant="destructive">Approved</Badge>
                      )}
                      {report.status === "rejected" && (
                        <Badge variant="secondary">Rejected</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(report.created_at).toLocaleDateString("ko-KR")}
                    </TableCell>
                    <TableCell>
                      {report.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedReport(report)}
                        >
                          Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* News Approval Tab */}
        <TabsContent value="news">
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
                        {new Date(news.created_at).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedNews(news)}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Live Reports Approval Tab */}
        <TabsContent value="live-reports">
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
                {pendingLiveReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No pending live reports
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingLiveReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="max-w-sm truncate">{report.title}</TableCell>
                      <TableCell>{report.author?.nickname || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(report.created_at).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedLiveReport(report)}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts">
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
                      {new Date(post.created_at).toLocaleDateString("ko-KR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {post.is_hidden ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                type: "unhide",
                                targetId: post.id,
                                targetType: "post"
                              })
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                type: "hide",
                                targetId: post.id,
                                targetType: "post"
                              })
                            }
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setActionDialog({
                              open: true,
                              type: "delete",
                              targetId: post.id,
                              targetType: "post"
                            })
                          }
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
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments">
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
                      {(comment as any).post?.title || "-"}
                    </TableCell>
                    <TableCell>
                      {comment.is_hidden ? (
                        <Badge variant="destructive">Hidden</Badge>
                      ) : (
                        <Badge variant="default">Public</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(comment.created_at).toLocaleDateString("ko-KR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {comment.is_hidden ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                type: "unhide",
                                targetId: comment.id,
                                targetType: "comment"
                              })
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                type: "hide",
                                targetId: comment.id,
                                targetType: "comment"
                              })
                            }
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setActionDialog({
                              open: true,
                              type: "delete",
                              targetId: comment.id,
                              targetType: "comment"
                            })
                          }
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
        </TabsContent>
      </Tabs>

      {/* Report Review Dialog */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Report</DialogTitle>
              <DialogDescription>
                Review the report and approve or reject it
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Badge variant="outline" className="mt-1">
                  {selectedReport.post_id ? "Posts" : "Comment"}
                </Badge>
              </div>

              <div>
                <Label>Content</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedReport.post_id
                    ? (selectedReport as any).post?.title
                    : (selectedReport as any).comment?.content}
                </p>
              </div>

              <div>
                <Label>Report Reason</Label>
                <Badge variant="secondary" className="mt-1">
                  {selectedReport.reason}
                </Badge>
              </div>

              {selectedReport.description && (
                <div>
                  <Label>Description</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedReport.description}
                  </p>
                </div>
              )}

              <div>
                <Label>Reporter</Label>
                <p className="mt-1 text-sm">{selectedReport.reporter_name}</p>
              </div>

              <div>
                <Label htmlFor="admin-comment">Admin Comment (Optional)</Label>
                <Textarea
                  id="admin-comment"
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder="Comments on the review..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedReport(null)
                  setAdminComment("")
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleApproveReport}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve (Content Hidden)
              </Button>
              <Button
                variant="secondary"
                onClick={handleRejectReport}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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

      {/* News Review Dialog */}
      {selectedNews && (
        <Dialog open={!!selectedNews} onOpenChange={() => setSelectedNews(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review News Article</DialogTitle>
              <DialogDescription>
                Review the news article and approve or reject it
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <p className="mt-1 font-semibold">{selectedNews.title}</p>
              </div>

              <div>
                <Label>Category</Label>
                <Badge variant="outline" className="mt-1">
                  {selectedNews.category}
                </Badge>
              </div>

              {selectedNews.tags.length > 0 && (
                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedNews.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedNews.thumbnail_url && (
                <div>
                  <Label>Thumbnail</Label>
                  <img
                    src={selectedNews.thumbnail_url}
                    alt="Thumbnail"
                    className="mt-1 rounded-lg max-h-48 object-cover"
                  />
                </div>
              )}

              <div>
                <Label>Content</Label>
                <div className="mt-1 p-4 border rounded-lg bg-muted/50 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm">{selectedNews.content}</pre>
                </div>
              </div>

              {selectedNews.external_link && (
                <div>
                  <Label>External Link</Label>
                  <a
                    href={selectedNews.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-sm text-blue-500 hover:underline block"
                  >
                    {selectedNews.external_link}
                  </a>
                </div>
              )}

              <div>
                <Label>Author</Label>
                <p className="mt-1 text-sm">{selectedNews.author?.nickname || 'Unknown'}</p>
              </div>

              <div>
                <Label>Created</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(selectedNews.created_at).toLocaleString("ko-KR")}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedNews(null)}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleRejectNews}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject (Back to Draft)
              </Button>
              <Button
                variant="default"
                onClick={handleApproveNews}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve & Publish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Live Report Review Dialog */}
      {selectedLiveReport && (
        <Dialog open={!!selectedLiveReport} onOpenChange={() => setSelectedLiveReport(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Live Report</DialogTitle>
              <DialogDescription>
                Review the live report and approve or reject it
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <p className="mt-1 font-semibold">{selectedLiveReport.title}</p>
              </div>

              <div>
                <Label>Category</Label>
                <Badge variant="outline" className="mt-1">
                  {selectedLiveReport.category}
                </Badge>
              </div>

              {selectedLiveReport.tags.length > 0 && (
                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedLiveReport.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedLiveReport.thumbnail_url && (
                <div>
                  <Label>Thumbnail</Label>
                  <img
                    src={selectedLiveReport.thumbnail_url}
                    alt="Thumbnail"
                    className="mt-1 rounded-lg max-h-48 object-cover"
                  />
                </div>
              )}

              <div>
                <Label>Content</Label>
                <div className="mt-1 p-4 border rounded-lg bg-muted/50 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm">{selectedLiveReport.content}</pre>
                </div>
              </div>

              {selectedLiveReport.external_link && (
                <div>
                  <Label>External Link</Label>
                  <a
                    href={selectedLiveReport.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-sm text-blue-500 hover:underline block"
                  >
                    {selectedLiveReport.external_link}
                  </a>
                </div>
              )}

              <div>
                <Label>Author</Label>
                <p className="mt-1 text-sm">{selectedLiveReport.author?.nickname || 'Unknown'}</p>
              </div>

              <div>
                <Label>Created</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(selectedLiveReport.created_at).toLocaleString("ko-KR")}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedLiveReport(null)}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleRejectLiveReport}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject (Back to Draft)
              </Button>
              <Button
                variant="default"
                onClick={handleApproveLiveReport}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve & Publish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </div>
  )
}
