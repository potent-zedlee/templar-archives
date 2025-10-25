"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
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
import { useAuth } from "@/components/auth-provider"
import { type EditRequestStatus } from "@/lib/hand-edit-requests"
import { Clock, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { useUserEditRequestsQuery } from "@/lib/queries/edit-requests-queries"

const EDIT_TYPE_LABELS: Record<string, string> = {
  "basic_info": "기본 정보",
  "board": "보드 & 팟",
  "players": "플레이어",
  "actions": "액션"
}

export default function EditRequestsClient() {
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "rejected">("all")

  // React Query hook
  const statusFilter: EditRequestStatus | undefined = activeTab === "all" ? undefined : activeTab as EditRequestStatus
  const { data: requests = [], isLoading: loading } = useUserEditRequestsQuery(
    user?.id || "",
    statusFilter
  )

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
    }
  }, [user, router])

  function getStatusBadge(status: string) {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            대기 중
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            승인됨
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            거부됨
          </Badge>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container max-w-7xl mx-auto py-8 px-4">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-title-lg mb-2">내 수정 제안</h1>
          <p className="text-body text-muted-foreground">
            제출한 핸드 수정 제안 내역을 확인하세요
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="pending">
              대기 중
              {requests.filter(r => r.status === "pending").length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {requests.filter(r => r.status === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">승인됨</TabsTrigger>
            <TabsTrigger value="rejected">거부됨</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {requests.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="text-title mb-2">수정 제안이 없습니다</h3>
                <p className="text-body text-muted-foreground mb-6">
                  핸드 상세 페이지에서 수정이 필요한 내용을 제안할 수 있습니다
                </p>
              </Card>
            ) : (
              <Card className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>핸드</TableHead>
                      <TableHead>수정 유형</TableHead>
                      <TableHead>제출 날짜</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>검토 날짜</TableHead>
                      <TableHead>액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              #{(request as any).hand?.number}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {(request as any).hand?.day?.sub_event?.tournament?.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {EDIT_TYPE_LABELS[request.edit_type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(request.created_at).toLocaleDateString("ko-KR")}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell>
                          {request.reviewed_at
                            ? new Date(request.reviewed_at).toLocaleDateString("ko-KR")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/archive?hand=${request.hand_id}`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            핸드 보기
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Admin comment for rejected/approved requests */}
                {requests.some(r => (r.status !== "pending" && r.admin_comment)) && (
                  <div className="mt-6 space-y-3">
                    <h3 className="text-sm font-semibold">관리자 코멘트</h3>
                    {requests
                      .filter(r => r.status !== "pending" && r.admin_comment)
                      .map(r => (
                        <Card key={r.id} className="p-4 bg-muted/30">
                          <div className="flex items-start gap-3">
                            <Badge variant="outline">#{(r as any).hand?.number}</Badge>
                            <div className="flex-1 text-sm">
                              <p className="text-muted-foreground">{r.admin_comment}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(r.reviewed_at!).toLocaleString("ko-KR")}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                )}
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
