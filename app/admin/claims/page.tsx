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
import { type PlayerClaimWithDetails } from "@/lib/player-claims"
import {
  usePendingClaimsQuery,
  useAllClaimsQuery,
  useApproveClaimMutation,
  useRejectClaimMutation,
} from "@/lib/queries/admin-queries"

export default function claimsClient() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [selectedClaim, setSelectedClaim] = useState<PlayerClaimWithDetails | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<"approve" | "reject">("approve")
  const [adminNotes, setAdminNotes] = useState("")
  const [rejectedReason, setRejectedReason] = useState("")

  // React Query hooks
  const { data: pendingClaims = [], isLoading: pendingLoading } = usePendingClaimsQuery()
  const { data: allClaims = [], isLoading: allLoading } = useAllClaimsQuery()
  const approveClaimMutation = useApproveClaimMutation()
  const rejectClaimMutation = useRejectClaimMutation()

  const loading = pendingLoading || allLoading

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await (await import("@/lib/supabase")).supabase.auth.getUser()
      setUserEmail(user?.email || null)
    }
    getUser()
  }, [])

  useEffect(() => {
    // Wait for auth loading to complete
    if (authLoading) return

    if (userEmail && !isAdmin(userEmail)) {
      router.push("/")
      toast.error("Admin access only")
    }
  }, [userEmail, authLoading])

  function handleActionClick(claim: PlayerClaimWithDetails, type: "approve" | "reject") {
    setSelectedClaim(claim)
    setActionType(type)
    setActionDialogOpen(true)
    setAdminNotes("")
    setRejectedReason("")
  }

  function handleAction() {
    if (!selectedClaim || !user) return

    if (actionType === "reject" && !rejectedReason) {
      toast.error("Please enter rejection reason")
      return
    }

    if (actionType === "approve") {
      approveClaimMutation.mutate(
        {
          claimId: selectedClaim.id,
          adminId: user.id,
          adminNotes,
        },
        {
          onSuccess: () => {
            toast.success("Claim approved")
            setActionDialogOpen(false)
          },
          onError: (error) => {
            console.error("Error approving claim:", error)
            toast.error("Failed to approve claim")
          }
        }
      )
    } else {
      rejectClaimMutation.mutate(
        {
          claimId: selectedClaim.id,
          adminId: user.id,
          rejectedReason,
          adminNotes,
        },
        {
          onSuccess: () => {
            toast.success("Claim rejected")
            setActionDialogOpen(false)
          },
          onError: (error) => {
            console.error("Error rejecting claim:", error)
            toast.error("Failed to reject claim")
          }
        }
      )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        )
      default:
        return null
    }
  }

  const getVerificationMethodLabel = (method: string) => {
    switch (method) {
      case "social_media":
        return "Social Media"
      case "email":
        return "Email"
      case "admin":
        return "Admin"
      case "other":
        return "Other"
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
          <h1 className="text-title-lg mb-2">Player Claim Management</h1>
          <p className="text-body text-muted-foreground">
            Approve or reject player profile claim requests
          </p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingClaims.length})
            </TabsTrigger>
            <TabsTrigger value="all">All ({allClaims.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {pendingClaims.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-body text-muted-foreground">
                  No pending claim requests
                </p>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead>Verification Method</TableHead>
                      <TableHead>Evidence</TableHead>
                      <TableHead>Requested At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                              View Link
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
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleActionClick(claim, "reject")}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
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
                    <TableHead>Player</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verification Method</TableHead>
                    <TableHead>Processed At</TableHead>
                    <TableHead>Processed By</TableHead>
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
              {actionType === "approve" ? "Approve Claim" : "Reject Claim"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "Are you sure you want to approve this claim?"
                : "Are you sure you want to reject this claim?"}
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4 py-4">
              {/* Claim Info */}
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-muted-foreground">Player</span>
                  <span className="font-medium">{selectedClaim.player.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-caption text-muted-foreground">Requester</span>
                  <span className="font-medium">{selectedClaim.user.nickname}</span>
                </div>
              </div>

              {actionType === "reject" && (
                <div className="space-y-2">
                  <Label>Rejection Reason *</Label>
                  <Textarea
                    placeholder="Please enter the reason for rejecting this claim"
                    value={rejectedReason}
                    onChange={(e) => setRejectedReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Admin Notes (Optional)</Label>
                <Textarea
                  placeholder="Enter internal notes"
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
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={approveClaimMutation.isPending || rejectClaimMutation.isPending}
            >
              {(approveClaimMutation.isPending || rejectClaimMutation.isPending)
                ? "Processing..."
                : actionType === "approve"
                ? "Approve"
                : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
