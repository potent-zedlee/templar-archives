"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Check, X } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { getCurrentUserProfile, updateProfile, checkNicknameAvailable, type UserProfile } from "@/lib/user-profile"
import { toast } from "sonner"

export default function profileClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [nickname, setNickname] = useState("")
  const [bio, setBio] = useState("")
  const [pokerExperience, setPokerExperience] = useState("")

  // Nickname duplicate check state
  const [checking, setChecking] = useState(false)
  const [isNicknameAvailable, setIsNicknameAvailable] = useState<boolean | null>(null)

  // Load profile
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/auth/login")
      return
    }

    const loadProfile = async () => {
      const data = await getCurrentUserProfile()
      if (data) {
        setProfile(data)
        setNickname(data.nickname)
        setBio(data.bio || "")
        setPokerExperience(data.poker_experience || "")
      }
      setLoading(false)
    }

    loadProfile()
  }, [user, authLoading, router])

  // Check duplicate when nickname changes
  const handleNicknameChange = async (value: string) => {
    setNickname(value)

    // Don't check if empty or same as existing
    if (!value || value === profile?.nickname) {
      setIsNicknameAvailable(null)
      return
    }

    // Nickname format validation (3-20 chars, alphanumeric + underscore)
    const nicknameRegex = /^[a-zA-Z0-9가-힣_]{3,20}$/
    if (!nicknameRegex.test(value)) {
      setIsNicknameAvailable(false)
      return
    }

    // Duplicate check
    setChecking(true)
    try {
      const available = await checkNicknameAvailable(value, user?.id)
      setIsNicknameAvailable(available)
    } catch (error) {
      console.error('닉네임 Duplicate check 실패:', error)
      setIsNicknameAvailable(null)
    } finally {
      setChecking(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    // Don't save if nickname changed but unavailable
    if (nickname !== profile?.nickname && !isNicknameAvailable) {
      toast.error('Please check your nickname.')
      return
    }

    setSaving(true)
    try {
      const updated = await updateProfile(user.id, {
        nickname,
        bio: bio || undefined,
        poker_experience: pokerExperience || undefined,
      })

      if (updated) {
        setProfile(updated)
        toast.success('Profile updated successfully!')
      }
    } catch (error) {
      console.error('Profile save failed:', error)
      toast.error('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const canSave =
    nickname.length >= 3 &&
    (nickname === profile?.nickname || isNicknameAvailable === true) &&
    !checking &&
    (nickname !== profile?.nickname || bio !== (profile?.bio || "") || pokerExperience !== (profile?.poker_experience || ""))

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Failed to load profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Manage your profile information for GGVault.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Photo */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url} alt={profile.nickname} />
                <AvatarFallback>{profile.nickname.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-caption font-medium">{profile.nickname}</p>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
              </div>
            </div>

            {/* Nickname */}
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname *</Label>
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
                {!checking && isNicknameAvailable === true && nickname !== profile.nickname && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                )}
                {!checking && isNicknameAvailable === false && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-destructive" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                3-20 characters, alphanumeric and underscore only
              </p>
              {isNicknameAvailable === false && (
                <p className="text-xs text-destructive">
                  Nickname already in use or invalid format.
                </p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="A passionate poker player."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={saving}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length} / 500
              </p>
            </div>

            {/* Poker Experience */}
            <div className="space-y-2">
              <Label htmlFor="poker-experience">Poker Experience</Label>
              <Input
                id="poker-experience"
                placeholder="5 years, tournament focused"
                value={pokerExperience}
                onChange={(e) => setPokerExperience(e.target.value)}
                disabled={saving}
                maxLength={100}
              />
            </div>

            {/* Save button */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                disabled={saving}
              >
                Cancel
              </Button>
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
                  "Save"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
