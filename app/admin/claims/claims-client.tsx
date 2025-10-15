"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, X, ExternalLink, Clock, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { isAdmin } from "@/lib/auth-utils"
import {
  getPendingClaims,
  getAllClaims,
  approvePlayerClaim,
  rejectPlayerClaim,
  type PlayerClaimWithDetails,
} from "@/lib/player-claims"

export default function claimsClient() {
  const { user } = useAuth()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [pendingClaims, setPendingClaims] = useState<PlayerClaimWithDetails[]>([])
  const [allClaims, setAllClaims] = useState<PlayerClaimWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClaim, setSelectedClaim] = useState<PlayerClaimWithDetails | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<"approve" | "reject">("approve")
  const [adminNotes, setAdminNotes] = useState("")
  const [rejectedReason, setRejectedReason] = useState("")
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await (await import("@/lib/supabase")).supabase.auth.getUser()
      setUserEmail(user?.email || null)
    }
    getUser()
  }, [])

  useEffect(() => {
    if (userEmail && !isAdmin(userEmail)) {
      router.push("/")
      toast.error("관리자만 접근할 수 있습니다")
    } else if (userEmail) {
      loadClaims()
    }
  }, [userEmail])

  async function loadClaims() {
    setLoading(true)
    try {
      const [pendingResult, allResult] = await Promise.all([
        getPendingClaims(),
        getAllClaims(),
      ])

      if (pendingResult.error) throw pendingResult.error
      if (allResult.error) throw allResult.error

      setPendingClaims(pendingResult.data)
      setAllClaims(allResult.data)
    } catch (error) {
      console.error("Error loading claims:", error)
      toast.error("클레임 목록을 불러오는데 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  function handleActionClick(claim: PlayerClaimWithDetails, type: "approve" | "reject") {
    setSelectedClaim(claim)
    setActionType(type)
    setActionDialogOpen(true)
    setAdminNotes("")
    setRejectedReason("")
  }

  async function handleAction() {
    if (!selectedClaim || !user) return

    if (actionType === "reject" && !rejectedReason) {
      toast.error("거절 사유를 입력해주세요")
      return
    }

    setProcessing(true)

    try {
      if (actionType === "approve") {
        const { error } = await approvePlayerClaim({
          claimId: selectedClaim.id,
          adminId: user.id,
          adminNotes,
        })

        if (error) throw error

        toast.success("클레임이 승인되었습니다")
      } else {
        const { error } = await rejectPlayerClaim({
          claimId: selectedClaim.id,
          adminId: user.id,
          rejectedReason,
          adminNotes,
        })

        if (error) throw error

        toast.success("클레임이 거절되었습니다")
      }

      setActionDialogOpen(false)
      loadClaims()
    } catch (error) {
      console.error("Error processing claim:", error)
      toast.error("클레임 처리에 실패했습니다")
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            대기 중
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            승인됨
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            거절됨
          </Badge>
        )
      default:
        return null
    }
  }

  const getVerificationMethodLabel = (method: string) => {
    switch (method) {
      case "social_media":
        return "소셜 미디어"
      case "email":
        return "이메일"
      case "admin":
        return "관리자"
      case "other":
        return "기타"
      default:
        return method
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container max-w-7xl mx-auto py-16 text-center">
          <p className="text-body-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="mb-8">
          <h1 className="text-title-lg mb-2">플레이어 클레임 관리</h1>
          <p className="text-body text-muted-foreground">
            플레이어 프로필 클레임 요청을 승인 또는 거절합니다
          </p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              대기 중 ({pendingClaims.length})
            </TabsTrigger>
            <TabsTrigger value="all">전체 ({allClaims.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {pendingClaims.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-body text-muted-foreground">
                  대기 중인 클레임 요청이 없습니다
                </p>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>플레이어</TableHead>
                      <TableHead>요청자</TableHead>
                      <TableHead>인증 방법</TableHead>
                      <TableHead>증빙 자료</TableHead>
                      <TableHead>요청 일시</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingClaims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={claim.player.photo_url} />
                              <AvatarFallback>
                                {claim.player.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{claim.player.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={claim.user.avatar_url} />
                              <AvatarFallback>
                                {claim.user.nickname.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{claim.user.nickname}</p>
                              <p className="text-caption text-muted-foreground">
                                {claim.user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getVerificationMethodLabel(claim.verification_method)}
                        </TableCell>
                        <TableCell>
                          {claim.verification_data?.social_media_url && (
                            <a
                              href={claim.verification_data.social_media_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              링크 보기
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {claim.verification_data?.email && (
                            <span>{claim.verification_data.email}</span>
                          )}
                          {claim.verification_data?.additional_info && (
                            <p className="text-caption text-muted-foreground mt-1">
                              {claim.verification_data.additional_info}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(claim.claimed_at).toLocaleString("ko-KR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleActionClick(claim, "approve")}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleActionClick(claim, "reject")}
                            >
                              <X className="h-4 w-4 mr-1" />
                              거절
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>플레이어</TableHead>
                    <TableHead>요청자</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>인증 방법</TableHead>
                    <TableHead>처리 일시</TableHead>
                    <TableHead>처리자</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allClaims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={claim.player.photo_url} />
                            <AvatarFallback>
                              {claim.player.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{claim.player.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={claim.user.avatar_url} />
                            <AvatarFallback>
                              {claim.user.nickname.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{claim.user.nickname}</p>
                            <p className="text-caption text-muted-foreground">
                              {claim.user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(claim.status)}</TableCell>
                      <TableCell>
                        {getVerificationMethodLabel(claim.verification_method)}
                      </TableCell>
                      <TableCell>
                        {claim.verified_at
                          ? new Date(claim.verified_at).toLocaleString("ko-KR")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {claim.verified_by_user?.nickname || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "클레임 승인" : "클레임 거절"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "이 클레임을 승인하시겠습니까?"
                : "이 클레임을 거절하시겠습니까?"}
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4 py-4">
              {/* Claim Info */}
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-muted-foreground">플레이어</span>
                  <span className="font-medium">{selectedClaim.player.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-caption text-muted-foreground">요청자</span>
                  <span className="font-medium">{selectedClaim.user.nickname}</span>
                </div>
              </div>

              {actionType === "reject" && (
                <div className="space-y-2">
                  <Label>거절 사유 *</Label>
                  <Textarea
                    placeholder="클레임을 거절하는 사유를 입력해주세요"
                    value={rejectedReason}
                    onChange={(e) => setRejectedReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>관리자 메모 (선택사항)</Label>
                <Textarea
                  placeholder="내부용 메모를 입력해주세요"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={processing}
            >
              {processing
                ? "처리 중..."
                : actionType === "approve"
                ? "승인"
                : "거절"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
