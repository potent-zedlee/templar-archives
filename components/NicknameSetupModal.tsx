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
import { useAuth } from "@/components/AuthProvider"
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

    // Skip check if empty or same as current nickname
    if (!value || value === currentNickname) {
      setIsAvailable(null)
      return
    }

    // Validate nickname format (3-20 chars, alphanumeric + Korean + underscore)
    const nicknameRegex = /^[a-zA-Z0-9가-힣_]{3,20}$/
    if (!nicknameRegex.test(value)) {
      setIsAvailable(false)
      return
    }

    // Check availability
    setChecking(true)
    try {
      const available = await checkNicknameAvailable(value, user?.id)
      setIsAvailable(available)
    } catch (error) {
      console.error('Nickname availability check failed:', error)
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
      toast.success('Nickname has been set!')
      onComplete()
    } catch (error) {
      console.error('Failed to save nickname:', error)
      toast.error('Failed to save nickname. Please try again.')
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
          <DialogTitle>Set Nickname</DialogTitle>
          <DialogDescription>
            Choose a nickname for Templar Archives Index. You can change it later on your Profile page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname</Label>
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
              3-20 characters, alphanumeric/Korean/underscore(_) only
            </p>
            {isAvailable === false && (
              <p className="text-xs text-destructive">
                Nickname already taken or invalid format.
              </p>
            )}
            {isAvailable === true && (
              <p className="text-xs text-green-600">
                Nickname is available!
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
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
