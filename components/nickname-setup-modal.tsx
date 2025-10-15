"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Check, X } from "lucide-react"
import { checkNicknameAvailable, updateProfile } from "@/lib/user-profile"
import { useAuth } from "@/components/auth-provider"
import { toast } from "sonner"

type NicknameSetupModalProps = {
  open: boolean
  currentNickname: string
  onComplete: () => void
}

export function NicknameSetupModal({ open, currentNickname, onComplete }: NicknameSetupModalProps) {
  const { user } = useAuth()
  const [nickname, setNickname] = useState(currentNickname)
  const [checking, setChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  const handleNicknameChange = async (value: string) => {
    setNickname(value)

    // 빈 값이거나 기존 닉네임과 같으면 체크 안 함
    if (!value || value === currentNickname) {
      setIsAvailable(null)
      return
    }

    // 닉네임 형식 검증 (3-20자, 영문 + 숫자 + 언더스코어)
    const nicknameRegex = /^[a-zA-Z0-9가-힣_]{3,20}$/
    if (!nicknameRegex.test(value)) {
      setIsAvailable(false)
      return
    }

    // 중복 체크
    setChecking(true)
    try {
      const available = await checkNicknameAvailable(value, user?.id)
      setIsAvailable(available)
    } catch (error) {
      console.error('닉네임 중복 체크 실패:', error)
      setIsAvailable(null)
    } finally {
      setChecking(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    if (!isAvailable) return

    setSaving(true)
    try {
      await updateProfile(user.id, { nickname })
      toast.success('닉네임이 Settings되었습니다!')
      onComplete()
    } catch (error) {
      console.error('닉네임 저장 실패:', error)
      toast.error('닉네임 저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const canSave = nickname.length >= 3 && isAvailable === true && !checking

  return (
    <Dialog open={open} onOpenChange={() => {}} modal>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>닉네임 Settings</DialogTitle>
          <DialogDescription>
            GGVault에서 사용할 닉네임을 Settings해주세요. 나중에 Profile 페이지에서 변경할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">닉네임</Label>
            <div className="relative">
              <Input
                id="nickname"
                placeholder="PokerMaster123"
                value={nickname}
                onChange={(e) => handleNicknameChange(e.target.value)}
                disabled={saving}
                className="pr-10"
              />
              {checking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!checking && isAvailable === true && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
              )}
              {!checking && isAvailable === false && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-destructive" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              3-20자, 영문/한글/숫자/언더스코어(_)만 사용 가능
            </p>
            {isAvailable === false && (
              <p className="text-xs text-destructive">
                이미 사용 중인 닉네임이거나 형식이 올바르지 않습니다.
              </p>
            )}
            {isAvailable === true && (
              <p className="text-xs text-green-600">
                사용 가능한 닉네임입니다!
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!canSave || saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
