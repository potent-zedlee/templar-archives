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
import {
  fetchAllPosts,
  fetchAllComments,
  fetchReports,
  approveReport,
  rejectReport,
  hideContent,
  unhideContent,
  deleteContent,
  type Report
} from "@/lib/content-moderation"
import { Eye, EyeOff, Trash2, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function contentClient() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [adminComment, setAdminComment] = useState("")
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: "approve" | "reject" | "hide" | "unhide" | "delete"
    targetId: string
    targetType: "post" | "comment" | "report"
  } | null>(null)

  useEffect(() => {
    async function checkAdminAndLoadData() {
      if (!user) {
        router.push("/auth/login")
        return
      }

      const adminStatus = await isAdmin(user.id)
      if (!adminStatus) {
        router.push("/")
        return
      }

      await loadData()
      setLoading(false)
    }

    checkAdminAndLoadData()
  }, [user, router])

  async function loadData() {
    try {
      const [postsData, commentsData, reportsData] = await Promise.all([
        fetchAllPosts({ includeHidden: true }),
        fetchAllComments({ includeHidden: true }),
        fetchReports()
      ])

      setPosts(postsData)
      setComments(commentsData)
      setReports(reportsData)
    } catch (error) {
      console.error("Error loading data:", error)
    }
  }

  async function handleApproveReport() {
    if (!selectedReport || !user) return

    try {
      await approveReport({
        reportId: selectedReport.id,
        adminId: user.id,
        adminComment
      })

      setSelectedReport(null)
      setAdminComment("")
      await loadData()
    } catch (error) {
      console.error("Error approving report:", error)
    }
  }

  async function handleRejectReport() {
    if (!selectedReport || !user) return

    try {
      await rejectReport({
        reportId: selectedReport.id,
        adminId: user.id,
        adminComment
      })

      setSelectedReport(null)
      setAdminComment("")
      await loadData()
    } catch (error) {
      console.error("Error rejecting report:", error)
    }
  }

  async function handleContentAction() {
    if (!actionDialog) return

    try {
      const { type, targetId, targetType } = actionDialog

      if (type === "hide") {
        await hideContent(
          targetType === "post" ? { postId: targetId } : { commentId: targetId }
        )
      } else if (type === "unhide") {
        await unhideContent(
          targetType === "post" ? { postId: targetId } : { commentId: targetId }
        )
      } else if (type === "delete") {
        await deleteContent(
          targetType === "post" ? { postId: targetId } : { commentId: targetId }
        )
      }

      setActionDialog(null)
      await loadData()
    } catch (error) {
      console.error("Error performing action:", error)
    }
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
      </div>
    </div>
  )
}
