"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/layout/AuthProvider"
import { createReport, type ReportReason } from "@/lib/content-moderation"
import { Flag } from "lucide-react"
import { useRouter } from "next/navigation"

interface ReportButtonProps {
  postId?: string
  commentId?: string
  variant?: "default" | "ghost" | "outline"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "스팸" },
  { value: "harassment", label: "괴롭힘/악의적 행위" },
  { value: "inappropriate", label: "부적절한 콘텐츠" },
  { value: "misinformation", label: "잘못된 정보" },
  { value: "other", label: "기타" },
]

export function ReportButton({
  postId,
  commentId,
  variant = "ghost",
  size = "sm",
  className
}: ReportButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>("spam")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!user) {
      router.push("/auth/login")
      return
    }

    setSubmitting(true)

    try {
      await createReport({
        postId,
        commentId,
        reporterId: user.id,
        reporterName: user.user_metadata?.name || user.email || "Anonymous",
        reason,
        description
      })

      setOpen(false)
      setReason("spam")
      setDescription("")

      // Show success message
      alert("신고가 접수되었습니다. 관리자가 검토 후 조치할 예정입니다.")
    } catch (error: any) {
      console.error("Error creating report:", error)

      // Check for duplicate report error
      if (error.message?.includes("duplicate") || error.code === "23505") {
        alert("이미 신고한 콘텐츠입니다.")
      } else {
        alert("신고 접수 중 오류가 발생했습니다. 다시 시도해주세요.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleOpenChange(newOpen: boolean) {
    if (!user && newOpen) {
      router.push("/auth/login")
      return
    }
    setOpen(newOpen)
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Flag className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>콘텐츠 신고</DialogTitle>
            <DialogDescription>
              이 {postId ? "포스트" : "댓글"}을 신고하는 이유를 선택해주세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">신고 사유</Label>
              <Select value={reason} onValueChange={(value) => setReason(value as ReportReason)}>
                <SelectTrigger id="reason" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">상세 설명 (선택)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="신고 내용을 자세히 설명해주세요..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "접수 중..." : "신고하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
