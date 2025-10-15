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
  fetchEditRequests,
  approveEditRequest,
  rejectEditRequest,
  type HandEditRequest
} from "@/lib/hand-edit-requests"
import { Clock, CheckCircle, XCircle, FileEdit } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

const EDIT_TYPE_LABELS: Record<string, string> = {
  "basic_info": "기본 정보",
  "board": "보드 & 팟",
  "players": "플레이어",
  "actions": "액션"
}

export default function AdminEditRequestsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<HandEditRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<HandEditRequest | null>(null)
  const [adminComment, setAdminComment] = useState("")
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)
  const [submitting, setSubmitting] = useState(false)

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

      await loadRequests()
      setLoading(false)
    }

    checkAdminAndLoadData()
  }, [user, router])

  async function loadRequests() {
    try {
      const data = await fetchEditRequests()
      setRequests(data)
    } catch (error) {
      console.error("Error loading edit requests:", error)
    }
  }

  function handleReviewClick(request: HandEditRequest, action: "approve" | "reject") {
    setSelectedRequest(request)
    setActionType(action)
    setAdminComment("")
  }

  async function handleSubmitReview() {
    if (!selectedRequest || !user || !actionType) return

    setSubmitting(true)
    try {
      if (actionType === "approve") {
        await approveEditRequest({
          requestId: selectedRequest.id,
          adminId: user.id,
          adminComment
        })
      } else {
        await rejectEditRequest({
          requestId: selectedRequest.id,
          adminId: user.id,
          adminComment
        })
      }

      setSelectedRequest(null)
      setActionType(null)
      setAdminComment("")
      await loadRequests()
    } catch (error) {
      console.error("Error submitting review:", error)
      alert("검토 처리 중 오류가 발생했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  function getDiffView(request: HandEditRequest) {
    const { original_data, proposed_data } = request

    return (
      <div className="space-y-4">
        {Object.keys(proposed_data).map((key) => {
          const originalValue = original_data[key]
          const proposedValue = proposed_data[key]

          // Handle arrays (players)
          if (Array.isArray(proposedValue)) {
            return (
              <div key={key} className="space-y-2">
                <Label className="text-sm font-semibold">{key}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">원본</div>
                    <div className="space-y-2">
                      {originalValue?.map((item: any, i: number) => (
                        <Card key={i} className="p-2 bg-red-50 dark:bg-red-950/20 text-xs">
                          {JSON.stringify(item, null, 2)}
                        </Card>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">수정</div>
                    <div className="space-y-2">
                      {proposedValue.map((item: any, i: number) => (
                        <Card key={i} className="p-2 bg-green-50 dark:bg-green-950/20 text-xs">
                          {JSON.stringify(item, null, 2)}
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          // Handle simple values
          if (originalValue !== proposedValue) {
            return (
              <div key={key} className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">{key} (원본)</Label>
                  <div className="mt-1 p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm line-through">
                    {String(originalValue || "-")}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{key} (수정)</Label>
                  <div className="mt-1 p-2 bg-green-50 dark:bg-green-950/20 rounded text-sm font-semibold">
                    {String(proposedValue || "-")}
                  </div>
                </div>
              </div>
            )
          }

          return null
        })}
      </div>
    )
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

  const pendingRequests = requests.filter(r => r.status === "pending")
  const reviewedRequests = requests.filter(r => r.status !== "pending")

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-title-lg mb-2">핸드 수정 요청 관리</h1>
        <p className="text-body text-muted-foreground">
          유저가 제출한 핸드 수정 요청을 검토하고 승인/거부하세요
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">
            대기 중
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviewed">검토 완료</TabsTrigger>
        </TabsList>

        {/* Pending Requests */}
        <TabsContent value="pending">
          <Card className="p-6">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                대기 중인 수정 요청이 없습니다
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>핸드</TableHead>
                    <TableHead>수정 유형</TableHead>
                    <TableHead>제출자</TableHead>
                    <TableHead>제출 날짜</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            #{(request as any).hand?.number}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {(request as any).hand?.day?.sub_event?.tournament?.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {EDIT_TYPE_LABELS[request.edit_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>{request.requester_name}</TableCell>
                      <TableCell>
                        {new Date(request.created_at).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleReviewClick(request, "approve")}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReviewClick(request, "reject")}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            거부
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Reviewed Requests */}
        <TabsContent value="reviewed">
          <Card className="p-6">
            {reviewedRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                검토 완료된 요청이 없습니다
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>핸드</TableHead>
                    <TableHead>수정 유형</TableHead>
                    <TableHead>제출자</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>검토 날짜</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewedRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Link
                          href={`/archive?hand=${request.hand_id}`}
                          className="font-medium hover:underline"
                        >
                          #{(request as any).hand?.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {EDIT_TYPE_LABELS[request.edit_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>{request.requester_name}</TableCell>
                      <TableCell>
                        {request.status === "approved" ? (
                          <Badge variant="default" className="bg-green-600">승인됨</Badge>
                        ) : (
                          <Badge variant="destructive">거부됨</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {request.reviewed_at
                          ? new Date(request.reviewed_at).toLocaleDateString("ko-KR")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      {selectedRequest && actionType && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                수정 요청 {actionType === "approve" ? "승인" : "거부"}
              </DialogTitle>
              <DialogDescription>
                #{(selectedRequest as any).hand?.number} - {EDIT_TYPE_LABELS[selectedRequest.edit_type]}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">제출자</Label>
                  <p>{selectedRequest.requester_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">제출 날짜</Label>
                  <p>{new Date(selectedRequest.created_at).toLocaleString("ko-KR")}</p>
                </div>
              </div>

              {/* Reason */}
              <div>
                <Label>수정 이유</Label>
                <Card className="mt-1 p-3 bg-muted/30">
                  <p className="text-sm">{selectedRequest.reason}</p>
                </Card>
              </div>

              {/* Diff View */}
              <div>
                <Label className="text-lg font-semibold">변경 사항</Label>
                <div className="mt-3">
                  {getDiffView(selectedRequest)}
                </div>
              </div>

              {/* Admin Comment */}
              <div>
                <Label htmlFor="admin-comment">관리자 코멘트 (선택)</Label>
                <Textarea
                  id="admin-comment"
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder="검토 결과에 대한 설명..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRequest(null)
                  setActionType(null)
                  setAdminComment("")
                }}
                disabled={submitting}
              >
                취소
              </Button>
              <Button
                variant={actionType === "approve" ? "default" : "destructive"}
                onClick={handleSubmitReview}
                disabled={submitting}
              >
                {submitting
                  ? "처리 중..."
                  : actionType === "approve"
                  ? "승인 및 적용"
                  : "거부"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </div>
  )
}
