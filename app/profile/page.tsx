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
import { toast } from "sonner"
import {
  useCurrentUserProfileQuery,
  useCheckNicknameQuery,
  useUpdateProfileMutation,
} from "@/lib/queries/profile-queries"

export default function profileClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  // React Query hooks
  const { data: profile = null, isLoading: loading } = useCurrentUserProfileQuery()
  const updateProfileMutation = useUpdateProfileMutation()

  // Form state
  const [nickname, setNickname] = useState("")
  const [bio, setBio] = useState("")
  const [pokerExperience, setPokerExperience] = useState("")
  const [nicknameForCheck, setNicknameForCheck] = useState("")

  // Nickname duplicate check (with debounce)
  const shouldCheckNickname = nicknameForCheck !== "" && nicknameForCheck !== profile?.nickname
  const nicknameRegex = /^[a-zA-Z0-9가-힣_]{3,20}$/
  const isValidFormat = nicknameRegex.test(nicknameForCheck)

  const { data: isNicknameAvailable, isLoading: checking } = useCheckNicknameQuery(
    nicknameForCheck,
    user?.id,
    shouldCheckNickname && isValidFormat
  )

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname)
      setBio(profile.bio || "")
      setPokerExperience(profile.poker_experience || "")
    }
  }, [profile])

  // Debounce nickname check (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setNicknameForCheck(nickname)
    }, 500)

    return () => clearTimeout(timer)
  }, [nickname])

  function handleNicknameChange(value: string) {
    setNickname(value)
  }

  function handleSave() {
    if (!user) return

    // Don't save if nickname changed but unavailable
    const nicknameAvailability = nicknameForCheck === profile?.nickname ? true : isNicknameAvailable
    if (nickname !== profile?.nickname && !nicknameAvailability) {
      toast.error('Please check your nickname.')
      return
    }

    updateProfileMutation.mutate(
      {
        userId: user.id,
        updates: {
          nickname,
          bio: bio || undefined,
          poker_experience: pokerExperience || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Profile updated successfully!')
        },
        onError: (error) => {
          console.error('Profile save failed:', error)
          toast.error('Failed to save profile. Please try again.')
        },
      }
    )
  }

  const nicknameAvailability = nicknameForCheck === profile?.nickname ? true : isNicknameAvailable

  const canSave =
    nickname.length >= 3 &&
    (nickname === profile?.nickname || nicknameAvailability === true) &&
    !checking &&
    (nickname !== profile?.nickname || bio !== (profile?.bio || "") || pokerExperience !== (profile?.poker_experience || ""))

  const saving = updateProfileMutation.isPending

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
              Manage your profile information for Templar Archives.
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
                {!checking && nicknameAvailability === true && nickname !== profile.nickname && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                )}
                {!checking && nicknameAvailability === false && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-destructive" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                3-20 characters, alphanumeric and underscore only
              </p>
              {nicknameAvailability === false && (
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
